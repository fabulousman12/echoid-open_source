export function normalizeMessageIds(messageIds) {
  if (Array.isArray(messageIds)) return messageIds.filter(Boolean);
  if (!messageIds) return [];
  return [messageIds];
}

export function buildUnreadUpdate({ messageIds, sender, recipient }) {
  return {
    type: "update",
    updateType: "unread",
    messageIds: normalizeMessageIds(messageIds),
    sender,
    recipient
  };
}
