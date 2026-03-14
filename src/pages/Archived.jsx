import React, { useMemo, useState } from "react";
import { FaArrowLeft, FaArchive, FaUsers } from "react-icons/fa";
import { useHistory } from "react-router-dom";
import "./Archived.css";

const normalizeUser = (user) => {
  if (!user) return null;
  const id = String(user.id || user._id || "").trim();
  if (!id) return null;
  return {
    id,
    type: "user",
    name: user.name || "Unknown User",
    avatar: user.avatar || user.profilePhoto || "",
    subtitle: user.lastMessage || "No messages yet",
    timestamp: user.timestamp || user.updatedAt || null,
    isArchive: Boolean(user.isArchive),
  };
};

const normalizeGroup = (group) => {
  if (!group) return null;
  const id = String(group.id || group._id || "").trim();
  if (!id) return null;
  const latest = String(group.latestMessage || "").trim();
  const sender = String(group.latestMessageSenderName || "").trim();
  return {
    id,
    type: "group",
    name: group.name || "Unnamed Group",
    avatar: group.avatar || "",
    subtitle: latest ? (sender ? `${sender}: ${latest}` : latest) : (group.description || "No messages yet"),
    timestamp: group.latestMessageTimestamp || group.updatedAt || null,
    isArchive: Boolean(group.isArchive),
    isDelete: Boolean(group.isDelete || group.isDeleted),
    unreadCount: Number(group.unreadCount || 0),
    memberCount: Number(group.memberCount || 0),
  };
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const ArchivedRow = ({ item, selected, onClick, onLongPress }) => {
  let longPressTimer = null;
  const startLongPress = () => {
    longPressTimer = setTimeout(() => onLongPress(item), 550);
  };
  const clearLongPress = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

  return (
    <div
      className={`archived-row ${selected ? "is-selected" : ""}`}
      onClick={() => onClick(item)}
      onMouseDown={startLongPress}
      onMouseUp={clearLongPress}
      onMouseLeave={clearLongPress}
      onTouchStart={startLongPress}
      onTouchEnd={clearLongPress}
    >
      <div className="archived-row-avatar-wrap">
        {item.avatar ? (
          <img src={item.avatar} alt={item.name} className="archived-row-avatar" />
        ) : (
          <div className="archived-row-avatar archived-row-avatar-fallback">
            {item.type === "group" ? <FaUsers size={18} /> : item.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="archived-row-main">
        <div className="archived-row-top">
          <div className="archived-row-name">{item.name}</div>
          <div className="archived-row-time">{formatTime(item.timestamp)}</div>
        </div>
        <div className="archived-row-subtitle">{item.subtitle}</div>
      </div>
    </div>
  );
};

export default function ArchivedChats({
  usersMain = [],
  setUsersMain,
  selectedUser1,
  groupsMain = [],
  setGroupsMain,
}) {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState("chats");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [search, setSearch] = useState("");

  const archivedUsers = useMemo(
    () =>
      (Array.isArray(usersMain) ? usersMain : [])
        .map(normalizeUser)
        .filter((item) => item?.isArchive),
    [usersMain]
  );

  const archivedGroups = useMemo(
    () =>
      (Array.isArray(groupsMain) ? groupsMain : [])
        .map(normalizeGroup)
        .filter((item) => item?.isArchive && !item?.isDelete),
    [groupsMain]
  );

  const visibleItems = useMemo(() => {
    const base = activeTab === "groups" ? archivedGroups : archivedUsers;
    const q = search.trim().toLowerCase();
    return base
      .filter((item) => {
        if (!q) return true;
        return [item.name, item.subtitle].some((value) => String(value || "").toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [activeTab, archivedGroups, archivedUsers, search]);

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedItems([]);
  };

  const toggleSelection = (item) => {
    const key = `${item.type}:${item.id}`;
    setSelectedItems((prev) => (prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]));
  };

  const handleItemClick = (item) => {
    if (selectionMode) {
      toggleSelection(item);
      return;
    }
    if (item.type === "group") {
      const source = (Array.isArray(groupsMain) ? groupsMain : []).find((group) => String(group?.id || group?._id || "") === item.id);
      history.push("/group-chatwindow", { groupdetails: source || item });
      return;
    }
    const source = (Array.isArray(usersMain) ? usersMain : []).find((user) => String(user?.id || user?._id || "") === item.id);
    if (selectedUser1?.current) selectedUser1.current = item.id;
    history.push("/chatwindow", { userdetails: source || item, callback: "goBackToUserList" });
  };

  const handleLongPress = (item) => {
    const key = `${item.type}:${item.id}`;
    setSelectionMode(true);
    setSelectedItems((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const handleUnarchive = () => {
    if (!selectedItems.length) return;
    const selectedUserIds = new Set(
      selectedItems.filter((key) => key.startsWith("user:")).map((key) => key.split(":")[1])
    );
    const selectedGroupIds = new Set(
      selectedItems.filter((key) => key.startsWith("group:")).map((key) => key.split(":")[1])
    );

    if (selectedUserIds.size > 0) {
      const updatedUsers = (Array.isArray(usersMain) ? usersMain : []).map((user) =>
        selectedUserIds.has(String(user?.id || user?._id || "")) ? { ...user, isArchive: false, isMuted: false } : user
      );
      globalThis.storage.setItem("usersMain", JSON.stringify(updatedUsers));
      const mutedUsers = (globalThis.storage.readJSON("mutedUsers", []) || []).filter(
        (id) => !selectedUserIds.has(String(id))
      );
      globalThis.storage.setItem("mutedUsers", JSON.stringify(mutedUsers));
      setUsersMain(updatedUsers);
    }

    if (selectedGroupIds.size > 0) {
      const updatedGroups = (Array.isArray(groupsMain) ? groupsMain : []).map((group) =>
        selectedGroupIds.has(String(group?.id || group?._id || "")) ? { ...group, isArchive: false } : group
      );
      globalThis.storage.setItem("groupsMain", JSON.stringify(updatedGroups));
      if (typeof setGroupsMain === "function") setGroupsMain(updatedGroups);
    }

    clearSelection();
  };

  return (
    <div className="archived-page">
      <div className="archived-shell">
        <header className="archived-header">
          <div className="archived-header-left">
            <button type="button" className="archived-back-btn" onClick={() => history.push("/home")}>
              <FaArrowLeft size={16} />
            </button>
            <div>
              <div className="archived-eyebrow">Library</div>
              <h1 className="archived-title">{selectionMode ? `${selectedItems.length} selected` : "Archived Chats"}</h1>
            </div>
          </div>
          {selectionMode ? (
            <div className="archived-actions">
              <button type="button" className="archived-action-btn" onClick={handleUnarchive}>
                <FaArchive size={14} />
                <span>Unarchive</span>
              </button>
              <button type="button" className="archived-action-btn secondary" onClick={clearSelection}>
                Cancel
              </button>
            </div>
          ) : null}
        </header>

        <div className="archived-toolbar">
          <div className="archived-tabs">
            <button
              type="button"
              className={`archived-tab ${activeTab === "chats" ? "is-active" : ""}`}
              onClick={() => setActiveTab("chats")}
            >
              Chats
            </button>
            <button
              type="button"
              className={`archived-tab ${activeTab === "groups" ? "is-active" : ""}`}
              onClick={() => setActiveTab("groups")}
            >
              Groups
            </button>
          </div>
          <input
            type="text"
            className="archived-search"
            placeholder={activeTab === "groups" ? "Search archived groups" : "Search archived chats"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="archived-list">
          {visibleItems.length > 0 ? (
            visibleItems.map((item) => (
              <ArchivedRow
                key={`${item.type}:${item.id}`}
                item={item}
                selected={selectedItems.includes(`${item.type}:${item.id}`)}
                onClick={handleItemClick}
                onLongPress={handleLongPress}
              />
            ))
          ) : (
            <div className="archived-empty">
              <div className="archived-empty-title">Nothing archived here</div>
              <div className="archived-empty-text">
                {activeTab === "groups"
                  ? "Long press a group in the group list and archive it to see it here."
                  : "Archive a chat from the main chat list to keep it out of the way without deleting it."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
