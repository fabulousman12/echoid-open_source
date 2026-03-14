
import  { useState,useRef,useEffect } from "react"
import "./Settings.css"
import { useHistory } from 'react-router';
import data from '../data.ts'
import Maindata from '../data';
import './original_settings.css'
import { GoBlocked } from "react-icons/go";
import { RiAdminFill } from "react-icons/ri";
//port { FaBellSlash } from 'react-icons/fa';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { BellOff, Volume2, Upload, Play, Pause, X } from 'lucide-react';
import { api } from "../services/api";
import { getRefreshToken, clearTokens } from "../services/authTokens";
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser';
export default function SettingsPage({ ForAllSounfds, setForAllSounds, setismute, isnotmute, mode, setMode, messagesRef,setCurrentUser, adminUnread}) {
  const host = `https://${Maindata.SERVER_URL}`;
  const SUPPORT_URL = "https://buymeachai.ezee.li/Fabulousman";
  const [activeCategory, setActiveCategory] = useState(null)
  const [theme, setTheme] = useState("light")
  const [notificationSounds, setNotificationSounds] = useState(["Default Sound", "Alert Tone"])
  const [isDarkMode, setIsDarkMode] = useState(false)
 
  const [selectedSound, setSelectedSound] = useState("")
 //onst [view, setView] = useState('main');
  const [notificationsEnabled, setNotificationsEnabled] = useState(isnotmute);
  
  const [appver , setappver] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [fontSize, setFontSize] = useState("medium");
const [bubbleStyle, setBubbleStyle] = useState("rounded");
const [readReceipts, setReadReceipts] = useState(true);
const [timestampFormat, setTimestampFormat] = useState("12hr");
    const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);


  const [storageStats, setStorageStats] = useState({
    total: 0,
    image: 0,
    video: 0,
    audio: 0,
    document: 0,
  });
  const history = useHistory()
  const formattedDate = new Date(data.UpdatedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const mutedUserIds = globalThis.storage.readJSON('mutedUsers', []);
const userMainList = globalThis.storage.readJSON('usersMain', []);

// Filter full user objects whose ID exists in mutedUsers
const mutedUsers = userMainList.filter(user => mutedUserIds.includes(user.id));
console.log(mutedUsers);
  useEffect(() => {
    const saved = globalThis.storage.getItem('chatThemeColor');
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const savedTheme = globalThis.storage.getItem("appTheme") || "light";
    const isDark = savedTheme === "dark";
    setIsDarkMode(isDark);
    if (typeof document !== "undefined") {
      document.body.classList.toggle("dark-theme", isDark);
    }
  }, []);

  useEffect(() => {
    const saved = globalThis.storage.getItem("chatUISettings");
    if (saved) {
      const s = JSON.parse(saved);
      setFontSize(s.fontSize || "medium");
      setBubbleStyle(s.bubbleStyle || "rounded");
      setReadReceipts(s.readReceipts !== false);
      setTimestampFormat(s.timestampFormat || "12hr");
      handleThemeChange(s.theme || themes[0]);
      const storedMode = globalThis.storage.getItem("mode");
      handleModeChange(storedMode || s.mode || "normal");
    }
  }, []);
  

  useEffect(() => {

    setappver(data.AppVersion)
    if (messagesRef.current) {
      const stats = { total: 0, image: 0, video: 0, audio: 0, document: 0 };
      messagesRef.current.forEach(msg => {
        if (msg.type === 'file') {
          const size = msg.file_size || 0;
          stats.total += size;
          stats[msg.file_type] += size;
        }
      });
      setStorageStats(stats);
    }
  }, [messagesRef]);
const onBackToHome = () => {
  
    history.goBack();
}



useEffect(() => {
  const handleAudioSelected = async (event) => {
    const { name, type, preview } = event.detail;
    console.log("🎵 Picked audio:", name, type);

    try {

      if(ForAllSounfds.path){
   try {
          const oldPath = ForAllSounfds.path.replace('file://', '');
          await Filesystem.deleteFile({
            path: oldPath,
            directory: Directory.Documents,
          });
          console.log("🗑️ Deleted old sound:", oldPath);
        } catch (delErr) {
          console.warn("⚠️ Could not delete old sound:", delErr);
        }
      }
      const folder = 'files/userowned/audios';
      const fileName = `${Date.now()}_${name}`;

      // Save to permanent storage
      const savedFile = await Filesystem.writeFile({
        path: `${folder}/${fileName}`,
        data: preview.split(',')[1], // strip base64 prefix
        directory: Directory.Documents,
        recursive: true,
      });

      const newSound = {
        name,
        type,
        path: savedFile.uri,
      };

      // Persist for later
      globalThis.storage.setItem('ForAllSoundNotification', JSON.stringify(newSound));

      setForAllSounds(newSound);
      console.log("✅ Audio saved:", newSound.path);
    } catch (err) {
      console.error("❌ Error saving audio:", err);
    }
  };

  window.addEventListener('AudioSelected', handleAudioSelected);
  return () => window.removeEventListener('AudioSelected', handleAudioSelected);
}, []);
  const handleLogout = async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.logout(host, refreshToken);
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      globalThis.storage.removeItem('currentuser');
      await clearTokens();
      setCurrentUser(null);
      history.push('/login');
    }
  };

  const handleWatchSupportAd = () => {
    try {
      window.NativeAds?.showUnityRewardedAd?.();
    } catch (err) {
      console.error("Failed to open rewarded ad:", err);
    }
  };

  const handleDirectSupport = () => {
    try {
     openSupport();
    } catch (err) {
      console.error("Failed to open support link:", err);
    }
  };
  
   const openSupport = async () => {
      
      let  url= "https://buymeachai.ezee.li/Fabulousman"
        
         let broswer = InAppBrowser.create(url, '_blank', {
          location: 'no',
      hidden: 'no',
      clearcache: 'yes',
      clearsessioncache: 'yes',
      zoom: 'no',
      hardwareback: 'yes',
      mediaPlaybackRequiresUserAction: 'yes',
      });
      broswer.on('exit').subscribe(async () => {
        alert('Thanks for supporting us! 🎉'); 
      })
  
    };
  
const handleSoundUpload = async () => {
  try {
    // Call native picker
    window.NativeAds.pickAudioNative();
  } catch (err) {
    console.error("❌ Error opening audio picker:", err);
  }
};
  const handleThemeChange = (themeObj) => {
    setTheme(themeObj.background);
    globalThis.storage.setItem('chatThemeColor', themeObj.background);
  };

  const handleNotificationToggle = () => {
    const value = !notificationsEnabled;
    setNotificationsEnabled(value);
    globalThis.storage.setItem('ismute', JSON.stringify(value));
    setismute(value);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    globalThis.storage.setItem('mode', newMode);
    try {
      const saved = globalThis.storage.getItem("chatUISettings");
      const s = saved ? JSON.parse(saved) : {};
      s.mode = newMode;
      globalThis.storage.setItem("chatUISettings", JSON.stringify(s));
    } catch {
      // ignore malformed JSON
    }
  };

    const handleUnmuteUser = (userId) => {
      const updatedMutedUsers = mutedUserIds.filter(id => id !== userId);
      globalThis.storage.setItem('mutedUsers', JSON.stringify(updatedMutedUsers));
      setSelectedUsers(prev => prev.filter(id => id !== userId)); // Remove from selected users if unmuted
    };
  
    const handleClearMutedUsers = () => {
      if (window.confirm('Are you sure you want to clear all muted users?')) {
        globalThis.storage.setItem('mutedUsers', JSON.stringify([]));
        setSelectedUsers([]);
      }
    };
    
    const resetToDefaults = () => {
      setFontSize("medium");
      setBubbleStyle("rounded");
      setReadReceipts(true);
      setTimestampFormat("12hr");
      // Also reset theme and mode if needed
    };
    
    const saveSettings = () => {
      const settings = {
        fontSize,
        bubbleStyle,
        readReceipts,
        timestampFormat,
        theme,
        mode,
      };
      globalThis.storage.setItem("chatUISettings", JSON.stringify(settings));
      alert("Settings saved!");
    };
    
      const handleLongPress = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const formatSize = size => `${(size / 1024 / 1024).toFixed(2)} MB`;


  const toggleTheme = () => {
    const nextIsDark = !isDarkMode;
    setIsDarkMode(nextIsDark);
    globalThis.storage.setItem("appTheme", nextIsDark ? "dark" : "light");
    if (typeof document !== "undefined") {
      document.body.classList.toggle("dark-theme", nextIsDark);
    }
  }

  const removeSound = (index) => {
    setNotificationSounds(notificationSounds.filter((_, i) => i !== index))
  }

  const handlePlaySound = async () => {
  try {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // Convert file:// URI to web-safe localhost URL
    const safeUrl = Capacitor.convertFileSrc(ForAllSounfds.path);
    console.log("🎵 Safe URL:", safeUrl);

    const audio = new Audio(safeUrl);
    audioRef.current = audio;
    await audio.play();

    setIsPlaying(true);

    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);
  } catch (err) {
    console.error("Error playing sound:", err);
    setIsPlaying(false);
  }
};

  const removeMutedUser = (index) => {
    setMutedUsers(mutedUsers.filter((_, i) => i !== index))
  }

  const playSound = (soundName) => {
    console.log(`Playing sound: ${soundName}`)
  }

  const addSound = () => {
    if (selectedSound && !notificationSounds.includes(selectedSound)) {
      setNotificationSounds([...notificationSounds, selectedSound])
      setSelectedSound("")
    }
  }

  const renderHeader = () => (
    <div className="settings-header-top">
      <button className="back-btn-top" onClick={() => window.history.back()}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>
      <h1 className="settings-title">Settings</h1>
      <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
        {isDarkMode ? "☀️" : "🌙"}
      </button>
    </div>
  )

  const renderProfileSection = () => (
    <div className="profile-section">
      <div className="profile-avatars">
        <div className="avatar">
          <div className="avatar-placeholder" onClick={() => history.push('/Profile', { activeSection: 'profile' })}>👤</div>
        </div>
        <div className="avatar">
          <div className="avatar-placeholder">👥</div>
        </div>
        <div className="avatar add-avatar">
          <div className="avatar-placeholder ">+</div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="action-btn admin-chat-btn" onClick={() => history.push("/AdminChat")}>
          {adminUnread && <span className="admin-unread-dot" />}
          <span className="action-icon"><RiAdminFill /></span>
          <span>Admin Chat</span>
        </button>
        <button className="action-btn">
          <span className="action-icon">⭐</span>
          <span>Watchlist</span> 
        </button>
        <button className="action-btn"
                    onClick={() => history.push('/Blocklist')}
        >
          <span className="action-icon" 

          >
            <GoBlocked />
          </span>
          <span>Block list</span>
        </button>
      </div>
    </div>
  )

  const renderCategoriesList = () => (
    <div className="categories-list">
      {categories.map((category) => (
        <button key={category.id} className="category-item" onClick={() => setActiveCategory(category.id)}>
          <div className="category-left">
            <span className="category-icon">{category.icon}</span>
            <h3>{category.title}</h3>
          </div>
          <span className="arrow">›</span>
        </button>
      ))}
    </div>
  )

  const renderLogoutSection = () => (
    <div className="logout-section">
      <button className="logout-btn" onClick={() => handleLogout()}>Logout</button>
    </div>
  )

  const renderMain = () => (
    <div className="settings-main">
      {renderHeader()}
      {renderProfileSection()}
      {renderCategoriesList()}
      {renderLogoutSection()}
    </div>
  )

  const renderDetailHeader = () => (
    <button className="back-btn" onClick={() => setActiveCategory(null)}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 19l-7-7 7-7"></path>
      </svg>
      <span className="back-text">Back</span>
    </button>
  )

  const renderNotifications = () => (
    <div className="settings-content">
      <h2>Notification Settings</h2>
      <div className="setting-item">
        <div className="setting-header">
          <span>Push Notifications</span>
          <input type="checkbox" checked={notificationsEnabled} className="toggle" onChange={handleNotificationToggle} />
        </div>
      </div>
      <div className="setting-item">
        <div className="setting-header">
          <span>Email Notifications</span>
          <input type="checkbox" defaultChecked className="toggle" />
        </div>
      </div>
      <div className="setting-item">
        <div className="setting-header">
          <span>Sound</span>
          <input type="checkbox" defaultChecked className="toggle" />
        </div>
      </div>
      <div className="setting-item">
        <div className="setting-header">
          <span>Vibration</span>
          <input type="checkbox" className="toggle" />
        </div>
      </div>

      <div className="setting-section">
        <h3 className="section-title">Notification Sounds</h3>
       <div className="notification-card-header">
                  <div className="notification-icon-wrapper">
                    <Volume2 className="notification-icon" size={24} />
                  </div>
                  <div className="notification-card-content">
                    <h3 className="notification-title">Notification Sound</h3>
                    <p className="notification-description">
                      Customize your notification alert sound
                    </p>
                  </div>
                </div>

   {ForAllSounfds?.path ? (
     <div className="flex items-center justify-between bg-gray-800 rounded-2xl p-3 mt-3 shadow-md w-full">
       {/* Left: sound details */}
       <div className="flex items-center space-x-3 overflow-hidden">
         <div className="bg-blue-500/20 p-2 rounded-full">
           <Volume2 size={20} className="text-blue-400" />
         </div>
   
         <div className="flex flex-col overflow-hidden">
           <span className="text-white font-medium truncate max-w-[120px]">
             {ForAllSounfds.name.length > 10
               ? `${ForAllSounfds.name.substring(0, 10)}...`
               : ForAllSounfds.name}
           </span>
           <span className="text-gray-400 text-sm">Current notification sound</span>
         </div>
       </div>
   
       {/* Right: action buttons */}
       <div className="flex items-center space-x-2 flex-shrink-0">
         <button
           className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition"
           onClick={handlePlaySound}
           title={isPlaying ? 'Pause' : 'Play'}
         >
           {isPlaying ? <Pause size={18} /> : <Play size={18} />}
         </button>
   
         <button
           className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition"
           onClick={async () => {
             globalThis.storage.removeItem('ForAllSoundNotification');
             globalThis.storage.removeItem('ForAllSoundNotification');
             setForAllSounds(null);
             console.log('🗑️ Sound removed successfully');
           }}
           title="Remove sound"
         >
           <X size={18} />
         </button>
       </div>
     </div>
   )  : (
               <button className=" add-sound-btn" onClick={handleSoundUpload}>
                 <Upload size={20} />
                 <span>Upload Custom Sound</span>
               </button>
             )}
      </div>

      <div className="setting-section">
        <h3 className="section-title">Muted Users</h3>
        <div className="muted-users-list">
        <div className="notification-card-content">
             
              <p className="notification-description">
                {mutedUsers.length === 0
                  ? ''
                  : `${mutedUsers.length} conversation${mutedUsers.length > 1 ? 's' : ''} muted`}
              </p>
            </div>
            {mutedUsers.length > 0 && (
              <button onClick={handleClearMutedUsers} className="clear-all-button">
                Clear All
              </button>
            )}
              <div className="muted-users-list">
                        {mutedUsers.length === 0 ? (
                          <div className="empty-state">
                            <BellOff size={48} className="empty-state-icon" />
                            <p className="empty-state-text">No muted conversations</p>
                            <p className="empty-state-subtext">Long press any chat to mute notifications</p>
                          </div>
                        ) : (
                          mutedUsers.map((user) => (
                            <div
                              key={user.id}
                              className={`muted-user-item ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                              onClick={() => handleUnmuteUser(user.id)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                handleLongPress(user.id);
                              }}
                            >
                              <div className="muted-user-avatar-wrapper">
                                <img
                                  src={user.avatar || 'https://via.placeholder.com/48'}
                                  alt={`${user.name}'s avatar`}
                                  loading="lazy"
                                  className="muted-user-avatar"
                                />
                                <div className="muted-badge">
                                  <BellOff size={12} />
                                </div>
                              </div>
                              <div className="muted-user-content">
                                <h6 className="muted-user-name">{user.name}</h6>
                                <small className="muted-user-message">{user.lastMessage}</small>
                              </div>
                              <div className="muted-user-meta">
                                {user.unreadCount > 0 && (
                                  <span className="unread-badge">{user.unreadCount}</span>
                                )}
                                <small className="muted-user-time">
                                  {user.timestamp ? new Date(user.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </small>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
        </div>
      </div>
    </div>
  )

  const themes = [
  { background: "#1A1A2E", name: "Dark Blue" },
  { background: "#461220", name: "Wine Red" },
  { background: "#192A51", name: "Steel Blue" },
  { background: "#F7B267", name: "Soft Orange" },
  { background: "#F25F5C", name: "Coral Red" },
  { background: "#231F20", name: "Charcoal" }
];
  const renderUISettings = () => (
    <div className="settings-content">
      <h2>UI Settings</h2>
      <div className="setting-item">
        <label>Theme</label>
        <div className="theme-selector">
          {themes.map((t, i) => (
            <div
              key={i}
              className="theme-swatch"
              style={{ backgroundColor: t.background }}
              onClick={() => handleThemeChange(t)}
              title={t.name}
            />
          ))}
        </div>

        <div className="theme-preview" style={{ backgroundColor: theme }}>
          Chat Preview
        </div>
      </div>
      <div className="setting-item">
        <label>Mode</label>
          <div className="mode-buttons">
          <button
            className={mode === "normal" ? "selected" : ""}
            onClick={() => handleModeChange("normal")}
          >
            Normal
          </button>
          <button
            className={mode === "swipe" ? "selected" : ""}
            onClick={() => handleModeChange("swipe")}
          >
            Swipe
          </button>
        </div>
      </div>
      <div className="setting-item">
        <label>Font Size</label>
         <select
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
        >
          <option value="small">Small</option>
          <option value="medium">Medium (default)</option>
          <option value="large">Large</option>
        </select>
      </div>
        <div className="setting-item">
        <label>Chat Bubble Style</label>
         <div className="bubble-style-buttons">
          <button
            className={bubbleStyle === "rounded" ? "selected" : ""}
            onClick={() => setBubbleStyle("rounded")}
          >
            Rounded
          </button>
          <button
            className={bubbleStyle === "square" ? "selected" : ""}
            onClick={() => setBubbleStyle("square")}
          >
            Square
          </button>
        </div>
      </div>
        <div className="setting-item">
        <label>Read Receipts</label>
           <label>
          <input
            type="checkbox"
            checked={readReceipts}
            onChange={() => setReadReceipts(!readReceipts)}
          />
          Show read receipts
        </label>
      </div>
         <div className="setting-item">
        <label>Timestamp Format</label>
        <select
          value={timestampFormat}
          onChange={(e) => setTimestampFormat(e.target.value)}
        >
          <option value="12hr">12-hour (e.g., 2:00 PM)</option>
          <option value="24hr">24-hour (e.g., 14:00)</option>
        </select>
      </div>
         <div className="setting-item">
       <div className="settings-actions">
          <button onClick={resetToDefaults} className="reset-button">
            Reset to Defaults
          </button>
          <button onClick={saveSettings} className="save-button">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
  const types = ["image", "video", "audio", "document"]

  const renderStorage = () => (
    <div className="settings-content">
      <h2>Storage Information</h2>
      <div className="storage-item">
        <div className="storage-header">
          <span>Used Storage</span>
          <span className="storage-value">{storageStats.total} mb</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: "60%" }}></div>
        </div>
      </div>
      <div className="storage-breakdown">
        <div className="breakdown-item">
          <span>Photos & Videos</span>
          <span>{storageStats['image'] + storageStats['video']}mb</span>
        </div>
        <div className="breakdown-item">
          <span>Documents</span>
          <span>{storageStats['document']} mb</span>
        </div>
        <div className="breakdown-item">
          <span>Audio</span>
          <span>{storageStats['audio']}mb</span>
        </div>
      </div>
      <button className="clear-btn">Clear Cache</button>
    </div>
  )

  const renderAbout = () => (
    <div className="settings-content">
            <div >
          <h3 className="customtext">Technologies Used</h3>
          <ul className="customtext-secondary"style={{ paddingLeft: "20px",}}>
            <li>Ionic React Capacitor </li>
            <li>Node.js + Express</li>
            <li>WebSocket / Socket.IO</li>
            <li>MySQL & MongoDB</li>
            <li>SQLlite (for mobile offline storage)</li>
            <li>AWS S3 (for file storage)</li>
              <li> FCM and Pushy(for app killed state delivery )</li>
                  <li>Capsawesome OTA </li>
          </ul>
        </div>
   
         <div className="notification">
          <h3 className="customtext">Developer Notes</h3>
          <p className="customtext-secondary">
            This app was built to combine modern communication with efficient file sharing, 
            real-time messaging, and a polished UI inspired by WhatsApp and Telegram.
            Its an advise for now dont log-in from any-other device other wise you might break security keys
          </p>
        </div>
  <div className="notification-card">
          <h3 className="customtext">Creditqs</h3>
          <p className="customtext-secondary">
            Designed and developed by <strong>[Jit Chakraborty]</strong>
          </p>
        </div>
           <h2>About App</h2>
      <div className="about-item">
        <span>App Name</span>
        <span className="about-value">Swipe</span>
      </div>
      <div className="about-item">
        <span>Version</span>
        <span className="about-value">{appver}</span>
      </div>
      <div className="about-item">
        <span>Build test</span>
        <span className="about-value">{formattedDate}</span>
      </div>
      <div className="about-item">
        <span>Developer</span>
        <span className="about-value">Jit Chakraborty</span>
      </div>
      <button className="privacy-btn">Privacy Policy test</button>
      <button className="terms-btn">Terms of Service  </button>
    </div>
  )

  const renderSupport = () => (
    <div className="settings-content">
      <h2>Support Us</h2>
      <p className="support-intro">Help us keep this app free and improve status features.</p>
      <div className="support-card">
        <h3 className="support-card-title">Watch and Support</h3>
        <p className="support-card-text">Watch a rewarded ad to support development.</p>
        <button className="support-primary-btn" onClick={handleWatchSupportAd}>
          Watch Ad
        </button>
      </div>
      <div className="support-card support-card-alt">
        <h3 className="support-card-title">Support Directly</h3>
        <p className="support-card-text">Prefer no ads? Use direct support.</p>
        <button className="support-secondary-btn" onClick={handleDirectSupport}>
          Open Support Page
        </button>
      </div>
    </div>
  )

  const renderDetail = () => {
    const categoryId = activeCategory
    let content = null

    if (categoryId === "notifications") content = renderNotifications()
    else if (categoryId === "ui") content = renderUISettings()
    else if (categoryId === "storage") content = renderStorage()
    else if (categoryId === "about") content = renderAbout()
    else if (categoryId === "support") content = renderSupport()

    return (
      <div className="settings-detail">
        {renderDetailHeader()}
        {content}
      </div>
    )
  }

  const categories = [
    { id: "notifications", title: "Notifications", icon: "N" },
    { id: "ui", title: "UI Settings", icon: "UI" },
    { id: "storage", title: "Storage", icon: "S" },
    { id: "about", title: "About", icon: "i" },
    { id: "support", title: "Support", icon: "+" },
  ]

  return (
    <div className={`settings-container ${isDarkMode ? "dark-theme" : ""}`}>
      {activeCategory === null ? renderMain() : renderDetail()}
    </div>
  )
}


