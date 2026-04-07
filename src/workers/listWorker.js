self.onmessage = (event) => {
  const data = event?.data || {};
  const { requestId, type, payload } = data;

  try {
    if (type === "userMain") {
      const users = Array.isArray(payload?.users) ? payload.users : [];
      const currentUserId = String(payload?.currentUserId || "");
      const term = String(payload?.term || "").trim().toLowerCase();

      const result = users
        .filter((user) => {
          if (!user || user.isArchive) return false;
          if (String(user.id || "") === currentUserId) return false;
          if (!term) return true;
          const haystacks = [
            user?.name,
            user?.phoneNumber,
            user?.email,
            user?.lastMessage,
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());
          return haystacks.some((value) => value.includes(term));
        })
        .map((user) => ({
          ...user,
          _sortTimestamp: new Date(user?.timestamp || 0).getTime() || 0,
        }))
        .sort((a, b) => b._sortTimestamp - a._sortTimestamp);

      self.postMessage({ requestId, type, result });
      return;
    }

    if (type === "groupMain") {
      const groups = Array.isArray(payload?.groups) ? payload.groups : [];
      const searchQuery = String(payload?.searchQuery || "").trim().toLowerCase();

      const result = groups
        .filter(Boolean)
        .map((group) => {
          const latestMessageValue =
            typeof group.latestMessage === "string"
              ? group.latestMessage
              : (group.latestMessage?.content || group.lastMessage || "");
          const latestSenderName =
            group.latestMessageSenderName ||
            group.lastMessageSenderName ||
            group.latestMessage?.senderName ||
            group.latestMessage?.sender?.name ||
            group.senderName ||
            "";

          return {
            id: String(group.id || group._id || "").trim(),
            name: String(group.name || group.groupName || "").trim(),
            description: group.description || "",
            avatar: group.avatar || group.profilePhoto || "",
            owner: group.owner || group.createdBy || "",
            memberCount: Number(group.memberCount || group.membersCount || 0),
            unreadCount: Number(group.unreadCount || 0),
            latestMessage: String(latestMessageValue || ""),
            latestMessageSenderName: String(latestSenderName || ""),
            latestMessageTimestamp: group.latestMessageTimestamp || group.lastMessageTimestamp || null,
            updatedAt: group.updatedAt || group.timestamp || null,
            isActive: group.isActive !== false,
            isArchive: Boolean(group.isArchive),
            isDelete: Boolean(group.isDelete || group.isDeleted),
            phoneNumber: group.phoneNumber || "",
          };
        })
        .filter((group) => {
          const looksLikeUserRow =
            Boolean(group.phoneNumber) &&
            !group.memberCount &&
            !group.latestMessage;
          if (looksLikeUserRow) return false;
          if (!group.id) return false;
          if (group.isArchive || group.isDelete) return false;
          if (!String(group.name || "").trim()) return false;
          if (!searchQuery) return true;
          return [group.name, group.description, group.latestMessage, group.latestMessageSenderName]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchQuery));
        })
        .sort((a, b) => {
          const ta = new Date(a.latestMessageTimestamp || a.updatedAt || 0).getTime();
          const tb = new Date(b.latestMessageTimestamp || b.updatedAt || 0).getTime();
          return tb - ta;
        });

      self.postMessage({ requestId, type, result });
    }
  } catch (error) {
    self.postMessage({
      requestId,
      type,
      error: error?.message || "Worker processing failed",
    });
  }
};
