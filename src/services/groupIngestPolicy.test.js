import { describe, it, expect } from "vitest";
import { shouldUpsertIncomingGroupSummary } from "./groupIngestPolicy";

describe("groupIngestPolicy", () => {
  it("returns false for unknown group when groupDetails fetch failed", () => {
    expect(
      shouldUpsertIncomingGroupSummary({
        groupWasKnown: false,
        fetchedSummary: null,
      })
    ).toBe(false);
  });

  it("returns true when group is already known locally", () => {
    expect(
      shouldUpsertIncomingGroupSummary({
        groupWasKnown: true,
        fetchedSummary: null,
      })
    ).toBe(true);
  });

  it("returns true when groupDetails fetch returns summary", () => {
    expect(
      shouldUpsertIncomingGroupSummary({
        groupWasKnown: false,
        fetchedSummary: { id: "g1", name: "Echo" },
      })
    ).toBe(true);
  });
});

