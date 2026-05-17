import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { nanoid } from "nanoid";
import { storage } from "./prefStorage";

const DEVICE_ID_KEY = "deviceId";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
let cachedDeviceId = null;

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
    // Ignore cookie failures and keep the storage fallbacks available.
  }
}

const readSessionDeviceId = () => {
  try {
    return globalThis.sessionStorage?.getItem?.(DEVICE_ID_KEY) || "";
  } catch {
    return "";
  }
};

const writeSessionDeviceId = (id) => {
  try {
    globalThis.sessionStorage?.setItem?.(DEVICE_ID_KEY, id);
  } catch {
    // Ignore session storage failures and fall through to caller behavior.
  }
};

export async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;

  const cookieId = readCookieItem(DEVICE_ID_KEY);
  if (cookieId) {
    storage.setItem(DEVICE_ID_KEY, cookieId);
    cachedDeviceId = cookieId;
    return cookieId;
  }

  if (!Capacitor.isNativePlatform()) {
    const sessionId = readSessionDeviceId();
    if (sessionId) {
      writeCookieItem(DEVICE_ID_KEY, sessionId);
      cachedDeviceId = sessionId;
      return sessionId;
    }

    const webId = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : nanoid();
    writeCookieItem(DEVICE_ID_KEY, webId);
    writeSessionDeviceId(webId);
    cachedDeviceId = webId;
    return webId;
  }

  const local = globalThis.storage.getItem(DEVICE_ID_KEY);
  if (local) {
    writeCookieItem(DEVICE_ID_KEY, local);
    cachedDeviceId = local;
    return local;
  }

  const stored = await storage.getItemAsync(DEVICE_ID_KEY);
  if (stored) {
    writeCookieItem(DEVICE_ID_KEY, stored);
    storage.setItem(DEVICE_ID_KEY, stored);
    cachedDeviceId = stored;
    return stored;
  }

  let id = "";
  try {
    const res = await Device.getId();
    id = res?.identifier || "";
  } catch {
    // fallback below
  }

  if (!id) {
    id = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : nanoid();
  }

  writeCookieItem(DEVICE_ID_KEY, id);
  globalThis.storage.setItem(DEVICE_ID_KEY, id);
  try {
    await storage.setItemAsync(DEVICE_ID_KEY, id);
  } catch {
    // Keep sync storage fallback even if async persistence fails.
  }
  cachedDeviceId = id;
  return id;
}

export function getDeviceIdSync() {
  if (cachedDeviceId) return cachedDeviceId;
  const cookieId = readCookieItem(DEVICE_ID_KEY);
  if (cookieId) return cookieId;
  if (!Capacitor.isNativePlatform()) {
    return readSessionDeviceId();
  }
  return globalThis.storage.getItem(DEVICE_ID_KEY);
}

export function isAndroidNative() {
  try {
    return Boolean(Capacitor.isNativePlatform?.()) && Capacitor.getPlatform?.() === "android";
  } catch {
    return false;
  }
}

export async function getDeviceInfo() {
  let deviceName = "";
  let osName = "";
  let osVersion = "";
  let deviceType = "";

  try {
    const info = await Device.getInfo();
    deviceName = info.model || info.name || "";
    osName = info.operatingSystem || "";
    osVersion = info.osVersion || "";
    deviceType = info.platform || "";
  } catch {
    const ua = navigator.userAgent || "";
    deviceName = "web";
    osName = ua.includes("Android") ? "Android" : ua.includes("iPhone") || ua.includes("iPad") ? "iOS" : "Web";
    osVersion = "";
    deviceType = "web";
  }

  return {
    deviceId: await getDeviceId(),
    device: {
      deviceName,
      osName,
      osVersion,
      appVersion: import.meta.env?.VITE_APP_VERSION || "",
      deviceType
    }
  };
}
