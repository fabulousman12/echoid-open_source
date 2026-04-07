import {
  prepareDirectMessageWrite,
  prepareGroupMessageWrite,
  prepareGroupSummaryWrites,
  transformDirectMessageRows,
  transformGroupMessageRows,
} from "../services/storageTransforms";

self.onmessage = (event) => {
  const { id, task, payload } = event.data || {};

  try {
    let result = null;

    switch (task) {
      case "transformDirectMessageRows":
        result = transformDirectMessageRows(payload?.rowGroups);
        break;
      case "transformGroupMessageRows":
        result = transformGroupMessageRows(payload?.rows);
        break;
      case "prepareDirectMessageWrite":
        result = prepareDirectMessageWrite(payload?.message);
        break;
      case "prepareGroupMessageWrite":
        result = prepareGroupMessageWrite(payload?.message);
        break;
      case "prepareGroupSummaryWrites":
        result = prepareGroupSummaryWrites(payload?.groups);
        break;
      default:
        throw new Error(`Unknown storage worker task: ${task}`);
    }

    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error?.message || "Storage worker failed",
    });
  }
};
