import React from 'react';


 // Font Awesome icons
import { nanoid } from 'nanoid';
import { isPlatform } from '@ionic/react';
import 'bootstrap/dist/css/bootstrap.min.css';

import { FaPaperclip, FaImage, FaFileAlt } from "react-icons/fa"; // Font Awesome icons

import Plyr from "plyr-react";
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { Filesystem, Directory } from '@capacitor/filesystem';

import { IonModal } from "@ionic/react";
import "plyr/dist/plyr.css";  
import Picker from '@emoji-mart/react';
import 'bootstrap-icons/font/bootstrap-icons.css';


import 'bootstrap-icons/font/bootstrap-icons.css';
import { BellIcon, BellOffIcon, SettingsIcon } from 'lucide-react';
import { IonSpinner } from '@ionic/react';

import ReactPlayer from 'react-player';
import { IonIcon } from '@ionic/react';
import { IonLoading } from '@ionic/react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonButton, IonImg } from '@ionic/react';
import { Capacitor } from '@capacitor/core';

// Mock function to save file locally
import { playCircleOutline,documentOutline,callOutline,videocamOutline,downloadOutline,arrowBackOutline, ellipsisVerticalOutline,closeCircleOutline,closeOutline, copyOutline, trashOutline, arrowRedoOutline, }from 'ionicons/icons';
import waveForm from '../components/WaveformPlayer'
import { IoArchiveOutline, IoBanOutline, IoTrashOutline } from "react-icons/io5"; // Ionicons (Outline)
import { FaArrowDown } from 'react-icons/fa'; // Import the down arrow icon

const HeaderComponent = ({
  selectionMode,
  isExpanded,
  showMoreOptions,
  showOptions,
  showModal,
  userdetails,
  img,
  isMuted,
  customSounds,
  localchat_messages,
  handleDeselectAll,
  handleCopy,
  handleDelete,
  handleForward,
  handleMoreOptions,
  handleOptionClick,
  handleArchive,
  handleShare,
  handleEditContact,
  handleCancel,
  handleWipeChat,
  handlePartialDelete,
  toggleHeader,
  toggleOptions,
  handleBackButton,
  handleCall,
  handleVideoCall,
  toggleMute,
  handleCustomNotification,
  handleViewAll,
}) => {
  return (
    <>
      {selectionMode ? (
        <div  className="header bg-primary text-white d-flex items-center p-3 justify-between transition-all duration-300" style={{ height: '80px', overflow: 'hidden',zIndex:10000 }}>
         

          {/* Action buttons */}
          <div style={{zIndex:10000}} className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-gray-200" onClick={handleDeselectAll} title="Cancel Selection">
            <IonIcon icon={closeOutline} size="medium" />
          </button>
            <button className="p-2 rounded hover:bg-gray-700" onClick={handleCopy} title="Copy">
              <IonIcon icon={copyOutline} size="small" />
            </button>

            <button className="p-2 rounded hover:bg-gray-700" onClick={handleDelete} title="Delete">
              <IonIcon icon={trashOutline} size="small" />
            </button>

            <button className="p-2 rounded hover:bg-gray-700" onClick={handleForward} title="Forward">
              <IonIcon icon={arrowRedoOutline} size="small" />
            </button>

            <button className="p-2 rounded hover:bg-gray-700" onClick={handleMoreOptions} title="More">
              <IonIcon icon={ellipsisVerticalOutline} size="small" />
            </button>

            {/* Floating More Options Menu */}
            {showMoreOptions && (
              <div className="absolute top-12 right-0 bg-white text-black rounded shadow-lg z-10 w-40">
                <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleOptionClick('Mark as Read')}>
                  Mark as Read
                </button>
                <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={handleArchive}>
                  {isArchive ? 'Unarchive' : 'Move to Archive'}
                </button>
                <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleOptionClick('Report')}>
                  Report
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`header bg-primary text-white d-flex items-center p-3 justify-between transition-all duration-300 ${isExpanded ? 'expanded' : ''}`} style={{ height: isExpanded ? '100vh' : '80px', overflow: isExpanded ? 'auto' : 'hidden' }}>
          {/* Back Button */}
          {isExpanded && (
            <button className="p-2 rounded-full hover:bg-gray-200 absolute left-2 top-4" title="Back" onClick={toggleHeader}>
              <IonIcon icon={arrowBackOutline} size="medium" />
            </button>
          )}

          {isExpanded && (
            <>
              {/* Main Ellipsis Button */}
              <button className="p-2 rounded-full hover:bg-gray-200 absolute right-2 top-4" title="Options" onClick={toggleOptions}>
                <IonIcon icon={ellipsisVerticalOutline} size="medium" />
              </button>

              {/* Floating Options Dropdown */}
              {showOptions && (
                <div className="absolute right-2 top-16 bg-black shadow-lg rounded-lg overflow-hidden border border-gray-200 w-44 z-50">
                  <button onClick={handleShare} className="flex items-center w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-800 text-sm font-medium">
                    📤 <span className="ml-3">Share</span>
                  </button>
                  <button onClick={handleEditContact} className="flex items-center w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-800 text-sm font-medium">
                    ✏️ <span className="ml-3">Edit Contact</span>
                  </button>
                </div>
              )}
            </>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
              <div className="bg-white rounded-lg p-6 w-96 relative">
                {/* Close Button */}
                <button onClick={handleCancel} className="top-2 right-2 text-red hover:text-red-700" title="Close">
                  <IonIcon icon={closeCircleOutline} size="large" />
                </button>

                {/* Modal Content */}
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Are you sure you want to delete this chat?</h2>
                <p className="text-gray-700 mb-4">If you want, you can delete the chat but keep the messages.</p>
                <div className="flex space-x-4 text-gray-700">
                  <button onClick={handleWipeChat} className="w-1/2 py-2 px-4 bg-red-500 text-black rounded-lg hover:bg-red-600">
                    Wipe it
                  </button>
                  <button onClick={handlePartialDelete} className="w-1/2 py-2 px-4 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600">
                    Partial Delete
                  </button>
                </div>
                <button onClick={handleCancel} className="mt-4 w-full py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile and Name Section */}
      {!isExpanded && userdetails && (
        <div className="flex items-center justify-center w-full max-w-3xl px-2">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={toggleHeader}>
            {/* Avatar */}
            <button className="p-2 rounded-full hover:bg-gray-200 absolute left-2 top-4" title="Back" onClick={handleBackButton}>
              <IonIcon icon={arrowBackOutline} size="medium" />
            </button>

            <img src={userdetails.avatar ? userdetails.avatar : img} alt="Avatar" style={{ aspectRatio: '4/3' }} className="w-14 h-14 rounded-full" />

            {/* User Name */}
            <div className="truncate">
              <h4 className="mb-0 font-semibold text-lg">{userdetails.name}</h4>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end space-x-4 flex-shrink-0 ml-auto">
            {/* Call Button */}
            <button className="p-1 rounded-full hover:bg-gray-200" title="Call" onClick={() => handleCall(userdetails.id)}>
              <IonIcon icon={callOutline} size="small" />
            </button>

            {/* Video Call Button */}
            <button className="p-1 rounded-full hover:bg-gray-200" title="Video Call" onClick={() => handleVideoCall(userdetails.id)}>
              <IonIcon icon={videocamOutline} size="small" />
            </button>

            {/* More Options Button */}
            <button className="p-1 rounded-full hover:bg-gray-200" title="More Options" onClick={() => handleMoreOptions(userdetails.id)}>
              <IonIcon icon={ellipsisVerticalOutline} size="small" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded View - User Details and Call Options */}
      {isExpanded && (
        <div className="user-details bg-blue overflow-auto" style={{ height: '100vh', width: '100%' }}>
          {/* Profile Picture with Fullscreen Toggle */}
          <div className="flex justify-center mb-6">
            <img
              src={userdetails.avatar ? userdetails.avatar : img}
              alt="Avatar"
              className="rounded-full cursor-pointer"
              style={{ height: '12rem', width: '12rem', marginTop: '2rem', aspectRatio: '4/3' }}
              onClick={() => isExpanded ? toggleHeader() : null} // Toggle between full screen and collapsed
            />
          </div>

          {/* User Details Section */}
          <div className="text-center mb-8">
            <div className="space-y-2">
              <p className="text-lg">
                <span className="text-gray-800">{userdetails.name}</span>
              </p>
<p className="text-base text-gray-700">{userdetails.email}</p>
<p className="text-base text-gray-700">{userdetails.phone}</p>
</div>
</div>
      {/* Mute and Notification Options */}
      <div className="bg-white p-4 shadow rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">Mute</span>
          <input type="checkbox" checked={isMuted} onChange={toggleMute} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">Custom Notification</span>
          <input type="checkbox" checked={customSounds} onChange={handleCustomNotification} />
        </div>
      </div>

      {/* View All Messages Button */}
      <div className="flex justify-center mt-8">
        <button className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-blue-600" onClick={() => handleViewAll(localchat_messages)}>
          View All Messages
        </button>
      </div>
    </div>
  )}
</>
);
};

export default HeaderComponent;