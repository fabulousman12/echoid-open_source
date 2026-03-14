import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonLoading } from '@ionic/react';
import { Contacts } from '@capacitor-community/contacts';
import './NewChat.css';
import img from '/img.jpg';
import {IonIcon} from '@ionic/react'
import 'bootstrap/dist/css/bootstrap.min.css'; 
import { add } from 'ionicons/icons';

const NewChat = () => {
  const [contactss, setContacts] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 

  useEffect(() => {
    const isWeb =
      !globalThis?.Capacitor?.isNativePlatform?.() &&
      globalThis?.Capacitor?.getPlatform?.() !== 'ios' &&
      globalThis?.Capacitor?.getPlatform?.() !== 'android';

    const requestContactsPermission = async () => {
      try {
        setLoading(true);
        const permissionStatus = await Contacts.requestPermissions();
        
        if (permissionStatus.contacts === 'granted') {
          setHasPermission(true);
          fetchContacts();
          console.log("permission granted")
        } else {
          console.log('Permission denied for accessing contacts.');
          if (isWeb) {
            setContacts([]);
          }
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

        // Remove all non-digit characters
        let cleanedNumber = rawNumber.replace(/\D/g, '');

        // If number has more than 10 digits, keep only the last 10
        if (cleanedNumber.length >= 10) {
          cleanedNumber = cleanedNumber.slice(-10); // take last 10 digits
        } else {
          return null; // skip if number is too short
        }

        // Add +91 prefix
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

    console.log('fetching done', formattedContacts);
    setContacts(formattedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
  } finally {
    setLoading(false);
  }
};


    requestContactsPermission();
  }, []);    

  const handleContactClick = (contact) => {
    history.push('/Newchatwindow', { name: contact.name, phoneNumber: contact.phoneNumber });
  };

  const handleBack = () => {
    history.push('/home');
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const filteredContacts = contactss.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <IonContent className="d-flex flex-column" style={{ minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
      <div className="flex-grow-1 d-flex flex-column">
        {/* Header */}
        <div className="header d-flex align-items-center  p-3">
          <div className='conatined-first '>
          <button onClick={handleBack} className="btn btn-link text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-arrow-left" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M11.3 1.3a1 1 0 0 1 0 1.4L5.4 8l5.9 5.3a1 1 0 0 1-1.3 1.5l-7-6.2a1 1 0 0 1 0-1.5l7-6.2a1 1 0 0 1 1.3 0z"/>
            </svg>
          </button>
          <h5 className="text-white ml-2">New Chat</h5>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="form-control header-search pb-2 mb-1"
          />
        </div>

        {/* Contacts list */}
        <div className="contacts-list flex-grow-1 overflow-auto bg-white">

          <div>
          <div
                

                className="contact-item d-flex align-items-center p-2 cursor-pointer hover-bg-gray transition-all duration-200"
              >
                 <img
                  src={img}
                  alt="Profile"
                  className="rounded-circle mr-3"
                  style={{ width: '48px', height: '48px' }}
                />
                <div className="flex-grow-1">
                  <h6 className="mb-0 " style={{color:'green'}}>Add new Contact    <IonIcon icon={add}  /></h6>

                </div>

          </div>

          </div>

          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleContactClick(contact)}
                className="contact-item d-flex align-items-center p-2 cursor-pointer hover-bg-gray transition-all duration-200"
              >
                <img
                  src={img}
                  alt="Profile"
                  className="rounded-circle mr-3"
                  style={{ width: '48px', height: '48px' }}
                />
                <div className="flex-grow-1">
                  <h6 className="mb-0">{contact.name || contact.phoneNumber}</h6>
                  <small className="text-muted">{contact.phoneNumber}</small>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-secondary">
              <p>No contacts found.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Loading indicator */}
      <IonLoading
        isOpen={loading}
        message={'Loading...'}
        duration={0}
      />
    </IonContent>
  );
};

export default NewChat;
