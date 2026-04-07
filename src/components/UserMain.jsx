import React, { useEffect, useState, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import { FaSearch } from "react-icons/fa";
import UserRow from './UserRow';
import './UserRow.css';
import Lottie from "lottie-react";
import sticker from "../assets/Astronaut - Light Theme.json";

const SearchBar = React.memo(({ value, visible, onChange, onKeyDown, onClear, inputRef }) => (
  <div
    className={`modern-search-bar ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'}`}
  >
    <span className="modern-search-icon">
      <FaSearch size={14} />
    </span>
    <input
      ref={inputRef}
      type="text"
      className="modern-search-input"
      placeholder="Search conversations..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
    {value && (
      <button
        type="button"
        className="search-btn search-btn-clear"
        onClick={onClear}
        aria-label="Clear search"
      >
        x
      </button>
    )}
  </div>
));

const UserMain = ({
  usersMain,
  onUserClick,
  currentUserId,
  selectedUsers,
  setSelectedUsers,
  selectionMode,
  setSelectionMode,
  setmutedList,
  mutedUsers,
  mode,
  statusSection,
  onMarkAllRead,
  appTheme,
}) => {
  const [activeSwipeId, setActiveSwipeId] = useState(null);
  const [action, setAction] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [swipeFeedback, setSwipeFeedback] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(true);

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
  }, [setmutedList]);

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
    return (usersMain || [])
      .filter((user) =>
        matchesUser(user, term) &&
        !user.isArchive &&
        user.id !== currentUserId
      )
      .map((user) => ({
        ...user,
        _sortTimestamp: new Date(user?.timestamp || 0).getTime() || 0,
      }))
      .sort((a, b) => b._sortTimestamp - a._sortTimestamp);
  }, [usersMain, deferredSearch, currentUserId, matchesUser]);

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
    setAction(direction);

    if (direction === 'Left') {
      setSwipeFeedback('Archive Chat');
    } else if (direction === 'Right') {
      setSwipeFeedback('Open Chat');
    }

    setTimeout(() => {
      setActiveSwipeId(null);
      setAction('');
      setSwipeFeedback('');

      if (mode === 'swipe' && direction === 'Right') {
        onUserClick(user);
      }
    }, 200);
  }, [mode, onUserClick]);

  const handleClick = useCallback((user) => {
    if (mode === 'normal') {
      onUserClick(user);
    }
  }, [mode, onUserClick]);

  const handleCallAction = useCallback((direction) => {
    if (mode === 'normal') {
      if (direction === 'Left') setSwipeFeedback('Video Call');
      else if (direction === 'Right') setSwipeFeedback('Voice Call');
    }
    setTimeout(() => {
      setActiveSwipeId(null);
      setAction('');
      setSwipeFeedback('');
    }, 200);
  }, [mode]);

  return (
    <div className={`user-main-container user-main-container--${appTheme || "light"}`}>
      {showSearchBar && (
        <SearchBar
          value={searchInput}
          visible={showSearchBar}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          onClear={handleSearchClear}
          inputRef={searchInputRef}
        />
      )}

      {statusSection && <div className="user-main-status">{statusSection}</div>}

      <div className="user-main-section-head">
        <div className="user-main-section-title">Recent Chats</div>
        <button type="button" className="user-main-read-all" onClick={onMarkAllRead}>
          Mark all as read
        </button>
      </div>

      <div className="user-list-container" id="user-list-container">
        <div className="list-group">
          {filteredAndSortedUsers && filteredAndSortedUsers.map(user => (
            <UserRow
              key={user.id}
              user={user}
              isActiveSwipe={user.id === activeSwipeId}
              action={action}
              onSwipe={(direction) => {
                handleSwipe(direction, user);
                handleCallAction(direction, user);
              }}
              onClick={() => handleClick(user)}
              mutedUsers={mutedUsers}
              setmutedList={setmutedList}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              swipeFeedback={swipeFeedback}
              appTheme={appTheme}
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
  );
};

export default React.memo(UserMain);
