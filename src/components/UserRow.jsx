import React, { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import img from '/img.jpg';
import { FaBellSlash } from 'react-icons/fa';
import './UserRow.css';
const UserRow = React.memo(({ user, isActiveSwipe, action, onSwipe, onClick, selectedUsers, setSelectedUsers, selectionMode, setSelectionMode, mutedUsers, swipeFeedback }) => {
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
        marginBottom: '10px',
        overflow: 'hidden',

        transform: isActiveSwipe
          ? 'translateX(100%)' // Fixed to translate right for swipe action
          : isSwiped
          ? `translateX(${swipeDirection === 'left' ? '-100%' : '100%'})` // Move based on swipe direction
          : 'translateX(0)', // Return to original position
        transition: 'transform 0.3s ease',
        backgroundColor: isSelected ? 'rgb(79 ,255 ,231)' : '#ecfdff', // Highlight selected users
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
        className="rounded-circle"
        style={{ marginRight: '10px', width: '48px', height: '48px' ,aspectRatio: '4/3'}}
      />
      <div className="flex-grow-1">
        <h6 className="mb-0 user-name">{user.name}</h6>
        {mutedUsers && mutedUsers.includes(user.id) && (
          <FaBellSlash
            className="ms-2"
            style={{ color: 'gray', fontSize: '0.9rem' }}
            title="Muted"
          />
        )}
        {user.lastMessage && (
        <small className="text-muted last-message">  {user.lastMessage.length > 20
    ? user.lastMessage.slice(0, 20) + '...'
    : user.lastMessage}</small>)}
      </div>
      <div className="text-right">
        {user.unreadCount > 0 && <span className="badge " style={{backgroundColor:'rgb(43, 45, 49)'}}>{user.unreadCount}</span>}
        <small className="text-muted timestamp d-block">
          {user.timestamp ? new Date(user.timestamp).toLocaleTimeString() : ''}
        </small>
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
