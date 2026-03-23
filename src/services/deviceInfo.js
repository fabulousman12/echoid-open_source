import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { nanoid } from "nanoid";
import { storage } from "./prefStorage";

const DEVICE_ID_KEY = "deviceId";
let cachedDeviceId = null;

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

  if (!Capacitor.isNativePlatform()) {
    const sessionId = readSessionDeviceId();
    if (sessionId) {
      cachedDeviceId = sessionId;
      return sessionId;
    }

    const webId = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : nanoid();
    writeSessionDeviceId(webId);
    cachedDeviceId = webId;
    return webId;
  }

  const local = globalThis.storage.getItem(DEVICE_ID_KEY);
  if (local) {
    cachedDeviceId = local;
    return local;
  }

  const stored = await storage.getItemAsync(DEVICE_ID_KEY);
  if (stored) {
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
  if (!Capacitor.isNativePlatform()) {
    return readSessionDeviceId();
  }
  return globalThis.storage.getItem(DEVICE_ID_KEY);
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
