const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getStatusExpiryMs = (status) => {
  const expiry = new Date(status?.expiresAt || status?.expiryAt || 0).getTime();
  if (Number.isFinite(expiry) && expiry > 0) return expiry;
  const created = new Date(status?.createdAt || status?.timestamp || 0).getTime();
  if (Number.isFinite(created) && created > 0) return created + STATUS_LIFETIME_MS;
  return 0;
};

const pruneReadMap = (mapLike) => {
  const now = Date.now();
  const input = mapLike && typeof mapLike === "object" ? mapLike : {};
  const next = {};
  Object.entries(input).forEach(([id, expiry]) => {
    const expiryMs = Number(expiry) || 0;
    if (id && expiryMs > now) next[String(id)] = expiryMs;
  });
  return next;
};

const applyLocalReadToStatuses = (statuses = [], readMapLike = {}) => {
  const map = pruneReadMap(readMapLike);
  const now = Date.now();
  return safeArray(statuses)
    .map((status) => {
      const id = String(status?.id || "");
      const expiryMs = getStatusExpiryMs(status);
      if (!id || expiryMs <= now) return null;
      const isRead = Number(map[id] || 0) > now;
      return {
        ...status,
        localRead: isRead,
        localReadExpiry: map[id] || null,
      };
    })
    .filter(Boolean);
};

const pickRemoteAuthoritativeStatuses = (localRows = [], remoteRows = []) => {
  const byId = new Map(
    safeArray(localRows)
      .filter((row) => row?.id)
      .map((row) => [String(row.id), row])
  );
  return safeArray(remoteRows)
    .filter((row) => row?.id)
    .map((row) => {
      const local = byId.get(String(row.id));
      if (!local) return row;
      return {
        ...row,
        localRead: Boolean(local.localRead || row.localRead),
        localReadExpiry: local.localReadExpiry || row.localReadExpiry || null,
      };
    });
};

const mergeStatusesById = (prevList = [], nextList = []) => {
  const byId = new Map();
  safeArray(prevList).forEach((item) => {
    if (!item?.id) return;
    byId.set(String(item.id), item);
  });
  safeArray(nextList).forEach((item) => {
    if (!item?.id) return;
    const key = String(item.id);
    const prev = byId.get(key) || {};
    byId.set(key, {
      ...prev,
      ...item,
      localRead: Boolean(prev.localRead || item.localRead),
      localReadExpiry: item.localRead ? item.localReadExpiry : prev.localReadExpiry || item.localReadExpiry || null,
    });
  });
  return Array.from(byId.values());
};

const groupFeedByUser = (statuses = []) => {
  const byUser = new Map();
  safeArray(statuses).forEach((status) => {
    const existing = byUser.get(status.userId);
    if (!existing) {
      byUser.set(status.userId, status);
      return;
    }
    const existingTime = new Date(existing.createdAt || 0).getTime();
    const currentTime = new Date(status.createdAt || 0).getTime();
    if (currentTime >= existingTime) {
      byUser.set(status.userId, status);
    }
  });
  return Array.from(byUser.values());
};

export function syncMyStatuses({ localRows = [], remoteRows = [], readMap = {} }) {
  const authoritative = pickRemoteAuthoritativeStatuses(localRows, remoteRows);
  return applyLocalReadToStatuses(authoritative, readMap);
}

export function syncFeedStatuses({ prevRows = [], remoteRows = [], readMap = {}, cursor = false }) {
  if (cursor) {
    const incoming = applyLocalReadToStatuses(remoteRows, readMap);
    const mergedRaw = mergeStatusesById(prevRows, incoming);
    return {
      raw: mergedRaw,
      grouped: groupFeedByUser(mergedRaw),
    };
  }

  const authoritative = pickRemoteAuthoritativeStatuses(prevRows, remoteRows);
  const mergedRaw = mergeStatusesById([], applyLocalReadToStatuses(authoritative, readMap));
  return {
    raw: mergedRaw,
    grouped: groupFeedByUser(mergedRaw),
  };
}

export function pruneStatusesByIds({ rows = [], allowIds = [] }) {
  const allowSet = new Set(
    safeArray(allowIds)
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  );
  if (!allowSet.size) return safeArray(rows);
  return safeArray(rows).filter((row) => allowSet.has(String(row?.id || "").trim()));
}

export function groupStatusFeed({ rows = [] }) {
  return groupFeedByUser(rows);
}
