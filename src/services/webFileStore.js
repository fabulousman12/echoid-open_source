const DB_NAME = "swipe-web-file-store";
const STORE_NAME = "files";
const REF_PREFIX = "webfs://";

let dbPromise = null;

const isBrowser = () => typeof window !== "undefined" && typeof indexedDB !== "undefined";

const sanitizeFileName = (value = "file") =>
  String(value || "file")
    .replace(/[^\w.-]/g, "_")
    .replace(/_+/g, "_");

const openDb = () => {
  if (!isBrowser()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open web file store"));
  });

  return dbPromise;
};

const buildRef = (folder = "files", fileName = "file") => {
  const safeFolder = String(folder || "files").replace(/^\/+|\/+$/g, "");
  const safeName = sanitizeFileName(fileName);
  const uniquePart = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${REF_PREFIX}${safeFolder}/${uniquePart}_${safeName}`;
};

const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export const isWebStoredFileRef = (value) =>
  typeof value === "string" && value.startsWith(REF_PREFIX);

export const saveBlobToWebFileStore = async (
  blob,
  { fileName = "file", mimeType = "", folder = "files" } = {}
) => {
  if (!(blob instanceof Blob)) return "";
  const db = await openDb();
  if (!db) return "";

  const id = buildRef(folder, fileName);
  const storedBlob = mimeType && blob.type !== mimeType ? new Blob([blob], { type: mimeType }) : blob;

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      id,
      blob: storedBlob,
      fileName: sanitizeFileName(fileName),
      mimeType: mimeType || storedBlob.type || "",
      folder,
      createdAt: Date.now(),
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("Failed to store blob"));
  });

  return id;
};

export const saveDataUrlToWebFileStore = async (
  dataUrl,
  { fileName = "file", mimeType = "", folder = "files" } = {}
) => {
  if (!dataUrl || typeof dataUrl !== "string") return "";
  const blob = await dataUrlToBlob(dataUrl);
  return saveBlobToWebFileStore(blob, { fileName, mimeType: mimeType || blob.type, folder });
};

export const getBlobFromWebFileStore = async (ref) => {
  if (!isWebStoredFileRef(ref)) return null;
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(ref);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error || new Error("Failed to read stored blob"));
  });
};

export const readWebStoredFileAsUint8Array = async (ref) => {
  const blob = await getBlobFromWebFileStore(ref);
  if (!blob) return null;
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
};

export const createObjectUrlFromWebFileRef = async (ref) => {
  const blob = await getBlobFromWebFileStore(ref);
  if (!blob) return "";
  return URL.createObjectURL(blob);
};

export const revokeResolvedObjectUrl = (value) => {
  if (typeof value === "string" && value.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(value);
    } catch {}
  }
};
