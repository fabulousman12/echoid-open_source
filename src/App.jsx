import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
// import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonButton, IonSpinner, IonLoading } from '@ionic/react';
import { BrowserRouter as Router, Route, Switch, Redirect,useLocation  } from 'react-router-dom';

// import WebSocketService from './services/WebsokcetService';
import { LoginProvider } from './Contexts/UserContext';
import { MessageProvider } from './Contexts/MessagesContext';
import HomeScreen from './pages/HomeScreen';
import LoginScreen from './pages/LoginScreen';
import TemporarySetupPage from './pages/TemporarySetupPage';
import TemporaryHome from './pages/TemporaryHome';
import TemporaryChatWindow from './pages/TemporaryChatWindow';
import TemporaryProfilePage from './pages/TemporaryProfilePage';
import SignupScreen from './pages/SignupScreen';
import './tailwind.css';
import { useHistory } from 'react-router';
//import { Permissions } from '@capacitor/permissions';
import SettingsPage from './pages/experment_settings'
import 'bootstrap/dist/css/bootstrap.min.css'; 
import CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';
import NewChatWindow from './pages/Newchatwindo';
import { Storage, Drivers } from '@ionic/storage';
import NewChat from './pages/newchat';
import NewGroupPage from './pages/NewGroupPage';
import GroupChatWindow from './pages/GroupChatWindow';
import GroupAddMembersPage from './pages/GroupAddMembersPage';
import StatusViewers from './pages/StatusViewers';

import { App as CapacitorApp } from '@capacitor/app';
import {  setupIonicReact } from '@ionic/react';
import '@ionic/react/css/core.css';
import Maindata from './data';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import { isPlatform } from '@ionic/react';
import VideoCallScreen from "./components/VideoCallScreen"
import  ForwardScreen from './pages/ForwardScreen';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import { MessageContext } from './Contexts/MessagesContext';
import useUserStore from './services/useUserStore'; 
import './theme/variables.css';
import { CallRuntime } from "./store/CallRuntime";   
import {
  startCall,
  answerCall,
  endCall,
} from './components/webrtc/callHandler';

//import  CallRuntimeRenderer from './CallRuntimeRenderer' 
import { LocalNotifications } from '@capacitor/local-notifications';
import { scheduleReconnect } from "./services/wsReconnect";
import { shouldUpsertIncomingGroupSummary } from "./services/groupIngestPolicy";

import AdminChat from './pages/AdminChat';
// import { initializeApp } from 'firebase/app';
// import { getMessaging } from 'firebase/messaging';
import ArchivedChats from './pages/Archived';
import useMessageStore from './services/useMessageStore.js';
import ChatWindow from './pages/chatwindo';
import {WebSocketContext} from './services/websokcetmain'
import { LiveUpdate } from '@capawesome/capacitor-live-update';
import Blocklist from './components/Blocklist'
import StarLoader  from './pages/StarLoader';
import ProfilePage from './pages/ProfilePage';
import { IonAlert } from '@ionic/react';
import HelpInfoChat from './pages/HelpInfoChat';
import UpdateModal from './components/UpdateModal';
setupIonicReact();
import { Capacitor } from '@capacitor/core';
//import FloatingGlobal  from './components/FloatingGlobal'
import { startCallRingtone,stopCallRingtone,startCallTimeout,clearCallTimeout } from './services/callRingtone';
import { appendCallLog } from "./services/callLog";
import Swal from 'sweetalert2';

import { useNetworkStatus } from './services/useNetworkStatus';
import { refreshAccessToken, refreshAccessTokenWithReason } from "./services/apiClient";
import { api } from "./services/api";
import { getDeviceId, getDeviceIdSync } from "./services/deviceInfo";
import { hashPrivateKey } from "./services/keyHash";
import { buildUnreadUpdate } from "./services/wsPayloads";
import { getAccessToken, globalLogout } from "./services/authTokens";
import {
  getTemporaryRuntimeUser,
  getTemporarySessionUser,
  isTemporaryRuntime,
  setTemporarySessionUser,
  subscribeTemporarySession,
} from "./services/temporarySession";
import {
  appendTemporaryMessage,
  getTemporaryRequestsForRoom,
  removeTemporaryRequest,
  removeTemporaryRequestsForRoom,
  removeTemporaryRoom,
  upsertTemporaryRequest,
  upsertTemporaryRoom,
} from "./services/tempRoomStorage";

import img from '/img.jpg';

export default function App() {
//  //console.log('%c Is this on developing phase :' + Maindata.IsDev, 'color: blue; font-size: 15px; font-weight: bold;');
 // const { connect, isConnected, close,socket,db,messages,setMessages,getmessages } = useWebSocket(); // Use WebSocket context methods
const {
  getMessagesFromSQLite,
  storeMessageInSQLite,
  getunreadcount,
  updateUnreadCountInSQLite,
  resetUnreadCountInSQLite,
  fetchAllMessages,
  initGroupMessagesSchema,
  saveGroupMessageInSQLite,
  getGroupMessagesPaginatedByGroupFromSQLite,
  initGroupSummariesSchema,
  upsertGroupSummariesInSQLite,
  getGroupSummariesFromSQLite
} = useContext(WebSocketContext)

let ws; // reu
 
const {setSelectedUser1} = useContext(MessageContext)
  const [initialRoute, setInitialRoute] = useState('/home'); // Default route is Home
 // const wsService = WebSocketService();

//  const history = useHistory(); 
//const [isConnected, setIsConnected] = useState(false);
  const [link, setLink] = useState(null);
  let store;
  const [isIntialized,setIsIntialized] = useState(false)
//const {usersMain, setUsersMain} = useContext(MessageContext);
  const socket = useRef(null);
  const temporarySocket = useRef(null);
  const temporarySocketHeartbeatRef = useRef(null);
  const temporarySocketUrlRef = useRef(null);
  const temporarySocketReconnectTimeoutRef = useRef(null);
  const temporarySocketReconnectAttemptRef = useRef(0);
  const temporarySocketManualCloseRef = useRef(false);
  const acceptedTempRoomsRef = useRef(new Map());
  const host = `https://${Maindata.SERVER_URL}`;
 // const [initialMessageUserIds, setInitialMessageUserIds] = useState(new Set());
//  const [unreadCounts, setUnreadCounts] = useState({});\
const history = useHistory()
  const [messages, setMessages] = useState([]);
  const [groupMessagesByGroup, setGroupMessagesByGroup] = useState({});
  const [groupsMain, setGroupsMain] = useState(globalThis.storage.readJSON("groupsMain", []) || []);
  const selectedUser = useRef(null);
  const activeGroupIdRef = useRef(null);
  const activeTempRoomIdRef = useRef(null);
  const [latestMessageTimestamps, setLatestMessageTimestamps] = useState(new Map());
  const [currentUser, setCurrenuser] = useState({});
 const currentuserRef = useRef(getTemporaryRuntimeUser() || globalThis.storage.readJSON('currentuser', null) || null);
let heartbeatIntervalId = null;
  let db; // Ref to store the database connection
  const dbRef = useRef(null);
  const messagesRef = useRef([]);
 
//const [islogin,setislogin] = useState(false)
const [mutedlist,setmutedList] = useState([])
const [mutedGroupIds, setMutedGroupIds] = useState(globalThis.storage.readJSON('mutedGroups', []) || []);
const [usersMain, setUsersMain] = useState([]);
  const [localinit, setlocalinital] = useState(false);
 // let pingInterval = null;
let heartbeatTimeoutId = null; // ?? new, to track the 20s timeout
let foregroundHeartbeatId = null;
let coldCallHandled = false;

  //  const { usersMain, setUsersMain, addUserToMain, removeUserFromMain } = useUserStore()
     const { messagestest, setMessagestest } = useMessageStore();
     const {usersMaintest,setUsersMaintest} = useUserStore()
    const [isnotmute,setismute] = useState(globalThis.storage.readJSON('ismute', true))
    const [customSounds, setCustomSounds] = useState([]);
    const [ForAllSounfds,setForAllSounds] = useState(null)
    const [mode, setMode] = useState('normal');
const [isload,setIsload] = useState(false)

//const [isactive,setisactive] = useState(false);
const isAcitve = useRef(true);
     const [showModal2, setShowModal2] = useState(false);
  const [criticalUpdate, setCriticalUpdate] = useState(false);
  const [serverVersion, setServerVersion] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const CURRENT_APP_VERSION = Maindata.AppVersion;
const [blockedUsers, setBlockedUsers] = useState(new Set());
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminUnread, setAdminUnread] = useState(false);
const [blockedBy, setBlockedBy] = useState(new Set());
const serverreconnected = useRef(true)
const wsRefreshInFlight = useRef(false);
const wsRefreshTried = useRef(false);
const suppressWsStatusSwalRef = useRef(false);
const incomingCallerFetchInFlight = useRef(new Set());
 const [force, forceUpdate] = useState(true);
const authSwalShown = useRef(false);
const hasWsTokenParam = (url) => {
  try {
    const u = new URL(url);
    const token = u.searchParams.get("token");
    return !!token && token !== "null" && token !== "undefined";
  } catch {
    return false;
  }
};
const isRevocationLike = (status, payload) => {
  if (status === 401 || status === 403) return true;
  const msg = (payload?.error || payload?.message || "").toLowerCase();
  return msg.includes("revoke") || msg.includes("revocation") || (msg.includes("token") && msg.includes("invalid")) || msg.includes("logout");
};
const showAuthSwal = (title, text) => {
  if (authSwalShown.current) return;
  authSwalShown.current = true;
  Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'OK',
    width: 320,
    padding: '1.2rem',
    backdrop: 'rgba(0,0,0,0.4)',
    borderRadius:'10px',
    customClass: {
      popup: 'mobile-alert'
    }
  });
};
const clearPrefStorage = () => {
  try {
    globalThis.storage?.clear?.();
  } catch (err) {
    console.warn("Failed to clear pref storage", err);
  }
};

const adminMessagesCacheKey = "admin_messages_cache";
const ADMIN_PAGE_SIZE = 20;

const loadAdminMessagesFromStorage = () => {
  const raw = globalThis.storage.getItem(adminMessagesCacheKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to parse cached admin messages:", err);
    return [];
  }
};

const saveAdminMessagesToStorage = (messagesToSave) => {
  try {
    globalThis.storage.setItem(adminMessagesCacheKey, JSON.stringify(messagesToSave || []));
  } catch (err) {
    console.warn("Failed to cache admin messages:", err);
  }
};

const normalizeAdminMessages = (messages) =>
  messages.map((msg) => {
    const id = msg?._id || msg?.id || null;
    return {
      ...msg,
      id: id || msg?.id,
      read: msg?.read === true,
    };
  });

const hasAdminUnread = (messages) =>
  messages.some((msg) => msg?.read === false);

const getAdminMessageId = (msg) => msg?._id || msg?.id || null;

const getLastAdminMessageId = (messages) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.sender !== "admin") continue;
    const id = getAdminMessageId(msg);
    if (id) return id;
  }
  return null;
};

const mergeAdminMessages = (existing, incoming) => {
  if (!Array.isArray(existing) || existing.length === 0) return incoming || [];
  if (!Array.isArray(incoming) || incoming.length === 0) return existing || [];
  const seen = new Set(existing.map(getAdminMessageId).filter(Boolean));
  const merged = [...existing];
  for (const msg of incoming) {
    const id = getAdminMessageId(msg);
    if (!id || !seen.has(id)) {
      merged.push(msg);
      if (id) seen.add(id);
    }
  }
  merged.sort((a, b) => {
    const ta = Number(a?.timestamp || 0);
    const tb = Number(b?.timestamp || 0);
    if (ta !== tb) return ta - tb;
    const ida = String(a?._id || a?.id || "");
    const idb = String(b?._id || b?.id || "");
    return ida.localeCompare(idb);
  });
  return merged;
};

const fetchAdminMessages = async (options = {}) => {
  const { beforeId, afterId } = options || {};
  const cached = loadAdminMessagesFromStorage();
  if (cached.length > 0) {
    const normalizedCached = normalizeAdminMessages(cached);
    setAdminMessages(normalizedCached);
    setAdminUnread(hasAdminUnread(normalizedCached));
  }
  const normalizedCached = cached.length > 0 ? normalizeAdminMessages(cached) : [];
  const resolvedAfterId = beforeId ? null : (afterId || getLastAdminMessageId(normalizedCached));
  try {
    const res = await api.adminMessages(host, {
      beforeId,
      afterId: resolvedAfterId,
      limit: ADMIN_PAGE_SIZE
    });
    const json = await res.json();
    const rawMessages = json.messages || [];
    const normalizedIncoming = normalizeAdminMessages(rawMessages);
    const merged = mergeAdminMessages(normalizedCached, normalizedIncoming);
    setAdminMessages(merged);
    setAdminUnread(hasAdminUnread(merged));
    saveAdminMessagesToStorage(merged);
    return { messages: merged, fetchedCount: normalizedIncoming.length };
  } catch (err) {
    if (cached.length > 0) {
      return { messages: normalizedCached, fetchedCount: 0 };
    }
    throw err;
  }
};

const markAdminMessagesRead = (messagesToMark) => {
  const list = messagesToMark && messagesToMark.length ? messagesToMark : adminMessages;
  if (!list || list.length === 0) {
    setAdminUnread(false);
    return list || [];
  }
  const updated = list.map((msg) => ({ ...msg, read: true }));
  setAdminMessages(updated);
  setAdminUnread(false);
  saveAdminMessagesToStorage(updated);
  return updated;
};

const sendAdminMessage = async (content) => {
  try {
    const res = await api.adminSend(host, content);
    return !!res?.ok;
  } catch (err) {
    console.warn("Failed to send admin message:", err);
    return false;
  }
};

useEffect(() => {
  let isMounted = true;
  const loadAdminMessages = async () => {
    try {
      const result = await fetchAdminMessages();
      const messages = result?.messages || [];
      if (!isMounted) return;
      setAdminUnread(hasAdminUnread(messages));
    } catch (err) {
      console.warn("Failed to load admin messages:", err);
    }
  };
  loadAdminMessages();
  return () => {
    isMounted = false;
  };
}, []);
// const firebaseConfig = {
//   apiKey: "AIzaSyBQ6GMp7jixdrvnNy9r32gIWJD4x2UYHgo",
//   authDomain: "echoid-22ed5.firebaseapp.com",
//   projectId: "echoid-22ed5",
//   storageBucket: "echoid-22ed5.firebasestorage.app",
//   messagingSenderId: "673276204374",
//   appId: "1:673276204374:web:ae809ed9aff513587732f7",
//   measurementId: "G-THMF9SM692"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const { connected } = useNetworkStatus();
const [show, setShow] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);

  useEffect(() => {
    return subscribeTemporarySession(() => {
      currentuserRef.current = getTemporaryRuntimeUser() || null;
    });
  }, []);

  useEffect(() => {
    if (lastStatus === null) {
      setLastStatus(connected);
      return;
    }

    if (connected !== lastStatus) {
      setShow(true);
      setLastStatus(connected);
    }
  }, [connected]);
  useEffect(() => {
    const reRender = () => {forceUpdate(x => !x)

       console.log("showtime",CallRuntime.showScreen)
    }

    ;   // ONLY triggers rerender
   
    window.addEventListener("render-call-ui", reRender);
    return () => window.removeEventListener("render-call-ui", reRender);
  }, []);

window.addEventListener("CallPermissionResult", async (e) => {
  const { camera, microphone } = e.detail;

  console.log("Native permission result ?", camera, microphone);

  if (camera !== "granted" || microphone !== "granted") {
    console.warn("User denied native permissions");
    return;
  }

  // NOW SAFE TO CALL getUserMedia()
  console.log("Requesting browser getUserMedia now...");
  window._resolvePermission && window._resolvePermission();
});
window.addEventListener("NativeCallPermissionResult", (event) => {
  console.log("Native permission event:", event.detail);

  if (window._resolvePermission) {
    window._resolvePermission(event.detail.granted);
    window._resolvePermission = null; // cleanup
  }
});


// Only apply mocks in browser (ionic serve)
if (!Capacitor.isNativePlatform()) {
  console.warn("?? Mocking Capacitor plugins for web preview mode");

  // Mock Filesystem
  window.Capacitor = window.Capacitor || {};
  window.Capacitor.Plugins = window.Capacitor.Plugins || {};
  window.Capacitor.Plugins.Filesystem = {
    readFile: async () => ({ data: "" }),
    writeFile: async () => ({ uri: "mock://file" }),
    mkdir: async () => {},
    stat: async () => ({}),
    readdir: async () => ({ files: [] }),
    deleteFile: async () => {},
  };

  // Mock Preferences
  window.Capacitor.Plugins.Preferences = {
    get: async () => ({ value: null }),
    set: async () => {},
    remove: async () => {},
    clear: async () => {},
  };

  // Mock FileChooser & FilePath if used
  window.FileChooser = {
    open: (opts, success) => {
      console.log("Mock FileChooser called");
      success && success("mock://audio.mp3");
    },
  };
  window.FilePath = {
    resolveNativePath: (uri, success) => {
      console.log("Mock FilePath.resolveNativePath called");
      success && success("/mock/path/to/audio.mp3");
    },
  };

  // Add any other plugin mocks you use frequently
}

const normalizeGroupMessagePayload = (message, fallbackGroupId = null) => {
  if (!message) return null;
  const id = String(message.id || message._id || "").trim();
  const groupId = String(message.groupId || message.group || message.group_id || fallbackGroupId || "").trim();
  if (!id || !groupId) return null;
  const mediaUrl = message.mediaUrl || "";
  const looksLocalMediaPath = (() => {
    const raw = String(mediaUrl || "").trim();
    if (!raw) return false;
    if (/^(file:|content:|capacitor:|\/)/i.test(raw)) return true;
    if (/^(https?:|wss?:)/i.test(raw)) return false;
    if (/^(blob:|data:)/i.test(raw)) return true;
    if (/^(group_media\/|files\/|thumbnails\/|documents\/)/i.test(raw)) return true;
    if (/\/documents\//i.test(raw)) return true;
    return false;
  })();
  const downloadFlag = (() => {
    const value = message.isDownload ?? message.is_download;
    if (value === true || value === 1) return true;
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  })();
  return {
    id,
    clientMessageId: String(message.clientMessageId || "").trim(),
    groupId,
    sender: String(message.sender || ""),
    messageType: String(message.messageType || message.type || "text"),
    content: typeof message.content === "string" ? message.content : "",
    mediaUrl,
    previewUrl: message.previewUrl || "",
    isDownload: downloadFlag || looksLocalMediaPath,
    isReplyTo: message.isReplyTo || message.is_reply_to || null,
    timestamp: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString(),
    status: message.status || "sent",
    readBy: Array.isArray(message.readBy) ? message.readBy : []
  };
};

const preserveLocalGroupMessageState = (localMap = {}, incomingMessage = null) => {
  const normalized = normalizeGroupMessagePayload(incomingMessage, incomingMessage?.groupId || incomingMessage?.group);
  if (!normalized) return null;
  const gid = String(normalized.groupId || "");
  const rows = Array.isArray(localMap?.[gid]) ? localMap[gid] : [];
  const byId = rows.find((m) => String(m?.id || "") === String(normalized.id || ""));
  const byClientId = normalized.clientMessageId
    ? rows.find((m) => String(m?.id || "") === String(normalized.clientMessageId))
    : null;
  const local = byId || byClientId || null;
  if (!local) return normalized;

  const incomingRead = Array.isArray(normalized.readBy) ? normalized.readBy.map(String) : [];
  const localRead = Array.isArray(local.readBy) ? local.readBy.map(String) : [];
  const readUnion = Array.from(new Set([...localRead, ...incomingRead]));

  return {
    ...normalized,
    mediaUrl: local.isDownload && local.mediaUrl ? local.mediaUrl : normalized.mediaUrl,
    isDownload: Boolean(local.isDownload || normalized.isDownload || isLocalMediaPath(local.mediaUrl)),
    readBy: readUnion.length > 0 ? readUnion : incomingRead,
  };
};

const mergeGroupMessageMap = (baseMap = {}, incomingMap = {}) => {
  const merged = { ...baseMap };
  const groupIds = new Set([...Object.keys(baseMap || {}), ...Object.keys(incomingMap || {})]);
  for (const groupId of groupIds) {
    const existing = Array.isArray(baseMap?.[groupId]) ? baseMap[groupId] : [];
    const incoming = Array.isArray(incomingMap?.[groupId]) ? incomingMap[groupId] : [];
    const byId = new Map();
    for (const msg of existing) {
      if (msg?.id) byId.set(String(msg.id), msg);
    }
    for (const msg of incoming) {
      const clientMessageId = String(msg?.clientMessageId || "").trim();
      if (clientMessageId && byId.has(clientMessageId)) {
        byId.delete(clientMessageId);
      }
      if (msg?.id) {
        const nextId = String(msg.id);
        const existing = byId.get(nextId);
        if (existing) {
          const incomingRead = Array.isArray(msg.readBy) ? msg.readBy.map(String) : [];
          const localRead = Array.isArray(existing.readBy) ? existing.readBy.map(String) : [];
          const readUnion = Array.from(new Set([...localRead, ...incomingRead]));
          byId.set(nextId, {
            ...msg,
            mediaUrl: existing.isDownload && existing.mediaUrl ? existing.mediaUrl : msg.mediaUrl,
            isDownload: Boolean(existing.isDownload || msg.isDownload || isLocalMediaPath(existing.mediaUrl)),
            readBy: readUnion.length > 0 ? readUnion : incomingRead,
          });
        } else {
          byId.set(nextId, msg);
        }
      }
    }
    merged[groupId] = Array.from(byId.values()).sort(
      (a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
    );
  }
  return merged;
};

const normalizeInitialGroupSyncResponse = (groupsPayload) => {
  const pickNewestPerGroup = (rows, limit = 30) => {
    const normalized = (Array.isArray(rows) ? rows : [])
      .map((m) => normalizeGroupMessagePayload(m))
      .filter(Boolean)
      .sort((a, b) => {
        const ta = new Date(a?.timestamp || 0).getTime();
        const tb = new Date(b?.timestamp || 0).getTime();
        if (ta !== tb) return ta - tb;
        const ida = String(a?.id || "");
        const idb = String(b?.id || "");
        return ida.localeCompare(idb);
      });
    return normalized.slice(-Math.min(Math.max(Number(limit) || 30, 1), 200));
  };

  const grouped = {};
  if (!groupsPayload) return grouped;

  if (Array.isArray(groupsPayload)) {
    for (const entry of groupsPayload) {
      const gid = String(entry?.groupId || entry?.group || "").trim();
      if (!gid) continue;
      const items = Array.isArray(entry?.messages) ? entry.messages : [];
      grouped[gid] = pickNewestPerGroup(
        items.map((m) => normalizeGroupMessagePayload(m, gid)).filter(Boolean),
        30
      );
    }
    return grouped;
  }

  if (typeof groupsPayload === "object") {
    for (const [gid, messages] of Object.entries(groupsPayload)) {
      if (!gid) continue;
      const items = Array.isArray(messages) ? messages : [];
      grouped[String(gid)] = pickNewestPerGroup(
        items.map((m) => normalizeGroupMessagePayload(m, gid)).filter(Boolean),
        30
      );
    }
  }
  return grouped;
};

const GROUP_MESSAGES_CACHE_KEY = "groupMessagesByGroup";
const GROUP_NATIVE_MESSAGES_KEY = "group_message_native";

const readGroupMessagesFromStorage = () => {
  try {
    const parsed = globalThis.storage.readJSON(GROUP_MESSAGES_CACHE_KEY, {});
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out = {};
    for (const [groupId, rows] of Object.entries(parsed)) {
      const normalized = (Array.isArray(rows) ? rows : [])
        .map((m) => normalizeGroupMessagePayload(m, groupId))
        .filter(Boolean);
      if (normalized.length > 0) out[String(groupId)] = normalized;
    }
    return out;
  } catch {
    return {};
  }
};

const writeGroupMessagesToStorage = (groupMap = {}) => {
  try {
    globalThis.storage.setItem(GROUP_MESSAGES_CACHE_KEY, JSON.stringify(groupMap || {}));
  } catch (error) {
    console.warn("Failed to persist group messages cache", error);
  }
};

const readNativeGroupMessagesFromStorage = () => {
  try {
    const parsed = globalThis.storage.readJSON(GROUP_NATIVE_MESSAGES_KEY, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const findLatestMongoMessageId = (rows = [], fallbackGroupId = null) => {
  const normalized = (Array.isArray(rows) ? rows : [])
    .map((m) => normalizeGroupMessagePayload(m, fallbackGroupId))
    .filter(Boolean)
    .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

  for (let i = normalized.length - 1; i >= 0; i -= 1) {
    const id = String(normalized[i]?.id || "").trim();
    if (MONGO_OBJECT_ID_REGEX.test(id)) return id;
  }
  return null;
};

const buildCursorMapFromGroupMessageMap = (groupMap = {}) => {
  const cursorMap = {};
  for (const [groupId, rows] of Object.entries(groupMap || {})) {
    const latestId = findLatestMongoMessageId(rows, groupId);
    if (latestId) {
      cursorMap[String(latestId)] = String(groupId);
    }
  }
  return cursorMap;
};

const resolveSenderLabelFromStorage = (senderId) => {
  const sid = String(senderId || "").trim();
  if (!sid) return "Member";
  const current = globalThis.storage.readJSON("currentuser", null) || null;
  const currentId = String(current?._id || current?.id || "");
  if (sid === currentId) return "You";
  const users = globalThis.storage.readJSON("usersMain", []) || [];
  const direct = (Array.isArray(users) ? users : []).find((u) => String(u?.id || u?._id || "") === sid);
  if (direct?.name) return direct.name;
  const byId = globalThis.storage.readJSON("groupMembersById", {}) || {};
  if (byId?.[sid]?.name) return byId[sid].name;
  return "Member";
};

const deriveGroupSummariesFromMessageMap = (groupMessageMap = {}, existingMap = new Map()) => {
  const derived = [];
  for (const [groupId, messages] of Object.entries(groupMessageMap || {})) {
    const arr = Array.isArray(messages) ? messages : [];
    if (arr.length === 0) continue;
    const sorted = [...arr].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    const last = sorted[sorted.length - 1];
    const prev = existingMap.get(String(groupId)) || {};
    const senderName = resolveSenderLabelFromStorage(last?.sender);
    const preview = buildGroupMessagePreview(last);
    derived.push({
      ...prev,
      id: String(groupId),
      unreadCount: Number(prev.unreadCount || 0),
      latestMessage: buildGroupLatestMessageLine(senderName, preview) || prev?.latestMessage || "",
      latestMessageTimestamp: last?.timestamp || prev?.latestMessageTimestamp || null,
      updatedAt: last?.timestamp || prev?.updatedAt || new Date().toISOString(),
      isActive: prev?.isActive !== false,
    });
  }
  return derived;
};

const buildGroupMessagePreview = (message) => {
  const normalizedType = String(message?.messageType || message?.type || "text").toLowerCase();
  if (normalizedType === "text") {
    return message?.content || "New group message";
  }
  if (normalizedType.startsWith("media/")) {
    return normalizedType.replace("media/", "") || "Media";
  }
  return message?.content || "New group message";
};

const truncateBySpace = (value, maxLen = 72) => {
  const text = String(value || "").trim();
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > 18 ? cut.slice(0, lastSpace) : cut;
  return `${head.trim()}...`;
};

const buildGroupLatestMessageLine = (senderName, messagePreview) => {
  const sender = String(senderName || "Member").trim() || "Member";
  const preview = truncateBySpace(messagePreview || "New group message", 68);
  return `${sender}: ${preview}`;
};

const isLocalMediaPath = (value) => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^(file:|content:|capacitor:|\/)/i.test(text)) return true;
  if (/^(https?:|wss?:)/i.test(text)) return false;
  if (/^(blob:|data:)/i.test(text)) return true;
  if (/^(group_media\/|files\/|thumbnails\/|documents\/)/i.test(text)) return true;
  if (/\/documents\//i.test(text)) return true;
  return false;
};

const coerceMediaDownloadFalseForRemote = (message) => {
  if (!message) return message;
  const type = String(message.messageType || message.type || "").toLowerCase();
  if (!type.startsWith("media/")) return message;
  if (isLocalMediaPath(message.mediaUrl)) return message;
  return {
    ...message,
    isDownload: false,
  };
};

const applyGroupDeleteUpdate = async ({ groupId, messageIds = [] } = {}, activeDb = null) => {
  const gid = String(groupId || "").trim();
  const ids = (Array.isArray(messageIds) ? messageIds : []).map(String).filter(Boolean);
  if (!gid || !ids.length) return false;

  let nextGroupMap = {};
  if (activeDb) {
    await Promise.all(
      ids.map((id) =>
        new Promise((resolve) => {
          try {
            activeDb.transaction((tx) => {
              tx.executeSql(
                "DELETE FROM group_messages WHERE id = ? AND group_id = ?",
                [id, gid],
                () => resolve(true),
                () => resolve(false)
              );
            });
          } catch {
            resolve(false);
          }
        })
      )
    );
    nextGroupMap = await getGroupMessagesPaginatedByGroupFromSQLite(activeDb, 30).catch(() => ({}));
  } else {
    const storedMap = readGroupMessagesFromStorage();
    const rows = Array.isArray(storedMap?.[gid]) ? storedMap[gid] : [];
    nextGroupMap = {
      ...storedMap,
      [gid]: rows.filter((msg) => !ids.includes(String(msg?.id || ""))),
    };
    writeGroupMessagesToStorage(nextGroupMap);
  }

  setGroupMessagesByGroup((prev) => ({
    ...(prev || {}),
    [gid]: Array.isArray(nextGroupMap?.[gid]) ? nextGroupMap[gid] : [],
  }));

  const sourceGroups = Array.isArray(window.__GROUPS_MAIN_CACHE)
    ? window.__GROUPS_MAIN_CACHE
    : (globalThis.storage.readJSON("groupsMain", []) || []);
  const nextGroups = sortGroupsMain(
    (Array.isArray(sourceGroups) ? sourceGroups : []).map((group) => {
      if (String(group?.id || "") !== gid) return group;
      const rows = Array.isArray(nextGroupMap?.[gid]) ? nextGroupMap[gid] : [];
      const latest = rows[rows.length - 1] || null;
      return {
        ...group,
        latestMessage: latest
          ? buildGroupLatestMessageLine(resolveSenderLabelFromStorage(latest.sender), buildGroupMessagePreview(latest))
          : "",
        latestMessageTimestamp: latest?.timestamp || null,
        updatedAt: latest?.timestamp || group?.updatedAt || new Date().toISOString(),
      };
    })
  );
  window.__GROUPS_MAIN_CACHE = nextGroups;
  globalThis.storage.setItem("groupsMain", JSON.stringify(nextGroups));
  setGroupsMain(nextGroups);

  if (activeDb) {
    await initGroupSummariesSchema(activeDb).catch(() => false);
    await upsertGroupSummariesInSQLite(activeDb, nextGroups).catch(() => false);
  }
  return true;
};

const normalizeGroupSummary = (group) => {
  if (!group) return null;
  const id = String(group.id || group._id || "").trim();
  if (!id) return null;
  const updatedCandidate = group.updatedAt || group.latestMessageTimestamp || group.timestamp;
  const settings = group.settings || {};
  return {
    id,
    name: group.name || "",
    description: group.description || "",
    avatar: group.avatar || "",
    owner: String(group.owner || group.createdBy || ""),
    settings: {
      messagingPermission: settings.messagingPermission || "ALL_MEMBERS",
      addMembersPermission: settings.addMembersPermission || "ADMINS_ONLY",
      groupInfoEditPermission: settings.groupInfoEditPermission || "ADMINS_ONLY",
    },
    unreadCount: Number(group.unreadCount || 0),
    latestMessage: group.latestMessage || group.lastMessage || "",
    latestMessageTimestamp: group.latestMessageTimestamp || group.lastMessageTimestamp || null,
    memberCount: Number(group.memberCount || group.membersCount || (Array.isArray(group.members) ? group.members.length : 0) || 0),
    isActive: group.isActive !== false,
    isArchive: Boolean(group.isArchive),
    isDelete: Boolean(group.isDelete || group.isDeleted),
    updatedAt: updatedCandidate ? new Date(updatedCandidate).toISOString() : new Date().toISOString(),
  };
};

const mergeGroupsMain = (...groupLists) => {
  const byId = new Map();
  for (const list of groupLists) {
    const arr = Array.isArray(list) ? list : [];
    for (const raw of arr) {
      const normalized = normalizeGroupSummary(raw);
      if (!normalized) continue;
      const current = byId.get(normalized.id);
      if (!current) {
        byId.set(normalized.id, normalized);
        continue;
      }
      const currentTs = new Date(current.updatedAt || current.latestMessageTimestamp || 0).getTime();
      const incomingTs = new Date(normalized.updatedAt || normalized.latestMessageTimestamp || 0).getTime();
      byId.set(
        normalized.id,
        incomingTs >= currentTs
          ? {
              ...current,
              ...normalized,
              unreadCount: Math.max(Number(current.unreadCount || 0), Number(normalized.unreadCount || 0)),
              isArchive: Boolean(current.isArchive || normalized.isArchive),
              isDelete: Boolean(current.isDelete || normalized.isDelete),
            }
          : {
              ...normalized,
              ...current,
              unreadCount: Math.max(Number(current.unreadCount || 0), Number(normalized.unreadCount || 0)),
              isArchive: Boolean(current.isArchive || normalized.isArchive),
              isDelete: Boolean(current.isDelete || normalized.isDelete),
            }
      );
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.latestMessageTimestamp || b.updatedAt || 0).getTime() -
      new Date(a.latestMessageTimestamp || a.updatedAt || 0).getTime()
  );
};

const extractRemoteGroups = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.groups)) return payload.groups;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.response)) return payload.response;
  return [];
};

const bootstrapGroupMessages = async (activeDb, syncToken = null) => {
  const hasDb = Boolean(activeDb);
  try {
    let localGroupMap = {};
    if (hasDb) {
      await initGroupMessagesSchema(activeDb);
      localGroupMap = await getGroupMessagesPaginatedByGroupFromSQLite(activeDb, 30);
    } else {
      localGroupMap = readGroupMessagesFromStorage();
    }
    localGroupMap = await ingestNativeGroupMessagesIntoApp(activeDb, localGroupMap || {});
    setGroupMessagesByGroup(localGroupMap || {});

    const token = syncToken || await getAccessToken();
    if (!token) return localGroupMap || {};

    const groupsCache = globalThis.storage.readJSON("groupsMain", []) || [];
    const blockedGroupIds = new Set(
      (Array.isArray(groupsCache) ? groupsCache : [])
        .filter((group) => group?.isActive === false || group?.isDelete === true || group?.isDeleted === true)
        .map((group) => String(group?.id || group?._id || ""))
        .filter(Boolean)
    );
    const rawCursorMap = buildCursorMapFromGroupMessageMap(localGroupMap || {});
    const cursorMap = Object.fromEntries(
      Object.entries(rawCursorMap || {}).filter(([, gid]) => !blockedGroupIds.has(String(gid)))
    );
    const response = await api.groupMessagesInitial(host, cursorMap || {}, 30);
    if (!response?.ok) return localGroupMap || {};

    const json = await response.json();
    const remoteMap = normalizeInitialGroupSyncResponse(json?.groups);
    const filteredRemoteMap = Object.fromEntries(
      Object.entries(remoteMap || {}).filter(([gid]) => !blockedGroupIds.has(String(gid)))
    );
    const remoteMessages = Object.entries(filteredRemoteMap || {})
      .flatMap(([gid, rows]) =>
        (Array.isArray(rows) ? rows : [])
          .map((row) => normalizeGroupMessagePayload(row, gid))
          .filter(Boolean)
      )
      .sort((a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime());

    if (remoteMessages.length > 0) {
      for (const msg of remoteMessages) {
        await ingestGroupMessage(msg, { skipMessageStore: true });
      }
    }

    if (hasDb) {
      const saveOps = [];
      for (const [groupId, messages] of Object.entries(filteredRemoteMap)) {
        for (const message of messages) {
          const normalized = coerceMediaDownloadFalseForRemote(
            preserveLocalGroupMessageState(localGroupMap || {}, { ...message, groupId })
          );
          if (!normalized) continue;
          saveOps.push(saveGroupMessageInSQLite(activeDb, normalized));
        }
      }

      if (saveOps.length > 0) {
        await Promise.all(saveOps);
        const refreshedMap = await getGroupMessagesPaginatedByGroupFromSQLite(activeDb, 30);
        setGroupMessagesByGroup((prev) => mergeGroupMessageMap(prev, refreshedMap || {}));
        await replayPendingGroupMessageUpdates(activeDb);
        return refreshedMap || {};
      }
      await replayPendingGroupMessageUpdates(activeDb);
      return localGroupMap || {};
    }

    const mergedMap = mergeGroupMessageMap(localGroupMap || {}, filteredRemoteMap || {});
    setGroupMessagesByGroup(mergedMap);
    writeGroupMessagesToStorage(mergedMap);
    await replayPendingGroupMessageUpdates(null);
    return mergedMap;
  } catch (err) {
    console.error("Error bootstrapping group messages:", err);
    return {};
  }
};

const syncGroupMessagesForKnownGroups = async (activeDb, groups = [], syncToken = null) => {
  const hasDb = Boolean(activeDb);
  try {
    const token = syncToken || await getAccessToken();
    if (!token) return {};

    const activeGroupIds = (Array.isArray(groups) ? groups : [])
      .filter((g) => g?.isActive !== false && g?.isDelete !== true && g?.isDeleted !== true)
      .map((g) => String(g?.id || g?._id || ""))
      .filter(Boolean);

    const localMap = hasDb
      ? await getGroupMessagesPaginatedByGroupFromSQLite(activeDb, 30).catch(() => ({}))
      : readGroupMessagesFromStorage();

    const cursors = activeGroupIds.map((gid) => {
      const rows = Array.isArray(localMap?.[gid]) ? localMap[gid] : [];
      const latestId = findLatestMongoMessageId(rows, gid);
      return {
        groupId: gid,
        lastMessageId: latestId || undefined,
      };
    });

    console.log("[group-messages-sync] request", {
      url: `${host}/api/group-messages/sync`,
      groups: cursors.length,
      sample: cursors.slice(0, 3),
    });

    const response = await api.groupMessagesSync(host, cursors, 30);
    if (!response?.ok) {
      console.log("[group-messages-sync] response", { ok: false, status: response?.status });
      return {};
    }

    const json = await response.json().catch(() => ({}));
    const remoteMap = normalizeInitialGroupSyncResponse(json?.groups);
    console.log("[group-messages-sync] response", {
      ok: true,
      groups: Object.keys(remoteMap || {}).length,
    });

    if (hasDb) {
      const saveOps = [];
      for (const [groupId, messages] of Object.entries(remoteMap || {})) {
        for (const msg of Array.isArray(messages) ? messages : []) {
          const normalized = coerceMediaDownloadFalseForRemote(
            preserveLocalGroupMessageState(localMap || {}, { ...msg, groupId })
          );
          if (!normalized) continue;
          saveOps.push(saveGroupMessageInSQLite(activeDb, normalized));
        }
      }
      if (saveOps.length > 0) {
        await Promise.all(saveOps);
        const refreshedMap = await getGroupMessagesPaginatedByGroupFromSQLite(activeDb, 30).catch(() => ({}));
        setGroupMessagesByGroup((prev) => mergeGroupMessageMap(prev, refreshedMap || {}));
        return refreshedMap || {};
      }
      return localMap || {};
    }

    const mergedMap = mergeGroupMessageMap(localMap || {}, remoteMap || {});
    setGroupMessagesByGroup(mergedMap);
    writeGroupMessagesToStorage(mergedMap);
    return mergedMap;
  } catch (error) {
    console.error("Error syncing group messages for known groups:", error);
    return {};
  }
};

const bootstrapGroupsData = async (activeDb, groupMessageMap = {}, syncToken = null) => {
  try {
    console.log("lets see")
    const hasDb = Boolean(activeDb);
    if (hasDb) {
      await initGroupSummariesSchema(activeDb);
    }

    const prefGroups = globalThis.storage.readJSON("groupsMain", []) || [];
    const sqliteGroups = hasDb ? await getGroupSummariesFromSQLite(activeDb).catch(() => []) : [];
    const existingMap = new Map(
      [...prefGroups, ...sqliteGroups]
        .map((g) => normalizeGroupSummary(g))
        .filter(Boolean)
        .map((g) => [String(g.id), g])
    );
    const derivedGroups = deriveGroupSummariesFromMessageMap(groupMessageMap, existingMap);
    let localMerged = mergeGroupsMain(prefGroups, sqliteGroups, derivedGroups);
    setGroupsMain(localMerged);
    globalThis.storage.setItem("groupsMain", JSON.stringify(localMerged));
    if (hasDb) {
      await upsertGroupSummariesInSQLite(activeDb, localMerged);
    }

    const token = syncToken || await getAccessToken();
    if (!token) {
      console.log("[groups-sync] skipped: no access token");
      return;
    }

    const syncPayload = localMerged
      .filter((group) => group?.isActive !== false && group?.isDelete !== true && group?.isDeleted !== true)
      .map((group) => ({
        groupId: String(group.id),
        updatedAt: group.updatedAt || null,
      }));

    console.log("[groups-sync] request", {
      url: `${host}/api/groups/user-groups/sync`,
      payloadSize: syncPayload.length,
      sample: syncPayload.slice(0, 3),
    });
    const response = await api.syncUserGroups(host, syncPayload);
    console.log("[groups-sync] response", { ok: response?.ok, status: response?.status });
    if (!response?.ok) return;
    const json = await response.json();
    console.log("[groups-sync] result", {
      updates: Array.isArray(json?.groups) ? json.groups.length : 0,
      removed: Array.isArray(json?.removedGroupIds) ? json.removedGroupIds.length : 0,
    });
    const updates = Array.isArray(json?.groups) ? json.groups : [];
    const removedIds = Array.isArray(json?.removedGroupIds) ? json.removedGroupIds.map(String) : [];

    const byId = new Map(localMerged.map((group) => [String(group.id), group]));
    for (const raw of updates) {
      const id = String(raw?.id || raw?._id || "").trim();
      if (!id) continue;

      if (raw?.isActive === false) {
        const existing = byId.get(id);
        if (!existing) continue;
        byId.set(id, { ...existing, isActive: false, updatedAt: raw.updatedAt || existing.updatedAt });
        continue;
      }

      const normalized = normalizeGroupSummary(raw);
      if (!normalized) continue;
      const existing = byId.get(id) || {};
      byId.set(id, {
        ...existing,
        ...normalized,
        unreadCount: Math.max(Number(existing.unreadCount || 0), Number(normalized.unreadCount || 0)),
        isActive: normalized.isActive !== false,
        isArchive: Boolean(existing.isArchive || normalized.isArchive),
        isDelete: Boolean(existing.isDelete || normalized.isDelete),
      });
    }

    for (const id of removedIds) {
      byId.delete(String(id));
    }

    const merged = sortGroupsMain(Array.from(byId.values()));

    setGroupsMain(merged);
    globalThis.storage.setItem("groupsMain", JSON.stringify(merged));
    if (hasDb) {
      await upsertGroupSummariesInSQLite(activeDb, merged);
    }
  } catch (error) {
    console.error("Error bootstrapping groups:", error);
  }
};

const sortGroupsMain = (groups = []) =>
  [...groups].sort(
    (a, b) =>
      new Date(b.latestMessageTimestamp || b.updatedAt || 0).getTime() -
      new Date(a.latestMessageTimestamp || a.updatedAt || 0).getTime()
  );

const ingestNativeGroupMessagesIntoApp = async (activeDb, existingGroupMap = {}) => {
  const queuedRaw = readNativeGroupMessagesFromStorage();
  if (!queuedRaw.length) return existingGroupMap || {};

  const currentUserId = String(globalThis.storage.readJSON("currentuser", null)?._id || "");
  const normalizedRows = queuedRaw
    .map((row) => ({
      raw: row,
      normalized: coerceMediaDownloadFalseForRemote(
        normalizeGroupMessagePayload(row, row?.groupId || row?.group)
      ),
    }))
    .filter((entry) => entry.normalized);

  if (!normalizedRows.length) {
    globalThis.storage.setItem(GROUP_NATIVE_MESSAGES_KEY, JSON.stringify([]));
    return existingGroupMap || {};
  }

  const groupedIncoming = {};
  for (const entry of normalizedRows) {
    const gid = String(entry.normalized.groupId);
    if (!Array.isArray(groupedIncoming[gid])) groupedIncoming[gid] = [];
    groupedIncoming[gid].push(entry.normalized);
  }

  let nextGroupMap = mergeGroupMessageMap(existingGroupMap || {}, groupedIncoming);
  if (activeDb) {
    await initGroupMessagesSchema(activeDb);
    for (const entry of normalizedRows) {
      await saveGroupMessageInSQLite(activeDb, entry.normalized);
    }
    nextGroupMap = await getGroupMessagesPaginatedByGroupFromSQLite(activeDb, 30);
  } else {
    writeGroupMessagesToStorage(nextGroupMap);
  }

  const sourceGroups = Array.isArray(window.__GROUPS_MAIN_CACHE)
    ? window.__GROUPS_MAIN_CACHE
    : (globalThis.storage.readJSON("groupsMain", []) || []);
  const groupMapById = new Map((Array.isArray(sourceGroups) ? sourceGroups : []).map((group) => [String(group?.id || ""), group]));

  for (const entry of normalizedRows) {
    const normalized = entry.normalized;
    const raw = entry.raw || {};
    const gid = String(normalized.groupId);
    const alreadyPresent = Array.isArray(existingGroupMap?.[gid])
      ? existingGroupMap[gid].some((msg) => String(msg?.id || "") === String(normalized.id))
      : false;
    const base = groupMapById.get(gid) || {
      id: gid,
      name: raw.groupName || "Group",
      description: "",
      avatar: raw.groupAvatar || "",
      owner: "",
      memberCount: 0,
      unreadCount: 0,
      latestMessage: "",
      latestMessageTimestamp: normalized.timestamp,
      updatedAt: normalized.timestamp,
      isActive: true,
    };
    if (base?.isDelete || base?.isDeleted || base?.isActive === false) {
      continue;
    }

    const isOwn = String(normalized.sender || "") === currentUserId;
    const isReadByCurrentUser =
      Array.isArray(normalized.readBy) &&
      normalized.readBy.map(String).includes(String(currentUserId));
    const unreadIncrement = !alreadyPresent && !isOwn && !isReadByCurrentUser ? 1 : 0;

    groupMapById.set(gid, {
      ...base,
      name: raw.groupName || base.name || "Group",
      avatar: raw.groupAvatar || base.avatar || "",
      latestMessage: buildGroupLatestMessageLine(resolveSenderLabelFromStorage(normalized.sender), buildGroupMessagePreview(normalized)),
      latestMessageTimestamp: normalized.timestamp,
      updatedAt: normalized.timestamp,
      unreadCount: Number(base.unreadCount || 0) + unreadIncrement,
    });
  }

  const mergedGroups = sortGroupsMain(Array.from(groupMapById.values()));
  window.__GROUPS_MAIN_CACHE = mergedGroups;
  globalThis.storage.setItem("groupsMain", JSON.stringify(mergedGroups));
  setGroupsMain(mergedGroups);
  setGroupMessagesByGroup(nextGroupMap || {});

  if (activeDb) {
    await initGroupSummariesSchema(activeDb);
    await upsertGroupSummariesInSQLite(activeDb, mergedGroups);
  }

  globalThis.storage.setItem(GROUP_NATIVE_MESSAGES_KEY, JSON.stringify([]));
  return nextGroupMap || {};
};

const replayPendingGroupMessageUpdates = async (activeDb = null) => {
  try {
    const response = await api.getPendingGroupMessageUpdates(host);
    if (!response?.ok) return false;
    const json = await response.json().catch(() => ({}));
    const updates = Array.isArray(json?.updates) ? json.updates : [];
    if (!updates.length) return true;

    const ackIds = [];
    for (const update of updates) {
      if (update?.type === "delete") {
        await applyGroupDeleteUpdate(
          {
            groupId: update.groupId,
            messageIds: update.messageIds || [],
          },
          activeDb
        );
      }
      if (update?.id) ackIds.push(String(update.id));
    }

    if (ackIds.length > 0) {
      await api.ackPendingGroupMessageUpdates(host, ackIds).catch(() => false);
    }
    return true;
  } catch (error) {
    console.warn("Failed to replay pending group updates:", error);
    return false;
  }
};

const softDeleteGroupLocal = useCallback(async (groupId) => {
  const gid = String(groupId || "").trim();
  if (!gid) return false;

  const sourceMap =
    window.__GROUP_MESSAGES_CACHE ||
    groupMessagesByGroup ||
    readGroupMessagesFromStorage() ||
    {};
  const rows = [...(Array.isArray(sourceMap?.[gid]) ? sourceMap[gid] : [])].sort(
    (a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime()
  );
  const latest = rows.length > 0 ? rows[rows.length - 1] : null;
  const kept = latest ? [latest] : [];

  const nextMap = {
    ...(sourceMap || {}),
    [gid]: kept,
  };
  window.__GROUP_MESSAGES_CACHE = nextMap;
  writeGroupMessagesToStorage(nextMap);
  setGroupMessagesByGroup((prev) => ({
    ...(prev || {}),
    [gid]: kept,
  }));

  if (dbRef.current) {
    await new Promise((resolve) => {
      try {
        dbRef.current.transaction((tx) => {
          if (latest?.id) {
            tx.executeSql(
              "DELETE FROM group_messages WHERE group_id = ? AND id <> ?",
              [gid, String(latest.id)],
              () => resolve(true),
              () => resolve(false)
            );
          } else {
            tx.executeSql(
              "DELETE FROM group_messages WHERE group_id = ?",
              [gid],
              () => resolve(true),
              () => resolve(false)
            );
          }
        });
      } catch {
        resolve(false);
      }
    });
  }

  const sourceGroups = Array.isArray(window.__GROUPS_MAIN_CACHE)
    ? window.__GROUPS_MAIN_CACHE
    : (globalThis.storage.readJSON("groupsMain", []) || []);
  const nextGroups = sortGroupsMain(
    (Array.isArray(sourceGroups) ? sourceGroups : []).map((group) => {
      if (String(group?.id || "") !== gid) return group;
      return {
        ...group,
        isDelete: true,
        isDeleted: true,
        isActive: false,
        unreadCount: 0,
        latestMessage: latest
          ? buildGroupLatestMessageLine(resolveSenderLabelFromStorage(latest.sender), buildGroupMessagePreview(latest))
          : (group?.latestMessage || ""),
        latestMessageTimestamp: latest?.timestamp || group?.latestMessageTimestamp || null,
        updatedAt: new Date().toISOString(),
      };
    })
  );

  window.__GROUPS_MAIN_CACHE = nextGroups;
  globalThis.storage.setItem("groupsMain", JSON.stringify(nextGroups));
  setGroupsMain(nextGroups);

  if (dbRef.current) {
    await initGroupSummariesSchema(dbRef.current).catch(() => false);
    await upsertGroupSummariesInSQLite(dbRef.current, nextGroups).catch(() => false);
  }
  return true;
}, [groupMessagesByGroup, setGroupMessagesByGroup, setGroupsMain]);

useEffect(() => {
  window.__GROUP_MESSAGES_CACHE = groupMessagesByGroup;
  writeGroupMessagesToStorage(groupMessagesByGroup || {});
}, [groupMessagesByGroup]);

useEffect(() => {
  window.__GROUPS_MAIN_CACHE = groupsMain;
}, [groupsMain]);

useEffect(() => {
  const next = Array.isArray(mutedGroupIds) ? mutedGroupIds.map(String) : [];
  window.__MUTED_GROUPS_CACHE = next;
  globalThis.storage.setItem("mutedGroups", JSON.stringify(next));
}, [mutedGroupIds]);

  useEffect(() => {
    const onAuthLogout = () => {
      try {
        temporarySocketManualCloseRef.current = true;
        if (temporarySocketReconnectTimeoutRef.current) {
          clearTimeout(temporarySocketReconnectTimeoutRef.current);
          temporarySocketReconnectTimeoutRef.current = null;
        }
        if (temporarySocketHeartbeatRef.current) {
          clearInterval(temporarySocketHeartbeatRef.current);
          temporarySocketHeartbeatRef.current = null;
        }
        if (temporarySocket.current && temporarySocket.current.readyState !== WebSocket.CLOSED) {
          temporarySocket.current.close(1000, "logout");
        }
        temporarySocket.current = null;
      } catch {
        // no-op
      }
      try {
        history.push("/login");
      } catch {
        window.location.href = "/login";
      }
    };
    window.addEventListener("auth-logout", onAuthLogout);

    const GetInitialRoute = async () => {
      setIsload(true)
//console.log('Current origin:', window.location.origin);

      try {
        store = new Storage({
          name: 'ionicstoreconversaDB',
          driverOrder: [CordovaSQLiteDriver._driver, Drivers.IndexedDB, Drivers.LocalStorage]
        });
    
         
        await store.defineDriver(CordovaSQLiteDriver);
        await store.create();
 
        if (isPlatform('hybrid')) {
          await initSQLiteDB();
        } else {
          dbRef.current = null;
        }
        const startupDb = dbRef.current || (isPlatform('hybrid') && window?.sqlitePlugin?.openDatabase
          ? window.sqlitePlugin.openDatabase({ name: 'Conversa_chats_store.db', location: 'default' })
          : null);
        if (startupDb && !dbRef.current) dbRef.current = startupDb;
        if (!isTemporaryRuntime()) {
          const startupGroupMap = await bootstrapGroupMessages(dbRef.current);
          console.log("lets sne")
          await bootstrapGroupsData(dbRef.current, startupGroupMap);
        }

        let token = await getAccessToken();
        if (!token) {
          const refreshResult = await refreshAccessTokenWithReason(host);
          token = refreshResult?.token || null;
          if (!token) {
          
            clearPrefStorage();
            await globalLogout();
            setInitialRoute('/login');
            return;
          }
        }

        if (token) {
          if (isTemporaryRuntime()) {
            const tempUser = getTemporaryRuntimeUser() || getTemporarySessionUser();
            if (tempUser) {
              setTemporarySessionUser(tempUser);
              currentuserRef.current = tempUser;
            } else {
              const tempResponse = await api.temporaryMe(host);
              const tempJson = await tempResponse.json().catch(() => ({}));
              if (tempResponse.ok && tempJson?.success && tempJson?.user) {
                setTemporarySessionUser(tempJson.user);
                currentuserRef.current = tempJson.user;
              }
            }

            setInitialRoute('/temporaryhome');
            const deviceId = getDeviceIdSync() || await getDeviceId();
            const wsUrl = `wss://${Maindata.SERVER_URL}?token=${token}&deviceId=${encodeURIComponent(deviceId)}`;
            await connectTemporarySocket(wsUrl);
            setLink(wsUrl);
            return;
          }

          const syncedGroupMap = await bootstrapGroupMessages(dbRef.current, token);
          await bootstrapGroupsData(dbRef.current, syncedGroupMap, token);
          const groupsAfterSync = globalThis.storage.readJSON("groupsMain", []) || [];
          await syncGroupMessagesForKnownGroups(dbRef.current, groupsAfterSync, token);

           const privateKeyValue = await globalThis.storage.getItemAsync('privateKey');
           if (!privateKeyValue) {
             console.log('No key found in storage');
           } else {
             console.log('Key already exists in storage');
           }

 

                 setmutedList(globalThis.storage.readJSON('mutedUsers', []) || []);
                 setMutedGroupIds(globalThis.storage.readJSON('mutedGroups', []) || []);

        const stored = globalThis.storage.readJSON('customSounds', []) || [];
        setCustomSounds(stored);
        setMode(globalThis.storage.getItem('mode') || 'normal');
        setForAllSounds(globalThis.storage.readJSON('ForAllSoundNotification', null) || null);

          await sendPublicKeyToBackend(token);
          setInitialRoute('/home');

        //  await ensureOverlayPermission();
        
          currentuserRef.current =(globalThis.storage.readJSON('currentuser', null)) ;
          //console.log("current user",currentuserRef.current._id)
          if(currentuserRef.current === null){
            try {
              const token = await getAccessToken();
              const response = await api.getUser(host);
              const json = await response.json();
              try {
        
                if(response.ok && json.success){
               // await Storage.set({ key: 'currentuser', value: JSON.stringify(json) });
               globalThis.storage.setItem('currentuser',JSON.stringify(json.userResponse))
    
        
               currentuserRef.current = json.userResponse;
        
                return json.userResponse;
                }else{
                  if (isRevocationLike(response.status, json)) {
                    showAuthSwal("Session revoked", json.error || json.message || "Your session was revoked. Please login again.");
                  }
                  return false
                }
        
                
              } catch (error) {
                console.error("error in saving current user in storage",error)
              }
        
              
            } catch (error) {
        
              showToast("Error fetching user");
              return false;
            }
          }
    
          const deviceId = getDeviceIdSync() || await getDeviceId();
          const wsUrl = `wss://${Maindata.SERVER_URL}?token=${token}&deviceId=${encodeURIComponent(deviceId)}`;
          setlocalinital(true)
            await getmessages();
            await mergerusers();
        
          await connect(wsUrl);
      window.__JS_READY = true;

   

          setLink(wsUrl);
              await maybeHandleColdStartCall();
        } else {
          setInitialRoute('/login');
        }
        await LocalNotifications.registerActionTypes({
  types: [
    {
      id: "CALL_ACTION",
      actions: [
        { id: "ANSWER", title: "Answer" },
        { id: "DECLINE", title: "Decline" },
      ],
    },
  ],
});

      } catch (error) {
        if (Maindata.IsDev) {
          console.error('Error retrieving token:', error);
        }
      }
    };
  if(localinit === false){
    
  
    GetInitialRoute();



    // CapacitorApp.addListener('appStateChange', (state) => {
    //   if (state.isActive) {
    //     //console.log('App is in the foreground');
    //   } else {
    //     //console.log('App is in the background');
    //    // handleBackgroundTask();
    //   }
    // });
  }


    setIsload(false)
 
 fetchBlockedFromServer();
   //runLiveUpdate()
    
    return () => window.removeEventListener("auth-logout", onAuthLogout);
  }, []);



  const loadBlockedFromStorage = () => {
  try {
    const bu = globalThis.storage.readJSON('blockedUsers', []) || [];
    const bb = globalThis.storage.readJSON('blockedBy', []) || [];

    setBlockedUsers(new Set(bu));
    setBlockedBy(new Set(bb));
  } catch (e) {
    console.error('Failed to load block list from storage', e);
    setBlockedUsers(new Set());
    setBlockedBy(new Set());
  }
};



  const fetchBlockedFromServer = async () => {
  try {
    const token = await getAccessToken();
    if (!token) return;

    const response = await api.blocked(host);

    const json = await response.json();
    if (!json.success) return;

    // ?? Normalize ? ONLY IDs
    const blockedUsersIds = (json.blockedUsers || [])
      .map(u => typeof u === 'string' ? u : u?._id)
      .filter(Boolean);

    const blockedByIds = (json.blockedBy || [])
      .map(u => typeof u === 'string' ? u : u?._id)
      .filter(Boolean);

    // Update state (Set<string>)
    setBlockedUsers(new Set(blockedUsersIds));
    setBlockedBy(new Set(blockedByIds));

    // Persist for offline use (array of string IDs)
    globalThis.storage.setItem(
      'blockedUsers',
      JSON.stringify(blockedUsersIds)
    );
    globalThis.storage.setItem(
      'blockedBy',
      JSON.stringify(blockedByIds)
    );

  } catch (err) {
    console.error('Failed to fetch block list', err);
  }
};


  CapacitorApp.addListener("appStateChange", (state) => {
  if (state.isActive && socket.current) {
    maybeHandleColdStartCall();
  }
});

async function maybeHandleColdStartCall() {
  try {
    if (coldCallHandled) return;
    if (!window.__JS_READY) return;
    let autpstart = true;
// ?? BLOCK IF USER DECLINED FROM NOTIFICATION
if (window.__CALL_NOTIFICATION_ACTION__ === 'DECLINE') {
  console.log('?? Call declined via notification � skipping resume logic');
const prefValue = await globalThis.storage.getItemAsync("incoming_call_data");
  if (!prefValue) {
  window.__CALL_NOTIFICATION_ACTION__ = null;
  window.__CALL_NOTIFICATION_LOGGED__ = false;
    return;
  }
      data = JSON.parse(prefValue);
  window.__CALL_NOTIFICATION_ACTION__ = null;
    if (!window.__CALL_NOTIFICATION_LOGGED__) {
      appendCallLog({
        userId: data?.callerId,
        status: "incoming",
        callStatus: "decline",
        read: true,
        timestamp: data?.ts
      });
    }
    window.__CALL_NOTIFICATION_LOGGED__ = false;
    setTimeout(async() =>{
   socket?.send(JSON.stringify({
      type: 'call-declined',
      targetId: data.callerId,
    calleeId: data.callOnly,
  }));

   console.log("sedning consolemessafe")
  },1000)

  
 

  globalThis.storage.removeItem('incoming_call_data');
  globalThis.storage.removeItem('incoming_call_offer');

  return; // ? STOP EVERYTHING
}


if(window.__CALL_NOTIFICATION_ACTION__ !== null){
  autpstart =  false
}else{
  autpstart = true
}

  
    const pref = await globalThis.storage.getItemAsync("incoming_call_data");
    if (!pref) return;
  let offerdata = await globalThis.storage.getItemAsync("incoming_call_offer");
  if (!offerdata) {
  // give native fetch a moment
  await new Promise(r => setTimeout(r, 300));

  const retry = await globalThis.storage.getItemAsync("incoming_call_offer");
  if (!retry) return;

  offerdata = retry;
}

    let data = null;
    let offer = null;

    try {
      data = JSON.parse(pref);
      offer = JSON.parse(offerdata)

    } catch (e) {
      console.error("parse error", e);
      globalThis.storage.removeItem("incoming_call_data");
      globalThis.storage.removeItem("incoming_call_offer");
      return;
    }

    // Always clear to avoid double triggers
    globalThis.storage.removeItem("incoming_call_data");
    globalThis.storage.removeItem("incoming_call_offer");
    // =====================================================
    //  TIMESTAMP CHECK (reject old / future)
    // =====================================================
let rawTs = data?.ts;

// Convert string ? number safely
const ts = typeof rawTs === "string"
  ? Number(rawTs)
  : rawTs;

// Validate
if (!Number.isFinite(ts)) {
  console.warn("? Missing or invalid ts, ignoring cold-start call:", rawTs);
  return;
}

const now = Date.now();
const diff = now - ts;

console.log("cold diff ms =", diff);

// Older than 38s OR timestamp in future (unexpected)
if (diff > 38_000 || diff < -12_000) {
  console.warn("?? Cold-start call expired, ignoring:", diff, "ms");
  return;
}
    console.log("showtime in handlecold",JSON.stringify(CallRuntime))

    // =====================================================
    // Already in call UI? skip
    // =====================================================

    if (CallRuntime.showScreen) return;

    // =====================================================
    // Build user object
    // =====================================================

    const userdet = usersMain.find(u => u.id === data.callerId);

    // Dispatch event
    window.dispatchEvent(new CustomEvent("incoming-call", {
      detail: {
        mode: "answer",
        callerId: data.callerId,
        offer: offer,
        userId: currentuserRef.current._id,
        callOnly: data.callOnly,
        userdetail: userdet,
        Answer:true,
        Autostart:autpstart



      }
    }));

    console.log("?? Cold start incoming call handled");

  } catch (err) {
    console.error("cold start call err", err);
  } finally {
    window.__CALL_NOTIFICATION_LOGGED__ = false;
  }
}
const getNativeVersion = async () => {
  const v = await globalThis.storage.getItemAsync('native_version_code');
  if (v === null || v === undefined || String(v).trim() === "") return null;

  const parsed = Number(v);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getNativeVersionWithRetry = async (attempts = 6, delayMs = 250) => {
  for (let i = 0; i < attempts; i++) {
    const version = await getNativeVersion();
    if (version !== null) return version;
    await sleep(delayMs);
  }
  return null;
};
const versionCodeToString = (code) => {
  // Ensure integer
  const str = String(code);

  if (str.length < 3) {
    // fallback, e.g. 12 ? 0.0.12
    return `0.0.${str}`;
  }

  const major = str[0];          // first digit
  const minor = str[1];          // second digit
  const patch = str.slice(2);    // rest (variable length)

  return `${major}.${minor}.${patch}`;
};

useEffect(() => {
  const bootstrapUpdates = async () => {
    try {
      // 1?? Native version (authority)
      // Prefer build-time config to avoid startup storage timing races.
      const configuredNativeVersion = Number(Maindata.NativeVersionCode);
      const nativeVersion = Number.isFinite(configuredNativeVersion) && configuredNativeVersion > 0
        ? configuredNativeVersion
        : await getNativeVersionWithRetry();
      console.log('[BOOT] Native version:', nativeVersion);

      if (nativeVersion === null) {
        console.error('[BOOT] Invalid native version');
        return;
      }

            const nativeVersionStr = versionCodeToString(nativeVersion);

      // 2?? Ask server
      const res = await fetch(`https://${Maindata.SERVER_URL}/user/version`);
      const data = await res.json(); // { version: "1.5" }
console.log("versions",nativeVersionStr,data.version)
      // 3?? Native update exists ? HARD BLOCK OTA
      if (isVersionGreater(data.version, nativeVersionStr)) {
        console.warn('[BOOT] Native update available ? blocking OTA');

        // ?? wipe ALL OTA bundles
        await LiveUpdate.reset();

        const updatedetails = await fetch(
          `https://${Maindata.SERVER_URL}/user/updatedetails`
        );
        const dat = await updatedetails.json();

        setCriticalUpdate(isCritical(data.version));
        setServerVersion(data.version);
        setDownloadUrl(dat.resposnse_url || 'https://example.com/download');
        setShowModal2(true);

        return; // ?? STOP HERE
      }
   const OTA_CHANNEL = `Live-update-${nativeVersionStr}`;
        const OTA_TESTCHANNEL = `Live-update-test-${nativeVersionStr}`
        console.log('[BOOT] OTA allowed ? channel: also for test now', Maindata.testchannel_actuve ? OTA_TESTCHANNEL : OTA_CHANNEL);
      // 4?? Native is current ? OTA allowed
      if (!Maindata.IsDev) {
        const OTA_CHANNEL = `Live-update-${nativeVersionStr}`;
        const OTA_TESTCHANNEL = `Live-update-test-${nativeVersionStr}`
        console.log('[BOOT] OTA allowed ? channel: also for test now', Maindata.testchannel_actuve ? OTA_TESTCHANNEL : OTA_CHANNEL);
const final = Maindata.testchannel_actuve ? OTA_TESTCHANNEL : OTA_CHANNEL
        await LiveUpdate.ready();

        const syncResult = await LiveUpdate.sync({
          channel: final,
        });

        console.log('[LiveUpdate] Sync result:', syncResult);

        if (syncResult.nextBundleId) {
          console.log('[LiveUpdate] New bundle installed ? reloading');
          await LiveUpdate.reload();
        } else {
          console.log('[LiveUpdate] App already up-to-date');
        }
      }
    } catch (err) {
      console.error('[BOOT] Version / OTA bootstrap failed', err);
    }
  };

  bootstrapUpdates();
}, []);


function isCritical(versionStr) {
  const parts = versionStr.split('.');
  if (parts.length < 2) return false;

  const major = Number(parts[0]);
  const minor = Number(parts[1]);

  if (isNaN(major) || isNaN(minor)) return false;
if (major === 0 && minor === 0) return false;
  const versionSum = major + minor / 10;
  console.log("version sum",versionSum%0.5 === 0);
  return versionSum % 0.5 === 0;
}function isVersionGreater(v1, v2) {
  const a = v1.split('.').map(Number);
  const b = v2.split('.').map(Number);
console.log("isVersionGreater",v1,v2,a,b)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const num1 = a[i] || 0;
    const num2 = b[i] || 0;
    if (num1 > num2) return true;
    if (num1 < num2) return false;
  }
  return false; // versions are equal
}

//     useEffect(() => {
//       const checkVersion = async () => {
//         try {
//           const res = await fetch(`https://${Maindata.SERVER_URL}/user/version`);
//           const data = await res.json(); // expects { version: "1.5", url: "..." }


//           if (isVersionGreater(data.version, CURRENT_APP_VERSION)) {
//             const updatedetails = await fetch(`https://${Maindata.SERVER_URL}/user/updatedetails`, {
//               method: 'GET',
//               headers: {
//                 'Content-Type': 'application/json',
               
//               }
//             })
//             const dat = await updatedetails.json()
     
//             //updatedetails.resposnse_url
//             setCriticalUpdate(isCritical(data.version));
//             setServerVersion(data.version);
//             setDownloadUrl(dat.resposnse_url || 'https://example.com/download'); // Fallback URL if not provided
//             setShowModal2(true);
//           }
//         } catch (err) {
//           console.error("Version check failed", err);
//         }
//       };
  
//       checkVersion();
//     }, []);
window.__CALL_NOTIFICATION_ACTION__ = null;
// possible values: 'ANSWER', 'DECLINE', 'TAP'

let restoringNow = false;
useEffect(() => {
  const handler = (e) => {
    
    console.log("Overlay restored!", e.detail);
    CallRuntime.overlayActive = false
  CallRuntime.isRestoring = true;
restoringNow = true
  // give UI time to settle
  setTimeout(() => {
    CallRuntime.isRestoring = false;
    restoringNow=false
  }, 300); // 0.6s is enough
    // resume UI, navigate, etc
  };

  window.addEventListener("RestoreOverlay", handler);
  return () => window.removeEventListener("RestoreOverlay", handler);
}, []);


/* BACK BUTTON ? minimize */
useEffect(() => {
  let backHandle;
  let bgHandle;
  Promise.resolve(CapacitorApp.addListener('backButton', () => {
    console.log("all states", CallRuntime.showScreen, CallRuntime.overlayActive, restoringNow);
    if (!restoringNow && CallRuntime.showScreen && !CallRuntime.overlayActive) {
      enableOverlay();
    }
  })).then((h) => { backHandle = h; }).catch(() => {});

  Promise.resolve(CapacitorApp.addListener("appStateChange", ({ isActive }) => {
    console.log("all states", isActive, CallRuntime.showScreen, CallRuntime.overlayActive, restoringNow);
    if (!isActive && CallRuntime.showScreen && !CallRuntime.overlayActive && !restoringNow) {
      enableOverlay();
    }
  })).then((h) => { bgHandle = h; }).catch(() => {});

  return () => {
    if (backHandle && typeof backHandle.remove === "function") backHandle.remove();
    if (bgHandle && typeof bgHandle.remove === "function") bgHandle.remove();
  };
}, []);


/* RETURN FOREGROUND ? RESTORE */
useEffect(() => {
  let fgHandle;
  Promise.resolve(CapacitorApp.addListener("appStateChange", (state) => {
    if (state.isActive && CallRuntime.overlayActive && !restoringNow) {
      restoreNormal();
    }
  })).then((h) => { fgHandle = h; }).catch(() => {});

  return () => {
    if (fgHandle && typeof fgHandle.remove === "function") fgHandle.remove();
  };
}, []);

// const runLiveUpdate = async () => {
//   try {

// if(!Maindata.IsDev){

// console.log("main dev",Maindata.IsDev)
//   await LiveUpdate.setChannel({ channel: 'Live-update' });
//     // 1?? READY ? inspect current state
//     await LiveUpdate.ready();

//     // 2?? SYNC ? check for updates
//     const syncResult = await LiveUpdate.sync();

//     console.log('[LiveUpdate] Sync result: part2', syncResult);

//     // 3?? RELOAD APP IF NEW BUNDLE INSTALLED
//     if (syncResult.nextBundleId) {
//       console.log(`[LiveUpdate] New bundle installed: ${syncResult.nextBundleId}`);
//       console.log('[LiveUpdate] Reloading app to apply update...');

//       // Capacitor official reload (Android + iOS)
//       await LiveUpdate.reload();
//     } else {
//       console.log('[LiveUpdate] No new updates available. App is already up-to-date.');
//     }
//   }
//   } catch (err) {
//     console.error('[LiveUpdate] Error:', err);
//   }
// };
// useEffect(() => {
//     function handleKey(e) {
//         if ((e.key === "Escape" || e.key === "Backspace") &&
//             CallRuntime.showScreen && 
//             !CallRuntime.overlayActive) 
//         {
//             enableOverlay();  // no need async, but fine if you await
//             e.preventDefault();
//         }
//     }

//     window.addEventListener("keydown", handleKey);

//     return () => window.removeEventListener("keydown", handleKey);
// }, []);

async function enableOverlay() {
    await ensureOverlayPermission();
   
    CallRuntime.overlayActive = true;

    if (window.NativeAds?.enableOverlayMode) {
        window.NativeAds.enableOverlayMode();
    }

    window.dispatchEvent(new CustomEvent("render-call-ui"));
}




// Helper to convert base64 string to ArrayBuffer
function base64ToArrayBuffer(base64) {
  try{
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}catch (error) {
  console.error("Error converting base64 to ArrayBuffer:", error);
  throw new Error("Invalid base64 string");
  }
}

// Import RSA private key from PEM (similar to public key, but "pkcs8" format)
async function importPrivateKeyFromJwk(jwkString) {
  try{
    let jwk;
if (!jwkString || typeof jwkString !== 'string') {
  throw new Error("Invalid JWK format");

}else{
  jwk = JSON.parse(jwkString);

}


  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}catch (error) {
  console.error("Error importing private key from JWK:", error);
  throw new Error("Invalid JWK format");
  }
}


// Hybrid decryption function
async function decryptMessageHybrid(encryptedAesKeyB64, ivB64, ciphertextB64, privateKeyPem) {
  // 1. Import RSA private key
try{

  const privateKey = await importPrivateKeyFromJwk(privateKeyPem);

  // 2. Decode base64 to ArrayBuffer
  const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedAesKeyB64);
  
  const ivBuffer = base64ToArrayBuffer(ivB64);
  const ciphertextBuffer = base64ToArrayBuffer(ciphertextB64);


  console.log("Encrypted AES Key Length:", encryptedAesKeyBuffer.byteLength);

  // 3. Decrypt AES key using RSA private key
let aesKeyRaw;
try {
  // Try modern RSA-OAEP-256 (preferred)
  aesKeyRaw = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP", hash: "SHA-256" },
    privateKey,
    encryptedAesKeyBuffer
  );
} catch (err1) {
  console.warn("?? RSA-OAEP-256 decryption failed, retrying with SHA-1 fallback:", err1);
  try {
    // Try legacy RSA-OAEP (SHA-1) for older WebViews (Realme, Oppo, Vivo)
    aesKeyRaw = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP", hash: "SHA-1" },
      privateKey,
      encryptedAesKeyBuffer
    );
  } catch (err2) {
    console.error("? Both RSA-OAEP-256 and fallback RSA-OAEP failed:", err2);
    throw new Error("RSA decryption failed on this device");
  }
}

  // 4. Import decrypted AES key as CryptoKey
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    aesKeyRaw,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // 5. Decrypt the ciphertext using AES-GCM with the IV
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
    aesKey,
    ciphertextBuffer
  );

  // 6. Decode decrypted ArrayBuffer to string
  const decryptedMessage = new TextDecoder().decode(decryptedBuffer);

  return decryptedMessage;
} catch (error) {
  console.error("Hybrid decryption failed:", error);
  throw new Error("Hybrid decryption failed");
}
}


async function sendPublicKeyToBackend(userId) {

  console.log("we are at pulbic keys")
  const currentUserStr = globalThis.storage.getItem('currentuser');
  let currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    if (!currentUser) {
      try {
        const res = await api.getUser(host);
        const json = await res.json();
        if (res.ok && json.success) {
          currentUser = json.userResponse;
          globalThis.storage.setItem("currentuser", JSON.stringify(currentUser));
          globalThis.storage.setItem("currentuser", JSON.stringify(currentUser));
        } else if (isRevocationLike(res.status, json)) {
          showAuthSwal("Session revoked", json.error || json.message || "Your session was revoked. Please login again.");
        }
      } catch (err) {
        console.error("Failed to fetch user for key check:", err);
      }
    }

  const publicKeyPem = currentUser?.publicKey || null;
  const privateKeyJwkStr = globalThis.storage.getItem('privateKey') || null;
  const storedHash = currentUser?.privateKeyHash || null;


  const testMessage = "keypair-test";

  if (publicKeyPem && privateKeyJwkStr) {
    try {
      const localHash = await hashPrivateKey(privateKeyJwkStr);
      if (storedHash && storedHash === localHash) {
        console.log("?? Existing keypair hash matches.");
        return { message: "?? Keys exist and hash matches." };
      }
      if (storedHash && storedHash !== localHash) {
        console.warn("? Private key hash mismatch. Rotating keypair.");
        } else if (!storedHash) {
         const res = await api.updateKey(host, publicKeyPem, localHash);
         const json = await res.json().catch(() => ({}));
         if (!res.ok) {
           if (isRevocationLike(res.status, json)) {
             showAuthSwal("Session revoked", json.error || json.message || "Your session was revoked. Please login again.");
           }
           throw new Error(json.error || json.message || "Failed to update key hash.");
         }
          if (currentUser) {
            currentUser.privateKeyHash = localHash;
            globalThis.storage.setItem("currentuser", JSON.stringify(currentUser));
            globalThis.storage.setItem("currentuser", JSON.stringify(currentUser));
          }
          console.log("?? Stored private key hash.");
          return { message: "?? Stored private key hash." };
        }

      const publicKey = await importPublicKeyFromPem(publicKeyPem);
      const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        JSON.parse(privateKeyJwkStr),
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
      );

      const encrypted = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        new TextEncoder().encode(testMessage)
      );

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encrypted
      );
      const decrypted = new TextDecoder().decode(decryptedBuffer);

      if (decrypted === testMessage && storedHash && storedHash === localHash) {
        console.log("?? Existing keypair is valid.");
        return { message: "?? Keys exist and are valid." };
      }
    } catch (err) {
      console.error("? Key validation failed:", err);
    }
  }


  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const jwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const pem = convertSpkiToPem(spki);



  const privateKeyHash = await hashPrivateKey(JSON.stringify(jwk));
   const response = await api.updateKey(host, pem, privateKeyHash);
   const result = await response.json().catch(() => ({}));
   if (!response.ok) {
     if (isRevocationLike(response.status, result)) {
       showAuthSwal("Session revoked", result.error || result.message || "Your session was revoked. Please login again.");
     }
     throw new Error(result.error || result.message || "? Failed to update public key on backend");
   }
console.log("resuklt",result)
  if (result.success) {
    if (currentUser) {
      currentUser.publicKey = pem;
      currentUser.privateKeyHash = privateKeyHash;
globalThis.storage.removeItem("privateKey");
globalThis.storage.removeItem("currentuser");
globalThis.storage.removeItem("privateKey");
globalThis.storage.removeItem("currentuser");

      console.log("pem",pem)
      globalThis.storage.setItem("currentuser", JSON.stringify(currentUser));
      globalThis.storage.setItem("currentuser", JSON.stringify(currentUser));
    }
    globalThis.storage.setItem("privateKey", JSON.stringify(jwk));
    console.log("jwk",jwk)
    globalThis.storage.setItem("privateKey", JSON.stringify(jwk));
    console.log("?? Keys saved locally.");
  }

  return result;
}





function convertSpkiToPem(spkiBuffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(spkiBuffer)));
  const formatted = base64.match(/.{1,64}/g)?.join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}

async function importPublicKeyFromPem(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}
useEffect(() => {
  const setupNotifications = async () => {
    try {
      // Request notification permission (Cordova handles internally)
 
        
        const permission = await LocalNotifications.requestPermissions();
        await LocalNotifications.createChannel({
  id: "call",
  name: "Incoming Calls Js",
  description: "Call alerts",
   sound: null,  
  importance: 5,       // ?? REQUIRED
  vibration: true,     // ?? REQUIRED for heads-up
});

        console.log('?? Capacitor Notification permission:', permission);
      
    } catch (err) {
      console.error('? Error setting up notifications:', err);
    }
  };

  setupNotifications();
}, []);


// Hook to register notification click listener once
useEffect(() => {
  if (window.cordova && cordova.plugins?.notification?.local) {
    cordova.plugins.notification.local.on('click', (notification) => {
      const senderId = notification.data?.senderId;
      console.log('?? Notification clicked:', senderId);
      clearDirectNotificationForUser(senderId);

      if (selectedUser.current !== senderId) {
        setSelectedUser1(senderId);
        selectedUser.current = senderId;
        const userMain = globalThis.storage.readJSON('usersMain', []);
        const user = userMain.find((user) => user.id === senderId);
        history.push('/chatwindow', {
          userdetails: user,
          callback: 'goBackToUserList',
          currentUserId: currentuserRef.current._id,
        });
      }
    });
  } else {
    // Capacitor fallback
 // Capacitor fallback
LocalNotifications.addListener(
  'localNotificationActionPerformed',
  async (event) => {
    const { notification, actionId } = event;
stopCallRingtone();
    const extra = notification.extra || notification.data || {};
    console.log('?? Notification action:', actionId, extra);

    /* =====================================================
       ?? CALL NOTIFICATION
       ===================================================== */
    if (extra.callId) {
      console.log('?? Call notification action:', actionId);

      // Always cancel the notification
      await LocalNotifications.cancel({
        notifications: [{ id: notification.id }],
      });

      // ? DECLINE ? clear prefs & stop
        if (actionId === 'DECLINE') {
          console.log('? Call declined from notification');

          globalThis.storage.removeItem('incoming_call_data');
          globalThis.storage.removeItem('incoming_call_offer');

          appendCallLog({
            userId: extra.callerId,
            status: "incoming",
            callStatus: "decline",
            read: true
          });

          // Optional: notify server here
          // sendCallDecline(extra.callId);

          window.__CALL_NOTIFICATION_ACTION__ = 'DECLINE';
          return; // ? DO NOT open call UI
        }

      // ? ANSWER or TAP ? let resume logic handle it
      window.__CALL_NOTIFICATION_ACTION__ = actionId || 'TAP';
      return;
    }

    /* =====================================================
       ?? CHAT NOTIFICATION (UNCHANGED)
       ===================================================== */
    const groupId = extra.groupId;
    if (groupId) {
      const groupList = globalThis.storage.readJSON("groupsMain", []) || [];
      const group = groupList.find((g) => String(g?.id) === String(groupId));
      if (group?.isDelete || group?.isDeleted) return;
      history.push('/group-chatwindow', {
        groupdetails: group || {
          id: String(groupId),
          name: extra.groupName || "Group",
          avatar: extra.groupAvatar || "",
          isActive: true,
        },
      });
      return;
    }

    const senderId = extra.senderId;
    if (!senderId) return;

    console.log('?? Chat notification clicked:', senderId);
    await clearDirectNotificationForUser(senderId);

    if (selectedUser.current !== senderId) {
      setSelectedUser1(senderId);
      selectedUser.current = senderId;

      const userMain = JSON.parse(
        globalThis.storage.getItem('usersMain') || '[]'
      );

      const user = userMain.find((u) => u.id === senderId);

      history.push('/chatwindow', {
        userdetails: user,
        callback: 'goBackToUserList',
        currentUserId: currentuserRef.current._id,
      });
    }
  }
);

  }
}, []);

// -----------------


  // Function to save notification data to the app storage (e.g., AsyncStorage or database)

  // Function to delete or mark the notification as processed
 

const showCustomNotification = async (message) => {
  const { sender, content } = message;
  console.log(`?? New message from ${sender}: ${content}`);

  const soundEntry = customSounds.find((item) => item.senderId === sender);
  const soundToPlay = soundEntry?.soundPath || ForAllSounfds || null;


  try {
    const users = globalThis.storage.readJSON('usersMain', []);
    console.log("muted",mutedlist)
    const matchingUser = users.find((user) => user.id === sender);
    
    await showVisualNotification(
      sender,
      matchingUser?.name || 'Unknown',
      content,
      matchingUser?.avatar,
      soundToPlay
    );
  } catch (error) {
    console.error('? Error playing notification sound:', error);
  }
};

const getStableGroupNotificationId = (groupId) => {
  const text = String(groupId || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return 200000 + (Math.abs(hash) % 700000);
};

const getStableDirectNotificationId = (senderId) => {
  const text = String(senderId || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return 10000 + (Math.abs(hash) % 90000);
};

const clearDirectNotificationForUser = async (senderId) => {
  if (!senderId) return;
  const notificationId = getStableDirectNotificationId(senderId);

  try {
    if (window.cordova && cordova.plugins?.notification?.local?.cancel) {
      await new Promise((resolve) => {
        try {
          cordova.plugins.notification.local.cancel(notificationId, resolve);
        } catch {
          resolve();
        }
      });
    }

    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }],
    });
  } catch (err) {
    console.error("? clearDirectNotificationForUser error:", err);
  }
};

const buildGroupNotificationBody = (senderName, messagePreview) => {
  const safeSender = String(senderName || "Member").trim() || "Member";
  const safePreview = String(messagePreview || "New group message").trim() || "New group message";
  const body = `${safeSender}: ${safePreview}`;
  return body.length > 120 ? `${body.slice(0, 117)}...` : body;
};

const showGroupNotification = async ({
  groupId,
  groupName,
  groupAvatar,
  senderId,
  senderName,
  messagePreview,
  unreadCount,
}) => {
  if (!groupId) return;
  const mutedGroups = Array.isArray(window.__MUTED_GROUPS_CACHE)
    ? window.__MUTED_GROUPS_CACHE
    : (globalThis.storage.readJSON("mutedGroups", []) || []);
  if (mutedGroups.map(String).includes(String(groupId))) return;
  const groupsCache = Array.isArray(window.__GROUPS_MAIN_CACHE)
    ? window.__GROUPS_MAIN_CACHE
    : (globalThis.storage.readJSON("groupsMain", []) || []);
  const targetGroup = (Array.isArray(groupsCache) ? groupsCache : []).find((g) => String(g?.id || "") === String(groupId));
  if (targetGroup?.isArchive || targetGroup?.isDelete || targetGroup?.isDeleted) return;
  const notificationId = getStableGroupNotificationId(groupId);
  const title = `${groupName || "Group"}${Number(unreadCount || 0) > 1 ? ` (${unreadCount})` : ""}`;
  const senderLine = senderName || "Member";
  const body = buildGroupNotificationBody(senderLine, messagePreview);
  const extraData = {
    groupId: String(groupId),
    groupName: groupName || "Group",
    groupAvatar: groupAvatar || "",
    senderId: senderId ? String(senderId) : "",
    senderName: senderLine,
  };

  try {
    if (window.cordova && cordova.plugins?.notification?.local) {
      cordova.plugins.notification.local.schedule({
        id: notificationId,
        title,
        text: body,
        attachments: groupAvatar ? [groupAvatar] : [],
        smallIcon: 'res://echoid_v3',
        data: extraData,
        foreground: true,
        sound: null,
        trigger: { at: new Date(Date.now() + 120) },
        channel: 'silent_channel_id'
      });
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title,
          body,
          attachments: groupAvatar ? [{ id: 'img', url: groupAvatar }] : [],
          data: extraData,
          smallIcon: "echoid_v3",
        },
      ],
    });
  } catch (err) {
    console.error("? showGroupNotification error:", err);
  }
};

  
const showVisualNotification = async (id, sender, content, base64Image, sound) => {
  try {
    const notificationId = getStableDirectNotificationId(id);
    // ---- 1?? Schedule notification ----
    if (window.cordova && cordova.plugins?.notification?.local) {
      // Cordova Local Notification
      cordova.plugins.notification.local.schedule({
        id: notificationId,
        title: `New message from ${sender}`,
        text: content,
        attachments: base64Image ? [base64Image] : [],
         smallIcon: 'res://echoid_v3',
        data: { senderId: id },
        foreground: true, // show even when app in foreground
        sound: null, // handled manually below,
      trigger: { at: new Date(Date.now() + 200) },
       channel: 'silent_channel_id' 

        
      });
      console.log("?? Cordova local notification scheduled");
    } else {
      // Fallback for web / Capacitor preview
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: `New message from ${sender}`,
            body: content,
            attachments: base64Image ? [{ id: 'img', url: base64Image }] : [],
            data: { senderId: id },
            smallIcon:"echoid_v3",
        
          },
        ],
      });
      console.log("?? Capacitor notification scheduled (fallback)");
    }

    // ---- 2?? Handle sound playback ----
    setTimeout(async () => {

      if (sound) {
        try {
          // Custom sound from Filesystem
           const audioSrc = Capacitor.convertFileSrc(sound);

          console.log("?? Playing custom sound:", audioSrc);
          const audio = new Audio(audioSrc);
          await audio.play();
          setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
          }, 2300);
          return;
        } catch (err) {
          console.warn('?? Failed custom sound, fallback next:', err);
        }
      }

      // Fallback: play default notification sound
      console.log("?? Playing default notification sound");
      const defaultAudio = new Audio('/universfield-new-notification-033-480571.mp3'); // in /public folder
      await defaultAudio.play();
      setTimeout(() => {
        defaultAudio.pause();
        defaultAudio.currentTime = 0;
      }, 2300);
    }, 500);

  } catch (err) {
    console.error('? showVisualNotification error:', err);
  }
};


 
  // Function to send token to Firebase Cloud Messaging (FCM)






const loadMessagesFromPreferencesToSQLite = async (db) => {
  const migratedMessages = [];

  try {
    const keys = await globalThis.storage.keysAsync();
    const messageKeys = keys.filter(k => k.startsWith('message_'));

    if (messageKeys.length === 0) {
      // No messages found
      return [];
    }

//    const privateKey = globalThis.storage.getItem('privateKey');
    const formattedMessages = [];

    // Step 1??: Collect all messages first
    for (const key of messageKeys) {
      try {
        const value = await globalThis.storage.getItemAsync(key);
        if (!value) continue;

        const rawMessage = JSON.parse(value);

        const formattedMessage = {
          id: rawMessage.messageId || rawMessage.id,
          sender: rawMessage.sender,
          recipient: rawMessage.recipient,
          content: rawMessage.content || null,
          timestamp: rawMessage.timestamp || new Date().toISOString(),
          status: rawMessage.status || 'pending',
          read: 0,
          type: rawMessage.type || 'text',
          file_name: rawMessage.file_name || null,
          file_type: rawMessage.file_type || null,
          file_size: rawMessage.file_size || null,
          file_path: rawMessage.file_path || null,
          thumbnail: rawMessage.thumbnail || null,
          isDeleted: Number(rawMessage.isDeleted || 0),
          isDownload: Number(rawMessage.isDownload ?? 1),
          isSent: Number(rawMessage.isSent ?? 1),
          isError: Number(rawMessage.isError ?? 0),
          encryptedMessage: rawMessage.encryptedMessage || null,
          encryptedAESKey: rawMessage.encryptedAESKey || null,
          eniv: rawMessage.eniv || null,
          isReplyTo: rawMessage.isReplyTo || rawMessage.is_reply_to || null
        };

        formattedMessages.push(formattedMessage);
      } catch (err) {
        console.warn(`?? Skipping invalid message for key ${key}:`, err);
      }
    }

    if (formattedMessages.length === 0) {
      return [];
    }

    // Step 2??: Batch insert in a single transaction for efficiency
    await new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          for (const msg of formattedMessages) {
            if (!msg?.id) continue;

            tx.executeSql(
              `
              INSERT OR REPLACE INTO messages (
                id, sender, recipient, content, timestamp, status, read, isDeleted, isDownload,
                type, file_name, file_type, file_size, thumbnail, file_path,
                isSent, isError, encryptedMessage, encryptedAESKey, eniv, isReplyTo
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
              `,
              [
                msg.id,
                msg.sender,
                msg.recipient,
                msg.content,
                new Date(msg.timestamp).toISOString(),
                msg.status,
                msg.read,
                msg.isDeleted,
                msg.isDownload,
                msg.type,
                msg.file_name,
                msg.file_type,
                msg.file_size,
                msg.thumbnail,
                msg.file_path,
                msg.isSent,
                msg.isError,
                msg.encryptedMessage,
                msg.encryptedAESKey,
                msg.eniv,
                msg.isReplyTo
              ]
            );
          }
        },
        (txError) => {
          console.error('? SQLite batch insert failed:', txError);
          reject(txError);
        },
        () => {
          console.log(`? Migrated ${formattedMessages.length} messages to SQLite.`);
          resolve();
        }
      );
    });

    // Step 3??: Remove migrated items from Preferences in parallel
    await Promise.all(messageKeys.map((key) => globalThis.storage.removeItem(key)));

    console.log(`?? Cleaned up ${messageKeys.length} old Preferences entries.`);

    return formattedMessages;
  } catch (err) {
    console.error('? Error loading messages from Preferences:', err);
    return migratedMessages; // return what was successfully processed
  }
};

  // Initialize SQLite DB
  const initSQLiteDB = async () => {
    if (!isPlatform('hybrid')) {
      dbRef.current = null;
      return null;
    }
    if (!window?.sqlitePlugin?.openDatabase) {
      console.warn("sqlitePlugin not available on this platform; skipping SQLite init.");
      dbRef.current = null;
      return null;
    }
    try {
      const dbName = 'Conversa_chats_store.db';
      if (!dbRef.current) {
        return new Promise((resolve, reject) => {
          db = window.sqlitePlugin.openDatabase({ name: dbName, location: 'default' });

          dbRef.current = db; // Store the database reference in the ref
          db.transaction(tx => {
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                sender TEXT,
                recipient TEXT,
                content TEXT,
                timestamp TEXT,
                status TEXT,
                read INTEGER DEFAULT 0,
                isDeleted INTEGER DEFAULT 0,
                isDownload INTEGER DEFAULT 0,
                type TEXT DEFAULT 'text',
                file_name TEXT,
                file_type TEXT DEFAULT null,
                file_size INTEGER,
                thumbnail BLOB DEFAULT null,
                file_path TEXT,
                isError INTEGER DEFAULT 0,
                isSent INTEGER DEFAULT 1,
                encryptedMessage TEXT DEFAULT null,
                encryptedAESKey TEXT DEFAULT null,
                eniv TEXT DEFAULT null,
                isReplyTo TEXT DEFAULT null
              );`,
              [],
              async () => {
                //console.log('? messages table created or exists.')
              


              }
              ,
              (tx, error) => {
                console.error('? Error creating messages table:', error);
                reject(error);
              }
            );
    
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS unreadCount (
                sender TEXT PRIMARY KEY,
                count INTEGER DEFAULT 0
              );`,
              [],
              () => {
                //console.log('? unreadCount table created or exists.');
                resolve(); // Resolve only after all tables
              },
              (tx, error) => {
                console.error('? Error creating unreadCount table:', error);
                reject(error);
              }
            );

            tx.executeSql(
              `ALTER TABLE messages ADD COLUMN isReplyTo TEXT DEFAULT null;`,
              [],
              () => {},
              (_, error) => {
                if (String(error?.message || "").toLowerCase().includes("duplicate column")) {
                  return false;
                }
                return false;
              }
            );
          });
        });
      }
      return dbRef.current;
    } catch (err) {
      console.error('SQLite DB Error:', err);
      return null;
    }
  };

  const mergerusers = async ()=>{
          const savedUsers = globalThis.storage.readJSON('usersMain', []) || [];

const capUsersRaw = await globalThis.storage.getItemAsync('usersMain');
const capUsers = capUsersRaw ? JSON.parse(capUsersRaw) : [];
//console.log("saved users",savedUsers)
//console.log("cap users",capUsers)
const localMap = new Map(savedUsers.map(user => [user.phoneNumber, user]));

for (const user of capUsers) {
  const localUser = localMap.get(user.phoneNumber);

  if (!localUser) {
    
    // User doesn't exist in localStorage, add directly
    localMap.set(user.phoneNumber, user);

  } else {
   const capTimestamp = new Date(user.timestamp || 0).getTime();
      const localTimestamp = new Date(localUser.timestamp || 0).getTime();

      const isCapNewer = capTimestamp > localTimestamp;

      if (isCapNewer) {
        console.log(`Updating user ${user.phoneNumber} in localStorage`,user);
        // Capacitor version is newer � update it
        localMap.set(user.phoneNumber, user);
      }else{
        console.log(`Keeping user ${user.phoneNumber} in localStorage`,user);
      }
  }
}

// Final merged users array
const mergedUsers = Array.from(localMap.values());
const mergedStr = JSON.stringify(mergedUsers);
try {
  globalThis.storage.setItem('usersMain', mergedStr);
  setUsersMain(mergedUsers);
  setUsersMaintest(mergedUsers)
} catch (error) {
  console.warn("Could not store in localStorage, likely quota exceeded", error);
}

  }

useEffect(() => {
  const handleAppStateChange = async (state) => {
    if (state.isActive) {
      console.log("?? App resumed (foreground)");

 
      isAcitve.current = true;
      startHeartbeatbackbgroung(socket.current, false);
  await LocalNotifications.cancel({
      notifications: [{ id: 999 }],
    });

    stopCallRingtone();
     clearCallTimeout();
    console.log("Cuuting notif")

      let token = await getAccessToken();
      if (!token) {
        token = await refreshAccessToken(host);
      }
      const deviceId = getDeviceIdSync() || await getDeviceId();
      const url = token
        ? `wss://${Maindata.SERVER_URL}?token=${token}&deviceId=${encodeURIComponent(deviceId)}`
        : null;

      // ? Reconnect WebSocket if needed
      if (url && (!socket.current || socket.current.readyState === WebSocket.CLOSED)) {
        console.log("Reconnecting WebSocket in foreground");
        await connect(url);
      }

      setTimeout(async () => {
        try {
          console.log("?? Running foreground sync...");

          // ?? STEP 1: Merge usersMain (native truth wins)
          const localUsers = globalThis.storage.readJSON("usersMain", []);
          const prefData = await globalThis.storage.getItemAsync("usersMain");
          const nativeUsers = JSON.parse(prefData || "[]");

          const mergedMap = new Map();

          // Add all users from local first
          for (const u of localUsers) {
            mergedMap.set(u.id || u.phoneNumber, u);
          }

          // Merge native users � overwrite only if newer or missing  
          for (const native of nativeUsers) {
            const key = native.id || native.phoneNumber;
            const existing = mergedMap.get(key);

            const nativeTime = new Date(native.timestamp || 0).getTime();
            const localTime = new Date(existing?.timestamp || 0).getTime();

            if (!existing || nativeTime > localTime) {
              // native data is fresher or missing in local ? replace
              mergedMap.set(key, native);
            } else {
              // local data is newer ? keep, but still update lastMessage if missing
              if (!existing.lastMessage && native.lastMessage) {
                existing.lastMessage = native.lastMessage;
              }
            }
          }


          const mergedUsers = Array.from(mergedMap.values());

          // Save merged result back to both storage systems
          globalThis.storage.setItem("usersMain", JSON.stringify(mergedUsers));
          globalThis.storage.setItem("usersMain", JSON.stringify(mergedUsers));

          setUsersMain(mergedUsers);
          setUsersMaintest(mergedUsers);

          // ?? STEP 2: Ensure DB is open
          let db = dbRef.current;
          if (isPlatform("hybrid") && !db) {
            db = window.sqlitePlugin.openDatabase({
              name: "Conversa_chats_store.db",
              location: "default",
            });
            dbRef.current = db;
          }

          // ?? STEP 3: Load & merge messages (native ? JS)
          const migratedMessages = await loadMessagesFromPreferencesToSQLite(db);
          console.log("?? Migrated messages:", migratedMessages?.length || 0);

          const currentMessages = messagesRef.current || [];
          const msgMap = new Map(currentMessages.map((m) => [m.id, m]));

          for (const msg of migratedMessages) {
            const existing = msgMap.get(msg.id);
            if (!existing || msg.timestamp > existing.timestamp) {
              msgMap.set(msg.id, msg);
            }
          }

          const mergedMessages = Array.from(msgMap.values()).sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );

          setMessages(mergedMessages);
          setMessagestest(mergedMessages);
          messagesRef.current = mergedMessages;

          // STEP 4: Ingest native queued group messages from prefs before remote sync.
          const liveGroupMap =
            window.__GROUP_MESSAGES_CACHE ||
            groupMessagesByGroup ||
            readGroupMessagesFromStorage();
          await ingestNativeGroupMessagesIntoApp(db || null, liveGroupMap || {});

          console.log("? Foreground sync completed successfully");
        } catch (err) {
          console.error("? Error during foreground sync:", err);
        }
      }, 300);
    } else {
      console.log("?? App paused",JSON.stringify(CallRuntime));
  
      isAcitve.current = false;

      if (socket.current?.readyState === WebSocket.OPEN) {
        if(!CallRuntime.showScreen && !restoringNow){
        startHeartbeatbackbgroung(socket.current, true);
        console.log("?? WebSocket kept alive in background");
        }
      } else {
        socket.current = null;
      }
    }
  };

  let listenerHandle;
  Promise.resolve(CapacitorApp.addListener("appStateChange", handleAppStateChange))
    .then((h) => { listenerHandle = h; })
    .catch(() => {});
  return () => {
    if (listenerHandle && typeof listenerHandle.remove === "function") listenerHandle.remove();
  };
}, []);
async function ensureOverlayPermission() {
    if (!window.NativeAds) return false;

    return new Promise((resolve) => {
      console.log("overlay ask")
        if (!window.Android) window.NativeAds.requestOverlayPermission();

        // small delay to allow settings to update
        setTimeout(() => {
            resolve(true);
        }, 600);
    });
}

const fetchAndMergeIncomingCaller = async (callerId) => {
  if (!callerId) return null;

  const callerKey = String(callerId);
  const cachedUsers = globalThis.storage.readJSON('usersMain', []) || [];
  const cachedUser = cachedUsers.find((u) => String(u.id) === callerKey);
  if (cachedUser) return cachedUser;

  if (incomingCallerFetchInFlight.current.has(callerKey)) return null;
  incomingCallerFetchInFlight.current.add(callerKey);

  try {
    const response = await api.fetchUser(host, callerId);
    const data = await response.json();
    if (!data?.success || !data?.userResponse) return null;

    const { userResponse } = data;
    const newUser = {
      id: userResponse.id,
      name: userResponse.name,
      avatar: userResponse.profilePic || img,
      lastMessage: "",
      timestamp: userResponse.updatedAt || new Date().toISOString(),
      phoneNumber: userResponse.phoneNumber,
      unreadCount: 0,
      lastUpdated: userResponse.lastUpdated,
      About: userResponse.About,
      updatedAt: userResponse.updatedAt,
      DOB: userResponse.DOB,
      Location: userResponse.Location,
      gender: userResponse.gender,
      publicKey: userResponse.publicKey
    };

    const latestUsers = globalThis.storage.readJSON('usersMain', []) || [];
    const alreadyExists = latestUsers.some((u) => String(u.id) === callerKey);
    if (alreadyExists) {
      return latestUsers.find((u) => String(u.id) === callerKey) || null;
    }

    const updatedUsers = [...latestUsers, newUser];
    globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
    setUsersMain(updatedUsers);
    setUsersMaintest(updatedUsers);

    if (
      CallRuntime.showScreen &&
      String(CallRuntime.data?.callerId) === callerKey &&
      !CallRuntime.data?.userdetail
    ) {
      CallRuntime.data = { ...CallRuntime.data, userdetail: newUser };
      window.dispatchEvent(new Event("render-call-ui"));
    }

    return newUser;
  } catch (error) {
    console.error("Error fetching incoming caller:", error);
    return null;
  } finally {
    incomingCallerFetchInFlight.current.delete(callerKey);
  }
};

useEffect(() => {
  const handleIncoming = async(e) => {
    console.log("Incoming Call ? Runtime Launch");
  if (CallRuntime.showScreen) {
      console.warn("? Incoming call ignored � already in call screen");
      return;
    }

      const now = Date.now();
   const userdet = usersMain.find(u => u.id === e.detail.callerId) || e.detail.userdetail;
   if (!userdet && e.detail?.callerId) {
    void fetchAndMergeIncomingCaller(e.detail.callerId);
   }
console.log(isAcitve,e.detail)
  // =====================================================
  // ?? APP PAUSED (alive, not killed)
  // =====================================================
  if(!e.detail.Autostart && isAcitve.current){
    startCallRingtone();
     console.log("?? App statt ? saving call + showing notification");

  startCallTimeout(async () => {
    console.warn("? Call timed out");

    stopCallRingtone();
    await LocalNotifications.cancel({ notifications: [{ id: 999 }] });

    appendCallLog({
      userId: e.detail?.callerId,
      status: "incoming",
      callStatus: "missed",
      read: false
    });

    globalThis.storage.removeItem("incoming_call_data");
    globalThis.storage.removeItem("incoming_call_offer");
  });
  }
  if (!isAcitve.current && !e.detail.Autostart) {
    console.log("?? App paused ? saving call + showing notification");

    const payload = {
      callId: e.detail.callId || `${e.detail.callerId}_${now}`,
      callerId: e.detail.callerId,
      callOnly: e.detail.callOnly,
      ts: now, // ?? REQUIRED FOR DIFF CHECK
    };

    startCallRingtone();

// Auto-timeout after 39 seconds
startCallTimeout(async () => {
    console.warn("? Call timed out");

    stopCallRingtone();
    await LocalNotifications.cancel({ notifications: [{ id: 999 }] });

    appendCallLog({
      userId: e.detail?.callerId,
      status: "incoming",
      callStatus: "missed",
      read: false
    });

    globalThis.storage.removeItem("incoming_call_data");
    globalThis.storage.removeItem("incoming_call_offer");
  });
    try {
      // Save minimal call data
      globalThis.storage.setItem("incoming_call_data", JSON.stringify(payload));

      globalThis.storage.setItem("incoming_call_offer", JSON.stringify(e.detail.offer));

      // ?? Show local notification
await LocalNotifications.schedule({
  notifications: [
    {
      id: 999, // fixed ID ? replaces any previous call notification
      title: userdet?.name || "Incoming call",
      body: "Incoming call",
      schedule: { at: new Date(Date.now() + 100) },
  channelId: "call",
      smallIcon: "echoidv2",
      // ?? Call-style behaviorH
      ongoing: true,
      autoCancel: false,
      sound: "universfield-new-notification-033-480571.mp3",

      // ?? Call category & priority
      category: "call",
      importance: 5, // IMPORTANCE_HIGH

      // ?? Action buttons
      actionTypeId: "CALL_ACTION",

      // Extra data for resume logic
      extra: {
        callId: payload.callId,
        callerId: payload.callerId,
        ts: payload.ts,
      },
    },
  ],
});


      console.log("?? Call persisted + notification shown");
    } catch (err) {
      console.error("? Failed to persist paused call", err);
    }

    return; // ? DO NOT open JS UI now
  }

 
    CallRuntime.set({
      mode: "answer",
      callerId: e.detail.callerId,
      offer: e.detail.offer,
      userId: e.detail.userId,
      callOnly: e.detail.callOnly,
      userdetail: userdet,
       Answer:e.detail.Answer ,
    });
  };

  window.addEventListener("incoming-call", handleIncoming);
  return () => window.removeEventListener("incoming-call", handleIncoming);
}, [usersMain]);


const connect = async (url) => {
    if (!socket.current || socket.current.readyState === WebSocket.CLOSED) {
      socket.current = new WebSocket(url);
  
      socket.current.addEventListener('open', () => {
        console.log('WebSocket connected',hasWsTokenParam(url));
        wsRefreshTried.current = false;
        startHeartbeat(socket.current);
        if(!serverreconnected.current && hasWsTokenParam(url) && !suppressWsStatusSwalRef.current){
  Swal.fire({
    title: 'Server online',
    text: 'Connected  ...',
    icon: 'success',
  confirmButtonText: 'Lets go',
  width: 300,
  padding: '1.2rem',
  backdrop: 'rgba(0,0,0,0.4)',
  borderRadius:'10px',
  customClass: {
    popup: 'mobile-alert'
  }
});
        serverreconnected.current =true
      }
        suppressWsStatusSwalRef.current = false;
      
    });

   socket.current.addEventListener("message", async (event) => {
  let data;
  try { data = JSON.parse(event.data); }
  catch { return console.error("Invalid JSON"); }

  switch (data.type) {


    case "call-blocked" :{
       window.dispatchEvent(new CustomEvent("user-offline"));
      break;
    }
    /* ?? Caller sent offer ? this becomes incoming-call event */
    case "incoming-call": {
      window.dispatchEvent(new CustomEvent("incoming-call", {
        detail: {
          callerId: data.callerId,
          offer: data.offer,
          userId: currentuserRef.current._id,
          callOnly:data.callOnly,
          Answer: false,
        }
      }));
      break;
    }

    /* ?? Callee accepted ? Caller can now apply answer + flush ICE */
    case "call-answer": {
      window.dispatchEvent(new CustomEvent("call-answer", { detail: data.answer }));
      break;
    }

    /* ?? ICE exchange both ways */
    case "ice-candidate": {
      window.dispatchEvent(new CustomEvent("ice-candidate", { detail: data.candidate }));
      break;
    }

    /* ? Call Declined */
    case "call-declined": {
         if(CallRuntime.overlayActive && !restoringNow) {
        restoreNormal();
      }
      window.dispatchEvent(new CustomEvent("call-declined"));
      break;
    }

    /* ? Remote offline */
    case "user-offline": {
         if(CallRuntime.overlayActive && !restoringNow) {
        restoreNormal();
      }
      window.dispatchEvent(new CustomEvent("user-offline"));
      break;
    }

    /* ?? Remote ended call */
    case "end-call": {
          
  await LocalNotifications.cancel({
      notifications: [{ id: 999 }],
    });

    stopCallRingtone();
     clearCallTimeout();
     console.log("here")
      if(CallRuntime.overlayActive && !restoringNow) {
        restoreNormal();
      }
      window.dispatchEvent(new CustomEvent("end-call"));
      break;
    }
        /* ?? Remote toggled camera */
    case "camera-state": {
      window.dispatchEvent(
        new CustomEvent("camera-state", {
          detail: {
            senderId: data.senderId,
            enabled: data.enabled       // ?? true = video ON, false = OFF
          }
        })
      );
      break;
    }
case "ice-restart-offer": {
    window.dispatchEvent(new CustomEvent("ice-restart-offer", { 
        detail: {
            offer: data.offer,
            senderId: data.senderId,
            targetId: data.targetId
        }
    }));
    break;
}

case "ice-restart-answer": {
    window.dispatchEvent(new CustomEvent("ice-restart-answer", { 
        detail: data.answer 
    }));
    break;
}


    default:
      handleMessage(data);
  }
});


    socket.current.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      reconnect(url);
    });

    socket.current.addEventListener('close', async (event) => {
      console.log('WebSocket closed:', event.reason);
      console.warn("WebSocket close details:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        readyState: socket.current?.readyState,
        url
      });

        const reasonText = typeof event.reason === "string" ? event.reason.toLowerCase() : "";
        const isNoCloseFrame = event.code === 1005 && hasWsTokenParam(url);
        const tokenExpired =
          event.code === 4001 ||
          event.code === 4401 ||
          reasonText.includes("token") ||
          isNoCloseFrame;
      const authInvalid = event.code === 4400;
      const tokenExpiredCode = event.code === 4401;
      const deviceMismatch = event.code === 4402;
      const userNotFound = event.code === 4404;

      if (tokenExpired && !wsRefreshInFlight.current && !wsRefreshTried.current) {
        suppressWsStatusSwalRef.current = true;
        wsRefreshInFlight.current = true;
        wsRefreshTried.current = true;
        const newToken = await refreshAccessToken(host);
        wsRefreshInFlight.current = false;

        if (newToken && isAcitve.current) {
          const deviceId = getDeviceIdSync() || await getDeviceId();
          const newUrl = `wss://${Maindata.SERVER_URL}?token=${newToken}&deviceId=${encodeURIComponent(deviceId)}`;
          setLink(newUrl);
          connect(newUrl);
          return;
        }
        return;
      }

      if (authInvalid || tokenExpiredCode) {
        return;
      }

      if (deviceMismatch) {
        showAuthSwal("Device mismatch", "Your device ID does not match this session. Please login again.");
        return;
      }

      if (userNotFound) {
        showAuthSwal("User not found", "Your account could not be found. Please login again.");
        return;
      }

      if (isAcitve.current) {
        reconnect(url);
      } else {
        socket.current = null;
      }
    });
  }
};

  function startHeartbeatbackbgroung(socket,offOnr) {
     if (!offOnr) {
      if (heartbeatIntervalId) {
        clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = null;
      }
         if (heartbeatTimeoutId) {
        clearTimeout(heartbeatTimeoutId);
        heartbeatTimeoutId = null;
      }
      return;
    }
    if (foregroundHeartbeatId) {
      clearInterval(foregroundHeartbeatId);
      foregroundHeartbeatId = null;
    }
    if (heartbeatIntervalId || heartbeatTimeoutId) return;

     heartbeatIntervalId = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ping' }));
      console.log("Ping sent in bg");
    }
  }, 15000);// Send a ping every  15 secx
     heartbeatTimeoutId  = setTimeout(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("? Closing WebSocket after 20 seconds...");
      socket.close(1000, `Auto-close after ${String(CallRuntime.overlayActive ? 120000 : 50000).slice(0, -3)
}`);
          if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
      console.log("?? Heartbeat interval cleared");

    }
        heartbeatTimeoutId = null;
    }
  }, CallRuntime.overlayActive ? 120000 : 50000);
  }

  // Send heartbeat to keep connection alive
  function startHeartbeat(socket) {
      if (foregroundHeartbeatId) {
        clearInterval(foregroundHeartbeatId);
        foregroundHeartbeatId = null;
      }
      foregroundHeartbeatId = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
          console.log("Ping sent");
        }
      }, 1000 * 25); // Send a ping every 4 mins
    }

  const resolveGroupSenderMeta = async (groupId, senderId) => {
    const sid = String(senderId || "");
    if (!sid) {
      return { name: "Member", avatar: "", updated: false };
    }

    const usersMainCache = globalThis.storage.readJSON("usersMain", []) || [];
    const fromUsersMain = usersMainCache.find((u) => String(u?.id || u?._id || "") === sid);
    if (fromUsersMain?.name) {
      return {
        name: fromUsersMain.name,
        avatar:
          fromUsersMain.avatar ||
          fromUsersMain.profilePhoto ||
          fromUsersMain.profilePic ||
          "",
        updated: false,
      };
    }

    const byIdCache = globalThis.storage.readJSON("groupMembersById", {}) || {};
    const fromById = byIdCache[sid];
    if (fromById?.name) {
      return { name: fromById.name, avatar: fromById.avatar || "", updated: false };
    }

    const byGroupCache = globalThis.storage.readJSON("groupMemberDetailsByGroup", {}) || {};
    const groupRows = Array.isArray(byGroupCache?.[String(groupId)]) ? byGroupCache[String(groupId)] : [];
    const fromByGroup = groupRows.find((row) => String(row?.id || "") === sid);
    if (fromByGroup?.name) {
      return { name: fromByGroup.name, avatar: fromByGroup.avatar || "", updated: false };
    }

    try {
      const response = await api.fetchUser(host, sid);
      if (!response?.ok) {
        return { name: "Member", avatar: "", updated: false };
      }
      const json = await response.json().catch(() => ({}));
      const payload = json?.userResponse || json?.user || null;
      if (!payload) {
        return { name: "Member", avatar: "", updated: false };
      }

      const nextById = {
        ...byIdCache,
        [sid]: {
          name: payload?.name || "Member",
          avatar: payload?.avatar || payload?.profilePhoto || payload?.profilePic || "",
        },
      };
      globalThis.storage.setItem("groupMembersById", JSON.stringify(nextById));

      const nextByGroup = { ...byGroupCache };
      const existingRows = Array.isArray(nextByGroup[String(groupId)]) ? [...nextByGroup[String(groupId)]] : [];
      const idx = existingRows.findIndex((row) => String(row?.id || "") === sid);
      const row = {
        id: sid,
        name: payload?.name || "Member",
        avatar: payload?.avatar || payload?.profilePhoto || payload?.profilePic || "",
        email: payload?.email || "",
        updatedAt: payload?.updatedAt || new Date().toISOString(),
      };
      if (idx >= 0) existingRows[idx] = { ...existingRows[idx], ...row };
      else existingRows.push(row);
      nextByGroup[String(groupId)] = existingRows;
      globalThis.storage.setItem("groupMemberDetailsByGroup", JSON.stringify(nextByGroup));

      return { name: row.name, avatar: row.avatar, updated: true };
    } catch (error) {
      console.warn("Failed to resolve group sender meta:", error);
      return { name: "Member", avatar: "", updated: false };
    }
  };

  const ingestGroupMessage = async (rawMessage, options = {}) => {
    const { skipMessageStore = false } = options || {};
    const currentMapForPreserve = window.__GROUP_MESSAGES_CACHE || groupMessagesByGroup || readGroupMessagesFromStorage();
    const normalized = preserveLocalGroupMessageState(
      currentMapForPreserve,
      normalizeGroupMessagePayload(rawMessage, rawMessage?.groupId || rawMessage?.group)
    );
    if (!normalized) return false;
    const groupId = String(normalized.groupId);
    const currentUserId = String(globalThis.storage.readJSON("currentuser", null)?._id || "");
    const isOwn = String(normalized.sender) === currentUserId;
    const isActiveOpenGroup = String(activeGroupIdRef.current || globalThis.__ACTIVE_GROUP_ID || "") === groupId;
    let fetchedSummary = null;
    let groupWasKnown = false;
    let senderMeta = { name: "Member", avatar: "", updated: false };

    try {
      const knownGroups = Array.isArray(window.__GROUPS_MAIN_CACHE)
        ? window.__GROUPS_MAIN_CACHE
        : (globalThis.storage.readJSON("groupsMain", []) || []);
      groupWasKnown = knownGroups.some((g) => String(g?.id) === groupId);
      if (!groupWasKnown) {
        const response = await api.groupDetails(host, groupId);
        if (response?.ok) {
          const json = await response.json().catch(() => ({}));
          fetchedSummary = normalizeGroupSummary(json?.group || null);
        }
      }
    } catch (error) {
      console.warn("Failed to fetch missing group summary for incoming message:", error);
    }

    if (!isOwn) {
      senderMeta = await resolveGroupSenderMeta(groupId, normalized.sender);
    }
    const senderLabel = isOwn ? "You" : (senderMeta?.name || "Member");

    if (!skipMessageStore) {
      setGroupMessagesByGroup((prev) => ({
        ...prev,
        [groupId]: mergeGroupMessageMap(
          { [groupId]: Array.isArray(prev?.[groupId]) ? prev[groupId] : [] },
          { [groupId]: [normalized] }
        )[groupId],
      }));
    }

    const canUpsertGroupSummary = shouldUpsertIncomingGroupSummary({
      groupWasKnown,
      fetchedSummary,
    });
    const messagePreview = normalized.messageType === "text"
      ? (normalized.content || "New message")
      : (normalized.messageType?.startsWith("media/") ? normalized.messageType.replace("media/", "") : "Media");
    const latestMessageLine = buildGroupLatestMessageLine(senderLabel, messagePreview);
    const isReadByCurrentUser =
      Array.isArray(normalized.readBy) &&
      normalized.readBy.map(String).includes(String(currentUserId));
    const sourceGroups = Array.isArray(window.__GROUPS_MAIN_CACHE)
      ? window.__GROUPS_MAIN_CACHE
      : (globalThis.storage.readJSON("groupsMain", []) || []);
    const existingGroupEntry = (Array.isArray(sourceGroups) ? sourceGroups : []).find(
      (g) => String(g?.id || "") === groupId
    );
    const shouldReviveGroup = Boolean(
      existingGroupEntry?.isDelete || existingGroupEntry?.isDeleted || existingGroupEntry?.isActive === false
    );
    let notificationContext = null;

    if (canUpsertGroupSummary || shouldReviveGroup) {
      const list = Array.isArray(sourceGroups) ? [...sourceGroups] : [];
      const idx = list.findIndex((g) => String(g?.id) === groupId);
      const base =
        idx >= 0
          ? list[idx]
          : (fetchedSummary || {
              id: groupId,
              name: "Group",
              description: "",
              avatar: "",
              owner: "",
              memberCount: 0,
              unreadCount: 0,
              latestMessage: "",
              latestMessageTimestamp: null,
              updatedAt: normalized.timestamp,
              isActive: true,
              isDelete: false,
              isDeleted: false,
            });

      const currentUnread = Number(base.unreadCount || 0);
      let nextUnread = currentUnread;
      if (!isActiveOpenGroup && !isOwn && !isReadByCurrentUser) {
        nextUnread = currentUnread + 1;
      }

      const updated = {
        ...base,
        latestMessage: latestMessageLine || base.latestMessage,
        latestMessageTimestamp: normalized.timestamp,
        updatedAt: normalized.timestamp,
        unreadCount: nextUnread,
        isDelete: false,
        isDeleted: false,
        isActive: true,
      };

      notificationContext = {
        groupId,
        groupName: updated?.name || "Group",
        groupAvatar: updated?.avatar || "",
        senderId: normalized.sender,
        senderName: senderLabel,
        unreadCount: nextUnread,
        messagePreview,
      };

      if (idx >= 0) list[idx] = updated;
      else list.push(updated);
      const sorted = sortGroupsMain(list);
      window.__GROUPS_MAIN_CACHE = sorted;
      globalThis.storage.setItem("groupsMain", JSON.stringify(sorted));
      setGroupsMain(sorted);
    } else {
      const nextUnread = isActiveOpenGroup || isOwn || isReadByCurrentUser ? 0 : 1;
      notificationContext = {
        groupId,
        groupName: fetchedSummary?.name || "Group",
        groupAvatar: fetchedSummary?.avatar || "",
        senderId: normalized.sender,
        senderName: senderLabel,
        unreadCount: nextUnread,
        messagePreview,
      };
    }

    if (!skipMessageStore && !isOwn && isActiveOpenGroup && MONGO_OBJECT_ID_REGEX.test(String(normalized.id || ""))) {
      try {
        await api.markGroupMessagesRead(host, [String(normalized.id)]);
      } catch (error) {
        console.warn("Failed to mark active group message as read:", error);
      }
    }

    if (!isOwn && !isActiveOpenGroup && notificationContext) {
      await showGroupNotification(notificationContext);
    }

    if (!skipMessageStore) {
      const tempId = String(normalized.clientMessageId || "").trim();
      if (dbRef.current) {
        if (tempId && tempId !== String(normalized.id)) {
          await new Promise((resolve) => {
            try {
              dbRef.current.transaction((tx) => {
                tx.executeSql(
                  "DELETE FROM group_messages WHERE id = ? AND group_id = ?",
                  [tempId, groupId],
                  () => resolve(true),
                  () => resolve(false)
                );
              });
            } catch {
              resolve(false);
            }
          });
        }
        await saveGroupMessageInSQLite(dbRef.current, normalized);
      }
      if (!dbRef.current) {
        const currentMap = readGroupMessagesFromStorage();
        const mergedMap = mergeGroupMessageMap(currentMap, { [groupId]: [normalized] });
        writeGroupMessagesToStorage(mergedMap);
      }
    }
    return true;
  };

  const handleTemporarySocketPayload = useCallback(async (data) => {
    if ((data?.type === "temporary-message" || data?.type === "temporary-message-sent") && data?.message) {
      const currentUserId = String(currentuserRef.current?._id || currentuserRef.current?.id || "");
      const roomUid = String(data.message.roomUid || "");
      const senderId = String(data.message.senderId || "");
      const isOwnMessage = senderId && senderId === currentUserId;
      const isActiveRoom = roomUid && roomUid === String(activeTempRoomIdRef.current || "");
      appendTemporaryMessage(data.message, {
        incrementUnread: !isOwnMessage && !isActiveRoom,
      });
      if (!isOwnMessage && !isActiveRoom && typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification(data.message.senderName || "New room message", {
            body: data.message.content || "You have a new temporary room message",
          });
        } else if (Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      }
      return true;
    }

    if (data?.type === "temporary-room-updated" && data?.room) {
      const currentUserId = String(currentuserRef.current?._id || currentuserRef.current?.id || "");
      const roomUid = String(data?.room?.uid || data?.roomUid || "");
      const roomMembers = Array.isArray(data?.members)
        ? data.members.map((member) => String(member.id || member._id || member))
        : (Array.isArray(data?.room?.members) ? data.room.members.map(String) : []);
      if (currentUserId && roomMembers.includes(currentUserId)) {
        acceptedTempRoomsRef.current.set(roomUid, Date.now());
        removeTemporaryRequestsForRoom(roomUid, "outgoing");
      }
      upsertTemporaryRoom(data.room);
      return true;
    }

    if (data?.type === "temporary-room-request-created" && data?.request) {
      const currentUserId = String(currentuserRef.current?._id || currentuserRef.current?.id || "");
      const normalized = upsertTemporaryRequest({
        ...data.request,
        room: data.room,
        direction: String(data?.request?.userId || "") === currentUserId ? "outgoing" : "incoming",
      });
      if (normalized && normalized.direction === "incoming") {
        Promise.resolve(Swal.fire({
          title: "Join request received",
          text: `${normalized.userName || "A user"} wants to join ${normalized.roomName || "your chatroom"}.`,
          icon: "info",
          timer: 2500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        })).catch(() => {});
      }
      return true;
    }

    if (data?.type === "temporary-room-request-updated" && data?.request) {
      const status = String(data?.status || data?.request?.status || "");
      const roomUid = String(data?.request?.roomUid || data?.room?.uid || "");
      const requestId = String(data?.request?.id || data?.request?._id || "");
      const outgoingRequests = getTemporaryRequestsForRoom(roomUid, "outgoing");
      const hasExactRequest = outgoingRequests.some((request) => String(request.id) === requestId);
      const hasNewerPendingRequest = outgoingRequests.some((request) => String(request.id) !== requestId);
      const acceptedAt = Number(acceptedTempRoomsRef.current.get(roomUid) || 0);
      const ignoreDeclineBecauseAccepted = acceptedAt > 0 && Date.now() - acceptedAt < 15000;

      if (status === "accepted" && data?.room) {
        acceptedTempRoomsRef.current.set(roomUid, Date.now());
        removeTemporaryRequestsForRoom(roomUid, "outgoing");
        upsertTemporaryRoom({
          ...data.room,
          members: Array.isArray(data?.members) ? data.members.map((member) => String(member.id || member._id || member)) : data.room?.members,
          memberCount: Array.isArray(data?.members) ? data.members.length : data.room?.memberCount,
        });
        Promise.resolve(Swal.fire({
          title: "Join request accepted",
          text: `You can now open ${data.room?.name || "the chatroom"}.`,
          icon: "success",
          timer: 2500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        })).catch(() => {});
      } else if (status === "declined" && ignoreDeclineBecauseAccepted) {
        return true;
      } else if (status === "declined" && hasExactRequest) {
        removeTemporaryRequest(requestId);
        Promise.resolve(Swal.fire({
          title: "Join request declined",
          text: `${data.request?.roomName || "This chatroom"} did not accept your request.`,
          icon: "info",
          timer: 2500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        })).catch(() => {});
      } else if (status === "declined" && hasNewerPendingRequest) {
        return true;
      }
      return true;
    }

    if (data?.type === "temporary-room-deleted" && data?.roomUid) {
      removeTemporaryRoom(data.roomUid);
      window.setTimeout(() => {
        Promise.resolve(Swal.fire({
          title: "Chatroom deleted",
          text: `${data?.roomName || "This chatroom"} has been deleted.`,
          icon: "info",
          timer: 2500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        })).catch(() => {});
      }, 40);
      if (String(activeTempRoomIdRef.current || "") === String(data.roomUid || "")) {
        activeTempRoomIdRef.current = null;
        window.setTimeout(() => {
          history.push("/temporaryhome");
        }, 320);
      }
      return true;
    }

    if (data?.type === "temporary-room-removed" && data?.roomUid) {
      removeTemporaryRoom(data.roomUid);
      window.setTimeout(() => {
        Promise.resolve(Swal.fire({
          title: "Removed from chatroom",
          text: `You have been removed from ${data?.roomName || "this chatroom"}.`,
          icon: "info",
          timer: 2500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        })).catch(() => {});
      }, 40);
      if (String(activeTempRoomIdRef.current || "") === String(data.roomUid || "")) {
        activeTempRoomIdRef.current = null;
        window.setTimeout(() => {
          history.push("/temporaryhome");
        }, 320);
      }
      return true;
    }

    if (data?.type === "error" && String(data?.message || "").toLowerCase().includes("room")) {
      const activeRoomUid = String(activeTempRoomIdRef.current || "");
      const activeRequest = getTemporaryRequestsForRoom(activeRoomUid, "outgoing")[0];
      if (activeRequest) {
        removeTemporaryRequest(activeRequest.id);
      }
    }

    return false;
  }, [history]);

  // Handle messages received via WebSocket
  const handleMessage = async (data) => {
  
    try {
      if (await handleTemporarySocketPayload(data)) {
        return;
      }
      if (data?.type === "group-message-sent" && data?.message) {
        await ingestGroupMessage(data.message);
        return;
      }
      if (data?.type === "group-message") {
        await ingestGroupMessage(data);
        return;
      }
      if (data?.type === "group_messages_update" && data?.updateType === "delete") {
        await applyGroupDeleteUpdate(
          {
            groupId: data.groupId,
            messageIds: data.messageIds || [],
          },
          dbRef.current || null
        );
        return;
      }
      if (isPlatform('hybrid')) {
        console.log(JSON.stringify(dbRef.current))
        if (!dbRef.current) {
          await initSQLiteDB();
        }
        await handleSQLiteStorage(dbRef.current, data);
      } else {
   
        await handleWebStorage(data);
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  };

  const handleActiveGroupChange = useCallback((nextGroupId) => {
    activeGroupIdRef.current = nextGroupId ? String(nextGroupId) : null;
    globalThis.__ACTIVE_GROUP_ID = activeGroupIdRef.current;
  }, []);

  const handleActiveTemporaryRoomChange = useCallback((nextRoomUid) => {
    activeTempRoomIdRef.current = nextRoomUid ? String(nextRoomUid) : null;
    globalThis.__ACTIVE_TEMP_ROOM_ID = activeTempRoomIdRef.current;
  }, []);

  const connectTemporarySocket = useCallback(async (url) => {
    temporarySocketUrlRef.current = url;
    temporarySocketManualCloseRef.current = false;
    if (temporarySocket.current && temporarySocket.current.readyState === WebSocket.OPEN) {
      return temporarySocket.current;
    }
    if (temporarySocket.current && temporarySocket.current.readyState === WebSocket.CONNECTING) {
      return temporarySocket.current;
    }
    if (temporarySocketReconnectTimeoutRef.current) {
      clearTimeout(temporarySocketReconnectTimeoutRef.current);
      temporarySocketReconnectTimeoutRef.current = null;
    }

    temporarySocket.current = new WebSocket(url);

    temporarySocket.current.addEventListener("open", () => {
      console.log("Temporary WebSocket connected");
      temporarySocketReconnectAttemptRef.current = 0;
      if (temporarySocketHeartbeatRef.current) clearInterval(temporarySocketHeartbeatRef.current);
      temporarySocketHeartbeatRef.current = window.setInterval(() => {
        if (temporarySocket.current?.readyState === WebSocket.OPEN) {
          temporarySocket.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 20000);
    });

    temporarySocket.current.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data);
        const handled = await handleTemporarySocketPayload(data);
        if (!handled && data?.type === "error" && data?.message) {
          console.warn("Temporary socket error:", data.message);
        }
      } catch (error) {
        console.error("Invalid temporary socket payload", error);
      }
    });

    temporarySocket.current.addEventListener("error", (error) => {
      console.error("Temporary WebSocket error:", {
        error,
        readyState: temporarySocket.current?.readyState,
        url,
      });
    });

    temporarySocket.current.addEventListener("close", async (event) => {
      const reasonText = String(event.reason || "").toLowerCase();
      const isAuthLikeClose =
        event.code === 4001 ||
        event.code === 4401 ||
        reasonText.includes("token") ||
        reasonText.includes("expired");

      console.warn("Temporary WebSocket closed:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        readyState: temporarySocket.current?.readyState,
        url,
        reconnectAttempt: temporarySocketReconnectAttemptRef.current,
      });

      if (temporarySocketHeartbeatRef.current) {
        clearInterval(temporarySocketHeartbeatRef.current);
        temporarySocketHeartbeatRef.current = null;
      }
      temporarySocket.current = null;

      if (temporarySocketManualCloseRef.current || !isAcitve.current || !isTemporaryRuntime()) {
        return;
      }

      let reconnectUrl = temporarySocketUrlRef.current || url;
      if (isAuthLikeClose) {
        const refreshedToken = await refreshAccessToken(host);
        if (refreshedToken) {
          const deviceId = getDeviceIdSync() || await getDeviceId();
          reconnectUrl = `wss://${Maindata.SERVER_URL}?token=${refreshedToken}&deviceId=${encodeURIComponent(deviceId)}`;
          temporarySocketUrlRef.current = reconnectUrl;
          console.warn("Temporary WebSocket token refreshed after disconnect");
        }
      }

      temporarySocketReconnectAttemptRef.current += 1;
      const delayMs = Math.min(1000 * (2 ** Math.max(temporarySocketReconnectAttemptRef.current - 1, 0)), 10000);
      console.warn("Temporary WebSocket reconnect scheduled:", {
        delayMs,
        attempt: temporarySocketReconnectAttemptRef.current,
        reconnectUrl,
      });

      temporarySocketReconnectTimeoutRef.current = window.setTimeout(() => {
        connectTemporarySocket(reconnectUrl).catch((error) => {
          console.error("Temporary WebSocket reconnect failed:", error);
        });
      }, delayMs);
    });

    return temporarySocket.current;
  }, [handleTemporarySocketPayload, host]);

  // SQLite storage handling
  const handleSQLiteStorage = async (db, data) => {
    if (!db) {
      console.error('Database connection is not available.');
      return;
    }

    try {

      if(data.type === 'update'){
        if (data.updateType === 'delete') {
          console.log("Delete update received: ", data);
        
          const { messageIds } = data;
        
          // 1. Delete messages from SQLite
          const deleteQuery = `
            DELETE FROM messages
            WHERE id IN (${messageIds.map(() => '?').join(',')})
          `;
        
          db.executeSql(deleteQuery, messageIds, () => {
            //console.log("Messages deleted from SQLite");
        
            // 2. Delete messages from in-memory messagesRef.current
            messagesRef.current = messagesRef.current.filter((msg) =>
              !messageIds.includes(msg.id)
            );
        
            // 3. Update UI state to remove the deleted messages
            setMessages((prevMessages) =>
              prevMessages.filter((msg) => !messageIds.includes(msg.id))
            );
        
            setMessagestest((prevMessages) =>
              prevMessages.filter((msg) => !messageIds.includes(msg.id))
            );
        
            // Optionally: You can also update unread counts if necessary, but for delete, it's less common.
            // No need to do anything here since the messages are deleted.
          });
        }
        
        const normalizedUpdatePayload =
          data?.updatePayload && data.updatePayload.type === 'update'
            ? data.updatePayload
            : data;

        if (normalizedUpdatePayload.type === 'update' && normalizedUpdatePayload.updateType === 'status') {
          console.log("Status update received: ", data);
        
          const { messageIds = [], status = 'sent' } = normalizedUpdatePayload;
          if (!Array.isArray(messageIds) || messageIds.length === 0) return;
        
          // 1. Update SQLite directly
          const updateQuery = `
            UPDATE messages
            SET status = ?
            WHERE id IN (${messageIds.map(() => '?').join(',')})
          `;
        
          db.executeSql(updateQuery, [status, ...messageIds], () => {
            //console.log("Messages updated in SQLite");
        
            // 2. Update in-memory messages
            messagesRef.current = messagesRef.current.map((msg) =>
              messageIds.includes(msg.id) ? { ...msg, status } : msg
            );
        
            // 3. Update UI state
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                messageIds.includes(msg.id) ? { ...msg, status } : msg
              )
            );
        
            setMessagestest((prevMessages) =>
              prevMessages.map((msg) =>
                messageIds.includes(msg.id) ? { ...msg, status } : msg
              )
            );
        
            // 4. Optional: reset unread count for sender
         
          });
        }
        

        if (normalizedUpdatePayload.type === 'update' && normalizedUpdatePayload.updateType === 'unread') {
       
        
          const { messageIds = [] } = normalizedUpdatePayload;
          if (!Array.isArray(messageIds) || messageIds.length === 0) return;
          if(!db){
            await initSQLiteDB();
          }
        console.log("Unread update received: ", data);
          // 1. Update SQLite directly
          const updateQuery = `
            UPDATE messages
            SET read = 1
            WHERE id IN (${messageIds.map(() => '?').join(',')})
          `;
        
          db.executeSql(updateQuery, messageIds, () => {
            //console.log("Messages marked as read in SQLite");
        
            // 2. Update in-memory messages (messagesRef.current)
            messagesRef.current = messagesRef.current.map((msg) =>
              messageIds.includes(msg.id) ? { ...msg, read: 1 } : msg
            );
        
            // 3. Update UI state for messages
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                messageIds.includes(msg.id) ? { ...msg, read: 1 } : msg
              )
            );
        
            setMessagestest((prevMessages) =>
              prevMessages.map((msg) =>
                messageIds.includes(msg.id) ? { ...msg, read: 1 } : msg
              )
            );
          
            // 4. Optionally reset unread count for sender (if applicable)
         
          });

        }
        
    }

    if (data.type === 'initialMessages') {
      try {
console.log("Initial messages received:", data);
    const androidMessages = await Promise.all(
  data.messages.map(convertServerToAndroidMessage)
);

        // Retrieve saved messages from SQLite
    
const newMessages = androidMessages.filter(
          msg => !messagesRef.current.some(existingMsg => existingMsg.id === msg.id)
        );

        
        // 2. Save all processed messages into SQLite
        const privateKeyPem = globalThis.storage.getItem('privateKey'); // Must be stored locally
        const initialUsersMain = globalThis.storage.readJSON('usersMain', []) || [];
        for (const message of newMessages) {

          let decryptedContent = " new message " + message.file_type
          if(message.type !=='file'){
            console.log("Trying to decrypt message:", {
    encryptedAESKey: message.encryptedAESKey,
    eniv: message.eniv,
    encryptedMessage: message.encryptedMessage,
  });
 decryptedContent  = await decryptMessageHybrid(
  message.encryptedAESKey,
  message.eniv,
  message.encryptedMessage,
  privateKeyPem
  );
          }
          console.log("message",message)

          if (decryptedContent) {
            message.encryptedMessage = decryptedContent;
            message.content = decryptedContent;
          }

          if (decryptedContent) {
            try {
              await api.deleteMessage(host, message.id);
              console.log("? Deleted message on server after decrypt:", message.id);
            } catch (error) {
              console.error("Failed to delete message on server:", error?.message || error);
            }
          }

          await storeMessageInSQLite(db, message);

          const isSenderInInitialUsersMain = initialUsersMain.some(user => user.id === message.sender);
          if (!isSenderInInitialUsersMain) {
            try {
              const response = await api.fetchUser(host, message.sender);
              const data = await response.json();

              if (data.success) {
                const { userResponse } = data;

                const newUser = {
                  id: userResponse.id,
                  name: userResponse.name,
                  avatar: userResponse.profilePic || img,
                  lastMessage: message.content,
                  timestamp: message.timestamp,
                  phoneNumber: userResponse.phoneNumber,
                  unreadCount: 1,
                  About: userResponse.About,
                  updatedAt: userResponse.updatedAt,
                  DOB: userResponse.DOB,
                  Location: userResponse.Location,
                  gender: userResponse.gender,
                  publicKey: userResponse.publicKey
                };

                initialUsersMain.push(newUser);
                globalThis.storage.setItem('usersMain', JSON.stringify(initialUsersMain));
                setUsersMain(initialUsersMain);
                setUsersMaintest(initialUsersMain);
              }

            } catch (error) {
              console.error("Error fetching new user:", error);
            }
          }

        
            if (message.sender === selectedUser.current && isAcitve.current === true) {
              message.read = 1; // Mark as read for the selected user
            }
            else {
              message.read = 0; // Mark as unread for others
              if(isnotmute){
                if (message.sender && !mutedlist.includes(message.sender)) {
                  //console.log("new message received",message.sender)

                  if(message.type === 'file'){
                    message.content = "New file received"+ " " + message.file_type;
                  }
                  showCustomNotification(message); // Show notification for unread messages
              // Shw notification
          //    showCustomNotification(message);
            
            
          }
        }
            
          }
        }
        
        //     const newMessages = androidMessages.map(message => {
        //   if (message.sender === selectedUser.current) {
        //     return { ...message, read: 1 };
        //   } else {

        //     if(isnotmute){
        //     if (message.sender && !mutedlist.includes(message.sender)) {
        //       //console.log("new message received",message.sender)
        //       // Shw notification
        //   //    showCustomNotification(message);
            
            
        //   }
        // }
        //     return { ...message, read: 0 };
        //   }
        // });
        
    
        // Handle unread counts and user IDs
        const unreadCountsMap = new Map();
        const userIds = new Set();
        const latestMessageTimestampsMap = new Map();
    
        newMessages.forEach(msg => {
          if (msg.read === 0 && msg.recipient === currentuserRef.current._id) {
            if (!unreadCountsMap.has(msg.sender)) {
              unreadCountsMap.set(msg.sender, 0);
            }
            unreadCountsMap.set(msg.sender, unreadCountsMap.get(msg.sender) + 1);
          }
          userIds.add(msg.sender);
          userIds.add(msg.recipient);
          latestMessageTimestampsMap.set(msg.sender, new Date(msg.timestamp).getTime());
          latestMessageTimestampsMap.set(msg.recipient, new Date(msg.timestamp).getTime());
        });
    
        // Update the local state with the new messages
        setMessages(prevMessages => [...prevMessages, ...newMessages]);
        setMessagestest(prevMessages => [...prevMessages, ...newMessages]);
        messagesRef.current = [...messagesRef.current, ...newMessages];
    
        // Set user IDs, unread counts, and latest message timestamps
        // setInitialMessageUserIds(userIds);
    
        setLatestMessageTimestamps(latestMessageTimestampsMap);
    
        // Fetch usersMain array from localStorage
        const userMainArray = globalThis.storage.readJSON('usersMain', []) || [];
    
        // Add new users from the messages if they don't already exist
        for (let msg of newMessages) {
          const isSenderInUserMain = userMainArray.some(user => user.id === msg.sender);
    
          if (isSenderInUserMain) {
            // ? Case: Existing user � update last message, timestamp, unread count, reset partial
            const updatedUsers = userMainArray.map(user => {
              if (user.id === msg.sender) {
                 const isSelected = selectedUser.current === msg.sender;

                // Compare the new message's timestamp with the stored timestamp
                const existingTimestamp = new Date(user.timestamp || 0);
                const incomingTimestamp = new Date(msg.timestamp);
            
                // If the incoming message is newer, update lastMessage and timestamp
                if (incomingTimestamp > existingTimestamp) {

                  return {
                    ...user,
                    lastMessage: msg.content,
                    timestamp: msg.timestamp,
                    unreadCount: isSelected ? 0 : msg.read === 0 ? (user.unreadCount || 0) + 1 : 0,
                    isPartialDelete: false, // Keep `isPartialDelete` as false
                  };
                }
              }
              return user; // Keep the rest of the users unchanged
            });
      
            globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
            setUsersMain(updatedUsers);
            setUsersMaintest(updatedUsers);
          }
        }
    
      } catch (error) {
        console.error("Error handling initial messages:", error);
      }
    }
     else if (data.type === 'message') {
   console.log("recive mesage",JSON.stringify(data,null,2))
        const { id, sender, recipient, timestamp, status, read } = data;
        let updatedReadStatus = read;
 
        // Retrieve the users in localStorage
        const userMainArray =  globalThis.storage.readJSON('usersMain', []) || [];
        const isSenderInUserMain = userMainArray.some(user => user.id === sender);
   

                  const privateKeyPem = globalThis.storage.getItem('privateKey');
              const decryptedContent =  await decryptMessageHybrid(
  data.encryptedAESKey,
  data.eniv,
  data.encryptedMessage,
  privateKeyPem
);
console.log("decrypted content",decryptedContent)

        if (decryptedContent) {
          try {
            await api.deleteMessage(host, id);
            console.log("? Deleted message on server after decrypt:", id);
          } catch (error) {
            console.error("Failed to delete message on server:", error?.message || error);
          }
        }



        if (!isSenderInUserMain) {
          try {
            // Fetch the user details from the server
            const response = await api.fetchUser(host, sender);
            const data = await response.json();
            
            if (data.success) {
              const { userResponse } = data;
    
              const newUser = {
                id: userResponse.id,
                name: userResponse.name,
                avatar: userResponse.profilePic || img,
                lastMessage: decryptedContent,
                timestamp: timestamp,
                phoneNumber: userResponse.phoneNumber,
                unreadCount: 0, // This message is unread for the new user
                lastUpdated: userResponse.lastUpdated,
                About: userResponse.About,
                updatedAt:userResponse.updatedAt,
                DOB:userResponse.DOB,
                Location:userResponse.Location,
                gender:userResponse.gender,
                publicKey:userResponse.publicKey
              };
              
              // Add the new user to the usersMain array and remove duplicates
              const updatedUsers = [...userMainArray, newUser]
                .filter((user, index, self) => index === self.findIndex((u) => u.id === user.id)); // Ensure no duplicates

              // Update localStorage and state
              globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
                globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
              setUsersMain(updatedUsers);
              setUsersMaintest(updatedUsers);
            }
          } catch (error) {
            console.error("Error in fetching new user:", error);
          }
        }
        
        // Handle read status based on whether the sender is the selected user
        if (sender === selectedUser.current &&  isAcitve.current === true) {
          console.log("lets try")
          updatedReadStatus = 1;
          
            const updatePayload = buildUnreadUpdate({
              messageIds: id,
              sender,
              recipient
            });

          
          
          socket.current.send(JSON.stringify({ updatePayload }));
        } else {
        
         if(isnotmute){
            const mutedlistog = globalThis.storage.readJSON('mutedUsers', []) 

            if (sender && !mutedlistog.includes(sender)) {
              //console.log("new message received",sender)
              let message 
              if(data.type === 'file'){
  message = {
                sender: sender,
                content: "new file received" + " " + data.file_type,
                timestamp: timestamp,
              }
              }else{
               message = {
                sender: sender,
                content: decryptedContent,
                timestamp: timestamp,
              }
            }
              showCustomNotification(message);
              // Shw notification
            
            }
          }
          updatedReadStatus = 0;
        }
      
        // Create the new message object
        const newMessage = {
          id,
          type: data.type || 'message',
          sender,
          recipient,
          read: updatedReadStatus,
          content: decryptedContent || null,
          timestamp: timestamp || null,
          status: status || 'pending',
          isDeleted: data.isDeleted || 0,
          isDownload: data.isDownload || 0,
          file_name: data.file_name || null,
          file_type: data.file_type || null,
          file_size: data.file_size || null,
          thumbnail: data.thumbnail || null,
          file_path: data.file_path || null,
          encryptedMessage: decryptedContent || null,
          encryptedAESKey: data.encryptedAESKey || null,
          eniv: data.eniv || null,
          isReplyTo: data.isReplyTo || data.is_reply_to || null
        };

  
        const afterusermainarray = globalThis.storage.readJSON('usersMain', []) || [];

const updatedUsers = afterusermainarray.map(user => {
  if (user.id === sender) {
    let updatedUnreadCount = 0;

    // Only increment unread if user is NOT the currently selected one
    if (updatedReadStatus === 0 && sender !== selectedUser.current) {
      updatedUnreadCount = (user.unreadCount || 0) + 1;
    }else{
      updatedUnreadCount = 0;
    }

    return {
      ...user,
      lastMessage: decryptedContent,
      timestamp: timestamp,
      unreadCount: updatedUnreadCount,
      isPartialDelete: false,
    };
  }
  return { ...user };
});

        // Update localStorage and state with the updated user list
        // Before updating localStorage
// //console.log('Before updating localStorage:', globalThis.storage.getItem('usersMain'));

// After updating localStorage
 globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
//console.log('After updating localStorage:', globalThis.storage.getItem('usersMain'));


        setUsersMain(updatedUsers);
        setUsersMaintest(updatedUsers);
      
        // Update the messages in state and localStorage
        setMessages(prevMessages => [...prevMessages, newMessage]);
        setMessagestest(prevMessages => [...prevMessages, newMessage]);
        messagesRef.current = [...messagesRef.current, newMessage];
        
        // Save the message to SQLite
        //console.log("new message",JSON.stringify(newMessage))
        await storeMessageInSQLite(db, newMessage);
        
        // Update the latest message timestamps
        const latestMessageTimestampMap = new Map(latestMessageTimestamps);
        latestMessageTimestampMap.set(sender, new Date(timestamp).getTime());
        latestMessageTimestampMap.set(recipient, new Date(timestamp).getTime());
        setLatestMessageTimestamps(latestMessageTimestampMap);
        
        // You can also update the unread counts here if needed
      }
      
      if(data.type ==='file'){

        const {   sender,
          recipient,
      file_type,
          id,
          status,timestamp } = data;

const userMainArray =  globalThis.storage.readJSON('usersMain', []) ||[];
        const isSenderInUserMain = userMainArray.some(user => user.id === sender);
      console.log("data to come",data)
        if (!isSenderInUserMain) {
          try {
            //console.log("we runnig not presnet user ")
            const response = await api.fetchUser(host, sender);
            
            const data = await response.json();
            if (data.success) {
              const { userResponse } = data;
      
              const newUser = {
                id: userResponse.id,
                name: userResponse.name,
                avatar: userResponse.profilePic || img,
                lastMessage: `A new ${file_type} come`,
                timestamp: timestamp,
                phoneNumber: userResponse.phoneNumber,
                unreadCount: 1, // This message is unread for the new user
                lastUpdated: userResponse.lastUpdated,
                About:userResponse.About, 
                publicKey:userResponse.publicKey,
                gender:userResponse.gender,
                DOB:userResponse.DOB,
                Location:userResponse.Location,
                updatedAt:userResponse.updatedAt

              };
      
              //console.log("New user:", newUser);
      
              // Add new user and ensure no duplicates
              const updatedUsers = [
                ...userMainArray,
                newUser
              ].filter((user, index, self) => index === self.findIndex((u) => u.id === user.id));
      //console.log("updatedUsers",updatedUsers)
              // Update localStorage and state with updated users
              //console.log("before udpate",globalThis.storage.readJSON('', null))
              globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
              //console.log("after udpate",globalThis.storage.readJSON('', null))
              setUsersMain(updatedUsers);
              setUsersMaintest(updatedUsers);
            }

   
          } catch (error) {
            console.error("Error in fetching new user:", error);
          }
        }
           var read = null;
          if(sender === selectedUser.current){
            read = 1
              const updatePayload = {
                ...buildUnreadUpdate({ messageIds: id, sender, recipient }),
                fileType: 'file'
              };

          try {
              socket.current.send(JSON.stringify({ updatePayload }));
           
            } catch (err) {
              console.error("WebSocket send failed", err);
            }
          } else {
            if (isnotmute) {
               const mutedlistog = globalThis.storage.readJSON('mutedUsers', []) 

              if (sender && !mutedlistog.includes(sender)) {
                //console.log("new message received", sender);
                // Show notification
                const message = {
                  sender: sender,
                  content: 'new file received' + " " + file_type,
                  timestamp: timestamp,
                }
               showCustomNotification(message);
              }
            }
            read = 0;
          }
          const newMessage = {
            id,
            type: data.type || 'file',
            sender,
            recipient,
            read,
            content: `a new ${data.file_type} just come`,
            timestamp: timestamp || null,
            status: status, // Initial status
            isDeleted: data.isDeleted || 0,
            isDownload: data.isDownload || 0, // Binary data of the file
            file_name: data.file_name || null,
            file_type: data.file_type || null,
            file_size: data.file_size || null,
            file_path: data.file_path || null,
            thumbnail: data.thumbnail || null, // Generate or add thumbnail later, if needed// Add actual path later (e.g., via WebSocket)
            encryptedMessage: data.encryptedMessage || null,
            encryptedAESKey: data.encryptedAESKey || null,
            eniv: data.eniv || null,
            isReplyTo: data.isReplyTo || data.is_reply_to || null,
            isError: 0,
           
          };


      
            const afterusermainarray = globalThis.storage.readJSON('usersMain', []) || [];

const updatedUsers = afterusermainarray.map(user => {
  if (user.id === sender) {
    let updatedUnreadCount = 0;


    // Only increment unread if user is NOT the currently selected one
    if (read === 0 && sender !== selectedUser.current) {
      updatedUnreadCount = (user.unreadCount || 0) + 1;
    }else{
      updatedUnreadCount = 0;
    }

    return {
      ...user,
      lastMessage: `A new ${data.file_type} jist come`,
      timestamp: timestamp,
      unreadCount: updatedUnreadCount,
      isPartialDelete: false,
    };
  }
  return { ...user };
});


        // Update localStorage and state with the updated user list
        // Before updating localStorage
// //console.log('Before updating localStorage:', globalThis.storage.getItem('usersMain'));

// After updating localStorage
 globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
 
        setUsersMain(updatedUsers);
        setUsersMaintest(updatedUsers);
 //Check if the new message already exists by ID
       
           setMessages(prevMessages => [...prevMessages, newMessage]);
        setMessagestest(prevMessages => [...prevMessages, newMessage]);
          messagesRef.current = [...messagesRef.current, newMessage]; // Add new message if not duplicate
      
  try{

    
            await storeMessageInSQLite(db, newMessage);
  }catch(error){
    console.error("Error storing file message in SQLite:", error);
  }

      }
    } catch (error) {
      console.error('Error in SQLite message handling:', error);
    }
  };
function convertServerToAndroidMessage(serverMsg) {
  return new Promise((resolve) => {
    const message = {
      id: serverMsg.id,
      sender: serverMsg.sender,
      recipient: serverMsg.recipient,
      content: serverMsg.content || "",
    
      timestamp: serverMsg.timestamp,
      status: serverMsg.status || 'sent',
      read: serverMsg.read ? 1 : 0,
    
      isDeleted: serverMsg.isDeleted ? 1 : 0,
      isDownload: serverMsg.isDownload || 0,
    
      type: serverMsg.type || 'text',
      file_name: serverMsg.fileName || '',
      file_type: serverMsg.fileType || '',
      file_size: serverMsg.fileSize || 0,
    
      file_path: serverMsg.file_path || '',
      isSent: serverMsg.isSent ? 1 : 0,
      isError: serverMsg.isError ? 1 : 0,
      encryptedMessage: serverMsg.encryptedMessage || '',
      encryptedAESKey: serverMsg.encryptedAESKey || '',
      eniv: serverMsg.eniv || '',
      isReplyTo: serverMsg.isReplyTo || serverMsg.is_reply_to || null,
      thumbnail: ''
    };

if (serverMsg.thumbnail instanceof Blob) {
  const reader = new FileReader();
  reader.onloadend = () => {
    message.thumbnail = reader.result;
    resolve(message);
  };
  reader.readAsDataURL(serverMsg.thumbnail);
} else if (
  typeof serverMsg.thumbnail === 'object' &&
  serverMsg.thumbnail?.type === 'Buffer' &&
  Array.isArray(serverMsg.thumbnail?.data)
) {
  // Correct fix: this is already a base64 data URI encoded as byte array
  const byteArray = new Uint8Array(serverMsg.thumbnail.data);
  const decodedStr = new TextDecoder().decode(byteArray);
  message.thumbnail = decodedStr;
  resolve(message);
} else {
  message.thumbnail = serverMsg.thumbnail || '';
  resolve(message);
}


  });
}

  
  // WebStorage handling
  const handleWebStorage = async (event) => {
    

    try {
    
      const data = event;
      //console.log("data from webstorage",data.type)
    

if (data.type === "update" && data.updateType === "delete") {
  const { messageIds } = data;

  //console.log("Delete update received: ", messageIds);

  // Fetch messages from localStorage
  const storedMessages = globalThis.storage.readJSON("messages", []);

  // Filter out the messages that need to be deleted
  const updatedMessages = storedMessages.filter((message) =>
    !messageIds.includes(message.id)
  );

  // Update messagesRef by filtering out deleted messages
  messagesRef.current = messagesRef.current.filter((msg) =>
    !messageIds.includes(msg.id)
  );

  // Save the updated messages to localStorage (without the deleted ones)
  //saveMessagesToLocalStorage(updatedMessages, "from delete update");
globalThis.storage.setItem("messages", JSON.stringify(updatedMessages));
  // Update React states to remove the deleted messages
  setMessages((prevMessages) =>
    prevMessages.filter((msg) => !messageIds.includes(msg.id))
  );

  setMessagestest((prevMessages) =>
    prevMessages.filter((msg) => !messageIds.includes(msg.id))
  );

  //console.log("Messages deleted: ", messageIds);
}

const normalizedUpdatePayload =
  data?.updatePayload && data.updatePayload.type === "update"
    ? data.updatePayload
    : data;

if (normalizedUpdatePayload.type === "update" && normalizedUpdatePayload.updateType === "status") {
  const { messageIds = [] } = normalizedUpdatePayload;
  const status = normalizedUpdatePayload.status || 'sent'; // Default to 'sent' if status is not provided  
  if (!Array.isArray(messageIds) || messageIds.length === 0) return;

  //console.log("Status update received: ", messageIds, "New Status:", status);

  // Fetch messages from localStorage
  const storedMessages = globalThis.storage.readJSON("messages", []);

  const updatedMessages = storedMessages.map((message) =>
    messageIds.includes(message.id) ? { ...message, status } : message
  );

  // Update messagesRef
  messagesRef.current = messagesRef.current.map((msg) =>
    messageIds.includes(msg.id) ? { ...msg, status } : msg
  );

  // Save to localStorage
 // saveMessagesToLocalStorage(updatedMessages, "from status update");
   globalThis.storage.setItem("messages", JSON.stringify(updatedMessages));

  // Update React states
  setMessages((prevMessages) =>
    prevMessages.map((msg) =>
      messageIds.includes(msg.id) ? { ...msg, status } : msg
    )
  );

  setMessagestest((prevMessages) =>
    prevMessages.map((msg) =>
      messageIds.includes(msg.id) ? { ...msg, status } : msg
    )
  );



  //console.log("Messages updated with new status: ", updatedStatusMessages);
}

      if (normalizedUpdatePayload.type === "update" && normalizedUpdatePayload.updateType === "unread") {
     

        const { messageIds = [] } = normalizedUpdatePayload;
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;
        //console.log("Update message unread received: ", messageIds);
        // Fetch and update messages in localStorage
        const storedMessages = globalThis.storage.readJSON("messages", []);
        const updatedMessages = storedMessages.map((message) =>
          messageIds.includes(message.id) ? { ...message, read: 1 } : message
        );
      
        //console.log("Messages to be updated before: ", messagesToUpdate);
        // Update localStorage and state
        globalThis.storage.setItem("messages", JSON.stringify(updatedMessages));
       // saveMessagesToLocalStorage(updatedMessages,"from handlewebstorage");
        
      // globalThis.storage.setItem("messages", JSON.stringify(updatedMessages));
     
     
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            messageIds.includes(msg.id) ? { ...msg, read: 1 } : msg
          )
        );
        setMessagestest((prevMessages) => 
          prevMessages.map((msg) => 
            messageIds.includes(msg.id) ? { ...msg, read: 1 } : msg
          )
        );
        messagesRef.current = messagesRef.current.map((msg) =>
          messageIds.includes(msg.id) ? { ...msg, read: 1 } : msg
        );

        //console.log("Messages to be updated after: ", updatedMessagesInRef);

  
        // Optionally update unread counts
    
      }
  

      if (data.type === 'initialMessages') {
        const isSameUserId = (user, incomingId) =>
          user?.id === incomingId || user?._id === incomingId;
        const { messages: initialMessages } = data;
        if (!Array.isArray(initialMessages) || initialMessages.length === 0) return;

        const androidMessages = await Promise.all(
          initialMessages.map(convertServerToAndroidMessage)
        );

        //console.log("Initial messages received: ", androidMessages);
        const storedMessages = globalThis.storage.readJSON('messages', []);
        let savedMessages = Array.isArray(storedMessages) ? storedMessages : [];
        const privatekey = globalThis.storage.getItem('privateKey');
        // Filter out any messages already saved to avoid duplicates
        const filteredMessages = savedMessages.filter((msg) => {
          const msgId = msg?.id || msg?.messageId;
          return !(typeof msgId === 'string' && msgId.startsWith('temp-'));
        });
        const processedMessages = [];
        for (const message of androidMessages) {
          const normalizedId = message?.id || message?.messageId;
          if (!normalizedId) continue;
          message.id = normalizedId;

          let decryptedMessage = message.content || message.encryptedMessage || (`new message ${message.file_type || ''}`);
          const hasEncryptedPayload =
            message.type !== 'file' &&
            privatekey &&
            message.encryptedAESKey &&
            message.eniv &&
            message.encryptedMessage;

          if (hasEncryptedPayload) {
            try {
              decryptedMessage = await decryptMessageHybrid(
                message.encryptedAESKey,
                message.eniv,
                message.encryptedMessage,
                privatekey
              );

              await api.deleteMessage(host, message.id);
              console.log("? Deleted message on server after decrypt:", message.id);
            } catch (error) {
              console.error("Failed to decrypt/delete initial message:", message?.id, error?.message || error);
            }
          }

          message.encryptedMessage = decryptedMessage;
          message.content = decryptedMessage;

          if (message.sender === selectedUser.current) {
            processedMessages.push({ ...message, read: 1 });
          } else {
            // Show notification for messages not from the selected user
            if (isnotmute) {
              const mutedlistog = globalThis.storage.readJSON('mutedUsers', []);
              if (message.sender && !mutedlistog.includes(message.sender)) {
                //console.log("new message received",message.sender)
                // Shw notification
              }
            }
            processedMessages.push({ ...message, read: 0 });
          }
        }
        
        // Filter only new messages not already saved
        const newMessages = processedMessages.filter(message =>
          !filteredMessages.some(savedMsg => (savedMsg?.id || savedMsg?.messageId) === message.id)
        );
        
        // Append new messages to the existing saved messages
        savedMessages.push(...newMessages);
     
        
        // Append new messages to the existing saved messages
      
        
        // Save the updated messages back to localStorage
        globalThis.storage.setItem('messages', JSON.stringify(savedMessages));
        
        // ? Add this console to check if the messages were saved
        //console.log(`Messages after saving (${newMessages.length} new):`, savedMessages);
        // Update local state for messages
        setMessages(prevMessages => [...prevMessages, ...newMessages]);
        setMessagestest(prevMessages => [...prevMessages, ...newMessages]);
        messagesRef.current = [...messagesRef.current, ...newMessages];

        const unreadCountsMap = new Map();
        const userIds = new Set();
        const latestMessageTimestampsMap = new Map();
      
        // Iterate through each message in newMessages to update user data and unread count
        for (let msg of newMessages) {
          if (msg.read === 0 && msg.recipient === currentuserRef.current._id) {
            unreadCountsMap.set(msg.sender, (unreadCountsMap.get(msg.sender) || 0) + 1);
          }
          userIds.add(msg.sender);
          userIds.add(msg.recipient);
          latestMessageTimestampsMap.set(msg.sender, new Date(msg.timestamp).getTime());
          latestMessageTimestampsMap.set(msg.recipient, new Date(msg.timestamp).getTime());
        }
      
        // Set the user IDs for initial messages and the latest message timestamps
       // setInitialMessageUserIds(userIds);
        setLatestMessageTimestamps(latestMessageTimestampsMap);
      
        const unreadCounts = Object.fromEntries(unreadCountsMap);
        globalThis.storage.setItem('unreadCounts', JSON.stringify(unreadCounts));
     
        // Now handle the addition of new users for each initial message sender if they aren't in userMain
        const userMainArray = globalThis.storage.readJSON('usersMain', []) || [];
        
        for (let msg of newMessages) {
          const isSenderInUserMain = userMainArray.some(user => isSameUserId(user, msg.sender));
      
          if (!isSenderInUserMain) {
       
      
            try {
              const response = await api.fetchUser(host, msg.sender);
      
              const data = await response.json();
      
              if (data.success) {
                const { userResponse } = data;
      
                const newUser = {
                  id: userResponse.id,
                  name: userResponse.name,
                  avatar: userResponse.profilePic || img,  // Assuming profilePic contains the image URL
                  lastMessage: msg.content,
                  timestamp: msg.timestamp,
                  phoneNumber: userResponse.phoneNumber,
                  unreadCount: 1, // This message is unread for the new user
                  About:userResponse.About,
                  publicKey:userResponse.publicKey,
                  gender:userResponse.gender,
                  DOB:userResponse.DOB,
                  Location:userResponse.Location,
                  updatedAt:userResponse.updatedAt
                };
         
      
                // Add the new user to `usersMain` and remove duplicates using `filter`
                const updatedUsers = [...userMainArray, newUser].filter((user, index, self) =>
                  index === self.findIndex((u) => u.id === user.id)
                );
            
                // Update the usersMain in localStorage and state
                globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
                setUsersMain(updatedUsers);
                setUsersMaintest(updatedUsers);  // Assuming Zustand or another state management library
               //console.log("zustand list",usersMaintest)
              }
      
            } catch (error) {
              console.error("Error in fetching new user:", error);
            }
          } else {
            // ? Case: Existing user � update last message, timestamp, unread count, reset partial
            const updatedUsers = userMainArray.map(user => {
              if (user.id === msg.sender) {
                // Compare the new message's timestamp with the stored timestamp
                const existingTimestamp = new Date(user.timestamp || 0);
                const incomingTimestamp = new Date(msg.timestamp);
            
                // If the incoming message is newer, update lastMessage and timestamp
                if (incomingTimestamp > existingTimestamp) {
                  return {
                    ...user,
                    lastMessage: msg.content,
                    timestamp: msg.timestamp,
                    unreadCount: msg.read === 0 ? (user.unreadCount || 0) + 1 : 0, // Increment unread count if unread
                    isPartialDelete: false, // Keep `isPartialDelete` as false
                  };
                }
              }
              return user; // Keep the rest of the users unchanged
            });
            globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
            setUsersMain(updatedUsers);
            setUsersMaintest(updatedUsers);
          }
        }
      }
      else if (data.type === 'message') {
        const isSameUserId = (user, incomingId) =>
          user?.id === incomingId || user?._id === incomingId;
        const { id, content, sender, recipient, timestamp, status, read } = data;
     //   const storedUnreadCounts = globalThis.storage.readJSON('', null) || {};
        let updatedReadStatus = read;
      
        // Retrieve current userMain from localStorage
        const usersFromStorage = globalThis.storage.readJSON('usersMain', []) || [];
        const userMainArray = Array.isArray(usersMain) && usersMain.length > 0 ? usersMain : usersFromStorage;
        const isSenderInUserMain = userMainArray.some(user => isSameUserId(user, sender));
        const privateKey = globalThis.storage.getItem('privateKey');
          const decryptedMessage = await decryptMessageHybrid(
  data.encryptedAESKey,
  data.eniv,
  data.encryptedMessage,
  privateKey
);
console.log("decrypt",decryptedMessage)
    if (decryptedMessage) {
          try {
            await api.deleteMessage(host, id);
            console.log("? Deleted message on server after decrypt:", id);
          } catch (error) {
            console.error("Failed to delete message on server:", error?.message || error);
          }
        }
                     
        if (!isSenderInUserMain) {
          try {
            //console.log("we runnig not presnet user ")
            const response = await api.fetchUser(host, sender);
            
            const data = await response.json();
            if (data.success) {
              const { userResponse } = data;
      
              const newUser = {
                id: userResponse.id,
                name: userResponse.name,
                avatar: userResponse.profilePic || img,
                lastMessage: decryptedMessage,
                timestamp: timestamp,
                phoneNumber: userResponse.phoneNumber,
                unreadCount: 0, // Keep parity with SQLite message handler
                lastUpdated: userResponse.lastUpdated,
                About:userResponse.About, 
                publicKey:userResponse.publicKey,
                gender:userResponse.gender,
                DOB:userResponse.DOB,
                Location:userResponse.Location,
                updatedAt:userResponse.updatedAt

              };
      
              //console.log("New user:", newUser);
      
              // Add new user and ensure no duplicates
              const updatedUsers = [
                ...userMainArray,
                newUser
              ].filter((user, index, self) => index === self.findIndex((u) => u.id === user.id));
      //console.log("updatedUsers",updatedUsers)
              // Update localStorage and state with updated users
              //console.log("before udpate",globalThis.storage.readJSON('', null))
              globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
              //console.log("after udpate",globalThis.storage.readJSON('', null))
              setUsersMain(updatedUsers);
              setUsersMaintest(updatedUsers);
            }

   
          } catch (error) {
            console.error("Error in fetching new user:", error);
          }
        }
      //console.log("selected user",selectedUser.current)
        // Handle the read status based on whether the sender is the selected user
        if (sender === selectedUser.current && isAcitve.current === true) {
          
          updatedReadStatus = 1;
      
            const updatePayload = buildUnreadUpdate({ messageIds: id, sender, recipient });
          console.log("updatePayload",updatePayload)
          //console.log("socket",socket.current)
      
          socket.current.send(JSON.stringify({ updatePayload }));
        } else {
          //console.log("muted list",mutedlist)
       if(isnotmute){
    const mutedlistog = globalThis.storage.readJSON('mutedUsers', []) 

            if (sender && !mutedlistog.includes(sender)) {
              const message = {

                sender,
                content: decryptedMessage,
                timestamp,
              
              }

              //console.log("message",message)
              showCustomNotification(message)
              // Show notification
            }
          }
            
         
          updatedReadStatus = 0;
        }
      
        const newMessage = {
          id,
          type: data.type || 'message',
          sender,
          recipient,
          read: updatedReadStatus,
          content: decryptedMessage || null,
          timestamp: timestamp || null,
          status: status || 'pending',
          isDeleted: data.isDeleted || 0,
          isDownload: data.isDownload || 0, // Binary data of the file
          file_name: data.file_name || null,
          file_type: data.file_type || null,
          file_size: data.file_size || null,
          thumbnail: data.thumbnail || null, // Add actual path later (e.g., via WebSocket)
          file_path: data.file_path || null,
          encryptedMessage: decryptedMessage || null,
          encryptedAESKey: data.encryptedAESKey || null,
          eniv: data.eniv || null,
          isReplyTo: data.isReplyTo || data.is_reply_to || null
        };
      
        const afterusermainarray = globalThis.storage.readJSON('usersMain', []) || [];
        // Update userMain with new message data
//console.log("unread",updatedReadStatus)
        const updatedUsers = afterusermainarray.map(user => {
          if (user.id === sender) {
          

    let updatedUnreadCount = 0;
    if (updatedReadStatus === 0 && sender !== selectedUser.current) {
      updatedUnreadCount = (user.unreadCount || 0) + 1;
    } else {
      updatedUnreadCount = 0;
    }

    //console.log("Updated Unread Count:", updatedUnreadCount);

            return {
              ...user,
              lastMessage: decryptedMessage,
              timestamp: timestamp,
              unreadCount: updatedUnreadCount,
              isPartialDelete: false,

            };
          }
          return { ...user }; // clone untouched users
        });
      
        //console.log("selected user",selectedUser.current)
      //console.log("updatedUsers",updatedUsers)
        // Update localStorage and state with the updated user list
        // Before updating localStorage

globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
//console.log('After updating localStorage:', globalThis.storage.getItem('usersMain'));


// After updating localStorage



        setUsersMain(updatedUsers);
        setUsersMaintest(updatedUsers);
        
      
        // Update the messages array in localStorage
        const updatedMessages = [
          ...globalThis.storage.readJSON('messages', []),
          newMessage
        ];
      
        // Update messages in state and localStorage
        setMessages(prevMessages => [...prevMessages, newMessage]);
        setMessagestest(prevMessages => [...prevMessages, newMessage]);
        messagesRef.current = [...messagesRef.current, newMessage];
     

        globalThis.storage.setItem('messages', JSON.stringify(updatedMessages));
      //  saveMessagesToLocalStorage(updatedMessages, "from handleWebStorage single");
      }
      

      if (data.type === 'file') {
        const isSameUserId = (user, incomingId) =>
          user?.id === incomingId || user?._id === incomingId;
        try {
          // Destructure data
          const { sender, recipient, id, file_name, file_type, thumbnail, status, timestamp,content } = data;
          //console.log("data", data);
           const usersFromStorage = globalThis.storage.readJSON('usersMain', []) || [];
        const userMainArray = Array.isArray(usersMain) && usersMain.length > 0 ? usersMain : usersFromStorage;
        const isSenderInUserMain = userMainArray.some(user => isSameUserId(user, sender));
      
        if (!isSenderInUserMain) {
          try {
            //console.log("we runnig not presnet user ")
            const response = await api.fetchUser(host, sender);
            
            const data = await response.json();
            if (data.success) {
              const { userResponse } = data;
      
              const newUser = {
                id: userResponse.id,
                name: userResponse.name,
                avatar: userResponse.profilePic || img,
                lastMessage: `A new ${file_type} come`,
                timestamp: timestamp,
                phoneNumber: userResponse.phoneNumber,
                unreadCount: 1, // This message is unread for the new user
                lastUpdated: userResponse.lastUpdated,
                About:userResponse.About, 
                publicKey:userResponse.publicKey,
                gender:userResponse.gender,
                DOB:userResponse.DOB,
                Location:userResponse.Location,
                updatedAt:userResponse.updatedAt

              };
      
              //console.log("New user:", newUser);
      
              // Add new user and ensure no duplicates
              const updatedUsers = [
                ...userMainArray,
                newUser
              ].filter((user, index, self) => index === self.findIndex((u) => u.id === user.id));
      //console.log("updatedUsers",updatedUsers)
              // Update localStorage and state with updated users
              //console.log("before udpate",globalThis.storage.readJSON('', null))
              globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
              //console.log("after udpate",globalThis.storage.readJSON('', null))
              setUsersMain(updatedUsers);
              setUsersMaintest(updatedUsers);
            }

   
          } catch (error) {
            console.error("Error in fetching new user:", error);
          }
        }
          var read = 0;
      
          // Check if sender is the selected user
          if (sender === selectedUser.current) {
            read = 1;
      
            // Prepare update payload
            const updatePayload = {
              type: 'update',
              updateType: 'unread',
              fileType: 'file',
              messageIds: [id],
              sender: sender,
              recipient: recipient,
            };
      
            //console.log("updatePayload for file", updatePayload);
      
            // Send update to WebSocket
            try {
              socket.current.send(JSON.stringify({ updatePayload }));
              //console.log("WebSocket send success");
            } catch (err) {
              console.error("WebSocket send failed", err);
            }
          } else {
            if (isnotmute) {
                  const mutedlistog = globalThis.storage.readJSON('mutedUsers', []) 

              if (sender && !mutedlistog.includes(sender)) {
                //console.log("new message received", sender);
                // Show notification
                const message = {
                  sender,
                  content:'file may be',
                  timestamp
                }

                showCustomNotification(message)
                
              }
            }
            read = 0;
          }
      
          // Prepare new message object
          const newMessage = {
            id,
            type: 'file',
            sender,
            recipient,
            file_path: data.file_path || null,
            read: read,
            content: content || null,
            timestamp: timestamp || null,
            status: status || 'pending', // Default to 'pending' status if not provided
            isDeleted: data.isDeleted || 0,
            isDownload: data.isDownload || 0,
            file_name: file_name || null,
            file_type: file_type || null,
            file_size: data.file_size || null,
            thumbnail: thumbnail || null,
            encryptedMessage: data.encryptedMessage || null,
            encryptedAESKey: data.encryptedAESKey || null,
            eniv:data.eniv || null,
            isReplyTo: data.isReplyTo || data.is_reply_to || null
          };
      
          // Get current messages from localStorage and update
          const updatedMessages = [
            ...globalThis.storage.readJSON('messages', []),
            newMessage
          ];
      
          //console.log("newMessage to add:", newMessage);
      
          // Update messagesRef
          setMessages(prevMessages => [...prevMessages, newMessage]);
          setMessagestest(prevMessages => [...prevMessages, newMessage]);
          messagesRef.current = [...messagesRef.current, newMessage];
      
          // Save updated messages to localStorage
          globalThis.storage.setItem('messages', JSON.stringify(updatedMessages));
      
        } catch (error) {
          console.error("Error handling file message:", error);
        }
      }
      
    } catch (error) {
      console.error('Error in WebStorage message handling:', error);
    }
  };


  const sendMessage = (message) => {
    //console.log(socket.current)
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      try {
        socket.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.error('WebSocket is not connected');
    }
  };



const reconnect = (url) => {
      //console.log('Attempting to reconnect...');
      if(connected && serverreconnected.current && currentuserRef.current && hasWsTokenParam(url) && !suppressWsStatusSwalRef.current){
  Swal.fire({
    title: 'Server Offline',
    text: 'Waiting for Server response ...',
  icon: 'warning',
  confirmButtonText: 'OK',
  width: 300,
  padding: '1.2rem',
  backdrop: 'rgba(0,0,0,0.4)',
  borderRadius:'10px',
  customClass: {
    popup: 'mobile-alert'
  }
});
serverreconnected.current = false
    }

      scheduleReconnect(connect, url, 5000);
    };

const getmessages = async()=>{
  try {
const currentuserRef = globalThis.storage.readJSON('currentuser', null)
var db = null

    if(isPlatform('hybrid')){
   if(!dbRef.current){
    const dbName = `Conversa_chats_store.db`;
          db = window.sqlitePlugin.openDatabase({ name: dbName, location: 'default' });
   }else{
    db = dbRef.current
   }

   //console.log("db",db)

      const allmessage = await fetchAllMessages(db);
       const deadmessage= await loadMessagesFromPreferencesToSQLite(db); // Load messages from Preferences to SQLite
console.log("all message from db",allmessage)
      console.log("all message from deadmessage",deadmessage)
//console.log("current usee from ger message",currentuserRef._id)
      const initialMessages = await getMessagesFromSQLite(db, currentuserRef._id, 45);
      //console.log("initial messages from db",initialMessages)
   const combinedMessages = [
  ...initialMessages,
  ...(Array.isArray(deadmessage) ? deadmessage : [])
].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
//console.log("initial messages from db",(combinedMessages))

      setMessages(combinedMessages);
      setMessagestest(combinedMessages);
      messagesRef.current = combinedMessages
    }else{
      //console.log("current usee from ger message",currentuserRef._id)
      
      const initialMessages = globalThis.storage.readJSON('messages', []) || [];
      setMessages(initialMessages);
      setMessagestest(initialMessages);
      messagesRef.current = initialMessages
   
    }

    
  } catch (error) {
    console.error("error in getting messagessgsgs",error)
  }
}


const saveMessage = async(message)=>{

  try {
   
    if (socket.current ) {
      if (socket.current.readyState === WebSocket.OPEN) {
        try {
          const sendMessage = { ...message };
          if(message.type === 'messages'){
                     
           sendMessage.content = "encrpted text can't be read";
          }
   console.log("message to send", JSON.stringify(sendMessage, null, 2));

      
          socket.current.send(JSON.stringify(sendMessage));

   
          message.isSent = 1
          message.isError = 0
          if (message.type === 'file') {
        
            return {
              status: socket.current.readyState === WebSocket.OPEN ? 'sent' : 'failed',
              message
            };
          }
        } catch (error) {
          console.error('Error sending message:', error);
          message.isSent = 0
          message.isError = 1
if(message.type === 'file'){
  return {
    status: socket.current.readyState === WebSocket.OPEN ? 'sent' : 'failed',
    message
  };
}
        
        }
      } else {
        message.isSent = 0
             message.isError = 0
        //console.log("WebSocket is not open yet.");
      }
     
    } else {
      const token = await getAccessToken();
            const deviceId = getDeviceIdSync() || await getDeviceId();
            const wsUrl = `wss://${Maindata.SERVER_URL}?token=${token}&deviceId=${encodeURIComponent(deviceId)}`;

         
          await connect(wsUrl);
       
          setLink(wsUrl);
      message.isSent = 0
      message.isError = 0
      console.error('WebSocket is not connected');
      if(message.type === 'file'){
        return {
          status: socket.current.readyState === WebSocket.OPEN ? 'sent' : 'failed',
          message
        }
      }
    }
    const exists =
    isPlatform('hybrid')
      ? messagesRef.current.some(m => m.id === message.messageId)
      : (globalThis.storage.readJSON('messages', []) || []).some(m => m.id === message.messageId);
  
  if (exists) {
 
    return;
  }


  

   if(message.type === 'messages'){
    //console.log("message to save",message)
   
    if(isPlatform('hybrid')){
      
      const mainMessages = {
        id: message.messageId,  // Ensure the correct field is mapped
        sender: message.sender,
        recipient: message.recipient,
        content: message.content || null, // If content is null or undefined, set it to null
        timestamp: message.timestamp,
        status: message.status,
        read: message.read,
        type: message.type,
      
        fileType: message.fileType || null, // If fileType is null or undefined, set it to null
        file_size: message.file_size || null, // If file_size is null or undefined, set it to null
        file_path: message.file_path || null, // If file_path is null or undefined, set it to null
        file_name: message.file_name || null, // If file_name is null or undefined, set it to null
        isDeleted: message.isDeleted || 0, // Default to 0 if isDeleted is null or undefined
        isDownload: message.isDownload || 1, // Default to 0 if isDownload is null or undefined
        thumbnail: message.thumbnail || null, // If thumbnail is null or undefined, set it to null
        isSent: message.isSent === undefined ? 1 : message.isSent, // Set to 1 only if isSent is undefined
        isError: message.isError === undefined ? 0 : message.isError, // Set to 0 only if isError is undefined
        encryptedMessage: message.encryptedMessage || null, // If encryptedMessage is null or undefined, set it to null
        encryptedAESKey: message.encryptedAESKey || null, // If encryptedAESKey is null or undefined, set it to null
        eniv: message.eniv || null,
        isReplyTo: message.isReplyTo || message.is_reply_to || null
        
      };

      setMessages(prevMessages => [...prevMessages, mainMessages]);
      setMessagestest(prevMessages => [...prevMessages, mainMessages]);
      messagesRef.current = [...messagesRef.current, mainMessages];

    
      try {

        if (!dbRef.current || typeof dbRef.current.transaction !== 'function') {
          await initSQLiteDB();

        } 
        

         const idd = await storeMessageInSQLite(dbRef.current, mainMessages);
        console.log("Successfully stored message in SQLite",idd);
      } catch (err) {
        console.error("Failed to store message in SQLite", err);
      }
      

      //console.log("after ",messagesRef.current,mainMessages)
      try {
        // Get the main user data from localStorage
        const usermain = globalThis.storage.readJSON('usermain', []) || [];
      
        // Check if usermain exists, and if the recipient is valid
        if (usermain && message && message.recipient) {
          // Find the user whose ID matches the recipient
          const userIndex = usermain.findIndex(user => user.id === message.recipient);
          
          // If a user is found, update their last message with the new content and timestamp
          if (userIndex !== -1) {
            usermain[userIndex].lastMessage = {
              content: `You: ${message.content || "No content"}`, // Format the content
              timestamp: message.timestamp || new Date().toISOString() // Use current timestamp if not available
            };
      
            // Log the update for debugging
            //console.log('Updated user:', usermain[userIndex]);
      
            // Save the updated user data back to localStorage
            globalThis.storage.setItem('usermain', JSON.stringify(usermain));
      
            // Optionally, you can update state or any relevant component as well
           
          }
        } else {
          console.error('User or message data is invalid');
        }
      } catch (error) {
        console.error('Error occurred while updating lastMessage:', error);
      }

      


    }else{
      //console.log("checking the message",message)
      const mainMessages = {
        id: message.messageId,  // Ensure the correct field is mapped
        sender: message.sender,
        recipient: message.recipient,
        content: message.content || null, // If content is null or undefined, set it to null
        timestamp: message.timestamp,
        status: message.status,
        read: message.read,
        type: message.type,
        fileData: message.fileData,
        fileType: message.fileType || null, // If fileType is null or undefined, set it to null
        file_size: message.file_size || null, // If file_size is null or undefined, set it to null
        file_path: message.file_path || null, // If file_path is null or undefined, set it to null
        file_name: message.file_name || null, // If file_name is null or undefined, set it to null
        isDeleted: message.isDeleted || 0, // Default to 0 if isDeleted is null or undefined
        isDownload: message.isDownload || 0, // Default to 0 if isDownload is null or undefined
        thumbnail: message.thumbnail || null, // If thumbnail is null or undefined, set it to null
        isSent: message.isSent === undefined ? 1 : message.isSent, // Set to 1 only if isSent is undefined
        isError: message.isError === undefined ? 0 : message.isError, // Set to 0 only if isError is undefined
        encryptedMessage: message.encryptedMessage || null, // If encryptedMessage is null or undefined, set it to null
        encryptedAESKey: message.encryptedAESKey || null, // If encryptedAESKey is null or undefined, set it to null
        eniv: message.eniv || null,
        isReplyTo: message.isReplyTo || message.is_reply_to || null
        
      };
    
      const messages = globalThis.storage.readJSON('messages', []) || [];
      messages.push(mainMessages);

      globalThis.storage.setItem('messages', JSON.stringify(messages));
    
      setMessages(prevMessages => [...prevMessages, mainMessages]);
      setMessagestest(prevMessages => [...prevMessages, mainMessages]);
      messagesRef.current = [...messagesRef.current, mainMessages];

    
      ///////////////////////////////////////////////
    
      try {

        // Get the main user data from localStorage
        const usermain = globalThis.storage.readJSON('usermain', []) || [];
      
        // Check if usermain exists, and if the recipient is valid
        if (usermain && message && message.recipient) {
          // Find the user whose ID matches the recipient
          //console.log("usermain in savemessaegs",usermain)
          const userIndex = usermain.findIndex(user => user.id === message.recipient);
          
          // If a user is found, update their last message with the new content and timestamp
          if (userIndex !== -1) {
            usermain[userIndex].lastMessage = {
              content: `You: ${message.content || "No content"}`, // Format the content
              timestamp: message.timestamp || new Date().toISOString() // Use current timestamp if not available
            };
      
            // Log the update for debugging
            //console.log('Updated user:', usermain[userIndex]);
      
            // Save the updated user data back to localStorage
            globalThis.storage.setItem('usermain', JSON.stringify(usermain));
            globalThis.storage.setItem('usersMain', JSON.stringify(usermain));
            // Optionally, you can update state or any relevant component as well
   
          }
        } else {
          console.error('User or message data is invalid');
        }
      } catch (error) {
        console.error('Error occurred while updating lastMessage:', error);
      }
      
      
    }
  }
    return {
      status: socket.current.readyState === WebSocket.OPEN ? 'sent' : 'failed',
      message
    };

    
  } catch (error) {
        console.error("error in saving messagessgsgs",error)
    return {
      status: 'failed',
      message: {
        ...message,
        isSent: 0,
        isError: 1
      }
    };
    

  }

}
const saveunread = async(sender)=>{

  try {
    return updateUnreadCountInSQLite(db,sender);
  } catch (error) {
    console.error("error in saving messagessgsgs",error)
  }

}

const getunread = async()=>{
  try {
    return getunreadcount(db)
  } catch (error) {
    console.error("error in getting unreadcount",error)
  }
}
const resetunread = async(sender)=>{

  try {
    return resetUnreadCountInSQLite(db,sender);
  } catch (error) {
    console.error("error in saving messagessgsgs",error)
  }

}

// const helloWorld = (word) => {
//   //console.log(word);
// }

const saveMessagesToLocalStorage = (newMessages) => {

  try {
    // Ensure newMessages is an array
    const messagesToSave = Array.isArray(newMessages) ? newMessages : [newMessages];

    // Get existing messages
    const existingMessages = globalThis.storage.readJSON('messages', []) || [];

    // Avoid duplicates based on message ID
    const uniqueMessages = messagesToSave.filter(newMsg =>
      !existingMessages.some(existing => existing.id === newMsg.messageId)
    );

    // Transform each new message to consistent structure
    const formattedMessages = uniqueMessages.map(message => ({
      id: message.messageId,
      sender: message.sender,
      recipient: message.recipient,
      content: message.content || null,
      timestamp: message.timestamp,
      status: message.status,
      read: message.read,
      type: message.type,
      fileData: message.fileData,
      fileType: message.fileType || null,
      file_size: message.file_size || null,
      file_path: message.file_path || null,
      file_name: message.file_name || null,
      isDeleted: message.isDeleted || 0,
      isDownload: message.isDownload || 0,
      thumbnail: message.thumbnail || null,
      isError: message.isError === undefined ? message.isError : 0, // Set to 0 only if isError is undefined
      isSent: message.isSent === undefined ? message.isSent : 1, // Set to 1 only if isSent is undefined
      encryptedMessage: message.encryptedMessage || null, // Set to null only if encryptedMessage is undefined
      encryptedAESKey: message.encryptedAESKey || null, // Set to null only if encryptedAESKey is undefined
      isReplyTo: message.isReplyTo || message.is_reply_to || null,
    }));

    // Save to localStorage
    const updatedMessages = [...existingMessages, ...formattedMessages];
    
    globalThis.storage.setItem('messages', JSON.stringify(updatedMessages));

    //console.log(`? Saved ${formattedMessages.length} message(s) to localStorage`);
  } catch (error) {
    console.error("? Error saving messages to localStorage:", error);
  }
};
const saveUsersToLocalStorage = (usersToSave) => {
  try {
    const existingUsers = globalThis.storage.readJSON('usersMain', []) || [];

    // Ensure usersToSave is an array
    const usersArray = Array.isArray(usersToSave) ? usersToSave : [usersToSave];

    // Remove duplicates based on user.id
    const uniqueUsers = usersArray.filter(newUser =>
      !existingUsers.some(existing => existing.id === newUser.id)
    );

    if (uniqueUsers.length > 0) {
      const updatedUsers = [...existingUsers, ...uniqueUsers];
      globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
        globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
      //console.log(`? Saved ${uniqueUsers.length} new user(s) from [${source}]`);
    } else {
      //console.log(`?? No new users to save from [${source}]`);
    }
  } catch (error) {
    console.error('? Error saving users to localStorage:', error);
  }
};
const close = () => {
console.log("who the fucbk close the socket")
}

const isFloating = CallRuntime.overlayActive;
const WRAP_WIDTH  = isFloating ? 200 : "100vw";
const WRAP_HEIGHT = isFloating ? 280 : "100vh"; 


function restoreNormal() {
  if(restoringNow) return
   restoringNow = true; 
    CallRuntime.overlayActive = false;
    console.log("on return")
    window.NativeAds?.restoreFromOverlay();



    
    window.dispatchEvent(new CustomEvent("render-call-ui"));
}

if(isload){
  return(
   <div style={{ textAlign: 'center',display: 'flex', justifyContent: 'center', alignItems: 'center',position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',background: 'linear-gradient(135deg, #141E30, #243B55)',height: '100vh',width:'100%',overflowY: 'auto' }}>
      <StarLoader />
   
    </div>
  
  )
}else{



// ====== VIDEO CALL RUNTIME MOUNT (INLINE RENDERER) ======
const [callUI, setCallUI] = useState({
  visible: CallRuntime.showScreen,
  data: CallRuntime.data
});


const persistBlockedUsers = (set) => {
  globalThis.storage.setItem('blockedUsers', JSON.stringify([...set]));
};

const normalizePhoneNumber = (value) => {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return `+91${last10}`;
};

const addViewerNumberToPrefs = (targetId) => {
  try {
    const usersMain = globalThis.storage?.readJSON?.("usersMain", []) || [];
    const match = usersMain.find((u) => String(u.id || u._id) === String(targetId));
    if (!match) return;
    const number = normalizePhoneNumber(
      match.phoneNumber || match.phone || match.mobile || match.number || match.contactNumber
    );
    if (!number) return;
    const current = globalThis.storage?.readJSON?.("status_viewers_numbers", []) || [];
    if (current.includes(number)) return;
    const next = [...current, number];
    globalThis.storage?.setItem?.("status_viewers_numbers", JSON.stringify(next));
  } catch (err) {
    console.warn("Failed to update status viewers numbers", err);
  }
};

const blockUser = async (targetId) => {
  try {
    const res = await api.blockUser(host, targetId);

    const json = await res.json();
    if (!json.success) throw new Error('Block failed');

    setBlockedUsers(prev => {
      const next = new Set(prev);
      next.add(targetId);
      persistBlockedUsers(next);
      return next;
    });

  } catch (err) {
    console.error('Block user failed:', err);
    showToast?.('Failed to block user');
  }
};

const unblockUser = async (targetId) => {
  try {
    const res = await api.unblockUser(host, targetId);

    const json = await res.json();
    if (!json.success) throw new Error('Unblock failed');

    setBlockedUsers(prev => {
      const next = new Set(prev);
      next.delete(targetId);
      persistBlockedUsers(next);
      return next;
    });
    addViewerNumberToPrefs(targetId);

  } catch (err) {
    console.error('Unblock user failed:', err);
    showToast?.('Failed to unblock user');
  }
};

useEffect(() => {
  const update = () => {
    console.log("callruntime", JSON.stringify(CallRuntime))
    setCallUI({
      visible: CallRuntime.showScreen,
      data: { ...CallRuntime.data }
    });
  };

  window.addEventListener("render-call-ui", update);
  return () => window.removeEventListener("render-call-ui", update);
}, []);

const width = 240;   // same as params.width
const height = 340;  // same as params.height

let lastX = 0, lastY = 0;
let isDragging = false;

const smoothDrag = (x, y) => {
  requestAnimationFrame(() => {
    const box = window.__FLOAT_REF;
    box.style.left = x + "px";
    box.style.top = y + "px";
    box.style.right = "auto";
    box.style.bottom = "auto";
  });
};
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  return (
    <LoginProvider>
      <MessageProvider>
      <IonAlert
      isOpen={show}
      onDidDismiss={() => setShow(false)}
      header="Network status"
      message={
        connected
          ? 'You are back online'
          : 'You are offline. Waiting for connection...'
      }
      buttons={['OK']}
    />
             {showModal2 && (
              <UpdateModal
                version={serverVersion}
                url={downloadUrl}
                critical={criticalUpdate}
                onClose={() => setShowModal2(false)}
              />
            )}
      {/* ?? Runtime Call UI Overlay */}
{callUI.visible && (
  <div
    ref={el => (window.__FLOAT_REF = el)} // Used for drag

    style={{
      position: "fixed",
      zIndex: 9999999,

      // =============== VIEW STATE RULES ====================
         //300, 420,
      width: CallRuntime.overlayActive ? width : CallRuntime.isFloating ? "160px" : "100vw",
      height: CallRuntime.overlayActive ? height : CallRuntime.isFloating ? "240px" : "100vh",

      // fullscreen if overlay OR normal
      inset: !CallRuntime.isFloating || CallRuntime.overlayActive ? 0 : "auto",

      // popup default anchor
      right: CallRuntime.isFloating && !CallRuntime.overlayActive ? "12px" : "auto",
      bottom: CallRuntime.isFloating && !CallRuntime.overlayActive ? "12px" : "auto",

      borderRadius: CallRuntime.isFloating && !CallRuntime.overlayActive ? "16px" : "0",
      background: CallRuntime.overlayActive ? "#000" : CallRuntime.isFloating ? "black" : "transparent",

      overflow: "hidden",
      transition: "all .25s ease",
      cursor: CallRuntime.isFloating && !CallRuntime.overlayActive ? "grab" : "default"
    }}

    // ============ DRAG ONLY IF FLOATING & NOT OVERLAY ============
    onMouseDown={(e) => {
      if (!CallRuntime.isFloating || CallRuntime.overlayActive) return;

      const box = window.__FLOAT_REF;
      const rect = box.getBoundingClientRect();
      const edge = 20;
      const maxX = window.innerWidth - rect.width + edge;
      const maxY = window.innerHeight - rect.height + edge;

      let startX = e.clientX;
      let startY = e.clientY;
      let origX = rect.left;
      let origY = rect.top;

      const move = (ev) => {
        let X = origX + (ev.clientX - startX);
        let Y = origY + (ev.clientY - startY);

        X = Math.max(-edge, Math.min(maxX, X));
        Y = Math.max(-edge, Math.min(maxY, Y));

        requestAnimationFrame(() => {
          box.style.left = X + "px";
          box.style.top = Y + "px";
          box.style.right = "auto";
          box.style.bottom = "auto";
        });
      };

      const stop = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", stop);
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", stop);
    }}

    // Same logic for mobile touch drag
    onTouchStart={(e) => {
      if (!CallRuntime.isFloating || CallRuntime.overlayActive) return;

      const t = e.touches[0];
      const box = window.__FLOAT_REF;
      const rect = box.getBoundingClientRect();
      const edge = 20;
      const maxX = window.innerWidth - rect.width + edge; 
      const maxY = window.innerHeight - rect.height + edge;

      let startX = t.clientX;
      let startY = t.clientY;
      let origX = rect.left;
      let origY = rect.top;

      const move = (ev) => {
        const tt = ev.touches[0];
        let X = origX + (tt.clientX - startX);
        let Y = origY + (tt.clientY - startY);

        X = Math.max(-edge, Math.min(maxX, X));
        Y = Math.max(-edge, Math.min(maxY, Y));

        requestAnimationFrame(() => {
          box.style.left = X + "px";
          box.style.top = Y + "px";
          box.style.right = "auto";
          box.style.bottom = "auto";
        });
      };

      const stop = () => {
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", stop);
      };

      window.addEventListener("touchmove", move);
      window.addEventListener("touchend", stop);
    }}
  >
    
    {/* ================== Overlay Exit Button (Display ONLY when overlay) ================== */}
 

    <VideoCallScreen socket={socket.current} {...callUI.data} />
  </div>
)}



          <Switch>
            <Route 
              path="/home" 
              render={(props) => <HomeScreen {...props} link={link} storage={store}     messages={messages}
                setMessages={setMessages}
                setMessagestest={setMessagestest}
                messagestest={messagestest}
                usersMaintest={usersMaintest}
                setUsersMaintest={setUsersMaintest}
                setCurrenuser={setCurrenuser}
                getMessage={getmessages}
                usersMain={usersMain}
                groupsMain={groupsMain}
                setGroupsMain={setGroupsMain}
                db = {dbRef.current}
                mode={mode}
                setMode={setMode}
                setUsersMain={setUsersMain}
                adminUnread={adminUnread}
                blockedUsers={blockedUsers}
                blockUser={blockUser}
                unblockUser={unblockUser}
                storeMessageInSQLite={storeMessageInSQLite}
                customSounds={customSounds}
                setCustomSounds={setCustomSounds}
                
                socket={socket.current}
                sendMessage={sendMessage}
              saveUsersToLocalStorage={saveUsersToLocalStorage}
              close={close}
              reconnect={reconnect}
              isIntialized={isIntialized}
              setIsIntialized={setIsIntialized}
              connect={connect}
             messagesRef={messagesRef}
             
              saveMessage={saveMessage}
              getmessages={getmessages}
              saveunread={saveunread}
              getunread={getunread}
              saveMessagesToLocalStorage={saveMessagesToLocalStorage}
              resetunread={resetunread}
              clearDirectNotificationForUser={clearDirectNotificationForUser}
              selectedUser1={selectedUser}
              userDetails={currentUser}
                mutedGroupIds={mutedGroupIds}
                setMutedGroupIds={setMutedGroupIds}
                onDeleteGroupLocal={softDeleteGroupLocal}
                groupMessagesByGroup={groupMessagesByGroup}
                setGroupMessagesByGroup={setGroupMessagesByGroup}
                onActiveGroupChange={handleActiveGroupChange}
              
              />} 
            />
            <Route 
              path="/login" 
              render={(props) => <LoginScreen {...props} storage={store} messages={messages}
              setMessages={setMessages}
              setMessagestest={setMessagestest}
              messagestest={messagestest}
              setCurrentUser={setCurrenuser}
              getMessage={getmessages}
              socket={socket.current}
              connect={connect} 
              connectTemporarySocket={connectTemporarySocket}
              sendMessage={sendMessage}
              close={close}
              reconnect={reconnect}
              sendPublicKeyToBackend={sendPublicKeyToBackend}
              saveMessage={saveMessage}
              saveunread={saveunread}
              getunread={getunread}
              resetunread={resetunread}
              selectedUser={selectedUser}  />} 
            />
            <Route
              path="/temporary-setup"
              render={(props) => (
                <TemporarySetupPage
                  {...props}
                  connect={connect}
                  connectTemporarySocket={connectTemporarySocket}
                />
              )}
            />
            <Route
              path="/temporaryhome"
              render={(props) => <TemporaryHome {...props} socket={temporarySocket.current} />}
            />
            <Route
              path="/temporary-chatwindow"
              render={(props) => (
                <TemporaryChatWindow
                  {...props}
                  socket={temporarySocket.current}
                  onActiveRoomChange={handleActiveTemporaryRoomChange}
                />
              )}
            />
            <Route
              path="/temporary-profile"
              render={(props) => <TemporaryProfilePage {...props} />}
            />
            <Route 
              path="/signup" 
              render={(props) => <SignupScreen {...props} storage={store} messages={messages}
              setMessages={setMessages}
            sendPublicKeyToBackend={sendPublicKeyToBackend}
              setCurrentUser={setCurrenuser}
              getMessage={getmessages}
              socket={socket.current}
              sendMessage={sendMessage}
              close={close}
              reconnect={reconnect}
   connect={connect} 
              saveMessage={saveMessage}
              saveunread={saveunread}
              getunread={getunread}
              resetunread={resetunread}
              selectedUser={selectedUser} />} 
            />
            <Route 
              path="/newchat" 
              render={(props) => <NewChat {...props} storage={store} messages={messages}
              setMessages={setMessages}
              setMessagestest={setMessagestest}
              messagestest={messagestest}
              setCurrentUser={setCurrenuser}
              getMessage={getmessages}
              socket={socket.current}
              sendMessage={sendMessage}
              close={close}
              saveMessagesToLocalStorage={saveMessagesToLocalStorage}
              reconnect={reconnect}
             
              saveMessage={saveMessage}
              saveunread={saveunread}
              getunread={getunread}
              resetunread={resetunread}
              selectedUser={selectedUser} />} 
            />
            <Route
              exact
              path={["/newgroup", "/newGroup"]}
              render={(props) => (
                <NewGroupPage
                  {...props}
                  usersMain={usersMain}
                  groupsMain={groupsMain}
                  setGroupsMain={setGroupsMain}
                />
              )}
            />
            <Route
              path="/status-viewers"
              render={(props) => <StatusViewers {...props} />}
            />
            <Route 
              path="/newchatwindow" 
              render={(props) => <NewChatWindow {...props} storage={store}  db={dbRef.current} messages={messages}
              setMessages={setMessages}
              setMessagestest={setMessagestest}
              messagestest={messagestest}
              saveUsersToLocalStorage={saveUsersToLocalStorage}
              setCurrentUser={setCurrenuser}
              getMessage={getmessages}
              saveMessagesToLocalStorage={saveMessagesToLocalStorage}
              socket={socket.current}
              sendMessage={sendMessage}
              usersMain={usersMain}
              setUsersMain={setUsersMain}
              close={close}
              reconnect={reconnect}
      
              messagesRef={messagesRef}
              saveMessage={saveMessage}
              saveunread={saveunread}
              getunread={getunread}
              resetunread={resetunread}
              selectedUser={selectedUser}/>} 
            />
            <Route 
              path="/chatwindow" 
              render={(props) => <ChatWindow {...props} storage={store}  db={dbRef.current} messages={messages}
              setMessages={setMessages}
                blockedUsers={blockedUsers}
              messagesRef={messagesRef}
              setCurrentUser={setCurrenuser}
              saveUsersToLocalStorage={saveUsersToLocalStorage}
              getMessage={getmessages}
              socket={socket.current}
          setBlockedUsers={setBlockedUsers}
           blockUser={blockUser}
  unblockUser={unblockUser}
              sendMessage={sendMessage}
              saveMessagesToLocalStorage={saveMessagesToLocalStorage}
              close={close}
              reconnect={reconnect}
              setMessagestest={setMessagestest}
              messagestest={messagestest}
              saveMessage={saveMessage}
              host={host}
              usersMain={usersMain}
              mode={mode}
              setMode={setMode}
              setUsersMain={setUsersMain}
              storeMessageInSQLite={storeMessageInSQLite}
              saveunread={saveunread}
              getunread={getunread}
              mutedlist={mutedlist}
              customSounds={customSounds}
              setCustomSounds = {setCustomSounds}
              setmutedList={setmutedList}
              resetunread={resetunread}
              clearDirectNotificationForUser={clearDirectNotificationForUser}
              selectedUser={selectedUser}/>} 
            />
            <Route
              path="/group-chatwindow"
              render={(props) => (
                <GroupChatWindow
                  {...props}
                  socket={socket.current}
                  db={dbRef.current}
                  usersMain={usersMain}
                  groupsMain={groupsMain}
                  setGroupsMain={setGroupsMain}
                  groupMessagesByGroup={groupMessagesByGroup}
                  setGroupMessagesByGroup={setGroupMessagesByGroup}
                  mutedGroupIds={mutedGroupIds}
                  setMutedGroupIds={setMutedGroupIds}
                  onActiveGroupChange={handleActiveGroupChange}
                />
              )}
            />
            <Route
              path="/group-add-members"
              render={(props) => (
                <GroupAddMembersPage
                  {...props}
                  usersMain={usersMain}
                />
              )}
            />
              
        <Route 
              path="/forwardScreen" 
              render={(props) => <ForwardScreen {...props} storage={store}  db={dbRef.current} messages={messages}
              setMessages={setMessages}
              messagesRef={messagesRef}
              setCurrentUser={setCurrenuser}
              saveUsersToLocalStorage={saveUsersToLocalStorage}
              getMessage={getmessages}
              socket={socket.current}
              sendMessage={sendMessage}
              host={host}
              saveMessagesToLocalStorage={saveMessagesToLocalStorage}
              close={close}
              reconnect={reconnect}
              setMessagestest={setMessagestest}
              messagestest={messagestest}
              saveMessage={saveMessage}
              usersMain={usersMain}
              groupsMain={groupsMain}
              storeMessageInSQLite={storeMessageInSQLite}
              setUsersMain={setUsersMain}
              setGroupsMain={setGroupsMain}
              saveunread={saveunread}
              getunread={getunread}
              resetunread={resetunread}
              selectedUser={selectedUser}/>} 
            />
                 <Route 
              path="/settings" 
              render={(props) => <SettingsPage {...props} storage={store}  db={dbRef.current} messages={messages}
                setMessages={setMessages}
                messagesRef={messagesRef}
                setCurrentUser={setCurrenuser}
                saveUsersToLocalStorage={saveUsersToLocalStorage}
                getMessage={getmessages}
                socket={socket.current}
                sendMessage={sendMessage}
                mutedlist={mutedlist}
                setmutedList={setmutedList}
                host={host}
                mode={mode}
                  setBlockedUsers={setBlockedUsers}
                  blockedUsers={blockedUsers}
                setMode={setMode}
                adminUnread={adminUnread}
                saveMessagesToLocalStorage={saveMessagesToLocalStorage}
                close={close}
                reconnect={reconnect}
                setMessagestest={setMessagestest}
              messagestest={messagestest}
              saveMessage={saveMessage}
              setForAllSounds={setForAllSounds}
              ForAllSounfds={ForAllSounfds}
              usersMain={usersMain}
              storeMessageInSQLite={storeMessageInSQLite}
              setUsersMain={setUsersMain}
              saveunread={saveunread}
              setismute={setismute}
              isnotmute={isnotmute}
              getunread={getunread}
              resetunread={resetunread}
              selectedUser={selectedUser}/>} 
            />
              <Route 
              path="/Archived" 
              render={(props) => <ArchivedChats {...props} storage={store}  db={dbRef.current} messages={messages}
              setMessages={setMessages}
              messagesRef={messagesRef}
              setCurrentUser={setCurrenuser}
             
              saveUsersToLocalStorage={saveUsersToLocalStorage}
              getMessage={getmessages}
              socket={socket.current}
              sendMessage={sendMessage}
              host={host}
              saveMessagesToLocalStorage={saveMessagesToLocalStorage}
              
              reconnect={reconnect}
              setMessagestest={setMessagestest}
              selectedUser1={selectedUser}
              messagestest={messagestest}
              saveMessage={saveMessage}
              usersMain={usersMain}
              groupsMain={groupsMain}
              storeMessageInSQLite={storeMessageInSQLite}
              setUsersMain={setUsersMain}
              setGroupsMain={setGroupsMain}
              saveunread={saveunread}
              getunread={getunread}
              resetunread={resetunread}
              selectedUser={selectedUser}/>} 
            />
            <Route 
              path="/Profile" 
              render={(props) => <ProfilePage {...props} storage={store}  db={dbRef.current} messages={messages}
              setMessages={setMessages}
              messagesRef={messagesRef}
              setCurrentUser={setCurrenuser}
              saveUsersToLocalStorage={saveUsersToLocalStorage}
              getMessage={getmessages}
              socket={socket.current}
              sendMessage={sendMessage}
              host={host}
              saveMessagesToLocalStorage={saveMessagesToLocalStorage}
          
              reconnect={reconnect}
              setMessagestest={setMessagestest}
              selectedUser1={selectedUser}
              messagestest={messagestest}
              saveMessage={saveMessage}
              usersMain={usersMain}
              storeMessageInSQLite={storeMessageInSQLite}
              setUsersMain={setUsersMain}
              saveunread={saveunread}
              getunread={getunread}
              resetunread={resetunread}
              selectedUser={selectedUser}/>} 
            />

             <Route 
              path="/helpchatbox" 
              render={(props) => <HelpInfoChat {...props} storage={store}  db={dbRef.current} messages={messages}
              setMessages={setMessages}
              messagesRef={messagesRef}
              setCurrentUser={setCurrenuser}
              saveUsersToLocalStorage={saveUsersToLocalStorage}
              getMessage={getmessages}
              socket={socket.current}
              sendMessage={sendMessage}
              host={host}
              saveMessagesToLocalStorage={saveMessagesToLocalStorage}
       
              reconnect={reconnect}
              setMessagestest={setMessagestest}
              selectedUser1={selectedUser}
              messagestest={messagestest}
              saveMessage={saveMessage}
              usersMain={usersMain}
              storeMessageInSQLite={storeMessageInSQLite}
              setUsersMain={setUsersMain}
              saveunread={saveunread}
              getunread={getunread}
              resetunread={resetunread}
              selectedUser={selectedUser}/>} 
            />
            <Route
              path="/Blocklist" 
              render={(props) => <Blocklist {...props} storage={store}  
    blockedUsers={blockedUsers}
                   setBlockedUsers={setBlockedUsers}
           blockUser={blockUser}
  unblockUser={unblockUser}
              usersMain={usersMain}
              storeMessageInSQLite={storeMessageInSQLite}
           />} 
            />
              <Route
              path="/AdminChat" 
              render={(props) => <AdminChat {...props} storage={store}  
    blockedUsers={blockedUsers}
                   setBlockedUsers={setBlockedUsers}
           blockUser={blockUser}
  unblockUser={unblockUser}
                usersMain={usersMain}
                sendAdminMessage={sendAdminMessage}
                fetchAdminMessages={fetchAdminMessages}
                markAdminMessagesRead={markAdminMessagesRead}
                storeMessageInSQLite={storeMessageInSQLite}
             />} 
              />
            
          {/* <Route
  path="/videocall"
  render={(props) => (
    <VideoCallScreen
     socket={socket.current}
    />
  )}
/> */}

 

            <Redirect from="/" to={initialRoute} />
          </Switch>


      </MessageProvider>
    </LoginProvider>
  );
}
}







