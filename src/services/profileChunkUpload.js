import { authFetch } from "./apiClient";

const CHUNK_SIZE_BYTES = 256 * 1024;

const dataUrlToBlob = async (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const res = await fetch(dataUrl);
  return res.blob();
};

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

const buildClientFileName = (mimeType = "image/jpeg") => {
  const ext =
    mimeType.includes("png") ? "png" :
    mimeType.includes("webp") ? "webp" :
    mimeType.includes("heic") ? "heic" :
    "jpg";
  return `profile_${Date.now()}.${ext}`;
};

const buildFetchers = (host, authenticated, endpointBase) => {
  if (authenticated) {
    return {
      init: (payload) =>
        authFetch(`${host}${endpointBase}/init-auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }, host),
      chunk: (payload) =>
        authFetch(`${host}${endpointBase}/chunk-auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }, host),
      commit: (payload) =>
        authFetch(`${host}${endpointBase}/commit-auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }, host),
    };
  }

  return {
    init: (payload) =>
      fetch(`${host}${endpointBase}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    chunk: (payload) =>
      fetch(`${host}${endpointBase}/chunk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    commit: (payload) =>
      fetch(`${host}${endpointBase}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
  };
};

async function uploadImageInChunks(
  host,
  imageDataUrl,
  {
    authenticated = false,
    endpointBase = "/user/profile-upload",
    fileNamePrefix = "profile",
  } = {}
) {
  const blob = await dataUrlToBlob(imageDataUrl);
  if (!blob) {
    throw new Error("Could not prepare image");
  }

  const fileName = buildClientFileName(blob.type || "image/jpeg").replace(/^profile_/, `${fileNamePrefix}_`);
  const totalChunks = Math.max(1, Math.ceil(blob.size / CHUNK_SIZE_BYTES));
  const transport = buildFetchers(host, authenticated, endpointBase);

  const initRes = await transport.init({
    fileName,
    mimeType: blob.type || "image/jpeg",
    totalSize: blob.size || 0,
    totalChunks,
  });
  if (!initRes.ok) {
    throw new Error(`Profile upload init failed: ${initRes.status}`);
  }

  const initData = await initRes.json();
  const uploadId = initData?.uploadId;
  if (!uploadId) {
    throw new Error("Profile upload init did not return uploadId");
  }

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * CHUNK_SIZE_BYTES;
    const end = Math.min(blob.size, start + CHUNK_SIZE_BYTES);
    const chunkBlob = blob.slice(start, end);
    const chunkBuffer = await chunkBlob.arrayBuffer();
    const chunkBase64 = arrayBufferToBase64(chunkBuffer);

    const chunkRes = await transport.chunk({
      uploadId,
      chunkIndex,
      totalChunks,
      chunkBase64,
    });
    if (!chunkRes.ok) {
      throw new Error(`Profile upload chunk failed: ${chunkRes.status}`);
    }
  }

  const commitRes = await transport.commit({ uploadId });
  if (!commitRes.ok) {
    throw new Error(`Profile upload commit failed: ${commitRes.status}`);
  }

  const commitData = await commitRes.json();
  if (!commitData?.uploadId) {
    throw new Error("Profile upload commit did not return uploadId");
  }

  return {
    uploadId: commitData.uploadId,
    mimeType: commitData.mimeType || blob.type || "image/jpeg",
    totalSize: commitData.totalSize || blob.size || 0,
  };
}

async function uploadProfileImageInChunks(host, imageDataUrl, options = {}) {
  return uploadImageInChunks(host, imageDataUrl, {
    ...options,
    endpointBase: "/user/profile-upload",
    fileNamePrefix: "profile",
  });
}

async function uploadGroupAvatarInChunks(host, imageDataUrl, options = {}) {
  return uploadImageInChunks(host, imageDataUrl, {
    authenticated: true,
    ...options,
    endpointBase: "/api/groups/avatar-upload",
    fileNamePrefix: "group_avatar",
  });
}

export { uploadProfileImageInChunks, uploadGroupAvatarInChunks };
