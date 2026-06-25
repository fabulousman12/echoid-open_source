import { storage } from "./prefStorage";
import { isAndroidNative } from "./deviceInfo";
import { clearAnonymousProfile } from "./anonymousProfileStorage";

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const DEVICE_TOKEN_KEY = "device_token";
const TEMP_ACCESS_TOKEN_KEY = "temporaryAuthToken";
const TEMP_REFRESH_TOKEN_KEY = "temporaryRefreshToken";
const TEMP_FLAG_KEY = "temporarySessionActive";
const TEMP_MAIN_USER_KEY = "tempMainUser";
const TEMP_PRIVATE_KEY_KEY = "tempPrivateKey";
const TEMP_PUBLIC_KEY_KEY = "tempPublicKey";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
let cachedAccessToken = null;
let cachedRefreshToken = null;

function getCookieAttributes(maxAge = COOKIE_MAX_AGE_SECONDS) {
  const secure = globalThis.location?.protocol === "https:" ? "; Secure" : "";
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function readCookieItem(key) {
  try {
    const encodedKey = encodeURIComponent(key);
    const cookies = String(globalThis.document?.cookie || "").split("; ");
    const cookie = cookies.find((entry) => entry.startsWith(`${encodedKey}=`));
    if (!cookie) return null;
    return decodeURIComponent(cookie.slice(encodedKey.length + 1)) || null;
  } catch {
    return null;
  }
}

function writeCookieItem(key, value) {
  try {
    const encodedKey = encodeURIComponent(key);
    if (value === null || value === undefined || value === "") {
      globalThis.document.cookie = `${encodedKey}=; ${getCookieAttributes(0)}`;
      return;
    }
    globalThis.document.cookie = `${encodedKey}=${encodeURIComponent(String(value))}; ${getCookieAttributes()}`;
  } catch {
    // no-op
  }
}

async function readPersistentToken(key) {
  const cookieValue = readCookieItem(key);
  if (cookieValue) {
    storage.setItem(key, cookieValue);
    return cookieValue;
  }

  const storedValue = await storage.getItemAsync(key);
  if (storedValue) {
    writeCookieItem(key, storedValue);
  }
  return storedValue || null;
}

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
    writeCookieItem(ACCESS_TOKEN_KEY, "");
    writeCookieItem(REFRESH_TOKEN_KEY, "");
    return;
  }

  if (accessToken) {
    cachedAccessToken = accessToken;
    writeCookieItem(ACCESS_TOKEN_KEY, accessToken);
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    cachedRefreshToken = refreshToken;
    writeCookieItem(REFRESH_TOKEN_KEY, refreshToken);
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
  writeCookieItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export async function setRefreshToken(refreshToken) {
  if (!refreshToken) return;
  cachedRefreshToken = refreshToken;
  if (isTemporarySession()) {
    writeSessionItem(TEMP_REFRESH_TOKEN_KEY, refreshToken);
    return;
  }
  writeCookieItem(REFRESH_TOKEN_KEY, refreshToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessTokenSync() {
  if (isTemporarySession()) {
    return readSessionItem(TEMP_ACCESS_TOKEN_KEY);
  }
  return cachedAccessToken || readCookieItem(ACCESS_TOKEN_KEY);
}

export async function getAccessToken() {
  if (isTemporarySession()) {
    const value = readSessionItem(TEMP_ACCESS_TOKEN_KEY);
    cachedAccessToken = value || null;
    return cachedAccessToken;
  }
  if (cachedAccessToken) return cachedAccessToken;
  const value = await readPersistentToken(ACCESS_TOKEN_KEY);
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
  const value = await readPersistentToken(REFRESH_TOKEN_KEY);
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
  if (isAndroidNative()) {
    storage.removeItem(DEVICE_TOKEN_KEY);
  }
  clearAnonymousProfile();
  writeCookieItem(ACCESS_TOKEN_KEY, "");
  writeCookieItem(REFRESH_TOKEN_KEY, "");
}

export async function globalLogout() {
  globalThis.storage.removeItem("currentuser");
  globalThis.storage.removeItem("privateKey");
  await clearTokens();
  window.dispatchEvent(new Event("auth-logout"));
}
