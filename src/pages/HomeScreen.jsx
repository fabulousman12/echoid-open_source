import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { IonContent, IonLoading, IonAlert, createGesture } from '@ionic/react';
import { FaEllipsisV, FaCommentDots, FaVolumeMute, FaUsers, FaRegEdit } from 'react-icons/fa';
import { isPlatform } from '@ionic/react';
import { useHistory } from 'react-router';
import { PushNotifications } from '@capacitor/push-notifications';
import {closeCircleOutline} from 'ionicons/icons';
import './HomeScreen.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { LoginContext } from '../Contexts/UserContext';
import img from '/img.jpg';
import { Capacitor } from '@capacitor/core';
import Footer from '../components/Footer';
import Group from '../components/Group';
import Chats from '../components/Chats';
import forge from 'node-forge';
import { Toast } from '@capacitor/toast';
import Status from '../components/Status';
import Calls from '../components/Calls';
import Maindata from '../data';
import { logOutOutline } from 'ionicons/icons';
import { MessageContext } from '../Contexts/MessagesContext';
import UserMain from '../components/UserMain';
import DesktopHomeLayout from '../components/DesktopHomeLayout';
import ChatWindow from './chatwindo';
import GroupChatWindow from './GroupChatWindow';
import {   FaTimes } from 'react-icons/fa';
import useUserStore from '../services/useUserStore';
import { LocalNotifications } from '@capacitor/local-notifications';
import { IonIcon } from '@ionic/react';
import { ffmpeg_thumnail } from 'ionic-thumbnail';
import UpdateModal from '../components/UpdateModal';
import { api } from "../services/api";
import { getAccessToken, getRefreshToken, clearTokens } from "../services/authTokens";
import { getDeviceId, getDeviceIdSync } from "../services/deviceInfo";
import { hashPrivateKey } from "../services/keyHash";
// Helper to wait until the WebSocket is fully connected
import { CiWifiOff } from "react-icons/ci";
import { useNetworkStatus } from '../services/useNetworkStatus';
import { MdOutlinePortableWifiOff } from "react-icons/md";
import { MdOutlineCancel } from "react-icons/md";
import { RiDeleteBin5Fill } from "react-icons/ri";
const waitForSocketConnection = (socket, callback) => {
  const maxAttempts = 50; // Retry limit
  let attempts = 0;

  const interval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      clearInterval(interval);
      callback(); // WebSocket is ready
    } else {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn("WebSocket not ready after multiple attempts");
      }
    }
  }, 100); // Check every 100ms
};

const HomeScreen = ({
  usersMaintest,
  setUsersMaintest,
  saveUsersToLocalStorage,
  socket,
  messages,
  setMessages,
  connect,
  setCurrenuser,
  getmessages,
  setUnreadCounts,
  selectedUser1,
  messagesRef,
  isIntialized,
  setIsIntialized,
  saveMessagesToLocalStorage,
  usersMain,
  groupsMain,
  setGroupsMain,
  setUsersMain,
  db,
  mode,
  setMode,
  userDetails,
  adminUnread,
  mutedGroupIds = [],
  setMutedGroupIds,
  onDeleteGroupLocal,
  groupMessagesByGroup = {},
  setGroupMessagesByGroup,
  onActiveGroupChange,
  saveMessage,
  setMessagestest,
  blockedUsers,
  blockUser,
  unblockUser,
  storeMessageInSQLite,
  setCustomSounds,
}) => {
//  const { socket,messages,db,setMessages,connect,setSelectedUser,setCurrenuser,getmessages,setUnreadCounts } = useWebSocket(); // Use WebSocket context methods
 const {
  currentUserId,
  setCurrentUser,
  selectedUser,
  setSelectedUser1,

  activeFooter,
  setActiveFooter,
  calls,
  setCalls,
  menuVisible,
  setMenuVisible,
  showAlert,
  setShowAlert,
  alertMessage,
  setAlertMessage,
  isLoad,
  setIsLoad,
  } = useContext(MessageContext);
  const context = useContext(LoginContext);
  const { host, getuser } = context;
  //const {usersMaintest,setUsersMaintest} = useUserStore()
  const [selectedChats, setSelectedChats] = useState([]); 
  const history = useHistory();
const [isloading, setIsLoading] = useState(false);
   const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);
    const [showModal, setShowModal] = useState(false);
  const [callsSelectionMode, setCallsSelectionMode] = useState(false);
  const [selectedCallIds, setSelectedCallIds] = useState([]);
  const [mutedUsers,setmutedList] = useState([])

  const [showModal2, setShowModal2] = useState(false);
  const [criticalUpdate, setCriticalUpdate] = useState(false);
  const [serverVersion, setServerVersion] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [appTheme, setAppTheme] = useState(() => globalThis.storage?.getItem?.("appTheme") || "light");
  const canCreateChat = Capacitor.isNativePlatform?.() || isPlatform('hybrid');
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 940;
  });
  const [desktopSelectedUser, setDesktopSelectedUser] = useState(null);
  const [desktopSelectedGroup, setDesktopSelectedGroup] = useState(null);
  const CURRENT_APP_VERSION = Maindata.AppVersion;
  const readJSON = useCallback((key, fallback) => {
    try {
      const raw = globalThis.storage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }, []);
  const writeJSON = useCallback((key, value) => {
    const str = JSON.stringify(value);
    try {
      globalThis.storage.setItem(key, str);
    } catch (error) {
      console.warn("Could not store in storage, likely quota exceeded", error);
    }
  }, []);
  const user = useMemo(() => readJSON('currentuser', null), [readJSON]);
  const contactsById = useMemo(() => {
    const list = Array.isArray(usersMain) ? usersMain : [];
    return new Map(list.map(c => [c.id, c]));
  }, [usersMain]);

  useEffect(() => {
    const list = Array.isArray(usersMain) ? usersMain : [];
    if (desktopSelectedUser?.id) {
      const refreshedDesktopUser = list.find((entry) => String(entry?.id || "") === String(desktopSelectedUser.id));
      if (refreshedDesktopUser && refreshedDesktopUser !== desktopSelectedUser) {
        setDesktopSelectedUser(refreshedDesktopUser);
      }
    }

    if (selectedUser && typeof selectedUser === "object" && selectedUser.id) {
      const refreshedSelectedUser = list.find((entry) => String(entry?.id || "") === String(selectedUser.id));
      if (refreshedSelectedUser && refreshedSelectedUser !== selectedUser) {
        setSelectedUser1(refreshedSelectedUser);
      }
    }
  }, [desktopSelectedUser, selectedUser, setSelectedUser1, usersMain]);
  const visibleChatUsers = useMemo(() => {
    const list = Array.isArray(usersMain) ? usersMain : [];
    return list.filter((user) => {
      if (!user) return false;
      if (String(user?.id || "") === String(currentUserId || "")) return false;
      return !user?.isArchive;
    });
  }, [usersMain, currentUserId]);
  const hasUnreadChats = useMemo(() => {
    return visibleChatUsers.some((user) => {
      const raw = user?.unreadCount;
      const count = typeof raw === "number" ? raw : parseInt(String(raw || "0"), 10);
      return Number.isFinite(count) && count > 0;
    });
  }, [visibleChatUsers]);
  const hasUnreadGroups = useMemo(() => {
    const list = Array.isArray(groupsMain) ? groupsMain : [];
    return list.some((group) => {
      if (!group || group.isArchive === true || group.isActive === false || group.isDelete === true || group.isDeleted === true) return false;
      const raw = group.unreadCount;
      const count = typeof raw === "number" ? raw : parseInt(String(raw || "0"), 10);
      return Number.isFinite(count) && count > 0;
    });
  }, [groupsMain]);
  const unreadNotifications = useMemo(() => {
    return visibleChatUsers.reduce((sum, entry) => {
      const raw = entry?.unreadCount;
      const count = typeof raw === "number" ? raw : parseInt(String(raw || "0"), 10);
      return sum + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0);
  }, [visibleChatUsers]);
  const customSounds = useMemo(() => readJSON('customSounds', []), [readJSON]);
  const soundsBySenderId = useMemo(() => {
    const list = Array.isArray(customSounds) ? customSounds : [];
    return new Map(list.map(s => [s.senderId, s]));
  }, [customSounds]);
  
function isVersionGreater(v1, v2) {
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
  const { connected, connectionType } = useNetworkStatus();


  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`https://${Maindata.SERVER_URL}/user/version`);
        const data = await res.json(); // expects { version: "1.5", url: "..." }
if(!data.success) return;
console.log(CURRENT_APP_VERSION,data.version)
        if (isVersionGreater(data.version, CURRENT_APP_VERSION)) {
          const updatedetails = fetch(`https://${Maindata.SERVER_URL}/user/updatedetails`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
             
            },
            body: JSON.stringify({
              version: data.version,
            
            })
          })
          const dat = await updatedetails.json()
       
          //updatedetails.resposnse_url
          setCriticalUpdate(isCritical(data.version));
          setServerVersion(data.version);
          setDownloadUrl(dat.resposnse_url || 'https://example.com/download'); // Fallback URL if not provided
          setShowModal2(true);
        }
      } catch (err) {
        console.error("Version check failed", err);
      }
    };

    checkVersion();
  }, []);
  useEffect(() => {

    if(isIntialized===true){
      return;
    }

    setIsLoading(true)
    const setupApp = async () => {

      //console.log("this should run even in new sign in or sign up")
   

    
      const savedUsers = readJSON('usersMain', []);

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
    const capMsg = user.lastMessage;
    const localMsg = localUser.lastMessage;

    // Check if lastMessage has changed or is newer
    const isUpdated =
      capMsg &&
      (!localMsg || capMsg.timestamp > localMsg.timestamp );

    if (isUpdated) {
      localMap.set(user.phone, user); // Replace with updated version
    }
  }
}

// Final merged users array
const mergedUsers = Array.from(localMap.values());
const mergedStr = JSON.stringify(mergedUsers);

// Sync to storage and Capacitor
writeJSON('usersMain', mergedUsers);
//console.log("merged users",mergedUsers)
//console.log("merged str",mergedStr)

      if(socket && socket.readyState === WebSocket.OPEN){
   
        setIsIntialized(true)
      }
      setUsersMain(mergedUsers);
      setUsersMaintest(mergedUsers)
      setIsLoad(true)

      
      setmutedList(readJSON('mutedUsers', []));
      const token = await getAccessToken();
      if (!token) {
       history.push('/login');
       return;
      }
      await sendPublicKeyToBackend(token);
const usermain = readJSON('currentuser', null);
var user = null
      if (!usermain) {
user = await getuser()

      }else{
        user = usermain
      }
      //console.log("user from home",user)
      
      if (!user) {
        setCurrenuser(user)
       
       history.push('/login', { message: 'Session expired. Please re-login.' });
       return;
      }
  
      setCurrentUser(user._id)
      
      // Connect WebSocket
      const deviceId = getDeviceIdSync() || await getDeviceId();
      const wsUrl = `wss://${Maindata.SERVER_URL}?token=${token}&deviceId=${encodeURIComponent(deviceId)}`;
     
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        //console.log('%c Is this on developing phase :' + 'Connecting to ws throug home', 'color: blue; font-size: 15px; font-weight: bold;')
         connect(wsUrl);
         console.log('%c wsUrl should work lol in home :' + wsUrl, 'color: red; font-size: 15px; font-weight: bold;');

      }

 

   
setIsLoad(false)
      // Save the filtered list back to localStorage
      // //console.log('%c not good to see tjis :' + Maindata.IsDev, 'color: red; font-size: 15px; font-weight: bold;');
   
    //  //console.log("user saved",globalThis.storage.readJSON('', null))
        const initAds = async () => {
      try {
        await ffmpeg_thumnail.initStartio({ appId: '205258541' });
        console.log('Start.io initialized');
      } catch (err) {
        console.error('Error initializing Start.io:', err);
      }
    };

    

  
        //console.log("WebSocket is now ready, running loadMessages...");
        await loadMessages();
          
        setIsIntialized(true);
     
    

    
     
    
     
    }
     
    setIsLoading(false)
   
    //console.log("let my bro run ")
    fetchUsers();

    setupApp();
    
  setIsIntialized(true)
    // Cleanup
 
  }, []);


  function isCritical(versionStr) {
  const v = parseFloat(versionStr);
  return v % 0.5 === 0;
}




const handleMessageNotification = async (data) => {
  //console.log('Handling message notification:', data);

  try {
    // 1. Show local notification
    showSystemTrayNotification({
      senderId: data.sender,
      content: data.content,
      timestamp: data.timestamp,
    });

    // 2. Database name
    const dbName = 'Conversa_chats_store.db';

    // 3. Open DB
    const db = await new Promise((resolve, reject) => {
      const database = window.sqlitePlugin.openDatabase({ name: dbName, location: 'default' },
        () => resolve(database),
        err => reject(err)
      );
    });

    // 4. Execute SQL
    db.transaction(tx => {
      // Ensure table exists
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
          isReplyTo TEXT DEFAULT null
        );`
      );
      tx.executeSql(
        `ALTER TABLE messages ADD COLUMN isReplyTo TEXT DEFAULT null;`,
        [],
        () => {},
        () => false
      );

      // Insert message
      tx.executeSql(
        `INSERT OR REPLACE INTO messages (
          id, sender, recipient, content, timestamp, status, read, isDeleted,
          isDownload, type, file_name, file_type, file_size, thumbnail,
          file_path, isError, isSent, isReplyTo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.sender,
          data.recipient,
          data.content,
          data.timestamp,
          data.status || 'delivered',
          0,  // read
          0,  // isDeleted
          0,  // isDownload
          data.type || 'text',
          data.file_name || null,
          data.file_type || null,
          data.file_size || null,
          data.thumbnail || null,
          data.file_path || null,
          0,  // isError
          1,  // isSent
          data.isReplyTo || null
        ]
      );
    }, err => {
      console.error('❌ Transaction error:', err);
    }, () => {
      //console.log('✅ Message saved to DB.');
    });

  } catch (err) {
    console.error('❌ Failed to handle message notification:', err);
  }
};


const handleCallNotification = (data) => {
  //console.log('Handling call notification:', data);
  // e.g., show incoming call UI, ring tone, etc.
};


  const notificationOpenedCallback = (result) => {
    //console.log('Notification opened callback:', result);
    // Handle the notification when the user taps on it
  };


  const showSystemTrayNotification = (notificationData) => {
  const { senderId, content, timestamp } = notificationData;

  // 1. Get sender name and avatar from localStorage
  const sender = contactsById.get(senderId);

  const senderName = sender?.name || 'Unknown';
  const avatar = sender?.avatar || null; // e.g., 'file:///path/to/avatar.png'

  // 2. Get custom sound for sender from localStorage
  const senderSound = soundsBySenderId.get(senderId);
  const soundPath = senderSound?.soundPath || 'default';

  // 3. Format body and time
  const formattedBody = `${senderName}: ${content}`;
  const formattedTime = new Date(timestamp).toLocaleTimeString();

  // 4. Build the local notification
  LocalNotifications.schedule({
    notifications: [
      {
        id: new Date().getTime(), // unique ID
        title: 'New Message',
        body: `${formattedBody}  (${formattedTime})`,
        schedule: { at: new Date() },
        sound: soundPath, // custom or 'default'
        attachments: avatar ? [avatar] : [],
        smallIcon: 'echoidv2',
        android: {
          channelId: 'default',
          color: '#ffffff',
          priority: 2,
        },
      },
    ],
  });
};

  



  useEffect(()=>{
    if(isIntialized===true){
      return;
    }


  },[setMessages])



  // Swipe Gesture Effect
  useEffect(() => {
    const swipeContainer = document.querySelector('.swipe-container');
    if (swipeContainer) {
      const gesture = createGesture({
        el: swipeContainer,
        onMove: ev => handleSwipe(ev),
      });
      gesture.enable();
  
      return () => gesture.destroy();
    } else {
      console.warn('Swipe container not found');
    }
  }, [activeFooter]);

  const handleSwipe = (ev) => {
    if (ev.deltaX > 50) navigateFooter(-1); // Swipe right
    if (ev.deltaX < -50) navigateFooter(1);  // Swipe left
  };

  const navigateFooter = (direction) => {
    const pages = ['Chats', 'Calls', 'Group'];
    let currentIndex = pages.indexOf(activeFooter);
    let nextIndex = (currentIndex + direction + pages.length) % pages.length;
    setActiveFooter(pages[nextIndex]);
  };

  useEffect(() => {
    if (activeFooter !== "Calls" && callsSelectionMode) {
      handleClearCallSelection();
    }
  }, [activeFooter, callsSelectionMode]);

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = globalThis.storage?.getItem?.("appTheme") || "light";
      setAppTheme(nextTheme === "dark" ? "dark" : "light");
    };

    syncTheme();
    window.addEventListener("app-theme-changed", syncTheme);
    window.addEventListener("focus", syncTheme);
    return () => {
      window.removeEventListener("app-theme-changed", syncTheme);
      window.removeEventListener("focus", syncTheme);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktopLayout(window.innerWidth >= 940);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktopLayout) {
      setDesktopSelectedUser(null);
    }
  }, [isDesktopLayout]);

  useEffect(() => {
    if (activeFooter === "Status") {
      setActiveFooter("Chats");
    }
  }, [activeFooter, setActiveFooter]);


  const handleDeselectAll = () => {
    // Call your function to deselect all users here
    setSelectionMode(false); // This will deactivate the selection mode
    setSelectedUsers([]); // Clear the selected users
  };

  const handleClearCallSelection = () => {
    setCallsSelectionMode(false);
    setSelectedCallIds([]);
  };

  const handleDeleteCalls = () => {
    if (!selectedCallIds.length) return;
    const remaining = (calls || []).filter((call) => !selectedCallIds.includes(call.id));
    setCalls(remaining);
    try {
      globalThis.storage?.setItem?.("calls", JSON.stringify(remaining));
    } catch (error) {
      console.error("Failed to persist calls after delete:", error);
    }
    handleClearCallSelection();
  };

  const fetchUsers = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        console.log("No token found");
        history.push('/login');
        return;
      }
      //console.log("Checking for user updates...");
  
      const storedUsers = readJSON('usersMain', []);
  
      // Create timestamps array from stored users
      const timestamps = storedUsers.map(user => ({
        id: user.id,
        updatedAt: user.updatedAt || new Date(0).toISOString() // fallback to very old date
      }));
  

      const response = await api.allUsers(host, timestamps);
  
      if (response.ok) {
        const data = await response.json();
        const { userDetails, currentUserId } = data;
  
        if (userDetails.length === 0) {
          //console.log("No user updates");
          return;
        }
  
        // Merge updated users into storedUsers
        const updatedUserMap = new Map(userDetails.map(u => [u.id, u]));
        const mergedUsers = storedUsers.map(user => {
          const updated = updatedUserMap.get(user.id);
        
          if (!updated) return user; // If no updated user, keep as-is
        
          return {
            ...user,
            name: updated.name ?? user.name,
            email: updated.email ?? user.email,
            gender: updated.gender ?? user.gender,
            dob: updated.dob ?? user.dob,
            location: updated.location ?? user.location,
            updatedAt: updated.updatedAt ?? user.updatedAt,
            avatar: updated.profilePic || img,
            About: updated.About || user.About,
              publicKey:updated.publicKey || user.publicKey,

            
          };
        });
  
        // Add any new users not already in local storage
        const newUsers = userDetails
          .filter(u => !storedUsers.some(su => su.id === u.id))
          .map(u => ({
            id: u.id,
            name: u.name,
            avatar: u.profilePic || u.avatar || img,
            lastMessage: 'No messages yet',
            timestamp: '',
            unreadCount: 0,
            phoneNumber: u.phoneNumber || null,
            updatedAt: u.updatedAt,
            gender:u.gender,
            dob:u.dob,
            Location:u.location,
            About:u.About,
            publicKey:u.publicKey
          }));
  
        const finalUserList = [...mergedUsers, ...newUsers];
  
        setUsersMain(finalUserList);
        setUsersMaintest(finalUserList);
        writeJSON('usersMain', finalUserList);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [history, host, readJSON, writeJSON]);
  
  async function sendPublicKeyToBackend(userId) {
    let currentUser = readJSON('currentuser', null);
    if (!currentUser) {
      try {
        const res = await api.getUser(host);
        const json = await res.json();
        if (json.success) {
          currentUser = json.userResponse;
          writeJSON("currentuser", currentUser);
        }
      } catch (err) {
        console.error("Failed to fetch user for key check:", err);
      }
    }
    const prevToken = currentUser?.publicKey || null;
    const prevPrivateKey = globalThis.storage.getItem('privateKey') || null;
    const storedHash = currentUser?.privateKeyHash || null;

    if (prevToken && prevPrivateKey) {
      try {
        const localHash = await hashPrivateKey(prevPrivateKey);
        if (storedHash && storedHash === localHash) {
          return { message: 'Keys exist and hash matches.' };
        }
        if (!storedHash) {
          const res = await api.updateKey(host, prevToken, localHash);
          if (res.ok && currentUser) {
            currentUser.privateKeyHash = localHash;
            writeJSON("currentuser", currentUser);
          }
          return { message: 'Stored private key hash.' };
        }
      } catch (err) {
        console.error("Key hash check failed:", err);
      }
    }
  
    // Generate new key pair
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
  if (!response.ok) throw new Error("❌ Failed to update public key on backend");

  const result = await response.json();

  

  if (result.success) {
    if (currentUser) {
      currentUser.publicKey = pem;
      currentUser.privateKeyHash = privateKeyHash;
      globalThis.storage.setItem("currentuser", JSON.stringify(currentUser));
    }
    globalThis.storage.setItem("privateKey", JSON.stringify(jwk));

  }
  
    return result;
  }
  
  
  
  function convertSpkiToPem(spkiBuffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(spkiBuffer)));
  const formatted = base64.match(/.{1,64}/g)?.join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}

  const loadMessages = async () => {
    let mainMessages = [];
    if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
      try {
        await getmessages();
        const results = await messagesRef.current;
        
     //console.log("main messages",JSON.stringify(results))
        mainMessages = results.map(row => ({
          id: row.id,
          sender: row.sender,
          recipient: row.recipient,
          content: row.content || null,
          timestamp: new Date(row.timestamp).toISOString(),
          status: row.status,
          read: row.read,
          isDeleted: row.isDeleted || 0,
          isDownload: row.isDownload || 0, // Binary data of the file
          file_name: row.file_name || null,
          file_type: row.file_type || null,
          file_size: row.file_size || null,
          thumbnail: row.thumbnail || null, // Generate or add thumbnail later, if needed
          file_path: row.file_path || null,
          type: row.type || 'message',
          isSent: row.isSent || 0,
          isError: row.isError || 0,
          encryptedMessage: row.encryptedMessage || null,
          encryptedAESKey: row.encryptedAESKey || null,
          isReplyTo: row.isReplyTo || null

          
        }));
      } catch (err) {
        console.error('Error retrieving messages from SQLite:', err);
        return [];
      }
    } else {
       await getmessages();
       
      mainMessages = messagesRef.current
   
     //console.log("main messages",mainMessages)
    }
  
    const latestMessages = {};
    const unreadCountsMap = {};
   
    for (const message of mainMessages) {
     
      const otherUserId = message.sender === currentUserId ? message.recipient : message.sender;

 
  const users = globalThis.storage.readJSON('usersMain', []);

      // Check if the user exists in `usersMain`
      const filteredUsers = users.filter((user) => user.id);

      // Check if a user with the specified `otherUserId` exists in the filtered list
      let userExists = filteredUsers.some((user) => user.id === otherUserId);
 
      if (!userExists) {
      if(!otherUserId) return 
        // Fetch the user's details if they don't exist in `usersMain`
        const response = await api.fetchUser(host, otherUserId);
        const data = await response.json();
console.log("Fetched user details for missing user:", data);
        if (response.ok && data.success) {
          const { userResponse } = data;
  
          const newUser = {
            id: userResponse.id,
            name: userResponse.name,
            avatar: userResponse.profilePic || img,  // Assuming profilePhoto contains the image URL or base64 string
            lastMessage: message.content,
            timestamp: message.timestamp,
            unreadCount: 1, // This message is unread for the new user
            phoneNumber: userResponse.phoneNumber || null,
            updatedAt: userResponse.updatedAt,
            gender:userResponse.gender,
            dob:userResponse.dob,
            Location:userResponse.location,
            About:userResponse.About,
              publicKey:userResponse.publicKey,
          };
        

          // Add the new user to `usersMain` and localStorage
          setUsersMain(prevUsers => {
            // Ensure no duplicates by filtering out users with the same id
            const updatedUsers = [...prevUsers, newUser].filter((user, index, self) =>
              index === self.findIndex((u) => u.id === user.id)
            );
            updatedUsers.forEach(user => {
              const { profilePhoto, ...otherDetails } = user;
              //console.log("User details (without photo) in homescreen:", otherDetails);
            });
          

            globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
            return updatedUsers;
          });
         setUsersMaintest((prevUsers) => {
            // Ensure no duplicates by filtering out users with the same id
            const updatedUsers = [
              ...prevUsers,
              newUser
            ].filter((user, index, self) => index === self.findIndex((u) => u.id === user.id)); // Ensuring no duplicates
            
      
            return updatedUsers;
          });
          
  
          userExists = true; // Mark as exists for further processing
        } else {
          console.error("Failed to fetch user details");
        }
      }
  
      if (userExists) {
      
        // Update latest message and unread count for the existing user
        if (!latestMessages[otherUserId] || new Date(message.timestamp) > new Date(latestMessages[otherUserId].timestamp)) {
        
          latestMessages[otherUserId] = message;
         
        }
        if (message.read === 0 && message.sender !== currentUserId) {
          unreadCountsMap[otherUserId] = (unreadCountsMap[otherUserId] || 0) + 1;
        }
   
      }
    }
    
    setUnreadCounts(unreadCountsMap);
  
    // Update `usersMain` and sort by latest message timestamp
    setUsersMain((prevUsers) => {
      const updatedUsers1 = prevUsers.map(user => {
        const newMsg = latestMessages[user.id];
        const hasNewMessage = Boolean(newMsg);
    
        return {
          ...user,
          lastMessage: hasNewMessage 
            ? newMsg.content 
            : user.lastMessage || "No messages yet",
    
          timestamp: hasNewMessage 
            ? newMsg.timestamp 
            : user.timestamp,
    
          unreadCount: unreadCountsMap[user.id] || 0,
        };
      });

    
      globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers1));
    
      return updatedUsers1; // ✅ You missed this passed!
    });
   setUsersMaintest((prevUsers) => {
      // Map through the users and update based on latest messages and unread counts
      const updatedUsers1 = prevUsers.map(user => {
        const newMsg = latestMessages[user.id]; // Retrieve the latest message for the user
        const hasNewMessage = Boolean(newMsg);  // Check if a new message exists for the user
    
        // Update user details based on whether there’s a new message
        return {
          ...user,
          lastMessage: hasNewMessage 
            ? newMsg.content  // Set new message content if exists
            : user.lastMessage || "No messages yet",  // Default message if no new message
    
          timestamp: hasNewMessage 
            ? newMsg.timestamp  // Update timestamp if there's a new message
            : user.timestamp,   // Keep the original timestamp if no new message
    
          unreadCount: unreadCountsMap[user.id] || 0,  // Set unread count for the user
        };
      });
    
      // Persist the updated users array to localStorage
    //  globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers1));
    
      // Return the updated users list to update Zustand state
      return updatedUsers1;
    });
    
    
  };
  
  const updateMessage = async (message) => {
    if (isPlatform('hybrid')) {
      // Hybrid platform (e.g., mobile app with Capacitor or Cordova)
      try {
        const defaultValues = {
          isSent: 1,
          isError: 0,
          isDeleted: 0,
          isDownload: 0,
          content: '',
          file_name: '',
          file_type: null,
          file_size: 0,
          thumbnail: null,
          file_path: '',
          timestamp: new Date().toISOString(),
          status: 'pending',
          read: 0,
          isReplyTo: null,
        };

        const updatedMessage = {
          id: message.id,
          sender: message.sender,
          recipient: message.recipient,
          content: message.content || defaultValues.content,
          timestamp: message.timestamp || defaultValues.timestamp,
          status: message.status || defaultValues.status,
          read: message.read !== undefined ? message.read : defaultValues.read,
          isDeleted: message.isDeleted !== undefined ? message.isDeleted : defaultValues.isDeleted,
          isDownload: message.isDownload !== undefined ? message.isDownload : defaultValues.isDownload,
          file_name: message.file_name || defaultValues.file_name,
          file_type: message.file_type || defaultValues.file_type,
          file_size: message.file_size !== undefined ? message.file_size : defaultValues.file_size,
          thumbnail: message.thumbnail || defaultValues.thumbnail,
          file_path: message.file_path || defaultValues.file_path,
          isError: message.isError !== undefined ? message.isError : defaultValues.isError,
          isSent: message.isSent !== undefined ? message.isSent : defaultValues.isSent,
          isReplyTo: message.isReplyTo ?? defaultValues.isReplyTo,

        };
        // Update message in SQLite (Cordova/Capacitor app)
        const db = await openSQLiteDatabase(); // Assume you have a function that opens the SQLite database
        const updateQuery = `
          UPDATE messages SET
            content = ?, 
            timestamp = ?, 
            status = ?, 
            read = ?, 
            isDeleted = ?, 
            isDownload = ?, 
            file_name = ?, 
            file_type = ?, 
            file_size = ?, 
            thumbnail = ?, 
            file_path = ?, 
            isError = ?, 
            isSent = ?,
            isReplyTo = ?
          WHERE id = ?
        `;
  
        const values = [
          updatedMessage.content, 
          updatedMessage.timestamp, 
          updatedMessage.status, 
          updatedMessage.read, 
          updatedMessage.isDeleted, 
          updatedMessage.isDownload, 
          updatedMessage.file_name, 
          updatedMessage.file_type, 
          updatedMessage.file_size, 
          updatedMessage.thumbnail, 
          updatedMessage.file_path, 
          updatedMessage.isError, 
          updatedMessage.isSent, 
          updatedMessage.isReplyTo,
          updatedMessage.id
        ];
  
        await db.executeSql(updateQuery, values);
        //console.log("Updated message in SQLite:", message);
      } catch (err) {
        console.error("Error updating message in SQLite:", err);
      }
    } else if (isPlatform('web')) {
      // Web platform (e.g., desktop or browser)
      try {
        const users = readJSON('usersMain', []);
  
        // Update message in localStorage
        const updatedUsers = users.map(user => {
          if (user.id === message.sender || user.id === message.recipient) {
            user.lastMessage = message.content;
            user.timestamp = message.timestamp;
            
            // If the message is unread, increment unread count for the user
            if (message.read === 0 && message.sender !== currentUserId) {
              user.unreadCount = (user.unreadCount || 0) + 1;
            }
          }
          return user;
        });
  
        // Save back to localStorage
        writeJSON('usersMain', updatedUsers);
        //console.log("Updated message in localStorage:", message);
      } catch (err) {
        console.error("Error updating message in localStorage:", err);
      }
    } else {
      console.error("Unsupported platform");
    }
  };
  
  
  const handleUserClick = async(user) => {
    //console.log("click the main user ",JSON.stringify(user.id))
    setSelectedUser1(user);
    selectedUser1.current = user.id

    if (isDesktopLayout) {
      setDesktopSelectedUser(user);
      return;
    }

    history.push('/chatwindow', { userdetails: user, callback: 'goBackToUserList',currentUserId });
  };
  
  // Reset selected user to go back to the user list
  const goBackToUserList = () => {
    setSelectedUser1(null);
    if (selectedUser1?.current) {
      selectedUser1.current = null;
    }
    setDesktopSelectedUser(null);
  };

  const handleGroupClick = (group) => {
    if (isDesktopLayout) {
      setDesktopSelectedGroup(group);
      return;
    }
    history.push('/group-chatwindow', { groupdetails: group });
  };

  const goBackToGroupList = () => {
    setDesktopSelectedGroup(null);
  };

  const toggleMenu = () => setMenuVisible(prev => !prev);
  const closeMenu = () => setMenuVisible(false);
  const logout = async () =>{
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.logout(host, refreshToken);
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      await clearTokens();
      history.push('/login')
    }
  }

  const handleSelectChat = (chatId) => {
    // Toggle chat selection
    setSelectedChats((prevSelectedChats) => {
      if (prevSelectedChats.includes(chatId)) {
        return prevSelectedChats.filter(id => id !== chatId);
      } else {
        return [...prevSelectedChats, chatId];
      }
    });
  };

  const handleUnselectAll = () => {
    setSelectedChats([]);
  };

  const handleArchive = async() => {
    //console.log("Archive button clicked");
  
    let usersMain = readJSON("usersMain", []);
  
    // Archive and mute logic update
    const updatedUsers = usersMain.map(user => {
      if (selectedUsers.includes(user.id)) {
        const currentArchiveStatus = user.isArchive || false;
        const newArchiveStatus = !currentArchiveStatus;
  
        return {
          ...user,
          isArchive: newArchiveStatus,
          isMuted: newArchiveStatus // Mute if archived, unmute if not
        };
      }
      return user;
    });
  
    // Determine new muted list based on isMuted flags
    const updatedMutedUsers = updatedUsers.reduce((acc, user) => {
      if (user.isMuted && selectedUsers.includes(user.id)) {
        if (!acc.includes(user.id)) acc.push(user.id);
      } else {
        acc = acc.filter(id => id !== user.id);
      }
      return acc;
    }, globalThis.storage.readJSON("mutedUsers", null) || []);
  
    // Save to localStorage
    writeJSON("usersMain", updatedUsers);
    writeJSON("mutedUsers", updatedMutedUsers);
    // Update states
    setUsersMain(updatedUsers);
    setmutedList(updatedMutedUsers);
    setMenuVisible(prev => !prev);
    
       await Toast.show({
        text: 'Archived and synced mute',
        duration: 'short',
      });
  
    //console.log(`Toggled archive and synced mute for: ${selectedUsers.join(', ')}`);
  };
  
  const handleDeleteChat = () => {
    setShowModal(true);
    //console.log("Delete Chat button clicked");
  };
  
  
  const handleConfirmAction = () => {
    // Confirm the action (delete, archive, or share)
    setShowAlert(false);
    // Proceed with the actual action like deleting, archiving, or sharing
    //console.log(`Performing action on selected chats: ${selectedChats}`);
    setSelectedChats([]); // Reset selected chats after action
  };

  const handleAction = (action) => {
    // Handle the action based on user choice
    if (action === 'delete') {
      setAlertMessage('Are you sure you want to delete the selected chats?');
    } else if (action === 'archive') {
      setAlertMessage('Are you sure you want to archive the selected chats?');
    } else if (action === 'share') {
      setAlertMessage('Are you sure you want to share the selected chats?');
    }
    setShowAlert(true);
  };

  const handleCancel = () => {
    setShowModal(false); // Close the modal without any action
  };

  const handlePartialDelete = async () => {
    let usersMain = readJSON("usersMain", []);
  
    const selectedUserIds = selectedUsers
  //console.log("selectedUserIds",selectedUserIds);
    const updatedUsers = usersMain.map(user => {
      if (selectedUserIds.includes(user.id)) {
        return { ...user, isPartialDelete: true };
      }
      return user;
    });
  
    writeJSON("usersMain", updatedUsers);
    setUsersMain(updatedUsers);
  
    //console.log(`Marked users ${selectedUserIds.join(', ')} as partially deleted`);
  
    setShowModal(false); // Close the modal
      setSelectedChats([]); 
           await Toast.show({
            text: 'User hided successfully',
            duration: 'short',
          });
      
  };
  
  const handleWipeChat = async() => {
    //console.log("Wipe the chat completely");
  
    const selectedUserIds = selectedUsers // Get all selected user IDs
  
    // Web (Browser)
    if (!isPlatform('web')) {
      //console.log("Web platform detected");
  
      // Remove matching users from 'userMain'
      const userMain = readJSON("usersMain", null);
 
  if (Array.isArray(userMain)) {
    const FilteruserMain = userMain.filter(user => !selectedUserIds.includes(user.id));
    writeJSON("usersMain", FilteruserMain);
    // console.log("Filtered usersMain in localStorage");
      setUsersMain(FilteruserMain);
  }
  
  
      // Remove messages related to selected users
      let messages = readJSON("messages", []);
      messages = messages.filter(
        msg => !selectedUserIds.includes(msg.sender) && !selectedUserIds.includes(msg.recipient)
      );
      writeJSON("messages", messages);
      //console.log("Deleted messages related to selected users from localStorage");
    }
  
    // Android (Hybrid)
    if (isPlatform('hybrid')) {
      const userMain = readJSON("usersMain", null);
     if (Array.isArray(userMain)) {
       const FilteruserMain  = userMain.filter(user => !selectedUserIds.includes(user.id));
    writeJSON("usersMain", FilteruserMain);
    // console.log("Filtered usersMain in localStorage");
    setUsersMain(FilteruserMain);
  }

  
      // Run SQL delete for each selected user
      db.transaction(tx => {
        selectedUserIds.forEach(userId => {
          const query = `
            DELETE FROM messages
            WHERE sender = ? OR recipient = ?;
          `;
          tx.executeSql(
            query,
            [userId ,userId],
            (_, result) => {
              console.log(`✅ Deleted messages for user ${userId}`);
            },
            (_, error) => {
              console.error(`❌ Error deleting messages for user ${userId}:`, error);
              return false;
            }
          );
        });
      });
    }

    setSelectedChats([]); 
         await Toast.show({
          text: 'successfully deleted users',
          duration: 'short',
        });
    
    setShowModal(false); // Close the modal
  };
  const toggleMute = async() => {
    setmutedList(prevMutedUsers => {
      // selectedUsers already contains IDs
      const selectedUserIds = selectedUsers;
  //console.log("selected users",selectedUserIds)
      // Toggle mute status for each selected user
      const updatedMutedUsers = selectedUserIds.reduce((acc, userId) => {
        if (acc.includes(userId)) {
          // If already muted, remove the ID
          return acc.filter(id => id !== userId);
        } else {
          // If not muted, add the ID
          return [...acc, userId];
        }
      }, [...prevMutedUsers]); // Start with previous muted users
 // console.log("updated muted users",updatedMutedUsers)
      // Update localStorage with the updated muted users
      writeJSON('mutedUsers', updatedMutedUsers);

      return updatedMutedUsers; // Return the updated state
    });
 
        await  Toast.show({
          text: 'user toggle muted',
          duration: 'short',
        });
    
  };

  const markAllChatsRead = useCallback(() => {
    const nextUsers = (readJSON("usersMain", []) || []).map((entry) => ({
      ...entry,
      unreadCount: 0,
    }));
    writeJSON("usersMain", nextUsers);
    setUsersMain(nextUsers);
    if (typeof setUsersMaintest === "function") {
      setUsersMaintest(nextUsers);
    }
    if (typeof setUnreadCounts === "function") {
      setUnreadCounts({});
    }
  }, [readJSON, writeJSON, setUsersMain, setUsersMaintest, setUnreadCounts]);

  const handlePrimaryAction = useCallback(() => {
    history.push(activeFooter === "Group" ? "/newgroup" : "/newchat");
  }, [activeFooter, history]);

  
  
  const headerTitle = activeFooter === "Calls" ? "Calls" : activeFooter === "Group" ? "People" : "Messages";
  const headerSubtitle = activeFooter === "Calls"
    ? `${(calls || []).length} call logs`
    : activeFooter === "Group"
      ? `${(groupsMain || []).length} active groups`
      : unreadNotifications > 0
        ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? "" : "s"}`
        : "No unread notifications";

  const homeHeader = (
    <div className="home-screen-header">
      <div className="home-screen-title-wrap">
        {selectionMode && activeFooter !== "Calls" ? (
          <MdOutlineCancel size={25} className="icon" onClick={handleDeselectAll} style={{ fontSize: '24px', cursor: 'pointer' }} />
        ) : callsSelectionMode && activeFooter === "Calls" ? (
          <MdOutlineCancel size={25} className="icon" onClick={handleClearCallSelection} style={{ fontSize: '24px', cursor: 'pointer' }} />
        ) : (
          <>
            <img src={user?.profilePhoto || '/img.jpg'} alt="name" className="home-screen-avatar" />
            <div className="home-screen-copy">
              <h5 className="home-screen-title">{headerTitle}</h5>
              <div className="home-screen-subtitle">{headerSubtitle}</div>
            </div>
          </>
        )}
      </div>

      <div className="home-screen-actions">
        {selectionMode && activeFooter !== "Calls" ? (
          <>
            <button type="button" className="text-danger rounded-[10px] bg-neutral-primary border border-danger hover:bg-danger hover:text-white focus:ring-4 focus:ring-neutral-tertiary font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none" onClick={handleDeleteChat} title="Delete">
              <RiDeleteBin5Fill size={18} />
            </button>
            <button type="button" className="text-fg-brand bg-neutral-primary rounded-[10px] border border-brand hover:bg-brand hover:text-white focus:ring-4 focus:ring-brand-subtle font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none" onClick={toggleMute} title="Toggle Mute">
              <FaVolumeMute size={18} />
            </button>
            <div className="menu-anchor" onClick={(e) => e.stopPropagation()}>
              <FaEllipsisV className="icon" onClick={toggleMenu} />
              {menuVisible && (
                <div
                  className="floating-menu flex flex-col position-absolute bg-white shadow rounded p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="btn" onClick={handleArchive}>Archive </button>
                  <button className="btn" >Block</button>
                </div>
              )}
            </div>
          </>
        ) : callsSelectionMode && activeFooter === "Calls" ? (
          <button
            type="button"
            className="text-danger rounded-[10px] bg-neutral-primary border border-danger hover:bg-danger hover:text-white focus:ring-4 focus:ring-neutral-tertiary font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none"
            onClick={handleDeleteCalls}
          >
            <RiDeleteBin5Fill size={18} />
          </button>
        ) : (
          <>
            {canCreateChat || activeFooter === "Group" ? (
              <button type="button" className="home-screen-action-btn" onClick={handlePrimaryAction}>
                <FaRegEdit size={16} />
              </button>
            ) : null}
            {!connected && <MdOutlinePortableWifiOff size={20} />}
            <div className="menu-anchor" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="home-screen-action-btn" onClick={toggleMenu}>
                <FaEllipsisV className="icon" />
              </button>
              {menuVisible && (
                <div
                  className="floating-menu position-absolute bg-white shadow rounded p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="btn" onClick={(e) => {
                    e.currentTarget.blur();
                    setMenuVisible(false);
                    history.push('/Profile');
                  }}>Profile Settings</button>
                  <button className="btn"  onClick={(e) => {
                    e.currentTarget.blur();
                    setMenuVisible(prev => !prev);
                    history.push('/Archived');
                  }}>Archived Chats</button>
                  <button className="btn"  onClick={(e) => {
                    e.currentTarget.blur();
                    setMenuVisible(false);
                    history.push('/AdminChat');
                  }}>Help</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const chatsContent = (
    <UserMain
      usersMain={usersMain}
      history={history}
      onUserClick={handleUserClick}
      currentUserId={currentUserId}
      mode={mode}
      setMode={setMode}
      selectedUsers={selectedUsers}
      setSelectedUsers={setSelectedUsers}
      selectionMode={selectionMode}
      setSelectionMode={setSelectionMode}
      handleSwipe={handleSwipe}
      handleUserClick={handleUserClick}
      mutedUsers={mutedUsers}
      setmutedList={setmutedList}
      goBackToUserList={goBackToUserList}
      statusSection={<Status variant="home" />}
      onMarkAllRead={markAllChatsRead}
      appTheme={appTheme}
    />
  );

  const mainBodyContent = (
    <>
      {activeFooter === 'Group' && (
        <Group
          groupsMain={groupsMain}
          setGroupsMain={setGroupsMain}
          db={db}
          mutedGroupIds={mutedGroupIds}
          setMutedGroupIds={setMutedGroupIds}
          onDeleteGroupLocal={onDeleteGroupLocal}
          onGroupClick={handleGroupClick}
          selectedGroupId={desktopSelectedGroup?.id || null}
          appTheme={appTheme}
        />
      )}

      {activeFooter === 'Chats' && chatsContent}

      {activeFooter === 'Calls' && (
        <Calls
          calls={calls}
          setCalls={setCalls}
          usersMain={usersMain}
          selectionMode={callsSelectionMode}
          setSelectionMode={setCallsSelectionMode}
          selectedCallIds={selectedCallIds}
          setSelectedCallIds={setSelectedCallIds}
        />
      )}
    </>
  );

  const desktopRightContent = activeFooter === "Group" ? (
    desktopSelectedGroup ? (
      <div className="desktop-chat-embed-shell">
        <GroupChatWindow
          db={db}
          socket={socket}
          usersMain={usersMain}
          groupsMain={groupsMain}
          setGroupsMain={setGroupsMain}
          groupMessagesByGroup={groupMessagesByGroup}
          setGroupMessagesByGroup={setGroupMessagesByGroup}
          mutedGroupIds={mutedGroupIds}
          setMutedGroupIds={setMutedGroupIds}
          onActiveGroupChange={onActiveGroupChange}
          appTheme={appTheme}
          embedded
          embeddedGroup={desktopSelectedGroup}
          onEmbeddedBack={goBackToGroupList}
        />
      </div>
    ) : (
      <div className="desktop-home-placeholder">
        <h3 className="desktop-home-placeholder-title">Select a group</h3>
        <p className="desktop-home-placeholder-copy">
          Pick any group from the middle column to open the current group chat here.
        </p>
      </div>
    )
  ) : activeFooter !== "Chats" ? (
    <div className="desktop-home-placeholder">
      <h3 className="desktop-home-placeholder-title">
        {activeFooter === "Calls" ? "Calls" : "People"}
      </h3>
      <p className="desktop-home-placeholder-copy">
        {activeFooter === "Calls"
          ? "Your call history stays in the center column on larger screens."
          : "People and groups stay in the center column here. Open a chat from Messages to use the right pane."}
      </p>
    </div>
  ) : desktopSelectedUser ? (
    <div className="desktop-chat-embed-shell">
        <ChatWindow
          db={db}
          socket={socket}
        setMessages={setMessages}
        saveMessage={saveMessage}
        selectedUser={selectedUser}
        messagesRef={messagesRef}
        blockUser={blockUser}
        unblockUser={unblockUser}
        blockedUsers={blockedUsers}
        setMessagestest={setMessagestest}
        messages={messages}
        storeMessageInSQLite={storeMessageInSQLite}
        setmutedList={setmutedList}
        setUsersMain={setUsersMain}
        host={host}
        customSounds={customSounds}
        setCustomSounds={setCustomSounds}
          embedded
          embeddedUser={desktopSelectedUser}
          onEmbeddedUserChange={setDesktopSelectedUser}
          onEmbeddedBack={goBackToUserList}
        />
    </div>
  ) : (
    <div className="desktop-home-placeholder">
      <h3 className="desktop-home-placeholder-title">Select a chat</h3>
      <p className="desktop-home-placeholder-copy">
        Pick any conversation from the middle column to open the current chat window here.
      </p>
    </div>
  );

  return (
    <IonContent
      className={`home-screen-page home-theme-${appTheme}`}
      style={{ minHeight: '100vh', backgroundColor: '#0c1220' }}
      onClick={() => {
        if (menuVisible) closeMenu();
      }}
    >
      <div className="home-screen-shell">
        {isDesktopLayout ? (
          <DesktopHomeLayout
            appTheme={appTheme}
            user={user}
            activeFooter={activeFooter}
            setActiveFooter={setActiveFooter}
            hasUnreadChats={hasUnreadChats}
            hasUnreadCalls={(calls || []).some((call) => call?.read === false)}
            hasUnreadGroups={hasUnreadGroups}
            onPrimaryAction={handlePrimaryAction}
            onSettingsClick={() => history.push('/settings')}
            onProfileClick={() => history.push('/Profile')}
            showPrimaryAction={canCreateChat}
            header={homeHeader}
            middleContent={mainBodyContent}
            rightContent={desktopRightContent}
          />
        ) : (
          <>
            {homeHeader}

            <div className="home-screen-body">
              {mainBodyContent}
            </div>
          </>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 w-96 relative">
              <button
                onClick={handleCancel}
                className=" top-2 right-2 text-red hover:text-red-700"
                title="Close"
              >
                <IonIcon icon={closeCircleOutline} size="large" />
              </button>

              <h2 className="text-xl font-semibold mb-4 text-gray-800">Are you sure you want to delete this chat?</h2>
              <p className="text-gray-700 mb-4">
                If you want, you can delete the chat but keep the messages.
              </p>
              <div className="flex space-x-4 text-gray-700">
                <button
                  onClick={handleWipeChat}
                  className="w-1/2 py-2 px-4 bg-red-500 text-black rounded-lg hover:bg-red-600"
                >
                  Wipe it
                </button>
                <button
                  onClick={handlePartialDelete}
                  className="w-1/2 py-2 px-4 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600"
                >
                  Partial Delete
                </button>
              </div>
              <button
                onClick={handleCancel}
                className="mt-4 w-full py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {!isDesktopLayout && (
        <Footer
          activeFooter={activeFooter}
          setActiveFooter={setActiveFooter}
          hasUnreadChats={hasUnreadChats}
          hasUnreadGroups={hasUnreadGroups}
          hasUnreadCalls={(calls || []).some((call) => call?.read === false)}
          onPrimaryAction={handlePrimaryAction}
          onSettingsClick={() => history.push('/settings')}
          appTheme={appTheme}
          showPrimaryAction={canCreateChat}
        />
      )}
       <IonLoading
        isOpen={false}
        message={'Loading...'}
        duration={0}
      /> 
      <IonAlert isOpen={showAlert} message={alertMessage} buttons={[{ text: 'Ok', handler: () => setShowAlert(false) }]} />
    </IonContent>
  );
};

export default HomeScreen;

