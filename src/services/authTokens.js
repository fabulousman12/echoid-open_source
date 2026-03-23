import { storage } from "./prefStorage";

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const TEMP_ACCESS_TOKEN_KEY = "temporaryAuthToken";
const TEMP_REFRESH_TOKEN_KEY = "temporaryRefreshToken";
const TEMP_FLAG_KEY = "temporarySessionActive";
const TEMP_MAIN_USER_KEY = "tempMainUser";
const TEMP_PRIVATE_KEY_KEY = "tempPrivateKey";
const TEMP_PUBLIC_KEY_KEY = "tempPublicKey";
let cachedAccessToken = null;
let cachedRefreshToken = null;

function readSessionItem(key) {
  try {
    return globalThis.sessionStorage?.getItem?.(key) || null;
  } catch {
    return null;
  }
}

function writeSessionItem(key, value) {
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

export function isTemporarySession() {
  return readSessionItem(TEMP_FLAG_KEY) === "true";
}

export async function setTokens({ accessToken, refreshToken, isTemporary = false }) {
  if (isTemporary) {
    cachedAccessToken = accessToken || null;
    cachedRefreshToken = refreshToken || null;
    writeSessionItem(TEMP_FLAG_KEY, "true");
    writeSessionItem(TEMP_ACCESS_TOKEN_KEY, accessToken || "");
    writeSessionItem(TEMP_REFRESH_TOKEN_KEY, refreshToken || "");
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }

  if (accessToken) {
    cachedAccessToken = accessToken;
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    cachedRefreshToken = refreshToken;
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function setAccessToken(accessToken) {
  if (!accessToken) return;
  cachedAccessToken = accessToken;
  if (isTemporarySession()) {
    writeSessionItem(TEMP_ACCESS_TOKEN_KEY, accessToken);
    return;
  }
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export async function setRefreshToken(refreshToken) {
  if (!refreshToken) return;
  cachedRefreshToken = refreshToken;
  if (isTemporarySession()) {
    writeSessionItem(TEMP_REFRESH_TOKEN_KEY, refreshToken);
    return;
  }
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessTokenSync() {
  if (isTemporarySession()) {
    return readSessionItem(TEMP_ACCESS_TOKEN_KEY);
  }
  return cachedAccessToken;
}

export async function getAccessToken() {
  if (isTemporarySession()) {
    const value = readSessionItem(TEMP_ACCESS_TOKEN_KEY);
    cachedAccessToken = value || null;
    return cachedAccessToken;
  }
  if (cachedAccessToken) return cachedAccessToken;
  const value = await storage.getItemAsync(ACCESS_TOKEN_KEY);
  cachedAccessToken = value || null;
  return cachedAccessToken;
}

export async function getRefreshToken() {
  if (isTemporarySession()) {
    const value = readSessionItem(TEMP_REFRESH_TOKEN_KEY);
    cachedRefreshToken = value || null;
    return cachedRefreshToken;
  }
  if (cachedRefreshToken) return cachedRefreshToken;
  const value = await storage.getItemAsync(REFRESH_TOKEN_KEY);
  cachedRefreshToken = value || null;
  return cachedRefreshToken;
}

export async function clearTokens() {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  writeSessionItem(TEMP_FLAG_KEY, "");
  writeSessionItem(TEMP_ACCESS_TOKEN_KEY, "");
  writeSessionItem(TEMP_REFRESH_TOKEN_KEY, "");
  writeSessionItem(TEMP_MAIN_USER_KEY, "");
  writeSessionItem(TEMP_PRIVATE_KEY_KEY, "");
  writeSessionItem(TEMP_PUBLIC_KEY_KEY, "");
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
}

export async function globalLogout() {
  globalThis.storage.removeItem("currentuser");
  globalThis.storage.removeItem("privateKey");
  await clearTokens();
  window.dispatchEvent(new Event("auth-logout"));
}
