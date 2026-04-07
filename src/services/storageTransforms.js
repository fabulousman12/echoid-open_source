export function transformDirectMessageRows(rowGroups = []) {
  const flatMessages = (Array.isArray(rowGroups) ? rowGroups : [])
    .flat()
    .map((row) => ({
      id: row.id,
      sender: row.sender,
      recipient: row.recipient,
      content: row.content,
      timestamp: new Date(row.timestamp).toISOString(),
      status: row.status,
      read: row.read,
      isDeleted: row.isDeleted,
      isDownload: row.isDownload,
      type: row.type,
      file_name: row.file_name === "null" ? null : row.file_name,
      file_type: row.file_type === "null" ? null : row.file_type,
      file_size: row.file_size,
      thumbnail: row.thumbnail === "null" ? null : row.thumbnail,
      file_path: row.file_path === "null" ? null : row.file_path,
      isSent: row.isSent,
      isError: row.isError,
      encryptedMessage: row.encryptedMessage === "null" ? null : row.encryptedMessage,
      encryptedAESKey: row.encryptedAESKey === "null" ? null : row.encryptedAESKey,
      eniv: row.eniv === "null" ? null : row.eniv,
      isReplyTo: row.isReplyTo === "null" ? null : row.isReplyTo,
    }));

  flatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return flatMessages;
}

export function transformGroupMessageRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id,
    groupId: row.group_id,
    sender: row.sender,
    messageType: row.message_type || "text",
    content: row.content,
    mediaUrl: row.media_url,
    previewUrl: row.preview_url,
    isDownload: Number(row.is_download || 0) === 1,
    isReplyTo: row.is_reply_to || null,
    timestamp: row.timestamp,
    status: row.status,
    readBy: JSON.parse(row.read_by || "[]"),
  }));
}

export function prepareDirectMessageWrite(message = {}) {
  return [
    message.id,
    message.sender,
    message.recipient,
    message.content || null,
    new Date(message.timestamp).toISOString(),
    message.status || "pending",
    message.read ? 1 : 0,
    message.isDeleted ? 1 : 0,
    message.isDownload ? 1 : 0,
    message.type || "messages",
    message.file_name || null,
    message.file_type || null,
    message.file_size || null,
    message.thumbnail || null,
    message.file_path || null,
    message.isSent ? 1 : 0,
    message.isError ? 1 : 0,
    message.encryptedMessage || null,
    message.encryptedAESKey || null,
    message.eniv || null,
    message.isReplyTo || null,
  ];
}

export function prepareGroupMessageWrite(message = {}) {
  const ts = new Date(message.timestamp || Date.now()).toISOString();
  const readBy = Array.isArray(message.readBy) ? message.readBy : [];

  return [
    String(message.id || message._id),
    String(message.groupId || message.group_id),
    String(message.sender),
    String(message.messageType || message.type || "text"),
    message.content || null,
    message.mediaUrl || null,
    message.previewUrl || null,
    message.isDownload ? 1 : 0,
    message.isReplyTo || message.is_reply_to || null,
    ts,
    message.status || "sent",
    JSON.stringify(readBy),
    new Date().toISOString(),
  ];
}

export function prepareGroupSummaryWrites(groups = []) {
  return (Array.isArray(groups) ? groups : [])
    .map((group) => {
      const gid = String(group?.id || group?._id || "").trim();
      if (!gid) return null;
      return [
        gid,
        group?.name || "",
        group?.description || "",
        group?.avatar || "",
        String(group?.owner || group?.createdBy || ""),
        Number(group?.unreadCount || 0),
        group?.latestMessage || "",
        group?.latestMessageTimestamp
          ? new Date(group.latestMessageTimestamp).toISOString()
          : null,
        Number(group?.memberCount || 0),
        group?.isActive === false ? 0 : 1,
        group?.isDelete === true || group?.isDeleted === true ? 1 : 0,
        group?.updatedAt ? new Date(group.updatedAt).toISOString() : new Date().toISOString(),
      ];
    })
    .filter(Boolean);
}
