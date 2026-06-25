const ANONYMOUS_POSTER_SECRET_KEY = "anonymousPosterSecret";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function pemToArrayBuffer(pem) {
  const b64 = String(pem || "")
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  return base64ToBytes(b64).buffer;
}

function randomBase64Url(byteLength = 24) {
  const bytes = window.crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generateAnonymousPosterCredentials() {
  return {
    anonymousId: randomBase64Url(18),
    authsec: randomBase64Url(32),
  };
}

export function readAnonymousPosterSecret() {
  const stored = globalThis.storage?.readJSON?.(ANONYMOUS_POSTER_SECRET_KEY, null);
  if (!stored?.anonymousId || !stored?.authsec) return null;
  return {
    anonymousId: String(stored.anonymousId),
    authsec: String(stored.authsec),
  };
}

export function saveAnonymousPosterSecret(secret) {
  if (!secret?.anonymousId || !secret?.authsec) return;
  globalThis.storage?.setItem?.(
    ANONYMOUS_POSTER_SECRET_KEY,
    JSON.stringify({
      anonymousId: String(secret.anonymousId),
      authsec: String(secret.authsec),
    })
  );
}

export function clearAnonymousPosterSecret() {
  globalThis.storage?.removeItem?.(ANONYMOUS_POSTER_SECRET_KEY);
}

async function importPublicKey(publicKeyPem) {
  return window.crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
}

async function importPrivateKey(privateKeyJwkStr) {
  return window.crypto.subtle.importKey(
    "jwk",
    JSON.parse(privateKeyJwkStr),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );
}

export async function encryptAnonymousPosterVault(secret, publicKeyPem) {
  if (!secret?.anonymousId || !secret?.authsec || !publicKeyPem) {
    throw new Error("Anonymous poster credentials and public key are required.");
  }

  const publicKey = await importPublicKey(publicKeyPem);
  const plaintext = JSON.stringify({
    anonymousId: String(secret.anonymousId),
    authsec: String(secret.authsec),
  });
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    textEncoder.encode(plaintext)
  );

  return {
    v: 1,
    alg: "RSA-OAEP-SHA256",
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptAnonymousPosterVault(vault, privateKeyJwkStr) {
  if (!vault || !privateKeyJwkStr) return null;
  const payload = typeof vault === "string" ? JSON.parse(vault) : vault;
  if (payload?.v !== 1 || !payload?.ciphertext) return null;

  const privateKey = await importPrivateKey(privateKeyJwkStr);
  const plaintext = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBytes(payload.ciphertext)
  );
  const secret = JSON.parse(textDecoder.decode(plaintext));
  if (!secret?.anonymousId || !secret?.authsec) return null;
  return {
    anonymousId: String(secret.anonymousId),
    authsec: String(secret.authsec),
  };
}

export async function saveAnonymousPosterSecretFromVault(vault) {
  const privateKey = globalThis.storage?.getItem?.("privateKey") || "";
  const secret = await decryptAnonymousPosterVault(vault, privateKey);
  if (secret) saveAnonymousPosterSecret(secret);
  return secret;
}

export { ANONYMOUS_POSTER_SECRET_KEY };
