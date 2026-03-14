import { storage } from "./prefStorage";

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
let cachedAccessToken = null;
let cachedRefreshToken = null;

export async function setTokens({ accessToken, refreshToken }) {
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
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export async function setRefreshToken(refreshToken) {
  if (!refreshToken) return;
  cachedRefreshToken = refreshToken;
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessTokenSync() {
  return cachedAccessToken;
}

export async function getAccessToken() {
  if (cachedAccessToken) return cachedAccessToken;
  const value = await storage.getItemAsync(ACCESS_TOKEN_KEY);
  cachedAccessToken = value || null;
  return cachedAccessToken;
}

export async function getRefreshToken() {
  if (cachedRefreshToken) return cachedRefreshToken;
  const value = await storage.getItemAsync(REFRESH_TOKEN_KEY);
  cachedRefreshToken = value || null;
  return cachedRefreshToken;
}

export async function clearTokens() {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
}

export async function globalLogout() {
  globalThis.storage.removeItem("currentuser");
  await clearTokens();
  window.dispatchEvent(new Event("auth-logout"));
}
