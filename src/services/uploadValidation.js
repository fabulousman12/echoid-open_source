export function getUploadUrl(result) {
  if (!result) return "";
  return result.uploadUrl || result.fileUrl || "";
}

export function isValidUploadResult(result) {
  const url = getUploadUrl(result);
  return typeof url === "string" && url.trim().length > 0;
}
