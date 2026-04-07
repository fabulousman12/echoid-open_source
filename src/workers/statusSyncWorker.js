import {
  groupStatusFeed,
  pruneStatusesByIds,
  syncFeedStatuses,
  syncMyStatuses,
} from "../services/statusSyncTransforms";

self.onmessage = (event) => {
  const { id, task, payload } = event.data || {};

  try {
    let result = null;
    switch (task) {
      case "syncMyStatuses":
        result = syncMyStatuses(payload || {});
        break;
      case "syncFeedStatuses":
        result = syncFeedStatuses(payload || {});
        break;
      case "pruneStatusesByIds":
        result = pruneStatusesByIds(payload || {});
        break;
      case "groupStatusFeed":
        result = groupStatusFeed(payload || {});
        break;
      default:
        throw new Error(`Unknown status sync task: ${task}`);
    }
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error?.message || "Status sync worker failed" });
  }
};
