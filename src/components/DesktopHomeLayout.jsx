import React from "react";
import { FaCommentAlt, FaPhoneAlt, FaPlus, FaUsers, FaCog } from "react-icons/fa";

const DesktopHomeLayout = ({
  appTheme,
  user,
  activeFooter,
  setActiveFooter,
  hasUnreadChats,
  hasUnreadCalls,
  hasUnreadGroups,
  onPrimaryAction,
  onSettingsClick,
  onProfileClick,
  showPrimaryAction = true,
  header,
  middleContent,
  rightContent,
}) => {
  return (
    <div className={`desktop-home desktop-home--${appTheme || "light"}`}>
      <aside className="desktop-home-rail">
        <button
          type="button"
          className={`desktop-home-rail-item ${activeFooter === "Chats" ? "active" : ""}`}
          onClick={() => setActiveFooter("Chats")}
          aria-label="Chats"
        >
          <span className="desktop-home-rail-icon">
            <FaCommentAlt size={16} />
            {hasUnreadChats && <span className="desktop-home-rail-dot" />}
          </span>
        </button>

        <button
          type="button"
          className={`desktop-home-rail-item ${activeFooter === "Calls" ? "active" : ""}`}
          onClick={() => setActiveFooter("Calls")}
          aria-label="Calls"
        >
          <span className="desktop-home-rail-icon">
            <FaPhoneAlt size={16} />
            {hasUnreadCalls && <span className="desktop-home-rail-dot" />}
          </span>
        </button>

        {showPrimaryAction ? (
          <button
            type="button"
            className="desktop-home-rail-primary"
            onClick={onPrimaryAction}
            aria-label="Create"
          >
            <FaPlus size={18} />
          </button>
        ) : null}

        <button
          type="button"
          className={`desktop-home-rail-item ${activeFooter === "Group" ? "active" : ""}`}
          onClick={() => setActiveFooter("Group")}
          aria-label="People"
        >
          <span className="desktop-home-rail-icon">
            <FaUsers size={16} />
            {hasUnreadGroups && <span className="desktop-home-rail-dot" />}
          </span>
        </button>

        <button
          type="button"
          className="desktop-home-rail-item"
          onClick={onSettingsClick}
          aria-label="Settings"
        >
          <span className="desktop-home-rail-icon">
            <FaCog size={16} />
          </span>
        </button>

        <div className="desktop-home-rail-spacer" />

        <button
          type="button"
          className="desktop-home-profile"
          onClick={onProfileClick}
          aria-label="Open profile"
        >
          <img
            src={user?.profilePhoto || user?.avatar || "/img.jpg"}
            alt="Your profile"
            className="desktop-home-profile-avatar"
          />
        </button>
      </aside>

      <section className="desktop-home-panel desktop-home-panel--middle">
        <div className="desktop-home-header">{header}</div>
        <div className="desktop-home-panel-body">{middleContent}</div>
      </section>

      <section className="desktop-home-panel desktop-home-panel--right">
        {rightContent}
      </section>
    </div>
  );
};

export default DesktopHomeLayout;
