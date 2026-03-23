import React from "react";
import { FaCommentAlt, FaPhoneAlt, FaPlus, FaUsers, FaCog } from "react-icons/fa";
import "./Footer.css";

const Footer = ({
  activeFooter,
  setActiveFooter,
  hasUnreadCalls,
  hasUnreadGroups,
  hasUnreadChats,
  onPrimaryAction,
  onSettingsClick,
  appTheme,
  showPrimaryAction = true,
}) => {
  return (
    <footer className={`footer footer--${appTheme || "light"}`}>
      <button
        type="button"
        className={`footer-item ${activeFooter === "Chats" ? "active" : ""}`}
        onClick={() => setActiveFooter("Chats")}
      >
        <span className="footer-icon">
          <FaCommentAlt size={18} />
          {hasUnreadChats && <span className="footer-dot" />}
        </span>
        <span className="footer-label">Chats</span>
      </button>

      <button
        type="button"
        className={`footer-item ${activeFooter === "Calls" ? "active" : ""}`}
        onClick={() => setActiveFooter("Calls")}
      >
        <span className="footer-icon">
          <FaPhoneAlt size={18} />
          {hasUnreadCalls && <span className="footer-dot" />}
        </span>
        <span className="footer-label">Calls</span>
      </button>

      {showPrimaryAction ? (
        <button type="button" className="footer-primary" onClick={onPrimaryAction} aria-label="Create">
          <FaPlus size={22} />
        </button>
      ) : null}

      <button
        type="button"
        className={`footer-item ${activeFooter === "Group" ? "active" : ""}`}
        onClick={() => setActiveFooter("Group")}
      >
        <span className="footer-icon">
          <FaUsers size={18} />
          {hasUnreadGroups && <span className="footer-dot" />}
        </span>
        <span className="footer-label">People</span>
      </button>

      <button
        type="button"
        className="footer-item"
        onClick={onSettingsClick}
      >
        <span className="footer-icon">
          <FaCog size={18} />
        </span>
        <span className="footer-label">Settings</span>
      </button>
    </footer>
  );
};

export default Footer;
