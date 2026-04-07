import {
  groupStatusFeed,
  pruneStatusesByIds,
  syncFeedStatuses,
  syncMyStatuses,
} from "./statusSyncTransforms";

const syncFallbacks = {
  syncMyStatuses: (payload) => syncMyStatuses(payload || {}),
  syncFeedStatuses: (payload) => syncFeedStatuses(payload || {}),
  pruneStatusesByIds: (payload) => pruneStatusesByIds(payload || {}),
  groupStatusFeed: (payload) => groupStatusFeed(payload || {}),
};

let workerRef = null;
let requestId = 0;
const pending = new Map();

function getWorker() {
  if (workerRef || typeof Worker === "undefined") return workerRef;

  workerRef = new Worker(new URL("../workers/statusSyncWorker.js", import.meta.url), {
    type: "module",
  });

  workerRef.onmessage = (event) => {
    const { id, ok, result, error } = event.data || {};
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (ok) entry.resolve(result);
    else entry.reject(new Error(error || "Status sync worker failed"));
  };

  workerRef.onerror = () => {
    pending.forEach(({ reject }) => reject(new Error("Status sync worker crashed")));
    pending.clear();
    workerRef?.terminate?.();
    workerRef = null;
  };

  return workerRef;
}

export async function runStatusSyncWorker(task, payload) {
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
