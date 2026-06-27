import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { useHistory } from "react-router";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Bell,
  Ban,
  ChevronRight,
  CircleUserRound,
  Filter,
  Flag,
  Home,
  Image as ImageIcon,
  Maximize2,
  Menu,
  Minus,
  MessageCircle,
  MessageSquarePlus,
  Pause,
  Plus,
  Play,
  Search,
  Settings,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Virtuoso } from "react-virtuoso";
import "./EchoIdPage.css";
import StarLoader from "../pages/StarLoader";
import EchoIdPostDetail from "./EchoIdPostDetail";
import EchoIdMediaViewer from "./EchoIdMediaViewer";
import { api } from "../services/api";
import { MessageContext } from "../Contexts/MessagesContext";
import {
  clearAnonymousProfile,
  readAnonymousProfile,
  saveAnonymousProfile,
} from "../services/anonymousProfileStorage";
import { readAnonymousPosterSecret, saveAnonymousPosterSecretFromVault } from "../services/anonymousPosterVault";

const postSeed = [
  {
    _id: "p1",
    name: "visual_noise",
    username: "visual.noise",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    category: "confessions",
    subCategory: "confession formal",
    title: "I kept quiet when the block lights failed",
    body:
      "Observed a low-glow pulse across the downtown grid. Tracking the light trail before it folds back into the skyline.",
    coverImage:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    likes: 19,
    comments: 8,
    reports: 0,
    witness: 0,
  },
  {
    _id: "p2",
    name: "cipher_coda",
    username: "cipher.coda",
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    category: "politics",
    subCategory: "",
    title: "Ward promises keep changing after every meeting",
    body:
      "The city hum changes after midnight. If you listen long enough, every alley starts sounding like encrypted weather.",
    coverImage: "",
    likes: 13,
    comments: 11,
    reports: 0,
    witness: 7,
  },
  {
    _id: "p3",
    name: "pulse_archive",
    username: "pulse.archive",
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    category: "civic sense",
    subCategory: "",
    title: "Streetlight outage outside sector nine crossing",
    body:
      "A burned halo opened above sector nine and stayed there for exactly ninety seconds. Nobody nearby agreed on the color.",
    coverImage:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    likes: 27,
    comments: 15,
    reports: 0,
    witness: 31,
  },
  {
    _id: "p4",
    name: "cityline_watch",
    username: "cityline.watch",
    createdAt: new Date(Date.now() - 49 * 60 * 1000).toISOString(),
    category: "story",
    subCategory: "",
    title: "Metro route opens one lane after cleanup",
    body:
      "Crews cleared the stalled section before sunrise and traffic is moving again, though diversions are still posted near the old market road.",
    coverImage: "",
    likes: 9,
    comments: 4,
    reports: 0,
    witness: 0,
  },
];

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "echo", label: "Echo", icon: MessageSquarePlus, isPrimary: true },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: CircleUserRound },
];

const homeCategoryLabels = ["All posts", "Tech", "Rant", "Story", "Questions", "Civic sense", "Politics", "Confessions"];
const drawerNavItems = tabs.filter((tab) => !tab.isPrimary);

const sortOptions = [
  { id: "date", label: "By date" },
  { id: "popularity", label: "By popularity" },
  { id: "least-popularity", label: "By least popularity" },
];

const POST_CATEGORY_OPTIONS = [
  { value: "tech", label: "Tech" },
  { value: "rant", label: "Rant" },
  { value: "story", label: "Story" },
  { value: "questions", label: "Questions" },
  { value: "civic sense", label: "Civic Sense" },
  { value: "politics", label: "Politics" },
  { value: "confessions", label: "Confessions" },
];

const CONFESSION_SUBCATEGORY_OPTIONS = [
  { value: "confession formal", label: "Confession Formal" },
  { value: "emotional confession", label: "Emotional Confession" },
  { value: "relationship confession", label: "Relationship Confession" },
  { value: "college work", label: "College Work" },
  { value: "sensitive", label: "Sensitive" },
];

const categoriesWithWitness = new Set(["politics", "civic sense"]);
const mediaTokenRegex = /\[\[media:([^[\]]+)\]\]/g;
const bodyImageLinkRegex = /\[(Link|Link_cover):-\s*(https?:\/\/[^\]\s]+)\s*\]/gi;
const partialBodyImageLinkRegex = /\[(?:Link|Link_cover):-?[^\]\n]*\]?/gi;
const postPreviewLimit = 110;
const videoCoverUrlRegex = /\.(mp4|mov|webm|ogg|m4v)(?:[?#].*)?$/i;
const imageCoverUrlRegex = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:[?#].*)?$/i;
const allowedMediaMimeRegex = /^(image|video)\/[a-z0-9.+-]+$/i;
const allowedImageMimeRegex = /^image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)$/i;
const allowedVideoMimeRegex = /^video\/(mp4|quicktime|webm|ogg|x-m4v)$/i;
const ECHOID_OWN_POSTS_CACHE_KEY = "echoidOwnPostsCache";
const ECHOID_NOTIFICATIONS_KEY = "echoIdNotifications";
const ECHOID_VIDEO_AUTOPLAY_KEY = "echoidVideoAutoplay";
const ECHOID_PULL_REFRESH_THRESHOLD = 90;
const ECHOID_PULL_REFRESH_HOLD = 68;
const ECHOID_PULL_REFRESH_MAX = 148;
const ECHOID_PULL_REFRESH_MIN_MS = 650;
const ECHOID_PULL_REFRESH_MAX_MS = 10000;


const initialComposeState = {
  anonymity: true,
  category: "confessions",
  subCategory: "confession formal",
  title: "",
  body: "",
};

const copyTextToClipboard = async (text) => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
};
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const withTimeout = async (promise, ms) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error("Refresh timed out.")), ms);
      }),
    ]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

const formatRelativeTime = (minutesAgo) => {
  if (!Number.isFinite(minutesAgo)) return "Unknown";
  if (minutesAgo < -1) {
    const futureMinutes = Math.abs(minutesAgo);
    if (futureMinutes < 60) return `in ${futureMinutes} min`;
    const futureHours = Math.floor(futureMinutes / 60);
    if (futureHours < 24) return `in ${futureHours} hr`;
    const futureDays = Math.floor(futureHours / 24);
    return `in ${futureDays} day${futureDays > 1 ? "s" : ""}`;
  }
  if (minutesAgo <= 0) return "Just now";
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const formatExpiryDate = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getRelativeMinutesFromDate = (createdAt) => {
  const time = Date.parse(String(createdAt || ""));
  if (!Number.isFinite(time)) return Number.NaN;
  return Math.floor((Date.now() - time) / 60000);
};

const shouldShowWitness = (category) => categoriesWithWitness.has(String(category || "").trim().toLowerCase());
const isConfessionCategory = (category) => String(category || "").trim().toLowerCase() === "confessions";

const toDisplayCategory = (value) =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

const toCategoryValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "all posts") return "";
  return normalized;
};

const stripMediaLinks = (body = "") =>
  String(body || "")
    .replace(bodyImageLinkRegex, "")
    .replace(partialBodyImageLinkRegex, "")
    .replace(mediaTokenRegex, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const getTextBodyLength = (body) => stripMediaLinks(body).length;
const isPostBodyTruncated = (body) => getTextBodyLength(body) > postPreviewLimit;
const getFullPostBody = (body) => stripMediaLinks(body);

const getPostBodyPreview = (body) => {
  const normalizedBody = stripMediaLinks(body)
    .replace(/\[(?:Link|Link_cover)(?::|-)?[^\n\]]*\]?/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (normalizedBody.length <= postPreviewLimit) return normalizedBody;
  return `${normalizedBody.slice(0, postPreviewLimit).trimEnd()}...`;
};

const getVisibilityBadgeLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hidden") return "Hidden";
  if (normalized === "flagged") return "Flagged";
  if (normalized === "blocked") return "Blocked";
  return "";
};

const isVideoCoverUrl = (url) => videoCoverUrlRegex.test(String(url || "").trim());
const isImageCoverUrl = (url) => imageCoverUrlRegex.test(String(url || "").trim());
const isSafeMediaUrl = (url) => {
  const raw = String(url || "").trim();
  if (!raw || /[\u0000-\u001f]/.test(raw)) return false;
  if (/^(javascript|vbscript|data:text|data:application):/i.test(raw)) return false;
  return /^(https?:\/\/|blob:|data:image\/|data:video\/)/i.test(raw);
};
const getMediaKindFromUrl = (url) => {
  if (isVideoCoverUrl(url)) return "video";
  if (isImageCoverUrl(url) || /^data:image\//i.test(String(url || ""))) return "image";
  if (/^data:video\//i.test(String(url || ""))) return "video";
  return "";
};
const normalizeMediaKind = (value, fallbackUrl = "") => {
  const explicitKind = String(value || "").trim().toLowerCase();
  if (explicitKind.startsWith("video/") || explicitKind === "video") return "video";
  if (explicitKind.startsWith("image/") || explicitKind === "image") return "image";
  return getMediaKindFromUrl(fallbackUrl);
};
const isAllowedMediaFile = (file) => {
  const mimeType = String(file?.type || "").trim().toLowerCase();
  const name = String(file?.name || "").trim();
  if (!allowedMediaMimeRegex.test(mimeType)) return false;
  if (mimeType.startsWith("image/")) return allowedImageMimeRegex.test(mimeType);
  if (mimeType.startsWith("video/")) return allowedVideoMimeRegex.test(mimeType) || videoCoverUrlRegex.test(name);
  return false;
};
const isSafeMediaItem = (item) => Boolean(item?.url && isSafeMediaUrl(item.url) && (item.kind === "image" || item.kind === "video"));
const getVideoThumbnailUrl = (url) => {
  const raw = String(url || "").trim();
  if (!raw || !isVideoCoverUrl(raw)) return "";
  return raw.replace(/\.(mp4|mov|webm|ogg|m4v)([?#].*)?$/i, ".png$2");
};

const readEchoIdVideoAutoplay = () => {
  try {
    const stored = globalThis.storage?.readJSON?.(ECHOID_VIDEO_AUTOPLAY_KEY, null);
    if (typeof stored === "boolean") return stored;
    const raw = globalThis.storage?.getItem?.(ECHOID_VIDEO_AUTOPLAY_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
  } catch {
    return false;
  }
  return false;
};

const readEchoIdVideoAutoplayPreference = async () => {
  try {
    const result = await Preferences.get({ key: ECHOID_VIDEO_AUTOPLAY_KEY });
    if (result?.value === "false") return false;
    if (result?.value === "true") return true;
  } catch {
    // Fall back to the synchronous app storage used during initial render.
  }
  return readEchoIdVideoAutoplay();
};

const saveEchoIdVideoAutoplayPreference = async (enabled) => {
  const value = JSON.stringify(Boolean(enabled));
  try {
    await Preferences.set({ key: ECHOID_VIDEO_AUTOPLAY_KEY, value });
  } catch {
    // Keep the fallback write below so the toggle still persists in web/test shells.
  }
  try {
    globalThis.storage?.setItem?.(ECHOID_VIDEO_AUTOPLAY_KEY, value);
  } catch {
    // Preference persistence is best-effort.
  }
};

function useLazyMedia(rootMargin = "280px") {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return undefined;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible, rootMargin]);

  return [ref, isVisible];
}
const getStructuredMediaUrl = (entry) => {
  if (!entry) return "";
  if (typeof entry === "string") return entry.trim();

  return String(
    entry?.url ||
    entry?.mediaUrl ||
    entry?.media_url ||
    entry?.publicUrl ||
    entry?.public_url ||
    entry?.signedUrl ||
    entry?.signed_url ||
    entry?.previewUrl ||
    entry?.preview_url ||
    entry?.imageUrl ||
    entry?.image_url ||
    entry?.videoUrl ||
    entry?.video_url ||
    entry?.coverImage ||
    entry?.cover_image ||
    ""
  ).trim();
};

const getStructuredMediaKind = (entry, fallbackUrl = "") => {
  const explicitKind = String(entry?.kind || entry?.mediaType || entry?.type || entry?.mimeType || "").trim().toLowerCase();
  return normalizeMediaKind(explicitKind, fallbackUrl);
};

const pushStructuredMediaItem = (items, seenUrls, entry, options = {}) => {
  const url = getStructuredMediaUrl(entry);
  if (!url || seenUrls.has(url) || !isSafeMediaUrl(url)) return;
  const kind = getStructuredMediaKind(entry, url);
  if (kind !== "image" && kind !== "video") return;

  seenUrls.add(url);
  items.push({
    token: "",
    url,
    isCover: Boolean(options.isCover || entry?.isCover || entry?.cover),
    kind,
    thumbnailUrl: entry?.thumbnailUrl || entry?.thumbnail_url || entry?.poster || entry?.posterUrl || getVideoThumbnailUrl(url),
  });
};

const extractPostMediaItems = (body = "") => {
  const mediaItems = [];
  const seenUrls = new Set();
  let match;
  const source = String(body || "");

  bodyImageLinkRegex.lastIndex = 0;
  while ((match = bodyImageLinkRegex.exec(source))) {
    const kindLabel = String(match[1] || "").trim().toLowerCase();
    const url = String(match[2] || "").trim();
    const kind = getMediaKindFromUrl(url);
    if (!url || seenUrls.has(url) || !isSafeMediaUrl(url) || !kind) continue;
    seenUrls.add(url);
    mediaItems.push({
      token: match[0],
      url,
      isCover: kindLabel === "link_cover",
      kind,
      thumbnailUrl: kind === "video" ? getVideoThumbnailUrl(url) : "",
    });
  }
  bodyImageLinkRegex.lastIndex = 0;

  return mediaItems;
};

const getPostMediaItems = (post = {}) => {
  const bodyMediaItems = extractPostMediaItems(post.body);
  const mediaItems = [...bodyMediaItems];
  const seenUrls = new Set(bodyMediaItems.map((item) => item.url));

  [
    ...(Array.isArray(post?.mediaItems) ? post.mediaItems : []),
    ...(Array.isArray(post?.media) ? post.media : []),
    ...(Array.isArray(post?.mediaList) ? post.mediaList : []),
    ...(Array.isArray(post?.attachments) ? post.attachments : []),
    ...(Array.isArray(post?.files) ? post.files : []),
    ...(Array.isArray(post?.imageUrls) ? post.imageUrls : []),
    ...(Array.isArray(post?.image_urls) ? post.image_urls : []),
    ...(Array.isArray(post?.mediaUrls) ? post.mediaUrls : []),
    ...(Array.isArray(post?.media_urls) ? post.media_urls : []),
  ].forEach((entry) => pushStructuredMediaItem(mediaItems, seenUrls, entry));

  pushStructuredMediaItem(
    mediaItems,
    seenUrls,
    {
      url: post?.coverImage || post?.cover_image || post?.coverUrl || post?.cover_url || "",
      kind: post?.coverType || post?.coverMimeType || "image",
      isCover: true,
    },
    { isCover: true }
  );

  return mediaItems.sort((left, right) => Number(Boolean(right?.isCover)) - Number(Boolean(left?.isCover)));
};

const getPostLeadMedia = (post = {}) => {
  const mediaItems = getPostMediaItems(post);
  return mediaItems.find((item) => item.isCover) || mediaItems[0] || null;
};

const getPostBodyBlocks = (post = {}) => {
  const source = String(post?.body || "");
  const leadMedia = getPostLeadMedia(post);
  const blocks = [];
  let lastIndex = 0;
  let match;

  bodyImageLinkRegex.lastIndex = 0;
  while ((match = bodyImageLinkRegex.exec(source))) {
    if (match.index > lastIndex) {
      const textValue = source.slice(lastIndex, match.index);
      if (textValue) {
        blocks.push({
          type: "text",
          key: `text-${match.index}`,
          value: textValue,
        });
      }
    }

    const kindLabel = String(match[1] || "").trim().toLowerCase();
    const url = String(match[2] || "").trim();
    const kind = getMediaKindFromUrl(url);
    const media = {
      token: match[0],
      url,
      isCover: kindLabel === "link_cover",
      kind,
    };

    if (url && kind && isSafeMediaUrl(url) && (!leadMedia || url !== leadMedia.url)) {
      blocks.push({
        type: "media",
        key: `media-${match.index}`,
        value: media,
      });
    }

    lastIndex = match.index + match[0].length;
  }
  bodyImageLinkRegex.lastIndex = 0;

  if (lastIndex < source.length) {
    const textValue = source.slice(lastIndex);
    if (textValue) {
      blocks.push({
        type: "text",
        key: `text-tail-${lastIndex}`,
        value: textValue,
      });
    }
  }

  const normalizedBlocks = blocks
    .map((block) =>
      block.type === "text"
        ? {
          ...block,
          value: String(block.value || "")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n[ \t]+/g, "\n")
            .replace(/[ \t]{2,}/g, " ")
            .replace(/\n{3,}/g, "\n\n"),
        }
        : block
    )
    .filter((block) => (block.type === "text" ? String(block.value || "").trim().length > 0 : Boolean(block.value?.url)));

  return normalizedBlocks;
};

const readOwnPostsCache = () => {
  const cached = globalThis.storage?.readJSON?.(ECHOID_OWN_POSTS_CACHE_KEY, []);
  return Array.isArray(cached) ? cached : [];
};

const readRawEchoIdNotifications = () => {
  try {
    const stored = globalThis.storage?.readJSON?.(ECHOID_NOTIFICATIONS_KEY, []) || [];
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const normalizeStoredEchoIdNotification = (notification = {}) => {
  const id = String(notification?.id || notification?._id || "").trim();
  if (!id) return null;
  const isRead = notification?.read === true || notification?.view === true;
  const type = String(notification?.type || "").trim();
  const postId = String(
    notification?.postId ||
    notification?.postID ||
    notification?.targetPostId ||
    notification?.post?._id ||
    notification?.post?.id ||
    ""
  ).trim();
  return {
    ...notification,
    id,
    type,
    postId,
    title: notification?.title || notification?.heading || `${type || "EchoId"} notification`,
    body: notification?.body || notification?.message || notification?.comment || notification?.copy || "",
    createdAt: notification?.createdAt || notification?.timestamp || notification?.updatedAt || new Date().toISOString(),
    isSent: notification?.isSent !== false,
    read: isRead,
    view: isRead,
  };
};

const readEchoIdNotifications = () => {
  return readRawEchoIdNotifications().map(normalizeStoredEchoIdNotification).filter(Boolean);
};

const saveEchoIdNotifications = (notifications) => {
  const rawNotifications = Array.isArray(notifications) ? notifications : [];
  globalThis.storage?.setItem?.(ECHOID_NOTIFICATIONS_KEY, JSON.stringify(rawNotifications));
  return rawNotifications;
};

const getEchoIdNotificationUnreadCount = () =>
  readEchoIdNotifications().filter((item) => item?.read !== true && item?.view !== true).length;

const markEchoIdNotificationsRead = (predicate = () => true) => {
  const stored = readRawEchoIdNotifications();
  const next = stored.map((notification) => {
    const normalized = normalizeStoredEchoIdNotification(notification);
    return normalized && predicate(normalized) ? { ...notification, read: true, view: true } : notification;
  });
  saveEchoIdNotifications(next);
  return next;
};

const getEchoIdNotificationPresentation = (notification = {}) => {
  const type = String(notification?.type || "").trim().toUpperCase();
  if (type.includes("BAN") || type.includes("BLOCK")) {
    return { tone: "banned", Icon: Ban, label: "Account" };
  }
  if (type.includes("FLAG") || type.includes("REPORT") || type.includes("MODERAT") || type.includes("HIDDEN")) {
    return { tone: "flagged", Icon: Flag, label: "Review" };
  }
  if (type.includes("COMMENT") || type.includes("REPLY")) {
    return { tone: "comment", Icon: MessageCircle, label: type.includes("REPLY") ? "Reply" : "Comment" };
  }
  if (type.includes("LIKE") || type.includes("REACTION") || type.includes("UPVOTE")) {
    return { tone: "like", Icon: ThumbsUp, label: "Reaction" };
  }
  if (type.includes("WITNESS") || type.includes("VERIFY")) {
    return { tone: "witness", Icon: TriangleAlert, label: "Witness" };
  }
  if (type.includes("DELETE") || type.includes("REMOVE")) {
    return { tone: "banned", Icon: Ban, label: "Removed" };
  }
  if (type.includes("PROMO") || type.includes("FEATURE") || type.includes("SYSTEM")) {
    return { tone: "info", Icon: Bell, label: "Update" };
  }
  return { tone: "info", Icon: Sparkles, label: "EchoId" };
};

const saveOwnPostsCache = (posts) => {
  const normalized = Array.isArray(posts) ? posts : [];
  globalThis.storage?.setItem?.(ECHOID_OWN_POSTS_CACHE_KEY, JSON.stringify(normalized));
};

const clearOwnPostsCache = () => {
  globalThis.storage?.removeItem?.(ECHOID_OWN_POSTS_CACHE_KEY);
};

const getPostId = (post) => String(post?._id || post?.id || "").trim();

const normalizeUserReactionValue = (value) => {
  if (Number(value) === 1) return 1;
  if (Number(value) === -1) return -1;
  return 0;
};

const normalizeWitnessValue = (value) => {
  if (value === true) return true;
  if (Number(value) === 1) return true;
  return false;
};

const normalizePostRecord = (post = {}) => {
  const normalized = { ...post };
  normalized._id = getPostId(post);
  normalized.isPromotion = Boolean(post?.isPromotion || post?.type === "promotion" || normalized._id.startsWith("promotion:"));
  normalized.createdAt = post?.createdAt || post?.created_at || post?.created || post?.timestamp || post?.updatedAt || new Date().toISOString();
  normalized.likes = Number(post?.likes || 0);
  normalized.dislike = Number(post?.dislike ?? post?.dislikes ?? 0);
  normalized.dislikes = normalized.dislike;
  normalized.comments = Number(post?.comments || 0);
  normalized.witness = Number(post?.witness || 0);
  normalized.userReaction = normalizeUserReactionValue(post?.userReaction);
  normalized.userWitness = normalizeWitnessValue(post?.userWitness);
  return normalized;
};

const isExplicitlyNonAnonymousPost = (post = {}) => {
  const value = post?.anonymity ?? post?.anonymous ?? post?.isAnonymous;
  if (value === false || value === 0) return true;
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "false" || normalized === "0" || normalized === "no";
};

const normalizePostCollection = (posts) =>
  Array.isArray(posts) ? posts.map((post) => normalizePostRecord(post)).filter((post) => post._id) : [];

const insertPromotionsIntoFeed = (posts, promotions) => {
  const basePosts = normalizePostCollection(posts).filter((post) => !post.isPromotion);
  const promoPosts = normalizePostCollection(promotions).filter((post) => post.isPromotion);
  if (!promoPosts.length) return basePosts;

  const next = [...basePosts];
  promoPosts.forEach((promotion, index) => {
    const insertAt = Math.min(next.length, index === 0 ? 1 : 1 + index * 4);
    next.splice(insertAt, 0, promotion);
  });
  return next;
};

const normalizeCommentCollection = (comments) =>
  (Array.isArray(comments) ? comments : [])
    .map((comment, index) => {
      const body = String(comment?.body || comment?.content || comment?.text || comment?.message || "").trim();
      if (!body) return null;
      const name = String(comment?.name || "").trim();
      const username = String(comment?.username || comment?.userName || "").trim().replace(/^@+/, "");
      const avatarUrl = String(comment?.userProfile || comment?.profilePic || comment?.avatar || comment?.avatarUrl || "").trim();
      const author = name || (username ? `@${username}` : String(comment?.author || "Anonymous").trim() || "Anonymous");

      return {
        id: String(comment?._id || comment?.id || `comment-${index}`),
        clientId: String(
          comment?.clientId ||
          comment?.posterId ||
          comment?.userClientId ||
          comment?.authorClientId ||
          comment?.commentClientId ||
          comment?.anonymousClientId ||
          ""
        ).trim(),
        name: name || author,
        username,
        usernameLabel: username ? `@${username}` : "",
        userProfile: avatarUrl,
        author,
        avatarUrl,
        body,
        parentId: String(
          comment?.isReplyTo || comment?.is_reply_to || comment?.replyTo || comment?.reply_to || comment?.parentCommentId || comment?.parent_id || ""
        ).trim(),
        replyCount: Math.max(0, Number(comment?.replyCount ?? comment?.hasreplied ?? comment?.hasReplied ?? comment?.replies ?? 0)),
        relativeTimeLabel: formatRelativeTime(getRelativeMinutesFromDate(comment?.createdAt)),
      };
    })
    .filter(Boolean);

const mergeReactionEntriesIntoMap = (currentMap, reactions) => {
  const next = { ...(currentMap || {}) };
  (Array.isArray(reactions) ? reactions : []).forEach((entry) => {
    const postId = String(entry?.postId || "").trim();
    if (!postId) return;
    next[postId] = normalizeUserReactionValue(entry?.value);
  });
  return next;
};

const mergeWitnessEntriesIntoMap = (currentMap, witnesses) => {
  const next = { ...(currentMap || {}) };
  (Array.isArray(witnesses) ? witnesses : []).forEach((entry) => {
    const postId = String(entry?.postId || "").trim();
    if (!postId) return;
    next[postId] = normalizeWitnessValue(entry?.value ?? entry?.isWitness);
  });
  return next;
};

const getAnonymousOwnerIds = (anonymousProfile, anonymousPosterSecret = null) =>
  [anonymousProfile?.clientId, anonymousProfile?.PostId, anonymousProfile?.postId, anonymousPosterSecret?.anonymousId]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const isOwnerPost = (post, anonymousProfile, anonymousPosterSecret = null) => {
  const posterId = String(post?.posterId || "").trim();
  if (!posterId) return false;
  return getAnonymousOwnerIds(anonymousProfile, anonymousPosterSecret).includes(posterId);
};

const normalizeAnonymousUserDetail = (payload = {}) => ({
  clientId: String(payload?.clientId || "").trim(),
  name: String(payload?.name || "").trim() || "Unknown user",
  username: String(payload?.username || "").trim().replace(/^@+/, ""),
  about: String(payload?.about || "").trim(),
  gender: String(payload?.gender || "").trim(),
  profilePic: String(payload?.profilePic || payload?.profileUrl || "").trim(),
  trustScore: Number(payload?.trustScore || 0),
  createdAt: payload?.createdAt || null,
  updatedAt: payload?.updatedAt || null,
  isBanned: Boolean(payload?.isBanned || payload?.banned),
});

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

const buildAnonymousProfilePatchFromReaction = (payload = {}, reactionValue = 0) => {
  const explicitProfile = payload?.anonymousUser || payload?.userResponse || payload?.profile || null;
  if (explicitProfile && typeof explicitProfile === "object") {
    return normalizeAnonymousUserDetail(explicitProfile);
  }

  const explicitTrustScore = payload?.trustScore ?? payload?.anonymousTrustScore ?? payload?.userTrustScore;
  if (explicitTrustScore !== undefined && explicitTrustScore !== null && explicitTrustScore !== "") {
    return { trustScore: clampNumber(explicitTrustScore, -10, 45) };
  }

  if (Number(reactionValue) === 1) {
    const expireBoostHours = Number(
      payload?.expireBoostHours ?? payload?.boostHours ?? payload?.expireIncreaseHours ?? payload?.postExpireBoostHours ?? 0
    );
    if (expireBoostHours === 1) return { trustScoreDelta: 2 };
    if (expireBoostHours === 6) return { trustScoreDelta: 5 };
  }

  if (Number(reactionValue) === -1) {
    const dislikePenalty = Number(payload?.trustScorePenalty ?? payload?.dislikeTrustPenalty ?? payload?.penalty ?? 0);
    if (dislikePenalty) return { trustScoreDelta: -Math.abs(dislikePenalty) };

    const penaltyApplied =
      payload?.dislikePenaltyApplied === true ||
      payload?.trustPenaltyApplied === true ||
      Number(payload?.penaltyDislikes ?? 0) === 3 ||
      Number(payload?.dislikes ?? 0) === 3;
    if (penaltyApplied) return { trustScoreDelta: -3 };
  }

  return null;
};

function ReactionGlyph({ kind = "like", active = false }) {
  if (kind === "dislike") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className={`echoid-reaction-icon ${active ? "is-active" : ""}`}>
        {active ? (
          <path
            fill="currentColor"
            d="M7.86 17.5c-.8 0-1.42-.72-1.3-1.51l.55-3.55H4.94A1.94 1.94 0 0 1 3 10.5V5.44C3 4.37 3.87 3.5 4.94 3.5h6.77c.78 0 1.47.5 1.72 1.24l1.42 4.26c.12.36.11.76-.04 1.11l-2.3 5.51c-.3.71-.99 1.18-1.76 1.18H7.86ZM15.5 3.5h1A1.5 1.5 0 0 1 18 5v5.5a1.5 1.5 0 0 1-1.5 1.5h-1V3.5Z"
          />
        ) : (
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            d="M7.86 17.5c-.8 0-1.42-.72-1.3-1.51l.55-3.55H4.94A1.94 1.94 0 0 1 3 10.5V5.44C3 4.37 3.87 3.5 4.94 3.5h6.77c.78 0 1.47.5 1.72 1.24l1.42 4.26c.12.36.11.76-.04 1.11l-2.3 5.51c-.3.71-.99 1.18-1.76 1.18H7.86ZM15.5 3.5h1A1.5 1.5 0 0 1 18 5v5.5a1.5 1.5 0 0 1-1.5 1.5h-1V3.5Z"
          />
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`echoid-reaction-icon ${active ? "is-active" : ""}`}>
      {active ? (
        <path
          fill="currentColor"
          d="M12.14 2.5c.8 0 1.42.72 1.3 1.51l-.55 3.55h2.17c1.07 0 1.94.87 1.94 1.94v5.06c0 1.07-.87 1.94-1.94 1.94H8.29c-.78 0-1.47-.5-1.72-1.24L5.15 11c-.12-.36-.11-.76.04-1.11l2.3-5.51c.3-.71.99-1.18 1.76-1.18h2.89ZM4.5 8h-1A1.5 1.5 0 0 0 2 9.5V15a1.5 1.5 0 0 0 1.5 1.5h1V8Z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
          d="M12.14 2.5c.8 0 1.42.72 1.3 1.51l-.55 3.55h2.17c1.07 0 1.94.87 1.94 1.94v5.06c0 1.07-.87 1.94-1.94 1.94H8.29c-.78 0-1.47-.5-1.72-1.24L5.15 11c-.12-.36-.11-.76.04-1.11l2.3-5.51c.3-.71.99-1.18 1.76-1.18h2.89ZM4.5 8h-1A1.5 1.5 0 0 0 2 9.5V15a1.5 1.5 0 0 0 1.5 1.5h1V8Z"
        />
      )}
    </svg>
  );
}

function WitnessGlyph({ active = false }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`echoid-reaction-icon ${active ? "is-active" : ""}`}>
      {active ? (
        <path
          fill="currentColor"
          d="M10 2.5c-3.7 0-6.85 2.3-8.13 5.54a1.97 1.97 0 0 0 0 1.42C3.15 12.7 6.3 15 10 15s6.85-2.3 8.13-5.54c.16-.45.16-.97 0-1.42C16.85 4.8 13.7 2.5 10 2.5Zm0 9.25A3.25 3.25 0 1 1 10 5.25a3.25 3.25 0 0 1 0 6.5Zm0 5.75c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2Z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
          d="M10 2.5c-3.7 0-6.85 2.3-8.13 5.54a1.97 1.97 0 0 0 0 1.42C3.15 12.7 6.3 15 10 15s6.85-2.3 8.13-5.54c.16-.45.16-.97 0-1.42C16.85 4.8 13.7 2.5 10 2.5Zm0 9.25A3.25 3.25 0 1 1 10 5.25a3.25 3.25 0 0 1 0 6.5Zm0 5.75c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2Z"
        />
      )}
    </svg>
  );
}

const createVideoThumbnail = (src, preferredSecond = 1) =>
  new Promise((resolve) => {
    if (!src || typeof document === "undefined") {
      resolve("");
      return;
    }

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("preload", "metadata");

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };
    const finish = (value = "") => {
      cleanup();
      resolve(value);
    };

    video.onerror = () => finish("");
    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0);
      const targetSecond = duration > preferredSecond ? preferredSecond : Math.max(0, Math.min(1, duration * 0.5));
      video.currentTime = Number.isFinite(targetSecond) ? targetSecond : 0;
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const context = canvas.getContext("2d");
        if (!context) {
          finish("");
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/png"));
      } catch {
        finish("");
      }
    };
    video.src = src;
  });

const dataUrlToBlob = async (dataUrl) => {
  if (!/^data:image\//i.test(String(dataUrl || ""))) return null;
  const response = await fetch(dataUrl);
  return response.blob();
};

const createVideoThumbnailBlob = async (src) => {
  const dataUrl = await createVideoThumbnail(src);
  return dataUrlToBlob(dataUrl);
};

function LazyEchoIdImage({ src, alt = "", className = "", onLoadError }) {
  const [mediaRef, isVisible] = useLazyMedia();
  const [failed, setFailed] = useState(false);

  return (
    <span ref={mediaRef} className={`${className} echoid-lazy-media-shell`}>
      {isVisible && src && !failed ? (
        <img
          src={src}
          alt={alt}
          className="echoid-lazy-media-fill"
          loading="lazy"
          decoding="async"
          onError={() => {
            setFailed(true);
            onLoadError?.();
          }}
        />
      ) : null}
      {!isVisible || failed ? (
        <span className="echoid-media-placeholder" aria-label={failed ? "Media preview unavailable" : "Loading media"}>
          {failed ? <Video size={18} /> : null}
        </span>
      ) : null}
    </span>
  );
}

function EchoIdVideoPlayer({ src, title = "Video", poster = "", className = "", autoPlay = false }) {
  if (!isSafeMediaUrl(src)) return null;

  return (
    <video
      className={`echoid-native-video-player ${className}`}
      src={src}
      title={title}
      poster={poster || undefined}
      autoPlay={autoPlay}
      muted={autoPlay}
      controls
      playsInline
      preload="metadata"
    />
  );
}

function EchoIdVideoThumbnail({
  src,
  poster = "",
  className = "",
  label = "Video preview",
  autoPlayInView = false,
  controls = false,
  onOpenFullscreen,
}) {
  const [mediaRef, isVisible] = useLazyMedia();
  const derivedPoster = poster || getVideoThumbnailUrl(src);
  const [thumbnail, setThumbnail] = useState(derivedPoster);
  const [didTryThumbnail, setDidTryThumbnail] = useState(Boolean(derivedPoster));
  const [nativeFrameFailed, setNativeFrameFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaybackFocused, setIsPlaybackFocused] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasActivatedPlayback, setHasActivatedPlayback] = useState(false);
  const [wantsPlayback, setWantsPlayback] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const clickTimeoutRef = useRef(0);

  useEffect(() => {
    const nextPoster = poster || getVideoThumbnailUrl(src);
    setThumbnail(nextPoster);
    setDidTryThumbnail(Boolean(nextPoster));
    setNativeFrameFailed(false);
    setHasActivatedPlayback(false);
    setWantsPlayback(false);
    setIsPlaying(false);
    setIsMuted(false);
    return undefined;
  }, [isVisible, poster, src]);

  const hasThumbnail = Boolean(thumbnail);
  const shouldAutoplayActive = Boolean(autoPlayInView && isVisible && isPlaybackFocused);
  const shouldRenderVideo = Boolean(src && !nativeFrameFailed && (shouldAutoplayActive || hasActivatedPlayback));
  const progressValue = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  useEffect(() => {
    const node = mediaRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsPlaybackFocused(typeof document === "undefined" || document.visibilityState !== "hidden");
      return undefined;
    }

    const updateFocusFromViewport = () => {
      if (document.visibilityState === "hidden") {
        setIsPlaybackFocused(false);
        return;
      }
      const rect = node.getBoundingClientRect();
      const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const visibleArea = visibleWidth * visibleHeight;
      const totalArea = Math.max(1, rect.width * rect.height);
      setIsPlaybackFocused(visibleArea / totalArea >= 0.45);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPlaybackFocused(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.45 && document.visibilityState !== "hidden"));
      },
      { threshold: [0, 0.45, 0.8] }
    );

    observer.observe(node);
    document.addEventListener("visibilitychange", updateFocusFromViewport);
    window.addEventListener("blur", updateFocusFromViewport);
    window.addEventListener("focus", updateFocusFromViewport);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateFocusFromViewport);
      window.removeEventListener("blur", updateFocusFromViewport);
      window.removeEventListener("focus", updateFocusFromViewport);
    };
  }, [mediaRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    if (!isPlaybackFocused) {
      video.pause?.();
      return undefined;
    }
    if (shouldAutoplayActive) {
      video.muted = isMuted;
      const playPromise = video.play?.();
      if (playPromise?.catch) {
        playPromise.catch(() => setIsPlaying(false));
      }
    } else {
      video.pause?.();
    }
    return undefined;
  }, [isMuted, isPlaybackFocused, shouldAutoplayActive, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasActivatedPlayback || !wantsPlayback || shouldAutoplayActive) return undefined;
    if (!isPlaybackFocused) {
      video.pause?.();
      return undefined;
    }
    const playPromise = video.play?.();
    if (playPromise?.catch) {
      playPromise.catch(() => setIsPlaying(false));
    }
    return undefined;
  }, [hasActivatedPlayback, isPlaybackFocused, shouldAutoplayActive, src, wantsPlayback]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = 0;
      }
    };
  }, []);

  const togglePlayback = async () => {
    if (!controls) return;
    const video = videoRef.current;
    if (!video) {
      setHasActivatedPlayback(true);
      setWantsPlayback(true);
      return;
    }

    try {
      if (video.paused) {
        setWantsPlayback(true);
        const playPromise = video.play?.();
        if (playPromise?.catch) await playPromise.catch(() => { });
      } else {
        setWantsPlayback(false);
        video.pause?.();
      }
    } catch {
      // Playback can be blocked by the browser until a trusted user gesture.
    }
  };

  const handleVideoClick = (event) => {
    if (!controls) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (clickTimeoutRef.current) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = 0;
    }

    clickTimeoutRef.current = window.setTimeout(() => {
      clickTimeoutRef.current = 0;
      togglePlayback();
    }, 220);
  };

  const openFullscreenPlayback = (event) => {
    if (!controls) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (clickTimeoutRef.current) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = 0;
    }
    videoRef.current?.pause?.();
    onOpenFullscreen?.();
  };

  const toggleMute = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setIsMuted((current) => {
      const nextMuted = !current;
      if (videoRef.current) {
        videoRef.current.muted = nextMuted;
      }
      return nextMuted;
    });
  };

  const handleTimelineChange = (event) => {
    event.stopPropagation();
    const video = videoRef.current;
    const nextPercent = Number(event.target.value || 0);
    if (!video || !duration) return;
    const nextTime = (nextPercent / 100) * duration;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <span
      ref={mediaRef}
      className={`${className} echoid-video-thumb-shell ${autoPlayInView && isVisible && isPlaybackFocused ? "is-autoplaying" : ""} ${isPlaying ? "is-playing" : ""
        } ${controls ? "has-controls" : ""}`}
      aria-label={label}
      role={controls ? "button" : undefined}
      tabIndex={controls ? 0 : undefined}
      onClick={handleVideoClick}
      onDoubleClick={openFullscreenPlayback}
      onKeyDown={(event) => {
        if (!controls || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        event.stopPropagation();
        togglePlayback();
      }}
    >
      {shouldRenderVideo ? (
        <video
          ref={videoRef}
          src={src}
          className="echoid-video-thumb-video"
          playsInline
          loop={autoPlayInView}
          preload="metadata"
          autoPlay={autoPlayInView}
          muted={isMuted}
          poster={thumbnail || undefined}
          onError={() => setNativeFrameFailed(true)}
          onLoadedMetadata={(event) => setDuration(Number(event.currentTarget.duration || 0))}
          onTimeUpdate={(event) => setCurrentTime(Number(event.currentTarget.currentTime || 0))}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setWantsPlayback(false);
          }}
        />
      ) : hasThumbnail ? (
        <img
          src={thumbnail}
          alt=""
          className="echoid-video-thumb-image"
          loading="lazy"
          decoding="async"
          onError={() => setThumbnail("")}
        />
      ) : (
        <span className="echoid-video-thumb-fallback">
          <Video size={16} />
          <span>{isVisible && !didTryThumbnail ? "Loading" : "Video"}</span>
        </span>
      )}
      <span className="echoid-video-play-overlay" aria-hidden="true">
        {isPlaying ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
      </span>
      {controls && shouldRenderVideo ? (
        <span className="echoid-video-thumb-controls" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={toggleMute} aria-label={isMuted ? "Unmute video" : "Mute video"}>
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressValue}
            onChange={handleTimelineChange}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Video timeline"
          />
          <button type="button" onClick={openFullscreenPlayback} aria-label="Open fullscreen video">
            <Maximize2 size={15} />
          </button>
        </span>
      ) : null}
    </span>
  );
}

function EchoIdFeedMedia({ item, altText, autoPlayVideos = false, onAssumeVideo, onOpenFullscreen }) {
  const [assumedKind, setAssumedKind] = useState(item?.kind || "image");

  useEffect(() => {
    setAssumedKind(item?.kind || "image");
  }, [item?.kind, item?.url]);

  if (assumedKind === "video") {
    return (
      <EchoIdVideoThumbnail
        src={item.url}
        poster={item.thumbnailUrl}
        className="echoid-post-media"
        autoPlayInView={autoPlayVideos}
        controls
        onOpenFullscreen={onOpenFullscreen}
      />
    );
  }

  return (
    <LazyEchoIdImage
      src={item.url}
      alt={altText}
      className="echoid-post-media"
      onLoadError={() => {
        setAssumedKind("video");
        onAssumeVideo?.();
      }}
    />
  );
}

function PostMediaCarousel({ mediaItems, altText, compact = false, autoPlayVideos = false, onMediaInteract, onPreviewMedia }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [assumedKinds, setAssumedKinds] = useState({});
  const touchStartRef = useRef(null);
  const items = Array.isArray(mediaItems)
    ? mediaItems
      .map((item) => ({ ...item, kind: assumedKinds[item?.url] || item?.kind }))
      .filter(isSafeMediaItem)
    : [];

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length, items[0]?.url]);

  if (!items.length) return null;

  const activeItem = items[Math.min(activeIndex, items.length - 1)] || items[0];
  const canSwipe = items.length > 1;
  const showIndex = (nextIndex) => {
    if (!items.length) return;
    const normalized = (nextIndex + items.length) % items.length;
    setActiveIndex(normalized);
  };
  const markAsVideo = (url) => {
    if (!url) return;
    setAssumedKinds((current) => (current[url] === "video" ? current : { ...current, [url]: "video" }));
  };
  const handleTouchStart = (event) => {
    if (!canSwipe) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = (event) => {
    if (!canSwipe || !touchStartRef.current) return;
    const touch = event.changedTouches?.[0];
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!touch || !start) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    showIndex(activeIndex + (deltaX < 0 ? 1 : -1));
  };

  return (
    <div className={`echoid-post-carousel ${compact ? "is-compact" : ""}`}>
      <div
        className={`echoid-post-media-frame ${canSwipe ? "is-swipeable" : ""}`}
        onClick={(event) => {
          onMediaInteract?.(event);
          onPreviewMedia?.(activeItem, altText);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <EchoIdFeedMedia
          item={activeItem}
          altText={altText}
          autoPlayVideos={autoPlayVideos}
          onAssumeVideo={() => markAsVideo(activeItem.url)}
          onOpenFullscreen={() => onPreviewMedia?.(activeItem, altText)}
        />
      </div>
      {items.length > 1 ? (
        <>
          <div className="echoid-post-carousel-dots">
            {items.map((item, index) => (
              <button
                key={`${item.url}-${index}`}
                type="button"
                className={`echoid-post-carousel-dot ${index === activeIndex ? "is-active" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  showIndex(index);
                }}
                aria-label={`Show media ${index + 1}`}
              />
            ))}
          </div>
          <div className="echoid-post-carousel-thumbs">
            {items.map((item, index) => (
              <button
                key={`${item.url}-thumb-${index}`}
                type="button"
                className={`echoid-post-carousel-thumb ${index === activeIndex ? "is-active" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  showIndex(index);
                }}
                aria-label={`Preview media ${index + 1}`}
              >
                {item.kind === "video" ? (
                  <EchoIdVideoThumbnail src={item.url} poster={item.thumbnailUrl} className="echoid-post-carousel-thumb-media" />
                ) : (
                  <LazyEchoIdImage
                    src={item.url}
                    alt=""
                    className="echoid-post-carousel-thumb-media"
                    onLoadError={() => markAsVideo(item.url)}
                  />
                )}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function EchoIdMediaPreview({ preview, onClose }) {
  const [scale, setScale] = useState(1);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewSettingsOpen, setIsPreviewSettingsOpen] = useState(false);
  const [previewPlaybackRate, setPreviewPlaybackRate] = useState(1);
  const previewVideoRef = useRef(null);

  useEffect(() => {
    setScale(1);
  }, [preview?.url, preview?.kind]);

  useEffect(() => {
    if (preview?.kind !== "video") return undefined;
    const video = previewVideoRef.current;
    if (!video) return undefined;

    setIsPreviewPlaying(false);
    setIsPreviewSettingsOpen(false);
    video.playbackRate = previewPlaybackRate;
    video.load?.();
    const playPromise = video.play?.();
    if (playPromise?.catch) {
      playPromise.catch(() => { });
    }
    return () => {
      video.pause?.();
    };
  }, [preview?.kind, preview?.url]);

  const togglePreviewPlayback = async (event) => {
    event?.stopPropagation?.();
    const video = previewVideoRef.current;
    if (!video) return;

    if (video.paused) {
      const playPromise = video.play?.();
      if (playPromise?.catch) {
        await playPromise.catch(() => { });
      }
    } else {
      video.pause?.();
    }
  };

  const setPreviewSpeed = (speed) => {
    setPreviewPlaybackRate(speed);
    if (previewVideoRef.current) {
      previewVideoRef.current.playbackRate = speed;
    }
    setIsPreviewSettingsOpen(false);
  };

  useEffect(() => {
    if (!preview) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, preview]);

  if (!preview?.url || !isSafeMediaItem(preview)) return null;

  const isImage = preview.kind !== "video";

  return (
    <div className="echoid-media-preview-overlay" onClick={onClose} role="presentation">
      <div className="echoid-media-preview-shell" onClick={(event) => event.stopPropagation()}>
        <div className="echoid-media-preview-bar">
          <button type="button" className="echoid-media-preview-back" onClick={onClose}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          {isImage ? (
            <div className="echoid-media-preview-zoombar">
              <button type="button" onClick={() => setScale((current) => Math.max(1, Number((current - 0.25).toFixed(2))))}>
                <Minus size={16} />
              </button>
              <button type="button" onClick={() => setScale(1)}>
                {Math.round(scale * 100)}%
              </button>
              <button type="button" onClick={() => setScale((current) => Math.min(4, Number((current + 0.25).toFixed(2))))}>
                <Plus size={16} />
              </button>
            </div>
          ) : null}
        </div>
        <div
          className="echoid-media-preview-stage"
          onWheel={
            isImage
              ? (event) => {
                event.preventDefault();
                setScale((current) => {
                  const next = current + (event.deltaY < 0 ? 0.2 : -0.2);
                  return Math.min(4, Math.max(1, Number(next.toFixed(2))));
                });
              }
              : undefined
          }
        >
          {isImage ? (
            <img
              src={preview.url}
              alt={preview.alt || "Preview"}
              className="echoid-media-preview-image"
              style={{ transform: `scale(${scale})` }}
            />
          ) : (
            <div className="echoid-media-preview-video-wrap">
              <video
                ref={previewVideoRef}
                src={preview.url}
                poster={preview.thumbnailUrl}
                className="echoid-media-preview-video"
                controls
                playsInline
                autoPlay
                preload="metadata"
                onClick={togglePreviewPlayback}
                onPlay={() => setIsPreviewPlaying(true)}
                onPause={() => setIsPreviewPlaying(false)}
                onEnded={() => setIsPreviewPlaying(false)}
              />
              <button
                type="button"
                className={`echoid-media-preview-play ${isPreviewPlaying ? "is-playing" : ""}`}
                onClick={togglePreviewPlayback}
                aria-label={isPreviewPlaying ? "Pause video" : "Play video"}
              >
                {isPreviewPlaying ? <Pause size={38} fill="currentColor" /> : <Play size={44} fill="currentColor" />}
              </button>
              <div className="echoid-media-preview-settings">
                <button
                  type="button"
                  className="echoid-media-preview-settings-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsPreviewSettingsOpen((current) => !current);
                  }}
                  aria-label="Video settings"
                  aria-expanded={isPreviewSettingsOpen}
                >
                  <Settings size={18} />
                </button>
                {isPreviewSettingsOpen ? (
                  <div className="echoid-media-preview-settings-menu">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        className={previewPlaybackRate === speed ? "is-active" : ""}
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreviewSpeed(speed);
                        }}
                      >
                        {speed === 1 ? "Normal" : `${speed}x`}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const getDisplayInitial = (value, fallback = "E") => {
  const normalized = String(value || "").trim();
  return (normalized || fallback).charAt(0).toUpperCase();
};

const normalizeSearchUserResult = (payload = {}) => {
  const username = String(payload.username || "").trim().replace(/^@+/, "");
  const name = String(payload.name || "").trim();
  if (username === "_account_suck" || name === "past tense" || payload?.banned) return null;
  if (!username && !name) return null;

  return {
    clientId: String(payload.clientId || payload.posterId || payload._id || payload.id || "").trim(),
    name: name || "Unknown user",
    username,
    trustScore: Number(payload.trustScore || 0),
    about: String(payload.about || "").trim(),
    profilePic: String(payload.profilePic || payload.profileUrl || "").trim(),
  };
};

const splitComposerBody = (body, mediaMap) => {
  const source = String(body || "");
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mediaTokenRegex.exec(source))) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        key: `text-${match.index}`,
        value: source.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "media",
      key: `media-${match[1]}`,
      value: mediaMap.get(match[1]) || null,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    parts.push({
      type: "text",
      key: `text-tail-${lastIndex}`,
      value: source.slice(lastIndex),
    });
  }

  return parts.length ? parts : [{ type: "text", key: "text-empty", value: "" }];
};

const isVisibleUserPost = (post = {}, anonymousProfile = null) => isExplicitlyNonAnonymousPost(post) || isOwnerPost(post, anonymousProfile);

const EchoIdPullRefreshSpinner = React.forwardRef(function EchoIdPullRefreshSpinner(_, ref) {
  return (
    <div className="echoid-pull-refresh" aria-hidden="true" ref={ref}>
      <div className="echoid-pull-refresh-spinner">
        <span />
      </div>
    </div>
  );
});

function EchoIdPostCardSkeleton({ count = 1, compact = true }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <article key={`post-skeleton-${index}`} className={`echoid-post-card ${compact ? "is-compact" : ""}`} aria-hidden="true">
          <div className="echoid-post-top">
            <div className="echoid-skeleton-copy">
              <Skeleton width={140} height={18} borderRadius={8} />
              <div className="echoid-post-meta">
                <Skeleton width={96} height={14} borderRadius={7} />
                <Skeleton width={74} height={14} borderRadius={7} />
              </div>
            </div>
            <div className="echoid-post-badges">
              <Skeleton width={88} height={26} borderRadius={999} />
            </div>
          </div>
          <Skeleton width="68%" height={20} borderRadius={10} style={{ marginBottom: 12 }} />
          <Skeleton height={184} borderRadius={22} style={{ marginBottom: 12 }} />
          <Skeleton count={3} height={14} borderRadius={7} style={{ marginBottom: 6 }} />
          <div className="echoid-post-actions">
            <Skeleton width={92} height={36} borderRadius={12} />
            <Skeleton width={104} height={36} borderRadius={12} />
            <Skeleton width={96} height={36} borderRadius={12} />
          </div>
        </article>
      ))}
    </>
  );
}

function EchoIdUserSearchSkeleton({ count = 3 }) {
  return (
    <div className="echoid-search-results" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <article key={`user-skeleton-${index}`} className="echoid-search-card">
          <Skeleton circle width={52} height={52} />
          <div className="echoid-search-usercopy">
            <Skeleton width={132} height={16} borderRadius={8} />
            <Skeleton width={88} height={13} borderRadius={7} style={{ marginTop: 8 }} />
            <Skeleton width={96} height={13} borderRadius={7} style={{ marginTop: 8 }} />
            <Skeleton count={2} height={12} borderRadius={7} style={{ marginTop: 8 }} />
          </div>
        </article>
      ))}
    </div>
  );
}

function EchoIdStatsSkeleton({ count = 4 }) {
  return (
    <section className="echoid-grid-stats" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={`stat-skeleton-${index}`} className="echoid-grid-stat">
          <Skeleton width={54} height={24} borderRadius={8} />
          <Skeleton width={74} height={13} borderRadius={7} style={{ marginTop: 8 }} />
        </div>
      ))}
    </section>
  );
}

function EchoIdProfileCardSkeleton() {
  return (
    <section className="echoid-profile-card" aria-hidden="true">
      <Skeleton circle width={84} height={84} />
      <div className="echoid-profile-copy">
        <Skeleton width={170} height={24} borderRadius={10} />
        <Skeleton width={112} height={15} borderRadius={8} style={{ marginTop: 8 }} />
        <Skeleton count={2} height={14} borderRadius={8} style={{ marginTop: 10 }} />
      </div>
    </section>
  );
}

const isPromotionPost = (post = {}) => Boolean(post?.isPromotion || post?.type === "promotion" || getPostId(post).startsWith("promotion:"));

const renderMediaCard = (media) => {
  if (!media?.previewUrl) return null;
  const safePreview = isSafeMediaUrl(media.previewUrl) && (media.kind === "image" || media.kind === "video");
  if (!safePreview) return null;

  return (
    <div className="echoid-inline-media-shell">
      <div className={`echoid-inline-media-frame ${media.kind === "video" ? "is-video" : ""}`}>
        {media.kind === "video" ? (
          <EchoIdVideoPlayer src={media.previewUrl} poster={media.thumbnailUrl} title={media.name || "Selected video"} className="echoid-inline-media" />
        ) : (
          <img src={media.previewUrl} alt={media.name || "Selected media"} className="echoid-inline-media" loading="lazy" decoding="async" />
        )}
      </div>
      <div className="echoid-inline-media-meta">
        {media.kind === "video" ? <Video size={14} /> : <ImageIcon size={14} />}
        <span>{media.name || (media.kind === "video" ? "video" : "image")}</span>
      </div>
    </div>
  );
};

const renderPostCard = (post, options = {}) => {
  const {
    compact = false,
    showOwnerMeta = false,
    reactionValue = 0,
    witnessValue = false,
    isReactionPending = false,
    isWitnessPending = false,
    onLike,
    onDislike,
    onWitness,
    onOpenPost,
    onOpenAuthor,
    onPreviewMedia,
    onDelete,
    isDeletePending = false,
    autoPlayVideos = false,
  } = options;
  const title = post.title || "";
  const isPromotion = isPromotionPost(post);
  const author = post.name || "Anonymous";
  const isAnonymousPost = post?.anonymity === true || String(post?.anonymity || "").toLowerCase() === "true";
  const anonymousPosterId = String(post?.posterId || post?.postId || post?.PostId || "").trim();
  const handle = isAnonymousPost
    ? `@${anonymousPosterId || "anonymous"}`
    : post.username
      ? `@${post.username}`
      : "@anonymous";
  const category = toDisplayCategory(post.category);
  const previewText = getPostBodyPreview(post.body);
  const mediaItems = getPostMediaItems(post);
  const isTruncated = compact && isPostBodyTruncated(post.body);
  const reactionsLocked = Boolean(isTruncated);
  const minutesAgo = getRelativeMinutesFromDate(post.createdAt);
  const visibilityBadge = showOwnerMeta ? getVisibilityBadgeLabel(post.visibility) : "";
  const isExpired = showOwnerMeta && post.expire && new Date(post.expire).getTime() <= Date.now();
  const stopEvent = (event) => event.stopPropagation();
  const handleOpenPost = () => onOpenPost?.(post);
  const handleOpenAuthor = (event) => {
    stopEvent(event);
    if (isPromotion || isAnonymousPost) return;
    onOpenAuthor?.(post);
  };
  const handleCopyAnonymousPosterId = async (event) => {
    stopEvent(event);
    if (!isAnonymousPost || !anonymousPosterId) return;
    try {
      await copyTextToClipboard(anonymousPosterId);
      await Swal.fire({
        toast: true,
        position: "top",
        icon: "success",
        title: "Poster id copied",
        showConfirmButton: false,
        timer: 1300,
      });
    } catch {
      await Swal.fire({
        toast: true,
        position: "top",
        icon: "error",
        title: "Could not copy poster id",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };
  const authorAvatarUrl = String(post.profilePic || post.profileUrl || post.userProfile || "").trim();
  const mediaPreviewContext = {
    author,
    handle,
    title,
    relativeTimeLabel: formatRelativeTime(minutesAgo),
    avatarUrl: authorAvatarUrl,
  };

  return (
    <article
      key={post._id || post.id}
      className={`echoid-post-card ${compact ? "is-compact" : ""} ${isPromotion ? "is-promotion" : ""} ${onOpenPost && !isPromotion ? "is-clickable" : ""}`}
      onClick={isPromotion ? undefined : handleOpenPost}
    >
      <div className="echoid-post-top">
        <div className="echoid-post-author-row">
          <button
            type="button"
            className={`echoid-post-avatar ${authorAvatarUrl ? "is-clickable" : ""}`}
            onClick={handleOpenAuthor}
            aria-label={`Open ${author}'s profile`}
          >
            {authorAvatarUrl ? <img src={authorAvatarUrl} alt={author} /> : <span>{getDisplayInitial(author, "A")}</span>}
          </button>
          <div className="echoid-post-author-copy">
            <h3>
              <button type="button" className="echoid-inline-identity-button" onClick={handleOpenAuthor}>
                {author}
              </button>
            </h3>
            <div className="echoid-post-meta">
              <span>
                <button
                  type="button"
                  className={`echoid-inline-identity-button ${isAnonymousPost ? "is-anonymous-poster-id" : ""}`}
                  onClick={isAnonymousPost ? handleCopyAnonymousPosterId : handleOpenAuthor}
                  title={isAnonymousPost && anonymousPosterId ? "Copy poster id" : undefined}
                >
                  {handle}
                </button>
              </span>
              <span>{formatRelativeTime(minutesAgo)}</span>
            </div>
          </div>
        </div>
        <div className="echoid-post-badges">
          <span className="echoid-post-tag">{isPromotion ? post.label || category || "Promotion" : category}</span>
          {visibilityBadge ? <span className={`echoid-visibility-badge tone-${String(post.visibility || "").toLowerCase()}`}>{visibilityBadge}</span> : null}
          {isExpired ? <span className="echoid-visibility-badge tone-expired">Expired</span> : null}
        </div>
      </div>

      {title ? <h4 className="echoid-post-title">{title}</h4> : null}

      {previewText ? <p>{previewText}</p> : <p className="echoid-post-muted">Media-only post</p>}

      {mediaItems.length > 0 ? (
        <div className="echoid-post-imagewrap">
          <PostMediaCarousel
            mediaItems={mediaItems}
            altText={title || author}
            compact={compact}
            autoPlayVideos={autoPlayVideos}
            onMediaInteract={stopEvent}
            onPreviewMedia={(media, altText) => onPreviewMedia?.(media, altText, mediaPreviewContext)}
          />
        </div>
      ) : null}
      {isTruncated ? <div className="echoid-post-read-note">Open the post to finish reading before reacting.</div> : null}

      {showOwnerMeta ? (
        <div className="echoid-post-owner-meta">
          <span>Expires {formatExpiryDate(post.expire)}</span>
          <span>Moderation {Number(post.moderationScore || 0)}</span>
        </div>
      ) : null}

      {isPromotion ? null : <div className="echoid-post-actions">
        <button
          type="button"
          className={`echoid-post-action-button ${reactionValue === 1 ? "is-selected is-like" : ""}`}
          onClick={(event) => {
            stopEvent(event);
            onLike?.(post);
          }}
          disabled={isReactionPending || reactionsLocked}
          aria-pressed={reactionValue === 1}
          title={reactionsLocked ? "Open the post and read the full body to react." : undefined}
        >
          <span className="echoid-post-action-label">
            <ReactionGlyph kind="like" active={reactionValue === 1} />
            <span>Likes {Number(post.likes || 0)}</span>
          </span>
        </button>
        {!showOwnerMeta ? (
          <button
            type="button"
            className={`echoid-post-action-button ${reactionValue === -1 ? "is-selected is-dislike" : ""}`}
            onClick={(event) => {
              stopEvent(event);
              onDislike?.(post);
            }}
            disabled={isReactionPending || reactionsLocked}
            aria-pressed={reactionValue === -1}
            title={reactionsLocked ? "Open the post and read the full body to react." : undefined}
          >
            <span className="echoid-post-action-label">
              <ReactionGlyph kind="dislike" active={reactionValue === -1} />
              <span>Dislikes {Number(post.dislike || 0)}</span>
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            stopEvent(event);
            handleOpenPost();
          }}
        >
          Comments {Number(post.comments || 0)}
        </button>
        {showOwnerMeta ? (
          <button
            type="button"
            className="echoid-post-action-button is-delete"
            onClick={(event) => {
              stopEvent(event);
              onDelete?.(post);
            }}
            disabled={isDeletePending}
          >
            {isDeletePending ? "Deleting..." : "Delete"}
          </button>
        ) : null}
        {shouldShowWitness(post.category) ? (
          <button
            type="button"
            className={`echoid-post-action-button ${witnessValue ? "is-selected is-witness" : ""}`}
            onClick={(event) => {
              stopEvent(event);
              onWitness?.(post);
            }}
            disabled={isWitnessPending}
            aria-pressed={Boolean(witnessValue)}
          >
            <span className="echoid-post-action-label">
              <WitnessGlyph active={Boolean(witnessValue)} />
              <span>Witness {Number(post.witness || 0)}</span>
            </span>
          </button>
        ) : null}
      </div>}
    </article>
  );
};

function UserDetails({
  user,
  posts,
  postsLoaded,
  postsLoading,
  postsError,
  isLoading,
  error,
  onBack,
  onLoadPosts,
  onOpenPost,
  onPreviewProfileImage,
  renderPostCard,
  autoPlayVideos = false,
  isMobile = false,
}) {
  const displayName = String(user?.name || "Unknown user").trim() || "Unknown user";
  const handle = user?.username ? `@${user.username}` : "@unknown";
  const about = String(user?.about || "").trim();
  const joinedDate = user?.createdAt ? formatRelativeTime(getRelativeMinutesFromDate(user.createdAt)) : "Unknown";

  const stats = [
    { label: "Posts", value: String(Array.isArray(posts) ? posts.length : 0) },
    { label: "Trust score", value: String(Number(user?.trustScore || 0)) },
    { label: "Status", value: user?.isBanned ? "Banned" : "Active" },
  ];

  const renderMobile = () => (
    <div className="fixed inset-0 z-[100] overflow-y-auto flex flex-col items-center bg-white dark:bg-surface-dim ud-text-primary font-body-md transition-colors duration-300">
      <nav className="fixed top-0 left-0 w-full z-[110] bg-white dark:bg-surface-dim flex justify-between items-center px-margin-mobile py-3 border-b border-outline-variant/30 transition-colors">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-surface-container transition-colors active:scale-95 duration-150 ud-text-primary"
        >
          <span className="material-symbols-outlined text-[24px] font-bold">arrow_back</span>
        </button>
        <span className="font-headline-sm text-body-lg font-black ud-text-primary uppercase tracking-tight">Profile</span>
        <div className="flex gap-1">
          <button className="p-2 rounded-full hover:bg-surface-container transition-colors active:scale-95 duration-150 ud-text-primary">
            <span className="material-symbols-outlined text-[24px] font-bold">settings</span>
          </button>
        </div>
      </nav>

      <main className="w-full max-w-[420px] px-margin-mobile pt-16 pb-24 flex flex-col gap-8">
        <section className="flex flex-col items-center mt-6">
          <div className="w-full bg-white dark:bg-surface-container rounded-2xl p-6 border border-outline-variant dark:border-outline shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
            <button
              onClick={() => user?.profilePic && onPreviewProfileImage?.(user.profilePic, displayName)}
              className="w-16 h-16 rounded-xl p-0.5 bg-gradient-to-tr from-primary to-primary-container mb-3 overflow-hidden shadow-sm"
            >
              <div className="w-full h-full rounded-xl bg-surface-container-low overflow-hidden flex items-center justify-center">
                {user?.profilePic ? (
                  <img className="w-full h-full object-cover" src={user.profilePic} alt={displayName} />
                ) : (
                  <span className="text-xl font-black ud-text-primary">{getDisplayInitial(displayName, "U")}</span>
                )}
              </div>
            </button>
            <h1 className="font-headline-sm text-headline-sm ud-text-primary font-black ">{displayName}</h1>
            <p className="font-label-md text-label-md ud-text-accent mt-0.5 font-black uppercase tracking-[0.2em]">{handle}</p>
            <p className="mt-4 font-body-sm text-body-sm ud-text-primary max-w-[280px] leading-relaxed font-bold italic">{about || "No profile description yet."}</p>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-gutter px-2">
          {stats.map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <span className={`font-headline-sm text-headline-sm font-black ${item.label === "Status" ? "ud-text-accent" : "ud-text-primary"}`}>
                {item.value}
              </span>
              <span className="font-label-sm text-[10px] ud-text-primary uppercase tracking-[0.2em] mt-1 font-black leading-none">{item.label}</span>
            </div>
          ))}
        </section>

        <section className="px-2 text-center">
          <h3 className="font-headline-sm text-body-md ud-text-primary font-black">{joinedDate}</h3>
          <p className="font-label-sm text-[10px] ud-text-secondary uppercase tracking-[0.2em] font-black mt-0.5">Joined</p>
        </section>

        <section className="flex flex-col gap-5">
          <div className="flex justify-between items-center px-2">
            <h2 className="font-label-sm text-[10px] ud-text-primary uppercase tracking-[0.25em] font-black">PUBLIC FEED</h2>
            <button
              onClick={onLoadPosts}
              disabled={isLoading || postsLoading}
              className="bg-primary shadow-[0_6px_16px_rgba(37,99,235,0.3)] text-white font-black py-2 px-8 rounded-full hover:brightness-110 active:scale-95 transition-all text-[11px] tracking-widest"
            >
              {postsLoading ? "Loading..." : "LOAD LATEST"}
            </button>
          </div>

          {postsLoaded && Array.isArray(posts) && posts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {posts.map((post) =>
                renderPostCard(post, {
                  compact: true,
                  autoPlayVideos,
                  onOpenPost,
                })
              )}
            </div>
          ) : (
            <div className="w-full bg-white dark:bg-surface-container-highest/20 rounded-2xl p-10 border border-dashed border-outline-variant/80 dark:border-outline flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-surface-container dark:bg-surface-container flex items-center justify-center mb-4 ud-text-primary">
                <span className="material-symbols-outlined text-3xl font-bold">auto_awesome_motion</span>
              </div>
              <p className="font-label-md text-label-md ud-text-secondary font-black tracking-widest uppercase">
                {postsError || (postsLoaded && posts.length === 0 ? "Empty Feed" : "Tap Load Feed")}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );

  const renderWeb = () => (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white dark:bg-surface-dim font-body-md text-body-md selection:bg-primary/20 ud-text-primary transition-colors duration-300">
      <nav className="sticky top-0 z-[110] bg-white dark:bg-surface-dim flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 shadow-sm md:shadow-none transition-colors border-b border-outline-variant/30">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="material-symbols-outlined ud-text-primary hover:bg-surface-container transition-colors p-2.5 rounded-full active:scale-95 duration-150 text-[24px] font-bold"
          >
            arrow_back
          </button>
          <h1 className="font-headline-sm text-body-lg font-black ud-text-primary uppercase tracking-tight">Profile</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="material-symbols-outlined ud-text-primary hover:bg-surface-container transition-colors p-2.5 rounded-full active:scale-95 duration-150 text-[24px] font-bold">
            settings
          </button>
          <button className="material-symbols-outlined ud-text-primary hover:bg-surface-container transition-colors p-2.5 rounded-full active:scale-95 duration-150 text-[24px] font-bold">
            more_vert
          </button>
        </div>
      </nav>

      <main className="max-w-[760px] mx-auto px-margin-mobile md:px-margin-desktop py-16 space-y-16 ud-text-primary">
        <section className="flex justify-center">
          <div className="bg-white dark:bg-surface-container rounded-2xl p-10 w-full max-w-[520px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-outline-variant dark:border-white/5 flex items-center gap-10">
            <button
              onClick={() => user?.profilePic && onPreviewProfileImage?.(user.profilePic, displayName)}
              className="w-28 h-28 rounded-3xl bg-surface-container-low dark:bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant dark:border-outline shadow-sm"
            >
              {user?.profilePic ? (
                <img className="w-full h-full object-cover" src={user.profilePic} alt={displayName} />
              ) : (
                <span className="text-4xl font-black ud-text-primary">{getDisplayInitial(displayName, "U")}</span>
              )}
            </button>
            <div className="flex flex-col text-left space-y-2">
              <h2 className="font-headline-sm text-headline-sm ud-text-primary font-black tracking-tight">{displayName}</h2>
              <p className="font-label-md text-label-md ud-text-accent font-black uppercase tracking-[0.25em]">{handle}</p>
              <p className="mt-4 font-body-sm text-body-sm ud-text-primary font-bold italic opacity-80 leading-relaxed">
                {about || "No profile description yet."}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-12 max-w-[560px] mx-auto">
          {stats.map((item) => (
            <div key={item.label} className="flex flex-col items-center text-center">
              <span className={`font-headline-sm text-3xl font-black ${item.label === "Status" ? "ud-text-accent" : "ud-text-primary"}`}>
                {item.value}
              </span>
              <span className="font-label-sm text-[10px] ud-text-secondary uppercase tracking-[0.3em] mt-2 font-black leading-none">{item.label}</span>
            </div>
          ))}
        </section>

        <section className="flex flex-col items-center text-center space-y-1">
          <p className="font-headline-sm text-headline-sm ud-text-primary font-black tracking-tight">{joinedDate}</p>
          <p className="font-label-sm text-[10px] ud-text-secondary uppercase tracking-[0.3em] font-black">Joined</p>
        </section>

        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-outline-variant pb-4">
            <h3 className="font-label-sm text-[11px] ud-text-primary uppercase tracking-[0.5em] font-black">PUBLIC FEED</h3>
            <button
              onClick={onLoadPosts}
              disabled={isLoading || postsLoading}
              className="bg-primary text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] font-black px-10 py-3 rounded-full hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]"
            >
              {postsLoading ? "Loading..." : "LOAD LATEST"}
            </button>
          </div>

          {postsLoaded && Array.isArray(posts) && posts.length > 0 ? (
            <div className="flex flex-col gap-8">
              {posts.map((post) =>
                renderPostCard(post, {
                  compact: true,
                  autoPlayVideos,
                  onOpenPost,
                })
              )}
            </div>
          ) : (
            <div className="w-full h-56 flex items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/50 dark:border-outline bg-white/50 dark:bg-surface-container/20 group hover:border-primary transition-all cursor-pointer">
              <div className="flex flex-col items-center space-y-3">
                <span className="material-symbols-outlined text-5xl ud-text-primary font-bold">
                  cloud_off
                </span>
                <p className="font-label-sm text-[11px] ud-text-secondary font-black tracking-[0.4em] uppercase">
                  {postsError || (postsLoaded && posts.length === 0 ? "Empty Feed" : "Tap Load Feed")}
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background dark:bg-surface-dim">
        <StarLoader />
      </div>
    );
  }

  return isMobile ? renderMobile() : renderWeb();
}


function Compose({
  composeForm,
  previewAuthorName,
  previewAuthorHandle,
  composerPreviewBlocks,
  selectedCoverMediaId,
  onSelectCoverMedia,
  onToggleAnonymity,
  onBack,
  onPublish,
  isPublishing,
  publishProgress,
  composeError,
}) {
  return (
    <div className="echoid-compose-screen">
      <header className="echoid-compose-screen-header">
        <button type="button" className="echoid-icon-button" aria-label="Back to editor" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <div className="echoid-compose-screen-title">
          <span className="echoid-section-label">Compose preview</span>
          <strong>Review before publishing</strong>
        </div>
      </header>

      <main className="echoid-compose-screen-body">
        <article className="echoid-post-card echoid-post-card--preview">
          <div className="echoid-compose-preview-toolbar">
            <button
              type="button"
              className={`echoid-cover-toggle ${composeForm.anonymity ? "is-active" : ""}`}
              onClick={() => onToggleAnonymity?.(true)}
              disabled={isPublishing}
            >
              Anonymous
            </button>
            <button
              type="button"
              className={`echoid-cover-toggle ${!composeForm.anonymity ? "is-active" : ""}`}
              onClick={() => onToggleAnonymity?.(false)}
              disabled={isPublishing}
            >
              Use profile
            </button>
          </div>
          <div className="echoid-post-top">
            <div>
              <h3>{previewAuthorName}</h3>
              <div className="echoid-post-meta">
                <span>{previewAuthorHandle}</span>
                <span>now</span>
              </div>
            </div>
            <span className="echoid-post-tag">{toDisplayCategory(composeForm.category)}</span>
          </div>

          {composeForm.title ? <h4 className="echoid-post-title">{composeForm.title}</h4> : null}
          {isConfessionCategory(composeForm.category) && composeForm.subCategory ? (
            <div className="echoid-compose-subtag">{toDisplayCategory(composeForm.subCategory)}</div>
          ) : null}

          <div className="echoid-compose-preview-panel">
            {composerPreviewBlocks.map((block) =>
              block.type === "media" ? (
                <div key={block.key} className="echoid-compose-preview-media-block">
                  <button
                    type="button"
                    className={`echoid-cover-toggle ${selectedCoverMediaId === block.value?.id ? "is-active" : ""}`}
                    onClick={() => onSelectCoverMedia?.(block.value?.id || "")}
                    disabled={!block.value?.id || isPublishing}
                  >
                    {selectedCoverMediaId === block.value?.id ? "Cover media selected" : "Make this cover media"}
                  </button>
                  {renderMediaCard(block.value)}
                </div>
              ) : block.value ? (
                <div key={block.key} className="echoid-compose-preview-text">
                  {block.value}
                </div>
              ) : null
            )}
          </div>
        </article>
      </main>

      <footer className="echoid-compose-screen-footer">
        {composeError ? <div className="echoid-compose-error">{composeError}</div> : null}
        {isPublishing ? (
          <div className="echoid-publish-progress" aria-live="polite">
            <div className="echoid-publish-progress-copy">
              <strong>{`Posting ${publishProgress}%`}</strong>
              <span>Uploading media and sending your echo to the backend.</span>
            </div>
            <div className="echoid-publish-progress-track" aria-hidden="true">
              <div className="echoid-publish-progress-bar" style={{ width: `${publishProgress}%` }} />
            </div>
          </div>
        ) : null}
        <button type="button" className="echoid-primary-btn" onClick={onPublish} disabled={isPublishing}>
          {isPublishing ? `Posting ${publishProgress}%` : "Publish Echo"}
        </button>
      </footer>
    </div>
  );
}

async function pickMediaNative() {
  return new Promise((resolve) => {
    const handler = (event) => {
      window.removeEventListener("MediaSelected", handler);
      const detail = event?.detail || {};
      const names = Array.isArray(detail.names) ? detail.names : [];
      const types = Array.isArray(detail.types) ? detail.types : [];
      const previews = Array.isArray(detail.previews) ? detail.previews : [];

      resolve(
        names.map((name, index) => ({
          name,
          type: String(types[index] || ""),
          preview: String(previews[index] || ""),
        }))
      );
    };

    window.addEventListener("MediaSelected", handler);
    if (window.NativeAds?.pickMediaNative) {
      window.NativeAds.pickMediaNative(0);
      return;
    }

    window.removeEventListener("MediaSelected", handler);
    resolve([]);
  });
}

async function putToSignedUrlWithProgress(uploadUrl, body, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    console.log("[echoid-upload] starting signed upload", {
      uploadUrl,
      contentType: contentType || "application/octet-stream",
      size: body?.size || 0,
      type: body?.type || "",
    });
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded, event.total);
      }
    };
    xhr.onload = () => {
      console.log("[echoid-upload] xhr load", {
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText,
        responseHeaders: xhr.getAllResponseHeaders?.() || "",
      });
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      console.error("[echoid-upload] xhr network error", {
        status: xhr.status,
        statusText: xhr.statusText,
        readyState: xhr.readyState,
        responseURL: xhr.responseURL,
      });
      reject(new Error("Upload failed"));
    };
    xhr.onabort = () => {
      console.warn("[echoid-upload] xhr aborted", {
        status: xhr.status,
        readyState: xhr.readyState,
        responseURL: xhr.responseURL,
      });
      reject(new DOMException("Aborted", "AbortError"));
    };
    xhr.send(body);
  });
}

export default function EchoIdPage({
  host,
  initialPostId = "",
  initialPost = null,
  initialPostLoading = false,
  initialPostError = "",
}) {
  const history = useHistory();
  const { echoIdUnreadNotifications = 0, setEchoIdUnreadNotifications } = useContext(MessageContext) || {};
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });
  const isNativeAndroid = Boolean(Capacitor.isNativePlatform?.() && Capacitor.getPlatform?.() === "android");
  const shouldShowBottomNav = Boolean(Capacitor.isNativePlatform?.() || isMobileLayout);
  const cachedAnonymousProfile = useMemo(() => readAnonymousProfile(), []);
  const cachedOwnPosts = useMemo(() => readOwnPostsCache(), []);
  const fileInputRef = useRef(null);
  const bodyInputRef = useRef(null);
  const mediaObjectUrlsRef = useRef([]);
  const isFeedRequestInFlightRef = useRef(false);
  const isPullRefreshingFeedRef = useRef(false);
  const pullRefreshSettledRef = useRef(false);
  const skipNextFeedLoadRef = useRef(false);
  const feedCacheRef = useRef({});
  const contentRef = useRef(null);
  const [contentElement, setContentElement] = useState(null);
  const homePullLayerRef = useRef(null);
  const pullSpinnerRef = useRef(null);
  const pullRefreshFrameRef = useRef(0);
  const pullRefreshResetTimerRef = useRef(0);
  const pullRefreshHardStopTimerRef = useRef(0);
  const pullRefreshMountedRef = useRef(true);
  const pullRefreshStateRef = useRef({
    current: 0,
    target: 0,
    startY: 0,
    touchId: null,
    isPulling: false,
    isRefreshing: false,
    thresholdHapticFired: false,
  });
  const interactionBatchSignatureRef = useRef("");
  const desktopFilterMenuRef = useRef(null);
  const mobileFilterMenuRef = useRef(null);
  const desktopFilterButtonRef = useRef(null);
  const mobileFilterButtonRef = useRef(null);
  const desktopDrawerButtonRef = useRef(null);
  const mobileDrawerButtonRef = useRef(null);
  const drawerRef = useRef(null);
  const autoPlayPreferenceLoadedRef = useRef(false);

  const [activeTab, setActiveTab] = useState("home");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debouncedUserQuery, setDebouncedUserQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isPullRefreshUiVisible, setIsPullRefreshUiVisible] = useState(false);
  const [pullRefreshNotice, setPullRefreshNotice] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [selectedHomeCategory, setSelectedHomeCategory] = useState("");
  const [anonymousProfile, setAnonymousProfile] = useState(cachedAnonymousProfile);
  const [isAnonymousBootstrapLoading, setIsAnonymousBootstrapLoading] = useState(() => !cachedAnonymousProfile && !!host);
  const [feedPosts, setFeedPosts] = useState(postSeed);
  const [feedPromotions, setFeedPromotions] = useState([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedRefreshRevision, setFeedRefreshRevision] = useState(0);
  const [autoPlayVideos, setAutoPlayVideos] = useState(() => readEchoIdVideoAutoplay());
  const [notificationStorageRevision, setNotificationStorageRevision] = useState(0);
  const [visibleNotificationCount, setVisibleNotificationCount] = useState(10);
  const storedNotifications = useMemo(() => {
    const fromStorage = readEchoIdNotifications();
    return fromStorage.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notificationStorageRevision]);
  const refreshStoredNotifications = useCallback(() => {
    setNotificationStorageRevision((revision) => revision + 1);
  }, []);
  const [ownPosts, setOwnPosts] = useState(cachedOwnPosts);
  const [isOwnPostsLoading, setIsOwnPostsLoading] = useState(() => !cachedOwnPosts.length);
  const [isOwnPostsSyncing, setIsOwnPostsSyncing] = useState(false);
  const [visibleOwnPostsCount, setVisibleOwnPostsCount] = useState(10);
  const [isOwnPostsHidden, setIsOwnPostsHidden] = useState(false);
  const [searchPosts, setSearchPosts] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [isUserSearchLoading, setIsUserSearchLoading] = useState(false);
  const [selectedUserClientId, setSelectedUserClientId] = useState("");
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [selectedUserError, setSelectedUserError] = useState("");
  const [selectedUserPosts, setSelectedUserPosts] = useState([]);
  const [selectedUserPostsLoaded, setSelectedUserPostsLoaded] = useState(false);
  const [selectedUserPostsLoading, setSelectedUserPostsLoading] = useState(false);
  const [selectedUserPostsError, setSelectedUserPostsError] = useState("");
  const [postReactionMap, setPostReactionMap] = useState({});
  const [reactionPendingByPostId, setReactionPendingByPostId] = useState({});
  const [postWitnessMap, setPostWitnessMap] = useState({});
  const [witnessPendingByPostId, setWitnessPendingByPostId] = useState({});
  const [postReportMap, setPostReportMap] = useState({});
  const [reportPendingByPostId, setReportPendingByPostId] = useState({});
  const [deletePendingByPostId, setDeletePendingByPostId] = useState({});
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedPostDetailMap, setSelectedPostDetailMap] = useState({});
  const [selectedPostLoading, setSelectedPostLoading] = useState(false);
  const [selectedPostError, setSelectedPostError] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [witnessPanelPostId, setWitnessPanelPostId] = useState("");
  const [witnessEntriesByPostId, setWitnessEntriesByPostId] = useState({});
  const [witnessEntriesLoadingByPostId, setWitnessEntriesLoadingByPostId] = useState({});
  const [witnessEntriesErrorByPostId, setWitnessEntriesErrorByPostId] = useState({});
  const [commentsByPostId, setCommentsByPostId] = useState({});
  const [commentLoadingByPostId, setCommentLoadingByPostId] = useState({});
  const [commentLoadingMoreByPostId, setCommentLoadingMoreByPostId] = useState({});
  const [commentPageByPostId, setCommentPageByPostId] = useState({});
  const [commentHasMoreByPostId, setCommentHasMoreByPostId] = useState({});
  const [commentErrorByPostId, setCommentErrorByPostId] = useState({});
  const [commentsVisibleByPostId, setCommentsVisibleByPostId] = useState({});
  const [commentDraftByPostId, setCommentDraftByPostId] = useState({});
  const [commentSubmittingByPostId, setCommentSubmittingByPostId] = useState({});
  const [commentSubmitErrorByPostId, setCommentSubmitErrorByPostId] = useState({});
  const [replyTargetByPostId, setReplyTargetByPostId] = useState({});
  const [repliesByCommentId, setRepliesByCommentId] = useState({});
  const [replyLoadingByCommentId, setReplyLoadingByCommentId] = useState({});
  const [replyErrorByCommentId, setReplyErrorByCommentId] = useState({});
  const [replyVisibleByCommentId, setReplyVisibleByCommentId] = useState({});
  const [composeForm, setComposeForm] = useState(initialComposeState);
  const [composeMedia, setComposeMedia] = useState([]);
  const [selectedCoverMediaId, setSelectedCoverMediaId] = useState("");
  const [composeError, setComposeError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [isComposePreviewOpen, setIsComposePreviewOpen] = useState(false);
  const anonymousPosterSecret = readAnonymousPosterSecret();
  const anonymousClientId = String(anonymousProfile?.clientId || cachedAnonymousProfile?.clientId || "").trim();
  const anonymousPosterClientId = String(anonymousPosterSecret?.anonymousId || "").trim();
  const anonymousPosterAuthsec = String(anonymousPosterSecret?.authsec || "").trim();
  const anonymousPostAuthPayload = anonymousPosterClientId && anonymousPosterAuthsec
    ? { clientId: anonymousPosterClientId, authsec: anonymousPosterAuthsec }
    : null;
  const updateAnonymousProfileState = (patch) => {
    if (!patch) return;
    setAnonymousProfile((prev) => {
      if (!prev) return prev;
      const next =
        patch?.trustScoreDelta !== undefined
          ? { ...prev, trustScore: clampNumber(Number(prev?.trustScore || 0) + Number(patch.trustScoreDelta || 0), -10, 45) }
          : {
            ...prev,
            ...patch,
            trustScore:
              patch?.trustScore !== undefined ? clampNumber(patch.trustScore, -10, 45) : clampNumber(prev?.trustScore, -10, 45),
          };
      saveAnonymousProfile(next);
      return next;
    });
  };

  const getCurrentPostSnapshot = (postId) => {
    const normalizedPostId = String(postId || "").trim();
    if (!normalizedPostId) return null;

    return (
      selectedPostDetailMap[normalizedPostId] ||
      feedPosts.find((entry) => getPostId(entry) === normalizedPostId) ||
      searchPosts.find((entry) => getPostId(entry) === normalizedPostId) ||
      ownPosts.find((entry) => getPostId(entry) === normalizedPostId) ||
      postSeed.find((entry) => getPostId(entry) === normalizedPostId) ||
      null
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsMobileLayout(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let active = true;
    readEchoIdVideoAutoplayPreference().then((enabled) => {
      if (!active) return;
      autoPlayPreferenceLoadedRef.current = true;
      setAutoPlayVideos(Boolean(enabled));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!autoPlayPreferenceLoadedRef.current) return;
    saveEchoIdVideoAutoplayPreference(autoPlayVideos);
  }, [autoPlayVideos]);

  useEffect(() => {
    const normalizedInitialPostId = String(initialPostId || "").trim();
    if (!normalizedInitialPostId) return;

    setSelectedUserClientId("");
    setSelectedPostId(normalizedInitialPostId);
    setSelectedPostError("");
    setWitnessPanelPostId("");
    setIsComposePreviewOpen(false);
    setActiveTab("home");
  }, [initialPostId]);

  const mergeIncomingPostWithLocalState = (incomingPost, currentPost = null) => {
    const normalizedIncomingPost = normalizePostRecord(incomingPost);
    const postId = getPostId(normalizedIncomingPost);
    if (!postId) return normalizedIncomingPost;

    const normalizedCurrentPost = currentPost ? normalizePostRecord(currentPost) : normalizePostRecord(getCurrentPostSnapshot(postId) || {});
    const loadedTopLevelCommentsCount = Array.isArray(commentsByPostId[postId]) ? commentsByPostId[postId].filter((entry) => !entry?.parentId).length : 0;

    return normalizePostRecord({
      ...normalizedCurrentPost,
      ...normalizedIncomingPost,
      likes: Math.max(Number(normalizedIncomingPost?.likes || 0), Number(normalizedCurrentPost?.likes || 0)),
      dislike: Math.max(
        Number(normalizedIncomingPost?.dislike ?? normalizedIncomingPost?.dislikes ?? 0),
        Number(normalizedCurrentPost?.dislike ?? normalizedCurrentPost?.dislikes ?? 0)
      ),
      comments: Math.max(
        Number(normalizedIncomingPost?.comments || 0),
        Number(normalizedCurrentPost?.comments || 0),
        loadedTopLevelCommentsCount
      ),
      userReaction: hasOwn(postReactionMap, postId)
        ? normalizeUserReactionValue(postReactionMap[postId])
        : normalizeUserReactionValue(normalizedIncomingPost?.userReaction ?? normalizedCurrentPost?.userReaction),
      userWitness: hasOwn(postWitnessMap, postId)
        ? normalizeWitnessValue(postWitnessMap[postId])
        : normalizeWitnessValue(normalizedIncomingPost?.userWitness ?? normalizedCurrentPost?.userWitness),
    });
  };

  const mergeIncomingPostCollectionWithLocalState = (incomingPosts, currentPosts = []) => {
    const currentPostsById = new Map(normalizePostCollection(currentPosts).map((entry) => [getPostId(entry), entry]));
    return normalizePostCollection(incomingPosts).map((entry) => mergeIncomingPostWithLocalState(entry, currentPostsById.get(getPostId(entry))));
  };

  useEffect(() => {
    const normalizedInitialPostId = String(initialPostId || "").trim();
    if (!normalizedInitialPostId) return;

    setSelectedPostLoading(Boolean(initialPostLoading));
    setSelectedPostError(initialPostError || "");

    if (!initialPost) return;

    const normalizedPost = mergeIncomingPostWithLocalState(initialPost);
    const postId = getPostId(normalizedPost) || normalizedInitialPostId;
    setSelectedPostDetailMap((prev) => ({
      ...prev,
      [postId]: {
        ...normalizedPost,
        _id: postId,
      },
    }));
  }, [initialPost, initialPostError, initialPostId, initialPostLoading]);

  const showAnonymousBannedModal = async (message) => {
    clearAnonymousProfile();
    clearOwnPostsCache();
    setAnonymousProfile(null);
    setOwnPosts([]);
    await Swal.fire({
      title: "Anonymous account banned",
      text: message || "Your anonymous account has been banned. If you feel this is a mistake, email the devs.",
      icon: "error",
      confirmButtonText: "OK",
      width: 320,
      padding: "1.2rem",
      backdrop: "rgba(0,0,0,0.4)",
      customClass: { popup: "mobile-alert" },
    });
    history.replace("/home");
  };

  const showEchoToast = async (title, icon = "info") =>
    Swal.fire({
      toast: true,
      position: "top",
      timer: 2200,
      timerProgressBar: true,
      showConfirmButton: false,
      icon,
      title,
    });

  const getElasticPullDistance = (rawDistance) => {
    const distance = Math.max(0, Number(rawDistance) || 0);
    // Drag physics: the denominator grows with distance, so every extra pixel of finger travel
    // contributes less visual movement. This creates the "harder to pull further" native feel.
    const resisted = distance / (1 + distance / 260);
    return Math.min(ECHOID_PULL_REFRESH_MAX, resisted);
  };

  const clearPullRefreshStyles = () => {
    const state = pullRefreshStateRef.current;
    state.current = 0;
    state.target = 0;
    state.isPulling = false;
    state.isRefreshing = false;
    state.touchId = null;
    state.thresholdHapticFired = false;
    pullRefreshSettledRef.current = true;

    if (pullRefreshFrameRef.current) {
      window.cancelAnimationFrame(pullRefreshFrameRef.current);
      pullRefreshFrameRef.current = 0;
    }
    if (pullRefreshHardStopTimerRef.current) {
      window.clearTimeout(pullRefreshHardStopTimerRef.current);
      pullRefreshHardStopTimerRef.current = 0;
    }

    const layer = homePullLayerRef.current;
    const spinner = pullSpinnerRef.current;
    if (layer) {
      layer.style.transform = "";
      layer.style.willChange = "";
    }
    if (spinner) {
      spinner.style.opacity = "0";
      spinner.style.transform = "translate3d(-50%, 0, 0) scale(0.72)";
      spinner.classList.remove("is-refreshing");
    }
    if (pullRefreshMountedRef.current) {
      setIsPullRefreshUiVisible(false);
    }
  };

  const applyPullRefreshFrame = () => {
    const state = pullRefreshStateRef.current;
    pullRefreshFrameRef.current = 0;

    // Momentum/easing: chase the target instead of snapping to it, which keeps both drag
    // tracking and spring-back smooth without asking React to re-render every touch frame.
    state.current += (state.target - state.current) * 0.24;
    if (Math.abs(state.target - state.current) < 0.25) {
      state.current = state.target;
    }

    const layer = homePullLayerRef.current;
    const spinner = pullSpinnerRef.current;
    const progress = clampNumber(state.current / ECHOID_PULL_REFRESH_THRESHOLD, 0, 1);
    const opacity = state.isRefreshing ? 1 : progress;
    const scale = state.isRefreshing ? 1 : 0.72 + progress * 0.28;

    if (pullRefreshSettledRef.current && !state.isPulling && !state.isRefreshing && state.target === 0 && state.current < 1) {
      clearPullRefreshStyles();
      return;
    }

    if (layer) {
      layer.style.transform = state.current > 0 ? `translate3d(0, ${state.current}px, 0)` : "";
      layer.style.willChange = state.current > 0 ? "transform" : "";
    }
    if (spinner) {
      spinner.style.opacity = String(opacity);
      spinner.style.transform = `translate3d(-50%, ${Math.max(4, state.current * 0.34)}px, 0) scale(${scale})`;
      spinner.classList.toggle("is-refreshing", state.isRefreshing);
    }

    if (Math.abs(state.target - state.current) > 0.25) {
      pullRefreshFrameRef.current = window.requestAnimationFrame(applyPullRefreshFrame);
      return;
    }

    if (!state.isPulling && !state.isRefreshing && state.current === 0) {
      clearPullRefreshStyles();
    }
  };

  const schedulePullRefreshFrame = () => {
    if (pullRefreshFrameRef.current) return;
    pullRefreshFrameRef.current = window.requestAnimationFrame(applyPullRefreshFrame);
  };

  const resetPullRefreshPosition = () => {
    const state = pullRefreshStateRef.current;
    if (pullRefreshResetTimerRef.current) {
      window.clearTimeout(pullRefreshResetTimerRef.current);
      pullRefreshResetTimerRef.current = 0;
    }
    pullRefreshSettledRef.current = true;
    // Animation reset logic: release updates only the target; the RAF spring loop eases the
    // content back to zero so failed pulls and completed refreshes both settle naturally.
    state.target = 0;
    state.isPulling = false;
    state.isRefreshing = false;
    state.thresholdHapticFired = false;
    schedulePullRefreshFrame();

    // Rerenders during a feed refresh can preserve inline transform/opacity at the hold point.
    // This fallback force-clears the layer after the spring-back window, so the loader cannot
    // get stuck visible even if the RAF is interrupted by data updates or route changes.
    pullRefreshResetTimerRef.current = window.setTimeout(() => {
      pullRefreshResetTimerRef.current = 0;
      clearPullRefreshStyles();
    }, 520);
  };

  const refreshHomeFeedFromPull = async () => {
    const startedAt = Date.now();
    const cacheKey = `${sortBy}::${selectedHomeCategory || "all"}`;

    try {
      if (!host) {
        await wait(ECHOID_PULL_REFRESH_MIN_MS);
        return;
      }

      isFeedRequestInFlightRef.current = true;
      isPullRefreshingFeedRef.current = true;
      pullRefreshSettledRef.current = false;
      setIsFeedLoadingMore(false);
      setFeedHasMore(true);
      delete feedCacheRef.current[cacheKey];

      const backendFilter = sortBy === "date" ? "time" : "like";
      const response = await withTimeout(
        api.postFeed(host, {
          filter: backendFilter,
          page: 1,
          refreshKey: Date.now(),
          ...(selectedHomeCategory ? { category: selectedHomeCategory } : {}),
        }),
        ECHOID_PULL_REFRESH_MAX_MS
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Feed refresh failed with status ${response.status}`);
      }

      // Pull refresh is a hard page-1 replacement: do not merge with the previous feed array,
      // because stale card/component state should be discarded when the new feed arrives.
      const nextPosts = normalizePostCollection(json.posts);
      const nextPromotions = normalizePostCollection(json.promotions).filter(isPromotionPost);
      const sortedPosts =
        sortBy === "least-popularity"
          ? [...nextPosts].sort((left, right) => Number(left.likes || 0) - Number(right.likes || 0))
          : nextPosts;

      if (!pullRefreshMountedRef.current) return;
      setFeedHasMore(Boolean(json?.hasMore));
      if (feedPage !== 1) {
        skipNextFeedLoadRef.current = true;
      }
      setFeedPage(1);
      setFeedPromotions(nextPromotions);
      setFeedPosts(() => sortedPosts);
      setFeedRefreshRevision((current) => current + 1);
      pullRefreshSettledRef.current = true;
      feedCacheRef.current[cacheKey] = {
        posts: sortedPosts,
        promotions: nextPromotions,
        page: 1,
        hasMore: Boolean(json?.hasMore),
      };
      fetchReactionBatch(sortedPosts);
    } catch (error) {
      console.warn("Failed to refresh EchoId feed:", error);
      if (pullRefreshMountedRef.current) {
        setPullRefreshNotice("Problem fetching feed");
      }
    } finally {
      const remaining = ECHOID_PULL_REFRESH_MIN_MS - (Date.now() - startedAt);
      if (remaining > 0) await wait(remaining);
      isFeedRequestInFlightRef.current = false;
      isPullRefreshingFeedRef.current = false;
      pullRefreshSettledRef.current = true;
      if (pullRefreshMountedRef.current) {
        setIsFeedLoading(false);
        setIsFeedLoadingMore(false);
      }
    }
  };

  const completePullRefresh = async () => {
    const state = pullRefreshStateRef.current;
    setIsPullRefreshUiVisible(true);
    setPullRefreshNotice("");
    pullRefreshSettledRef.current = false;
    state.isRefreshing = true;
    state.target = ECHOID_PULL_REFRESH_HOLD;
    schedulePullRefreshFrame();

    if (pullRefreshHardStopTimerRef.current) {
      window.clearTimeout(pullRefreshHardStopTimerRef.current);
    }
    pullRefreshHardStopTimerRef.current = window.setTimeout(() => {
      pullRefreshHardStopTimerRef.current = 0;
      const wasSettled = pullRefreshSettledRef.current;
      isFeedRequestInFlightRef.current = false;
      isPullRefreshingFeedRef.current = false;
      pullRefreshSettledRef.current = true;
      if (pullRefreshMountedRef.current) {
        setIsFeedLoading(false);
        setIsFeedLoadingMore(false);
        if (!wasSettled) {
          setPullRefreshNotice("Problem fetching feed");
        }
      }
      clearPullRefreshStyles();
    }, ECHOID_PULL_REFRESH_MAX_MS);

    try {
      await refreshHomeFeedFromPull();
    } finally {
      if (!pullRefreshMountedRef.current) return;
      pullRefreshSettledRef.current = true;
      isPullRefreshingFeedRef.current = false;
      state.isRefreshing = false;
      resetPullRefreshPosition();
      window.setTimeout(() => {
        if (pullRefreshMountedRef.current) clearPullRefreshStyles();
      }, 700);
    }
  };

  useEffect(() => {
    if (!host) {
      setIsAnonymousBootstrapLoading(false);
      return undefined;
    }

    let active = true;

    const syncAnonymousProfile = async () => {
      try {
        const res = await api.anonymousMe(host);
        const json = await res.json();
        if (!active) return;

        if (res.status === 403 && json?.banned) {
          await showAnonymousBannedModal(json?.message);
          return;
        }

        const nextAnonymousProfile = json?.userResponse || null;
        if (res.status === 404 || !res.ok || !json?.success || !nextAnonymousProfile) {
          clearAnonymousProfile();
          clearOwnPostsCache();
          setAnonymousProfile(null);
          setOwnPosts([]);
          history.replace("/anonymous/create", { mode: "create" });
          return;
        }

        saveAnonymousProfile(nextAnonymousProfile);
        if (nextAnonymousProfile.anonymousPosterVault) {
          await saveAnonymousPosterSecretFromVault(nextAnonymousProfile.anonymousPosterVault).catch(() => null);
        }
        setAnonymousProfile(nextAnonymousProfile);
      } catch (err) {
        if (!active) return;
        if (!cachedAnonymousProfile) {
          await Swal.fire({
            title: "Unable to open EchoId",
            text: err?.message || "Failed to load anonymous profile.",
            icon: "error",
            confirmButtonText: "OK",
            width: 320,
            padding: "1.2rem",
            backdrop: "rgba(0,0,0,0.4)",
            customClass: { popup: "mobile-alert" },
          });
          history.replace("/home");
        }
      } finally {
        if (active) {
          setIsAnonymousBootstrapLoading(false);
        }
      }
    };

    syncAnonymousProfile();
    return () => {
      active = false;
    };
  }, [cachedAnonymousProfile, history, host]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedUserQuery(query);
    }, 1100);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (String(initialPostId || "").trim()) return;

    setSelectedPostId("");
    setSelectedUserClientId("");
    setWitnessPanelPostId("");
    setIsComposePreviewOpen(false);
  }, [activeTab, initialPostId]);

  useEffect(() => {
    return () => {
      mediaObjectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore revoke errors
        }
      });
      mediaObjectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (activeTab === "home") return undefined;
    resetPullRefreshPosition();
    return undefined;
  }, [activeTab]);

  useEffect(() => {
    if (!pullRefreshNotice) return undefined;
    const timeoutId = window.setTimeout(() => {
      setPullRefreshNotice("");
    }, 2600);
    return () => window.clearTimeout(timeoutId);
  }, [pullRefreshNotice]);

  useEffect(() => {
    return () => {
      pullRefreshMountedRef.current = false;
      if (pullRefreshResetTimerRef.current) {
        window.clearTimeout(pullRefreshResetTimerRef.current);
        pullRefreshResetTimerRef.current = 0;
      }
      if (pullRefreshHardStopTimerRef.current) {
        window.clearTimeout(pullRefreshHardStopTimerRef.current);
        pullRefreshHardStopTimerRef.current = 0;
      }
      if (pullRefreshFrameRef.current) {
        window.cancelAnimationFrame(pullRefreshFrameRef.current);
        pullRefreshFrameRef.current = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (!host || activeTab !== "home") return;
    const cacheKey = `${sortBy}::${selectedHomeCategory || "all"}`;
    const cachedFeed = feedCacheRef.current[cacheKey];
    if (cachedFeed) {
      setFeedPosts(cachedFeed.posts || []);
      setFeedPromotions(cachedFeed.promotions || []);
      setFeedPage(cachedFeed.page || 1);
      setFeedHasMore(Boolean(cachedFeed.hasMore));
      return;
    }

    setFeedPage(1);
    setFeedHasMore(true);
    setFeedPosts([]);
    setFeedPromotions([]);
  }, [activeTab, host, sortBy, selectedHomeCategory]);

  const fetchReactionBatch = async (posts) => {
    if (!host || !anonymousClientId) return;
    const normalizedPosts = normalizePostCollection(posts).filter((post) => !isPromotionPost(post));
    const postIds = normalizedPosts.map((post) => post._id).filter(Boolean);
    const witnessPostIds = normalizedPosts.filter((post) => shouldShowWitness(post.category)).map((post) => post._id);
    if (!postIds.length) return;

    try {
      const response = await api.postReactionsBatch(host, {
        clientId: anonymousClientId,
        postIds,
        witnessPostIds,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) return;
      setPostReactionMap((prev) => mergeReactionEntriesIntoMap(prev, json?.reactions));
      setPostWitnessMap((prev) => mergeWitnessEntriesIntoMap(prev, json?.witnesses));
    } catch (error) {
      console.warn("Failed to fetch EchoId reactions:", error);
    }
  };

  const syncReactionCountsAcrossCollections = (postId, nextValue, counts = {}) => {
    const normalizedPostId = String(postId || "").trim();
    if (!normalizedPostId) return;

    const applyToPosts = (posts) =>
      (Array.isArray(posts) ? posts : []).map((entry) => {
        if (getPostId(entry) !== normalizedPostId) return entry;
        return normalizePostRecord({
          ...entry,
          likes: Number(counts.likes ?? entry?.likes ?? 0),
          dislike: Number(counts.dislikes ?? counts.dislike ?? entry?.dislike ?? entry?.dislikes ?? 0),
          userReaction: nextValue,
        });
      });

    Object.keys(feedCacheRef.current).forEach((cacheKey) => {
      const cacheEntry = feedCacheRef.current[cacheKey];
      if (!cacheEntry) return;
      feedCacheRef.current[cacheKey] = {
        ...cacheEntry,
        posts: applyToPosts(cacheEntry.posts),
      };
    });

    setFeedPosts((prev) => applyToPosts(prev));
    setSearchPosts((prev) => applyToPosts(prev));
    setOwnPosts((prev) => applyToPosts(prev));
    setSelectedUserPosts((prev) => applyToPosts(prev));
    setSelectedPostDetailMap((prev) => {
      const current = prev[normalizedPostId];
      if (!current) return prev;
      return {
        ...prev,
        [normalizedPostId]: normalizePostRecord({
          ...current,
          likes: Number(counts.likes ?? current?.likes ?? 0),
          dislike: Number(counts.dislikes ?? counts.dislike ?? current?.dislike ?? current?.dislikes ?? 0),
          userReaction: nextValue,
        }),
      };
    });
    setPostReactionMap((prev) => ({
      ...prev,
      [normalizedPostId]: normalizeUserReactionValue(nextValue),
    }));
  };

  const syncCommentCountAcrossCollections = (postId, nextCommentCount) => {
    const normalizedPostId = String(postId || "").trim();
    if (!normalizedPostId) return;

    const applyToPosts = (posts) =>
      (Array.isArray(posts) ? posts : []).map((entry) => {
        if (getPostId(entry) !== normalizedPostId) return entry;
        return normalizePostRecord({
          ...entry,
          comments: Number(nextCommentCount ?? entry?.comments ?? 0),
        });
      });

    Object.keys(feedCacheRef.current).forEach((cacheKey) => {
      const cacheEntry = feedCacheRef.current[cacheKey];
      if (!cacheEntry) return;
      feedCacheRef.current[cacheKey] = {
        ...cacheEntry,
        posts: applyToPosts(cacheEntry.posts),
      };
    });

    setFeedPosts((prev) => applyToPosts(prev));
    setSearchPosts((prev) => applyToPosts(prev));
    setOwnPosts((prev) => applyToPosts(prev));
    setSelectedUserPosts((prev) => applyToPosts(prev));
    setSelectedPostDetailMap((prev) => {
      const current = prev[normalizedPostId];
      if (!current) return prev;
      return {
        ...prev,
        [normalizedPostId]: normalizePostRecord({
          ...current,
          comments: Number(nextCommentCount ?? current?.comments ?? 0),
        }),
      };
    });
  };

  const syncWitnessAcrossCollections = (postId, nextWitnessValue, nextWitnessCount) => {
    const normalizedPostId = String(postId || "").trim();
    if (!normalizedPostId) return;

    const applyToPosts = (posts) =>
      (Array.isArray(posts) ? posts : []).map((entry) => {
        if (getPostId(entry) !== normalizedPostId) return entry;
        return normalizePostRecord({
          ...entry,
          witness: Math.max(0, Number(nextWitnessCount ?? entry?.witness ?? 0)),
        });
      });

    Object.keys(feedCacheRef.current).forEach((cacheKey) => {
      const cacheEntry = feedCacheRef.current[cacheKey];
      if (!cacheEntry) return;
      feedCacheRef.current[cacheKey] = {
        ...cacheEntry,
        posts: applyToPosts(cacheEntry.posts),
      };
    });

    setFeedPosts((prev) => applyToPosts(prev));
    setSearchPosts((prev) => applyToPosts(prev));
    setOwnPosts((prev) => applyToPosts(prev));
    setSelectedUserPosts((prev) => applyToPosts(prev));
    setSelectedPostDetailMap((prev) => {
      const current = prev[normalizedPostId];
      if (!current) return prev;
      return {
        ...prev,
        [normalizedPostId]: normalizePostRecord({
          ...current,
          witness: Math.max(0, Number(nextWitnessCount ?? current?.witness ?? 0)),
        }),
      };
    });
    setPostWitnessMap((prev) => ({
      ...prev,
      [normalizedPostId]: Boolean(nextWitnessValue),
    }));
  };

  const handleReactToPost = async (post, reactionValue) => {
    const postId = getPostId(post);
    if (!host || !anonymousClientId || !postId || reactionPendingByPostId[postId]) return;

    setReactionPendingByPostId((prev) => ({ ...prev, [postId]: true }));
    try {
      const currentReaction = normalizeUserReactionValue(postReactionMap[postId] ?? post?.userReaction);
      const nextReaction = currentReaction === reactionValue ? 0 : reactionValue;
      const response =
        reactionValue === 1
          ? await api.postLike(host, postId, { clientId: anonymousClientId })
          : await api.postDislike(host, postId, { clientId: anonymousClientId });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) return;

      syncReactionCountsAcrossCollections(postId, nextReaction, {
        likes: Number(json?.likes ?? post?.likes ?? 0),
        dislikes: Number(json?.dislikes ?? post?.dislike ?? post?.dislikes ?? 0),
      });
      updateAnonymousProfileState(buildAnonymousProfilePatchFromReaction(json, reactionValue));
    } catch (error) {
      console.warn("Failed to react to EchoId post:", error);
    } finally {
      setReactionPendingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleWitnessPost = async (post) => {
    const postId = getPostId(post);
    if (!host || !anonymousClientId || !postId || !shouldShowWitness(post?.category) || witnessPendingByPostId[postId]) return;

    setWitnessPendingByPostId((prev) => ({ ...prev, [postId]: true }));
    try {
      const currentWitness = normalizeWitnessValue(postWitnessMap[postId]);
      const response = currentWitness
        ? await api.postUnwitness(host, postId, { clientId: anonymousClientId })
        : await api.postWitness(host, postId, { clientId: anonymousClientId });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        if (json?.message) {
          await showEchoToast(json.message, "warning");
        }
        return;
      }

      const nextWitnessValue = !currentWitness;
      syncWitnessAcrossCollections(postId, nextWitnessValue, Number(json?.witness ?? post?.witness ?? 0));

      if (currentWitness) {
        setWitnessEntriesByPostId((prev) => {
          const entries = Array.isArray(prev[postId]) ? prev[postId] : [];
          if (!entries.length) return prev;
          return {
            ...prev,
            [postId]: entries.filter((entry) => String(entry?.clientId || "").trim() !== anonymousClientId),
          };
        });
      }
    } catch (error) {
      console.warn("Failed to toggle EchoId witness:", error);
    } finally {
      setWitnessPendingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleReportPost = async (post) => {
    const postId = getPostId(post);
    if (!host || !anonymousClientId || !postId || reportPendingByPostId[postId] || postReportMap[postId]) return;

    const { isConfirmed, value: reason } = await Swal.fire({
      title: "Report post",
      input: "select",
      inputOptions: {
        spam: "Spam",
        harassment: "Harassment",
        explicit: "Explicit",
        hate: "Hate",
        misinformation: "Misinformation",
        violence: "Violence",
        "self-harm": "Self-harm",
        illegal: "Illegal",
        other: "Other",
      },
      inputPlaceholder: "Select a reason",
      showCancelButton: true,
      confirmButtonText: "Report",
    });

    if (!isConfirmed || !reason) return;

    setReportPendingByPostId((prev) => ({ ...prev, [postId]: true }));
    try {
      const response = await api.postReport(host, postId, { clientId: anonymousClientId, reason });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not report this post.");
      }

      setPostReportMap((prev) => ({ ...prev, [postId]: true }));
      await showEchoToast(json?.alreadyReported ? "Post already reported" : "Post reported", "success");
    } catch (error) {
      console.warn("Failed to report EchoId post:", error);
      await showEchoToast(error?.message || "Could not report this post.", "error");
    } finally {
      setReportPendingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleDeletePost = async (post) => {
    const postId = getPostId(post);
    const isAnonymousPosterPost = Boolean(post?.anonymity) && String(post?.posterId || "").trim() === anonymousPosterClientId;
    if (!host || !postId || deletePendingByPostId[postId]) return;
    if (isAnonymousPosterPost && !anonymousPostAuthPayload) {
      await showEchoToast("Anonymous posting credentials are missing. Login to anonymous mode again.", "error");
      return;
    }
    if (!isAnonymousPosterPost && !anonymousClientId) return;

    const result = await Swal.fire({
      title: "Delete post?",
      text: "This will remove the post from your EchoId profile.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    setDeletePendingByPostId((prev) => ({ ...prev, [postId]: true }));
    try {
      const response = isAnonymousPosterPost
        ? await api.anonymousPostDelete(host, postId, {
          ...anonymousPostAuthPayload,
          reason: "deleting request from owner",
        })
        : await api.postDelete(host, postId, {
          clientId: anonymousClientId,
          reason: "deleting request from owner",
        });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not delete this post.");
      }

      const removeFromPosts = (posts) => (Array.isArray(posts) ? posts.filter((entry) => getPostId(entry) !== postId) : []);
      setFeedPosts((prev) => removeFromPosts(prev));
      setSearchPosts((prev) => removeFromPosts(prev));
      setOwnPosts((prev) => {
        const next = removeFromPosts(prev);
        saveOwnPostsCache(next);
        return next;
      });
      setSelectedPostDetailMap((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      if (selectedPostId === postId) {
        handleClosePost();
      }

      await showEchoToast(json?.flagged ? "Post flagged for review" : "Post deleted", "success");
    } catch (error) {
      console.warn("Failed to delete EchoId post:", error);
      await showEchoToast(error?.message || "Could not delete this post.", "error");
    } finally {
      setDeletePendingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!host || activeTab !== "home") return undefined;
    if (skipNextFeedLoadRef.current) {
      skipNextFeedLoadRef.current = false;
      return undefined;
    }

    let active = true;

    const loadFeed = async () => {
      isFeedRequestInFlightRef.current = true;
      if (feedPage === 1) {
        setIsFeedLoading(true);
      } else {
        setIsFeedLoadingMore(true);
      }

      try {
        const backendFilter = sortBy === "date" ? "time" : "like";
        const response = await api.postFeed(host, {
          filter: backendFilter,
          page: feedPage,
          ...(selectedHomeCategory ? { category: selectedHomeCategory } : {}),
        });
        const json = await response.json().catch(() => ({}));
        if (!active || !response.ok || !json?.success) return;

        const nextPosts = mergeIncomingPostCollectionWithLocalState(json.posts, feedPage === 1 ? [] : feedPosts);
        const nextPromotions = normalizePostCollection(json.promotions).filter(isPromotionPost);
        setFeedHasMore(Boolean(json?.hasMore));
        fetchReactionBatch(nextPosts);
        if (feedPage === 1) {
          setFeedPromotions(nextPromotions);
        }
        setFeedPosts((prev) => {
          const merged = feedPage === 1 ? nextPosts : [...prev, ...nextPosts];
          const deduped = merged.filter(
            (post, index, items) => items.findIndex((entry) => String(entry?._id || entry?.id || "") === String(post?._id || post?.id || "")) === index
          );
          const sortedPosts = sortBy === "least-popularity"
            ? [...deduped].sort((left, right) => Number(left.likes || 0) - Number(right.likes || 0))
            : deduped;
          feedCacheRef.current[`${sortBy}::${selectedHomeCategory || "all"}`] = {
            posts: sortedPosts,
            promotions: feedPage === 1 ? nextPromotions : feedPromotions,
            page: feedPage,
            hasMore: Boolean(json?.hasMore),
          };
          return sortedPosts;
        });
      } catch (error) {
        if (!active) return;
        console.warn("Failed to fetch EchoId feed:", error);
      } finally {
        isFeedRequestInFlightRef.current = false;
        if (active) {
          setIsFeedLoading(false);
          setIsFeedLoadingMore(false);
        }
      }
    };

    loadFeed();
    return () => {
      active = false;
      isFeedRequestInFlightRef.current = false;
    };
  }, [activeTab, host, sortBy, selectedHomeCategory, feedPage]);

  useEffect(() => {
    if (!host || activeTab !== "search") return undefined;

    const normalizedQuery = debouncedQuery.trim();
    if (!normalizedQuery || normalizedQuery.startsWith("@")) {
      setSearchPosts([]);
      setIsSearchLoading(false);
      return undefined;
    }

    let active = true;

    const loadSearchPosts = async () => {
      setIsSearchLoading(true);
      try {
        const response = await api.postSearch(host, normalizedQuery);
        const json = await response.json().catch(() => ({}));
        if (!active || !response.ok || !json?.success) return;
        const nextPosts = mergeIncomingPostCollectionWithLocalState(json.posts, searchPosts);
        setSearchPosts(nextPosts);
        fetchReactionBatch(nextPosts);
      } catch (error) {
        if (!active) return;
        console.warn("Failed to search EchoId posts:", error);
      } finally {
        if (active) {
          setIsSearchLoading(false);
        }
      }
    };

    loadSearchPosts();
    return () => {
      active = false;
    };
  }, [activeTab, debouncedQuery, host]);

  useEffect(() => {
    if (!host || activeTab !== "search") return undefined;

    const normalizedQuery = debouncedUserQuery.trim().replace(/^@+/, "").toLowerCase();
    if (!normalizedQuery || debouncedUserQuery.trim().charAt(0) !== "@") {
      setSearchUsers([]);
      setIsUserSearchLoading(false);
      return undefined;
    }

    let active = true;

    const loadSearchUsers = async () => {
      setIsUserSearchLoading(true);
      try {
        const response = await api.anonymousUserByUsername(host, normalizedQuery);
        const json = await response.json().catch(() => ({}));
        if (!active || !response.ok || !json?.success) {
          if (active) setSearchUsers([]);
          return;
        }

        const nextUsers = Array.isArray(json?.userResponse)
          ? json.userResponse.map(normalizeSearchUserResult).filter(Boolean)
          : [normalizeSearchUserResult(json?.userResponse)].filter(Boolean);
        setSearchUsers(nextUsers);
      } catch (error) {
        if (!active) return;
        console.warn("Failed to search EchoId users:", error);
        setSearchUsers([]);
      } finally {
        if (active) {
          setIsUserSearchLoading(false);
        }
      }
    };

    loadSearchUsers();
    return () => {
      active = false;
    };
  }, [activeTab, debouncedUserQuery, host]);

  useEffect(() => {
    if (!host || activeTab !== "profile") return undefined;

    let active = true;

    const loadOwnPosts = async () => {
      setIsOwnPostsLoading(!ownPosts.length);
      setIsOwnPostsSyncing(Boolean(ownPosts.length));
      try {
        const responses = await Promise.all([
          api.postMyPosts(host),
          anonymousPostAuthPayload ? api.postMyAnonymousPosts(host, anonymousPostAuthPayload) : Promise.resolve(null),
        ]);
        const [normalResponse, anonymousResponse] = responses;
        const normalJson = await normalResponse.json().catch(() => ({}));
        const anonymousJson = anonymousResponse ? await anonymousResponse.json().catch(() => ({})) : { posts: [] };
        if (!active || !normalResponse.ok || !normalJson?.success) return;
        const allPosts = [
          ...(Array.isArray(normalJson.posts) ? normalJson.posts : []),
          ...(anonymousResponse?.ok && anonymousJson?.success && Array.isArray(anonymousJson.posts) ? anonymousJson.posts : []),
        ];
        const nextPosts = mergeIncomingPostCollectionWithLocalState(allPosts, ownPosts);
        setOwnPosts(nextPosts);
        saveOwnPostsCache(nextPosts);
      } catch (error) {
        if (!active) return;
        console.warn("Failed to fetch own EchoId posts:", error);
      } finally {
        if (active) {
          setIsOwnPostsLoading(false);
          setIsOwnPostsSyncing(false);
        }
      }
    };

    loadOwnPosts();
    return () => {
      active = false;
    };
  }, [activeTab, host, anonymousPosterClientId, anonymousPosterAuthsec]);

  useEffect(() => {
    if (activeTab === "profile") {
      setVisibleOwnPostsCount(10);
    }
  }, [activeTab, ownPosts.length]);

  useEffect(() => {
    if (activeTab === "alerts") {
      setVisibleNotificationCount(10);
    }
  }, [activeTab, storedNotifications.length]);

  useEffect(() => {
    if (!host) return undefined;
    let active = true;

    const syncNotifications = async () => {
      try {
        const response = await api.postNotifications(host, { limit: 100 });
        const json = await response.json().catch(() => ({}));
        if (!active || !response.ok || !json?.success) return;

        const incoming = Array.isArray(json.notifications) ? json.notifications : [];
        const base = readRawEchoIdNotifications();
        const byId = new Map();

        base.forEach((item) => {
          const normalized = normalizeStoredEchoIdNotification(item);
          if (normalized?.id) {
            byId.set(normalized.id, item);
          }
        });

        incoming.forEach((item) => {
          const normalizedIncoming = normalizeStoredEchoIdNotification(item);
          if (!normalizedIncoming?.id) return;

          const previous = byId.get(normalizedIncoming.id);
          const normalizedPrevious = normalizeStoredEchoIdNotification(previous || {});
          const isRead = normalizedPrevious?.read === true || normalizedPrevious?.view === true || normalizedIncoming.read === true;

          byId.set(normalizedIncoming.id, {
            ...previous,
            ...item,
            id: normalizedIncoming.id,
            read: isRead,
            view: isRead,
          });
        });

        const merged = [...byId.values()]
          .filter((item) => normalizeStoredEchoIdNotification(item))
          .sort((a, b) => {
            const left = normalizeStoredEchoIdNotification(a);
            const right = normalizeStoredEchoIdNotification(b);
            return new Date(right?.createdAt || 0) - new Date(left?.createdAt || 0);
          });
        saveEchoIdNotifications(merged);
        const unreadCount = getEchoIdNotificationUnreadCount();
        setEchoIdUnreadNotifications?.(unreadCount);
        refreshStoredNotifications();
        window.dispatchEvent(new CustomEvent("echoid-notifications-updated", { detail: { count: unreadCount } }));
      } catch (error) {
        console.warn("Failed to sync EchoId notifications:", error?.message || error);
      }
    };

    syncNotifications();
    return () => {
      active = false;
    };
  }, [host, refreshStoredNotifications, setEchoIdUnreadNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleNotificationUpdate = () => {
      refreshStoredNotifications();
    };
    window.addEventListener("echoid-notifications-updated", handleNotificationUpdate);
    return () => window.removeEventListener("echoid-notifications-updated", handleNotificationUpdate);
  }, [refreshStoredNotifications]);

  useEffect(() => {
    if (activeTab !== "alerts") return;
    markEchoIdNotificationsRead();
    refreshStoredNotifications();
    setEchoIdUnreadNotifications?.(0);
    window.dispatchEvent(new CustomEvent("echoid-notifications-updated", { detail: { count: 0 } }));
  }, [activeTab, refreshStoredNotifications, setEchoIdUnreadNotifications]);

  const searchMode = query.trim().startsWith("@") ? "users" : "posts";
  const hasSearchQuery = query.trim().length > 0;

  const filteredSearchUsers = useMemo(() => (host ? searchUsers : []), [host, searchUsers]);

  const filteredLocalSearchPosts = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (!normalizedQuery || normalizedQuery.startsWith("@")) return [];

    return postSeed.filter((post) =>
      [post.name, post.username, post.category, post.title, stripMediaLinks(post.body)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [debouncedQuery]);

  const localHomePosts = useMemo(() => {
    const normalizedCategory = String(selectedHomeCategory || "").trim().toLowerCase();
    const filtered = normalizedCategory
      ? postSeed.filter((post) => String(post.category || "").trim().toLowerCase() === normalizedCategory)
      : postSeed;
    const posts = [...filtered];
    switch (sortBy) {
      case "popularity":
        return posts.sort((left, right) => Number(right.likes || 0) - Number(left.likes || 0));
      case "least-popularity":
        return posts.sort((left, right) => Number(left.likes || 0) - Number(right.likes || 0));
      case "date":
      default:
        return posts.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }
  }, [selectedHomeCategory, sortBy]);

  const sortedHomePosts = useMemo(() => {
    const posts = [...feedPosts];
    switch (sortBy) {
      case "popularity":
        return posts.sort((left, right) => Number(right.likes || 0) - Number(left.likes || 0));
      case "least-popularity":
        return posts.sort((left, right) => Number(left.likes || 0) - Number(right.likes || 0));
      case "date":
      default:
        return posts.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }
  }, [feedPosts, sortBy]);

  const displayedHomePosts = host ? insertPromotionsIntoFeed(sortedHomePosts, feedPromotions) : localHomePosts;
  const getVirtualPostKey = useCallback((post, index) => getPostId(post) || `post-${index}`, []);
  const displayedOwnPosts = useMemo(() => ownPosts.slice(0, visibleOwnPostsCount), [ownPosts, visibleOwnPostsCount]);
  const hasMoreOwnPosts = visibleOwnPostsCount < ownPosts.length;
  const displayedStoredNotifications = useMemo(
    () => storedNotifications.slice(0, visibleNotificationCount),
    [storedNotifications, visibleNotificationCount]
  );
  const hasMoreStoredNotifications = visibleNotificationCount < storedNotifications.length;
  const selectedHomeCategoryLabel = selectedHomeCategory ? toDisplayCategory(selectedHomeCategory) : "All posts";
  const profileStats = useMemo(() => {
    const visibleCount = ownPosts.filter((post) => String(post?.visibility || "").toLowerCase() === "normal").length;
    return [
      { label: "Echoes", value: String(ownPosts.length) },
      { label: "Trust score", value: String(Number(anonymousProfile?.trustScore || 0)) },
      { label: "Visible", value: String(visibleCount) },
    ];
  }, [anonymousProfile?.trustScore, ownPosts]);

  const mediaMap = useMemo(() => {
    const next = new Map();
    composeMedia.forEach((item) => next.set(item.id, item));
    return next;
  }, [composeMedia]);

  const composerPreviewBlocks = useMemo(
    () => splitComposerBody(composeForm.body, mediaMap),
    [composeForm.body, mediaMap]
  );
  const previewAuthorName = composeForm.anonymity
    ? "Anonymous"
    : String(anonymousProfile?.name || "Unknown user").trim() || "Unknown user";
  const previewAuthorHandle = composeForm.anonymity
    ? "@anonymous"
    : `@${String(anonymousProfile?.username || "unknown.user").trim().replace(/^@+/, "") || "unknown.user"}`;
  const profileAvatarUrl = String(anonymousProfile?.profilePic || "").trim();
  const profileDisplayName = String(anonymousProfile?.name || "Echo Operative").trim() || "Echo Operative";
  const profileHandle = anonymousProfile?.username ? `@${anonymousProfile.username}` : "@echoid.core";
  const allKnownPosts = useMemo(
    () =>
      normalizePostCollection([...feedPosts, ...searchPosts, ...ownPosts, ...postSeed]).filter(
        (post, index, items) => items.findIndex((entry) => getPostId(entry) === getPostId(post)) === index
      ),
    [feedPosts, ownPosts, searchPosts]
  );
  const selectedPostPreview = useMemo(
    () => allKnownPosts.find((post) => getPostId(post) === selectedPostId) || null,
    [allKnownPosts, selectedPostId]
  );
  const selectedPost = useMemo(
    () =>
      selectedPostDetailMap[selectedPostId] ||
      selectedPostPreview ||
      (selectedPostId
        ? normalizePostRecord({
          _id: selectedPostId,
          name: "Anonymous",
          username: "anonymous",
          createdAt: new Date().toISOString(),
          body: "",
        })
        : null),
    [selectedPostDetailMap, selectedPostId, selectedPostPreview]
  );
  const selectedPostComments = selectedPostId ? commentsByPostId[selectedPostId] || [] : [];
  const selectedPostCommentsLoading = Boolean(selectedPostId && commentLoadingByPostId[selectedPostId]);
  const selectedPostCommentsLoadingMore = Boolean(selectedPostId && commentLoadingMoreByPostId[selectedPostId]);
  const selectedPostCommentsHasMore = Boolean(selectedPostId && commentHasMoreByPostId[selectedPostId]);
  const selectedPostCommentsVisible = Boolean(selectedPostId && commentsVisibleByPostId[selectedPostId]);
  const selectedPostCommentsError = selectedPostId ? commentErrorByPostId[selectedPostId] || "" : "";
  const selectedPostCommentDraft = selectedPostId ? commentDraftByPostId[selectedPostId] || "" : "";
  const selectedPostCommentSubmitting = Boolean(selectedPostId && commentSubmittingByPostId[selectedPostId]);
  const selectedPostCommentSubmitError = selectedPostId ? commentSubmitErrorByPostId[selectedPostId] || "" : "";
  const selectedPostReplyTarget = selectedPostId ? replyTargetByPostId[selectedPostId] || null : null;
  const selectedPostHasFullDetail = Boolean(selectedPostId && selectedPostDetailMap[selectedPostId]);
  const selectedPostContentLoading = Boolean(host && selectedPostId && (selectedPostLoading || !selectedPostHasFullDetail));
  const selectedPostWitnessValue = normalizeWitnessValue(postWitnessMap[selectedPostId] ?? selectedPost?.userWitness);
  const selectedPostIsOwner = isOwnerPost(selectedPost, anonymousProfile, anonymousPosterSecret);
  const selectedPostWitnessPanelOpen = Boolean(selectedPostId && witnessPanelPostId === selectedPostId);
  const selectedPostWitnessEntries = selectedPostId ? witnessEntriesByPostId[selectedPostId] || [] : [];
  const selectedPostWitnessEntriesLoading = Boolean(selectedPostId && witnessEntriesLoadingByPostId[selectedPostId]);
  const selectedPostWitnessEntriesError = selectedPostId ? witnessEntriesErrorByPostId[selectedPostId] || "" : "";
  const visibleInteractionPosts = useMemo(() => {
    const sources = [];
    if (activeTab === "home") {
      sources.push(...feedPosts);
    }
    if (activeTab === "search") {
      sources.push(...searchPosts);
    }
    if (activeTab === "profile") {
      sources.push(...ownPosts);
    }
    if (selectedUserClientId) {
      sources.push(...selectedUserPosts);
    }
    if (selectedPost) {
      sources.push(selectedPost);
    }

    return normalizePostCollection(sources).filter(
      (post, index, items) => items.findIndex((entry) => getPostId(entry) === getPostId(post)) === index
    );
  }, [activeTab, feedPosts, ownPosts, searchPosts, selectedPost, selectedUserClientId, selectedUserPosts]);

  useEffect(() => {
    if (!host || !anonymousClientId || !visibleInteractionPosts.length) return;

    const signature = `${host}::${anonymousClientId}::${visibleInteractionPosts.map((post) => getPostId(post)).join("|")}`;
    if (interactionBatchSignatureRef.current === signature) return;

    interactionBatchSignatureRef.current = signature;
    fetchReactionBatch(visibleInteractionPosts);
  }, [anonymousClientId, host, visibleInteractionPosts]);

  const syncReplyCountForComment = (postId, commentId, nextReplyCount) => {
    const normalizedPostId = String(postId || "").trim();
    const normalizedCommentId = String(commentId || "").trim();
    if (!normalizedPostId || !normalizedCommentId) return;

    setCommentsByPostId((prev) => ({
      ...prev,
      [normalizedPostId]: (prev[normalizedPostId] || []).map((entry) =>
        entry.id === normalizedCommentId
          ? {
            ...entry,
            replyCount: Math.max(0, Number(nextReplyCount ?? entry?.replyCount ?? 0)),
          }
          : entry
      ),
    }));
  };

  const getCurrentCommentCount = (postId, fallbackCount = 0) => {
    const normalizedPostId = String(postId || "").trim();
    if (!normalizedPostId) return Math.max(0, Number(fallbackCount || 0));

    const loadedTopLevelCommentsCount = Array.isArray(commentsByPostId[normalizedPostId])
      ? commentsByPostId[normalizedPostId].filter((entry) => !entry?.parentId).length
      : 0;
    const snapshotCount = Number(getCurrentPostSnapshot(normalizedPostId)?.comments || 0);

    return Math.max(0, snapshotCount, loadedTopLevelCommentsCount, Number(fallbackCount || 0));
  };

  const insertTextAtCursor = (textToInsert) => {
    const textarea = bodyInputRef.current;
    const currentBody = String(composeForm.body || "");

    if (!textarea) {
      setComposeForm((prev) => ({ ...prev, body: `${currentBody}${textToInsert}`.slice(0, 1200) }));
      return;
    }

    const start = textarea.selectionStart ?? currentBody.length;
    const end = textarea.selectionEnd ?? currentBody.length;
    const nextBody = `${currentBody.slice(0, start)}${textToInsert}${currentBody.slice(end)}`.slice(0, 1200);
    const caretPosition = Math.min(start + textToInsert.length, nextBody.length);

    setComposeForm((prev) => ({ ...prev, body: nextBody }));
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(caretPosition, caretPosition);
    });
  };

  const pushMediaIntoComposer = (files) => {
    setComposeMedia((prev) => {
      const nextMedia = [...prev, ...files];
      if (!selectedCoverMediaId && nextMedia[0]?.id) {
        setSelectedCoverMediaId(nextMedia[0].id);
      }
      return nextMedia;
    });

    const mediaTokens = files.map((file) => `[[media:${file.id}]]`).join("\n");
    if (mediaTokens) {
      insertTextAtCursor(`${composeForm.body && !composeForm.body.endsWith("\n") ? "\n" : ""}${mediaTokens}\n`);
    }
  };

  const handleWebFilePick = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const normalizedFiles = await Promise.all(
      files
        .filter(isAllowedMediaFile)
        .map(async (file) => {
          const previewUrl = URL.createObjectURL(file);
          mediaObjectUrlsRef.current.push(previewUrl);
          const isVideo = String(file.type || "").startsWith("video/");
          return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: file.name || "media",
            mimeType: file.type || "application/octet-stream",
            kind: isVideo ? "video" : "image",
            previewUrl,
            thumbnailUrl: isVideo ? await createVideoThumbnail(previewUrl) : "",
            fileObject: file,
          };
        })
    );

    pushMediaIntoComposer(normalizedFiles);
  };

  const handlePickMedia = async () => {
    setComposeError("");
    try {
      if (window.NativeAds?.pickMediaNative) {
        const picked = await pickMediaNative();
        const normalizedFiles = await Promise.all(
          picked
            .filter(isAllowedMediaFile)
            .map(async (file) => {
              const isVideo = String(file.type || "").startsWith("video/");
              return {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: file.name || "media",
                mimeType: file.type || "application/octet-stream",
                kind: isVideo ? "video" : "image",
                previewUrl: file.preview || "",
                thumbnailUrl: isVideo ? await createVideoThumbnail(file.preview || "") : "",
                fileObject: null,
              };
            })
        );

        pushMediaIntoComposer(normalizedFiles);
        return;
      }

      fileInputRef.current?.click();
    } catch (error) {
      console.error("Media picker failed:", error);
      setComposeError("Unable to open media picker.");
    }
  };

  const handleRemoveMedia = (mediaId) => {
    setComposeMedia((prev) => {
      const nextMedia = prev.filter((item) => item.id !== mediaId);
      if (selectedCoverMediaId === mediaId) {
        setSelectedCoverMediaId(nextMedia[0]?.id || "");
      }
      return nextMedia;
    });
    setComposeForm((prev) => ({
      ...prev,
      body: String(prev.body || "")
        .replace(new RegExp(`\\n?\\[\\[media:${mediaId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]\\n?`, "g"), "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    }));
  };

  const handleSelectCoverMedia = (mediaId) => {
    setSelectedCoverMediaId(mediaId);
  };

  const handleToggleComposeAnonymity = (nextAnonymity) => {
    setComposeForm((prev) => ({ ...prev, anonymity: Boolean(nextAnonymity) }));
  };

  const handleSelectHomeCategory = (nextCategory) => {
    setSelectedHomeCategory(nextCategory);
    setActiveTab("home");
    setIsDrawerOpen(false);
  };

  const handleSelectDrawerTab = (tabId) => {
    setIsComposePreviewOpen(false);
    setActiveTab(tabId);
    setSelectedUserClientId("");
    setSelectedPostId("");
    setSelectedPostError("");
    setWitnessPanelPostId("");
    setIsDrawerOpen(false);
  };

  const handleOpenPost = (post) => {
    const postId = getPostId(post);
    if (!postId) return;
    setSelectedUserClientId("");
    setSelectedPostId(postId);
    setSelectedPostError("");
  };

  const handleOpenNotification = (notification) => {
    if (!notification?.id) return;
    markEchoIdNotificationsRead((item) => item.id === notification.id);
    const unreadCount = getEchoIdNotificationUnreadCount();
    setEchoIdUnreadNotifications?.(unreadCount);
    refreshStoredNotifications();
    window.dispatchEvent(new CustomEvent("echoid-notifications-updated", { detail: { count: unreadCount } }));

    const postId = String(notification?.postId || "").trim();
    if (postId) {
      history.push(`/app/post/${encodeURIComponent(postId)}`);
    }
  };

  const handleOpenUserDetails = async (source) => {
    const clientId = String(
      source?.clientId ||
      source?.posterId ||
      source?.userClientId ||
      source?.authorClientId ||
      source?.commentClientId ||
      source?.anonymousClientId ||
      ""
    ).trim();
    const username = String(source?.username || source?.userName || "").trim().replace(/^@+/, "");

    setSelectedUserError("");
    setSelectedUserPostsError("");

    if (clientId) {
      setSelectedUserClientId(clientId);
      return;
    }

    if (!host || !username) return;

    setSelectedUserLoading(true);
    try {
      const response = await api.anonymousUserByUsername(host, username.toLowerCase());
      const json = await response.json().catch(() => ({}));
      const rawUser = Array.isArray(json?.userResponse) ? json.userResponse.find(Boolean) : json?.userResponse;
      const resolvedClientId = String(rawUser?.clientId || rawUser?._id || rawUser?.id || "").trim();
      if (!response.ok || !json?.success || !resolvedClientId) {
        throw new Error(json?.message || "Could not load user details.");
      }

      setSelectedUserDetail(normalizeAnonymousUserDetail(rawUser));
      setSelectedUserClientId(resolvedClientId);
    } catch (error) {
      console.warn("Failed to resolve EchoId user details:", error);
      setSelectedUserLoading(false);
    }
  };


  const handleCloseUserDetails = () => {
    setSelectedUserClientId("");
    setSelectedUserDetail(null);
    setSelectedUserError("");
    setSelectedUserPosts([]);
    setSelectedUserPostsLoaded(false);
    setSelectedUserPostsError("");
  };

  const handleClosePost = () => {
    setSelectedPostId("");
    setSelectedPostError("");
    setWitnessPanelPostId("");
    if (String(history.location?.pathname || "").startsWith("/app/post/")) {
      history.replace("/echoid");
    }
  };

  const handleOpenWitnessPanel = async (post) => {
    const postId = getPostId(post);
    if (!host || !postId || !isOwnerPost(post, anonymousProfile, anonymousPosterSecret)) return;

    setWitnessPanelPostId(postId);
    if (witnessEntriesByPostId[postId] || witnessEntriesLoadingByPostId[postId]) return;

    setWitnessEntriesLoadingByPostId((prev) => ({ ...prev, [postId]: true }));
    setWitnessEntriesErrorByPostId((prev) => ({ ...prev, [postId]: "" }));
    try {
      const response = await api.postWitnesses(host, postId);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not load witnesses right now.");
      }

      setWitnessEntriesByPostId((prev) => ({
        ...prev,
        [postId]: Array.isArray(json?.witnesses) ? json.witnesses : [],
      }));
    } catch (error) {
      console.warn("Failed to fetch EchoId witnesses:", error);
      setWitnessEntriesErrorByPostId((prev) => ({
        ...prev,
        [postId]: error?.message || "Could not load witnesses right now.",
      }));
    } finally {
      setWitnessEntriesLoadingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleRemoveWitnessEntry = async (post, witnessEntry) => {
    const postId = getPostId(post);
    const targetClientId = String(witnessEntry?.clientId || "").trim();
    if (!host || !anonymousClientId || !postId || !targetClientId || witnessPendingByPostId[postId]) return;

    setWitnessPendingByPostId((prev) => ({ ...prev, [postId]: true }));
    try {
      const response = await api.postUnwitness(host, postId, {
        clientId: anonymousClientId,
        targetClientId,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not remove witness right now.");
      }

      setWitnessEntriesByPostId((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((entry) => String(entry?.clientId || "").trim() !== targetClientId),
      }));
      syncWitnessAcrossCollections(
        postId,
        normalizeWitnessValue(postWitnessMap[postId] ?? post?.userWitness),
        Number(json?.witness ?? post?.witness ?? 0)
      );
    } catch (error) {
      console.warn("Failed to remove EchoId witness:", error);
      setWitnessEntriesErrorByPostId((prev) => ({
        ...prev,
        [postId]: error?.message || "Could not remove witness right now.",
      }));
    } finally {
      setWitnessPendingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleLoadSelectedUserPosts = async () => {
    if (!host || !selectedUserClientId) return;

    setSelectedUserPostsLoading(true);
    setSelectedUserPostsLoaded(true);
    setSelectedUserPostsError("");
    try {
      const response = await api.postByClientId(host, selectedUserClientId);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not load posts right now.");
      }

      const nextPosts = normalizePostCollection(json?.posts).filter((post) => isVisibleUserPost(post, anonymousProfile));
      setSelectedUserPosts(nextPosts);
      fetchReactionBatch(nextPosts);
    } catch (error) {
      console.warn("Failed to fetch EchoId user posts:", error);
      setSelectedUserPostsError(error?.message || "Could not load posts right now.");
    } finally {
      setSelectedUserPostsLoading(false);
    }
  };

  const handleOpenMediaPreview = (media, altText = "", context = {}) => {
    const url = String(media?.url || media?.previewUrl || "").trim();
    const kind = normalizeMediaKind(media?.kind || media?.mimeType || "", url);
    if (!url || !isSafeMediaUrl(url) || (kind !== "image" && kind !== "video")) return;
    setMediaPreview({
      url,
      kind,
      alt: String(altText || "").trim(),
      thumbnailUrl: media?.thumbnailUrl || "",
      title: String(context?.title || "").trim(),
      author: String(context?.author || "").trim(),
      handle: String(context?.handle || "").trim(),
      relativeTimeLabel: String(context?.relativeTimeLabel || "").trim(),
      avatarUrl: String(context?.avatarUrl || "").trim(),
    });
  };

  const handleOpenProfileImagePreview = (url, altText = "") => {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl || !isSafeMediaUrl(normalizedUrl)) return;
    setMediaPreview({
      url: normalizedUrl,
      kind: "image",
      alt: String(altText || "").trim(),
    });
  };

  const handleCloseMediaPreview = () => {
    setMediaPreview(null);
  };

  const fetchCommentsForPost = async (post, options = {}) => {
    const postId = getPostId(post);
    const { reveal = false, force = false, append = false } = options;
    if (!postId) return [];

    if (reveal) {
      setCommentsVisibleByPostId((prev) => ({ ...prev, [postId]: true }));
    }
    if (append && (commentLoadingMoreByPostId[postId] || !commentHasMoreByPostId[postId])) {
      return commentsByPostId[postId] || [];
    }
    if (!force && !append && (commentsByPostId[postId] || commentLoadingByPostId[postId])) {
      return commentsByPostId[postId] || [];
    }

    const mergeCommentPages = (currentComments, incomingComments) => {
      const seen = new Set();
      return [...(Array.isArray(currentComments) ? currentComments : []), ...(Array.isArray(incomingComments) ? incomingComments : [])].filter((entry) => {
        const id = String(entry?.id || "").trim();
        if (!id) return true;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    };

    if (!host) {
      const nextComments = normalizeCommentCollection(post?.commentsList || post?.commentList).filter((comment) => !comment.parentId);
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: nextComments,
      }));
      setCommentPageByPostId((prev) => ({ ...prev, [postId]: 1 }));
      setCommentHasMoreByPostId((prev) => ({ ...prev, [postId]: false }));
      return nextComments;
    }

    const page = append ? Math.max(2, Number(commentPageByPostId[postId] || 1) + 1) : 1;
    if (append) {
      setCommentLoadingMoreByPostId((prev) => ({ ...prev, [postId]: true }));
    } else {
      setCommentLoadingByPostId((prev) => ({ ...prev, [postId]: true }));
    }
    setCommentErrorByPostId((prev) => ({ ...prev, [postId]: "" }));
    try {
      const response = await api.postComments(host, postId, { page });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not load comments right now.");
      }

      const nextComments = normalizeCommentCollection(json?.comments || json?.replies || json?.data);
      const nextPage = Number(json?.page || page);
      const hasMore = Boolean(json?.hasMore);
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: append ? mergeCommentPages(prev[postId], nextComments) : nextComments,
      }));
      setCommentPageByPostId((prev) => ({ ...prev, [postId]: nextPage }));
      setCommentHasMoreByPostId((prev) => ({ ...prev, [postId]: hasMore }));
      return nextComments;
    } catch (error) {
      console.warn("Failed to fetch EchoId comments:", error);
      setCommentErrorByPostId((prev) => ({
        ...prev,
        [postId]: error?.message || "Could not load comments right now.",
      }));
      return [];
    } finally {
      if (append) {
        setCommentLoadingMoreByPostId((prev) => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
      } else {
        setCommentLoadingByPostId((prev) => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
      }
    }
  };

  const handleShowComments = async (post) => {
    await fetchCommentsForPost(post, { reveal: true });
  };

  const handleLoadMoreComments = async (post) => {
    await fetchCommentsForPost(post, { append: true });
  };

  useEffect(() => {
    if (!host || !selectedPostId) return;

    let active = true;
    setSelectedPostLoading(true);
    setSelectedPostError("");

    const loadPostDetail = async () => {
      try {

        const response = await api.postById(host, selectedPostId);
        const json = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok || !json?.success || !json?.post) {
          throw new Error(json?.message || "Could not load the full post.");
        }

        const normalizedPost = mergeIncomingPostWithLocalState(json.post);
        setSelectedPostDetailMap((prev) => ({
          ...prev,
          [selectedPostId]: normalizedPost,
        }));
      } catch (error) {
        if (!active) return;
        console.warn("Failed to fetch EchoId post detail:", error);
        setSelectedPostError(error?.message || "Could not load the full post.");
      } finally {
        if (active) {
          setSelectedPostLoading(false);
        }
      }
    };

    loadPostDetail();
    return () => {
      active = false;
    };
  }, [host, selectedPostId]);

  useEffect(() => {
    if (!host || !selectedPostId || !selectedPost || !isExplicitlyNonAnonymousPost(selectedPost)) return;

    const posterId = String(selectedPost?.posterId || selectedPost?.clientId || "").trim();
    const existingAvatarUrl = String(selectedPost?.profilePic || selectedPost?.profileUrl || selectedPost?.userProfile || "").trim();
    if (!posterId || existingAvatarUrl) return;

    let active = true;

    const loadSelectedPostAuthor = async () => {
      try {
        const response = await api.getAnonymousUser(host, posterId);
        const json = await response.json().catch(() => ({}));
        const rawUser = json?.userResponse;
        const nextAvatarUrl = String(rawUser?.profilePic || rawUser?.profileUrl || "").trim();
        if (!active || !response.ok || !json?.success || !nextAvatarUrl) return;

        setSelectedPostDetailMap((prev) => ({
          ...prev,
          [selectedPostId]: mergeIncomingPostWithLocalState({
            ...(prev[selectedPostId] || selectedPost),
            profilePic: nextAvatarUrl,
            profileUrl: nextAvatarUrl,
          }),
        }));
      } catch (error) {
        if (!active) return;
        console.warn("Failed to hydrate EchoId author avatar:", error);
      }
    };

    loadSelectedPostAuthor();
    return () => {
      active = false;
    };
  }, [host, selectedPost, selectedPostId]);

  useEffect(() => {
    if (!host || !selectedUserClientId) return;

    let active = true;
    setSelectedUserLoading(true);
    setSelectedUserError("");
    setSelectedUserPosts([]);
    setSelectedUserPostsLoaded(false);
    setSelectedUserPostsError("");

    const loadSelectedUser = async () => {
      try {
        const response = await api.getAnonymousUser(host, selectedUserClientId);
        const json = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok || !json?.success || !json?.userResponse) {
          throw new Error(json?.message || "Could not load user details.");
        }

        setSelectedUserDetail(normalizeAnonymousUserDetail(json.userResponse));
      } catch (error) {
        if (!active) return;
        console.warn("Failed to fetch EchoId user details:", error);
        setSelectedUserError(error?.message || "Could not load user details.");
      } finally {
        if (active) {
          setSelectedUserLoading(false);
        }
      }
    };

    loadSelectedUser();
    return () => {
      active = false;
    };
  }, [host, selectedUserClientId]);

  useEffect(() => {
    if (!isSortMenuOpen && !isDrawerOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;

      if (isSortMenuOpen) {
        const clickedSortMenu =
          desktopFilterMenuRef.current?.contains(target) ||
          mobileFilterMenuRef.current?.contains(target) ||
          desktopFilterButtonRef.current?.contains(target) ||
          mobileFilterButtonRef.current?.contains(target);
        if (!clickedSortMenu) {
          setIsSortMenuOpen(false);
        }
      }

      if (isDrawerOpen) {
        const clickedDrawer =
          drawerRef.current?.contains(target) ||
          desktopDrawerButtonRef.current?.contains(target) ||
          mobileDrawerButtonRef.current?.contains(target);
        if (!clickedDrawer) {
          setIsDrawerOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isDrawerOpen, isSortMenuOpen]);

  const handleCommentDraftChange = (postId, value) => {
    const normalizedPostId = String(postId || "").trim();
    if (!normalizedPostId) return;

    setCommentDraftByPostId((prev) => ({
      ...prev,
      [normalizedPostId]: String(value || "").slice(0, 500),
    }));
    setCommentSubmitErrorByPostId((prev) => ({
      ...prev,
      [normalizedPostId]: "",
    }));
  };

  const handleReplyToComment = (postId, comment) => {
    const normalizedPostId = String(postId || "").trim();
    if (!normalizedPostId || !comment?.id) return;
    setReplyTargetByPostId((prev) => ({
      ...prev,
      [normalizedPostId]: comment,
    }));
  };

  const handleToggleReplies = async (postId, comment) => {
    const normalizedPostId = String(postId || "").trim();
    const commentId = String(comment?.id || "").trim();
    if (!normalizedPostId || !commentId) return;

    if (replyVisibleByCommentId[commentId]) {
      setReplyVisibleByCommentId((prev) => ({ ...prev, [commentId]: false }));
      return;
    }

    setReplyVisibleByCommentId((prev) => ({ ...prev, [commentId]: true }));
    if (repliesByCommentId[commentId] || replyLoadingByCommentId[commentId]) return;

    if (!host) {
      const sourceComments = normalizeCommentCollection(
        selectedPost?.commentsList || selectedPost?.commentList || postSeed.find((entry) => getPostId(entry) === normalizedPostId)?.commentsList || []
      );
      setRepliesByCommentId((prev) => ({
        ...prev,
        [commentId]: sourceComments.filter((entry) => entry.parentId === commentId),
      }));
      return;
    }

    setReplyLoadingByCommentId((prev) => ({ ...prev, [commentId]: true }));
    setReplyErrorByCommentId((prev) => ({ ...prev, [commentId]: "" }));
    try {
      const response = await api.postCommentReplies(host, commentId);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not load replies right now.");
      }

      setRepliesByCommentId((prev) => ({
        ...prev,
        [commentId]: normalizeCommentCollection(json?.comments || json?.replies || json?.data),
      }));
    } catch (error) {
      console.warn("Failed to fetch EchoId comment replies:", error);
      setReplyErrorByCommentId((prev) => ({
        ...prev,
        [commentId]: error?.message || "Could not load replies right now.",
      }));
    } finally {
      setReplyLoadingByCommentId((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }
  };

  const handleCancelReplyToComment = (postId) => {
    const normalizedPostId = String(postId || "").trim();
    if (!normalizedPostId) return;
    setReplyTargetByPostId((prev) => ({
      ...prev,
      [normalizedPostId]: null,
    }));
  };

  const handleSubmitComment = async (post) => {
    const postId = getPostId(post);
    const draft = String(commentDraftByPostId[postId] || "").trim();
    if (!postId || !draft || commentSubmittingByPostId[postId]) return;
    const replyTarget = replyTargetByPostId[postId] || null;
    const wereCommentsHidden = !commentsVisibleByPostId[postId];
    const previousCommentCount = getCurrentCommentCount(postId, post?.comments);
    const optimisticCommentCount = previousCommentCount + 1;

    const optimisticComment = {
      id: `local-${postId}-${Date.now()}`,
      name: profileDisplayName || "Anonymous",
      username: String(anonymousProfile?.username || "").trim().replace(/^@+/, ""),
      usernameLabel: anonymousProfile?.username ? `@${String(anonymousProfile.username).trim().replace(/^@+/, "")}` : "",
      userProfile: profileAvatarUrl,
      author: profileDisplayName || "Anonymous",
      avatarUrl: profileAvatarUrl,
      body: draft,
      parentId: replyTarget?.id || "",
      replyCount: 0,
      relativeTimeLabel: "Just now",
    };

    setCommentSubmittingByPostId((prev) => ({ ...prev, [postId]: true }));
    setCommentSubmitErrorByPostId((prev) => ({ ...prev, [postId]: "" }));
    if (replyTarget?.id) {
      setReplyVisibleByCommentId((prev) => ({ ...prev, [replyTarget.id]: true }));
      setRepliesByCommentId((prev) => ({
        ...prev,
        [replyTarget.id]: [...(prev[replyTarget.id] || []), optimisticComment],
      }));
      syncReplyCountForComment(postId, replyTarget.id, Number(replyTarget.replyCount || 0) + 1);
    } else {
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: [optimisticComment, ...(prev[postId] || [])],
      }));
    }
    setCommentDraftByPostId((prev) => ({
      ...prev,
      [postId]: "",
    }));
    setReplyTargetByPostId((prev) => ({
      ...prev,
      [postId]: null,
    }));
    syncCommentCountAcrossCollections(postId, optimisticCommentCount);

    if (!host) {
      setCommentSubmittingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return;
    }

    try {
      const payload = {
        body: draft,
        ...(anonymousClientId ? { clientId: anonymousClientId } : {}),
        ...(replyTarget?.id ? { parentId: replyTarget.id } : {}),
      };
      const response = await api.createPostComment(host, postId, payload);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not send comment.");
      }

      const savedComment =
        normalizeCommentCollection([json?.comment || json?.reply || json?.data || optimisticComment])[0] || optimisticComment;
      if (replyTarget?.id) {
        setRepliesByCommentId((prev) => ({
          ...prev,
          [replyTarget.id]: (prev[replyTarget.id] || []).map((entry) => (entry.id === optimisticComment.id ? savedComment : entry)),
        }));
      } else {
        setCommentsByPostId((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).map((entry) => (entry.id === optimisticComment.id ? savedComment : entry)),
        }));
      }
      syncCommentCountAcrossCollections(
        postId,
        Math.max(Number(json?.comments ?? json?.commentCount ?? 0), optimisticCommentCount)
      );
      if (wereCommentsHidden) {
        await fetchCommentsForPost(post, { reveal: true, force: true });
      }
    } catch (error) {
      console.warn("Failed to create EchoId comment:", error);
      if (replyTarget?.id) {
        setRepliesByCommentId((prev) => ({
          ...prev,
          [replyTarget.id]: (prev[replyTarget.id] || []).filter((entry) => entry.id !== optimisticComment.id),
        }));
        syncReplyCountForComment(postId, replyTarget.id, Math.max(0, Number(replyTarget.replyCount || 0)));
      } else {
        setCommentsByPostId((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).filter((entry) => entry.id !== optimisticComment.id),
        }));
      }
      setCommentDraftByPostId((prev) => ({
        ...prev,
        [postId]: draft,
      }));
      setReplyTargetByPostId((prev) => ({
        ...prev,
        [postId]: replyTarget,
      }));
      setCommentSubmitErrorByPostId((prev) => ({
        ...prev,
        [postId]: error?.message || "Could not send comment.",
      }));
      syncCommentCountAcrossCollections(postId, previousCommentCount);
    } finally {
      setCommentSubmittingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleContentScroll = (event) => {
    const target = event.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (
      host &&
      activeTab === "home" &&
      !isFeedRequestInFlightRef.current &&
      !isFeedLoadingMore &&
      feedHasMore &&
      distanceFromBottom <= 320
    ) {
      setFeedPage((prev) => prev + 1);
    }

    if (activeTab === "profile" && !isOwnPostsLoading && !isOwnPostsHidden && hasMoreOwnPosts && distanceFromBottom <= 320) {
      setVisibleOwnPostsCount((prev) => Math.min(prev + 10, ownPosts.length));
    }

    if (activeTab === "alerts" && hasMoreStoredNotifications && distanceFromBottom <= 320) {
      setVisibleNotificationCount((prev) => Math.min(prev + 10, storedNotifications.length));
    }
  };

  const handleContentRef = useCallback((node) => {
    contentRef.current = node;
    setContentElement((current) => (current === node ? current : node));
  }, []);

  const handleHomeFeedEndReached = useCallback(() => {
    if (
      host &&
      activeTab === "home" &&
      !isFeedRequestInFlightRef.current &&
      !isFeedLoadingMore &&
      feedHasMore
    ) {
      setFeedPage((prev) => prev + 1);
    }
  }, [activeTab, feedHasMore, host, isFeedLoadingMore]);

  const handleFeedTouchStart = (event) => {
    const touch = event.touches?.[0];
    const content = contentRef.current;
    const state = pullRefreshStateRef.current;
    if (!touch || !content || activeTab !== "home" || state.isRefreshing || content.scrollTop !== 0) return;

    state.startY = touch.clientY;
    state.touchId = touch.identifier;
    state.isPulling = false;
    state.thresholdHapticFired = false;
  };

  const handleFeedTouchMove = (event) => {
    const content = contentRef.current;
    const state = pullRefreshStateRef.current;
    if (!content || activeTab !== "home" || state.isRefreshing || state.touchId === null) return;

    const touch = Array.from(event.touches || []).find((entry) => entry.identifier === state.touchId);
    if (!touch) return;

    const rawDistance = touch.clientY - state.startY;
    if (rawDistance <= 0 && !state.isPulling) return;
    if (content.scrollTop !== 0 && !state.isPulling) return;

    // Browser pull-to-refresh prevention: once this gesture is ours, keep the browser from
    // taking over the overscroll while still letting normal feed scrolls happen below top.
    event.preventDefault();
    setIsPullRefreshUiVisible(true);
    setPullRefreshNotice("");
    state.isPulling = true;

    const nextDistance = getElasticPullDistance(rawDistance);
    state.target = nextDistance;

    // Refresh threshold logic: fire haptics once when the resisted visual pull crosses the
    // commit line. The actual refresh only starts on touchend, matching native feeds.
    if (nextDistance >= ECHOID_PULL_REFRESH_THRESHOLD && !state.thresholdHapticFired) {
      state.thresholdHapticFired = true;
      try {
        navigator.vibrate?.(8);
      } catch {
        // Haptics are optional and not supported on every browser/device.
      }
    }

    schedulePullRefreshFrame();
  };

  const handleFeedTouchEnd = () => {
    const state = pullRefreshStateRef.current;
    if (activeTab !== "home" || !state.isPulling) {
      state.touchId = null;
      return;
    }

    const shouldRefresh = state.current >= ECHOID_PULL_REFRESH_THRESHOLD || state.target >= ECHOID_PULL_REFRESH_THRESHOLD;
    state.touchId = null;
    state.isPulling = false;

    if (shouldRefresh) {
      completePullRefresh();
      return;
    }

    resetPullRefreshPosition();
  };

  useEffect(() => {
    const content = contentRef.current;
    if (!content || activeTab !== "home") return undefined;

    // React's delegated touchmove can be passive in modern browser scroll paths. A native
    // listener with passive:false is required so preventDefault can block browser refresh.
    content.addEventListener("touchstart", handleFeedTouchStart, { passive: true });
    content.addEventListener("touchmove", handleFeedTouchMove, { passive: false });
    content.addEventListener("touchend", handleFeedTouchEnd, { passive: true });
    content.addEventListener("touchcancel", handleFeedTouchEnd, { passive: true });

    return () => {
      content.removeEventListener("touchstart", handleFeedTouchStart);
      content.removeEventListener("touchmove", handleFeedTouchMove);
      content.removeEventListener("touchend", handleFeedTouchEnd);
      content.removeEventListener("touchcancel", handleFeedTouchEnd);
    };
  }, [activeTab, handleFeedTouchEnd, handleFeedTouchMove, handleFeedTouchStart]);

  const buildMediaTag = (url, isCover = false) => {
    if (!url) return "";
    return isCover ? `[Link_cover:-${url}]` : `[Link:-${url}]`;
  };

  const handleOpenComposePreview = () => {
    const normalizedTitle = String(composeForm.title || "").trim();
    const normalizedBody = String(composeForm.body || "").trim();
    const anonymity = Boolean(composeForm.anonymity);
    const category = String(composeForm.category || "").trim();
    const subCategory = String(composeForm.subCategory || "").trim();

    if (!category) {
      setComposeError("Category is required.");
      return;
    }
    if (isConfessionCategory(category) && !subCategory) {
      setComposeError("Confession subcategory is required.");
      return;
    }
    if (!normalizedTitle) {
      setComposeError("Title is required.");
      return;
    }
    if (!normalizedBody) {
      setComposeError("Body is required.");
      return;
    }
    if (!anonymity) {
      const storedName = String(anonymousProfile?.name || "").trim();
      const storedUsername = String(anonymousProfile?.username || "").trim();
      if (!storedName || !storedUsername) {
        setComposeError("Your stored profile name and username are required for non-anonymous posting.");
        return;
      }
    }

    setComposeError("");
    setIsComposePreviewOpen(true);
  };

  const uploadComposeMedia = async () => {
    const uploads = new Map();
    const preparedMedia = [];
    const initializedPublicUrls = [];

    for (const media of composeMedia) {
      let blob = media.fileObject;
      if (!(blob instanceof Blob)) {
        if (!media.previewUrl) {
          throw new Error("Selected media preview is missing");
        }
        const previewResponse = await fetch(media.previewUrl);
        blob = await previewResponse.blob();
      }

      let thumbnailBlob = null;
      if (media.kind === "video") {
        thumbnailBlob = await dataUrlToBlob(media.thumbnailUrl);
        if (!thumbnailBlob && media.previewUrl) {
          thumbnailBlob = await createVideoThumbnailBlob(media.previewUrl);
        }
        if (!(thumbnailBlob instanceof Blob)) {
          throw new Error("Could not create video thumbnail");
        }
      }

      preparedMedia.push({ media, blob, thumbnailBlob });
    }

    const totalBytes = preparedMedia.reduce((sum, entry) => sum + (entry.blob?.size || 0) + (entry.thumbnailBlob?.size || 0), 0);
    let uploadedBytes = 0;

    try {
      for (const entry of preparedMedia) {
        const { media, blob } = entry;
        console.log("[echoid-upload] requesting upload init", {
          anonymity: Boolean(composeForm.anonymity),
          fileName: media.name,
          mimeType: media.mimeType,
          size: blob?.size || 0,
        });
        const initRes = await api.postUploadInit(host, {
          anonymity: Boolean(composeForm.anonymity),
          mimeType: media.mimeType,
          fileName: media.name,
          ...(Boolean(composeForm.anonymity) && anonymousPostAuthPayload ? anonymousPostAuthPayload : {}),
          ...(media.kind === "video" ? { thumbnailMimeType: "image/png" } : {}),
        });
        const initJson = await initRes.json().catch(() => ({}));
        console.log("[echoid-upload] upload init response", {
          ok: initRes.ok,
          status: initRes.status,
          body: initJson,
        });

        const thumbnailUpload = initJson?.thumbnailUpload || initJson?.thumbnail || null;

        if (!initRes.ok || !initJson?.success || !initJson?.uploadUrl || !initJson?.publicUrl) {
          throw new Error(initJson?.message || "Failed to initialize media upload");
        }
        if (media.kind === "video" && (!thumbnailUpload?.uploadUrl || !thumbnailUpload?.publicUrl)) {
          throw new Error("Failed to initialize video thumbnail upload");
        }

        initializedPublicUrls.push(initJson.publicUrl);
        if (thumbnailUpload?.publicUrl) initializedPublicUrls.push(thumbnailUpload.publicUrl);

        await putToSignedUrlWithProgress(
          initJson.uploadUrl,
          blob,
          initJson.contentType || media.mimeType || blob.type || "application/octet-stream",
          (loaded) => {
            if (!totalBytes) {
              setPublishProgress(90);
              return;
            }
            const percent = Math.round(((uploadedBytes + loaded) / totalBytes) * 90);
            setPublishProgress(Math.min(90, Math.max(1, percent)));
          }
        );

        uploadedBytes += blob.size || 0;
        if (media.kind === "video") {
          await putToSignedUrlWithProgress(
            thumbnailUpload.uploadUrl,
            entry.thumbnailBlob,
            thumbnailUpload.contentType || entry.thumbnailBlob.type || "image/png",
            (loaded) => {
              if (!totalBytes) {
                setPublishProgress(90);
                return;
              }
              const percent = Math.round(((uploadedBytes + loaded) / totalBytes) * 90);
              setPublishProgress(Math.min(90, Math.max(1, percent)));
            }
          );
          uploadedBytes += entry.thumbnailBlob.size || 0;
        }
        if (totalBytes) {
          setPublishProgress(Math.min(90, Math.max(1, Math.round((uploadedBytes / totalBytes) * 90))));
        }
        uploads.set(media.id, initJson.publicUrl);
      }
    } catch (error) {
      console.error("[echoid-upload] upload pipeline failed", {
        message: error?.message || String(error),
        initializedPublicUrls,
      });
      if (initializedPublicUrls.length) {
        try {
          await api.postUploadDelete(host, {
            anonymity: Boolean(composeForm.anonymity),
            publicUrls: initializedPublicUrls,
            ...(Boolean(composeForm.anonymity) && anonymousPostAuthPayload ? anonymousPostAuthPayload : {}),
          });
        } catch (cleanupError) {
          console.warn("Failed to cleanup uploaded post media after upload error:", cleanupError);
        }
      }
      throw error;
    }

    return { uploads, publicUrls: initializedPublicUrls };
  };

  const handlePublish = async () => {
    const normalizedTitle = String(composeForm.title || "").trim().slice(0, 55);
    const normalizedBody = String(composeForm.body || "").trim().slice(0, 1200);
    const anonymity = Boolean(composeForm.anonymity);
    const category = String(composeForm.category || "").trim().toLowerCase();
    const subCategory = isConfessionCategory(category)
      ? String(composeForm.subCategory || "").trim().toLowerCase()
      : "";
    const requestedName = String(anonymousProfile?.name || "").trim().slice(0, 60);
    const requestedUsername = String(anonymousProfile?.username || "").trim().toLowerCase().replace(/^@+/, "").slice(0, 32);

    if (!host) {
      setComposeError("Publishing requires a backend host.");
      return;
    }
    if (anonymity && !anonymousPostAuthPayload) {
      setComposeError("Anonymous posting credentials are missing. Login to anonymous mode again.");
      return;
    }
    if (!anonymity && (!requestedName || !requestedUsername)) {
      setComposeError("Your stored profile name and username are required for non-anonymous posting.");
      return;
    }

    setComposeError("");
    setIsPublishing(true);
    setPublishProgress(composeMedia.length ? 1 : 20);

    try {
      console.log("[echoid-publish] starting publish", {
        anonymity,
        category,
        subCategory,
        titleLength: normalizedTitle.length,
        bodyLength: normalizedBody.length,
        mediaCount: composeMedia.length,
        selectedCoverMediaId,
      });
      const uploadedMediaResult = await uploadComposeMedia();
      const uploadedMedia = uploadedMediaResult.uploads;
      const uploadedPublicUrls = uploadedMediaResult.publicUrls;
      const replacedBody = normalizedBody
        .replace(mediaTokenRegex, (_, mediaId) => {
          const url = uploadedMedia.get(mediaId);
          return buildMediaTag(url, mediaId === selectedCoverMediaId);
        })
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const finalBody = replacedBody;

      if (!stripMediaLinks(finalBody) && extractPostMediaItems(finalBody).length === 0) {
        throw new Error("Body is required.");
      }

      setPublishProgress(composeMedia.length ? 94 : 72);
      console.log("[echoid-publish] create post payload", {
        anonymity,
        title: normalizedTitle,
        body: finalBody,
        category,
        subCategory,
        requestedName: !anonymity ? requestedName : "",
        requestedUsername: !anonymity ? requestedUsername : "",
      });
      const postPayload = {
        anonymity,
        title: normalizedTitle,
        body: finalBody,
        category,
        ...(!anonymity ? { name: requestedName, username: requestedUsername } : {}),
        ...(subCategory ? { subCategory } : {}),
      };
      const response = anonymity
        ? await api.createAnonymousPost(host, {
          ...postPayload,
          ...anonymousPostAuthPayload,
        })
        : await api.createPost(host, postPayload);
      const json = await response.json().catch(() => ({}));
      console.log("[echoid-publish] create post response", {
        ok: response.ok,
        status: response.status,
        body: json,
      });

      if (response.status === 403 && json?.message) {
        await showAnonymousBannedModal(json.message);
        return;
      }

      if (!response.ok || !json?.success || !json?.post) {
        if (uploadedPublicUrls.length) {
          try {
            await api.postUploadDelete(host, {
              anonymity,
              publicUrls: uploadedPublicUrls,
              ...(anonymity && anonymousPostAuthPayload ? anonymousPostAuthPayload : {}),
            });
          } catch (cleanupError) {
            console.warn("Failed to cleanup uploaded post media after create error:", cleanupError);
          }
        }
        throw new Error(json?.message || "Failed to publish post");
      }

      setPublishProgress(100);
      setFeedPosts((prev) => [json.post, ...prev]);
      setOwnPosts((prev) => {
        const nextPosts = [json.post, ...prev].filter(
          (post, index, items) => items.findIndex((entry) => String(entry?._id || entry?.id || "") === String(post?._id || post?.id || "")) === index
        );
        saveOwnPostsCache(nextPosts);
        return nextPosts;
      });
      setComposeForm(initialComposeState);
      setComposeMedia([]);
      setSelectedCoverMediaId("");
      setComposeError("");
      setIsComposePreviewOpen(false);
      setActiveTab("home");

      await Swal.fire({
        toast: true,
        position: "top",
        timer: 2200,
        timerProgressBar: true,
        showConfirmButton: false,
        icon: "success",
        title: "Echo published",
      });
    } catch (error) {
      console.error("Failed to publish EchoId post:", error);
      setComposeError(error?.message || "Failed to publish post.");
    } finally {
      setIsPublishing(false);
      setPublishProgress(0);
    }
  };

  const renderHome = () => (
    <div className="echoid-feed echoid-pull-layer" ref={homePullLayerRef}>
      <section className="echoid-hero-card">
        <div className="echoid-hero-copy">
          <div className="echoid-hero-profile">
            <div className="echoid-brand-avatar" aria-hidden="true">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt={profileDisplayName} className="echoid-brand-avatar-image" />
              ) : (
                <span>{getDisplayInitial(profileDisplayName)}</span>
              )}
            </div>
            <div>
              <div className="echoid-section-label">Anonymous profile</div>
              <span className="echoid-hero-handle">{profileHandle}</span>
            </div>
          </div>
          <div className="echoid-section-label">Live frequency</div>
          <h2>Signals moving through the city right now.</h2>
        </div>
        <div className="echoid-stat-row">
          {profileStats.map((item) => (
            <div key={item.label} className="echoid-stat-pill">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="echoid-home-categories" aria-label="EchoId categories">
        {homeCategoryLabels.map((item) => {
          const value = toCategoryValue(item);
          const isActive = value === selectedHomeCategory;
          return (
            <button
              key={item}
              type="button"
              className={`echoid-category-pill ${isActive ? "is-active" : ""}`}
              onClick={() => handleSelectHomeCategory(value)}
            >
              {item}
            </button>
          );
        })}
      </section>

      <section className="echoid-section" key={`home-feed-${feedRefreshRevision}`}>
        <div className="echoid-section-heading">
          <span className="echoid-section-label">{selectedHomeCategoryLabel}</span>
          <button type="button" onClick={() => setIsSortMenuOpen((current) => !current)}>
            {sortOptions.find((option) => option.id === sortBy)?.label || "By date"}
          </button>
        </div>
        {isFeedLoading && host && !isPullRefreshingFeedRef.current ? <EchoIdPostCardSkeleton count={3} /> : null}
        {!isFeedLoading && displayedHomePosts.length === 0 ? (
          <div className="echoid-empty-card">No posts in this category yet.</div>
        ) : null}
        {isNativeAndroid ? (
          contentElement ? (
            <Virtuoso
              className="echoid-virtuoso-feed"
              customScrollParent={contentElement}
              data={displayedHomePosts}
              computeItemKey={(index, post) => getVirtualPostKey(post, index)}
              endReached={handleHomeFeedEndReached}
              increaseViewportBy={{ top: 520, bottom: 1040 }}
              itemContent={(index, post) => (
                <div className="echoid-virtual-post">
                  {renderPostCard(post, {
                    compact: true,
                    autoPlayVideos,
                    reactionValue: normalizeUserReactionValue(postReactionMap[getPostId(post)] ?? post?.userReaction),
                    witnessValue: normalizeWitnessValue(postWitnessMap[getPostId(post)] ?? post?.userWitness),
                    isReactionPending: Boolean(reactionPendingByPostId[getPostId(post)]),
                    isWitnessPending: Boolean(witnessPendingByPostId[getPostId(post)]),
                    onLike: (targetPost) => handleReactToPost(targetPost, 1),
                    onDislike: (targetPost) => handleReactToPost(targetPost, -1),
                    onWitness: handleWitnessPost,
                    onOpenPost: handleOpenPost,
                    onOpenAuthor: handleOpenUserDetails,
                    onPreviewMedia: handleOpenMediaPreview,
                  })}
                </div>
              )}
            />
          ) : (
            displayedHomePosts.slice(0, 6).map((post, index) => (
              <React.Fragment key={getVirtualPostKey(post, index)}>
                {renderPostCard(post, {
                  compact: true,
                  autoPlayVideos,
                  reactionValue: normalizeUserReactionValue(postReactionMap[getPostId(post)] ?? post?.userReaction),
                  witnessValue: normalizeWitnessValue(postWitnessMap[getPostId(post)] ?? post?.userWitness),
                  isReactionPending: Boolean(reactionPendingByPostId[getPostId(post)]),
                  isWitnessPending: Boolean(witnessPendingByPostId[getPostId(post)]),
                  onLike: (targetPost) => handleReactToPost(targetPost, 1),
                  onDislike: (targetPost) => handleReactToPost(targetPost, -1),
                  onWitness: handleWitnessPost,
                  onOpenPost: handleOpenPost,
                  onOpenAuthor: handleOpenUserDetails,
                  onPreviewMedia: handleOpenMediaPreview,
                })}
              </React.Fragment>
            ))
          )
        ) : (
          <Virtuoso
            className="echoid-virtuoso-feed"
            customScrollParent={contentElement}
            data={displayedHomePosts}
            computeItemKey={(index, post) => getVirtualPostKey(post, index)}
            endReached={handleHomeFeedEndReached}
            increaseViewportBy={{ top: 520, bottom: 1040 }}
            itemContent={(index, post) => (
              <div className="echoid-virtual-post">
                {renderPostCard(post, {
                  compact: true,
                  autoPlayVideos,
                  reactionValue: normalizeUserReactionValue(postReactionMap[getPostId(post)] ?? post?.userReaction),
                  witnessValue: normalizeWitnessValue(postWitnessMap[getPostId(post)] ?? post?.userWitness),
                  isReactionPending: Boolean(reactionPendingByPostId[getPostId(post)]),
                  isWitnessPending: Boolean(witnessPendingByPostId[getPostId(post)]),
                  onLike: (targetPost) => handleReactToPost(targetPost, 1),
                  onDislike: (targetPost) => handleReactToPost(targetPost, -1),
                  onWitness: handleWitnessPost,
                  onOpenPost: handleOpenPost,
                  onOpenAuthor: handleOpenUserDetails,
                  onPreviewMedia: handleOpenMediaPreview,
                })}
              </div>
            )}
          />
        )}
        {isFeedLoadingMore ? <EchoIdPostCardSkeleton count={2} /> : null}
      </section>
    </div>
  );

  const renderSearch = () => {
    const postResults = host ? searchPosts : filteredLocalSearchPosts;

    return (
      <div className="echoid-search-page">
        <section className="echoid-searchbox">
          <Search size={16} />
          <input
            aria-label="Search EchoId"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search posts, tags, people"
          />
        </section>

        <div className="echoid-search-hint">
          To search user type with @, and for post just texts.
        </div>

        <section className="echoid-section">
          <div className="echoid-section-heading">
            <span className="echoid-section-label">
              {searchMode === "users" ? "User results" : "Post results"}
            </span>
          </div>

          {!hasSearchQuery ? (
            <div className="echoid-empty-card">Start typing to search.</div>
          ) : searchMode === "users" ? (
            isUserSearchLoading && host ? (
              <EchoIdUserSearchSkeleton count={3} />
            ) : filteredSearchUsers.length > 0 ? (
              <div className="echoid-search-results">
                {filteredSearchUsers.map((user) => (
                  <article
                    key={user.clientId || user.username || user.name}
                    className="echoid-search-card is-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenUserDetails(user)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenUserDetails(user);
                      }
                    }}
                  >
                    <div className="echoid-search-avatar-shell">
                      {user.profilePic ? (
                        <img src={user.profilePic} alt={user.name} className="echoid-search-avatar" />
                      ) : (
                        <div className="echoid-search-avatar echoid-search-avatar-fallback">{getDisplayInitial(user.name, "U")}</div>
                      )}
                    </div>
                    <div className="echoid-search-usercopy">
                      <strong>{user.name}</strong>
                      <span>{user.username ? `@${user.username}` : "@unknown"}</span>
                      <span>Trust score {user.trustScore}</span>
                      <p>{user.about || "No about available yet."}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="echoid-empty-card">No matching users yet.</div>
            )
          ) : isSearchLoading && host ? (
            <EchoIdPostCardSkeleton count={3} />
          ) : postResults.length > 0 ? (
            <div className="echoid-search-results">
              <Virtuoso
                className="echoid-virtuoso-feed"
                customScrollParent={contentElement}
                data={postResults}
                computeItemKey={(index, post) => getVirtualPostKey(post, index)}
                increaseViewportBy={{ top: 400, bottom: 900 }}
                itemContent={(index, post) => (
                  <div className="echoid-virtual-post">
                    {renderPostCard(post, {
                      compact: true,
                      autoPlayVideos,
                      reactionValue: normalizeUserReactionValue(
                        postReactionMap[getPostId(post)] ?? post?.userReaction
                      ),
                      witnessValue: normalizeWitnessValue(
                        postWitnessMap[getPostId(post)] ?? post?.userWitness
                      ),
                      isReactionPending: Boolean(
                        reactionPendingByPostId[getPostId(post)]
                      ),
                      isWitnessPending: Boolean(
                        witnessPendingByPostId[getPostId(post)]
                      ),
                      onLike: (targetPost) => handleReactToPost(targetPost, 1),
                      onDislike: (targetPost) => handleReactToPost(targetPost, -1),
                      onWitness: handleWitnessPost,
                      onOpenPost: handleOpenPost,
                      onOpenAuthor: handleOpenUserDetails,
                      onPreviewMedia: handleOpenMediaPreview,
                    })}
                  </div>
                )}
              />
            </div>
          ) : (
            <div className="echoid-empty-card">No matching posts yet.</div>
          )}
        </section>
      </div>
    );
  };

  const renderAlerts = () => (
    <div className="echoid-stack">
      <section className="echoid-hero-card is-compact">
        <div>
          <div className="echoid-section-label">Alerts</div>
          <h2>Watchpoints, replies, and local movement.</h2>
        </div>
      </section>

      {displayedStoredNotifications.length > 0 ? (
        displayedStoredNotifications.map((alert) => {
          const { tone, Icon, label } = getEchoIdNotificationPresentation(alert);
          const hasPostTarget = Boolean(String(alert.postId || "").trim());
          return (
            <button
              type="button"
              key={alert.id}
              className={`echoid-alert-card tone-${tone} ${alert.read ? "" : "is-unread"} ${hasPostTarget ? "is-clickable" : ""}`}
              onClick={() => handleOpenNotification(alert)}
            >
              <div className="echoid-alert-icon">
                <Icon size={18} />
              </div>
              <div className="echoid-alert-copy">
                <span className="echoid-alert-kicker">{label} </span>
                <strong>{alert.title}</strong>
                <p>{alert.body || "A new EchoId notification is ready."}</p>
                <span>{formatRelativeTime(getRelativeMinutesFromDate(alert.createdAt))}</span>
              </div>
              {hasPostTarget ? <ChevronRight className="echoid-alert-chevron" size={18} /> : null}
            </button>
          );
        })
      ) : (
        <div className="echoid-empty-card">No EchoId notifications yet.</div>
      )}

      {hasMoreStoredNotifications ? <div className="echoid-empty-card">Scroll to load more notifications.</div> : null}
    </div>
  );

  const renderProfile = () => (
    <div className="echoid-stack">
      <section className="echoid-profile-card">
        <button
          type="button"
          className={`echoid-profile-avatar ${profileAvatarUrl ? "is-clickable" : ""}`}
          onClick={() => profileAvatarUrl && handleOpenProfileImagePreview(profileAvatarUrl, profileDisplayName)}
          disabled={!profileAvatarUrl}
        >
          {profileAvatarUrl ? (
            <img src={profileAvatarUrl} alt={profileDisplayName} className="echoid-profile-avatar-image" />
          ) : (
            getDisplayInitial(profileDisplayName)
          )}
        </button>
        <div className="echoid-profile-copy">
          <h2>{profileDisplayName}</h2>
          <span>{profileHandle}</span>
          <p>{anonymousProfile?.about || "Collecting strange city signals, low-light stories, and coded weather reports."}</p>
        </div>
      </section>

      <section className="echoid-grid-stats">
        {profileStats.map((item) => (
          <div key={item.label} className="echoid-grid-stat">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="echoid-section">
        <div className="echoid-section-heading">
          <span className="echoid-section-label">Your posts</span>
          <button type="button" onClick={() => setIsOwnPostsHidden((current) => !current)}>
            {isOwnPostsHidden ? "Show" : "Hide"}
          </button>
        </div>
        {isOwnPostsSyncing && !isOwnPostsLoading ? <div className="echoid-sync-pill">Showing cached posts while syncing latest echoes...</div> : null}
        {isOwnPostsLoading ? <EchoIdPostCardSkeleton count={3} /> : null}
        {!isOwnPostsLoading && !isOwnPostsHidden && ownPosts.length === 0 ? (
          <div className="echoid-empty-card">You have not published any Echoes yet.</div>
        ) : null}
        {!isOwnPostsLoading &&
          !isOwnPostsHidden &&
          <Virtuoso
            className="echoid-virtuoso-feed"
            customScrollParent={contentElement}
            data={ownPosts}
            computeItemKey={(index, post) => getVirtualPostKey(post, index)}
            increaseViewportBy={{ top: 400, bottom: 900 }}
            itemContent={(index, post) => (
              <div className="echoid-virtual-post">
                {renderPostCard(post, {
                  compact: true,
                  autoPlayVideos,
                  showOwnerMeta: true,
                  witnessValue: normalizeWitnessValue(
                    postWitnessMap[getPostId(post)] ?? post?.userWitness
                  ),
                  isWitnessPending: Boolean(
                    witnessPendingByPostId[getPostId(post)]
                  ),
                  isDeletePending: Boolean(
                    deletePendingByPostId[getPostId(post)]
                  ),
                  onWitness: handleWitnessPost,
                  onDelete: handleDeletePost,
                  onOpenPost: handleOpenPost,
                  onOpenAuthor: handleOpenUserDetails,
                  onPreviewMedia: handleOpenMediaPreview,
                })}
              </div>
            )}
          />}
        {!isOwnPostsLoading && !isOwnPostsHidden && hasMoreOwnPosts ? (
          <div className="echoid-empty-card">Scroll to load 10 more posts.</div>
        ) : null}
      </section>

      <section className="echoid-section">
        <div className="echoid-section-heading">
          <span className="echoid-section-label">Saved identity</span>
        </div>
        <div className="echoid-detail-list">
          <div className="echoid-detail-row">
            <span>Anonymous ID</span>
            <strong>{anonymousPosterClientId || "Not set"}</strong>
          </div>
          <div className="echoid-detail-row">
            <span>Signal mode</span>
            <strong>Public relay</strong>
          </div>
          <div className="echoid-detail-row">
            <span>Joined</span>
            <strong>May 2025</strong>
          </div>
        </div>
      </section>
    </div>
  );

  const renderComposer = () => (
    <div className="echoid-stack">
      <section className="echoid-compose-card">
        <div className="echoid-compose-grid">
          <div className="echoid-compose-intro">
            <div className="echoid-section-label">Create echo</div>
            <h2>Create Echo</h2>
            <p>Broadcast a new post to your field.</p>
          </div>

          <label className="echoid-field">
            <span>Category</span>
            <select
              value={composeForm.category}
              onChange={(event) =>
                setComposeForm((prev) => ({
                  ...prev,
                  category: event.target.value,
                  subCategory: event.target.value === "confessions" ? prev.subCategory || "confession formal" : "",
                }))
              }
            >
              {POST_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {isConfessionCategory(composeForm.category) ? (
            <label className="echoid-field">
              <span>Subcategory</span>
              <select
                value={composeForm.subCategory}
                onChange={(event) => setComposeForm((prev) => ({ ...prev, subCategory: event.target.value }))}
              >
                {CONFESSION_SUBCATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="echoid-field">
            <span>Title</span>
            <input
              type="text"
              value={composeForm.title}
              onChange={(event) => setComposeForm((prev) => ({ ...prev, title: event.target.value.slice(0, 55) }))}
              placeholder="Short title"
              maxLength={55}
              autoFocus
            />
          </label>

          <label className="echoid-field">
            <span>Body</span>
            <textarea
              ref={bodyInputRef}
              value={composeForm.body}
              onChange={(event) => setComposeForm((prev) => ({ ...prev, body: event.target.value.slice(0, 1200) }))}
              placeholder="Write normally. Media will insert at cursor."
              maxLength={1200}
            />
          </label>
        </div>

        {composeMedia.length > 0 ? (
          <div className="echoid-compose-media-list">
            {composeMedia.map((media) => (
              <div key={media.id} className="echoid-compose-media-chip">
                <div className="echoid-compose-media-chip-preview">
                  {media.previewUrl ? (
                    media.kind === "video" ? (
                      <EchoIdVideoThumbnail src={media.previewUrl} poster={media.thumbnailUrl} className="echoid-compose-media-thumb" />
                    ) : (
                      <img src={media.previewUrl} alt={media.name || "Selected media"} className="echoid-compose-media-thumb" loading="lazy" decoding="async" />
                    )
                  ) : null}
                  <button
                    type="button"
                    className={`echoid-compose-media-cover-btn ${selectedCoverMediaId === media.id ? "is-active" : ""}`}
                    onClick={() => handleSelectCoverMedia(media.id)}
                    disabled={isPublishing}
                  >
                    {selectedCoverMediaId === media.id ? "Cover image" : "Make cover"}
                  </button>
                </div>
                <div className="echoid-compose-media-chip-meta">
                  <span>{media.name}</span>
                  <button type="button" onClick={() => handleRemoveMedia(media.id)} disabled={isPublishing}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="echoid-compose-footer">
          <button type="button" className="echoid-attach-btn" onClick={handlePickMedia}>
            <ImageIcon size={16} />
            Pick media
          </button>
          <span>{composeForm.title.length}/32 title · {getTextBodyLength(composeForm.body)}/1200</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="echoid-hidden-file-input"
          onChange={handleWebFilePick}
        />

        {composeError ? <div className="echoid-compose-error">{composeError}</div> : null}

        <button
          type="button"
          className="echoid-primary-btn"
          onClick={handleOpenComposePreview}
          disabled={isPublishing || !composeForm.title.trim() || !composeForm.body.trim()}
        >
          Preview Echo
        </button>
      </section>
    </div>
  );

  const renderActivePage = () => {
    switch (activeTab) {
      case "search":
        return renderSearch();
      case "alerts":
        return renderAlerts();
      case "profile":
        return renderProfile();
      case "echo":
        return renderComposer();
      case "home":
      default:
        return renderHome();
    }
  };

  const previewOverlay = mediaPreview ? <EchoIdMediaViewer preview={mediaPreview} onClose={handleCloseMediaPreview} /> : null;

  if (isAnonymousBootstrapLoading) {
    return (
      <div className="echoid-loader-screen">
        <StarLoader />
      </div>
    );
  }

  if (isComposePreviewOpen) {
    return (
      <Compose
        composeForm={composeForm}
        previewAuthorName={previewAuthorName}
        previewAuthorHandle={previewAuthorHandle}
        composerPreviewBlocks={composerPreviewBlocks}
        selectedCoverMediaId={selectedCoverMediaId}
        onSelectCoverMedia={handleSelectCoverMedia}
        onToggleAnonymity={handleToggleComposeAnonymity}
        onBack={() => setIsComposePreviewOpen(false)}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        publishProgress={publishProgress}
        composeError={composeError}
      />
    );
  }

  if (selectedUserClientId) {
    return (
      <>
        <UserDetails
          user={selectedUserDetail}
          isMobile={isMobileLayout || isNativeAndroid}
          posts={selectedUserPosts}
          postsLoaded={selectedUserPostsLoaded}
          postsLoading={selectedUserPostsLoading}
          postsError={selectedUserPostsError}
          isLoading={selectedUserLoading}
          error={selectedUserError}
          onBack={handleCloseUserDetails}
          onLoadPosts={handleLoadSelectedUserPosts}
          onOpenPost={handleOpenPost}
          onPreviewProfileImage={handleOpenProfileImagePreview}
          autoPlayVideos={autoPlayVideos}
          renderPostCard={(post, options = {}) =>
            renderPostCard(post, {
              ...options,
              autoPlayVideos,
              reactionValue: normalizeUserReactionValue(postReactionMap[getPostId(post)] ?? post?.userReaction),
              witnessValue: normalizeWitnessValue(postWitnessMap[getPostId(post)] ?? post?.userWitness),
              isReactionPending: Boolean(reactionPendingByPostId[getPostId(post)]),
              isWitnessPending: Boolean(witnessPendingByPostId[getPostId(post)]),
              onLike: (targetPost) => handleReactToPost(targetPost, 1),
              onDislike: (targetPost) => handleReactToPost(targetPost, -1),
              onWitness: handleWitnessPost,
              onOpenAuthor: handleOpenUserDetails,
              onPreviewMedia: handleOpenMediaPreview,
            })
          }
        />
        {previewOverlay}
      </>
    );
  }

  if (selectedPost) {
    return (
      <>
        <EchoIdPostDetail
          post={selectedPost}
          fullBodyText={selectedPostContentLoading ? "" : getFullPostBody(selectedPost.body)}
          mediaItems={selectedPostContentLoading ? [] : getPostMediaItems(selectedPost)}
          leadMedia={selectedPostContentLoading ? null : getPostLeadMedia(selectedPost)}
          bodyBlocks={selectedPostContentLoading ? [] : getPostBodyBlocks(selectedPost)}
          relativeTimeLabel={formatRelativeTime(getRelativeMinutesFromDate(selectedPost.createdAt))}
          reactionValue={normalizeUserReactionValue(postReactionMap[getPostId(selectedPost)] ?? selectedPost?.userReaction)}
          witnessValue={selectedPostWitnessValue}
          isWitnessPending={Boolean(witnessPendingByPostId[getPostId(selectedPost)])}
          canShowWitness={shouldShowWitness(selectedPost?.category)}
          canManageWitnesses={selectedPostIsOwner}
          isReactionPending={Boolean(reactionPendingByPostId[getPostId(selectedPost)])}
          onBack={handleClosePost}
          onLike={(post) => handleReactToPost(post, 1)}
          onDislike={(post) => handleReactToPost(post, -1)}
          onWitness={handleWitnessPost}
          onOpenWitnesses={handleOpenWitnessPanel}
          commentsVisible={selectedPostCommentsVisible}
          commentsLoading={selectedPostCommentsLoading}
          commentsLoadingMore={selectedPostCommentsLoadingMore}
          commentsHasMore={selectedPostCommentsHasMore}
          comments={selectedPostComments}
          commentsError={selectedPostCommentsError}
          onShowComments={handleShowComments}
          onLoadMoreComments={handleLoadMoreComments}
          repliesByCommentId={repliesByCommentId}
          replyLoadingByCommentId={replyLoadingByCommentId}
          replyErrorByCommentId={replyErrorByCommentId}
          replyVisibleByCommentId={replyVisibleByCommentId}
          onToggleReplies={(comment) => handleToggleReplies(getPostId(selectedPost), comment)}
          commentDraft={selectedPostCommentDraft}
          onCommentDraftChange={(value) => handleCommentDraftChange(getPostId(selectedPost), value)}
          onSubmitComment={handleSubmitComment}
          replyTarget={selectedPostReplyTarget}
          onReplyToComment={(comment) => handleReplyToComment(getPostId(selectedPost), comment)}
          onCancelReplyToComment={() => handleCancelReplyToComment(getPostId(selectedPost))}
          isCommentSubmitting={selectedPostCommentSubmitting}
          commentSubmitError={selectedPostCommentSubmitError}
          viewerAvatarUrl={profileAvatarUrl}
          viewerName={profileDisplayName}
          isPostLoading={selectedPostContentLoading}
          postError={selectedPostError}
          witnessPanelOpen={selectedPostWitnessPanelOpen}
          witnessEntries={selectedPostWitnessEntries}
          witnessEntriesLoading={selectedPostWitnessEntriesLoading}
          witnessEntriesError={selectedPostWitnessEntriesError}
          onCloseWitnessPanel={() => setWitnessPanelPostId("")}
          onRemoveWitnessEntry={(entry) => handleRemoveWitnessEntry(selectedPost, entry)}
          onOpenAuthor={handleOpenUserDetails}
          onPreviewMedia={(media, altText) =>
            handleOpenMediaPreview(media, altText, {
              author: selectedPost?.name || "Anonymous",
              handle: selectedPost?.anonymity === true || String(selectedPost?.anonymity || "").toLowerCase() === "true"
                ? `@${String(selectedPost?.posterId || selectedPost?.postId || selectedPost?.PostId || "anonymous").trim()}`
                : selectedPost?.username ? `@${selectedPost.username}` : "@anonymous",
              title: selectedPost?.title || "",
              relativeTimeLabel: formatRelativeTime(getRelativeMinutesFromDate(selectedPost?.createdAt)),
              avatarUrl: String(selectedPost?.profilePic || selectedPost?.profileUrl || selectedPost?.userProfile || "").trim(),
            })
          }
          onPreviewImage={handleOpenProfileImagePreview}
          authorAvatarUrl={String(selectedPost?.profilePic || selectedPost?.profileUrl || selectedPost?.userProfile || "").trim()}
          onReport={handleReportPost}
          onDelete={handleDeletePost}
          isReported={Boolean(postReportMap[getPostId(selectedPost)])}
          isReportPending={Boolean(reportPendingByPostId[getPostId(selectedPost)])}
          isDeletePending={Boolean(deletePendingByPostId[getPostId(selectedPost)])}
        />
        {previewOverlay}
      </>
    );
  }

  return (
    <div className={`echoid-page ${shouldShowBottomNav ? "" : "echoid-page--no-bottomnav"} ${isNativeAndroid ? "is-native-android" : ""}`}>
      <button
        type="button"
        className="echoid-mobile-menu-button"
        aria-label="Open navigation"
        ref={mobileDrawerButtonRef}
        onClick={() => setIsDrawerOpen((current) => !current)}
      >
        <Menu size={18} />
      </button>

      {activeTab === "home" ? (
        <div className="echoid-mobile-controls">
          <button
            type="button"
            className={`echoid-autoplay-toggle ${autoPlayVideos ? "is-active" : ""}`}
            onClick={() => setAutoPlayVideos((current) => !current)}
            aria-pressed={autoPlayVideos}
            aria-label={`Turn video autoplay ${autoPlayVideos ? "off" : "on"}`}
          >
            Auto video {autoPlayVideos ? "On" : "Off"}
          </button>
          <button
            type="button"
            className="echoid-mobile-filter-button"
            aria-label="Open sort options"
            ref={mobileFilterButtonRef}
            onClick={() => setIsSortMenuOpen((current) => !current)}
          >
            <Filter size={18} />
          </button>
        </div>
      ) : null}

      {activeTab === "home" && isSortMenuOpen ? (
        <div className="echoid-mobile-filter-menu" aria-label="Sort options" ref={mobileFilterMenuRef}>
          {sortOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`echoid-filter-option ${sortBy === option.id ? "is-active" : ""}`}
              onClick={() => {
                setSortBy(option.id);
                setIsSortMenuOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {isDrawerOpen ? (
        <button
          type="button"
          className="echoid-drawer-overlay"
          aria-label="Close navigation drawer"
          onClick={() => setIsDrawerOpen(false)}
        />
      ) : null}

      <aside className={`echoid-drawer ${isDrawerOpen ? "is-open" : ""}`} aria-label="EchoId navigation" ref={drawerRef}>
        <div className="echoid-drawer-head">
          <span className="echoid-drawer-kicker">Menu</span>
          <div className="echoid-drawer-brand">
            <div className="echoid-brand-avatar" aria-hidden="true">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt={profileDisplayName} className="echoid-brand-avatar-image" />
              ) : (
                <span>{getDisplayInitial(profileDisplayName)}</span>
              )}
            </div>
            <strong
              className="echoid-brand-link"
              onClick={() => {
                setActiveTab("home");
                setIsDrawerOpen(false);
                history.push("/home");
              }}
            >
              EchoId
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="echoid-drawer-echo-button"
          onClick={() => {
            setActiveTab("echo");
            setIsDrawerOpen(false);
          }}
        >
          <span className="echoid-drawer-echo-icon">
            <MessageSquarePlus size={16} />
          </span>
          <span>Create Echo</span>
        </button>

        <section className="echoid-drawer-section">
          <div className="echoid-drawer-section-title">{shouldShowBottomNav ? "Category" : "Navigation"}</div>
          <div className="echoid-drawer-list">
            {shouldShowBottomNav
              ? homeCategoryLabels.map((item) => {
                const value = toCategoryValue(item);
                const isActive = value === selectedHomeCategory;

                return (
                  <button
                    key={item}
                    type="button"
                    className={`echoid-drawer-item ${isActive ? "is-active" : ""}`}
                    onClick={() => handleSelectHomeCategory(value)}
                  >
                    <span>{item}</span>
                    <ChevronRight size={15} />
                  </button>
                );
              })
              : drawerNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasUnreadAlerts = item.id === "alerts" && echoIdUnreadNotifications > 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`echoid-drawer-item ${isActive ? "is-active" : ""} ${hasUnreadAlerts ? "has-echoid-alerts" : ""}`}
                    onClick={() => handleSelectDrawerTab(item.id)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span>
                      <Icon size={16} />
                      {item.label}
                    </span>
                    <ChevronRight size={15} />
                  </button>
                );
              })}
          </div>
        </section>
      </aside>

      <div className="echoid-shell">
        <header className="echoid-header">
          <div className="echoid-header-left">
            <button
              type="button"
              className="echoid-icon-button"
              aria-label="Open menu"
              ref={desktopDrawerButtonRef}
              onClick={() => setIsDrawerOpen((current) => !current)}
            >
              <Menu size={18} />
            </button>

            <div className="echoid-brand">
              <div className="echoid-brand-avatar" aria-hidden="true">
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt={profileDisplayName} className="echoid-brand-avatar-image" />
                ) : (
                  <span>{getDisplayInitial(profileDisplayName)}</span>
                )}
              </div>
              <strong
                className="echoid-brand-link"
                onClick={() => {
                  setActiveTab("home");
                  history.push("/home");
                }}
              >
                EchoId
              </strong>
            </div>
          </div>

          {activeTab === "home" ? (
            <div className="echoid-filter-wrap">
              <button
                type="button"
                className={`echoid-autoplay-toggle ${autoPlayVideos ? "is-active" : ""}`}
                onClick={() => setAutoPlayVideos((current) => !current)}
                aria-pressed={autoPlayVideos}
                aria-label={`Turn video autoplay ${autoPlayVideos ? "off" : "on"}`}
              >
                Auto video {autoPlayVideos ? "On" : "Off"}
              </button>
              <button
                type="button"
                className="echoid-icon-button"
                aria-label="Open sort options"
                aria-expanded={isSortMenuOpen}
                ref={desktopFilterButtonRef}
                onClick={() => setIsSortMenuOpen((current) => !current)}
              >
                <Filter size={18} />
              </button>

              {isSortMenuOpen ? (
                <div className="echoid-filter-menu" aria-label="Sort options" ref={desktopFilterMenuRef}>
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`echoid-filter-option ${sortBy === option.id ? "is-active" : ""}`}
                      onClick={() => {
                        setSortBy(option.id);
                        setIsSortMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </header>

        <main
          className="echoid-content"
          ref={handleContentRef}
          onScroll={handleContentScroll}
        >
          {activeTab === "home" && isPullRefreshUiVisible ? <EchoIdPullRefreshSpinner ref={pullSpinnerRef} /> : null}
          {activeTab === "home" && pullRefreshNotice ? <div className="echoid-pull-refresh-notice">{pullRefreshNotice}</div> : null}
          {renderActivePage()}
        </main>

        {shouldShowBottomNav ? (
          <nav className="echoid-bottomnav" aria-label="EchoId navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const hasUnreadAlerts = tab.id === "alerts" && echoIdUnreadNotifications > 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`echoid-nav-button ${tab.isPrimary ? "is-primary" : ""} ${isActive ? "is-active" : ""} ${hasUnreadAlerts ? "has-echoid-alerts" : ""
                    }`}
                  onClick={() => {
                    setIsComposePreviewOpen(false);
                    setActiveTab(tab.id);
                  }}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="echoid-nav-button-icon">
                    <Icon size={tab.isPrimary ? 16 : 17} />
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>
      {previewOverlay}
    </div>
  );
}

