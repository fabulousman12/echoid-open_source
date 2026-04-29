const ENCRYPTED_PRIVATE_KEY_VERSION = 1;
const PBKDF2_ITERATIONS = 210000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

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

async function derivePasswordKey(password, salt) {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function convertSpkiToPem(spkiBuffer) {
  const base64 = bytesToBase64(new Uint8Array(spkiBuffer));
  const formatted = base64.match(/.{1,64}/g)?.join("\n") || base64;
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}

export async function encryptPrivateKeyWithPassword(privateKeyJwkStr, password) {
  if (!password) {
    throw new Error("Password is required to encrypt the private key.");
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await derivePasswordKey(password, salt);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(privateKeyJwkStr)
  );

  return JSON.stringify({
    v: ENCRYPTED_PRIVATE_KEY_VERSION,
    alg: "PBKDF2-SHA256/AES-GCM",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  });
}

export async function decryptPrivateKeyWithPassword(encryptedPrivateKey, password) {
  if (!encryptedPrivateKey || !password) {
    throw new Error("Encrypted private key and password are required.");
  }

  const payload = JSON.parse(encryptedPrivateKey);
  if (payload?.v !== ENCRYPTED_PRIVATE_KEY_VERSION || !payload?.salt || !payload?.iv || !payload?.ciphertext) {
    throw new Error("Unsupported encrypted private key format.");
  }

  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const key = await derivePasswordKey(password, salt);
  const plaintext = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBytes(payload.ciphertext)
  );

  const privateKeyJwkStr = textDecoder.decode(plaintext);
  JSON.parse(privateKeyJwkStr);
  return privateKeyJwkStr;
}

export async function createEncryptedKeyPair(password) {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const privateKeyJwkStr = JSON.stringify(privateKeyJwk);
  const encryptedPrivateKey = await encryptPrivateKeyWithPassword(privateKeyJwkStr, password);

  return {
    publicKey: convertSpkiToPem(spki),
    privateKey: privateKeyJwkStr,
    privateKeyHash: encryptedPrivateKey,
  };
}
