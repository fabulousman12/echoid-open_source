import React, { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import img from '/img.jpg';
import { FaBellSlash, FaCheckDouble } from 'react-icons/fa';
import './UserRow.css';
const UserRow = React.memo(({ user, isActiveSwipe, action, onSwipe, onClick, selectedUsers, setSelectedUsers, selectionMode, setSelectionMode, mutedUsers, swipeFeedback, appTheme }) => {
  const [isSwiped, setIsSwiped] = useState(false);  // Track swipe completion
  const [swipeDirection, setSwipeDirection] = useState('');  // Track swipe direction
  const timeoutRef = useRef(null);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      onSwipe('Left', user);
      setSwipeDirection('left');  // Set swipe direction to left
      setIsSwiped(true);  // Trigger recoil effect
      setTimeout(() => setIsSwiped(false), 600);  // Reset swipe state after recoil duration
    },
    onSwipedRight: () => {
      onSwipe('Right', user);
      setSwipeDirection('right');  // Set swipe direction to right
      setIsSwiped(true);  // Trigger recoil effect
      setTimeout(() => setIsSwiped(false), 600);  // Reset swipe state after recoil duration
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  const handlePressStart = () => {
    timeoutRef.current = setTimeout(() => {
      console.log('Long press detected');
      setSelectionMode(true);
      toggleSelect();
    }, 1000); // Long press after 600ms
  };

  const handlePressEnd = () => {
    clearTimeout(timeoutRef.current);
  };

  const toggleSelect = () => {
    const updatedSelectedUsers = selectedUsers.includes(user.id)
      ? selectedUsers.filter(id => id !== user.id)
      : [...selectedUsers, user.id];

    setSelectedUsers(updatedSelectedUsers);

    if (updatedSelectedUsers.length === 0) {
      setSelectionMode(false);  // Exit selection mode if no user is selected
    }
  };

  const handleClick = () => {
    if (selectionMode) {
      console.log('Selection mode active', selectionMode);
      toggleSelect(); // If already in selection mode, click means select/unselect
    } else {
      console.log('Selection mode active not', user);
      onClick(user); // Else normal click behavior
    }
  };

  const isSelected = selectedUsers.includes(user.id);
  const hasUnread = Number(user.unreadCount || 0) > 0;
  const previewText = String(user.lastMessage || '');
  const isTyping = /^typing/i.test(previewText);
  const baseBackground = appTheme === "dark" ? '#121a2d' : '#ffffff';
  const selectedBackground = appTheme === "dark" ? '#18274a' : '#eef1ff';

  const formatTimestamp = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const isSameDay = date.toDateString() === now.toDateString();
    if (isSameDay) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Determine the background color based on the action type
  const getActionColor = (action) => {
    switch (action) {
      case 'open-chat':
        return '#007bff'; // Blue for open chat
      case 'archive':
        return '#6f42c1'; // Purple for archiving
      case 'call':
        return '#28a745'; // Green for call
      case 'video-call':
        return '#17a2b8'; // Light blue for video call
      default:
        return '#6c757d'; // Default gray if no action
    }
  };

  return (
    <div
      className="list-group-item user-card d-flex justify-content-between align-items-center"
      style={{
        position: 'relative',
        overflow: 'hidden',
        transform: isActiveSwipe
          ? 'translateX(100%)' // Fixed to translate right for swipe action
          : isSwiped
          ? `translateX(${swipeDirection === 'left' ? '-100%' : '100%'})` // Move based on swipe direction
          : 'translateX(0)', // Return to original position
        transition: 'transform 0.3s ease',
        backgroundColor: isSelected ? selectedBackground : baseBackground,
        animation: isSwiped ? `${swipeDirection === 'left' ? 'leftRecoil' : 'rightRecoil'} 0.6s ease-in-out` : '', // Apply recoil effect based on direction
      }}
      {...handlers}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onClick={handleClick}
    >
      <img
        src={user.avatar || img}
        alt={`${user.name}'s avatar`}
         loading="lazy"
        className="user-row-avatar"
      />
      <div className="flex-grow-1 user-row-copy">
        <div className="user-row-topline">
          <h6 className="mb-0 user-name">{user.name}</h6>
          <small className="timestamp d-block">
            {formatTimestamp(user.timestamp)}
          </small>
        </div>
        {mutedUsers && mutedUsers.includes(user.id) && (
          <FaBellSlash
            className="user-row-muted"
            title="Muted"
          />
        )}
        {user.lastMessage && (
          <div className={`last-message ${isTyping ? 'last-message--typing' : ''}`}>
            {!hasUnread && !isTyping && <FaCheckDouble className="user-row-read-icon" />}
            <span>
              {previewText.length > 36 ? `${previewText.slice(0, 36)}...` : previewText}
            </span>
          </div>
        )}
      </div>
      <div className="text-right user-row-meta">
        {hasUnread && <span className="badge unread-badge-modern">{user.unreadCount}</span>}
        {user.isActive !== false && <span className="user-row-online" />}
      </div>

      {isActiveSwipe && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: getActionColor(action), // Dynamically set color based on action
            color: '#fff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            zIndex: -1,
            fontSize: '1.2rem',
            fontWeight: 'bold',
          }}
        >
          {swipeFeedback}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.user.unreadCount === nextProps.user.unreadCount &&
    prevProps.user.lastMessage === nextProps.user.lastMessage &&
    prevProps.isActiveSwipe === nextProps.isActiveSwipe &&
    prevProps.action === nextProps.action &&
    prevProps.selectedUsers === nextProps.selectedUsers
  );
});

export default UserRow;
