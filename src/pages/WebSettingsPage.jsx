import React from "react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  HardDrive,
  Info,
  LogOut,
  MessageSquare,
  MinusCircle,
  Moon,
  Palette,
  ShieldAlert,
  Sparkles,
  Star,
  Sun,
  User,
  Users,
} from "lucide-react";
import "./WebSettingsPage.css";

const bytesToLabel = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0 MB";
  return `${num.toFixed(2)} MB`;
};

export default function WebSettingsPage({
  isDarkMode,
  toggleTheme,
  activeCategory,
  setActiveCategory,
  categories,
  currentUser,
  adminUnread,
  notificationsEnabled,
  handleNotificationToggle,
  ForAllSounfds,
  isPlaying,
  handlePlaySound,
  handleSoundUpload,
  clearSound,
  mutedUsers,
  handleClearMutedUsers,
  themes,
  handleThemeChange,
  mode,
  handleModeChange,
  fontSize,
  setFontSize,
  bubbleStyle,
  setBubbleStyle,
  readReceipts,
  setReadReceipts,
  timestampFormat,
  setTimestampFormat,
  resetToDefaults,
  saveSettings,
  storageStats,
  appver,
  formattedDate,
  handleWatchSupportAd,
  handleDirectSupport,
  handleLogout,
  onGoHome,
  onOpenProfile,
  onOpenAdminChat,
  onOpenBlockList,
}) {
  const themeClass = isDarkMode ? "dark" : "light";
  const selectedCategory = activeCategory || "notifications";
  const safeCategories = Array.isArray(categories) ? categories : [];
  const currentName = currentUser?.name || "Chat User";
  const currentSubtitle = currentUser?.bio || currentUser?.about || "Manage your preferences";
  const profileAvatar = currentUser?.avatar || currentUser?.profilePhoto || currentUser?.profilePic || "/img.jpg";

  const renderQuickCard = (type) => {
    if (type === "admin") {
      return (
        <button type="button" className="web-settings-card web-settings-card--feature" onClick={onOpenAdminChat}>
          <div className="web-settings-card__icon">
            <ShieldAlert size={18} />
          </div>
          <div className="web-settings-card__content">
            <strong>Admin Chat</strong>
            <span>Direct encrypted channel for organizational announcements and support.</span>
          </div>
          {adminUnread ? <span className="web-settings-card__dot" /> : null}
        </button>
      );
    }

    if (type === "watchlist") {
      return (
        <div className="web-settings-side-stack">
          <button type="button" className="web-settings-card web-settings-card--compact">
            <div className="web-settings-card__icon">
              <Star size={18} />
            </div>
            <div className="web-settings-card__content">
              <strong>Watchlist</strong>
              <span>{mutedUsers.length} monitored users</span>
            </div>
          </button>
          <button type="button" className="web-settings-card web-settings-card--compact" onClick={onOpenBlockList}>
            <div className="web-settings-card__icon">
              <MinusCircle size={18} />
            </div>
            <div className="web-settings-card__content">
              <strong>Block list</strong>
              <span>Review blocked accounts</span>
            </div>
          </button>
        </div>
      );
    }

    return null;
  };

  const renderDetail = () => {
    if (selectedCategory === "notifications") {
      return (
        <div className="web-settings-panel">
          <div className="web-settings-panel__row">
            <div>
              <strong>Notifications</strong>
              <span>Manage push and email alerts</span>
            </div>
            <label className="web-settings-switch">
              <input type="checkbox" checked={notificationsEnabled} onChange={handleNotificationToggle} />
              <span />
            </label>
          </div>

          <div className="web-settings-panel__subcard">
            <div>
              <strong>Notification Sound</strong>
              <span>{ForAllSounfds?.name || "No custom notification sound selected"}</span>
            </div>
            <div className="web-settings-inline-actions">
              {ForAllSounfds?.path ? (
                <>
                  <button type="button" className="web-settings-mini-btn" onClick={handlePlaySound}>
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button type="button" className="web-settings-mini-btn web-settings-mini-btn--ghost" onClick={clearSound}>
                    Remove
                  </button>
                </>
              ) : (
                <button type="button" className="web-settings-mini-btn" onClick={handleSoundUpload}>
                  Upload
                </button>
              )}
            </div>
          </div>

          <div className="web-settings-panel__subcard">
            <div>
              <strong>Muted Conversations</strong>
              <span>{mutedUsers.length ? `${mutedUsers.length} muted conversation${mutedUsers.length > 1 ? "s" : ""}` : "No muted conversations"}</span>
            </div>
            {mutedUsers.length ? (
              <button type="button" className="web-settings-mini-btn web-settings-mini-btn--ghost" onClick={handleClearMutedUsers}>
                Clear All
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    if (selectedCategory === "ui") {
      return (
        <div className="web-settings-panel">
          <div className="web-settings-panel__row">
            <div>
              <strong>App Theme</strong>
              <span>Switch between dark and light appearance</span>
            </div>
            <div className="web-settings-pill-group">
              <button type="button" className={`web-settings-pill ${!isDarkMode ? "is-active" : ""}`} onClick={() => !isDarkMode || toggleTheme()}>
                Light
              </button>
              <button type="button" className={`web-settings-pill ${isDarkMode ? "is-active" : ""}`} onClick={() => isDarkMode || toggleTheme()}>
                Dark
              </button>
            </div>
          </div>

          <div className="web-settings-color-grid">
            {themes.map((item, index) => (
              <button
                key={`${item.name}-${index}`}
                type="button"
                className="web-settings-color-swatch"
                style={{ background: item.background }}
                title={item.name}
                onClick={() => handleThemeChange(item)}
              />
            ))}
          </div>

          <div className="web-settings-panel__row">
            <div>
              <strong>Chat Mode</strong>
              <span>Choose how interactions behave inside chat</span>
            </div>
            <div className="web-settings-pill-group">
              <button type="button" className={`web-settings-pill ${mode === "normal" ? "is-active" : ""}`} onClick={() => handleModeChange("normal")}>
                Normal
              </button>
              <button type="button" className={`web-settings-pill ${mode === "swipe" ? "is-active" : ""}`} onClick={() => handleModeChange("swipe")}>
                Swipe
              </button>
            </div>
          </div>

          <div className="web-settings-form-grid">
            <label className="web-settings-field">
              <span>Font Size</span>
              <select value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>

            <label className="web-settings-field">
              <span>Timestamp Format</span>
              <select value={timestampFormat} onChange={(e) => setTimestampFormat(e.target.value)}>
                <option value="12hr">12-hour</option>
                <option value="24hr">24-hour</option>
              </select>
            </label>

            <div className="web-settings-field">
              <span>Bubble Style</span>
              <div className="web-settings-pill-group">
                <button type="button" className={`web-settings-pill ${bubbleStyle === "rounded" ? "is-active" : ""}`} onClick={() => setBubbleStyle("rounded")}>
                  Rounded
                </button>
                <button type="button" className={`web-settings-pill ${bubbleStyle === "square" ? "is-active" : ""}`} onClick={() => setBubbleStyle("square")}>
                  Square
                </button>
              </div>
            </div>

            <div className="web-settings-panel__row web-settings-panel__row--compact">
              <div>
                <strong>Read Receipts</strong>
                <span>Show when your messages have been seen</span>
              </div>
              <label className="web-settings-switch">
                <input type="checkbox" checked={readReceipts} onChange={() => setReadReceipts(!readReceipts)} />
                <span />
              </label>
            </div>
          </div>

          <div className="web-settings-footer-actions">
            <button type="button" className="web-settings-mini-btn web-settings-mini-btn--ghost" onClick={resetToDefaults}>
              Reset
            </button>
            <button type="button" className="web-settings-mini-btn" onClick={saveSettings}>
              Save Settings
            </button>
          </div>
        </div>
      );
    }

    if (selectedCategory === "storage") {
      return (
        <div className="web-settings-panel">
          <div className="web-settings-panel__row">
            <div>
              <strong>Storage</strong>
              <span>{bytesToLabel(storageStats.total)} used in local app cache</span>
            </div>
            <span className="web-settings-kicker">Manage</span>
          </div>
          <div className="web-settings-meter">
            <span style={{ width: `${Math.min(100, Math.max(6, storageStats.total || 0))}%` }} />
          </div>
          <div className="web-settings-breakdown">
            <div><strong>{bytesToLabel((storageStats.image || 0) + (storageStats.video || 0))}</strong><span>Photos & Videos</span></div>
            <div><strong>{bytesToLabel(storageStats.audio || 0)}</strong><span>Audio</span></div>
            <div><strong>{bytesToLabel(storageStats.document || 0)}</strong><span>Documents</span></div>
          </div>
        </div>
      );
    }

    if (selectedCategory === "about") {
      return (
        <div className="web-settings-panel">
          <div className="web-settings-breakdown web-settings-breakdown--about">
            <div><strong>Swipe</strong><span>App Name</span></div>
            <div><strong>{appver || "Unknown"}</strong><span>Version</span></div>
            <div><strong>{formattedDate}</strong><span>Build Date</span></div>
          </div>
          <div className="web-settings-panel__subcard">
            <strong>About State Echo</strong>
            <span>Built with Ionic React, Capacitor, SQLite, Node.js, WebSocket delivery, and AWS-backed media storage.</span>
          </div>
        </div>
      );
    }

    if (selectedCategory === "support") {
      return (
        <div className="web-settings-panel">
          <div className="web-settings-panel__subcard">
            <strong>Watch and Support</strong>
            <span>Watch a rewarded ad to support development.</span>
            <button type="button" className="web-settings-mini-btn" onClick={handleWatchSupportAd}>
              Watch Ad
            </button>
          </div>
          <div className="web-settings-panel__subcard">
            <strong>Support Center</strong>
            <span>Prefer direct support without ads.</span>
            <button type="button" className="web-settings-mini-btn web-settings-mini-btn--ghost" onClick={handleDirectSupport}>
              Open Support
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const iconMap = {
    notifications: <Bell size={16} />,
    ui: <Palette size={16} />,
    storage: <HardDrive size={16} />,
    about: <Info size={16} />,
    support: <Sparkles size={16} />,
  };

  return (
    <div className={`web-settings web-settings--${themeClass}`}>
      <aside className="web-settings-sidebar">
        <div className="web-settings-sidebar__top">
          <div className="web-settings-sidebar__toprow">
            <div className="web-settings-brand">Settings</div>
            <button type="button" className="web-settings-home-btn" onClick={onGoHome}>
              <ArrowLeft size={15} />
              <span>Home</span>
            </button>
          </div>
          <span className="web-settings-caption">Manage your preferences</span>
        </div>

        <nav className="web-settings-nav">
          {safeCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`web-settings-nav__item ${selectedCategory === category.id ? "is-active" : ""}`}
              onClick={() => setActiveCategory(category.id)}
            >
              <span>{iconMap[category.id] || <ChevronRight size={16} />}</span>
              <span>{category.title}</span>
            </button>
          ))}
        </nav>

        <button type="button" className="web-settings-logout" onClick={handleLogout}>
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="web-settings-main">
        <header className="web-settings-main__header">
          <div>
            <div className="web-settings-main__eyebrow">Chat Settings</div>
            <h1>{safeCategories.find((item) => item.id === selectedCategory)?.title || "Settings"}</h1>
          </div>
          <div className="web-settings-main__controls">
            <button type="button" className="web-settings-circle" onClick={toggleTheme} title="Toggle theme">
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <section className="web-settings-hero">
          <button type="button" className="web-settings-hero__profile" onClick={onOpenProfile}>
            <img src={profileAvatar} alt={currentName} />
            <div>
              <strong>{currentName}</strong>
              <span>{currentSubtitle}</span>
            </div>
          </button>
          <div className="web-settings-hero__meta">
            <span><User size={14} /> Personal</span>
            <span><Users size={14} /> Active in groups</span>
          </div>
        </section>

        <section className="web-settings-grid">
          {renderQuickCard("admin")}
          {renderQuickCard("watchlist")}
        </section>

        <section className="web-settings-detail-card">
          {renderDetail()}
        </section>
      </main>
    </div>
  );
}
