// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

let listener;

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    addListener: (eventName, cb) => {
      if (eventName === "localNotificationActionPerformed") {
        listener = cb;
      }
      return { remove: vi.fn() };
    }
  }
}));

vi.mock("./callRingtone", () => ({
  stopCallRingtone: vi.fn(),
  clearCallTimeout: vi.fn()
}));

describe("notificationBootstrap", () => {
  beforeEach(async () => {
    vi.resetModules();
    listener = undefined;
    window.__CALL_NOTIFICATION_ACTION__ = null;
    await import("./notificationBootstrap");
  });

  it("sets call notification action flag when callId exists", async () => {
    await listener({
      notification: { extra: { callId: "c1" } },
      actionId: "DECLINE"
    });
    expect(window.__CALL_NOTIFICATION_ACTION__).toBe("DECLINE");
  });

  it("ignores non-call notifications", async () => {
    expect(typeof listener).toBe("function");
    await listener({
      notification: { extra: { other: true } },
      actionId: "ANSWER"
    });
    expect(window.__CALL_NOTIFICATION_ACTION__).toBeNull();
  });
});
