import { Preferences } from "@capacitor/preferences";

const cache = new Map();
let initialized = false;

export async function initPrefStorage(keys = []) {
  if (initialized) return;
  initialized = true;

  for (const key of keys) {
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null && value !== undefined) {
        cache.set(key, value);
      }
    } catch (err) {
      console.error("PrefStorage hydrate failed for key:", key, err);
    }
  }
}

export function getItem(key) {
  return cache.has(key) ? cache.get(key) : null;
}

export async function getItemAsync(key) {
  if (cache.has(key)) return cache.get(key);
  try {
    const { value } = await Preferences.get({ key });
    if (value !== null && value !== undefined) {
      cache.set(key, value);
    }
    return value ?? null;
  } catch {
    return null;
  }
}

export function readJSON(key, fallback = null) {
  try {
    const raw = getItem(key);
    if (raw === null || raw === undefined || raw === "") return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function readJSONAsync(key, fallback = null) {
  try {
    const raw = await getItemAsync(key);
    if (raw === null || raw === undefined || raw === "") return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setItem(key, value) {
  cache.set(key, String(value));
  Preferences.set({ key, value: String(value) }).catch(() => {});
}

export function removeItem(key) {
  cache.delete(key);
  Preferences.remove({ key }).catch(() => {});
}

export async function keysAsync() {
  try {
    const { keys } = await Preferences.keys();
    return keys || [];
  } catch {
    return [];
  }
}

export function clear() {
  cache.clear();
  Preferences.keys().then(({ keys }) => {
    keys.forEach((key) => Preferences.remove({ key }).catch(() => {}));
  }).catch(() => {});
}

export const storage = {
  getItem,
  getItemAsync,
  readJSON,
  readJSONAsync,
  setItem,
  removeItem,
  clear,
  keysAsync,
  key: (index) => Array.from(cache.keys())[index] || null,
  get length() {
    return cache.size;
  }
};

if (typeof globalThis !== "undefined") {
  globalThis.storage = storage;
}
