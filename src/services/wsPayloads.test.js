import { describe, it, expect } from "vitest";
import { normalizeMessageIds, buildUnreadUpdate } from "./wsPayloads";

describe("wsPayloads", () => {
  it("normalizes messageIds to array", () => {
    expect(normalizeMessageIds("a")).toEqual(["a"]);
    expect(normalizeMessageIds(["a", "b"])).toEqual(["a", "b"]);
    expect(normalizeMessageIds(null)).toEqual([]);
  });

  it("builds unread update payload", () => {
    const payload = buildUnreadUpdate({ messageIds: "id1", sender: "s1", recipient: "r1" });
    expect(payload).toEqual({
      type: "update",
      updateType: "unread",
      messageIds: ["id1"],
      sender: "s1",
      recipient: "r1"
    });
  });
});
