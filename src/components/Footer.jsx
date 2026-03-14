// Footer.js
import React from 'react';
import { FaUserCircle, FaCommentDots, FaCog, FaPhoneAlt } from 'react-icons/fa';
import './Footer.css'; // Import the CSS for styles

const Footer = ({ activeFooter, setActiveFooter, hasUnreadCalls, hasUnreadGroups, hasUnreadChats }) => {
  return (
    <footer className="footer">
      <div
        className={`footer-item ${activeFooter === 'Group' ? 'active' : ''}`}
        onClick={() => setActiveFooter('Group')}
      >
        <span className="footer-icon">
          <FaUserCircle size={24} />
          {hasUnreadGroups && <span className="footer-dot" />}
        </span>
        <span>Groups</span>
      </div>
      <div
        className={`footer-item ${activeFooter === 'Chats' ? 'active' : ''}`}
        onClick={() => setActiveFooter('Chats')}
      >
        <span className="footer-icon">
          <FaCommentDots size={24} />
          {hasUnreadChats && <span className="footer-dot" />}
        </span>
        <span>Chats</span>
      </div>
     
      <div
        className={`footer-item ${activeFooter === 'Status' ? 'active' : ''}`}
        onClick={() => setActiveFooter('Status')}
      >
        <FaCog size={24} />
        <span>Status</span>
      </div>
       <div
        className={`footer-item ${activeFooter === 'Calls' ? 'active' : ''}`}
        onClick={() => setActiveFooter('Calls')}
      >
        <span className="footer-icon">
          <FaPhoneAlt size={22} />
          {hasUnreadCalls && <span className="footer-dot" />}
        </span>
        <span>Calls</span>
      </div>
    </footer>
  );
};

export default Footer;
