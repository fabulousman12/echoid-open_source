import {
  prepareDirectMessageWrite,
  prepareGroupMessageWrite,
  prepareGroupSummaryWrites,
  transformDirectMessageRows,
  transformGroupMessageRows,
} from "./storageTransforms";

const syncFallbacks = {
  transformDirectMessageRows: (payload) => transformDirectMessageRows(payload?.rowGroups),
  transformGroupMessageRows: (payload) => transformGroupMessageRows(payload?.rows),
  prepareDirectMessageWrite: (payload) => prepareDirectMessageWrite(payload?.message),
  prepareGroupMessageWrite: (payload) => prepareGroupMessageWrite(payload?.message),
  prepareGroupSummaryWrites: (payload) => prepareGroupSummaryWrites(payload?.groups),
};

let workerRef = null;
let requestId = 0;
const pending = new Map();

function getWorker() {
  if (workerRef || typeof Worker === "undefined") return workerRef;

  workerRef = new Worker(new URL("../workers/storageWorker.js", import.meta.url), {
    type: "module",
  });

  workerRef.onmessage = (event) => {
    const { id, ok, result, error } = event.data || {};
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (ok) entry.resolve(result);
    else entry.reject(new Error(error || "Storage worker failed"));
  };

  workerRef.onerror = () => {
    pending.forEach(({ reject }) => reject(new Error("Storage worker crashed")));
    pending.clear();
    workerRef?.terminate?.();
    workerRef = null;
  };

  return workerRef;
}

export async function runStorageWorker(task, payload) {
  const fallback = syncFallbacks[task];
  const worker = getWorker();

  if (!worker || !fallback) {
    return fallback ? fallback(payload) : null;
  }

  const id = `${task}-${++requestId}`;
  return new Promise((resolve) => {
    pending.set(id, {
      resolve,
      reject: () => {
        try {
          resolve(fallback(payload));
        } catch {
          resolve(null);
        }
      },
    });

    try {
      worker.postMessage({ id, task, payload });
    } catch {
      pending.delete(id);
      resolve(fallback(payload));
    }
  });
}
