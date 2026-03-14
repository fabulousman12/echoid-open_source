import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router";
import { FaArrowDown, FaCopy, FaEllipsisV, FaInfoCircle, FaPaperclip, FaPaperPlane } from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";
import { MdClose, MdDeleteSweep, MdEmojiEmotions } from "react-icons/md";
import PropTypes from "prop-types";
import Cropper from "react-easy-crop";
import Swal from "sweetalert2";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { ffmpeg_thumnail } from "ionic-thumbnail";
import { isPlatform } from "@ionic/react";
import { Capacitor } from "@capacitor/core";
import { LoginContext } from "../Contexts/UserContext";
import { WebSocketContext } from "../services/websokcetmain";
import { api } from "../services/api";
import { authFetch } from "../services/apiClient";
import { getUploadUrl, isValidUploadResult } from "../services/uploadValidation";
import ImageRenderer from "../components/ImageRenderer";
import VideoRenderer from "../components/VideoRenderer";
import img from "/img.jpg";
import "./GroupChatWindow.css";

const PAGE_SIZE = 40;
const GROUP_MEMBER_CACHE_KEY = "groupMembersById";
const GROUP_MEMBERS_BY_GROUP_KEY = "groupMembersByGroup";
const GROUP_MEMBER_DETAILS_BY_GROUP_KEY = "groupMemberDetailsByGroup";
const GROUP_MESSAGES_CACHE_KEY = "groupMessagesByGroup";
const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const pickAvatar = (user = {}) =>
  user?.avatar ||
  user?.profilePhoto ||
  user?.profilePic ||
  user?.profile_picture ||
  user?.profileImage ||
  "";

const hasAvatar = (value) => typeof value === "string" && value.trim().length > 0;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const IMAGE_EXT_WHITELIST = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

const isImageFile = (file) => {
  if (!file) return false;
  if (file.type && ALLOWED_IMAGE_TYPES.includes(file.type)) return true;
  if (file.name) {
    const name = file.name.toLowerCase();
    return IMAGE_EXT_WHITELIST.some((ext) => name.endsWith(ext));
  }
  return false;
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });

const getCroppedImg = async (imageSrc, croppedAreaPixels) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }, "image/jpeg");
  });
};

const toIso = (value) => {
  try {
    return value ? new Date(value).toISOString() : new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
};

const looksLikeLocalMediaPath = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (/^(file:|content:|capacitor:|\/)/i.test(raw)) return true;
  if (/^(https?:|wss?:)/i.test(raw)) return false;
  if (/^(blob:|data:)/i.test(raw)) return true;
  if (/^(group_media\/|files\/|thumbnails\/|documents\/)/i.test(raw)) return true;
  if (/\/documents\//i.test(raw)) return true;
  return false;
};

const toDownloadBoolean = (value) => {
  if (value === true || value === 1) return true;
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true";
};

const normalizeGroupMessage = (message, fallbackGroupId) => {
  if (!message) return null;
  const id = String(message.id || message._id || "").trim();
  const groupId = String(message.groupId || message.group || message.group_id || fallbackGroupId || "").trim();
  if (!id || !groupId) return null;
  const clientMessageId = String(message.clientMessageId || "").trim();
  const mediaUrl = message.mediaUrl || "";
  const looksLocalMediaPath = looksLikeLocalMediaPath(mediaUrl);
  return {
    id,
    clientMessageId,
    groupId,
    sender: String(message.sender || ""),
    messageType: String(message.messageType || message.type || "text"),
    content: typeof message.content === "string" ? message.content : "",
    mediaUrl,
    previewUrl: message.previewUrl || "",
    isDownload: toDownloadBoolean(message.isDownload ?? message.is_download) || looksLocalMediaPath,
    isReplyTo: message.isReplyTo || message.is_reply_to || null,
    timestamp: toIso(message.timestamp),
    status: message.status || "sent",
    readBy: Array.isArray(message.readBy) ? message.readBy.map(String) : [],
  };
};

const mergeMessageArrays = (base = [], incoming = []) => {
  const byId = new Map();
  [...base, ...incoming].forEach((msg) => {
    if (msg?.id) byId.set(String(msg.id), msg);
  });
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
  );
};


const GroupChatWindow = ({
  socket,
  db,
  usersMain = [],
  setGroupsMain,
  groupMessagesByGroup = {},
  setGroupMessagesByGroup,
  mutedGroupIds = [],
  setMutedGroupIds,
  onActiveGroupChange,
}) => {
  const history = useHistory();
  const location = useLocation();
  const { host } = useContext(LoginContext);
  const { saveGroupMessageInSQLite, editGroupMessageInSQLite, deleteGroupMessageInSQLite } = useContext(WebSocketContext);

  const group = location?.state?.groupdetails || null;
  const groupId = String(group?.id || group?._id || "");
  const currentUser = globalThis.storage.readJSON("currentuser", null);
  const currentUserId = String(currentUser?._id || currentUser?.id || "");
  const [memberProfiles, setMemberProfiles] = useState(() => {
    try {
      return globalThis.storage.readJSON(GROUP_MEMBER_CACHE_KEY, {}) || {};
    } catch {
      return {};
    }
  });
  const [memberIdsByGroup, setMemberIdsByGroup] = useState(() => {
    try {
      return globalThis.storage.readJSON(GROUP_MEMBERS_BY_GROUP_KEY, {}) || {};
    } catch {
      return {};
    }
  });
  const [profileGroup, setProfileGroup] = useState(group || null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberActionLoadingById, setMemberActionLoadingById] = useState({});
  const [activePeopleTab, setActivePeopleTab] = useState("members");
  const [groupInvites, setGroupInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [memberDetailsByGroup, setMemberDetailsByGroup] = useState(() => {
    try {
      return globalThis.storage.readJSON(GROUP_MEMBER_DETAILS_BY_GROUP_KEY, {}) || {};
    } catch {
      return {};
    }
  });

  const senderMap = useMemo(() => {
    const map = new Map();
    if (currentUserId) {
      map.set(String(currentUserId), {
        name: currentUser?.name || "You",
        avatar: pickAvatar(currentUser),
      });
    }
    (Array.isArray(usersMain) ? usersMain : []).forEach((u) => {
      const id = String(u?.id || u?._id || "");
      if (!id) return;
      map.set(id, {
        name: u?.name || "Unknown",
        avatar: pickAvatar(u),
      });
    });
    Object.entries(memberProfiles || {}).forEach(([id, profile]) => {
      if (!id) return;
      map.set(String(id), {
        name: profile?.name || "Unknown",
        avatar: pickAvatar(profile),
      });
    });
    const groupDetailsRows = Array.isArray(memberDetailsByGroup?.[groupId]) ? memberDetailsByGroup[groupId] : [];
    groupDetailsRows.forEach((row) => {
      const id = String(row?.id || "");
      if (!id) return;
      map.set(id, {
        name: row?.name || "Unknown",
        avatar: pickAvatar(row),
      });
    });
    return map;
  }, [currentUser, currentUserId, groupId, memberDetailsByGroup, memberProfiles, usersMain]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [newMessage, setNewMessage] = useState("");
  const [showFileOptions, setShowFileOptions] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [downloadingById, setDownloadingById] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isAtTop, setIsAtTop] = useState(false);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [glowMessageId, setGlowMessageId] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [messageInfoState, setMessageInfoState] = useState({ loading: false, messageId: "", readBy: [] });
  const [settingsDraft, setSettingsDraft] = useState({
    messagingPermission: "ALL_MEMBERS",
    addMembersPermission: "ADMINS_ONLY",
    groupInfoEditPermission: "ADMINS_ONLY",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState({ name: "", description: "", avatar: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);
  const [transferLoadingById, setTransferLoadingById] = useState({});
  const [groupActionError, setGroupActionError] = useState("");
  const [isGroupMuted, setIsGroupMuted] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const listRef = useRef(null);
  const replyGlowTimeoutRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const swipeReplyRef = useRef({
    activeId: null,
    startX: 0,
    startY: 0,
    triggered: false,
  });
  const avatarFileRef = useRef(null);
  const imageVideoInputRef = useRef(null);
  const previewObjectUrlsRef = useRef([]);
  const initializedRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const preserveScrollRef = useRef({ pending: false, prevHeight: 0, prevTop: 0 });
  const wasNearBottomRef = useRef(true);
  const prevAutoScrollMetaRef = useRef({ len: 0, lastId: "" });
  const resendInFlightRef = useRef(new Set());
  const readInFlightRef = useRef(new Set());
  const fetchedMemberIdsRef = useRef(new Set());

  useEffect(() => () => {
    if (replyGlowTimeoutRef.current) clearTimeout(replyGlowTimeoutRef.current);
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
  }, []);

  useEffect(() => {
    return () => {
      previewObjectUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      previewObjectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    initializedRef.current = false;
    initialScrollDoneRef.current = false;
    setReplyTarget(null);
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setShowSelectionMenu(false);
    setShowMessageInfo(false);
    setShowFileOptions(false);
    setShowMediaPreview(false);
    setMediaFiles([]);
    setActiveMediaIndex(0);
    setVisibleCount(PAGE_SIZE);
    setShowScrollDown(false);
    setIsAtTop(false);
  }, [groupId]);

  const allMessages = useMemo(() => {
    const list = Array.isArray(groupMessagesByGroup?.[groupId]) ? groupMessagesByGroup[groupId] : [];
    return [...list].sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
  }, [groupId, groupMessagesByGroup]);
  const recentRealtimeMessages = useMemo(() => allMessages.slice(-140), [allMessages]);

  const effectiveMessages = useMemo(() => allMessages, [allMessages]);

  const visibleMessages = useMemo(() => {
    const start = Math.max(0, effectiveMessages.length - visibleCount);
    return effectiveMessages.slice(start);
  }, [effectiveMessages, visibleCount]);

  const replyLookup = useMemo(() => {
    const map = new Map();
    effectiveMessages.forEach((m) => {
      const id = String(m?.id || "").trim();
      if (id) map.set(id, m);
    });
    return map;
  }, [effectiveMessages]);

  const selectedMessages = useMemo(
    () => effectiveMessages.filter((msg) => selectedMessageIds.includes(String(msg?.id || ""))),
    [effectiveMessages, selectedMessageIds]
  );

  const singleSelectedMessage = selectedMessages.length === 1 ? selectedMessages[0] : null;
  const singleSelectedMine = singleSelectedMessage && String(singleSelectedMessage.sender || "") === String(currentUserId);

  const showLoadOlderButton = useMemo(
    () => loadingOlder || (isAtTop && hasMoreOlderMessages),
    [hasMoreOlderMessages, isAtTop, loadingOlder]
  );

  const memberIds = useMemo(() => {
    const raw = memberIdsByGroup?.[groupId];
    return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  }, [groupId, memberIdsByGroup]);
  const membersToRender = useMemo(() => {
    const ids = [...memberIds];
    if (currentUserId) {
      const normalizedCurrent = String(currentUserId);
      const filtered = ids.filter((id) => String(id) !== normalizedCurrent);
      ids.length = 0;
      ids.push(normalizedCurrent, ...filtered);
    }
    return ids;
  }, [currentUserId, memberIds]);
  const adminIdSet = useMemo(() => {
    const set = new Set();
    (Array.isArray(profileGroup?.admins) ? profileGroup.admins : []).forEach((a) => {
      const id = String(a?._id || a || "");
      if (id) set.add(id);
    });
    (Array.isArray(profileGroup?.members) ? profileGroup.members : []).forEach((m) => {
      const id = String(m?.userId?._id || m?.userId || "");
      if (id && String(m?.role || "").toUpperCase() === "ADMIN") set.add(id);
    });
    return set;
  }, [profileGroup]);
  const canManageSettings = adminIdSet.has(String(currentUserId));
  const ownerId = String(profileGroup?.owner?._id || profileGroup?.owner || profileGroup?.createdBy?._id || profileGroup?.createdBy || "");
  const isCurrentUserOwner = ownerId && String(ownerId) === String(currentUserId);
  const canPromoteAdmin = canManageSettings || isCurrentUserOwner;
  const isGroupActive = useMemo(
    () => profileGroup?.isActive !== false && group?.isActive !== false,
    [group?.isActive, profileGroup?.isActive]
  );
  const isCurrentMember = useMemo(() => {
    const activeMember = (Array.isArray(profileGroup?.members) ? profileGroup.members : []).some((m) => {
      const id = String(m?.userId?._id || m?.userId || "");
      const status = String(m?.status || "").toUpperCase();
      return id === String(currentUserId) && status === "ACTIVE";
    });
    if (Array.isArray(profileGroup?.members) && profileGroup.members.length > 0) {
      return activeMember;
    }
    return activeMember || membersToRender.includes(String(currentUserId));
  }, [currentUserId, membersToRender, profileGroup?.members]);
  const canComposeInGroup = Boolean(isCurrentMember && isGroupActive);
  const canEditGroupInfo = useMemo(() => {
    const permission = profileGroup?.settings?.groupInfoEditPermission || "ADMINS_ONLY";
    if (permission === "ALL_MEMBERS") return isCurrentMember;
    return canManageSettings;
  }, [canManageSettings, isCurrentMember, profileGroup?.settings?.groupInfoEditPermission]);
  const canAddMembers = useMemo(() => {
    const permission = profileGroup?.settings?.addMembersPermission || "ADMINS_ONLY";
    if (permission === "ALL_MEMBERS") return isCurrentMember;
    return canManageSettings || ownerId === String(currentUserId);
  }, [canManageSettings, currentUserId, isCurrentMember, ownerId, profileGroup?.settings?.addMembersPermission]);

  const memberRoleMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(profileGroup?.members) ? profileGroup.members : []).forEach((m) => {
      const id = String(m?.userId?._id || m?.userId || "");
      if (!id) return;
      map.set(id, String(m?.role || "MEMBER").toUpperCase());
    });
    return map;
  }, [profileGroup?.members]);

  const transferableOwnerIds = useMemo(
    () => membersToRender.filter((id) => String(id) !== String(currentUserId)),
    [currentUserId, membersToRender]
  );

  const parseApiErrorMessage = async (response, fallbackMessage) => {
    if (!response) return fallbackMessage;
    try {
      const json = await response.json();
      return json?.message || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  };

  const persistMemberDetailsByGroup = useCallback((updater) => {
    setMemberDetailsByGroup((prev) => {
      const next = typeof updater === "function" ? updater(prev || {}) : { ...(prev || {}), ...(updater || {}) };
      globalThis.storage.setItem(GROUP_MEMBER_DETAILS_BY_GROUP_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateMemberIdsByGroup = useCallback((updater) => {
    setMemberIdsByGroup((prev) => {
      const next = typeof updater === "function" ? updater(prev || {}) : { ...(prev || {}), ...(updater || {}) };
      globalThis.storage.setItem(GROUP_MEMBERS_BY_GROUP_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior });
  }, []);

  const checkHasOlderInDb = useCallback(async () => {
    if (!db || !groupId) {
      setHasMoreOlderMessages(effectiveMessages.length > visibleCount);
      return;
    }
    const oldestTs = allMessages?.[0]?.timestamp;
    const oldestId = String(allMessages?.[0]?.id || "");
    if (!oldestTs || !oldestId) {
      setHasMoreOlderMessages(false);
      return;
    }
    try {
      const hasOlder = await new Promise((resolve) => {
        db.transaction((tx) => {
          tx.executeSql(
            `SELECT id FROM group_messages
             WHERE group_id = ?
               AND (timestamp < ? OR (timestamp = ? AND id < ?))
             ORDER BY timestamp DESC, id DESC
             LIMIT 1`,
            [groupId, oldestTs, oldestTs, oldestId],
            (_, result) => resolve(result.rows.length > 0),
            () => resolve(false)
          );
        });
      });
      setHasMoreOlderMessages(Boolean(hasOlder));
    } catch {
      setHasMoreOlderMessages(false);
    }
  }, [allMessages, db, effectiveMessages.length, groupId, visibleCount]);

  const persistGroupMessageFallback = useCallback((message) => {
    try {
      const all = globalThis.storage.readJSON(GROUP_MESSAGES_CACHE_KEY, {}) || {};
      const gid = String(message?.groupId || "");
      if (!gid) return;
      const rows = Array.isArray(all[gid]) ? all[gid] : [];
      const merged = mergeMessageArrays(rows, [message]);
      const trimmed = merged.slice(-200);
      globalThis.storage.setItem(
        GROUP_MESSAGES_CACHE_KEY,
        JSON.stringify({ ...all, [gid]: trimmed })
      );
    } catch (error) {
      console.warn("Failed to persist group message in fallback cache:", error);
    }
  }, []);

  const patchGroupMessageLocally = useCallback(
    async (messageId, updates = {}) => {
      const msgId = String(messageId || "").trim();
      if (!msgId || !groupId) return;

      setGroupMessagesByGroup((prev) => {
        const rows = Array.isArray(prev?.[groupId]) ? prev[groupId] : [];
        const nextRows = rows.map((m) => (String(m?.id || "") === msgId ? { ...m, ...updates } : m));
        return { ...prev, [groupId]: nextRows };
      });

      if (db) {
        try {
          await editGroupMessageInSQLite(db, msgId, updates);
        } catch (error) {
          console.warn("Failed to patch group message in SQLite:", error);
        }
        return;
      }

      try {
        const all = globalThis.storage.readJSON(GROUP_MESSAGES_CACHE_KEY, {}) || {};
        const rows = Array.isArray(all[groupId]) ? all[groupId] : [];
        const nextRows = rows.map((m) => (String(m?.id || "") === msgId ? { ...m, ...updates } : m));
        globalThis.storage.setItem(GROUP_MESSAGES_CACHE_KEY, JSON.stringify({ ...all, [groupId]: nextRows }));
      } catch (error) {
        console.warn("Failed to patch group message in fallback cache:", error);
      }
    },
    [db, editGroupMessageInSQLite, groupId, setGroupMessagesByGroup]
  );

  const upsertIncomingGroupMessage = useCallback(
    async (rawMessage, fallbackGroupId = null) => {
      const normalized = normalizeGroupMessage(rawMessage, fallbackGroupId || groupId);
      if (!normalized) return null;
      const gid = String(normalized.groupId);
      const existingRows = Array.isArray(groupMessagesByGroup?.[gid]) ? groupMessagesByGroup[gid] : [];
      const existingById = existingRows.find((m) => String(m?.id || "") === String(normalized.id || ""));
      const existingByClientId = normalized.clientMessageId
        ? existingRows.find((m) => String(m?.id || "") === String(normalized.clientMessageId))
        : null;
      const localExisting = existingById || existingByClientId || null;
      if (localExisting?.isDownload && localExisting?.mediaUrl) {
        normalized.mediaUrl = localExisting.mediaUrl;
        normalized.isDownload = true;
      }
      const incomingRead = Array.isArray(normalized.readBy) ? normalized.readBy.map(String) : [];
      const localRead = Array.isArray(localExisting?.readBy) ? localExisting.readBy.map(String) : [];
      normalized.readBy = Array.from(new Set([...localRead, ...incomingRead]));

      setGroupMessagesByGroup((prev) => {
        const existing = Array.isArray(prev?.[gid]) ? prev[gid] : [];
        // Replace temporary optimistic row when server confirms with clientMessageId.
        const withoutPending = normalized.clientMessageId
          ? existing.filter((m) => String(m?.id || "") !== normalized.clientMessageId)
          : existing;
        return {
          ...prev,
          [gid]: mergeMessageArrays(withoutPending, [normalized]),
        };
      });

      if (db) {
        await saveGroupMessageInSQLite(db, normalized);
      } else {
        persistGroupMessageFallback(normalized);
      }
      return normalized;
    },
    [db, groupId, groupMessagesByGroup, persistGroupMessageFallback, saveGroupMessageInSQLite, setGroupMessagesByGroup]
  );

  const syncLatestForGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const latestId = allMessages.length ? String(allMessages[allMessages.length - 1].id) : null;
      const response = await api.groupMessagesSync(
        host,
        [{ groupId, lastMessageId: latestId || undefined }],
        30
      );
      if (!response?.ok) return;
      const json = await response.json();
      const rows =
        Array.isArray(json?.groups) && json.groups.length > 0
          ? (Array.isArray(json.groups[0]?.messages) ? json.groups[0].messages : [])
          : [];
      if (!rows.length) return;
      for (const row of rows) {
        await upsertIncomingGroupMessage(row, groupId);
      }
    } catch (err) {
      console.error("Failed to sync latest group messages:", err);
    }
  }, [allMessages, groupId, host, upsertIncomingGroupMessage]);

  useEffect(() => {
    if (!groupId) return;
    if (typeof onActiveGroupChange === "function") onActiveGroupChange(groupId);
    globalThis.__ACTIVE_GROUP_ID = groupId;
    if (typeof setGroupsMain === "function") {
      setGroupsMain((prev) => {
        let changed = false;
        const next = (Array.isArray(prev) ? prev : []).map((g) => {
          if (String(g?.id) !== groupId) return g;
          if (Number(g?.unreadCount || 0) === 0) return g;
          changed = true;
          return { ...g, unreadCount: 0 };
        });
        if (!changed) return prev;
        globalThis.storage.setItem("groupsMain", JSON.stringify(next));
        return next;
      });
    }
    return () => {
      if (typeof onActiveGroupChange === "function") onActiveGroupChange(null);
      if (globalThis.__ACTIVE_GROUP_ID === groupId) globalThis.__ACTIVE_GROUP_ID = null;
    };
  }, [groupId, setGroupsMain]);

  useEffect(() => {
    if (!groupId || initializedRef.current) return;
    initializedRef.current = true;
    syncLatestForGroup();
  }, [groupId, syncLatestForGroup]);

  useEffect(() => {
    if (!groupId) {
      setHasMoreOlderMessages(false);
      return;
    }
    if (!db) {
      setHasMoreOlderMessages(effectiveMessages.length > visibleCount);
      return;
    }
    checkHasOlderInDb();
  }, [checkHasOlderInDb, db, effectiveMessages.length, groupId, visibleCount]);

  useEffect(() => {
    if (!groupId || !socket || socket.readyState !== WebSocket.OPEN || !currentUserId) return;

    const retryTargets = recentRealtimeMessages.filter((msg) => {
      const mine = String(msg?.sender || "") === String(currentUserId);
      if (!mine) return false;
      const status = String(msg?.status || "").toLowerCase();
      if (status === "sent") return false;
      if (status === "failed") return true;
      if (status !== "pending") return true;
      const ageMs = Date.now() - new Date(msg?.timestamp || 0).getTime();
      return ageMs > 15000;
    });

    retryTargets.forEach((msg) => {
      const msgId = String(msg?.id || "");
      if (!msgId || resendInFlightRef.current.has(msgId)) return;
      resendInFlightRef.current.add(msgId);

      (async () => {
        const messageType = String(msg?.messageType || "text");
        await patchGroupMessageLocally(msgId, { status: "pending" });
        try {
          socket.send(
            JSON.stringify({
              type: "group-message",
              groupId,
              messageType,
              content: messageType === "text" ? String(msg?.content || "") : "",
              mediaUrl: messageType.startsWith("media/") ? String(msg?.mediaUrl || "") : "",
              previewUrl: messageType.startsWith("media/") ? String(msg?.previewUrl || "") : "",
              clientMessageId: msgId,
              timestamp: msg?.timestamp || new Date().toISOString(),
            })
          );
          await patchGroupMessageLocally(msgId, { status: "sent" });
        } catch (error) {
          console.warn("Failed to resend group message:", error);
          await patchGroupMessageLocally(msgId, { status: "failed" });
        } finally {
          resendInFlightRef.current.delete(msgId);
        }
      })();
    });
  }, [currentUserId, groupId, patchGroupMessageLocally, recentRealtimeMessages, socket]);

  useEffect(() => {
    if (!groupId || !currentUserId) return;
    const unreadIncoming = recentRealtimeMessages.filter((msg) => {
      const sender = String(msg?.sender || "");
      if (!sender || sender === String(currentUserId)) return false;
      const id = String(msg?.id || "");
      if (!id || !MONGO_OBJECT_ID_REGEX.test(id) || readInFlightRef.current.has(id)) return false;
      const readBy = Array.isArray(msg?.readBy) ? msg.readBy.map(String) : [];
      return !readBy.includes(String(currentUserId));
    });
    if (unreadIncoming.length === 0) return;

    const messageIds = unreadIncoming.map((msg) => String(msg.id));
    messageIds.forEach((id) => readInFlightRef.current.add(id));

    const nextReadByMap = new Map(
      unreadIncoming.map((msg) => {
        const set = new Set(Array.isArray(msg?.readBy) ? msg.readBy.map(String) : []);
        set.add(String(currentUserId));
        return [String(msg.id), Array.from(set)];
      })
    );

    setGroupMessagesByGroup((prev) => {
      const rows = Array.isArray(prev?.[groupId]) ? prev[groupId] : [];
      const nextRows = rows.map((row) => {
        const id = String(row?.id || "");
        if (!nextReadByMap.has(id)) return row;
        return { ...row, readBy: nextReadByMap.get(id) };
      });
      return { ...prev, [groupId]: nextRows };
    });

    if (db) {
      Promise.all(
        messageIds.map((id) =>
          editGroupMessageInSQLite(db, id, { readBy: nextReadByMap.get(id) || [String(currentUserId)] })
        )
      ).catch((error) => {
        console.warn("Failed to persist read state in SQLite:", error);
      });
    } else {
      try {
        const all = globalThis.storage.readJSON(GROUP_MESSAGES_CACHE_KEY, {}) || {};
        const rows = Array.isArray(all[groupId]) ? all[groupId] : [];
        const nextRows = rows.map((row) => {
          const id = String(row?.id || "");
          if (!nextReadByMap.has(id)) return row;
          return {
            ...row,
            readBy: nextReadByMap.get(id),
          };
        });
        globalThis.storage.setItem(GROUP_MESSAGES_CACHE_KEY, JSON.stringify({ ...all, [groupId]: nextRows }));
      } catch (error) {
        console.warn("Failed to persist read state in fallback cache:", error);
      }
    }

    api.markGroupMessagesRead(host, messageIds).catch((error) => {
      console.warn("Failed to sync group read state:", error);
    }).finally(() => {
      messageIds.forEach((id) => readInFlightRef.current.delete(id));
    });
  }, [currentUserId, db, editGroupMessageInSQLite, groupId, host, recentRealtimeMessages, setGroupMessagesByGroup]);

  // Group WS ingest is centralized in App.jsx to avoid double writes.

  const updateMemberCache = useCallback((updater) => {
    setMemberProfiles((prev) => {
      const next = typeof updater === "function" ? updater(prev || {}) : { ...(prev || {}), ...(updater || {}) };
      globalThis.storage.setItem(GROUP_MEMBER_CACHE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchAndCacheMember = useCallback(async (userId) => {
    if (!userId || String(userId) === currentUserId) return;
    const sid = String(userId);
    if (fetchedMemberIdsRef.current.has(sid)) return;
    const cached = globalThis.storage.readJSON(GROUP_MEMBER_CACHE_KEY, {}) || {};
    if (cached?.[sid]?.name && hasAvatar(pickAvatar(cached?.[sid]))) {
      fetchedMemberIdsRef.current.add(sid);
      return;
    }
    fetchedMemberIdsRef.current.add(sid);
    try {
      const response = await api.fetchUser(host, sid);
      if (!response?.ok) return;
      const json = await response.json();
      const payload = json?.userResponse || json?.user || null;
      if (!payload) return;
      updateMemberCache((prev) => ({
        ...prev,
        [sid]: {
          name: payload?.name || prev?.[sid]?.name || "Unknown",
          avatar: pickAvatar(payload) || prev?.[sid]?.avatar || "",
        },
      }));
    } catch (error) {
      fetchedMemberIdsRef.current.delete(sid);
      console.warn("Failed to fetch member profile:", userId, error);
    }
  }, [currentUserId, host, updateMemberCache]);

  const hydrateGroupMembers = useCallback(async () => {
    if (!groupId) return;
    setMembersLoading(true);
    try {
      const response = await api.groupDetails(host, groupId);
      if (!response?.ok) return;
      const json = await response.json();
      const details = json?.group || null;
      if (details) {
        setProfileGroup((prev) => ({ ...(prev || {}), ...details }));
      }

      const activeMembers = (Array.isArray(details?.members) ? details.members : [])
        .filter((m) => {
          const status = String(m?.status || "ACTIVE").toUpperCase();
          return status === "ACTIVE" || status === "";
        })
        .map((m) => String(m?.userId?._id || m?.userId || ""))
        .filter(Boolean);

      if (activeMembers.length > 0) {
        updateMemberIdsByGroup((prev) => ({ ...prev, [groupId]: activeMembers }));
      }

      const fromDetails = {};
      (Array.isArray(details?.members) ? details.members : []).forEach((m) => {
        const id = String(m?.userId?._id || m?.userId || "");
        if (!id) return;
        const userObj = m?.userId || {};
        fromDetails[id] = {
          name: userObj?.name || "Unknown",
          avatar: pickAvatar(userObj),
        };
      });
      if (Object.keys(fromDetails).length > 0) {
        updateMemberCache((prev) => {
          const merged = { ...(prev || {}) };
          Object.entries(fromDetails).forEach(([id, value]) => {
            merged[id] = {
              name: value?.name || prev?.[id]?.name || "Unknown",
              avatar: value?.avatar || prev?.[id]?.avatar || "",
            };
          });
          return merged;
        });
        Object.keys(fromDetails).forEach((id) => fetchedMemberIdsRef.current.add(String(id)));
      }

      // Save per-group member detailed cache for fast access in group context.
      const activeDetailed = (Array.isArray(details?.members) ? details.members : [])
        .filter((m) => String(m?.status || "ACTIVE").toUpperCase() === "ACTIVE")
        .map((m) => {
          const userObj = m?.userId || {};
          const id = String(userObj?._id || m?.userId || "");
          if (!id) return null;
          return {
            id,
            name: userObj?.name || "Unknown",
            avatar: pickAvatar(userObj),
            email: userObj?.email || "",
            updatedAt: userObj?.updatedAt || details?.updatedAt || new Date().toISOString(),
          };
        })
        .filter(Boolean);

      // Backfill missing user details (email/updatedAt/avatar) by user fetch endpoint.
      const enriched = await Promise.all(
        activeDetailed.map(async (row) => {
          if (row.email && row.updatedAt && row.avatar) return row;
          try {
            const userRes = await api.fetchUser(host, row.id);
            if (!userRes?.ok) return row;
            const userJson = await userRes.json().catch(() => ({}));
            const user = userJson?.userResponse || userJson?.user || {};
            return {
              ...row,
              name: user?.name || row.name,
              avatar: pickAvatar(user) || row.avatar,
              email: user?.email || row.email || "",
              updatedAt: user?.updatedAt || row.updatedAt,
            };
          } catch {
            return row;
          }
        })
      );

      persistMemberDetailsByGroup((prev) => ({ ...prev, [groupId]: enriched }));
    } catch (error) {
      console.warn("Failed to fetch group details:", error);
    } finally {
      setMembersLoading(false);
    }
  }, [groupId, host, persistMemberDetailsByGroup, updateMemberCache, updateMemberIdsByGroup]);

  const hydrateGroupInvites = useCallback(async () => {
    if (!groupId) return;
    setInvitesLoading(true);
    try {
      const response = await api.groupInvitesByGroup(host, groupId);
      if (!response?.ok) {
        setGroupInvites([]);
        return;
      }
      const json = await response.json().catch(() => ({}));
      const invites = Array.isArray(json?.invites) ? json.invites : [];
      setGroupInvites(invites);
    } catch (error) {
      console.warn("Failed to fetch group invites:", error);
      setGroupInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }, [groupId, host]);

  useEffect(() => {
    const senderIds = [...new Set(effectiveMessages.map((m) => String(m?.sender || "")).filter(Boolean))]
      .filter((id) => id !== currentUserId);
    senderIds.forEach((id) => {
      fetchAndCacheMember(id);
    });
  }, [currentUserId, effectiveMessages, fetchAndCacheMember]);

  useEffect(() => {
    if (!groupId) return;
    // Always refresh members on chat entry (not only in expanded mode).
    hydrateGroupMembers();
  }, [groupId, hydrateGroupMembers]);

  useEffect(() => {
    if (!groupId || !location?.state?.refreshMembers) return;
    hydrateGroupMembers();
  }, [groupId, hydrateGroupMembers, location?.state?.refreshMembers]);

  useEffect(() => {
    if (!groupId || !location?.state?.refreshInvites) return;
    hydrateGroupInvites();
  }, [groupId, hydrateGroupInvites, location?.state?.refreshInvites]);

  useEffect(() => {
    if (!isExpanded || !groupId || activePeopleTab !== "invites") return;
    hydrateGroupInvites();
  }, [activePeopleTab, groupId, hydrateGroupInvites, isExpanded]);

  useEffect(() => {
    if (!isExpanded || !groupId) return;
    memberIds.forEach((id) => {
      fetchAndCacheMember(id);
    });
  }, [fetchAndCacheMember, groupId, isExpanded, memberIds]);

  useEffect(() => {
    const muted = Array.isArray(mutedGroupIds) && mutedGroupIds.length > 0
      ? mutedGroupIds.map(String)
      : (globalThis.storage.readJSON("mutedGroups", []) || []).map(String);
    const nextMuted = muted.includes(String(groupId));
    setIsGroupMuted((prev) => (prev === nextMuted ? prev : nextMuted));
  }, [groupId, mutedGroupIds]);

  useEffect(() => {
    const source = profileGroup?.settings || group?.settings || {};
    const nextDraft = {
      messagingPermission: source.messagingPermission || "ALL_MEMBERS",
      addMembersPermission: source.addMembersPermission || "ADMINS_ONLY",
      groupInfoEditPermission: source.groupInfoEditPermission || "ADMINS_ONLY",
    };
    setSettingsDraft((prev) => {
      if (
        prev?.messagingPermission === nextDraft.messagingPermission &&
        prev?.addMembersPermission === nextDraft.addMembersPermission &&
        prev?.groupInfoEditPermission === nextDraft.groupInfoEditPermission
      ) {
        return prev;
      }
      return nextDraft;
    });
  }, [
    group?.settings?.addMembersPermission,
    group?.settings?.groupInfoEditPermission,
    group?.settings?.messagingPermission,
    profileGroup?.settings?.addMembersPermission,
    profileGroup?.settings?.groupInfoEditPermission,
    profileGroup?.settings?.messagingPermission,
  ]);

  useEffect(() => {
    const nextDraft = {
      name: profileGroup?.name || group?.name || "",
      description: profileGroup?.description || group?.description || "",
      avatar: profileGroup?.avatar || group?.avatar || "",
    };
    setEditDraft((prev) => {
      if (
        prev?.name === nextDraft.name &&
        prev?.description === nextDraft.description &&
        prev?.avatar === nextDraft.avatar
      ) {
        return prev;
      }
      return nextDraft;
    });
  }, [group?.avatar, group?.description, group?.name, profileGroup?.avatar, profileGroup?.description, profileGroup?.name]);

  const saveGroupSettings = async () => {
    if (!groupId || !canManageSettings) return;
    setSettingsSaving(true);
    try {
      const response = await api.updateGroupSettings(host, {
        groupId,
        messagingPermission: settingsDraft.messagingPermission,
        addMembersPermission: settingsDraft.addMembersPermission,
        groupInfoEditPermission: settingsDraft.groupInfoEditPermission,
      });
      if (!response?.ok) return;
      const json = await response.json();
      const updated = json?.group || null;
      if (updated) {
        setProfileGroup((prev) => ({ ...(prev || {}), ...updated }));
        if (typeof setGroupsMain === "function") {
          setGroupsMain((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            const next = arr.map((g) =>
              String(g?.id) === String(groupId)
                ? {
                    ...g,
                    settings: {
                      messagingPermission: updated?.settings?.messagingPermission || settingsDraft.messagingPermission,
                      addMembersPermission: updated?.settings?.addMembersPermission || settingsDraft.addMembersPermission,
                      groupInfoEditPermission: updated?.settings?.groupInfoEditPermission || settingsDraft.groupInfoEditPermission,
                    },
                    updatedAt: updated?.updatedAt || g.updatedAt,
                  }
                : g
            );
            globalThis.storage.setItem("groupsMain", JSON.stringify(next));
            return next;
          });
        }
      }
    } catch (error) {
      console.warn("Failed to update group settings:", error);
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveGroupProfileEdits = async () => {
    if (!groupId || !canEditGroupInfo) return;
    setEditSaving(true);
    try {
      let latestGroup = null;

      if (String(editDraft.name || "").trim() !== String(profileGroup?.name || "").trim()) {
        const res = await api.updateGroupName(host, { groupId, name: String(editDraft.name || "").trim() });
        if (res?.ok) {
          const json = await res.json();
          latestGroup = json?.group || latestGroup;
        }
      }

      if (String(editDraft.description || "").trim() !== String(profileGroup?.description || "").trim()) {
        const res = await api.updateGroupDescription(host, {
          groupId,
          description: String(editDraft.description || "").trim(),
        });
        if (res?.ok) {
          const json = await res.json();
          latestGroup = json?.group || latestGroup;
        }
      }

      if (String(editDraft.avatar || "").trim() !== String(profileGroup?.avatar || "").trim()) {
        const res = await api.updateGroupAvatar(host, { groupId, avatar: String(editDraft.avatar || "").trim() });
        if (res?.ok) {
          const json = await res.json();
          latestGroup = json?.group || latestGroup;
        }
      }

      if (latestGroup) {
        setProfileGroup((prev) => ({ ...(prev || {}), ...latestGroup }));
        if (typeof setGroupsMain === "function") {
          setGroupsMain((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            const next = arr.map((g) =>
              String(g?.id) === String(groupId)
                ? {
                    ...g,
                    name: latestGroup?.name ?? g.name,
                    description: latestGroup?.description ?? g.description,
                    avatar: latestGroup?.avatar ?? g.avatar,
                    updatedAt: latestGroup?.updatedAt || g.updatedAt,
                  }
                : g
            );
            globalThis.storage.setItem("groupsMain", JSON.stringify(next));
            return next;
          });
        }
      }

      setIsEditMode(false);
    } catch (error) {
      console.warn("Failed to save group profile edits:", error);
    } finally {
      setEditSaving(false);
    }
  };

  const setMemberActionLoading = (targetId, value) => {
    const key = String(targetId || "");
    setMemberActionLoadingById((prev) => ({ ...prev, [key]: Boolean(value) }));
  };

  const handlePromoteMember = async (targetId) => {
    const id = String(targetId || "");
    if (!id || !groupId || !canPromoteAdmin) return;
    setMemberActionLoading(id, true);
    try {
      const response = await api.changeGroupAdminRole(host, {
        groupId,
        targetUserId: id,
        action: "promote",
      });
      if (response?.ok) {
        await hydrateGroupMembers();
      }
    } finally {
      setMemberActionLoading(id, false);
    }
  };

  const handleDemoteAdmin = async (targetId) => {
    const id = String(targetId || "");
    if (!id || !groupId || !isCurrentUserOwner) return;
    setMemberActionLoading(id, true);
    try {
      const response = await api.changeGroupAdminRole(host, {
        groupId,
        targetUserId: id,
        action: "demote",
      });
      if (response?.ok) {
        await hydrateGroupMembers();
      }
    } finally {
      setMemberActionLoading(id, false);
    }
  };

  const handleRemoveMember = async (targetId) => {
    const id = String(targetId || "");
    if (!id || !groupId) return;
    setMemberActionLoading(id, true);
    try {
      const response = await api.removeGroupMember(host, {
        groupId,
        targetUserId: id,
      });
      if (response?.ok) {
        await hydrateGroupMembers();
      }
    } finally {
      setMemberActionLoading(id, false);
    }
  };

  const toggleGroupMute = useCallback(() => {
    if (!groupId) return;
    const base = Array.isArray(mutedGroupIds)
      ? mutedGroupIds.map(String)
      : (globalThis.storage.readJSON("mutedGroups", []) || []).map(String);
    const set = new Set(base);
    if (set.has(String(groupId))) set.delete(String(groupId));
    else set.add(String(groupId));
    const next = Array.from(set);
    globalThis.storage.setItem("mutedGroups", JSON.stringify(next));
    if (typeof setMutedGroupIds === "function") setMutedGroupIds(next);
    setIsGroupMuted(next.includes(String(groupId)));
  }, [groupId, mutedGroupIds, setMutedGroupIds]);

  const markCurrentGroupInactiveLocal = useCallback(() => {
    if (typeof setGroupsMain === "function") {
      setGroupsMain((prev) => {
        const next = (Array.isArray(prev) ? prev : []).map((g) =>
          String(g?.id) === String(groupId)
            ? {
                ...g,
                isActive: false,
                unreadCount: 0,
                updatedAt: new Date().toISOString(),
              }
            : g
        );
        globalThis.storage.setItem("groupsMain", JSON.stringify(next));
        return next;
      });
    }
    setProfileGroup((prev) =>
      prev
        ? {
            ...prev,
            isActive: false,
            updatedAt: new Date().toISOString(),
          }
        : prev
    );
  }, [groupId, setGroupsMain]);

  const purgeGroupLocalData = useCallback(async () => {
    if (!groupId) return;
    const gid = String(groupId);

    let latestMessage = null;
    setGroupMessagesByGroup((prev) => {
      const rows = [...(Array.isArray(prev?.[gid]) ? prev[gid] : [])].sort(
        (a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime()
      );
      latestMessage = rows.length > 0 ? rows[rows.length - 1] : null;
      return {
        ...(prev || {}),
        [gid]: latestMessage ? [latestMessage] : [],
      };
    });

    try {
      const cached = globalThis.storage.readJSON("groupMessagesByGroup", {}) || {};
      const rows = [...(Array.isArray(cached?.[gid]) ? cached[gid] : [])].sort(
        (a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime()
      );
      if (rows.length > 0) {
        latestMessage = rows[rows.length - 1];
      }
      if (cached && typeof cached === "object") {
        cached[gid] = latestMessage ? [latestMessage] : [];
        globalThis.storage.setItem("groupMessagesByGroup", JSON.stringify(cached));
      }
    } catch {}

    try {
      const membersByGroup = globalThis.storage.readJSON("groupMembersByGroup", {}) || {};
      delete membersByGroup[gid];
      globalThis.storage.setItem("groupMembersByGroup", JSON.stringify(membersByGroup));
    } catch {}

    try {
      const memberDetails = globalThis.storage.readJSON("groupMemberDetailsByGroup", {}) || {};
      delete memberDetails[gid];
      globalThis.storage.setItem("groupMemberDetailsByGroup", JSON.stringify(memberDetails));
    } catch {}

    if (typeof setGroupsMain === "function") {
      setGroupsMain((prev) => {
        const next = (Array.isArray(prev) ? prev : []).map((g) =>
          String(g?.id) === gid
            ? {
                ...g,
                isDelete: true,
                isDeleted: true,
                isActive: false,
                unreadCount: 0,
                updatedAt: new Date().toISOString(),
              }
            : g
        );
        globalThis.storage.setItem("groupsMain", JSON.stringify(next));
        return next;
      });
    }

    if (db) {
      await new Promise((resolve) => {
        try {
          db.transaction((tx) => {
            if (latestMessage?.id) {
              tx.executeSql(
                "DELETE FROM group_messages WHERE group_id = ? AND id <> ?",
                [gid, String(latestMessage.id)],
                () => {},
                () => false
              );
            } else {
              tx.executeSql("DELETE FROM group_messages WHERE group_id = ?", [gid], () => {}, () => false);
            }
            tx.executeSql(
              "UPDATE group_summaries SET is_active = 0, is_deleted = 1 WHERE id = ?",
              [gid],
              () => resolve(true),
              () => resolve(false)
            );
          });
        } catch {
          resolve(false);
        }
      });
    }
  }, [db, groupId, setGroupMessagesByGroup, setGroupsMain]);

  async function requestExitFlow() {
    setGroupActionError("");
    setShowTransferPicker(false);
    if (isCurrentUserOwner && transferableOwnerIds.length === 0) {
      const result = await Swal.fire({
        title: "Delete group?",
        text: "Exiting now will delete this group and all its chats for everyone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      });
      if (result.isConfirmed) {
        await handleExitGroup();
      }
      return;
    }
    setShowExitConfirm(true);
  }

  const handleExitGroup = useCallback(async () => {
    if (!groupId || exitLoading) return;
    setGroupActionError("");
    setExitLoading(true);
    try {
      const response = await api.exitGroup(host, { groupId });
      if (!response?.ok) {
        const message = await parseApiErrorMessage(response, "Failed to exit group");
        setGroupActionError(message);
        return;
      }
      const json = await response.json().catch(() => ({}));
      if (json?.deletedGroup) {
        await purgeGroupLocalData();
      } else {
        markCurrentGroupInactiveLocal();
      }
      setShowExitConfirm(false);
      setShowTransferPicker(false);
      setIsExpanded(false);
      history.replace("/home");
    } catch (error) {
      setGroupActionError("Failed to exit group");
      console.warn("Failed to exit group:", error);
    } finally {
      setExitLoading(false);
    }
  }, [exitLoading, groupId, history, host, markCurrentGroupInactiveLocal, purgeGroupLocalData]);

  const handleTransferOwner = useCallback(async (targetUserId) => {
    const targetId = String(targetUserId || "");
    if (!groupId || !targetId || transferLoadingById[targetId]) return;
    setGroupActionError("");
    const confirmTransfer = window.confirm("Transfer ownership to this member?");
    if (!confirmTransfer) return;

    setTransferLoadingById((prev) => ({ ...prev, [targetId]: true }));
    try {
      const transferResponse = await api.transferGroupOwner(host, {
        groupId,
        targetUserId: targetId,
      });
      if (!transferResponse?.ok) {
        const message = await parseApiErrorMessage(transferResponse, "Failed to transfer ownership");
        setGroupActionError(message);
        return;
      }

      const transferJson = await transferResponse.json().catch(() => ({}));
      const updatedGroup = transferJson?.group || null;
      if (updatedGroup) {
        setProfileGroup((prev) => ({ ...(prev || {}), ...updatedGroup }));
        if (typeof setGroupsMain === "function") {
          setGroupsMain((prev) => {
            const next = (Array.isArray(prev) ? prev : []).map((g) =>
              String(g?.id) === String(groupId)
                ? {
                    ...g,
                    owner: String(updatedGroup?.owner?._id || updatedGroup?.owner || targetId),
                    updatedAt: updatedGroup?.updatedAt || g?.updatedAt,
                  }
                : g
            );
            globalThis.storage.setItem("groupsMain", JSON.stringify(next));
            return next;
          });
        }
      }

      await handleExitGroup();
    } catch (error) {
      setGroupActionError("Failed to transfer ownership");
      console.warn("Failed to transfer ownership:", error);
    } finally {
      setTransferLoadingById((prev) => ({ ...prev, [targetId]: false }));
    }
  }, [groupId, handleExitGroup, host, setGroupsMain, transferLoadingById]);

  const handleAvatarFile = (file) => {
    if (!isImageFile(file)) return;
    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handlePickAvatarNative = async () => {
    if (!window.NativeAds?.pickMediaNative) return;
    const files = await new Promise((resolve) => {
      const handler = (event) => {
        window.removeEventListener("MediaSelected", handler);
        const detail = event.detail || {};
        const names = detail.names || [];
        const types = detail.types || [];
        const previews = detail.previews || [];
        resolve(
          names.map((n, i) => ({
            name: n,
            type: types[i],
            preview: previews[i],
          }))
        );
      };
      window.addEventListener("MediaSelected", handler);
      window.NativeAds.pickMediaNative(0);
    });
    const first = files?.[0];
    if (!first?.preview) return;
    setCropSrc(first.preview);
  };

  const handlePickGroupAvatar = () => {
    if (!canEditGroupInfo || editSaving) return;
    if (window.NativeAds?.pickMediaNative) {
      handlePickAvatarNative();
      return;
    }
    avatarFileRef.current?.click();
  };

  const getFileExtension = (type, fallback = "bin") => {
    if (!type) return fallback;
    const parts = String(type).split("/");
    return parts[1] || fallback;
  };

  const dataUrlToBlob = async (dataUrl) => {
    if (!dataUrl) return null;
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const uint8ArrayToBase64 = (uint8) => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const chunk = uint8.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  };

  const toDataUrl = async (src, mimeFallback = "image/jpeg") => {
    if (!src) return "";
    if (typeof src === "string" && src.startsWith("data:")) return src;
    try {
      const res = await fetch(src);
      if (!res.ok) return "";
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  };

  const compressBase64Image = async (base64Str, quality = 0.7, opacity = 1.0) => {
    return new Promise((resolve) => {
      try {
        if (!base64Str || typeof base64Str !== "string") return resolve(null);
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 1080;
            let { width, height } = img;
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.globalAlpha = opacity;
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", quality);
            resolve(compressed);
          } catch (e) {
            console.error("Compression error:", e);
            resolve(null);
          }
        };
        img.onerror = (err) => {
          console.error("Image load failed for compression:", err);
          resolve(null);
        };
        setTimeout(() => {
          img.src = base64Str;
        }, 10);
      } catch (err) {
        console.error("compressBase64Image outer error:", err);
        resolve(null);
      }
    });
  };

  const generateThumbnail = async (file) => {
    if (!file?.path) return "";
    const folder = "thumbnails";
    const thumbnailFileName = `${file.name || "video"}_${file.size || "0"}_thumb.jpg`;
    const fullPath = `${folder}/${thumbnailFileName}`;
    try {
      const existing = await Filesystem.readFile({
        path: fullPath,
        directory: Directory.Cache,
      });
      return `data:image/jpeg;base64,${existing.data}`;
    } catch {
      // fallback to generate
    }
    try {
      const result = await ffmpeg_thumnail.generateThumbnail({ path: file.path });
      const base64Thumbnail = result?.data;
      if (!base64Thumbnail) return "";
      await Filesystem.writeFile({
        path: fullPath,
        data: base64Thumbnail,
        directory: Directory.Cache,
        recursive: true,
      });
      return `data:image/jpeg;base64,${base64Thumbnail}`;
    } catch (err) {
      console.warn("Failed to generate thumbnail:", err);
      return "";
    }
  };

  const createVideoThumbnailDataUrl = async (src) => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = src;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      const cleanUp = () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
      video.onloadeddata = () => {
        video.currentTime = Math.min(0.2, video.duration || 0);
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
        cleanUp();
        resolve(dataUrl);
      };
      video.onerror = () => {
        cleanUp();
        resolve("");
      };
    });
  };

  const generateCompressedPreview = async (file) => {
    try {
      const type = String(file?.type || "");
      if (type.startsWith("image/")) {
        const base64 = await toDataUrl(file.previewUrl || file.preview || "");
        if (!base64) return null;
        const compressed = await compressBase64Image(base64, 0.7, 0.8);
        return { type: "image", preview: compressed || base64 };
      }
      if (type.startsWith("video/")) {
        let thumb = "";
        if (file?.path) thumb = await generateThumbnail(file);
        if (!thumb) thumb = await createVideoThumbnailDataUrl(file.previewUrl || file.preview || "");
        if (!thumb) return null;
        const compressed = await compressBase64Image(thumb, 0.7, 0.8);
        return { type: "video", preview: compressed || thumb };
      }
      return null;
    } catch (err) {
      console.error("Error generating preview:", err);
      return null;
    }
  };

  const uploadBlobToB2 = async (blob, filename) => {
    if (!blob) return "";
    const buffer = await blob.arrayBuffer();
    const body = new Uint8Array(buffer);
    const response = await authFetch(
      `${host}/messages/upload-to-b2`,
      {
        method: "POST",
        headers: {
          "X-Filename": filename,
          "X-Filesize": String(body.length),
          "Content-Type": "application/octet-stream",
        },
        body,
      },
      host
    );
    if (!response?.ok) return "";
    const json = await response.json().catch(() => ({}));
    if (!isValidUploadResult(json)) return "";
    return getUploadUrl(json);
  };

  const sanitizeUploadName = (value, fallback = "file") => {
    const safe = String(value || fallback).trim().replace(/[^\w.-]/g, "_");
    return safe || fallback;
  };

  const uploadToSignedUrl = async ({ uploadUrl, body, contentType }) => {
    if (!uploadUrl || !body) return false;
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
      body,
    });
    return Boolean(res?.ok);
  };

  const requestGroupVideoUploadInit = async ({
    groupId: targetGroupId,
    mediaName,
    mediaMimeType,
    mediaSize,
    previewName,
    previewMimeType,
    previewSize,
  }) => {
    if (!targetGroupId) return null;
    const response = await api.groupMediaUploadInit(host, targetGroupId, {
      media: {
        fileName: mediaName,
        mimeType: mediaMimeType,
        size: mediaSize,
      },
      preview: {
        fileName: previewName,
        mimeType: previewMimeType,
        size: previewSize,
      },
    });
    if (!response?.ok) return null;
    const json = await response.json().catch(() => ({}));
    const media = json?.uploads?.media || {};
    const preview = json?.uploads?.preview || {};
    if (!media?.uploadUrl || !media?.signedUrl || !preview?.uploadUrl || !preview?.signedUrl) {
      return null;
    }
    return { media, preview };
  };

  const getBlobFromSandboxPath = async (path) => {
    if (!path) return null;
    try {
      const cleanPath = String(path).replace("file://", "");
      let fileData;
      if (cleanPath.includes("/Documents/")) {
        const relativePath = cleanPath.split("/Documents/")[1];
        fileData = await Filesystem.readFile({
          path: relativePath,
          directory: Directory.Documents,
        });
      } else {
        fileData = await Filesystem.readFile({ path: cleanPath });
      }
      const byteCharacters = atob(fileData.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i += 1) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new Uint8Array(byteNumbers);
    } catch (err) {
      console.warn("Failed to read media bytes from local path:", err);
      return null;
    }
  };

  const saveFilePermanently = async (file) => {
    try {
      if (!isPlatform("hybrid")) return file?.path || "";
      if (file?.path) return file.path;

      let base64 = "";
      if (typeof file?.preview === "string" && file.preview.startsWith("data:")) {
        base64 = String(file.preview).split(",")[1] || "";
      } else if (file?.fileObject instanceof Blob) {
        const bytes = new Uint8Array(await file.fileObject.arrayBuffer());
        base64 = uint8ArrayToBase64(bytes);
      }
      if (!base64) return "";

      const isVideo = String(file?.type || "").startsWith("video/");
      const folder = isVideo ? "files/userowned/videos" : "files/userowned/images";
      const ext = getFileExtension(file?.type, isVideo ? "mp4" : "jpg");
      const safeName = String(file?.name || "media").replace(/[^\w.-]/g, "_");
      const nameWithoutExt = safeName.replace(/\.[^.]+$/, "");
      const fileName = `${Date.now()}_${nameWithoutExt}.${ext}`;
      const savedFile = await Filesystem.writeFile({
        path: `${folder}/${fileName}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      return savedFile?.uri || savedFile?.path || "";
    } catch (err) {
      console.warn("Failed to save media permanently:", err);
      return file?.path || "";
    }
  };

  const buildMediaPayload = async (file) => {
    const type = String(file?.type || "").toLowerCase();
    const isVideo = type.startsWith("video/");
    const previewSrc = file.previewUrl || file.preview || "";
    const filenameBase = file.name || `group_${Date.now()}`;

    let localPath = "";
    let mediaUrl = "";

    if (isVideo) {
      localPath = await saveFilePermanently(file);
      let videoBytes = null;

      if (localPath) {
        videoBytes = await getBlobFromSandboxPath(localPath);
      }
      if (!videoBytes && file?.fileObject instanceof Blob) {
        videoBytes = new Uint8Array(await file.fileObject.arrayBuffer());
      }
      if (!videoBytes && previewSrc) {
        const fallbackBlob = await dataUrlToBlob(previewSrc);
        if (fallbackBlob) {
          videoBytes = new Uint8Array(await fallbackBlob.arrayBuffer());
        }
      }
      if (!videoBytes?.length) return null;
      const previewResult = await generateCompressedPreview({
        ...file,
        path: localPath || file?.path || "",
      });
      const previewDataUrl = previewResult?.preview || "";
      if (!previewDataUrl) return null;
      const previewBlob = await dataUrlToBlob(previewDataUrl);
      if (!previewBlob) return null;

      const now = Date.now();
      const safeVideoName = sanitizeUploadName(filenameBase, `group_video_${now}.mp4`);
      const thumbBase = safeVideoName.replace(/\.[^.]+$/, "");
      const thumbName = sanitizeUploadName(`thumb_${thumbBase}_${now}.jpg`, `thumb_${now}.jpg`);
      const initData = await requestGroupVideoUploadInit({
        groupId,
        mediaName: safeVideoName,
        mediaMimeType: type || "video/mp4",
        mediaSize: videoBytes.length,
        previewName: thumbName,
        previewMimeType: previewBlob.type || "image/jpeg",
        previewSize: previewBlob.size || 0,
      });
      if (!initData?.media?.uploadUrl || !initData?.preview?.uploadUrl) return null;

      const mediaUploaded = await uploadToSignedUrl({
        uploadUrl: initData.media.uploadUrl,
        body: videoBytes,
        contentType: type || "application/octet-stream",
      });
      if (!mediaUploaded) return null;

      const previewUploaded = await uploadToSignedUrl({
        uploadUrl: initData.preview.uploadUrl,
        body: previewBlob,
        contentType: previewBlob.type || "image/jpeg",
      });
      if (!previewUploaded) return null;

      mediaUrl = initData.media.signedUrl;
      const previewUrl = initData.preview.signedUrl;
      return {
        mediaUrl,
        previewUrl,
        localPath,
      };
    } else {
      if (!previewSrc) return null;
      const mediaBlob = await dataUrlToBlob(previewSrc);
      if (!mediaBlob) return null;
      localPath = await saveMediaLocally(previewSrc, filenameBase, file.type || "");
      mediaUrl = await uploadBlobToB2(mediaBlob, filenameBase);
    }

    if (!mediaUrl) return null;

    const previewResult = await generateCompressedPreview({
      ...file,
      path: localPath || file?.path || "",
    });
    const previewDataUrl = previewResult?.preview || "";

    let previewUrl = "";
    if (previewDataUrl) {
      const previewBlob = await dataUrlToBlob(previewDataUrl);
      previewUrl = await uploadBlobToB2(previewBlob, `thumb_${filenameBase}.jpg`);
    }

    return {
      mediaUrl,
      previewUrl,
      localPath,
    };
  };

  const saveMediaLocally = async (dataUrl, filename, mimeType) => {
    if (!dataUrl || !isPlatform("hybrid")) return "";
    try {
      const base64 = String(dataUrl).split(",")[1];
      if (!base64) return "";
      const ext = getFileExtension(mimeType, "bin");
      const finalName = `${Date.now()}_${filename}.${ext}`;
      const result = await Filesystem.writeFile({
        path: `group_media/${finalName}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      return result?.path || result?.uri || "";
    } catch (err) {
      console.warn("Failed to save group media locally:", err);
      return "";
    }
  };

  const handleMediaSelect = (e) => {
    const files = Array.from(e?.target?.files || []);
    if (!files.length) return;

    previewObjectUrlsRef.current.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch {}
    });
    previewObjectUrlsRef.current = [];

    const cleaned = files.map((file) => {
      const rawPreview = file.preview;
      const previewUrl = (() => {
        if (typeof rawPreview === "string" && rawPreview.startsWith("data:")) return rawPreview;
        if (file instanceof Blob) {
          const url = URL.createObjectURL(file);
          previewObjectUrlsRef.current.push(url);
          return url;
        }
        return rawPreview || "";
      })();
      return {
        name: file.name || "media",
        size: file.size || 0,
        type: file.type || "",
        path: file.path || "",
        fileObject: file instanceof Blob ? file : file.fileObject || null,
        preview: rawPreview || "",
        previewUrl,
      };
    });

    setMediaFiles(cleaned);
    setActiveMediaIndex(0);
    setShowMediaPreview(true);
    setShowFileOptions(false);
  };

  const handlePickMedia = async () => {
    if (!canComposeInGroup) return;
    if (window.NativeAds?.pickMediaNative) {
      const picked = await new Promise((resolve) => {
        const handler = (event) => {
          window.removeEventListener("MediaSelected", handler);
          const detail = event.detail || {};
          const names = detail.names || [];
          const types = detail.types || [];
          const previews = detail.previews || [];
          const sizes = detail.sizes || [];
          const paths = detail.paths || [];
          resolve(
            names.map((n, i) => ({
              name: n,
              type: types[i],
              size: sizes[i] || 0,
              path: paths[i] || "",
              fileObject: null,
              preview: previews[i],
            }))
          );
        };
        window.addEventListener("MediaSelected", handler);
        window.NativeAds.pickMediaNative(0);
      });
      handleMediaSelect({ target: { files: picked } });
      return;
    }
    imageVideoInputRef.current?.click();
  };

  const toggleFileOptions = () => {
    if (!canComposeInGroup) return;
    setShowFileOptions((prev) => !prev);
  };

  const sendSelectedMedia = async () => {
    if (!canComposeInGroup) return;
    if (!mediaFiles.length) return;
    if (mediaUploading) return;

    const filesToSend = [...mediaFiles];
    const replyTargetId = replyTarget?.id || null;
    setShowMediaPreview(false);
    setMediaFiles([]);
    setActiveMediaIndex(0);
    setReplyTarget(null);

    setMediaUploading(true);
    try {
      for (const file of filesToSend) {
        const type = String(file?.type || "").toLowerCase();
        const isVideo = type.startsWith("video/");
        const immediateLocalUrl = isVideo
          ? String(file?.path || file?.previewUrl || file?.preview || "")
          : String(file?.previewUrl || file?.preview || "");
        const messageType = type.startsWith("image/")
          ? "media/image"
          : type.startsWith("video/")
            ? "media/video"
            : "media/file";
        const tempId = `tmp-upload-${groupId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const tempMessage = normalizeGroupMessage(
          {
            id: tempId,
            clientMessageId: tempId,
            groupId,
            sender: currentUserId,
            messageType,
            content: "",
            mediaUrl: immediateLocalUrl,
            previewUrl: "",
            isDownload: true,
            isReplyTo: replyTargetId,
            timestamp: new Date().toISOString(),
            status: "uploading",
            readBy: currentUserId ? [currentUserId] : [],
          },
          groupId
        );
        if (tempMessage) {
          setGroupMessagesByGroup((prev) => ({
            ...prev,
            [groupId]: mergeMessageArrays(prev?.[groupId] || [], [tempMessage]),
          }));
          if (db) {
            await saveGroupMessageInSQLite(db, tempMessage);
          } else {
            persistGroupMessageFallback(tempMessage);
          }
        }

        const payload = await buildMediaPayload(file);
        if (!payload?.mediaUrl) {
          await patchGroupMessageLocally(tempId, { status: "failed" });
          continue;
        }
        await sendGroupMessageOverWs({
          messageType,
          content: "",
          mediaUrl: payload.mediaUrl,
          previewUrl: payload.previewUrl,
          isReplyTo: replyTargetId,
          isDownload: true,
          localMediaUrl: payload.localPath || "",
          clientMessageId: tempId,
        });
      }
    } catch (error) {
      console.warn("Failed to send group media:", error);
      Swal.fire("Upload failed", "Could not upload group media.", "error");
    } finally {
      setMediaUploading(false);
    }
  };

  useLayoutEffect(() => {
    const container = listRef.current;
    if (!container) return;

    const last = visibleMessages[visibleMessages.length - 1];
    const currentMeta = {
      len: visibleMessages.length,
      lastId: String(last?.id || ""),
    };
    const prevMeta = prevAutoScrollMetaRef.current;
    const isNewAppend =
      prevMeta.len > 0 &&
      currentMeta.len >= prevMeta.len &&
      currentMeta.lastId &&
      currentMeta.lastId !== prevMeta.lastId;

    if (isNewAppend && wasNearBottomRef.current) {
      scrollToBottom("smooth");
      setShowScrollDown(false);
    }

    prevAutoScrollMetaRef.current = currentMeta;
  }, [scrollToBottom, visibleMessages]);

  useLayoutEffect(() => {
    if (!groupId || initialScrollDoneRef.current || !listRef.current || visibleMessages.length === 0) return;
    const container = listRef.current;
    container.scrollTop = container.scrollHeight;
    initialScrollDoneRef.current = true;
    wasNearBottomRef.current = true;
    setShowScrollDown(false);
    setIsAtTop(false);
  }, [groupId, visibleMessages.length]);

  useLayoutEffect(() => {
    if (!preserveScrollRef.current.pending || !listRef.current) return;
    const container = listRef.current;
    const delta = container.scrollHeight - preserveScrollRef.current.prevHeight;
    container.scrollTop = preserveScrollRef.current.prevTop + delta;
    preserveScrollRef.current.pending = false;
  }, [visibleMessages.length]);

  const markPreserveScrollBeforePrepend = () => {
    if (!listRef.current) return;
    preserveScrollRef.current = {
      pending: true,
      prevHeight: listRef.current.scrollHeight,
      prevTop: listRef.current.scrollTop,
    };
  };

  const handleScroll = () => {
    const container = listRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    wasNearBottomRef.current = distanceFromBottom <= 140;
    setIsAtTop(container.scrollTop <= 20);
    setShowScrollDown(distanceFromBottom > 140);
  };

  const loadOlderMessages = async () => {
    console.log("older")
    if (!groupId || loadingOlder) return;
    setLoadingOlder(true);
    try {
      if (db) {
        const oldestTs = allMessages[0]?.timestamp;
        const oldestId = String(allMessages?.[0]?.id || "");
        const olderRows = await new Promise((resolve, reject) => {
          db.transaction((tx) => {
            tx.executeSql(
              `SELECT * FROM group_messages
               WHERE group_id = ?
                 AND (
                   ? IS NULL
                   OR timestamp < ?
                   OR (timestamp = ? AND id < ?)
                 )
               ORDER BY timestamp DESC, id DESC
               LIMIT ?`,
              [groupId, oldestTs || null, oldestTs || null, oldestTs || null, oldestId || "", PAGE_SIZE],
              (_, result) => {
                const out = [];
                for (let i = 0; i < result.rows.length; i++) {
                  const row = result.rows.item(i);
                  out.push(
                    normalizeGroupMessage(
                      {
                        id: row.id,
                        groupId: row.group_id,
                        sender: row.sender,
                        messageType: row.message_type,
                        content: row.content,
                        mediaUrl: row.media_url,
                        previewUrl: row.preview_url,
                        isDownload: toDownloadBoolean(row.is_download),
                        isReplyTo: row.is_reply_to || null,
                        timestamp: row.timestamp,
                        status: row.status,
                        readBy: JSON.parse(row.read_by || "[]"),
                      },
                      groupId
                    )
                  );
                }
                resolve(out.filter(Boolean).reverse());
              },
              (_, err) => reject(err)
            );
          });
        });

        if (!olderRows.length) {
          setHasMoreOlderMessages(false);
          return;
        }
        markPreserveScrollBeforePrepend();
        setGroupMessagesByGroup((prev) => ({
          ...prev,
          [groupId]: mergeMessageArrays(olderRows, prev?.[groupId] || []),
        }));
        setVisibleCount((prev) => prev + olderRows.length);
        setTimeout(() => {
          void checkHasOlderInDb();
        }, 0);
      } else {
        markPreserveScrollBeforePrepend();
        setVisibleCount((prev) => {
          const next = Math.min(prev + PAGE_SIZE, effectiveMessages.length);
          setHasMoreOlderMessages(next < effectiveMessages.length);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to load older group messages:", err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendGroupMessageOverWs = async ({ messageType = "text", content = "", mediaUrl = "", previewUrl = "", isReplyTo = null, isDownload = false, localMediaUrl = "", clientMessageId: forcedClientId = "" }) => {
    if (!groupId || !socket || socket.readyState !== WebSocket.OPEN || !canComposeInGroup) return false;

    const nowIso = new Date().toISOString();
    const clientMessageId = forcedClientId || `tmp-${groupId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = normalizeGroupMessage(
      {
        id: clientMessageId,
        clientMessageId,
        groupId,
        sender: currentUserId,
        messageType,
        content,
        mediaUrl: localMediaUrl || mediaUrl,
        previewUrl: localMediaUrl && isDownload ? "" : previewUrl,
        isDownload,
        isReplyTo,
        timestamp: nowIso,
        status: "pending",
        readBy: currentUserId ? [currentUserId] : [],
      },
      groupId
    );
    if (!optimistic) return false;

    setGroupMessagesByGroup((prev) => ({
      ...prev,
      [groupId]: mergeMessageArrays(prev?.[groupId] || [], [optimistic]),
    }));
    if (db) {
      await saveGroupMessageInSQLite(db, optimistic);
    } else {
      persistGroupMessageFallback(optimistic);
    }

    try {
      socket.send(
        JSON.stringify({
          type: "group-message",
          groupId,
          messageType,
          content: messageType === "text" ? content : "",
          mediaUrl: messageType.startsWith("media/") ? mediaUrl : "",
          previewUrl: messageType.startsWith("media/") ? previewUrl : "",
          isReplyTo,
          isDownload,
          clientMessageId,
          timestamp: nowIso,
        })
      );
      return true;
    } catch (error) {
      console.warn("Failed to send group message over WS:", error);
      setGroupMessagesByGroup((prev) => {
        const rows = Array.isArray(prev?.[groupId]) ? prev[groupId] : [];
        return {
          ...prev,
          [groupId]: rows.map((m) =>
            String(m?.id || "") === clientMessageId ? { ...m, status: "failed" } : m
          ),
        };
      });
      return false;
    }
  };

  const sendTextMessage = async (e) => {
    e.preventDefault();
    if (!canComposeInGroup) return;
    const content = newMessage.trim();
    if (!content || !groupId) return;
    const ok = await sendGroupMessageOverWs({
      messageType: "text",
      content,
      isReplyTo: replyTarget?.id || null,
    });
    if (ok) {
      setNewMessage("");
      setReplyTarget(null);
    }
  };

  const handleDownloadMedia = async (msg) => {
    const id = String(msg?.id || "");
    if (!id || !msg?.mediaUrl || downloadingById[id]) return;
    if (looksLikeLocalMediaPath(msg?.mediaUrl)) {
      await patchGroupMessageLocally(id, { isDownload: true });
      return;
    }
    setDownloadingById((prev) => ({ ...prev, [id]: true }));
    try {
      let localPath = "";
      if (isPlatform("hybrid")) {
        const ext = getFileExtension(msg?.messageType?.includes("image") ? "image/jpeg" : "video/mp4", "bin");
        const filename = `group_${id}.${ext}`;
        const result = await Filesystem.downloadFile({
          url: msg.mediaUrl,
          path: `group_media/${filename}`,
          directory: Directory.Documents,
          recursive: true,
        });
        localPath = result?.path || result?.uri || "";
      } else {
        const res = await fetch(msg.mediaUrl);
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        const blob = await res.blob();
        localPath = URL.createObjectURL(blob);
      }
      if (!localPath) throw new Error("Download failed");
      await patchGroupMessageLocally(id, { mediaUrl: localPath, isDownload: true });
    } catch (error) {
      console.warn("Failed to download group media:", error);
      Swal.fire("Download failed", "Could not download this media.", "error");
    } finally {
      setDownloadingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const scrollToMessageById = (messageId) => {
    const selectorId = String(messageId || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    if (!selectorId) return;
    const targetNode = listRef.current?.querySelector(`[data-message-id="${selectorId}"]`);
    if (!targetNode) return;
    targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
    setGlowMessageId(String(messageId));
    if (replyGlowTimeoutRef.current) clearTimeout(replyGlowTimeoutRef.current);
    replyGlowTimeoutRef.current = setTimeout(() => setGlowMessageId(null), 1800);
  };

  const getReplyBarLabel = (target) => {
    const type = String(target?.messageType || target?.type || "text").toLowerCase();
    if (type.includes("image")) return "Image";
    if (type.includes("video")) return "Video";
    const text = String(target?.content || "").trim() || "Message";
    return text.length > 84 ? `${text.slice(0, 83)}...` : text;
  };

  const buildMessagePreviewLabel = (target) => {
    const type = String(target?.messageType || target?.type || "text").toLowerCase();
    if (type === "text") return String(target?.content || "").trim() || "Message";
    if (type.includes("image")) return "Image";
    if (type.includes("video")) return "Video";
    if (type.startsWith("media/")) return type.replace("media/", "") || "Media";
    return "Message";
  };

  const getReplyBarMeta = (target) => {
    if (!target) return "";
    const senderId = String(target?.sender || "");
    const mine = senderId === String(currentUserId || "");
    const senderName = mine ? "You" : senderMap.get(senderId)?.name || "Member";
    const timeLabel = target?.timestamp
      ? new Date(target.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    return timeLabel ? `${senderName} • ${timeLabel}` : senderName;
  };

  const handleRowTouchStart = (e, msg) => {
    const touch = e.touches?.[0];
    if (!touch || !msg?.id) return;
    swipeReplyRef.current = {
      activeId: String(msg.id),
      startX: touch.clientX,
      startY: touch.clientY,
      triggered: false,
    };
  };

  const clearLongPressTimer = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const toggleMessageSelection = (messageId) => {
    const sid = String(messageId || "");
    if (!sid) return;
    setSelectedMessageIds((prev) => {
      const exists = prev.includes(sid);
      const next = exists ? prev.filter((id) => id !== sid) : [...prev, sid];
      if (next.length === 0) {
        setSelectionMode(false);
        setShowSelectionMenu(false);
      } else {
        setSelectionMode(true);
      }
      return next;
    });
  };

  const startLongPressSelection = (msg) => {
    clearLongPressTimer();
    longPressTimeoutRef.current = setTimeout(() => {
      setSelectionMode(true);
      setSelectedMessageIds((prev) => {
        const sid = String(msg?.id || "");
        return sid && !prev.includes(sid) ? [sid, ...prev] : prev;
      });
    }, 2000);
  };

  const handleRowTouchMove = (e) => {
    const touch = e.touches?.[0];
    const state = swipeReplyRef.current;
    if (!touch || !state.activeId || state.triggered) return;
    const dx = touch.clientX - state.startX;
    const dy = Math.abs(touch.clientY - state.startY);
    if (Math.abs(dx) > 10 || dy > 10) clearLongPressTimer();
    if (dx < 62 || dy > 32) return;
    const target = replyLookup.get(state.activeId);
    if (!target) return;
    setReplyTarget(target);
    swipeReplyRef.current = { ...state, triggered: true };
  };

  const handleRowTouchEnd = () => {
    clearLongPressTimer();
    swipeReplyRef.current = {
      activeId: null,
      startX: 0,
      startY: 0,
      triggered: false,
    };
  };

  const handleRowMouseDown = (msg) => {
    if (selectionMode) return;
    startLongPressSelection(msg);
  };

  const handleRowMouseUp = () => {
    clearLongPressTimer();
  };

  const handleRowClick = (msg) => {
    if (!selectionMode) return;
    toggleMessageSelection(msg?.id);
  };

  const renderMessageBody = (msg) => {
    const type = String(msg?.messageType || "text").toLowerCase();
    const isMedia = type.startsWith("media/");
    if (!isMedia) {
      return <p className="gchat-text">{msg.content || ""}</p>;
    }
    const isImage = type.includes("image");
    const isVideo = type.includes("video");
    const isDownloaded = Boolean(msg?.isDownload) || looksLikeLocalMediaPath(msg?.mediaUrl);
    const status = String(msg?.status || "").toLowerCase();
    const isUploading = status === "uploading" || status === "pending";
    if (isImage) {
      const src = isDownloaded ? msg.mediaUrl : msg.previewUrl || msg.mediaUrl;
      return (
        <div className="gchat-media-wrap gchat-media-wrap-image">
          <ImageRenderer
            src={src || img}
            alt="group media"
            className="gchat-image"
            onClick={() => {
              if (!isDownloaded) return;
              if (src) setPreviewMedia({ kind: "image", src });
            }}
          />
          {isUploading && (
            <div className="gchat-media-loader">
              <div className="gchat-spinner" />
              <div className="gchat-media-loader-text">Uploading</div>
            </div>
          )}
          {downloadingById[String(msg?.id || "")] && (
            <div className="gchat-media-loader">
              <div className="gchat-spinner" />
              <div className="gchat-media-loader-text">Downloading</div>
            </div>
          )}
          {!isDownloaded && !isUploading && (
            <button
              type="button"
              className="gchat-download-btn"
              onClick={() => handleDownloadMedia(msg)}
              disabled={Boolean(downloadingById[String(msg?.id || "")])}
            >
              {downloadingById[String(msg?.id || "")] ? "Downloading..." : "Download"}
            </button>
          )}
        </div>
      );
    }
    if (isVideo) {
      const src = msg.mediaUrl || "";
      const preview = msg.previewUrl || msg.mediaUrl || "";
      return (
        <div className="gchat-media-wrap gchat-media-wrap-video">
          {isDownloaded ? (
            <VideoRenderer
              key={String(msg?.id || msg?.mediaUrl || msg?.timestamp || "")}
              src={src}
              poster={msg.previewUrl || undefined}
              className="gchat-video"
              Name={String(msg?.id || msg?.mediaUrl || "group-video")}
              Size={Number(msg?.fileSize || msg?.file_size || 0)}
              onClick={() => {
                if (!isDownloaded) return;
                if (src) {
                  setPreviewMedia({
                    kind: "video",
                    src,
                    name: msg?.id || "video",
                    size: 0,
                  });
                }
              }}
            />
          ) : (
            <ImageRenderer
              src={preview || img}
              alt="video preview"
              className="gchat-image"
              onClick={() => {}}
            />
          )}
          {isUploading && (
            <div className="gchat-media-loader">
              <div className="gchat-spinner" />
              <div className="gchat-media-loader-text">Uploading</div>
            </div>
          )}
          {downloadingById[String(msg?.id || "")] && (
            <div className="gchat-media-loader">
              <div className="gchat-spinner" />
              <div className="gchat-media-loader-text">Downloading</div>
            </div>
          )}
          {!isDownloaded && !isUploading && (
            <button
              type="button"
              className="gchat-download-btn"
              onClick={() => handleDownloadMedia(msg)}
              disabled={Boolean(downloadingById[String(msg?.id || "")])}
            >
              {downloadingById[String(msg?.id || "")] ? "Downloading..." : "Download"}
            </button>
          )}
        </div>
      );
    }
    return <p className="gchat-text">Unsupported media type</p>;
  };

  const renderReplyPreview = (msg) => {
    const replyId = String(msg?.isReplyTo || "").trim();
    if (!replyId) return null;
    const target = replyLookup.get(replyId);
    if (!target) return null;

    const type = String(target?.messageType || target?.type || "text").toLowerCase();
    const isImage = type.includes("image");
    const isVideo = type.includes("video");
    const previewSrc = target.mediaUrl || target.previewUrl || "";
    const senderMeta = senderMap.get(String(target.sender)) || {};
    const replySenderName = String(target.sender) === currentUserId ? "You" : (senderMeta?.name || "Member");
    const rawText = isImage || isVideo ? "" : String(target.content || "").trim();
    const text = rawText.length > 84 ? `${rawText.slice(0, 83)}…` : rawText;

    const selectorId = String(replyId).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    return (
      <div
        className="gchat-reply-preview"
        onClick={(e) => {
          e.stopPropagation();
          const targetNode = listRef.current?.querySelector(`[data-message-id="${selectorId}"]`);
          if (!targetNode) return;
          targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
          setGlowMessageId(replyId);
          if (replyGlowTimeoutRef.current) clearTimeout(replyGlowTimeoutRef.current);
          replyGlowTimeoutRef.current = setTimeout(() => setGlowMessageId(null), 1800);
        }}
      >
        <div className="gchat-reply-sender">{replySenderName}</div>
        {isImage && previewSrc ? (
          <ImageRenderer src={previewSrc} alt="reply preview" className="gchat-reply-media" />
        ) : null}
        {isVideo && previewSrc ? (
          <VideoRenderer
            src={previewSrc}
            Name={target.id || "reply-video"}
            Size={Number(target.fileSize || 0)}
            style={{
              width: "100%",
              maxWidth: "100%",
              height: "42px",
              maxHeight: "42px",
              aspectRatio: "16 / 9",
              objectFit: "cover",
              borderRadius: "6px",
              opacity: 0.85,
            }}
          />
        ) : null}
        {!isImage && !isVideo ? (
          <div className="gchat-reply-text">{text || "Message"}</div>
        ) : null}
      </div>
    );
  };

  const getPlayableVideoSrc = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.startsWith("file://")) {
      try {
        return Capacitor.convertFileSrc(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  };

  const removeMessagesLocally = async (messageIds) => {
    const ids = (Array.isArray(messageIds) ? messageIds : []).map(String);
    if (!ids.length || !groupId) return;

    const nextRows = (Array.isArray(groupMessagesByGroup?.[groupId]) ? groupMessagesByGroup[groupId] : [])
      .filter((msg) => !ids.includes(String(msg?.id || "")));

    setGroupMessagesByGroup((prev) => ({ ...prev, [groupId]: nextRows }));

    if (db) {
      await Promise.all(ids.map((id) => deleteGroupMessageInSQLite(db, id).catch(() => false)));
    } else {
      const all = globalThis.storage.readJSON(GROUP_MESSAGES_CACHE_KEY, {}) || {};
      globalThis.storage.setItem(
        GROUP_MESSAGES_CACHE_KEY,
        JSON.stringify({ ...all, [groupId]: nextRows })
      );
    }

    if (typeof setGroupsMain === "function") {
      const previewSource = nextRows[nextRows.length - 1] || null;
      const latestMessage = previewSource ? buildMessagePreviewLabel(previewSource) : "";
      const latestMessageTimestamp = previewSource?.timestamp || null;
      setGroupsMain((prev) => {
        const next = (Array.isArray(prev) ? prev : []).map((entry) =>
          String(entry?.id || "") === String(groupId)
            ? {
                ...entry,
                latestMessage,
                latestMessageTimestamp,
                updatedAt: latestMessageTimestamp || entry?.updatedAt || new Date().toISOString(),
              }
            : entry
        );
        globalThis.storage.setItem("groupsMain", JSON.stringify(next));
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedMessages.length) return;
    const result = await Swal.fire({
      title: selectedMessages.length === 1 ? "Delete message?" : `Delete ${selectedMessages.length} messages?`,
      text: "This will remove the selected message locally. Your own messages will also be deleted from server.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      background: "#1f2937",
      color: "#fff",
    });
    if (!result.isConfirmed) return;

    const mine = selectedMessages.filter((msg) => String(msg?.sender || "") === String(currentUserId));

    for (const msg of mine) {
      try {
        const response = await api.deleteGroupMessage(host, String(msg.id));
        if (!response?.ok) {
          const message = await parseApiErrorMessage(response, "Failed to delete group message");
          throw new Error(message);
        }
      } catch (error) {
        await Swal.fire({
          title: "Delete failed",
          text: error?.message || "Failed to delete one or more messages",
          icon: "error",
          background: "#1f2937",
          color: "#fff",
        });
        return;
      }
    }

    await removeMessagesLocally(selectedMessages.map((msg) => msg.id));
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setShowSelectionMenu(false);
  };

  const handleCopySelected = async () => {
    if (!singleSelectedMessage?.content) return;
    try {
      await navigator.clipboard.writeText(singleSelectedMessage.content);
      setSelectionMode(false);
      setSelectedMessageIds([]);
    } catch {
      await Swal.fire({
        title: "Copy failed",
        text: "Failed to copy message",
        icon: "error",
        background: "#1f2937",
        color: "#fff",
      });
    }
  };

  const handleForwardSelected = () => {
    if (!selectedMessages.length) return;
    history.push("/forward", { forwardedMessages: selectedMessages });
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setShowSelectionMenu(false);
  };

  const handleOpenMessageInfo = async () => {
    if (!singleSelectedMessage) return;
    setMessageInfoState({ loading: true, messageId: String(singleSelectedMessage.id), readBy: [] });
    setShowMessageInfo(true);
    try {
      const response = await api.getGroupMessageReadState(host, String(singleSelectedMessage.id));
      const json = response?.ok ? await response.json().catch(() => ({})) : {};
      setMessageInfoState({
        loading: false,
        messageId: String(singleSelectedMessage.id),
        readBy: Array.isArray(json?.readBy) ? json.readBy.map(String) : [],
      });
    } catch {
      setMessageInfoState({
        loading: false,
        messageId: String(singleSelectedMessage.id),
        readBy: [],
      });
    }
  };

  if (!groupId) {
    return (
      <div className="gchat-page gchat-empty">
        <button type="button" className="btn btn-dark" onClick={() => history.push("/home")}>
          Back
        </button>
      </div>
    );
  }

  if (isExpanded) {
    const createdAt = profileGroup?.createdAt || profileGroup?.updatedAt || group?.updatedAt || null;
    return (
      <div className="gchat-page gprofile-page">
        <header className="gprofile-header">
          <button
            type="button"
            className="gchat-icon-btn"
            onClick={() => {
              if (isEditMode) {
                setIsEditMode(false);
                setEditDraft({
                  name: profileGroup?.name || group?.name || "",
                  description: profileGroup?.description || group?.description || "",
                  avatar: profileGroup?.avatar || group?.avatar || "",
                });
                return;
              }
              setIsExpanded(false);
            }}
            aria-label={isEditMode ? "Cancel edit" : "Back"}
          >
            {isEditMode ? "Cancel" : <IoArrowBack size={20} />}
          </button>
          <h5 className="gprofile-title">{isEditMode ? "Edit Group" : "Profile"}</h5>
          {isEditMode ? (
            <button
              type="button"
              className="gchat-icon-btn"
              disabled={!canEditGroupInfo || editSaving}
              onClick={saveGroupProfileEdits}
            >
              {editSaving ? "Saving..." : "Save"}
            </button>
          ) : (
            <button
              type="button"
              className="gchat-icon-btn"
              disabled={!canEditGroupInfo}
              onClick={() => setIsEditMode(true)}
            >
              Edit
            </button>
          )}
        </header>

        <div className="gprofile-body">
          <div className={`gprofile-hero ${isEditMode ? "is-editing" : ""}`}>
            <img src={editDraft.avatar || profileGroup?.avatar || group?.avatar || img} alt="Group" className="gprofile-avatar" />
            {isEditMode ? (
              <div className="gprofile-edit-stack">
                <button
                  type="button"
                  className="gprofile-image-trigger"
                  disabled={!canEditGroupInfo || editSaving}
                  onClick={handlePickGroupAvatar}
                >
                  Pick Group Image
                </button>
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && handleAvatarFile(e.target.files[0])}
                />

                <div className="gprofile-edit-grid">
                  <label className="gprofile-field-card">
                    <span className="gprofile-field-label">Group name</span>
                    <input
                      type="text"
                      className="form-control gprofile-inline-input"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={!canEditGroupInfo || editSaving}
                      placeholder="Group name"
                    />
                  </label>

                  <label className="gprofile-field-card gprofile-field-card-wide">
                    <span className="gprofile-field-label">Description</span>
                    <textarea
                      className="form-control gprofile-inline-input gprofile-textarea"
                      rows={4}
                      value={editDraft.description}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                      disabled={!canEditGroupInfo || editSaving}
                      placeholder="Add a short group description"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <h4 className="gprofile-name">{profileGroup?.name || group?.name || "Group"}</h4>
                <div className="gprofile-date">
                  {createdAt ? new Date(createdAt).toLocaleDateString() : "Date unavailable"}
                </div>
              </>
            )}
          </div>

          {!isEditMode && (
            <>
              <div className="gprofile-section-title">DESCRIPTION</div>
              <div className="gprofile-card gprofile-description-card">
                {profileGroup?.description || group?.description || "No description"}
              </div>
            </>
          )}

          {!canEditGroupInfo && (
            <small className="gprofile-note">Editing is restricted by group settings and your role.</small>
          )}

          {!isEditMode && (
            <>
              <div className="gprofile-section-title">SETTINGS</div>
              <div className="gprofile-settings-grid">
                <div className="gprofile-setting-row">
                  <div className="gprofile-setting-copy">
                    <label className="gprofile-setting-label">Who can send messages</label>
                    <small className="gprofile-setting-hint">Control posting permissions in group chat.</small>
                  </div>
                  <select
                    className="form-select gprofile-setting-select"
                    value={settingsDraft.messagingPermission}
                    disabled={!canManageSettings || settingsSaving}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, messagingPermission: e.target.value }))}
                  >
                    <option value="ALL_MEMBERS">All members</option>
                    <option value="ADMINS_ONLY">Admins only</option>
                  </select>
                </div>

                <div className="gprofile-setting-row">
                  <div className="gprofile-setting-copy">
                    <label className="gprofile-setting-label">Who can add members</label>
                    <small className="gprofile-setting-hint">Manage invite and direct add access.</small>
                  </div>
                  <select
                    className="form-select gprofile-setting-select"
                    value={settingsDraft.addMembersPermission}
                    disabled={!canManageSettings || settingsSaving}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, addMembersPermission: e.target.value }))}
                  >
                    <option value="ADMINS_ONLY">Admins only</option>
                    <option value="ALL_MEMBERS">All members</option>
                  </select>
                </div>

                <div className="gprofile-setting-row">
                  <div className="gprofile-setting-copy">
                    <label className="gprofile-setting-label">Who can edit group details</label>
                    <small className="gprofile-setting-hint">Decide who can change name, avatar, and description.</small>
                  </div>
                  <select
                    className="form-select gprofile-setting-select"
                    value={settingsDraft.groupInfoEditPermission}
                    disabled={!canManageSettings || settingsSaving}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, groupInfoEditPermission: e.target.value }))}
                  >
                    <option value="ADMINS_ONLY">Admins only</option>
                    <option value="ALL_MEMBERS">All members</option>
                  </select>
                </div>

                <div className="gprofile-settings-actions">
                  <button
                    type="button"
                    className="gprofile-action-btn gprofile-settings-save"
                    disabled={!canManageSettings || settingsSaving}
                    onClick={saveGroupSettings}
                  >
                    {settingsSaving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
              {!canManageSettings && (
                <small className="gprofile-note">Only admins can change settings.</small>
              )}

              <div className="gprofile-section-title">ADD MEMBER</div>
              <div
                className={`gprofile-card gprofile-clickable-card ${canAddMembers ? "" : "is-disabled"}`}
                role="button"
                tabIndex={canAddMembers ? 0 : -1}
                onClick={() => {
                  if (!canAddMembers) return;
                  history.push("/group-add-members", {
                    groupId,
                    groupdetails: profileGroup || group,
                    memberIds: membersToRender,
                  });
                }}
                onKeyDown={(e) => {
                  if (!canAddMembers) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    history.push("/group-add-members", {
                      groupId,
                      groupdetails: profileGroup || group,
                      memberIds: membersToRender,
                    });
                  }
                }}
              >
                <div className="gprofile-clickable-title">Add Members</div>
                <div className="gprofile-clickable-sub">Open user list and send group invite links.</div>
                {!canAddMembers && (
                  <small className="gprofile-note">You do not have permission to add members.</small>
                )}
              </div>

              <div className="gprofile-section-title">MEMBERS</div>
              <div className="gprofile-people-tabs">
                <button
                  type="button"
                  className={`gprofile-people-tab ${activePeopleTab === "members" ? "is-active" : ""}`}
                  onClick={() => setActivePeopleTab("members")}
                >
                  Members
                </button>
                <button
                  type="button"
                  className={`gprofile-people-tab ${activePeopleTab === "invites" ? "is-active" : ""}`}
                  onClick={() => setActivePeopleTab("invites")}
                >
                  Invites
                </button>
              </div>
              <div className="gprofile-members">
                {activePeopleTab === "members" && membersLoading && (
                  <div className="gprofile-loader-wrap">
                    <div className="spinner-border text-light" role="status" />
                  </div>
                )}
                {activePeopleTab === "members" && !membersLoading && membersToRender.map((id) => {
                  const meta = senderMap.get(String(id)) || {};
                  const isSelf = String(id) === String(currentUserId);
                  const isAdmin = adminIdSet.has(String(id));
                  const isOwner = String(id) === String(ownerId);
                  const isMemberAdminRole = memberRoleMap.get(String(id)) === "ADMIN";
                  const canShowPromote = !isOwner && !isMemberAdminRole;
                  const canShowDemote = !isOwner && isMemberAdminRole && isCurrentUserOwner;
                  const canShowRemove = !isOwner && String(id) !== String(currentUserId);
                  const loading = Boolean(memberActionLoadingById[String(id)]);
                  return (
                    <div key={id} className={`gprofile-member-row ${isSelf ? "is-self" : ""}`}>
                      <img src={meta?.avatar || img} alt={meta?.name || "Member"} className="gprofile-member-avatar" />
                      <div className="gprofile-member-text">
                        <div className="gprofile-member-name">
                          {meta?.name || "Unknown"} {isAdmin ? <span className="gprofile-member-role">ADMIN</span> : null}
                          {isOwner ? <span className="gprofile-member-role owner">OWNER</span> : null}
                        </div>
                        <div className="gprofile-member-actions-row">
                          <button
                            type="button"
                            className="gprofile-mini-btn"
                            disabled={!canPromoteAdmin || !canShowPromote || loading}
                            onClick={() => handlePromoteMember(id)}
                          >
                            {loading && canShowPromote ? "..." : "Make Admin"}
                          </button>
                          {canShowDemote && (
                            <button
                              type="button"
                              className="gprofile-mini-btn"
                              disabled={loading}
                              onClick={() => handleDemoteAdmin(id)}
                            >
                              {loading ? "..." : "Disable Admin"}
                            </button>
                          )}
                          {canShowRemove && (
                            <button
                              type="button"
                              className="gprofile-mini-btn danger"
                              disabled={!canManageSettings || loading}
                              onClick={() => handleRemoveMember(id)}
                            >
                              {loading ? "..." : "Remove Member"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activePeopleTab === "invites" && invitesLoading && (
                  <div className="gprofile-loader-wrap">
                    <div className="spinner-border text-light" role="status" />
                  </div>
                )}
                {activePeopleTab === "invites" && !invitesLoading && groupInvites.length === 0 && (
                  <div className="gprofile-empty">No pending invites</div>
                )}
                {activePeopleTab === "invites" && !invitesLoading && groupInvites.map((invite) => {
                  const inviteId = String(invite?._id || invite?.id || "");
                  const invitedUser = invite?.invitedUserId || {};
                  const invitedBy = invite?.invitedBy || {};
                  const invitedName = invitedUser?.name || String(invite?.invitedUserId || "");
                  const invitedAvatar = pickAvatar(invitedUser) || img;
                  return (
                    <div key={inviteId || `${invitedName}-${invite?.createdAt || ""}`} className="gprofile-member-row">
                      <img src={invitedAvatar} alt={invitedName || "Invited user"} className="gprofile-member-avatar" />
                      <div className="gprofile-member-text">
                        <div className="gprofile-member-name">{invitedName}</div>
                        <div className="gprofile-member-id">
                          By {invitedBy?.name || "Unknown"} | Expires{" "}
                          {invite?.expiresAt ? new Date(invite.expiresAt).toLocaleString() : "soon"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="gprofile-section-title">ACTIONS</div>
              <div className="gprofile-actions">
                <button type="button" className="gprofile-action-btn" onClick={toggleGroupMute}>
                  {isGroupMuted ? "Unmute Notifications" : "Mute Notifications"}
                </button>
                <button
                  type="button"
                  className="gprofile-action-btn"
                  disabled={exitLoading}
                  onClick={requestExitFlow}
                >
                  {exitLoading ? "Exiting..." : "Exit Group"}
                </button>
                <button type="button" className="gprofile-action-btn">Report Group</button>
                <button type="button" className="gprofile-action-btn danger">Delete Chat</button>
              </div>
            </>
          )}
        </div>
        {renderExitAndTransferModals()}
      </div>
    );
  }

  const introCreatedAt = profileGroup?.createdAt || group?.createdAt || profileGroup?.updatedAt || group?.updatedAt || null;
  const introAvatar = profileGroup?.avatar || group?.avatar || img;
  const introName = profileGroup?.name || group?.name || "Group";
  const introDescription = profileGroup?.description || group?.description || "No description";
  const introMembersCount = Number(
    profileGroup?.memberCount ||
      group?.memberCount ||
      (Array.isArray(profileGroup?.members) ? profileGroup.members.length : 0) ||
      (Array.isArray(group?.members) ? group.members.length : 0) ||
      memberIds.length ||
      0
  );
  const introCreatedLabel = introCreatedAt ? new Date(introCreatedAt).toLocaleDateString() : "Date unavailable";

  function renderExitAndTransferModals() {
    return (
      <>
        {showExitConfirm && (
          <div className="gchat-preview" onClick={() => setShowExitConfirm(false)}>
            <div className="gchat-preview-inner gchat-group-modal" onClick={(e) => e.stopPropagation()}>
              {isCurrentUserOwner ? (
                <>
                  <h5 className="mb-2">Before leaving, assign a new owner</h5>
                  <p className="mb-3 text-muted">
                    You are the owner of this group. Transfer ownership first, then you can exit.
                  </p>
                  {groupActionError ? <div className="alert alert-danger py-2">{groupActionError}</div> : null}
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-light"
                      onClick={() => setShowExitConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => {
                        setShowExitConfirm(false);
                        setShowTransferPicker(true);
                      }}
                    >
                      Make Owner
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h5 className="mb-2">Exit Group?</h5>
                  <p className="mb-3 text-muted">Are you sure you want to leave this group?</p>
                  {groupActionError ? <div className="alert alert-danger py-2">{groupActionError}</div> : null}
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-light"
                      disabled={exitLoading}
                      onClick={() => setShowExitConfirm(false)}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className="btn btn-light"
                      disabled={exitLoading}
                      onClick={handleExitGroup}
                    >
                      {exitLoading ? "Exiting..." : "Yes"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {showTransferPicker && (
          <div className="gchat-preview" onClick={() => setShowTransferPicker(false)}>
            <div className="gchat-preview-inner gchat-group-modal" onClick={(e) => e.stopPropagation()}>
              <h5 className="mb-2">Transfer Ownership</h5>
              <p className="mb-3 gchat-group-modal-sub">Select a member and transfer ownership before exiting.</p>
              {groupActionError ? <div className="alert alert-danger py-2">{groupActionError}</div> : null}
              <div className="gchat-transfer-list">
                {transferableOwnerIds.length === 0 && (
                  <div className="gchat-transfer-empty">No eligible active members found.</div>
                )}
                {transferableOwnerIds.map((id) => {
                  const member = senderMap.get(String(id)) || {};
                  const loading = Boolean(transferLoadingById[String(id)]);
                  return (
                    <div key={id} className="gchat-transfer-row">
                      <div className="gchat-transfer-left">
                        <img
                          src={member?.avatar || img}
                          alt={member?.name || "Member"}
                          className="gchat-transfer-avatar"
                        />
                        <div className="gchat-transfer-text">
                          <div className="gchat-transfer-name">{member?.name || "Unknown"}</div>
                          <small className="gchat-transfer-id">{id}</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-light gchat-transfer-btn"
                        disabled={loading || exitLoading}
                        onClick={() => handleTransferOwner(id)}
                      >
                        {loading ? "Transferring..." : "Transfer Owner"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  className="btn btn-outline-light"
                  disabled={exitLoading}
                  onClick={() => setShowTransferPicker(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="gchat-page">
      <header className={`gchat-header ${selectionMode ? "is-selection-mode" : ""}`}>
        <button
          type="button"
          className="gchat-icon-btn"
          onClick={() => {
            if (selectionMode) {
              setSelectionMode(false);
              setSelectedMessageIds([]);
              setShowSelectionMenu(false);
              return;
            }
            history.push("/home");
          }}
          aria-label={selectionMode ? "Clear selection" : "Back"}
        >
          {selectionMode ? <MdClose size={20} /> : <IoArrowBack size={20} />}
        </button>
        {!selectionMode && <img src={group?.avatar || img} alt="group avatar" className="gchat-header-avatar" />}
        <div
          className="gchat-title-wrap"
          onClick={() => {
            if (!selectionMode) setIsExpanded((prev) => !prev);
          }}
          role="button"
          tabIndex={0}
        >
          <h5 className="gchat-title">{selectionMode ? `${selectedMessageIds.length} selected` : (group?.name || "Group Chat")}</h5>
          <small className="gchat-sub">
            {selectionMode ? "Message actions" : (group?.isActive === false ? "Inactive" : "Tap to expand")}
          </small>
        </div>
        {selectionMode && (
          <div className="gchat-selection-actions">
            {singleSelectedMessage?.content ? (
              <button type="button" className="gchat-icon-btn" onClick={handleCopySelected} aria-label="Copy">
                <FaCopy size={16} />
              </button>
            ) : null}
            {singleSelectedMessage && singleSelectedMine ? (
              <button type="button" className="gchat-icon-btn" onClick={handleOpenMessageInfo} aria-label="Info">
                <FaInfoCircle size={16} />
              </button>
            ) : null}
            <button
              type="button"
              className="gchat-icon-btn"
              onClick={() => setShowSelectionMenu((prev) => !prev)}
              aria-label="More"
            >
              <FaEllipsisV size={16} />
            </button>
          </div>
        )}
      </header>
      {selectionMode && showSelectionMenu ? (
        <div className="gchat-selection-menu">
          <button type="button" className="gchat-selection-menu-btn" onClick={handleForwardSelected}>
            Forward
          </button>
          <button type="button" className="gchat-selection-menu-btn danger" onClick={handleDeleteSelected}>
            Delete
          </button>
        </div>
      ) : null}

      <div className="gchat-list-wrap">
        {showLoadOlderButton && (
          <button type="button" className="btn btn-sm btn-outline-secondary mb-2 gchat-load-btn" onClick={loadOlderMessages} disabled={loadingOlder}>
            {loadingOlder ? "Loading..." : "Load older"}
          </button>
        )}
        <div className="gchat-list" ref={listRef} onScroll={handleScroll}>
          {!hasMoreOlderMessages && (
            <div className="gchat-intro-wrap">
              <div className="gchat-intro-card">
                <img src={introAvatar} alt={introName} className="gchat-intro-avatar" />
                <h6 className="gchat-intro-name">{introName}</h6>
                <div className="gchat-intro-meta">
                  {introMembersCount} members · Created {introCreatedLabel}
                </div>
                <div className="gchat-intro-desc">{introDescription}</div>
              </div>
            </div>
          )}
          {visibleMessages.map((msg) => {
            const mine = String(msg.sender) === currentUserId;
            const senderMeta = senderMap.get(String(msg.sender)) || {};
            const senderName = mine ? "You" : senderMeta?.name || "Member";
            const isMediaMessage = String(msg?.messageType || "").toLowerCase().startsWith("media/");
            return (
              <div
                key={msg.id}
                data-message-id={String(msg.id || "")}
                className={`gchat-row ${mine ? "mine" : "other"} ${glowMessageId === String(msg.id || "") ? "is-target-glow" : ""} ${selectedMessageIds.includes(String(msg.id || "")) ? "is-selected" : ""}`}
                onTouchStart={(e) => {
                  handleRowTouchStart(e, msg);
                  if (!selectionMode) startLongPressSelection(msg);
                }}
                onTouchMove={handleRowTouchMove}
                onTouchEnd={handleRowTouchEnd}
                onMouseDown={() => handleRowMouseDown(msg)}
                onMouseUp={handleRowMouseUp}
                onMouseLeave={handleRowMouseUp}
                onClick={() => handleRowClick(msg)}
              >
                {!mine && (
                  <img
                    src={senderMeta?.avatar || img}
                    alt={senderName}
                    className="gchat-user-avatar"
                  />
                )}
                <div className={`gchat-bubble ${isMediaMessage ? "has-media" : ""}`}>
                  {!mine && <div className="gchat-sender">{senderName}</div>}
                  {renderMessageBody(msg)}
                  {renderReplyPreview(msg)}
                  <div className="gchat-time">
                    {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {showScrollDown && (
          <button type="button" className="gchat-scroll-btn" onClick={() => scrollToBottom()}>
            <FaArrowDown />
          </button>
        )}
      </div>
      {canComposeInGroup && replyTarget ? (
        <div
          className="gchat-composer-replybar"
          onClick={() => scrollToMessageById(replyTarget.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              scrollToMessageById(replyTarget.id);
            }
          }}
        >
          <div className="gchat-composer-replybar-main">
            <div className="gchat-composer-replybar-text">{getReplyBarLabel(replyTarget)}</div>
            <div className="gchat-composer-replybar-meta">{getReplyBarMeta(replyTarget)}</div>
          </div>
          <button
            type="button"
            className="gchat-composer-replybar-close"
            onClick={(e) => {
              e.stopPropagation();
              setReplyTarget(null);
            }}
            aria-label="Cancel reply"
          >
            x
          </button>
        </div>
      ) : null}

      {canComposeInGroup ? (
        <form className="gchat-form" onSubmit={sendTextMessage}>
          <button type="button" className="gchat-round-btn" aria-label="Emoji">
            <MdEmojiEmotions size={20} />
          </button>
          <input
            type="text"
            className="form-control gchat-input"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="button" className="gchat-round-btn" aria-label="Attach" onClick={toggleFileOptions}>
            <FaPaperclip size={16} />
          </button>
          <button type="submit" className="btn gchat-send-btn">
            Send
          </button>
          {showFileOptions ? (
            <div className="gchat-attach-menu" role="menu">
              <button type="button" className="gchat-attach-btn" onClick={handlePickMedia}>
                Media
              </button>
            </div>
          ) : null}
          <input
            type="file"
            ref={imageVideoInputRef}
            onChange={handleMediaSelect}
            multiple
            className="d-none"
            accept="image/*,video/*"
          />
        </form>
      ) : (
        <div className="gchat-inactive-member-note">
          You are no longer a active member of this group
        </div>
      )}

      {renderExitAndTransferModals()}

      {cropSrc && (
        <div className="gchat-preview" onClick={() => setCropSrc(null)}>
          <div className="gchat-preview-inner" onClick={(e) => e.stopPropagation()}>
            <div style={{ position: "relative", height: 320, width: "100%", background: "#111", borderRadius: 12 }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-100 mt-3"
            />
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-outline-light" onClick={() => setCropSrc(null)}>Cancel</button>
              <button
                className="btn btn-light"
                onClick={async () => {
                  if (!croppedAreaPixels) return;
                  const cropped = await getCroppedImg(cropSrc, croppedAreaPixels);
                  setEditDraft((prev) => ({ ...prev, avatar: cropped }));
                  setCropSrc(null);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {previewMedia && (
        <div className="gchat-preview" onClick={() => setPreviewMedia(null)}>
          <div className="gchat-preview-inner" onClick={(e) => e.stopPropagation()}>
            {previewMedia.kind === "image" ? (
              <ImageRenderer src={previewMedia.src} alt="preview" className="gchat-preview-image" />
            ) : (
              <video
                src={getPlayableVideoSrc(previewMedia.src)}
                className="gchat-preview-video"
                controls
                autoPlay
                playsInline
              />
            )}
            <button type="button" className="btn btn-light mt-2" onClick={() => setPreviewMedia(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {showMediaPreview && (
        <div className="gchat-media-preview" onClick={() => setShowMediaPreview(false)}>
          <div className="gchat-media-preview-inner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="gchat-media-preview-btn left"
              onClick={() => {
                setShowMediaPreview(false);
                setMediaFiles([]);
                setActiveMediaIndex(0);
              }}
              aria-label="Close preview"
            >
              <MdClose size={18} />
            </button>
            {mediaFiles.length > 0 && (
              <button
                type="button"
                className="gchat-media-preview-btn left second"
                onClick={() => {
                  const updated = mediaFiles.filter((_, i) => i !== activeMediaIndex);
                  setMediaFiles(updated);
                  if (!updated.length) {
                    setShowMediaPreview(false);
                    setActiveMediaIndex(0);
                    return;
                  }
                  if (activeMediaIndex >= updated.length) {
                    setActiveMediaIndex(Math.max(0, updated.length - 1));
                  }
                }}
                aria-label="Remove current"
              >
                <MdDeleteSweep size={18} />
              </button>
            )}
            <button
              type="button"
              className="gchat-media-preview-btn right"
              onClick={sendSelectedMedia}
              disabled={mediaUploading}
              aria-label="Send media"
            >
              <FaPaperPlane size={16} />
            </button>

            <div className="gchat-media-preview-main">
              <div className="gchat-media-preview-stage">
                {mediaFiles[activeMediaIndex]?.type?.startsWith("image/") ? (
                  <ImageRenderer
                    src={mediaFiles[activeMediaIndex]?.previewUrl || mediaFiles[activeMediaIndex]?.preview || ""}
                    alt="preview"
                    zoomable
                    maxZoom={4}
                    className="gchat-preview-image"
                  />
                ) : (
                  <video
                    src={mediaFiles[activeMediaIndex]?.previewUrl || mediaFiles[activeMediaIndex]?.preview || ""}
                    controls
                    className="gchat-preview-video"
                  />
                )}
              </div>
            </div>

            <div className="gchat-media-thumb-strip">
              {mediaFiles.map((file, index) => (
                <div
                  key={`${file.name || "media"}-${index}`}
                  onClick={() => setActiveMediaIndex(index)}
                  className={`gchat-media-thumb ${index === activeMediaIndex ? "is-active" : ""}`}
                >
                  <button
                    type="button"
                    className="gchat-media-thumb-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = mediaFiles.filter((_, i) => i !== index);
                      setMediaFiles(updated);
                      if (!updated.length) {
                        setShowMediaPreview(false);
                        setActiveMediaIndex(0);
                        return;
                      }
                      if (index === activeMediaIndex) {
                        setActiveMediaIndex(Math.max(0, index - 1));
                      } else if (index < activeMediaIndex) {
                        setActiveMediaIndex((prev) => Math.max(0, prev - 1));
                      }
                    }}
                    aria-label="Remove media"
                  >
                    <MdClose size={12} />
                  </button>
                  {file.type?.startsWith("image/") ? (
                    <img src={file.previewUrl || file.preview} alt="" />
                  ) : (
                    <video src={file.previewUrl || file.preview} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showMessageInfo && (
        <div className="gchat-preview" onClick={() => setShowMessageInfo(false)}>
          <div className="gchat-preview-inner gchat-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gchat-info-modal-head">
              <div>
                <h5 className="mb-1">Message Info</h5>
                <div className="gchat-info-modal-sub">
                  {singleSelectedMessage ? buildMessagePreviewLabel(singleSelectedMessage) : "Read receipts"}
                </div>
              </div>
              <button type="button" className="gchat-icon-btn" onClick={() => setShowMessageInfo(false)}>
                <MdClose size={18} />
              </button>
            </div>
            {messageInfoState.loading ? (
              <div className="gchat-info-loading">
                <div className="spinner-border text-light" role="status" />
                <div className="gchat-info-loading-text">Fetching read info...</div>
              </div>
            ) : (
              <div className="gchat-info-list">
                {membersToRender.map((memberId) => {
                  const meta = senderMap.get(String(memberId)) || {};
                  const didRead = messageInfoState.readBy.includes(String(memberId));
                  return (
                    <div key={memberId} className="gchat-info-row">
                      <img src={meta?.avatar || img} alt={meta?.name || "Member"} className="gchat-info-avatar" />
                      <div className="gchat-info-text">
                        <div className="gchat-info-name">{meta?.name || "Member"}</div>
                        <div className="gchat-info-status">{didRead ? "Read" : "Delivered"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatWindow;

GroupChatWindow.propTypes = {
  socket: PropTypes.shape({
    readyState: PropTypes.number,
    send: PropTypes.func,
    addEventListener: PropTypes.func,
    removeEventListener: PropTypes.func,
  }),
  db: PropTypes.shape({
    transaction: PropTypes.func,
  }),
  usersMain: PropTypes.array,
  setGroupsMain: PropTypes.func,
  groupMessagesByGroup: PropTypes.object,
  setGroupMessagesByGroup: PropTypes.func,
  mutedGroupIds: PropTypes.array,
  setMutedGroupIds: PropTypes.func,
  onActiveGroupChange: PropTypes.func,
};
