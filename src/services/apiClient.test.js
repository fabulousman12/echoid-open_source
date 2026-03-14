import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() }
}));

vi.mock("./authTokens", () => ({
  getAccessToken: vi.fn(async () => "old-token"),
  getRefreshToken: vi.fn(async () => "refresh-token"),
  setTokens: vi.fn(async () => {}),
  globalLogout: vi.fn(async () => {})
}));

vi.mock("./deviceInfo", () => ({
  getDeviceInfo: vi.fn(async () => ({})),
  getDeviceId: vi.fn(async () => "device-1")
}));

import { authFetch } from "./apiClient";
import { setTokens } from "./authTokens";

describe("apiClient refresh concurrency", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dedupes refresh calls when multiple requests 401 concurrently", async () => {
    const dataCalls = { count: 0 };
    const refreshCalls = { count: 0 };

    global.fetch = vi.fn(async (url) => {
      if (String(url).includes("/user/refresh")) {
        refreshCalls.count += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ authtoken: "new-token", refreshToken: "new-refresh" })
        };
      }

      dataCalls.count += 1;
      if (dataCalls.count <= 2) {
        return { ok: false, status: 401, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    });

    await Promise.all([
      authFetch("https://example.com/data", {}, "https://example.com"),
      authFetch("https://example.com/data", {}, "https://example.com")
    ]);

    expect(refreshCalls.count).toBe(1);
    expect(setTokens).toHaveBeenCalledTimes(1);
  });
});
