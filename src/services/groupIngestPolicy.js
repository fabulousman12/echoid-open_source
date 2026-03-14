export function shouldUpsertIncomingGroupSummary({ groupWasKnown, fetchedSummary }) {
  return Boolean(groupWasKnown || fetchedSummary);
}

