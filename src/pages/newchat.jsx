import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonLoading } from '@ionic/react';
import { Contacts } from '@capacitor-community/contacts';
import { FaArrowLeft, FaPlus, FaSearch, FaTimes, FaUserCircle } from 'react-icons/fa';
import './NewChat.css';

const CONTACT_AVATAR = '/img.jpg';

const NewChat = () => {
  const [contactss, setContacts] = useState([]);
  const [, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSearchActive, setHeaderSearchActive] = useState(false);
  const history = useHistory();
  const headerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const isWeb =
      !globalThis?.Capacitor?.isNativePlatform?.() &&
      globalThis?.Capacitor?.getPlatform?.() !== 'ios' &&
      globalThis?.Capacitor?.getPlatform?.() !== 'android';

    const fetchContacts = async () => {
      try {
        setLoading(true);

        const result = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true,
          },
        });

        const formattedContacts = result.contacts
          .map((contact) => {
            const rawNumber = contact.phones?.[0]?.number || '';
            let cleanedNumber = rawNumber.replace(/\D/g, '');

            if (cleanedNumber.length >= 10) {
              cleanedNumber = cleanedNumber.slice(-10);
            } else {
              return null;
            }

            const finalNumber = '+91' + cleanedNumber;

            return {
              id: contact.contactId,
              name:
                contact.name?.display ||
                `${contact.name?.given || ''} ${contact.name?.family || ''}`.trim(),
              phoneNumber: finalNumber,
            };
          })
          .filter((contact) => contact !== null)
          .sort((a, b) => a.name.localeCompare(b.name));

        setContacts(formattedContacts);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    const requestContactsPermission = async () => {
      try {
        setLoading(true);
        const permissionStatus = await Contacts.requestPermissions();

        if (permissionStatus.contacts === 'granted') {
          setHasPermission(true);
          fetchContacts();
        } else if (isWeb) {
          setContacts([]);
        }
      } catch (error) {
        console.error('Error requesting contacts permission:', error);
        if (isWeb) {
          setContacts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    requestContactsPermission();
  }, []);

  useEffect(() => {
    if (!headerSearchActive) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 30);

    const handlePointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setHeaderSearchActive(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [headerSearchActive]);

  const filteredContacts = useMemo(
    () =>
      contactss.filter((contact) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [contactss, searchQuery]
  );

  const handleContactClick = (contact) => {
    history.push('/Newchatwindow', { name: contact.name, phoneNumber: contact.phoneNumber });
  };

  const handleBack = () => {
    if (headerSearchActive) {
      setHeaderSearchActive(false);
      return;
    }
    history.push('/home');
  };

  return (
    <IonContent className="new-chat-page">
      <div className="new-chat-shell">
        <header
          ref={headerRef}
          className={`new-chat-header ${headerSearchActive ? 'is-searching' : ''}`}
          onClick={(event) => event.stopPropagation()}
        >
          {headerSearchActive ? (
            <div className="new-chat-searchbar">
              <FaSearch className="new-chat-searchbar-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search contacts..."
                className="new-chat-search-input"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="new-chat-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <FaTimes size={14} />
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <button type="button" className="new-chat-icon-btn" onClick={handleBack} aria-label="Back">
                <FaArrowLeft size={16} />
              </button>
              <div className="new-chat-header-copy">
                <h1>New Chat</h1>
              </div>
              <button
                type="button"
                className="new-chat-icon-btn"
                onClick={() => setHeaderSearchActive(true)}
                aria-label="Search contacts"
              >
                <FaSearch size={15} />
              </button>
            </>
          )}
        </header>

        <main
          className="new-chat-content"
          onClick={() => {
            if (headerSearchActive) setHeaderSearchActive(false);
          }}
        >
          <button
            type="button"
            className="new-chat-add-card"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="new-chat-add-card-icon">
              <FaUserCircle size={18} />
            </span>
            <span className="new-chat-add-card-copy">
              <strong>Add New Contact</strong>
              <small>Create a new connection</small>
            </span>
            <FaPlus size={12} />
          </button>

          <div className="new-chat-section-label">Contacts</div>

          <div className="new-chat-list">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className="new-chat-contact"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleContactClick(contact);
                  }}
                >
                  <img
                    src={CONTACT_AVATAR}
                    alt={contact.name || contact.phoneNumber}
                    className="new-chat-contact-avatar"
                  />
                  <span className="new-chat-contact-copy">
                    <strong>{contact.name || contact.phoneNumber}</strong>
                    <small>{contact.phoneNumber}</small>
                  </span>
                </button>
              ))
            ) : (
              <div className="new-chat-empty-state">
                {searchQuery ? 'No contacts match your search.' : 'No contacts found.'}
              </div>
            )}
          </div>
        </main>
      </div>

      <IonLoading isOpen={loading} message="Loading..." duration={0} />
    </IonContent>
  );
};

export default NewChat;
