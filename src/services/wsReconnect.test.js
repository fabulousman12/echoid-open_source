import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scheduleReconnect, clearReconnect, hasReconnectScheduled } from "./wsReconnect";

describe("wsReconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearReconnect();
  });

  it("schedules a single reconnect and replaces prior timers", () => {
    const connect = vi.fn();

    scheduleReconnect(connect, "wss://a", 5000);
    scheduleReconnect(connect, "wss://b", 5000);

    expect(hasReconnectScheduled()).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith("wss://b");
  });

  it("clears reconnect timer", () => {
    const connect = vi.fn();
    scheduleReconnect(connect, "wss://a", 5000);
    clearReconnect();
    vi.advanceTimersByTime(5000);
    expect(connect).not.toHaveBeenCalled();
  });
});
