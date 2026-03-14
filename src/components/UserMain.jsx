import React, { useEffect, useState, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import UserRow from './UserRow'; // path to the file where you created the memoized component
import './UserRow.css'
import Lottie from "lottie-react";
import sticker from "../assets/Astronaut - Light Theme.json";
const SearchBar = React.memo(({ value, visible, onChange, onKeyDown, onClear, onFocus, inputRef }) => (
  <div
    className={`modern-search-bar flex items-center gap-2 transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
    }`}
  >
    <input
      ref={inputRef}
      type="text"
      className="modern-search-input flex-1 px-4 py-2 rounded-full backdrop-blur-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-500 shadow-sm"
      placeholder="Search users..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
    {value && (
      <button
        type="button"
        className="search-btn hover:bg-slate-700 text-white px-3 py-2 rounded-full transition-all shadow-sm flex items-center justify-center"
        style={{ backgroundColor: 'rgb(43, 45, 49)' }}
        onClick={onClear}
        aria-label="Clear search"
      >
        ×
      </button>
    )}
    <button
      type="button"
      className="search-btn hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-all shadow-sm flex items-center justify-center"
      style={{ backgroundColor: 'rgb(43, 45, 49)' }}
      onClick={onFocus}
      aria-label="Focus search"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"
        />
      </svg>
    </button>
  </div>
));

const UserMain = ({ usersMain, onUserClick, currentUserId, selectedUsers, setSelectedUsers, selectionMode, setSelectionMode, setmutedList, mutedUsers, mode, setMode }) => {
  const [activeSwipeId, setActiveSwipeId] = useState(null);
  const [action, setAction] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // debounced term
  const deferredSearch = useDeferredValue(searchTerm);
  const [swipeFeedback, setSwipeFeedback] = useState(''); // To store the swipe feedback text
  const lastScrollTopRef = useRef(0);
  const [showSearchBar, setShowSearchBar] = useState(true);
  const scrollTimeoutRef = useRef(null);
  const [isLoad, setIsLoad] = useState(false);
  
useEffect(() => {
  const container = document.getElementById('user-list-container');
  if (!container) return;

  let lastScrollTop = 0;
  let scrollTimeout;

  const handleScroll = () => {
    const scrollTop = container.scrollTop;

    if (scrollTop > lastScrollTop + 10) setShowSearchBar(false);
    else if (scrollTop < lastScrollTop - 10) setShowSearchBar(true);

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => setShowSearchBar(true), 400);
  };

  container.addEventListener('scroll', handleScroll, { passive: true });
  return () => container.removeEventListener('scroll', handleScroll);
}, []);

  const searchInputRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 150);
    return () => clearTimeout(t);
  }, [searchInput]);

  
  useEffect(() => {
    setmutedList(globalThis.storage.readJSON('mutedUsers', []));
  }, []);






  const matchesUser = useCallback((user, term) => {
    if (!term) return true;
    const haystacks = [
      user?.name,
      user?.phoneNumber,
      user?.email,
      user?.lastMessage
    ]
      .filter(Boolean)
      .map((val) => String(val).toLowerCase());
    return haystacks.some((val) => val.includes(term));
  }, []);

  const filteredAndSortedUsers = useMemo(() => {
    const term = (deferredSearch || '').toLowerCase();
    return [...(usersMain || [])]
      .filter(user =>
        matchesUser(user, term) &&
        !user.isArchive &&
        user.id !== currentUserId
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [usersMain, deferredSearch, currentUserId, matchesUser]); // Sort by most recent timestamp

  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchInput('');
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSearchKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleSearchClear();
    }
  }, [handleSearchClear]);


  const handleSwipe = useCallback((direction, user) => {
    setActiveSwipeId(user.id);
    setAction(direction); // Set action to direction (left or right)

    // Update swipe feedback based on the direction of the swipe
    if (direction === 'Left') {
      setSwipeFeedback('Archive Chat'); // Feedback for swipe from right to left
    } else if (direction === 'Right') {
      setSwipeFeedback('Open Chat'); // Feedback for swipe from left to right
    }

    setTimeout(() => {
      setActiveSwipeId(null);
      setAction('');
      setSwipeFeedback('');

      if (mode === 'swipe') {
        if (direction === 'Left') {
          // Archive chat on swipe from right to left
      
          // Call the function to archive the chat (e.g., onArchiveChat)
        } else if (direction === 'Right') {
          // Open chat window on swipe from left to right
         
          onUserClick(user);  // This can be your custom function to open the chat window
        }
      }
    }, 200); // Reset swipe state after 2 seconds
  }, [mode, onUserClick]);

  const handleClick = useCallback((user) => {
    if (mode === 'normal') {
      // In normal mode, open chat window on click
      onUserClick(user);
    }
  }, [mode, onUserClick]);

  const handleCallAction = useCallback((direction, user) => {
    if (mode === 'normal') {
      // In normal mode, swiping left or right triggers call actions (calls and video calls)
      if (direction === 'Left') {
        setSwipeFeedback('Video Call');
        // Initiate video call or other actions

      } else if (direction === 'Right') {
        setSwipeFeedback('Voice Call');
        // Initiate voice call or other actions
      
      }
    }
    setTimeout(() => {
      setActiveSwipeId(null);
      setAction('');
      setSwipeFeedback('');
    }, 200); // Reset swipe state after a short delay
  }, [mode]);

  // Add dummy users to the list
  // for (let i = 1; i <= 15; i++) {
  //   filteredAndSortedUsers.push({
  //     id: `dummy-${i}`,
  //     name: `Dummy User ${i}`,
  //     timestamp: new Date().toISOString(),
  //     isArchive: false
  //   });
  // }

  // Optional: Re-sort the list after adding dummy users
  filteredAndSortedUsers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <>
    <div className="user-main-container">
       
      {/* Search Bar */}
      {showSearchBar && (
        <SearchBar
          value={searchInput}
          visible={showSearchBar}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          onClear={handleSearchClear}
          onFocus={() => searchInputRef.current?.focus()}
          inputRef={searchInputRef}
        />
      )}


      {/* User List - Scrolling */}
      <div className="user-list-container"  id="user-list-container">
        <div className="list-group">
          {/* Render filtered and sorted users */}
          {filteredAndSortedUsers &&  filteredAndSortedUsers.map(user => (
            <UserRow
              key={user.id}
              user={user}
              isActiveSwipe={user.id === activeSwipeId}
              action={action}
              onSwipe={(direction) => {
                handleSwipe(direction, user); // Handle swipe direction (left or right)
                handleCallAction(direction, user); // Handle call actions based on swipe direction
              }}
              onClick={() => handleClick(user)} // Open chat window on click in normal mode
              mutedUsers={mutedUsers}
              setmutedList={setmutedList}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              swipeFeedback={swipeFeedback} // Passing feedback for the swipe
            />
          ))}
          {filteredAndSortedUsers && filteredAndSortedUsers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
    No users found.
       <Lottie
      animationData={sticker}
      loop={true}
      style={{ width: 280, height: 280 }}
    />
  </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default React.memo(UserMain);

