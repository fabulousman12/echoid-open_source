export const appendCallLog = ({
  userId,
  status,
  callStatus,
  read,
  timestamp
}) => {
  const nowIso = new Date().toISOString();
  const entryTimestamp = timestamp || nowIso;
  const entry = {
    id: `${userId || "unknown"}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    userid: userId || null,
    status,
    callstatus: callStatus,
    read: Boolean(read),
    timestamp: entryTimestamp
  };

  try {
    const existing = globalThis.storage?.readJSON?.("calls", []) || [];
    const list = Array.isArray(existing) ? existing : [];
    if (list.some((call) => call?.timestamp === entryTimestamp)) {
      return null;
    }
    const updated = [entry, ...(Array.isArray(existing) ? existing : [])];
    globalThis.storage?.setItem?.("calls", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("calls-updated"));
  } catch (error) {
    console.error("Failed to append call log:", error);
  }

  return entry;
};
