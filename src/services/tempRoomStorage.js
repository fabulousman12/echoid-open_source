const ROOMS_KEY = "temporaryRooms";
const MESSAGES_KEY = "temporaryRoomMessages";
const REQUESTS_KEY = "temporaryRoomRequests";

function sessionGet(key) {
  try {
    return globalThis.sessionStorage?.getItem?.(key) || null;
  } catch {
    return null;
  }
}

function emitUpdate() {
  try {
    window.dispatchEvent(new CustomEvent("temporary-rooms-updated"));
  } catch {
    // no-op
  }
}

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(sessionGet(key) || JSON.stringify(fallback));
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  const currentRaw = sessionGet(key) || (Array.isArray(value) ? "[]" : "{}");
  const nextRaw = JSON.stringify(value);
  if (currentRaw === nextRaw) return false;
  try {
    globalThis.sessionStorage?.setItem?.(key, nextRaw);
    emitUpdate();
    return true;
  } catch {
    return false;
  }
}

export function normalizeTemporaryRoom(room = {}) {
  const id = String(room.id || room._id || "").trim();
  const uid = String(room.uid || "").trim();
  const members = Array.isArray(room.members) ? room.members.map((member) => String(member)) : [];
  const entryType = String(room.entryType || "room") === "request" ? "request" : "room";
  return {
    id: id || uid,
    uid: uid || id,
    name: String(room.name || room.roomName || "Room").trim(),
    kind: room.kind === "group" ? "group" : "chat",
    creatorId: String(room.creatorId || ""),
    creatorName: String(room.creatorName || ""),
    members,
    memberCount: Number(room.memberCount || members.length || 1),
    latestMessage: String(room.latestMessage || ""),
    latestMessageTimestamp: room.latestMessageTimestamp || room.updatedAt || new Date().toISOString(),
    unreadCount: Number(room.unreadCount || 0),
    createdAt: room.createdAt || null,
    updatedAt: room.updatedAt || null,
    entryType,
    requestId: room.requestId ? String(room.requestId) : "",
    requestStatus: room.requestStatus ? String(room.requestStatus) : "",
    clickable: entryType !== "request",
  };
}

export function normalizeTemporaryRequest(request = {}) {
  const id = String(request.id || request._id || "").trim();
  if (!id) return null;
  return {
    id,
    roomId: String(request.roomId || request.room?._id || request.room?.id || "").trim(),
    roomUid: String(request.roomUid || request.room?.uid || "").trim(),
    roomName: String(request.roomName || request.room?.name || "Chatroom").trim(),
    creatorId: String(request.creatorId || request.room?.creatorId || "").trim(),
    userId: String(request.userId || "").trim(),
    userName: String(request.userName || "").trim(),
    status: String(request.status || "pending").trim(),
    direction: String(request.direction || "incoming") === "outgoing" ? "outgoing" : "incoming",
    createdAt: request.createdAt || null,
    updatedAt: request.updatedAt || null,
  };
}

export function createTemporaryRoomRequestEntry(request = {}) {
  const normalized = normalizeTemporaryRequest(request);
  if (!normalized) return null;
  return normalizeTemporaryRoom({
    id: normalized.roomId || normalized.roomUid,
    uid: normalized.roomUid,
    name: normalized.roomName || "Chatroom",
    creatorId: normalized.creatorId,
    latestMessage: normalized.status === "declined" ? "Join request declined" : "Request sent to join this room",
    latestMessageTimestamp: normalized.updatedAt || normalized.createdAt || new Date().toISOString(),
    entryType: "request",
    requestId: normalized.id,
    requestStatus: normalized.status,
    clickable: false,
  });
}

export function readTemporaryRooms() {
  const parsed = readJson(ROOMS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function writeTemporaryRooms(rooms = []) {
  writeJson(ROOMS_KEY, rooms);
}

export function readTemporaryMessagesByRoom() {
  return readJson(MESSAGES_KEY, {});
}

export function writeTemporaryMessagesByRoom(map = {}) {
  writeJson(MESSAGES_KEY, map);
}

export function readTemporaryRequests() {
  const parsed = readJson(REQUESTS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function writeTemporaryRequests(requests = []) {
  writeJson(REQUESTS_KEY, requests);
}

function sortRoomEntries(entries = []) {
  return [...entries].sort(
    (a, b) => new Date(b.latestMessageTimestamp || 0).getTime() - new Date(a.latestMessageTimestamp || 0).getTime()
  );
}

export function upsertTemporaryRoom(room) {
  const normalized = normalizeTemporaryRoom(room);
  const existing = readTemporaryRooms();
  const next = [...existing];
  const index = next.findIndex((entry) => String(entry.uid) === String(normalized.uid));
  if (index >= 0) {
    next[index] = { ...next[index], ...normalized };
  } else {
    next.unshift(normalized);
  }
  writeTemporaryRooms(sortRoomEntries(next));
  return normalized;
}

export function setTemporaryRooms(rooms = [], requests = []) {
  const existingMap = new Map(readTemporaryRooms().map((room) => [String(room.uid), room]));
  const actualRooms = rooms
    .map((room) => {
      const normalized = normalizeTemporaryRoom(room);
      const existing = existingMap.get(String(normalized.uid)) || {};
      return { ...existing, ...normalized, entryType: "room", clickable: true, requestId: "", requestStatus: "" };
    });
  const requestEntries = requests
    .map((request) => createTemporaryRoomRequestEntry(request))
    .filter(Boolean)
    .filter((entry) => !actualRooms.some((room) => String(room.uid) === String(entry.uid)));

  writeTemporaryRooms(sortRoomEntries([...actualRooms, ...requestEntries]));
}

export function upsertTemporaryRequest(request) {
  const normalized = normalizeTemporaryRequest(request);
  if (!normalized) return null;
  const existing = readTemporaryRequests();
  const next = [...existing];
  const index = next.findIndex((entry) => String(entry.id) === String(normalized.id));
  if (index >= 0) next[index] = { ...next[index], ...normalized };
  else next.unshift(normalized);
  writeTemporaryRequests(next);

  if (normalized.direction === "outgoing" && normalized.status === "pending") {
    const requestEntry = createTemporaryRoomRequestEntry(normalized);
    if (requestEntry) upsertTemporaryRoom(requestEntry);
  }
  return normalized;
}

export function setTemporaryRequests(requests = [], direction = "incoming") {
  const existing = readTemporaryRequests().filter((request) => String(request.direction) !== String(direction));
  const normalized = requests
    .map((request) => normalizeTemporaryRequest({ ...request, direction }))
    .filter(Boolean);
  writeTemporaryRequests([...existing, ...normalized]);
}

export function removeTemporaryRequest(requestId) {
  const key = String(requestId || "").trim();
  if (!key) return;
  const existingRequests = readTemporaryRequests();
  const target = existingRequests.find((entry) => String(entry.id) === key);
  writeTemporaryRequests(existingRequests.filter((entry) => String(entry.id) !== key));

  if (target?.direction === "outgoing") {
    writeTemporaryRooms(
      readTemporaryRooms().filter((room) => String(room.requestId || "") !== key)
    );
  }
}

export function removeTemporaryRequestsForRoom(roomUid, direction) {
  const key = String(roomUid || "").trim();
  if (!key) return;
  const existingRequests = readTemporaryRequests();
  const removedRequests = existingRequests.filter((request) => {
    if (String(request.roomUid) !== key) return false;
    if (!direction) return true;
    return String(request.direction) === String(direction);
  });

  if (removedRequests.length === 0) return;

  writeTemporaryRequests(existingRequests.filter((request) => !removedRequests.includes(request)));
  writeTemporaryRooms(
    readTemporaryRooms().filter((room) => {
      if (String(room.uid) !== key) return true;
      if (String(room.entryType) !== "request") return true;
      if (!direction) return false;
      return !removedRequests.some((request) => String(request.id) === String(room.requestId || ""));
    })
  );
}

export function getTemporaryRequestsForRoom(roomUid, direction) {
  const key = String(roomUid || "").trim();
  return readTemporaryRequests().filter((request) => {
    if (String(request.roomUid) !== key) return false;
    if (!direction) return true;
    return String(request.direction) === String(direction);
  });
}

export function appendTemporaryMessage(message, { incrementUnread = false } = {}) {
  const roomUid = String(message.roomUid || message.uid || "").trim();
  if (!roomUid) return null;

  const messagesByRoom = readTemporaryMessagesByRoom();
  const current = Array.isArray(messagesByRoom[roomUid]) ? messagesByRoom[roomUid] : [];
  const nextMessage = {
    id: String(message.id || `${roomUid}-${Date.now()}`),
    roomId: String(message.roomId || ""),
    roomUid,
    senderId: String(message.senderId || message.sender || ""),
    senderName: String(message.senderName || ""),
    content: String(message.content || ""),
    timestamp: message.timestamp || new Date().toISOString(),
  };

  if (!current.some((entry) => String(entry.id) === nextMessage.id)) {
    messagesByRoom[roomUid] = [...current, nextMessage].sort(
      (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );
    writeTemporaryMessagesByRoom(messagesByRoom);
  }

  const existingRooms = readTemporaryRooms();
  const index = existingRooms.findIndex((entry) => String(entry.uid) === roomUid);
  const roomBase = index >= 0
    ? existingRooms[index]
    : normalizeTemporaryRoom({ uid: roomUid, id: message.roomId, name: message.roomName || "Room" });
  const updatedRoom = {
    ...roomBase,
    entryType: "room",
    clickable: true,
    requestId: "",
    requestStatus: "",
    latestMessage: nextMessage.content,
    latestMessageTimestamp: nextMessage.timestamp,
    unreadCount: Math.max(0, Number(roomBase.unreadCount || 0) + (incrementUnread ? 1 : 0)),
  };
  upsertTemporaryRoom(updatedRoom);
  return nextMessage;
}

export function getTemporaryMessages(roomUid) {
  const key = String(roomUid || "").trim();
  if (!key) return [];
  const map = readTemporaryMessagesByRoom();
  return Array.isArray(map[key]) ? map[key] : [];
}

export function resetTemporaryUnread(roomUid) {
  const key = String(roomUid || "").trim();
  if (!key) return;
  let changed = false;
  const next = readTemporaryRooms().map((room) => {
    if (String(room.uid) !== key) return room;
    if (Number(room.unreadCount || 0) === 0) return room;
    changed = true;
    return { ...room, unreadCount: 0 };
  });
  if (!changed) return;
  writeTemporaryRooms(next);
}

export function removeTemporaryRoom(roomUid) {
  const key = String(roomUid || "").trim();
  if (!key) return;
  writeTemporaryRooms(readTemporaryRooms().filter((room) => String(room.uid) !== key));

  const messagesByRoom = readTemporaryMessagesByRoom();
  if (Object.prototype.hasOwnProperty.call(messagesByRoom, key)) {
    delete messagesByRoom[key];
    writeTemporaryMessagesByRoom(messagesByRoom);
  }

  writeTemporaryRequests(readTemporaryRequests().filter((request) => String(request.roomUid) !== key));
}
