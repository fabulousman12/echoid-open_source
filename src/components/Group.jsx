import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isPlatform } from '@ionic/react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router';
import { api } from "../services/api";
import { LoginContext } from '../Contexts/UserContext';
import { WebSocketContext } from '../services/websokcetmain';
import useListWorker from '../hooks/useListWorker';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import img from '/img.jpg';
import './Group.css';

const GROUP_REQUESTS_LAST_SEEN_KEY = "groupRequestsLastSeenAt";
const INITIAL_VISIBLE_GROUPS = 10;
const VISIBLE_GROUPS_STEP = 10;
const GROUP_LOAD_MORE_THRESHOLD_PX = 160;

function normalizeGroup(raw) {
  if (!raw) return null;
  const looksLikeUserRow =
    Boolean(raw.phoneNumber) &&
    !raw.memberCount &&
    !raw.membersCount &&
    !raw.latestMessage &&
    !raw.lastMessage;
  if (looksLikeUserRow) return null;

  const id = String(raw.id || raw._id || "").trim();
  if (!id) return null;
  const latestMessageValue =
    typeof raw.latestMessage === "string"
      ? raw.latestMessage
      : (raw.latestMessage?.content || raw.lastMessage || "");
  const latestSenderName =
    raw.latestMessageSenderName ||
    raw.lastMessageSenderName ||
    raw.latestMessage?.senderName ||
    raw.latestMessage?.sender?.name ||
    raw.senderName ||
    "";
  return {
    id,
    name: String(raw.name || raw.groupName || "").trim(),
    description: raw.description || "",
    avatar: raw.avatar || raw.profilePhoto || "",
    owner: raw.owner || raw.createdBy || "",
    memberCount: Number(raw.memberCount || raw.membersCount || 0),
    unreadCount: Number(raw.unreadCount || 0),
    latestMessage: String(latestMessageValue || ""),
    latestMessageSenderName: String(latestSenderName || ""),
    latestMessageTimestamp: raw.latestMessageTimestamp || raw.lastMessageTimestamp || null,
    updatedAt: raw.updatedAt || raw.timestamp || new Date().toISOString(),
    isActive: raw.isActive !== false,
    isArchive: Boolean(raw.isArchive),
    isDelete: Boolean(raw.isDelete || raw.isDeleted),
  };
}

const truncateText = (value, limit = 44) => {
  const text = String(value || "");
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
};

const buildGroupPreview = (group) => {
  const latest = String(group?.latestMessage || "").trim();
  const sender = truncateText(group?.latestMessageSenderName || "", 18);
  if (latest) {
    const body = truncateText(latest, 44);
    return sender ? `${sender}: ${body}` : body;
  }
  const desc = String(group?.description || "").trim();
  if (desc) return truncateText(desc, 44);
  return "No messages yet";
};

function sortGroups(groups = []) {
  return [...groups].sort((a, b) => {
    const ta = new Date(a.latestMessageTimestamp || a.updatedAt || 0).getTime();
    const tb = new Date(b.latestMessageTimestamp || b.updatedAt || 0).getTime();
    return tb - ta;
  });
}

function readCachedGroups() {
  const cached = globalThis.storage.readJSON("groupsMain", []) || [];
  return sortGroups(cached.map(normalizeGroup).filter(Boolean));
}

function GroupListSkeleton({ count = 6 }) {
  return (
    <div className="group-list-stack" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={`group-skeleton-${index}`}
          className="group-list-card user-card d-flex justify-content-between align-items-center"
          style={{ gap: '12px' }}
        >
          <Skeleton circle width={48} height={48} />
          <div className="flex-grow-1">
            <Skeleton width="40%" height={15} borderRadius={8} />
            <Skeleton width="72%" height={12} borderRadius={8} style={{ marginTop: '8px' }} />
          </div>
          <div className="text-right">
            <Skeleton width={30} height={18} borderRadius={999} />
            <Skeleton width={42} height={10} borderRadius={8} style={{ marginTop: '8px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const Group = ({
  groupsMain = [],
  isLoading = false,
  setGroupsMain,
  db,
  mutedGroupIds = [],
  setMutedGroupIds,
  onDeleteGroupLocal,
  onGroupClick,
  selectedGroupId = null,
  appTheme = "dark",
}) => {
  const history = useHistory();
  const { host } = useContext(LoginContext);
  const {
    upsertGroupSummariesInSQLite,
    deleteGroupSummariesByIds,
  } = useContext(WebSocketContext);

  const [activeTab, setActiveTab] = useState("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayedGroups, setDisplayedGroups] = useState(() => readCachedGroups());
  const [requests, setRequests] = useState([]);
  const [hasNewRequests, setHasNewRequests] = useState(false);
  const [selectedGroupInfo, setSelectedGroupInfo] = useState(null);
  const [visibleGroupCount, setVisibleGroupCount] = useState(INITIAL_VISIBLE_GROUPS);
  const longPressTimerRef = useRef(null);
  const listContainerRef = useRef(null);
  const initialLastSeen = Number(globalThis.storage.readJSON(GROUP_REQUESTS_LAST_SEEN_KEY, 0) || 0);
  const lastSeenRequestsRef = useRef(initialLastSeen);
  const mutedGroupSet = useMemo(() => {
    const fromProps = Array.isArray(mutedGroupIds) ? mutedGroupIds.map(String) : [];
    const fromStorage = globalThis.storage.readJSON("mutedGroups", []) || [];
    return new Set((fromProps.length > 0 ? fromProps : fromStorage).map(String));
  }, [mutedGroupIds]);

  const persistGroups = useCallback(async (nextGroups, removedIds = []) => {
    const normalized = sortGroups((nextGroups || []).map(normalizeGroup).filter(Boolean));
    setDisplayedGroups(normalized);
    setGroupsMain(normalized);
    globalThis.storage.setItem("groupsMain", JSON.stringify(normalized));

    const dbToUse = db || (isPlatform('hybrid') ? window.sqlitePlugin.openDatabase({ name: 'Conversa_chats_store.db', location: 'default' }) : null);
    if (!dbToUse) return;

    await upsertGroupSummariesInSQLite(dbToUse, normalized);
    if (Array.isArray(removedIds) && removedIds.length > 0) {
      await deleteGroupSummariesByIds(dbToUse, removedIds);
    }
  }, [db, deleteGroupSummariesByIds, setGroupsMain, upsertGroupSummariesInSQLite]);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await api.groupInvites(host);
      if (!response?.ok) return;
      const json = await response.json();
      const invites = Array.isArray(json?.invites) ? json.invites : [];
      setRequests(invites);
      const latestInviteAt = invites.reduce((max, invite) => {
        const ts = new Date(invite?.createdAt || 0).getTime();
        return ts > max ? ts : max;
      }, 0);
      setHasNewRequests(latestInviteAt > Number(lastSeenRequestsRef.current || 0));
    } catch (error) {
      console.error("Error fetching group requests:", error);
    }
  }, [host]);

  const markRequestsSeen = useCallback(() => {
    const seenAt = Date.now();
    lastSeenRequestsRef.current = seenAt;
    globalThis.storage.setItem(GROUP_REQUESTS_LAST_SEEN_KEY, JSON.stringify(seenAt));
    setHasNewRequests(false);
  }, []);

  const syncGroups = useCallback(async () => {
    try {
      const baseGroups = sortGroups(
        ((displayedGroups && displayedGroups.length > 0 ? displayedGroups : (groupsMain && groupsMain.length > 0 ? groupsMain : (globalThis.storage.readJSON('groupsMain', []) || [])))
          .map(normalizeGroup)
          .filter(Boolean))
      );
      const payload = baseGroups
        .filter((g) => g?.isActive !== false && g?.isDelete !== true)
        .map((g) => ({
          groupId: String(g.id),
          updatedAt: g.updatedAt || null,
        }));

      const response = await api.syncUserGroups(host, payload);
      if (!response?.ok) return;
      const json = await response.json();
      const updates = Array.isArray(json?.groups) ? json.groups : [];
      const removedIds = Array.isArray(json?.removedGroupIds) ? json.removedGroupIds.map(String) : [];

      const byId = new Map(baseGroups.map((g) => [String(g.id), g]));
      updates.forEach((raw) => {
        const normalized = normalizeGroup(raw);
        if (!normalized) return;
        if (raw?.isActive === false) {
          const existing = byId.get(normalized.id);
          if (existing) {
            byId.set(normalized.id, {
              ...existing,
              isActive: false,
              updatedAt: normalized.updatedAt || existing.updatedAt,
            });
          }
          return;
        }
        const existing = byId.get(normalized.id) || {};
        byId.set(normalized.id, {
          ...existing,
          ...normalized,
          unreadCount: Math.max(Number(existing.unreadCount || 0), Number(normalized.unreadCount || 0)),
          isArchive: Boolean(existing.isArchive || normalized.isArchive),
          isDelete: Boolean(existing.isDelete || normalized.isDelete),
        });
      });

      removedIds.forEach((id) => byId.delete(String(id)));
      await persistGroups(Array.from(byId.values()), removedIds);
    } catch (error) {
      console.error("Error syncing groups:", error);
    }
  }, [displayedGroups, groupsMain, host, persistGroups]);

  useEffect(() => {
    const cached = globalThis.storage.readJSON('groupsMain', []) || [];
    if ((!groupsMain || groupsMain.length === 0) && cached.length > 0) {
      const normalizedCached = sortGroups(cached.map(normalizeGroup).filter(Boolean));
      setDisplayedGroups(normalizedCached);
      setGroupsMain(normalizedCached);
    }
    syncGroups();
    fetchRequests();
  }, []);

  useEffect(() => {
    const normalized = sortGroups((groupsMain || []).map(normalizeGroup).filter(Boolean));
    if (normalized.length > 0) {
      setDisplayedGroups(normalized);
      return;
    }
    const cached = readCachedGroups();
    if (cached.length > 0) {
      setDisplayedGroups(cached);
    }
  }, [groupsMain]);

  useEffect(() => {
    if (activeTab === "requests") {
      markRequestsSeen();
      fetchRequests();
    }
  }, [activeTab, fetchRequests, markRequestsSeen]);

  const buildFilteredGroupsFallback = useCallback(() => {
    const groups = sortGroups((displayedGroups || []).map(normalizeGroup).filter(Boolean));
    const q = searchQuery.trim().toLowerCase();
    const activeGroups = groups.filter(
      (group) => !group.isArchive && !group.isDelete && String(group?.name || "").trim().length > 0
    );
    if (!q) return activeGroups;
    return activeGroups.filter((group) =>
      [group.name, group.description, group.latestMessage, group.latestMessageSenderName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [displayedGroups, searchQuery]);

  const filteredGroups = useListWorker({
    type: "groupMain",
    payload: useMemo(() => ({
      groups: displayedGroups || [],
      searchQuery,
    }), [displayedGroups, searchQuery]),
    fallback: buildFilteredGroupsFallback,
  });

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return Array.isArray(requests) ? requests : [];
    return (Array.isArray(requests) ? requests : []).filter((invite) => {
      const groupName = String(invite?.groupId?.name || "");
      const invitedBy = String(invite?.invitedBy?.name || "");
      return (
        groupName.toLowerCase().includes(q) ||
        invitedBy.toLowerCase().includes(q)
      );
    });
  }, [requests, searchQuery]);

  const groupsToRender = filteredGroups;
  const visibleGroups = useMemo(
    () => groupsToRender.slice(0, visibleGroupCount),
    [groupsToRender, visibleGroupCount]
  );

  useEffect(() => {
    setVisibleGroupCount(INITIAL_VISIBLE_GROUPS);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [activeTab, searchQuery, displayedGroups, groupsMain]);

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (activeTab !== "groups") return;
      const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (remaining <= GROUP_LOAD_MORE_THRESHOLD_PX) {
        setVisibleGroupCount((prev) =>
          Math.min(prev + VISIBLE_GROUPS_STEP, groupsToRender.length)
        );
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [activeTab, groupsToRender.length]);

  const handleInviteResponse = useCallback(async (inviteId, action) => {
    try {
      const response = await api.respondGroupInvite(host, inviteId, action);
      if (!response?.ok) return;
      setRequests((prev) => prev.filter((invite) => String(invite._id) !== String(inviteId)));
      if (action === "accept") {
        await syncGroups();
      }
    } catch (error) {
      console.error("Error responding to invite:", error);
    }
  }, [host, syncGroups]);

  const handleLongPressStart = (group) => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setSelectedGroupInfo(group);
    }, 700);
  };

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const toggleGroupMute = useCallback((groupId) => {
    const id = String(groupId || "");
    if (!id) return;
    const base = Array.isArray(mutedGroupIds)
      ? mutedGroupIds.map(String)
      : (globalThis.storage.readJSON("mutedGroups", []) || []).map(String);
    const set = new Set(base);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const next = Array.from(set);
    globalThis.storage.setItem("mutedGroups", JSON.stringify(next));
    if (typeof setMutedGroupIds === "function") setMutedGroupIds(next);
  }, [mutedGroupIds, setMutedGroupIds]);

  const removeGroupLocally = useCallback(async (groupId) => {
    const id = String(groupId || "");
    if (!id) return;
    if (typeof onDeleteGroupLocal === "function") {
      await onDeleteGroupLocal(id);
    }
    const nextGroups = (Array.isArray(globalThis.storage.readJSON("groupsMain", []) || []).map(normalizeGroup).filter(Boolean));
    await persistGroups(nextGroups);
  }, [onDeleteGroupLocal, persistGroups]);

  const toggleGroupArchive = useCallback(async (groupId) => {
    const id = String(groupId || "");
    if (!id) return;
    const nextGroups = (Array.isArray(groupsMain) ? groupsMain : []).map((group) =>
      String(group?.id || "") === id ? { ...group, isArchive: !group?.isArchive } : group
    );
    await persistGroups(nextGroups);
  }, [groupsMain, persistGroups]);

  return (
    <div className={`user-main-container group-root group-root--${appTheme}`}>
      <div className="group-top-bar">
        <div className="group-top-bar-inner">
          <input
            type="text"
            className="group-search-input"
            placeholder={activeTab === "groups" ? "Search groups..." : "Search requests..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="group-tabs-switch" role="tablist" aria-label="Group tabs">
            <button
              type="button"
              className={`group-tab-btn ${activeTab === "groups" ? "is-active" : ""}`}
              onClick={() => setActiveTab("groups")}
            >
              Groups
            </button>
            <button
              type="button"
              className={`group-tab-btn ${activeTab === "requests" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("requests");
                markRequestsSeen();
              }}
            >
              Requests
              {hasNewRequests && <span className="group-request-dot" />}
            </button>
          </div>
        </div>
      </div>

      <div className="user-list-container" id="group-list-container" ref={listContainerRef}>
        {isLoading && activeTab === "groups" ? <GroupListSkeleton /> : null}
        {activeTab === "groups" && (
          <div className="group-list-stack">
            {!isLoading && visibleGroups.map((group) => (
              <div
                key={group.id}
                className={`group-list-card user-card d-flex justify-content-between align-items-center ${String(selectedGroupId || "") === String(group.id) ? "selected" : ""}`}
                onClick={() => {
                  if (typeof onGroupClick === "function") {
                    onGroupClick(group);
                    return;
                  }
                  history.push('/group-chatwindow', { groupdetails: group });
                }}
                onMouseDown={() => handleLongPressStart(group)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(group)}
                onTouchEnd={handleLongPressEnd}
              >
                <img
                  src={group.isActive === false ? img : (group.avatar || img)}
                  alt={group.name}
                  loading="lazy"
                  decoding="async"
                  className="rounded-circle"
                  style={{ marginRight: '10px', width: '48px', height: '48px', aspectRatio: '4/3' }}
                />
                <div className="flex-grow-1">
                  <h6 className="mb-0 user-name">
                    {group.name}{group.isActive === false ? " (Inactive)" : ""}
                    {mutedGroupSet.has(String(group.id)) ? " (Muted)" : ""}
                  </h6>
                  <small className="text-muted last-message">
                    {buildGroupPreview(group)}
                  </small>
                </div>
                <div className="text-right">
                  {group.unreadCount > 0 && (
                    <span className="badge" style={{ backgroundColor: 'rgb(43, 45, 49)' }}>
                      {group.unreadCount}
                    </span>
                  )}
                  <small className="text-muted timestamp d-block">
                    {group.latestMessageTimestamp ? new Date(group.latestMessageTimestamp).toLocaleTimeString() : ''}
                  </small>
                </div>
              </div>
            ))}
            {!isLoading && groupsToRender.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
                No groups found.
              </div>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="group-list-stack">
            {filteredRequests.map((invite) => (
                <div key={invite._id} className="group-list-card user-card">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <img
                        src={invite?.groupId?.avatar || img}
                        alt={invite?.groupId?.name || "Group"}
                        className="group-request-avatar"
                      />
                      <div>
                      <h6 className="mb-0">{invite?.groupId?.name || "Group Invite"}</h6>
                      <small className="text-muted">
                        Invited by {invite?.invitedBy?.name || "Unknown"}
                      </small>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => handleInviteResponse(invite._id, "accept")}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleInviteResponse(invite._id, "decline")}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            {filteredRequests.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
                {searchQuery.trim() ? "No matching requests." : "No pending requests."}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedGroupInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h5 className="mb-2">{selectedGroupInfo.name}</h5>
            <p className="text-muted mb-1">Members: {selectedGroupInfo.memberCount || 0}</p>
            <p className="text-muted mb-1">Owner: {selectedGroupInfo.owner || "N/A"}</p>
            <p className="text-muted mb-2">
              Updated: {selectedGroupInfo.updatedAt ? new Date(selectedGroupInfo.updatedAt).toLocaleString() : "N/A"}
            </p>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-dark flex-fill"
                onClick={async () => {
                  await toggleGroupArchive(selectedGroupInfo.id);
                  setSelectedGroupInfo(null);
                }}
              >
                {selectedGroupInfo.isArchive ? "Unarchive" : "Archive"}
              </button>
              <button
                type="button"
                className="btn btn-outline-dark flex-fill"
                onClick={() => toggleGroupMute(selectedGroupInfo.id)}
              >
                {mutedGroupSet.has(String(selectedGroupInfo.id)) ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                className="btn btn-outline-danger flex-fill"
                onClick={async () => {
                  await removeGroupLocally(selectedGroupInfo.id);
                  setSelectedGroupInfo(null);
                }}
              >
                Delete Chat
              </button>
            </div>
            <button type="button" className="btn btn-dark w-100 mt-2" onClick={() => setSelectedGroupInfo(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Group;

Group.propTypes = {
  groupsMain: PropTypes.array,
  isLoading: PropTypes.bool,
  setGroupsMain: PropTypes.func.isRequired,
  db: PropTypes.object,
  mutedGroupIds: PropTypes.array,
  setMutedGroupIds: PropTypes.func,
  onDeleteGroupLocal: PropTypes.func,
  onGroupClick: PropTypes.func,
  selectedGroupId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  appTheme: PropTypes.string,
};
