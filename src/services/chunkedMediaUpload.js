import { authFetch } from "./apiClient";

const CHUNK_SIZE_BYTES = 256 * 1024;

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const chunk = bytes.subarray(i, i + step);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const normalizeUploadBytes = async (input) => {
  if (!input) return null;
  if (input instanceof Blob) {
    return new Uint8Array(await input.arrayBuffer());
  }
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return null;
};

async function uploadMediaInChunks(host, input, { fileName, contentType = "application/octet-stream" } = {}) {
  const bytes = await normalizeUploadBytes(input);
  if (!bytes?.length) {
    throw new Error("No upload bytes provided");
  }
  if (!fileName) {
    throw new Error("fileName is required");
  }

  const totalChunks = Math.max(1, Math.ceil(bytes.length / CHUNK_SIZE_BYTES));
  const initRes = await authFetch(`${host}/messages/upload-session/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName,
      contentType,
      totalSize: bytes.length,
      totalChunks,
    }),
  }, host);
  if (!initRes.ok) {
    throw new Error(`Upload init failed: ${initRes.status}`);
  }
  const initData = await initRes.json();
  const uploadId = initData?.uploadId;
  if (!uploadId) {
    throw new Error("Upload init missing uploadId");
  }

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * CHUNK_SIZE_BYTES;
    const end = Math.min(bytes.length, start + CHUNK_SIZE_BYTES);
    const chunk = bytes.slice(start, end);
    const chunkRes = await authFetch(`${host}/messages/upload-session/chunk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        chunkIndex,
        totalChunks,
        chunkBase64: arrayBufferToBase64(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength)),
      }),
    }, host);
    if (!chunkRes.ok) {
      throw new Error(`Upload chunk failed: ${chunkRes.status}`);
    }
  }

  const commitRes = await authFetch(`${host}/messages/upload-session/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId }),
  }, host);
  if (!commitRes.ok) {
    throw new Error(`Upload commit failed: ${commitRes.status}`);
  }
  return commitRes.json();
}

export { uploadMediaInChunks };
