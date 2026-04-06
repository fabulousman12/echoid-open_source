// pages/Status.jsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useHistory } from "react-router-dom";
import StatusCard from "../components/FInalStatusCard";
import StatusViewer from "../components/StatusViewer";
import "./Status.css";
import {api} from "../services/api"
import Maindata from '../data';
import Swal from "sweetalert2";
import { FaPlus } from "react-icons/fa";
import { GrMultimedia } from "react-icons/gr";
import Lottie from "lottie-react";
import sticker from "../assets/empty ghost.json";

const STATUS_CAPTION_WORD_LIMIT = 250;

const countStatusCaptionWords = (value) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const normalizeStatusCaption = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= STATUS_CAPTION_WORD_LIMIT) return words.join(" ");
  return words.slice(0, STATUS_CAPTION_WORD_LIMIT).join(" ");
};

const globalUploadState =
  globalThis.__statusUploadState ||
  (globalThis.__statusUploadState = {
    inProgress: false,
    progress: 0,
    cancelRequested: false,
    xhr: null,
    onState: null,
    onProgress: null,
  });

const STATUS_FEED_CACHE_KEY = "status_feed_cache_v1";
const STATUS_MY_CACHE_KEY = "status_my_cache_v1";
const STATUS_READ_MAP_KEY = "status_read_map_v1";
const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getStatusExpiryMs = (status) => {
  const expiry = new Date(status?.expiresAt || status?.expiryAt || 0).getTime();
  if (Number.isFinite(expiry) && expiry > 0) return expiry;
  const created = new Date(status?.createdAt || status?.timestamp || 0).getTime();
  if (Number.isFinite(created) && created > 0) return created + STATUS_LIFETIME_MS;
  // If we cannot trust createdAt/expiry, expire immediately instead of extending TTL.
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

const toIdSet = (input) =>
  new Set(
    safeArray(input)
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  );

const filterByIdSet = (rows = [], allowedSet = null) => {
  if (!(allowedSet instanceof Set) || allowedSet.size === 0) return safeArray(rows);
  return safeArray(rows).filter((row) => allowedSet.has(String(row?.id || "").trim()));
};
const Status = ({ variant = "default" }) => {
  const host = `https://${Maindata.SERVER_URL}`;
  const currentUser = globalThis.storage?.readJSON?.("currentuser", null);
  const usersMain = globalThis.storage?.readJSON?.("usersMain", []) || [];
  const [myStatuses, setMyStatuses] = useState([]);
  const [myStatusesRaw, setMyStatusesRaw] = useState([]);
  const [feedStatuses, setFeedStatuses] = useState([]);
  const [feedStatusesRaw, setFeedStatusesRaw] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerUser, setViewerUser] = useState(null);
  const [viewerIsOwn, setViewerIsOwn] = useState(false);
  const [statusViewerScope, setStatusViewerScope] = useState("all_chat_users");
  const [statusViewerNumbers, setStatusViewerNumbers] = useState([]);
  const activeMediaFile = mediaFiles[activeMediaIndex] || null;

  const history = useHistory();
  const scrollRef = useRef(null);
  const autoFillAttemptRef = useRef(0);
  const lastFeedCountRef = useRef(0);
  const fileInputRef = useRef(null);
  const previewObjectUrlsRef = useRef([]);
  const previewTouchStartRef = useRef(null);
  const uploadCancelRef = useRef(false);
  const uploadStatusIdsRef = useRef([]);
  const uploadXhrRef = useRef(null);

  const usersById = useRef(new Map());
  const readMapRef = useRef({});

  const applyLocalReadToStatuses = useCallback((statuses = []) => {
    const map = pruneReadMap(readMapRef.current);
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
  }, []);

  const persistReadMap = useCallback((nextMapLike) => {
    const next = pruneReadMap(nextMapLike);
    readMapRef.current = next;
    globalThis.storage?.setItem?.(STATUS_READ_MAP_KEY, JSON.stringify(next));
    return next;
  }, []);

  const markStatusReadLocal = useCallback(
    (status) => {
      const id = String(status?.id || "");
      if (!id) return;
      const expiryMs = getStatusExpiryMs(status);
      const nextMap = {
        ...pruneReadMap(readMapRef.current),
        [id]: expiryMs,
      };
      persistReadMap(nextMap);
      const patchRead = (entry) =>
        String(entry?.id || "") === id ? { ...entry, localRead: true, localReadExpiry: expiryMs } : entry;
      setFeedStatusesRaw((prev) => safeArray(prev).map(patchRead));
      setMyStatusesRaw((prev) => safeArray(prev).map(patchRead));
    },
    [persistReadMap]
  );

  const persistStatusCaches = useCallback((myRaw, feedRaw) => {
    const nextMy = applyLocalReadToStatuses(myRaw);
    const nextFeed = applyLocalReadToStatuses(feedRaw);
    globalThis.storage?.setItem?.(
      STATUS_MY_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        statuses: nextMy,
      })
    );
    globalThis.storage?.setItem?.(
      STATUS_FEED_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        statuses: nextFeed,
      })
    );
  }, [applyLocalReadToStatuses]);

  useEffect(() => {
    usersById.current = new Map(
      (Array.isArray(usersMain) ? usersMain : [])
        .filter((u) => u && (u.id || u._id))
        .map((u) => [String(u.id || u._id), u])
    );
  }, [usersMain]);

  useEffect(() => {
    const handleState = (state) => {
      setUploading(Boolean(state?.inProgress));
    };
    const handleProgress = (state) => {
      setUploadProgress(state?.progress || 0);
    };
    globalUploadState.onState = handleState;
    globalUploadState.onProgress = handleProgress;
    setUploading(Boolean(globalUploadState.inProgress));
    setUploadProgress(globalUploadState.progress || 0);
    return () => {
      if (globalUploadState.onState === handleState) {
        globalUploadState.onState = null;
      }
      if (globalUploadState.onProgress === handleProgress) {
        globalUploadState.onProgress = null;
      }
    };
  }, []);

  useEffect(() => {
    const nextMy = applyLocalReadToStatuses(myStatusesRaw);
    const nextFeed = applyLocalReadToStatuses(feedStatusesRaw);
    setMyStatuses(nextMy);
    setFeedStatuses(groupFeedByUser(nextFeed));
    persistStatusCaches(nextMy, nextFeed);
  }, [myStatusesRaw, feedStatusesRaw, applyLocalReadToStatuses, persistStatusCaches]);

  const normalizePhoneNumber = (value) => {
    if (!value) return "";
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "";
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    return `+91${last10}`;
  };

  const getBlockedNumbers = () => {
    const blockedIds = globalThis.storage?.readJSON?.("blockedUsers", []) || [];
    const blockedSet = new Set(blockedIds.map(String));
    const numbers = (Array.isArray(usersMain) ? usersMain : [])
      .filter((u) => blockedSet.has(String(u.id || u._id)))
      .map((u) => normalizePhoneNumber(u.phoneNumber || u.phone || u.mobile || u.number || u.contactNumber))
      .filter(Boolean);
    return new Set(numbers);
  };

  const getAllChatNumbers = () => {
    const blockedNumbers = getBlockedNumbers();
    const list = (Array.isArray(usersMain) ? usersMain : [])
      .map((u) => normalizePhoneNumber(u.phoneNumber || u.phone || u.mobile || u.number || u.contactNumber))
      .filter((n) => n && !blockedNumbers.has(n));
    return Array.from(new Set(list));
  };

  useEffect(() => {
    if (!showMediaPreview) return;
    const savedScope =
      globalThis.storage?.readJSON?.("status_viewers_scope", "all_chat_users") || "all_chat_users";
    if (savedScope !== statusViewerScope) {
      setStatusViewerScope(savedScope);
    }
    const blockedNumbers = getBlockedNumbers();
    if (savedScope === "all_chat_users") {
      const numbers = getAllChatNumbers();
      const next = JSON.stringify(numbers);
      const prev = JSON.stringify(statusViewerNumbers);
      if (next !== prev) {
        setStatusViewerNumbers(numbers);
      }
      globalThis.storage?.setItem?.("status_viewers_numbers", next);
    } else {
      const saved = globalThis.storage?.readJSON?.("status_viewers_numbers", []) || [];
      const normalized = saved
        .map(normalizePhoneNumber)
        .filter((n) => n && !blockedNumbers.has(n));
      const next = JSON.stringify(normalized);
      const prev = JSON.stringify(statusViewerNumbers);
      if (next !== prev) {
        setStatusViewerNumbers(normalized);
      }
    }
  }, [showMediaPreview, usersMain, statusViewerScope, statusViewerNumbers]);

  const enrichStatusWithUser = (status, fallbackUser) => {
    const user = usersById.current.get(String(status.userId)) || fallbackUser || {};
    return {
      ...status,
      userId: status.userId,
      username: user?.name || user?.username || "Unknown",
      avatar: user?.avatar || user?.profilePhoto || "/img.jpg",
    };
  };

  const mergeUsersIntoMain = (incomingUsers = []) => {
    if (!incomingUsers.length) return;
    const existing = globalThis.storage?.readJSON?.("usersMain", []) || [];
    const mergedById = new Map(
      (Array.isArray(existing) ? existing : [])
        .filter((u) => u && (u.id || u._id))
        .map((u) => [String(u.id || u._id), u])
    );

    incomingUsers.forEach((u) => {
      if (!u || !u.id) return;
      const key = String(u.id);
      mergedById.set(key, { ...(mergedById.get(key) || {}), ...u });
    });

    const mergedUsers = Array.from(mergedById.values());
    globalThis.storage?.setItem?.("usersMain", JSON.stringify(mergedUsers));
    usersById.current = new Map(mergedUsers.map((u) => [String(u.id || u._id), u]));
  };

  const ensureUsersForStatuses = async (statuses = []) => {
    const ids = Array.from(
      new Set((statuses || []).map((s) => s?.userId).filter(Boolean).map(String))
    );
    const missingIds = ids.filter((id) => !usersById.current.has(id));
    if (!missingIds.length) return;

    const fetchedUsers = [];
    await Promise.all(
      missingIds.map(async (id) => {
        try {
          const response = await api.fetchUser(host, id);
          const data = await response.json();
          if (!(response.ok && data?.success && data?.userResponse)) return;

          const userResponse = data.userResponse;
          fetchedUsers.push({
            id: userResponse.id || id,
            name: userResponse.name,
            avatar: userResponse.profilePic || "/img.jpg",
            profilePhoto: userResponse.profilePic || "/img.jpg",
            phoneNumber: userResponse.phoneNumber || null,
            updatedAt: userResponse.updatedAt,
            gender: userResponse.gender,
            dob: userResponse.dob,
            location: userResponse.location,
            About: userResponse.About,
            publicKey: userResponse.publicKey,
          });
        } catch (err) {
          console.error("Failed to fetch missing status user", id, err);
        }
      })
    );

    mergeUsersIntoMain(fetchedUsers);
  };

  const groupFeedByUser = (statuses) => {
    const byUser = new Map();
    statuses.forEach((status) => {
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

  const sortByCreatedAtAsc = (items) =>
    [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const openViewer = (items, userMeta, isOwn = false) => {
    const ordered = sortByCreatedAtAsc(items || []);
    if (!ordered.length) return;
    setViewerItems(ordered);
    setViewerIndex(0);
    setViewerUser(userMeta || null);
    setViewerIsOwn(isOwn);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerItems([]);
    setViewerIndex(0);
    setViewerUser(null);
    setViewerIsOwn(false);
  };

  const syncStatusIdsAndPruneCache = useCallback(async () => {
    try {
      const res = await api.statusIds(host);
      if (!res?.ok) return false;
      const json = await res.json().catch(() => ({}));

      const globalIds = toIdSet(json?.statusIds || json?.ids || []);
      const myIds = toIdSet(json?.myStatusIds || json?.myIds || json?.ownIds || []);
      const feedIds = toIdSet(json?.feedStatusIds || json?.feedIds || []);

      setMyStatusesRaw((prev) => {
        const base = applyLocalReadToStatuses(prev);
        const allow = myIds.size > 0 ? myIds : globalIds;
        return filterByIdSet(base, allow);
      });

      setFeedStatusesRaw((prev) => {
        const base = applyLocalReadToStatuses(prev);
        const allow = feedIds.size > 0 ? feedIds : globalIds;
        return filterByIdSet(base, allow);
      });
      return true;
    } catch (err) {
      console.warn("Failed to sync status IDs cache", err);
      return false;
    }
  }, [applyLocalReadToStatuses, host]);

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    const cachedRead = globalThis.storage?.readJSON?.(STATUS_READ_MAP_KEY, {});
    persistReadMap(cachedRead);

    const cachedMyPayload = globalThis.storage?.readJSON?.(STATUS_MY_CACHE_KEY, null);
    const cachedFeedPayload = globalThis.storage?.readJSON?.(STATUS_FEED_CACHE_KEY, null);
    const cachedMy = applyLocalReadToStatuses(cachedMyPayload?.statuses || []);
    const cachedFeed = applyLocalReadToStatuses(cachedFeedPayload?.statuses || []);
    if (cachedMy.length || cachedFeed.length) {
      setMyStatusesRaw(cachedMy);
      setMyStatuses(cachedMy);
      setFeedStatusesRaw(cachedFeed);
      setFeedStatuses(groupFeedByUser(cachedFeed));
      persistStatusCaches(cachedMy, cachedFeed);
    } else {
      persistStatusCaches([], []);
    }

    fetchMyStatuses();
    fetchFeed();
    syncStatusIdsAndPruneCache();
  }, [applyLocalReadToStatuses, persistReadMap, persistStatusCaches, syncStatusIdsAndPruneCache]);

  // =========================
  // FETCH MY STATUS
  // =========================
  const fetchMyStatuses = async () => {
    try {
      setLoadingMy(true);
      const res = await api.myfeed(host);
      if (!res.ok) {
        throw new Error(`Failed to fetch my statuses: ${res.status}`);
      }
      const data = await res.json();
      const userFallback = {
        name: currentUser?.name || "You",
        profilePhoto: currentUser?.profilePhoto || currentUser?.avatar,
      };
      const enriched = (data.statuses || []).map((s) =>
        enrichStatusWithUser(s, userFallback)
      );
      const authoritative = pickRemoteAuthoritativeStatuses(myStatusesRaw, enriched);
      const nextMy = applyLocalReadToStatuses(authoritative);
      setMyStatusesRaw(nextMy);
      setMyStatuses(nextMy);
      persistStatusCaches(nextMy, feedStatusesRaw);
      
    } catch (err) {
      console.error("Failed to fetch my statuses", err);
    } finally {
      setLoadingMy(false);
    }
  };

  // =========================
  // FETCH FEED
  // =========================
  const fetchFeed = async (cursor = null) => {
    try {
      if (!cursor) setLoadingFeed(true);
      if (cursor) setLoadingMore(true);

      const res = await api.statusFeed(host, cursor);
      if (!res.ok) {
        throw new Error(`Failed to fetch feed: ${res.status}`);
      }
      const data = await res.json();
      await ensureUsersForStatuses(data.statuses || []);
      const enriched = (data.statuses || []).map((s) => enrichStatusWithUser(s));
      const authoritative = cursor
        ? enriched
        : pickRemoteAuthoritativeStatuses(feedStatusesRaw, enriched);
      const enrichedWithRead = applyLocalReadToStatuses(authoritative);

      if (cursor) {
        setFeedStatusesRaw((prev) => {
          const mergedRaw = mergeStatusesById(prev, enrichedWithRead);
          setFeedStatuses(groupFeedByUser(mergedRaw));
          persistStatusCaches(myStatusesRaw, mergedRaw);
          return mergedRaw;
        });
      } else {
        const mergedRaw = mergeStatusesById([], enrichedWithRead);
        setFeedStatusesRaw(mergedRaw);
        setFeedStatuses(groupFeedByUser(mergedRaw));
        persistStatusCaches(myStatusesRaw, mergedRaw);
      }

      setNextCursor(data.nextCursor || null);
      if (!cursor) {
        await syncStatusIdsAndPruneCache();
      }
    } catch (err) {
      console.error("Failed to fetch feed", err);
    } finally {
      if (!cursor) setLoadingFeed(false);
      setLoadingMore(false);
    }
  };

  // =========================
  // HORIZONTAL INFINITE SCROLL
  // =========================
  const handleHorizontalScroll = () => {
    const el = scrollRef.current;
    if (!el || loadingMore || !nextCursor) return;

    const threshold = 100;
    const reachedEnd =
      el.scrollWidth - el.scrollLeft - el.clientWidth < threshold;

    if (reachedEnd) {
      fetchFeed(nextCursor);
    }
  };

  // =========================
  // UPLOAD
  // =========================
  const base64ToBlob = (base64, mimeType) => {
    const byteString = atob(base64);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([byteArray], { type: mimeType });
  };

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const dataUrlToBlob = (dataUrl) => {
    const match = String(dataUrl).match(/^data:(.+);base64,(.*)$/);
    if (!match) return null;
    const mime = match[1];
    const buffer = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    return new Blob([buffer], { type: mime });
  };

  const buildStatusUploadDraft = async () => {
    const files = await Promise.all(
      (mediaFiles || []).map(async (file) => {
        let dataUrl = null;
        if (typeof file.preview === "string" && file.preview.startsWith("data:")) {
          dataUrl = file.preview;
        } else if (typeof file.previewUrl === "string" && file.previewUrl.startsWith("data:")) {
          dataUrl = file.previewUrl;
        } else if (typeof file.previewUrl === "string" && file.previewUrl.startsWith("blob:")) {
          try {
            const blob = await fetch(file.previewUrl).then((r) => r.blob());
            dataUrl = await blobToDataUrl(blob);
          } catch {}
        } else if (typeof file.preview === "string") {
          dataUrl = `data:${file.type || "application/octet-stream"};base64,${file.preview}`;
        }
        return {
          name: file.name,
          type: file.type,
          caption: file.caption || "",
          preview: dataUrl,
        };
      })
    );
    const payload = {
      files,
      activeIndex: activeMediaIndex,
    };
    globalThis.storage?.setItem?.("status_upload_draft", JSON.stringify(payload));
    globalThis.storage?.setItem?.("status_upload_return", JSON.stringify(true));
  };

  async function pickMediaAndSaveToShared() {
    return new Promise((resolve) => {
      const handler = (event) => {
        window.removeEventListener("MediaSelected", handler);

        const detail = event.detail || {};
        const names = detail.names || [];
        const types = detail.types || [];
        const previews = detail.previews || [];

        const files = names.map((name, i) => ({
          name,
          type: types[i],
          preview: previews[i],
        }));

        resolve(files);
      };

      window.addEventListener("MediaSelected", handler);

      if (window.NativeAds?.pickMediaNative) {
        window.NativeAds.pickMediaNative(0); // 0 = multiple
      } else {
        console.warn("Native picker not available.");
        resolve([]);
      }
    });
  }

  const handlePickMedia = async () => {
    const selectedFiles = await pickMediaAndSaveToShared();
    if (selectedFiles.length) {
      handleMediaSelect({ target: { files: selectedFiles } });
    } else {
      fileInputRef.current?.click();
    }
  };

  const getMediaBlob = async (file) => {
    if (file.fileObject instanceof Blob) return file.fileObject;
    if (typeof file.preview === "string" && file.preview.startsWith("data:")) {
      return dataUrlToBlob(file.preview);
    }
    if (typeof file.previewUrl === "string") {
      if (file.previewUrl.startsWith("data:")) {
        return dataUrlToBlob(file.previewUrl);
      }
      return fetch(file.previewUrl).then((r) => r.blob());
    }
    if (typeof file.preview === "string") {
      return dataUrlToBlob(
        `data:${file.type || "application/octet-stream"};base64,${file.preview}`
      );
    }
    return null;
  };

  const THUMB_MAX_WIDTH = 120;
  const THUMB_QUALITY = 0.22;
  const MB = 1024 * 1024;
  const STATUS_IMAGE_COMPRESS_THRESHOLD_BYTES = 11 * MB;
  const STATUS_VIDEO_COMPRESS_THRESHOLD_BYTES = 25 * MB;
  const STATUS_COMPRESS_RATIO = 0.4;
  const STATUS_IMAGE_UPLOAD_MAX_DIM = 1280;
  const STATUS_IMAGE_UPLOAD_MIN_QUALITY = 0.08;
  const STATUS_IMAGE_UPLOAD_START_QUALITY = 0.55;
  const STATUS_IMAGE_UPLOAD_MAX_PASSES = 12;

  const canvasToBlob = (canvas, type, quality) =>
    new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });

  const loadImageFromBlob = (blob) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });

  const normalizeCompressedImageFileName = (name) => {
    const safeName = String(name || `status_${Date.now()}`);
    if (/\.(jpe?g)$/i.test(safeName)) return safeName;
    return safeName.replace(/\.[^/.]+$/, "") + ".jpg";
  };

  const normalizeVideoFileNameForMime = (name, mimeType) => {
    const safeName = String(name || `status_${Date.now()}`);
    if (!mimeType) return safeName;
    const ext =
      mimeType.includes("webm") ? ".webm" :
      mimeType.includes("mp4") ? ".mp4" :
      "";
    if (!ext) return safeName;
    return safeName.replace(/\.[^/.]+$/, "") + ext;
  };

  const compressImageForStatusUpload = async (blob) => {
    if (!blob || !String(blob.type || "").startsWith("image/")) {
      return blob;
    }
    try {
      const img = await loadImageFromBlob(blob);
      const longest = Math.max(img.width || 1, img.height || 1);
      const initialScale =
        longest > STATUS_IMAGE_UPLOAD_MAX_DIM ? STATUS_IMAGE_UPLOAD_MAX_DIM / longest : 1;
      let width = Math.max(1, Math.round((img.width || 1) * initialScale));
      let height = Math.max(1, Math.round((img.height || 1) * initialScale));
      let quality = STATUS_IMAGE_UPLOAD_START_QUALITY;
      let best = null;
      const targetBytes = Math.max(1, Math.floor(blob.size * STATUS_COMPRESS_RATIO));

      for (let pass = 0; pass < STATUS_IMAGE_UPLOAD_MAX_PASSES; pass += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) break;
        ctx.drawImage(img, 0, 0, width, height);
        const candidate = await canvasToBlob(canvas, "image/jpeg", quality);
        if (!candidate) break;
        best = candidate;
        if (candidate.size <= targetBytes) break;

        if (quality > STATUS_IMAGE_UPLOAD_MIN_QUALITY + 0.04) {
          quality = Math.max(STATUS_IMAGE_UPLOAD_MIN_QUALITY, quality - 0.06);
        } else {
          width = Math.max(1, Math.round(width * 0.85));
          height = Math.max(1, Math.round(height * 0.85));
        }
      }

      return best || blob;
    } catch {
      return blob;
    }
  };

  const prepareUploadBlobForStatus = async (file) => {
    const sourceBlob = await getMediaBlob(file);
    if (!sourceBlob) return null;
    const type = file?.type || sourceBlob.type || "";
    if (type.startsWith("image/") && sourceBlob.size >= STATUS_IMAGE_COMPRESS_THRESHOLD_BYTES) {
      return compressImageForStatusUpload(sourceBlob);
    }
    if (type.startsWith("video/") && sourceBlob.size >= STATUS_VIDEO_COMPRESS_THRESHOLD_BYTES) {
      const compressedVideo = await compressVideoForStatusUpload(sourceBlob);
      return compressedVideo || sourceBlob;
    }
    return sourceBlob;
  };

  const pickVideoRecorderMimeType = () => {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    return candidates.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";
  };

  const compressVideoForStatusUpload = async (blob) => {
    if (!blob || !String(blob.type || "").startsWith("video/")) return blob;
    try {
      const video = document.createElement("video");
      const sourceUrl = URL.createObjectURL(blob);
      video.src = sourceUrl;
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Failed to load video metadata"));
      });

      const duration = Math.max(1, Number(video.duration) || 1);
      const mimeType = pickVideoRecorderMimeType();
      if (!mimeType) {
        URL.revokeObjectURL(sourceUrl);
        return blob;
      }

      const longest = Math.max(video.videoWidth || 1, video.videoHeight || 1);
      const maxDim = 960;
      const scale = longest > maxDim ? maxDim / longest : 1;
      const width = Math.max(1, Math.round((video.videoWidth || 1) * scale));
      const height = Math.max(1, Math.round((video.videoHeight || 1) * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(sourceUrl);
        return blob;
      }

      const stream = canvas.captureStream(24);
      const audioTracks = video.captureStream?.().getAudioTracks?.() || [];
      audioTracks.forEach((track) => stream.addTrack(track));

      const targetVideoBytes = Math.max(1, Math.floor(blob.size * STATUS_COMPRESS_RATIO));
      const targetVideoBitsPerSecond = Math.max(
        350_000,
        Math.floor((targetVideoBytes * 8) / duration)
      );

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: targetVideoBitsPerSecond,
      });
      const chunks = [];

      const result = await new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };
        recorder.onerror = () => reject(new Error("Video compression failed"));
        recorder.onstop = () => {
          const output = new Blob(chunks, { type: mimeType });
          resolve(output.size > 0 ? output : blob);
        };

        const drawFrame = () => {
          if (video.paused || video.ended) return;
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(drawFrame);
        };

        video.onended = () => {
          try { recorder.stop(); } catch {}
        };

        try {
          recorder.start(250);
          video.currentTime = 0;
          video.play().then(() => drawFrame()).catch(reject);
        } catch (err) {
          reject(err);
        }
      });

      URL.revokeObjectURL(sourceUrl);
      return result;
    } catch {
      return blob;
    }
  };

  const buildImageThumbnail = (blob, maxWidth = THUMB_MAX_WIDTH, quality = THUMB_QUALITY) =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve("");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve("");
      };
      img.src = url;
    });

  const buildVideoThumbnail = (blob, maxWidth = THUMB_MAX_WIDTH, quality = THUMB_QUALITY) =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(blob);
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      const cleanup = () => {
        URL.revokeObjectURL(url);
      };
      video.onloadedmetadata = () => {
        const seekTo = Math.min(0.5, Math.max(0, (video.duration || 1) * 0.1));
        try {
          video.currentTime = seekTo;
        } catch {
          cleanup();
          resolve("");
        }
      };
      video.onseeked = () => {
        const scale = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1;
        const width = Math.max(1, Math.round(video.videoWidth * scale));
        const height = Math.max(1, Math.round(video.videoHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          resolve("");
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        cleanup();
        resolve(dataUrl);
      };
      video.onerror = () => {
        cleanup();
        resolve("");
      };
    });

  const buildThumbnailForFile = async (file, providedBlob = null) => {
    try {
      const blob = providedBlob || (await getMediaBlob(file));
      if (!blob) return "";
      const type = file?.type || blob.type || "";
      if (type.startsWith("image/")) {
        return await buildImageThumbnail(blob);
      }
      if (type.startsWith("video/")) {
        return await buildVideoThumbnail(blob);
      }
      return "";
    } catch {
      return "";
    }
  };

  const uploadWithProgress = (url, blob, contentType, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      uploadXhrRef.current = xhr;
      globalUploadState.xhr = xhr;
      xhr.open("PUT", url, true);
      xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.(event.loaded, event.total);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
      xhr.send(blob);
    });

  const processStatusFilesSequentially = async (files) => {
    globalUploadState.inProgress = true;
    globalUploadState.progress = 0;
    globalUploadState.cancelRequested = false;
    globalUploadState.onState?.(globalUploadState);
    globalUploadState.onProgress?.(globalUploadState);
    setUploading(true);
    setUploadProgress(0);
    uploadCancelRef.current = false;
    uploadStatusIdsRef.current = [];
    uploadXhrRef.current = null;
    try {
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      const blockedNumbers = getBlockedNumbers();
      const viewerNumbers =
        statusViewerScope === "all_chat_users"
          ? getAllChatNumbers()
          : (statusViewerNumbers || []).filter((n) => !blockedNumbers.has(n));

      const preparedFiles = await Promise.all(
        files.map(async (file) => {
          const uploadBlob = await prepareUploadBlobForStatus(file);
          const previewData = await buildThumbnailForFile(file, uploadBlob);
          const mimeType = uploadBlob?.type || file?.type || file?.fileObject?.type || "application/octet-stream";
          const fileName = mimeType.startsWith("image/")
            ? normalizeCompressedImageFileName(file?.name)
            : mimeType.startsWith("video/")
              ? normalizeVideoFileNameForMime(file?.name, mimeType)
              : (file?.name || `status_${Date.now()}`);
          return {
            file,
            uploadBlob,
            item: {
              fileName,
              mimeType,
              caption: file?.caption || "",
              previewData,
            },
          };
        })
      );
      const items = preparedFiles.map((entry) => entry.item);
      console.log("[status] init items", items.map((item) => ({
        fileName: item.fileName,
        mimeType: item.mimeType,
        hasPreview: Boolean(item.previewData),
      })));

      const initRes = await api.uploadstatusInit(host, {
        items,
        expiresAt,
        visibilityNumbers: viewerNumbers,
      });

      if (!initRes.ok) {
        throw new Error(`Init failed: ${initRes.status}`);
      }

      const initData = await initRes.json();
      const uploads = Array.isArray(initData?.uploads) ? initData.uploads : [];
      console.log("[status] init response", uploads.map((upload) => ({
        statusId: upload.statusId,
        contentType: upload.contentType,
      })));
      uploadStatusIdsRef.current = uploads.map((u) => u.statusId).filter(Boolean);

      const blobs = preparedFiles.map((entry) => ({
        file: entry.file,
        blob: entry.uploadBlob,
      }));
      const totalBytes = blobs.reduce((sum, entry) => sum + (entry.blob?.size || 0), 0) || 1;
      let uploadedBytes = 0;
      let successCount = 0;
      let failureCount = 0;
      const committedStatusIds = [];
      const failedStatusIds = [];

      for (let i = 0; i < uploads.length; i += 1) {
        if (uploadCancelRef.current) {
          break;
        }
        const upload = uploads[i];
        const file = files[i];
        const mediaBlob = blobs[i]?.blob;
        try {
          if (!mediaBlob) {
            throw new Error("Missing upload data for status media");
          }
          await uploadWithProgress(
            upload.uploadUrl,
            mediaBlob,
            upload.contentType,
            (loaded, total) => {
              const percent = Math.round(((uploadedBytes + loaded) / totalBytes) * 100);
              const next = Math.min(100, Math.max(0, percent));
              setUploadProgress(next);
              globalUploadState.progress = next;
              globalUploadState.onProgress?.(globalUploadState);
            }
          );
          successCount += 1;
          uploadedBytes += mediaBlob.size || 0;
          {
            const next = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
            setUploadProgress(next);
            globalUploadState.progress = next;
            globalUploadState.onProgress?.(globalUploadState);
          }
          committedStatusIds.push(upload.statusId);
        } catch (err) {
          if (err?.name === "AbortError") {
            console.warn("[status] upload aborted", upload?.statusId);
            uploadCancelRef.current = true;
            globalUploadState.cancelRequested = true;
            break;
          }
          console.error("Upload failed", err);
          failureCount += 1;
          if (upload?.statusId) {
            failedStatusIds.push(upload.statusId);
          }
        }
      }

      if (!uploadCancelRef.current && committedStatusIds.length) {
        const commitRes = await api.uploadstatusCommit(host, {
          statusIds: committedStatusIds,
        });
        if (!commitRes.ok) {
          throw new Error(`Commit failed: ${commitRes.status}`);
        }
        Swal.fire({
          toast: true,
          position: "top",
          timer: 2200,
          timerProgressBar: true,
          showConfirmButton: false,
          icon: "success",
          title: `Uploaded ${successCount} status${successCount > 1 ? "es" : ""}`,
        });
      }

      if (uploadCancelRef.current) {
        Swal.fire({
          icon: "info",
          title: "Upload canceled",
          text: "Status upload was canceled.",
        });
      } else if (!committedStatusIds.length) {
        Swal.fire({
          icon: "error",
          title: "Upload failed",
          text: "Could not upload status. Please try again.",
        });
      } else if (failureCount > 0) {
        Swal.fire({
          icon: "error",
          title: "Some uploads failed",
          text: `${failureCount} status${failureCount > 1 ? "es" : ""} could not upload.`,
        });
      }

      if (failedStatusIds.length) {
        const abortRes = await api.uploadstatusAbort(host, {
          statusIds: failedStatusIds,
        });
        if (!abortRes.ok) {
          console.warn("Failed to abort uploads", abortRes.status);
        }
      }
    } catch (err) {
      console.error("Upload failed", err);
      Swal.fire({
        icon: "error",
        title: "Upload failed",
        text: "Could not upload status. Please try again.",
      });
    } finally {
      uploadXhrRef.current = null;
      globalUploadState.xhr = null;
      if (uploadCancelRef.current && uploadStatusIdsRef.current.length) {
        const abortRes = await api.uploadstatusAbort(host, {
          statusIds: uploadStatusIdsRef.current,
        });
        if (!abortRes.ok) {
          console.warn("Failed to abort uploads", abortRes.status);
        }
      }
      globalUploadState.inProgress = false;
      globalUploadState.progress = 0;
      globalUploadState.onState?.(globalUploadState);
      globalUploadState.onProgress?.(globalUploadState);
      setUploading(false);
      setUploadProgress(0);
      globalThis.storage?.setItem?.("status_upload_draft", JSON.stringify(null));
      globalThis.storage?.setItem?.("status_upload_return", JSON.stringify(false));
      fetchMyStatuses();
      fetchFeed();
    }
  };

  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    previewObjectUrlsRef.current.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch {}
    });
    previewObjectUrlsRef.current = [];

    const cleanedFiles = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.preview,
      fileObject: file instanceof Blob ? file : null,
      caption: "",
      previewUrl: (() => {
        const raw = file.preview;
        if (typeof raw === "string" && raw.startsWith("data:")) return raw;
        if (file instanceof Blob) {
          const url = URL.createObjectURL(file);
          previewObjectUrlsRef.current.push(url);
          return url;
        }
        return raw || "";
      })(),
    }));

    setMediaFiles(cleanedFiles);
    setActiveMediaIndex(0);
    setShowMediaPreview(true);
  };

  useEffect(() => {
    return () => {
      previewObjectUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      previewObjectUrlsRef.current = [];
    };
  }, []);

  const goToPrevMedia = () => {
    if (mediaFiles.length <= 1) return;
    setActiveMediaIndex((prev) => (prev - 1 + mediaFiles.length) % mediaFiles.length);
  };

  const goToNextMedia = () => {
    if (mediaFiles.length <= 1) return;
    setActiveMediaIndex((prev) => (prev + 1) % mediaFiles.length);
  };

  const handlePreviewTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    previewTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handlePreviewTouchEnd = (e) => {
    const start = previewTouchStartRef.current;
    if (!start) return;
    const touch = e.changedTouches?.[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    previewTouchStartRef.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      goToNextMedia();
    } else {
      goToPrevMedia();
    }
  };

  useEffect(() => {
    const shouldRestore = globalThis.storage?.readJSON?.("status_upload_return", false);
    if (!shouldRestore) return;
    const draft = globalThis.storage?.readJSON?.("status_upload_draft", null);
    if (!draft || !Array.isArray(draft.files)) return;
    const restored = draft.files.map((file) => ({
      name: file.name,
      type: file.type,
      preview: file.preview,
      previewUrl: file.preview,
      fileObject: null,
      caption: file.caption || "",
    }));
    if (restored.length) {
      setMediaFiles(restored);
      setActiveMediaIndex(Math.min(draft.activeIndex || 0, restored.length - 1));
      setShowMediaPreview(true);
    }
    globalThis.storage?.setItem?.("status_upload_return", JSON.stringify(false));
  }, []);

  // Auto-fetch if the horizontal list doesn't fill the viewport
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || !nextCursor) return;

    const notFilled = el.scrollWidth <= el.clientWidth + 10;
    if (!notFilled) return;

    const currentCount = feedStatusesRaw.length;
    if (lastFeedCountRef.current === currentCount) {
      autoFillAttemptRef.current += 1;
    } else {
      autoFillAttemptRef.current = 0;
      lastFeedCountRef.current = currentCount;
    }

    if (autoFillAttemptRef.current >= 2) return;
    fetchFeed(nextCursor);
  }, [feedStatuses, feedStatusesRaw.length, loadingMore, nextCursor]);

  // =========================
  // MAP TO CARD
  // =========================
  const mapToCard = (status, isOwn = false) => ({
    id: status.id,
    centerImageSrc: status.avatar || status.mediaUrl,
    backgroundImageSrc: status.preview || status.mediaUrl,
    status: status.caption,
    title: isOwn ? (currentUser?.name || "You") : status.username,
    statusColor: isOwn ? "green" : (status.localRead ? "gray" : "blue"),
    width: 140,
    height: 200,
  });

  const { unreadFeedStatuses, readFeedStatuses } = useMemo(() => {
    const grouped = new Map();
    safeArray(feedStatusesRaw).forEach((item) => {
      if (!item?.userId) return;
      const key = String(item.userId);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    const unread = [];
    const read = [];
    grouped.forEach((items, userId) => {
      const sorted = [...items].sort(
        (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
      );
      const latest = sorted[0];
      if (!latest) return;
      const allRead = sorted.every((entry) => Boolean(entry?.localRead));
      const summary = {
        ...latest,
        userId,
        allRead,
      };
      if (allRead) read.push(summary);
      else unread.push(summary);
    });

    unread.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
    read.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
    return { unreadFeedStatuses: unread, readFeedStatuses: read };
  }, [feedStatusesRaw]);

  const handleDeleteStatus = async (statusId) => {
    if (!statusId) return;
    try {
      const res = await api.deleteStatus(host, statusId);
      if (!res.ok) {
        console.warn("Failed to delete status", res.status);
        return false;
      }
      setMyStatusesRaw((prev) => (prev || []).filter((s) => s.id !== statusId));
      setMyStatuses((prev) => (prev || []).filter((s) => s.id !== statusId));
      setFeedStatusesRaw((prev) => (prev || []).filter((s) => s.id !== statusId));
      setFeedStatuses((prev) => groupFeedByUser((prev || []).filter((s) => s.id !== statusId)));
      setViewerItems((prev) => (prev || []).filter((s) => s.id !== statusId));
      const nextReadMap = { ...pruneReadMap(readMapRef.current) };
      delete nextReadMap[String(statusId)];
      persistReadMap(nextReadMap);
      return true;
    } catch (err) {
      console.warn("Failed to delete status", err);
      return false;
    }
  };

  const handleViewStatus = async (status) => {
    if (!status?.id) return;
    const statusUserId = status.userId;
    const currentUserId = currentUser?._id || currentUser?.id;
    if (statusUserId && currentUserId && String(statusUserId) === String(currentUserId)) return;
    markStatusReadLocal(status);
    try {
      const res = await api.statusView(host, status.id);
      if (!res.ok) {
        console.warn("Failed to update status view", res.status);
      }
    } catch (err) {
      console.warn("Failed to update status view", err);
    }
  };

  const handleViewerUserDone = useCallback(
    (currentStatus) => {
      if (viewerIsOwn) return false;
      const currentUserId = String(currentStatus?.userId || viewerUser?.userId || viewerUser?.id || "");
      const grouped = new Map();
      safeArray(feedStatusesRaw).forEach((entry) => {
        if (!entry?.userId) return;
        const userId = String(entry.userId);
        if (!grouped.has(userId)) grouped.set(userId, []);
        grouped.get(userId).push(entry);
      });

      const candidates = [];
      grouped.forEach((items, userId) => {
        if (!items?.length) return;
        if (userId === currentUserId) return;
        const allRead = items.every((entry) => Boolean(entry?.localRead));
        if (allRead) return;
        const latest = [...items].sort(
          (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
        )[0];
        if (!latest) return;
        candidates.push({ userId, latest });
      });

      if (!candidates.length) return false;
      candidates.sort(
        (a, b) =>
          new Date(b?.latest?.createdAt || 0).getTime() - new Date(a?.latest?.createdAt || 0).getTime()
      );
      const target = candidates[0];
      const targetItems = safeArray(feedStatusesRaw).filter(
        (entry) => String(entry?.userId || "") === String(target.userId)
      );
      if (!targetItems.length) return false;

      openViewer(
        targetItems,
        {
          userId: target.userId,
          username: target.latest?.username || "Unknown",
          avatar: target.latest?.avatar || "/img.jpg",
        },
        false
      );
      return true;
    },
    [feedStatusesRaw, openViewer, viewerIsOwn, viewerUser]
  );

  const compactFeedStatuses = useMemo(
    () => [...unreadFeedStatuses, ...readFeedStatuses],
    [unreadFeedStatuses, readFeedStatuses]
  );

  const sharedStatusUi = (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleMediaSelect}
        accept="image/*,video/*"
        style={{ display: "none" }}
        multiple
      />

      {showMediaPreview && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black flex flex-col items-center justify-center"
          style={{ zIndex: 100000 }}
        >
          <button
            onClick={() => {
              if (uploading) return;
              setShowMediaPreview(false);
              setMediaFiles([]);
              setActiveMediaIndex(0);
            }}
            disabled={uploading}
            className="absolute top-4 left-4 z-50 w-10 h-10 flex items-center justify-center bg-black bg-opacity-60 hover:bg-opacity-90 text-white rounded-full text-lg"
          >
            X
          </button>

          {mediaFiles.length > 0 && (
            <button
              onClick={() => {
                if (uploading) return;
                const updatedFiles = mediaFiles.filter((_, i) => i !== activeMediaIndex);
                setMediaFiles(updatedFiles);
                if (activeMediaIndex >= updatedFiles.length) {
                  setActiveMediaIndex(Math.max(0, updatedFiles.length - 1));
                }
                if (updatedFiles.length === 0) {
                  setShowMediaPreview(false);
                }
              }}
              disabled={uploading}
              className="absolute top-4 left-16 z-50 w-10 h-10 flex items-center justify-center bg-black bg-opacity-60 hover:bg-opacity-90 text-white rounded-full text-lg"
            >
              Del
            </button>
          )}

          <div
            className="flex-1 flex items-center justify-center w-full"
            onTouchStart={handlePreviewTouchStart}
            onTouchEnd={handlePreviewTouchEnd}
          >
            {activeMediaFile ? (
              activeMediaFile.type?.startsWith("image/") ? (
                <img
                  src={activeMediaFile.previewUrl || activeMediaFile.preview}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <video
                  src={activeMediaFile.previewUrl || activeMediaFile.preview}
                  controls
                  className="max-h-full max-w-full object-contain"
                />
              )
            ) : null}
          </div>

          <div
            style={{
              position: "absolute",
              left: "12px",
              right: "12px",
              bottom: "86px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              zIndex: 60,
            }}
          >
            <input
              type="text"
              value={activeMediaFile?.caption || ""}
              onChange={(e) => {
                const value = e.target.value;
                const nextValue =
                  countStatusCaptionWords(value) <= STATUS_CAPTION_WORD_LIMIT
                    ? value
                    : normalizeStatusCaption(value);
                setMediaFiles((prev) =>
                  prev.map((file, idx) =>
                    idx === activeMediaIndex ? { ...file, caption: nextValue } : file
                  )
                );
              }}
              placeholder="Add caption"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "999px",
                background: "rgba(0,0,0,0.6)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            />
            <button
              type="button"
              className="status-viewers-chip"
              onClick={async () => {
                if (statusViewerScope === "selected_contacts") {
                  await buildStatusUploadDraft();
                  history.push("/status-viewers", { fromStatusUpload: true });
                  return;
                }
                const numbers = getAllChatNumbers();
                setStatusViewerNumbers(numbers);
                globalThis.storage?.setItem?.("status_viewers_numbers", JSON.stringify(numbers));
                history.push("/Profile", { activeSection: null });
              }}
            >
              {statusViewerScope === "all_chat_users"
                ? `All Chat (${statusViewerNumbers.length})`
                : `${statusViewerNumbers.length} viewers`}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!mediaFiles.length || uploading) return;
                const filesToUpload = [...mediaFiles];
                processStatusFilesSequentially(filesToUpload);
                setShowMediaPreview(false);
                setMediaFiles([]);
                setActiveMediaIndex(0);
              }}
              disabled={uploading}
              className="status-send-button"
              aria-busy={uploading}
            >
              {uploading ? (
                <>
                  <span className="status-button-spinner" />
                  Uploading
                </>
              ) : (
                "Send"
              )}
            </button>
          </div>

          <div className="w-full py-2 z-50 px-3 bg-black overflow-x-auto flex gap-2 border-t border-gray-700">
            {mediaFiles.map((file, index) => (
              <div
                key={index}
                onClick={() => setActiveMediaIndex(index)}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 relative ${
                  index === activeMediaIndex ? "border-white" : "border-gray-600"
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (uploading) return;
                    const updatedFiles = mediaFiles.filter((_, i) => i !== index);
                    setMediaFiles(updatedFiles);
                    if (index === activeMediaIndex) setActiveMediaIndex(0);
                    if (updatedFiles.length === 0) setShowMediaPreview(false);
                  }}
                  disabled={uploading}
                  className="absolute top-1 right-1 z-10 bg-black bg-opacity-60 hover:bg-opacity-90 text-white w-5 h-5 text-xs flex items-center justify-center rounded-full"
                >
                  x
                </button>

                {file.type.startsWith("image/") ? (
                  <img
                    src={file.previewUrl || file.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={file.previewUrl || file.preview}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
          {uploading && (
            <div className="status-upload-pill">
              <span className="status-upload-spinner" />
              <span>{`Uploading ${uploadProgress}%`}</span>
                <button
                  type="button"
                  className="status-upload-cancel"
                  onClick={() => {
                    uploadCancelRef.current = true;
                    globalUploadState.cancelRequested = true;
                    globalUploadState.xhr?.abort();
                  }}
                >
                  Cancel
                </button>
            </div>
          )}
        </div>
      )}

      {uploading && !showMediaPreview && (
        <div className="status-upload-pill status-upload-pill--global">
          <span className="status-upload-spinner" />
          <span>{`Uploading ${uploadProgress}%`}</span>
          <button
            type="button"
            className="status-upload-cancel"
            onClick={() => {
              uploadCancelRef.current = true;
              globalUploadState.cancelRequested = true;
              globalUploadState.xhr?.abort();
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <StatusViewer
        open={viewerOpen}
        items={viewerItems}
        user={viewerUser}
        index={viewerIndex}
        setIndex={setViewerIndex}
        onClose={closeViewer}
        onViewStatus={handleViewStatus}
        onUserStatusesDone={handleViewerUserDone}
        isOwn={viewerIsOwn}
        onDeleteStatus={handleDeleteStatus}
        usersMain={usersMain}
      />
    </>
  );

  if (variant === "home") {
    const myStatusSummary = myStatuses[0] || null;

    return (
      <>
        <div className="home-status-strip">
          <div className="home-status-row" ref={scrollRef} onScroll={handleHorizontalScroll}>
            <button
              type="button"
              className={`home-status-tile home-status-tile--mine ${myStatusSummary ? "has-story" : ""}`}
              onClick={() => {
                if (uploading) {
                  uploadCancelRef.current = true;
                  globalUploadState.cancelRequested = true;
                  globalUploadState.xhr?.abort();
                  return;
                }
                if (myStatusSummary) {
                  const items = myStatusesRaw.filter((s) => s.userId === myStatusSummary.userId);
                  openViewer(
                    items,
                    {
                      userId: myStatusSummary.userId,
                      username: currentUser?.name || "You",
                      avatar: currentUser?.profilePhoto || currentUser?.avatar || "/img.jpg",
                    },
                    true
                  );
                  return;
                }
                handlePickMedia();
              }}
            >
              <span className="home-status-avatar-wrap">
                <img
                  src={currentUser?.profilePhoto || currentUser?.avatar || "/img.jpg"}
                  alt="Your story"
                  className="home-status-avatar"
                />
                {!myStatusSummary && <span className="home-status-add">+</span>}
              </span>
              <span className="home-status-name">Your Story</span>
            </button>

            {myStatusSummary && (
              <button
                type="button"
                className="home-status-tile home-status-tile--adder"
                onClick={() => {
                  if (uploading) {
                    uploadCancelRef.current = true;
                    globalUploadState.cancelRequested = true;
                    globalUploadState.xhr?.abort();
                    return;
                  }
                  handlePickMedia();
                }}
              >
                <span className="home-status-avatar-wrap">
                  <span className="home-status-add home-status-add--standalone">+</span>
                </span>
                <span className="home-status-name">Add Story</span>
              </button>
            )}

            {compactFeedStatuses.map((status) => {
              const isRead = Boolean(status?.allRead || status?.localRead);
              const userMeta = {
                userId: status.userId,
                username: status.username,
                avatar: status.avatar,
              };

              return (
                <button
                  type="button"
                  key={status.id}
                  className={`home-status-tile ${isRead ? "is-read" : "is-unread"}`}
                  onClick={() => {
                    const items = feedStatusesRaw.filter((s) => String(s.userId) === String(status.userId));
                    openViewer(items, userMeta, false);
                  }}
                >
                  <span className="home-status-avatar-wrap">
                    <img
                      src={status.avatar || status.mediaUrl || "/img.jpg"}
                      alt={status.username || "Status"}
                      className="home-status-avatar"
                    />
                  </span>
                  <span className="home-status-name">{status.username || "Unknown"}</span>
                </button>
              );
            })}

            {(loadingFeed || loadingMore) && (
              <div className="home-status-loading">
                <span className="status-inline-spinner" />
              </div>
            )}
          </div>
        </div>
        {sharedStatusUi}
      </>
    );
  }

  return (
      <div className="status-page">
     

        {/* 🔹 MY STATUS */}
        <div className="my-status-section">
          <div className="status-section-header">
            <h3 className="status-section-title">My Status</h3>
          </div>
          <div className="my-status-list">
            {loadingMy && (
              <div className="status-inline-loader">
                <span className="status-inline-spinner" />
                <span>Loading your status...</span>
              </div>
            )}
            {myStatuses.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (uploading) {
                    uploadCancelRef.current = true;
                    globalUploadState.cancelRequested = true;
                    globalUploadState.xhr?.abort();
                    return;
                  }
                  handlePickMedia();
                }}
                className="my-status-circle-button my-status-card"
                aria-busy={uploading}
              >
                <span className="my-status-circle">
                  <img
                    src={currentUser?.profilePhoto || currentUser?.avatar || "/img.jpg"}
                    alt="You"
                    className="my-status-avatar"
                  />
                  {uploading && <span className="my-status-loader" />}
                  <span className="my-status-plus">
                    <FaPlus />
                  </span>
                </span>
                <span className="my-status-copy">
                  <span className="my-status-text">
                    {uploading ? "Cancel upload" : "Add status"}
                  </span>
                  <span className="my-status-expiry">
                    {uploading ? `Uploading ${uploadProgress}%` : "Status gets removed after 24 hours"}
                  </span>
                </span>
              </button>
            ) : (() => {
              const status = myStatuses[0];
              const userMeta = {
                userId: status.userId,
                username: currentUser?.name || "You",
                avatar: currentUser?.profilePhoto || currentUser?.avatar || "/img.jpg",
              };
              return (
                <div className="my-status-item" key={status.id}>
                  <button
                    type="button"
                    className="my-status-circle-button my-status-card"
                    onClick={() => {
                      if (uploading) {
                        uploadCancelRef.current = true;
                        globalUploadState.cancelRequested = true;
                        globalUploadState.xhr?.abort();
                        return;
                      }
                      const items = myStatusesRaw.filter((s) => s.userId === status.userId);
                      openViewer(items, userMeta, true);
                    }}
                    aria-busy={uploading}
                  >
                    <span className="my-status-circle live">
                      <img
                        src={currentUser?.profilePhoto || currentUser?.avatar || "/img.jpg"}
                        alt="You"
                        className="my-status-avatar"
                      />
                      {uploading && <span className="my-status-loader" />}
                    </span>
                    <span className="my-status-copy">
                      <span className="my-status-text">
                        {uploading ? "Cancel upload" : (status.caption || "My status")}
                      </span>
                      <span className="my-status-expiry">
                        {uploading ? `Uploading ${uploadProgress}%` : "Status gets removed after 24 hours"}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 🔹 FEED */}
          <div className="status-section-header">
            <h3 className="status-section-title">Updates</h3>
          </div>
          {loadingFeed && (
            <div className="status-inline-loader status-inline-loader--feed">
              <span className="status-inline-spinner" />
              <span>Loading updates...</span>
            </div>
          )}
          {!loadingFeed && unreadFeedStatuses.length === 0 && readFeedStatuses.length === 0 && (
            <div className="status-empty-state">
              No updates available
                 <Lottie
                animationData={sticker}
                loop={true}
                style={{ width: 220, height: 220 }}
              />
            </div>
          )}
          {unreadFeedStatuses.length > 0 && (
            <>
              <div className="status-subsection-header">
                <h4 className="status-subsection-title">Recent updates</h4>
              </div>
              <div
                ref={scrollRef}
                onScroll={handleHorizontalScroll}
                className="slider"
                style={{
                  "--width": "150px",
                  "--height": "200px",
                  "--quantity": unreadFeedStatuses.length,
                }}
              >
                <div className="list">
                  {unreadFeedStatuses.map((status, index) => {
                    const card = mapToCard(status, false);
                    const userMeta = {
                      userId: status.userId,
                      username: status.username,
                      avatar: status.avatar,
                    };
                    return (
                      <div className="item" key={card.id} style={{ "--position": index + 1 }}>
                        <div className="status-card-stack">
                          <StatusCard
                            {...card}
                            onClick={() => {
                              const items = feedStatusesRaw.filter((s) => String(s.userId) === String(status.userId));
                              openViewer(items, userMeta, false);
                            }}
                          />
                          <div className="status-card-caption">{status.caption || ""}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {readFeedStatuses.length > 0 && (
            <>
              <div className="status-subsection-header">
                <h4 className="status-subsection-title status-subsection-title--read">Viewed updates</h4>
              </div>
              <div
                className="slider slider--read"
                style={{
                  "--width": "150px",
                  "--height": "200px",
                  "--quantity": readFeedStatuses.length,
                }}
              >
                <div className="list">
                  {readFeedStatuses.map((status, index) => {
                    const card = mapToCard(status, false);
                    const userMeta = {
                      userId: status.userId,
                      username: status.username,
                      avatar: status.avatar,
                    };
                    return (
                      <div className="item" key={card.id} style={{ "--position": index + 1 }}>
                        <div className="status-card-stack status-card-stack--read">
                          <StatusCard
                            {...card}
                            onClick={() => {
                              const items = feedStatusesRaw.filter((s) => String(s.userId) === String(status.userId));
                              openViewer(items, userMeta, false);
                            }}
                          />
                          <div className="status-card-caption">{status.caption || ""}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        {/* Floating Button + Sub Menu */}
        <div style={{ position: "fixed", bottom: "230px", right: "50px", zIndex: 1000 }}>
          {showStatusOptions && (
            <div
              style={{
                marginBottom: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                alignItems: "flex-end",
              }}
              className="status-options-pop"
            >
              <button
                onClick={() => {
                  setShowStatusOptions(false);
                  handlePickMedia();
                }}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#1f2228",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Add media status"
              >
                <GrMultimedia size={18} />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowStatusOptions(prev => !prev)}
            disabled={uploading}
            className="status-fab"
            aria-busy={uploading}
          >
            {uploading ? <span className="status-fab-spinner" /> : <FaPlus size={16} />}
          </button>
        </div>

        {sharedStatusUi}

      </div>
  );
};

export default Status;
