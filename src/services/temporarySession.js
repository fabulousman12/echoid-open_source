import { setTokens, clearTokens } from "./authTokens";

const TEMP_MAIN_USER_KEY = "tempMainUser";
const TEMP_PRIVATE_KEY_KEY = "tempPrivateKey";
const TEMP_PUBLIC_KEY_KEY = "tempPublicKey";
const TEMP_MODE_KEY = "temporarySessionActive";
const TEMP_SESSION_EVENT = "temporary-session-updated";

function sessionGet(key) {
  try {
    return globalThis.sessionStorage?.getItem?.(key) || null;
  } catch {
    return null;
  }
}

function sessionSet(key, value) {
  try {
    if (value === null || value === undefined || value === "") {
      globalThis.sessionStorage?.removeItem?.(key);
      return;
    }
    globalThis.sessionStorage?.setItem?.(key, String(value));
  } catch {
    // no-op
  }
}

function emitTemporarySessionUpdate() {
  try {
    window.dispatchEvent(new CustomEvent(TEMP_SESSION_EVENT));
  } catch {
    // no-op
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function convertSpkiToPem(spkiBuffer) {
  const base64 = arrayBufferToBase64(spkiBuffer);
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

export function isTemporaryRuntime() {
  return sessionGet(TEMP_MODE_KEY) === "true";
}

export function getTemporarySessionUser() {
  try {
    return JSON.parse(sessionGet(TEMP_MAIN_USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function getTemporaryRuntimeUser() {
  const tempUser = getTemporarySessionUser();
  if (tempUser) return tempUser;
  try {
    return globalThis.storage?.readJSON?.("currentuser", null) || null;
  } catch {
    return null;
  }
}

export function subscribeTemporarySession(listener) {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    try {
      listener?.();
    } catch {
      // no-op
    }
  };
  window.addEventListener(TEMP_SESSION_EVENT, handler);
  return () => window.removeEventListener(TEMP_SESSION_EVENT, handler);
}

export function setTemporarySessionUser(user) {
  sessionSet(TEMP_MAIN_USER_KEY, JSON.stringify(user || null));
  if (user) {
    globalThis.storage.setItem("currentuser", JSON.stringify(user));
  } else {
    globalThis.storage.removeItem("currentuser");
  }
  emitTemporarySessionUpdate();
}

export async function generateTemporaryKeyPair() {
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

  const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return {
    publicKey: convertSpkiToPem(publicKeyBuffer),
    privateKey: JSON.stringify(privateKeyJwk),
  };
}

export async function setTemporarySession({ user, accessToken, refreshToken, privateKey, publicKey }) {
  sessionSet(TEMP_MODE_KEY, "true");
  setTemporarySessionUser(user || null);
  sessionSet(TEMP_PRIVATE_KEY_KEY, privateKey || "");
  sessionSet(TEMP_PUBLIC_KEY_KEY, publicKey || "");
  if (privateKey) {
    globalThis.storage.setItem("privateKey", privateKey);
  }

  await setTokens({ accessToken, refreshToken, isTemporary: true });
}

export async function clearTemporarySession() {
  sessionSet(TEMP_MODE_KEY, "");
  sessionSet(TEMP_MAIN_USER_KEY, "");
  sessionSet(TEMP_PRIVATE_KEY_KEY, "");
  sessionSet(TEMP_PUBLIC_KEY_KEY, "");
  globalThis.storage.removeItem("currentuser");
  globalThis.storage.removeItem("privateKey");
  emitTemporarySessionUpdate();
  await clearTokens();
}
