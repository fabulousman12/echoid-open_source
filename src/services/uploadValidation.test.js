import { describe, it, expect } from "vitest";
import { getUploadUrl, isValidUploadResult } from "./uploadValidation";

describe("uploadValidation", () => {
  it("reads uploadUrl or fileUrl", () => {
    expect(getUploadUrl({ uploadUrl: "https://u" })).toBe("https://u");
    expect(getUploadUrl({ fileUrl: "https://f" })).toBe("https://f");
    expect(getUploadUrl(null)).toBe("");
  });

  it("validates upload results", () => {
    expect(isValidUploadResult({ uploadUrl: "https://u" })).toBe(true);
    expect(isValidUploadResult({ fileUrl: "https://f" })).toBe(true);
    expect(isValidUploadResult({ uploadUrl: "   " })).toBe(false);
    expect(isValidUploadResult(null)).toBe(false);
  });
});
