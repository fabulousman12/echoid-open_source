import React, { useState, useEffect, useRef } from 'react';

import StarLoader from './StarLoader';
import './ProfilePage.css';
//import { cameraOutline, closeCircleOutline } from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router';
import { User, Mail, Phone, Calendar, MapPin, LogOut, Edit2, Save, X, Camera, ChevronRight } from 'lucide-react';
import { isPlatform } from '@ionic/react';
import './ProfilePage.css'
import Cropper from 'react-easy-crop';
import { IoChevronBack } from "react-icons/io5";
import { Autocomplete } from "@react-google-maps/api";
import { FaFastBackward } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import { api } from "../services/api";
import { getRefreshToken, clearTokens } from "../services/authTokens";
import { getDeviceId, getDeviceIdSync } from "../services/deviceInfo";
import { uploadProfileImageInChunks } from "../services/profileChunkUpload";
import data from "../data";
import ImageRenderer from "../components/ImageRenderer";

const PROFILE_NAME_MAX_LENGTH = 30;
const PROFILE_ABOUT_MAX_LENGTH = 120;
const PROFILE_LOCATION_MAX_LENGTH = 35;

const ProfilePage = ({host}) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Store original values to revert changes on cancel
  const [originalName, setOriginalName] = useState('');
  const [originalAbout, setOriginalAbout] = useState('');
  const [originalPhoto, setOriginalPhoto] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const history = useHistory();
  const routeLocation = useLocation();
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState('');
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsMessage, setSessionsMessage] = useState("");
  const [currentDeviceId, setCurrentDeviceId] = useState("");
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState("");
  const [revokePassword, setRevokePassword] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeError, setRevokeError] = useState("");
  const [headerVisible, setHeaderVisible] = useState(true);
  const [statusViewerScope, setStatusViewerScope] = useState("all_chat_users");
  const [statusViewersCount, setStatusViewersCount] = useState(0);
  const [activeSection, setActiveSection] = useState(
    routeLocation?.state?.activeSection ?? null
  );
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 0));
  const [appTheme, setAppTheme] = useState(() => globalThis.storage?.getItem?.("appTheme") || "light");
  const lastScrollTopRef = useRef(0);
  
  useEffect(() => {
    setLoading(true)
    const user = globalThis.storage.readJSON('currentuser', null);
    if (user) {
      setCurrentUser(user);
      setName(user.name || '');
      setAbout(user.About || '');
      setProfilePhoto(user.profilePhoto || '');

      setOriginalName(user.name || '');
      setOriginalAbout(user.About || '');
      setOriginalPhoto(user.profilePhoto || '');
      setGender(user.gender || '');
      setDob(user.dob || '');
      setLocation(user.location || '');
    }
  
      setLoading(false);
  
   
  }, []);

  useEffect(() => {
    const savedScope = globalThis.storage?.readJSON?.("status_viewers_scope", "all_chat_users") || "all_chat_users";
    setStatusViewerScope(savedScope);

    if (savedScope === "all_chat_users") {
      const usersMain = globalThis.storage?.readJSON?.("usersMain", []) || [];
      const normalizeNumber = (value) => {
        if (!value) return "";
        const digits = String(value).replace(/\D/g, "");
        if (!digits) return "";
        const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
        return `+91${last10}`;
      };
      const numbers = Array.from(
        new Set(
          usersMain
            .map((u) => normalizeNumber(u.phoneNumber || u.phone || u.mobile || u.number || u.contactNumber))
            .filter(Boolean)
        )
      );
      globalThis.storage?.setItem?.("status_viewers_numbers", JSON.stringify(numbers));
    }
  }, [routeLocation]);

  useEffect(() => {
    if (statusViewerScope !== "selected_contacts") {
      setStatusViewersCount(0);
      return;
    }
    const saved = globalThis.storage?.readJSON?.("status_viewers_numbers", []) || [];
    setStatusViewersCount(saved.length);
  }, [statusViewerScope, routeLocation]);
  
  useEffect(() => {
    let active = true;
    const loadDeviceId = async () => {
      try {
        const id = getDeviceIdSync() || await getDeviceId();
        if (active) setCurrentDeviceId(id || "");
      } catch (err) {
        console.warn("Failed to get device id:", err);
      }
    };
    loadDeviceId();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    const syncTheme = () => setAppTheme(globalThis.storage?.getItem?.("appTheme") || "light");
    handleResize();
    syncTheme();
    window.addEventListener("resize", handleResize);
    window.addEventListener("app-theme-changed", syncTheme);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("app-theme-changed", syncTheme);
    };
  }, []);

  const toggleEdit = () => setIsEditing(true);

  const handleCancelEdit = () => {
    setName(originalName);
    setAbout(originalAbout);
    setProfilePhoto(originalPhoto);
    setIsEditing(false);
  };

  const handleNameChange = (e) => setName(e.target.value.slice(0, PROFILE_NAME_MAX_LENGTH));
  const handleAboutChange = (e) => setAbout(e.target.value.slice(0, PROFILE_ABOUT_MAX_LENGTH));
  const handleLocationChange = (e) => setLocation(e.target.value.slice(0, PROFILE_LOCATION_MAX_LENGTH));

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
       // setProfilePhoto(reader.result); // Set the base64 string of the image
        // Set the src to show it in ReactCrop
        setImageSrc(reader.result); // 
      };
      reader.readAsDataURL(file);
    }

  };

  const handlePhotoPickRequest = (e) => {
    if (window.NativeAds?.pickMediaNative) {
      e.preventDefault();
      handlePickNative();
    }
  };
  const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];

const IMAGE_EXT_WHITELIST = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

  const isImageFile = (file) => {
  if (!file) return false;

  if (file.type && ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return true;
  }

  if (file.name) {
    const name = file.name.toLowerCase();
    return IMAGE_EXT_WHITELIST.some(ext => name.endsWith(ext));
  }

  return false;
};

const handlePickNative = async () => {
  try {
    const files = await pickMediaAndSaveToShared();

    if (!files || !files.length) {
      console.warn("No media selected");
      return;
    }

    const file = files[0];

    console.log("file getter", JSON.stringify(files))
    if (!isImageFile(file)) {
      alert("Only image files are allowed");
      return;
    }


    // IMPORTANT: your native returns base64 or blob-url in `preview`
    if (!file.preview) {
      console.warn("preview missing on native file");
      return;
    }

    // feed directly into cropper pipeline
    setImageSrc(file.preview);
   

  } catch (err) {
    console.error("Native picker error:", err);
  }
};
    async function pickMediaAndSaveToShared() {
    console.log("hey")
  return new Promise((resolve) => {
    const handler = (event) => {
      window.removeEventListener('MediaSelected', handler);

      const detail = event.detail || {};
      const names = detail.names || [];
      const types = detail.types || [];
      const previews = detail.previews || [];

      const files = names.map((name, i) => ({
        name,
        type: types[i],
        preview: previews[i],
      }));

      resolve(files);
    };

    window.addEventListener('MediaSelected', handler);

    if (window.NativeAds?.pickMediaNative) {
      window.NativeAds.pickMediaNative(0); // 0 = multiple
    } else {
      console.warn('? Native picker not available.');
      resolve([]);
    }
  });
}


  // Handle image load to start cropping
  const saveChanges = async () => {
    setLoading(true);
    const normalizedName = String(name || "").slice(0, PROFILE_NAME_MAX_LENGTH);
    const normalizedAbout = String(about || "").slice(0, PROFILE_ABOUT_MAX_LENGTH);
    const normalizedLocation = String(location || "").slice(0, PROFILE_LOCATION_MAX_LENGTH);
    const updatedUser = {
      ...currentUser,
      name: normalizedName,
      About: normalizedAbout,
      profilePhoto,
      gender,
      dob,
      location: normalizedLocation
    };


const updatedFields = { email: currentUser.email }; // Always send email for identification

if (normalizedName !== originalName) updatedFields.name = normalizedName;
if (normalizedAbout !== originalAbout) updatedFields.About = normalizedAbout;
if (gender !== currentUser.gender) updatedFields.gender = gender;
if (dob !== currentUser.dob) updatedFields.dob = dob;
if (normalizedLocation !== currentUser.location) updatedFields.location = normalizedLocation;

const stripBase64 = (data) => data?.replace(/^data:image\/\w+;base64,/, '');
if (
  stripBase64(profilePhoto) !== stripBase64(originalPhoto) &&
  profilePhoto.startsWith('data:image')
) {
  try {
    const uploadResult = await uploadProfileImageInChunks(host, profilePhoto, {
      authenticated: true,
    });
    updatedFields.profileUploadId = uploadResult.uploadId;
  } catch (uploadError) {
    console.warn("Profile chunk upload unavailable, falling back to inline profilePhoto", uploadError);
    updatedFields.profilePhoto = profilePhoto; // base64 fallback
  }
}


  // For identification
    try {
      const response = await api.editUser(
        host,
        JSON.stringify(updatedFields),
        { 'Content-Type': 'application/json' }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Update failed');
      }

      // If backend confirms, save to local storage and state
      globalThis.storage.setItem('currentuser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setIsEditing(false);
      setLoading(false);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile.');
      setErrorModalVisible(true);
      setLoading(false);
    }
  };


  const onCropComplete = (_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const cancelCrop = () => {
    setImageSrc(null); // Discard cropper
  };
  
  const getCroppedImg = async (imageSrc, croppedAreaPixels) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
  
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
  
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );
  
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result); // base64 string
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg');
    });
  };
  
  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  
  const cropAndSave = async () => {
    const croppedImg = await getCroppedImg(imageSrc, croppedAreaPixels);
    setProfilePhoto(croppedImg);
    setImageSrc(null); // Close cropper
  };

  const handleLogout = async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.logout(host, refreshToken);
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      globalThis.storage.removeItem('currentuser');
      globalThis.storage.removeItem('privateKey');
      setCurrentUser(null);
      await clearTokens();
      globalThis.storage.removeItem("device_token");
      globalThis.storage.removeItem("currentuser");
      globalThis.storage.removeItem("privateKey");
      history.push('/login');
    }
  };

  const handleHeaderScroll = (e) => {
    const current = e.currentTarget.scrollTop;
    const prev = lastScrollTopRef.current;
    const delta = current - prev;

    if (Math.abs(delta) < 6) return;
    if (delta > 0 && current > 20) {
      setHeaderVisible(false);
    } else {
      setHeaderVisible(true);
    }
    lastScrollTopRef.current = current;
  };

  const handleCloseSection = () => {
    if (isEditing) handleCancelEdit();
    setSessionsOpen(false);
    setActiveSection(null);
  };

  const openSessions = async () => {
    setSessionsOpen(true);
    setSessionsLoading(true);
    setSessionsMessage("");
    try {
      const res = await api.sessions(host);
      const json = await res.json();
      if (json.success) {
        setSessions(json.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const openRevokeModal = (deviceId) => {
    setRevokeTargetId(deviceId);
    setRevokePassword("");
    setRevokeError("");
    setRevokeModalOpen(true);
  };
  
  const closeRevokeModal = () => {
    setRevokeModalOpen(false);
    setRevokeTargetId("");
    setRevokePassword("");
    setRevokeError("");
    setRevokeLoading(false);
  };
  
  const confirmRevokeSession = async () => {
    if (!revokePassword) {
      setRevokeError("Please enter your password.");
      return;
    }
    setRevokeLoading(true);
    setRevokeError("");
    try {
      const res = await api.revokeDevice(host, revokeTargetId, revokePassword);
      const json = await res.json();
      if (json.success) {
        setSessions(prev => prev.filter(s => s.deviceId !== revokeTargetId));
        setSessionsMessage("Device revoked successfully.");
        closeRevokeModal();
      } else {
        setRevokeError(json.error || "Failed to revoke device.");
      }
    } catch (err) {
      console.error("Revoke failed:", err);
      setRevokeError("Failed to revoke device.");
    } finally {
      setRevokeLoading(false);
    }
  };
  

  if (loading) {
    return (
      <div style={{ textAlign: 'center',display: 'flex', justifyContent: 'center', alignItems: 'center',position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',background: 'linear-gradient(135deg, #141E30, #243B55)',height: '100vh',width:'100%',overflowY: 'auto' }}>
      <StarLoader />
   
    </div>
    );
  }

  const LocationPicker = ({ value, onChange }) => {
  return (
    <Autocomplete
      onPlaceChanged={(place) => {
        const p = place.getPlace();
        const city = p.address_components.find(c => c.types.includes("locality"))?.long_name || "";
        const state = p.address_components.find(c => c.types.includes("administrative_area_level_1"))?.long_name || "";
        const country = p.address_components.find(c => c.types.includes("country"))?.long_name || "";

        const final = [city, state, country].filter(Boolean).join(", ");
        onChange(final);
      }}
    >
      <input
        type="text"
        defaultValue={value}
        placeholder="Search location"
        className="w-full px-4 py-3 text-sm border rounded-md"
      />
    </Autocomplete>
  );
};

  const renderDesktopProfileDetails = () => (
    <div className={`profile-web-shell profile-web-shell--${profileThemeClass}`}>
      <div className="profile-web-card">
        <div className="profile-web-topbar">
          <div className="profile-web-topbar-title">Profile</div>
          <button
            type="button"
            className="profile-web-settings-btn"
            onClick={() => (activeSection ? handleCloseSection() : history.push("/home"))}
            title={activeSection ? "Close" : "Back"}
          >
            {activeSection ? <X size={16} /> : <IoChevronBack size={18} />}
          </button>
        </div>

        <div className="profile-web-hero">
          <div className="profile-web-avatar-wrap">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="profile-web-avatar"
                onClick={() => setIsFullScreen(true)}
              />
            ) : (
              <div className="profile-web-avatar profile-web-avatar--fallback">
                <User size={40} />
              </div>
            )}
            {isEditing ? (
              <label htmlFor="profile-picture-upload-web" className="profile-web-avatar-edit">
                <Camera size={14} />
                <input
                  id="profile-picture-upload-web"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoChange}
                  onClick={handlePhotoPickRequest}
                  className="hidden"
                />
              </label>
            ) : null}
          </div>

          <h2 className="profile-web-name">{name || "Profile"}</h2>
          <div className="profile-web-email">{currentUser?.email || ""}</div>

          {!isEditing ? (
            <button type="button" className="profile-web-edit-btn" onClick={toggleEdit}>
              Edit Profile
            </button>
          ) : (
            <div className="profile-web-edit-actions">
              <button type="button" className="profile-web-edit-btn is-primary" onClick={saveChanges}>
                <Save size={14} />
                <span>Save</span>
              </button>
              <button type="button" className="profile-web-edit-btn" onClick={handleCancelEdit}>
                <X size={14} />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        <div className="profile-web-grid">
          <div className="profile-web-info-card">
            <span className="profile-web-label">Full Name</span>
            {isEditing ? (
              <input type="text" value={name} onChange={handleNameChange} maxLength={PROFILE_NAME_MAX_LENGTH} className="profile-web-input" />
            ) : (
              <div className="profile-web-value">{name || "Not set"}</div>
            )}
          </div>

          <div className="profile-web-info-card">
            <span className="profile-web-label">Email Address</span>
            {isEditing ? (
              <input type="email" value={currentUser?.email || ""} disabled className="profile-web-input is-disabled" />
            ) : (
              <div className="profile-web-value">{currentUser?.email || "Not set"}</div>
            )}
          </div>
        </div>

        <div className="profile-web-panel">
          <div className="profile-web-panel-label">
            <span className="profile-web-panel-icon"><Edit2 size={14} /></span>
            <span>About</span>
          </div>
          {isEditing ? (
              <textarea
              value={about}
              onChange={handleAboutChange}
              maxLength={PROFILE_ABOUT_MAX_LENGTH}
              rows={4}
              className="profile-web-input profile-web-textarea"
            />
          ) : (
            <p className="profile-web-about">{about || "Not set"}</p>
          )}
        </div>

        <div className="profile-web-grid">
          <div className="profile-web-info-card">
            <span className="profile-web-label">Phone Number</span>
            {isEditing ? (
              <input type="tel" value={currentUser?.phoneNumber || ""} disabled className="profile-web-input is-disabled" />
            ) : (
              <div className="profile-web-value">{currentUser?.phoneNumber || "Not set"}</div>
            )}
          </div>

          <div className="profile-web-info-card">
            <span className="profile-web-label">Location</span>
            {isEditing ? (
              <input type="text" value={location} onChange={handleLocationChange} maxLength={PROFILE_LOCATION_MAX_LENGTH} className="profile-web-input" />
            ) : (
              <div className="profile-web-value">{location || "Not set"}</div>
            )}
          </div>

          <div className="profile-web-info-card">
            <span className="profile-web-label">Date of Birth</span>
            {isEditing ? (
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="profile-web-input" />
            ) : (
              <div className="profile-web-value">{dob || "Not set"}</div>
            )}
          </div>

          <div className="profile-web-info-card">
            <span className="profile-web-label">Gender</span>
            {isEditing ? (
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="profile-web-input">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Retard</option>
                <option value="Prefer not to say">Prefer not to say(Low iq)</option>
              </select>
            ) : (
              <div className="profile-web-value">{gender || "Not set"}</div>
            )}
          </div>
        </div>

        <div className="profile-web-signout-wrap">
          <button type="button" className="profile-web-signout" onClick={handleLogout}>
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
          <div className="profile-web-version">EchoId Version</div>
        </div>
      </div>
    </div>
  );

  const renderDesktopProfileOverview = () => (
    <div className={`profile-settings-web profile-settings-web--${profileThemeClass}`}>
      <div className="profile-settings-web__card">
        <div className="profile-settings-web__topbar">
          <button
            type="button"
            className="profile-settings-web__iconbtn"
            onClick={() => history.push("/home")}
            title="Back"
          >
            <IoChevronBack size={18} />
          </button>
          <div className="profile-settings-web__title">Profile Page</div>
          <button
            type="button"
            className="profile-settings-web__iconbtn"
            onClick={() => setActiveSection("profile")}
            title="Profile detail"
          >
            <Edit2 size={16} />
          </button>
        </div>

        <div className="profile-settings-web__hero">
          <div className="profile-settings-web__avatarWrap">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="profile-settings-web__avatar"
                onClick={() => setIsFullScreen(true)}
              />
            ) : (
              <div className="profile-settings-web__avatar profile-settings-web__avatar--fallback">
                <User size={34} />
              </div>
            )}
          </div>
          <div className="profile-settings-web__name">{name || "Profile"}</div>
          <div className="profile-settings-web__email">{currentUser?.email || ""}</div>
        </div>

        <div className="profile-settings-web__content">
          <div className="profile-settings-web__sectionLabel">Public Info</div>
          <div className="profile-settings-web__grid profile-settings-web__grid--two">
            <button
              type="button"
              className="profile-settings-web__feature"
              onClick={() => setActiveSection("profile")}
            >
              <span className="profile-settings-web__featureIcon"><User size={16} /></span>
              <span className="profile-settings-web__featureText">
                <strong>Profile detail</strong>
                <small>View and edit profile info</small>
              </span>
            </button>

            <button
              type="button"
              className="profile-settings-web__feature"
              onClick={() => setActiveSection("anonymous")}
            >
              <span className="profile-settings-web__featureIcon"><Mail size={16} /></span>
              <span className="profile-settings-web__featureText">
                <strong>Anonymous profile</strong>
                <small>Manage anonymous identity</small>
              </span>
            </button>
          </div>

          <div className="profile-settings-web__sectionLabel">Status Visibility</div>
          <div className="profile-settings-web__panel">
            <div className="profile-settings-web__panelTitle">Select who can view your status</div>

            <label className="profile-settings-web__statusOption" htmlFor="status-viewers-all-web">
              <input
                id="status-viewers-all-web"
                type="radio"
                name="status-viewers-web"
                value="all_chat_users"
                checked={statusViewerScope === "all_chat_users"}
                onChange={() => {
                  setStatusViewerScope("all_chat_users");
                  globalThis.storage?.setItem?.("status_viewers_scope", JSON.stringify("all_chat_users"));
                  const usersMain = globalThis.storage?.readJSON?.("usersMain", []) || [];
                  const normalizeNumber = (value) => {
                    if (!value) return "";
                    const digits = String(value).replace(/\D/g, "");
                    if (!digits) return "";
                    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
                    return `+91${last10}`;
                  };
                  const numbers = Array.from(
                    new Set(
                      usersMain
                        .map((u) => normalizeNumber(u.phoneNumber || u.phone || u.mobile || u.number || u.contactNumber))
                        .filter(Boolean)
                    )
                  );
                  globalThis.storage?.setItem?.("status_viewers_numbers", JSON.stringify(numbers));
                }}
              />
              <span className="profile-settings-web__statusRadio" />
              <span className="profile-settings-web__statusCopy">
                <strong>All chat users</strong>
                <small>This option makes the status visible to only the users you have in your chat.</small>
              </span>
            </label>

            <button
              type="button"
              className={`profile-settings-web__statusButton ${statusViewerScope === "selected_contacts" ? "is-active" : ""}`}
              onClick={() => {
                setStatusViewerScope("selected_contacts");
                globalThis.storage?.setItem?.("status_viewers_scope", JSON.stringify("selected_contacts"));
                history.push("/status-viewers");
              }}
            >
              <span className="profile-settings-web__statusCopy">
                <strong>Selected from contact</strong>
                <small>Choose specific contacts who can view your status.</small>
              </span>
              <span className="profile-settings-web__statusMeta">
                {statusViewerScope === "selected_contacts" ? (
                  <span className="profile-settings-web__statusCount">{statusViewersCount}</span>
                ) : null}
                <ChevronRight size={16} />
              </span>
            </button>
          </div>

          <div className="profile-settings-web__dualSections">
            <div>
              <div className="profile-settings-web__sectionLabel">Security</div>
              <div className="profile-settings-web__stack">
                <button type="button" className="profile-settings-web__feature" onClick={openSessions}>
                  <span className="profile-settings-web__featureIcon"><Phone size={16} /></span>
                  <span className="profile-settings-web__featureText">
                    <strong>Active logins</strong>
                    <small>View devices and active sessions</small>
                  </span>
                </button>
                <button type="button" className="profile-settings-web__feature" onClick={() => {}}>
                  <span className="profile-settings-web__featureIcon"><Phone size={16} /></span>
                  <span className="profile-settings-web__featureText">
                    <strong>Manage password</strong>
                    <small>Update or reset your password</small>
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div className="profile-settings-web__sectionLabel">Support</div>
              <div className="profile-settings-web__stack">
                <button type="button" className="profile-settings-web__feature" onClick={() => {}}>
                  <span className="profile-settings-web__featureIcon"><Mail size={16} /></span>
                  <span className="profile-settings-web__featureText">
                    <strong>Help center</strong>
                    <small>Get answers and guides</small>
                  </span>
                </button>
                <button type="button" className="profile-settings-web__feature" onClick={() => {}}>
                  <span className="profile-settings-web__featureIcon"><Edit2 size={16} /></span>
                  <span className="profile-settings-web__featureText">
                    <strong>Report a bug</strong>
                    <small>Tell us what went wrong</small>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="profile-settings-web__footer">
            <button type="button" className="profile-settings-web__logout" onClick={handleLogout}>
              Logout
            </button>
            <div className="profile-settings-web__version">EchoId Version</div>
          </div>
        </div>
      </div>
    </div>
  );

  const isDesktopWebProfile = !isPlatform('hybrid') && viewportWidth >= 940;
  const profileThemeClass = appTheme === "dark" ? "dark" : "light";

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {!isDesktopWebProfile && (
      <div className={`profile-fixed-header ${headerVisible ? "" : "is-hidden"}`}>
        <button
          onClick={() => (activeSection ? handleCloseSection() : history.push("/home"))}
          className="profile-header-back"
          title={activeSection ? "Close" : "Back"}
        >
          {activeSection ? <X size={18} /> : <IoChevronBack size={20} />}
        </button>
        <div className="profile-header-title">Profile Page</div>
        <div className="profile-header-spacer" />
      </div>
      )}

      <div
        className="flex-1 overflow-y-auto scrollbar-hide profile-scroll"
        onScroll={handleHeaderScroll}
      >
        {!isDesktopWebProfile && <div className="profile-header-offset" />}
        {!isDesktopWebProfile && !activeSection && (
        <div className="profile-hero">
          <div className="profile-avatar-wrapper">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="profile-avatar-image"
                onClick={() => setIsFullScreen(true)}
              />
            ) : (
              <User className="profile-avatar-fallback" />
            )}
            {isEditing && (
              <label
                htmlFor="profile-picture-upload"
                className="profile-avatar-edit"
              >
                <Camera className="w-4 h-4 text-white" />
                <input
                  id="profile-picture-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoChange}
                  onClick={handlePhotoPickRequest}
                  className="hidden"
                />
              </label>
            )}
          </div>
          {isEditing && activeSection === "profile" && (
            <label
              htmlFor="profile-picture-upload"
              className="profile-avatar-change-btn"
            >
              <Camera className="w-4 h-4" />
              <span>Change Photo</span>
            </label>
          )}
          <div className="profile-hero-name">{name}</div>
          <div className="profile-hero-email">{currentUser?.email || ""}</div>
        </div>
        )}

        <div className="profile-sections">
          {!activeSection && isDesktopWebProfile && renderDesktopProfileOverview()}

          {!activeSection && !isDesktopWebProfile && (
  <>
    <h2>Public</h2>
    <div
      role="button"
      tabIndex={0}
      onClick={() => setActiveSection("profile")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setActiveSection("profile");
      }}
      className="active-logins-row"
    >
      <div className="active-logins-left">
        <div className="active-logins-icon">PD</div>
        <div className="active-logins-text">
          <div className="active-logins-title">Profile detail</div>
          <div className="active-logins-sub">View and edit profile info</div>
        </div>
      </div>
      <div className="active-logins-chevron">&gt;</div>
    </div>

    <div
      role="button"
      tabIndex={0}
      onClick={() => setActiveSection("anonymous")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setActiveSection("anonymous");
      }}
      className="active-logins-row"
    >
      <div className="active-logins-left">
        <div className="active-logins-icon">AN</div>
        <div className="active-logins-text">
          <div className="active-logins-title">Anonymous profile</div>
          <div className="active-logins-sub">Manage anonymous identity</div>
        </div>
      </div>
      <div className="active-logins-chevron">&gt;</div>
    </div>

    <h2>Security</h2>
    <div
      role="button"
      tabIndex={0}
      onClick={openSessions}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          openSessions();
        }
      }}
      className="active-logins-row"
    >
      <div className="active-logins-left">
        <div className="active-logins-icon rounded-lg"><img className='rounded-lg' src="goffyAss.jpg"/></div>
        <div className="active-logins-text">
          <div className="active-logins-title">Active logins</div>
          <div className="active-logins-sub">View devices and sessions</div>
        </div>
      </div>
      <div className="active-logins-chevron">&gt;</div>
    </div>

    <div
      role="button"
      tabIndex={0}
      onClick={() => {}}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
        }
      }}
      className="active-logins-row"
    >
      <div className="active-logins-left">
        <div className="active-logins-icon">PW</div>
        <div className="active-logins-text">
          <div className="active-logins-title">Manage password</div>
          <div className="active-logins-sub">Update or reset your password</div>
        </div>
      </div>
      <div className="active-logins-chevron">&gt;</div>
    </div>

    <div className="status-viewers-section">
      <div className="status-viewers-header">
        Select who can view your status
      </div>
      <label className="status-viewers-option" htmlFor="status-viewers-all">
        <input
          id="status-viewers-all"
          type="radio"
          name="status-viewers"
          value="all_chat_users"
          checked={statusViewerScope === "all_chat_users"}
          onChange={() => {
            setStatusViewerScope("all_chat_users");
            globalThis.storage?.setItem?.("status_viewers_scope", JSON.stringify("all_chat_users"));
            const usersMain = globalThis.storage?.readJSON?.("usersMain", []) || [];
            const normalizeNumber = (value) => {
              if (!value) return "";
              const digits = String(value).replace(/\D/g, "");
              if (!digits) return "";
              const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
              return `+91${last10}`;
            };
            const numbers = Array.from(
              new Set(
                usersMain
                  .map((u) => normalizeNumber(u.phoneNumber || u.phone || u.mobile || u.number || u.contactNumber))
                  .filter(Boolean)
              )
            );
            globalThis.storage?.setItem?.("status_viewers_numbers", JSON.stringify(numbers));
          }}
        />
        <span className="status-viewers-radio" />
        <span className="status-viewers-copy">
          <span className="status-viewers-title">All chat users</span>
          <span className="status-viewers-desc">
            This option makes the status visible to only the users you have in your chat.
          </span>
        </span>
      </label>

      <button
        type="button"
        className={`status-viewers-button ${statusViewerScope === "selected_contacts" ? "status-viewers-button--active" : ""}`}
        onClick={() => {
          setStatusViewerScope("selected_contacts");
          globalThis.storage?.setItem?.("status_viewers_scope", JSON.stringify("selected_contacts"));
          history.push("/status-viewers");
        }}
      >
        <div className="status-viewers-button-row">
          <div className="status-viewers-title">Selected from contact</div>
          {statusViewerScope === "selected_contacts" && (
            <div className="status-viewers-count">
              {statusViewersCount}
            </div>
          )}
        </div>
        <div className="status-viewers-desc">
          Choose specific contacts who can view your status.
        </div>
      </button>
    </div>

    <div
      role="button"
      tabIndex={0}
      onClick={() => setActiveSection("privacy")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setActiveSection("privacy");
        }
      }}
      className="active-logins-row"
    >
      <div className="active-logins-left">
        <div className="active-logins-icon">PP</div>
        <div className="active-logins-text">
          <div className="active-logins-title">Privacy policy</div>
          <div className="active-logins-sub">Read how we handle your data</div>
        </div>
      </div>
      <div className="active-logins-chevron">&gt;</div>
    </div>

    <h2>Support</h2>
    <div
      role="button"
      tabIndex={0}
      onClick={() => {}}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
        }
      }}
      className="active-logins-row"
    >
      <div className="active-logins-left">
        <div className="active-logins-icon">HC</div>
        <div className="active-logins-text">
          <div className="active-logins-title">Help center</div>
          <div className="active-logins-sub">Get answers and guides</div>
        </div>
      </div>
      <div className="active-logins-chevron">&gt;</div>
    </div>

    <div
      role="button"
      tabIndex={0}
      onClick={() => {}}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
        }
      }}
      className="active-logins-row"
    >
      <div className="active-logins-left">
        <div className="active-logins-icon">RB</div>
        <div className="active-logins-text">
          <div className="active-logins-title">Report a bug</div>
          <div className="active-logins-sub">Tell us what went wrong</div>
        </div>
      </div>
      <div className="active-logins-chevron">&gt;</div>
    </div>
  </>
)}

          {activeSection === "profile" && isDesktopWebProfile && renderDesktopProfileDetails()}

          {activeSection === "profile" && !isDesktopWebProfile && (
            <div className={`profile-web-shell profile-web-shell--${profileThemeClass} profile-mobile-detail-shell`}>
              <div className="profile-web-card profile-mobile-detail-card">
                <div className="profile-web-hero profile-mobile-detail-hero">
                  <div className="profile-web-avatar-wrap">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="profile-web-avatar"
                        onClick={() => setIsFullScreen(true)}
                      />
                    ) : (
                      <div className="profile-web-avatar profile-web-avatar--fallback">
                        <User size={34} />
                      </div>
                    )}
                    {isEditing ? (
                      <label htmlFor="profile-picture-upload-mobile" className="profile-web-avatar-edit">
                        <Camera size={14} />
                        <input
                          id="profile-picture-upload-mobile"
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePhotoChange}
                          onClick={handlePhotoPickRequest}
                          className="hidden"
                        />
                      </label>
                    ) : null}
                  </div>

                  <h2 className="profile-web-name">{name || "Profile"}</h2>
                  <div className="profile-web-email">{currentUser?.email || ""}</div>

                  {!isEditing ? (
                    <button type="button" className="profile-web-edit-btn" onClick={toggleEdit}>
                      Edit Profile
                    </button>
                  ) : (
                    <div className="profile-web-edit-actions profile-mobile-edit-actions">
                      <button type="button" className="profile-web-edit-btn is-primary" onClick={saveChanges}>
                        <Save size={14} />
                        <span>Save</span>
                      </button>
                      <button type="button" className="profile-web-edit-btn" onClick={handleCancelEdit}>
                        <X size={14} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="profile-web-grid profile-mobile-detail-grid">
                  <div className="profile-web-info-card">
                    <span className="profile-web-label">Full Name</span>
                    {isEditing ? (
                      <input type="text" value={name} onChange={handleNameChange} maxLength={PROFILE_NAME_MAX_LENGTH} className="profile-web-input" />
                    ) : (
                      <div className="profile-web-value">{name || "Not set"}</div>
                    )}
                  </div>

                  <div className="profile-web-info-card">
                    <span className="profile-web-label">Email Address</span>
                    {isEditing ? (
                      <input type="email" value={currentUser?.email || ""} disabled className="profile-web-input is-disabled" />
                    ) : (
                      <div className="profile-web-value profile-mobile-break">{currentUser?.email || "Not set"}</div>
                    )}
                  </div>
                </div>

                <div className="profile-web-panel">
                  <div className="profile-web-panel-label">
                    <span className="profile-web-panel-icon"><Edit2 size={14} /></span>
                    <span>About</span>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={about}
                      onChange={handleAboutChange}
                      maxLength={PROFILE_ABOUT_MAX_LENGTH}
                      rows={4}
                      className="profile-web-input profile-web-textarea"
                    />
                  ) : (
                    <p className="profile-web-about">{about || "Not set"}</p>
                  )}
                </div>

                <div className="profile-web-grid profile-mobile-detail-grid">
                  <div className="profile-web-info-card">
                    <span className="profile-web-label">Phone Number</span>
                    {isEditing ? (
                      <input type="tel" value={currentUser?.phoneNumber || ""} disabled className="profile-web-input is-disabled" />
                    ) : (
                      <div className="profile-web-value">{currentUser?.phoneNumber || "Not set"}</div>
                    )}
                  </div>

                  <div className="profile-web-info-card">
                    <span className="profile-web-label">Location</span>
                    {isEditing ? (
                      <input type="text" value={location} onChange={handleLocationChange} maxLength={PROFILE_LOCATION_MAX_LENGTH} className="profile-web-input" />
                    ) : (
                      <div className="profile-web-value">{location || "Not set"}</div>
                    )}
                  </div>

                  <div className="profile-web-info-card">
                    <span className="profile-web-label">Date of Birth</span>
                    {isEditing ? (
                      <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="profile-web-input" />
                    ) : (
                      <div className="profile-web-value">{dob || "Not set"}</div>
                    )}
                  </div>

                  <div className="profile-web-info-card">
                    <span className="profile-web-label">Gender</span>
                    {isEditing ? (
                      <select value={gender} onChange={(e) => setGender(e.target.value)} className="profile-web-input">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Retard</option>
                        <option value="Prefer not to say">Prefer not to say(Low iq)</option>
                      </select>
                    ) : (
                      <div className="profile-web-value">{gender || "Not set"}</div>
                    )}
                  </div>
                </div>

                <div className="profile-web-signout-wrap profile-mobile-detail-signout">
                  <button type="button" className="profile-web-signout" onClick={handleLogout}>
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                  <div className="profile-web-version">EchoId Version</div>
                </div>
              </div>
            </div>
          )}


          {activeSection === "anonymous" && (
            <div className="profile-details-card">
              <div className="profile-details-header">
                <h2 className="text-base font-semibold text-slate-900">Anonymous profile</h2>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 text-sm text-slate-600">
                Anonymous profile settings are coming soon.
              </div>
            </div>
          )}

          {activeSection === "privacy" && (
            <div className="profile-details-card">
              <div className="profile-details-header">
                <h2 className="text-base font-semibold text-slate-900">Privacy policy</h2>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 text-sm text-slate-600 space-y-4 leading-relaxed">
                <p>
                  By using this app, you agree to this Privacy Policy. We respect your privacy and are
                  committed to protecting your information.
                </p>
                <div className="text-xs text-slate-500">
                  Privacy Policy version: {data.TermsVersion}
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Information we store</div>
                  <div>
                    We store basic account details you provide such as name, email, phone number, and
                    profile image at account creation.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Messages and delivery</div>
                  <div>
                    Messages are stored on our servers only while undelivered. After delivery, they are
                    removed from the database.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Local device storage</div>
                  <div>
                    Chat history, call history, app preferences (mute, notification sounds), and
                    downloaded files are stored locally on your device for performance and offline access.
                    You can delete local data from within the app.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Security and sessions</div>
                  <div>
                    Device details like model and OS are used to manage login sessions and keep your
                    account secure.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Session metadata</div>
                  <div>
                    For security, we store session metadata such as device name, OS, app version,
                    IP address, last active time, and user agent.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Encryption</div>
                  <div>
                    Messages are encrypted using asymmetric RSA 2048-bit cryptography. Your private key
                    stays only on your device. A one-way hash + salt is stored in the database for
                    matching purposes. Passwords are also stored as one-way hash + salt.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Media and permissions</div>
                  <div>
                    Camera and microphone access are used for calls and voice messages. Photo and media
                    access are used for profile images and attachments. Contacts access is optional and
                    only used to show your device contacts when you create a new chat.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Files and attachments</div>
                  <div>
                    Files you send are uploaded to our servers for delivery and may be retained as needed
                    for recipients to download. Downloaded files are saved on your device.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Location</div>
                  <div>
                    If you choose to set a location, we use a location search service to help you pick
                    it. Providing location is optional.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Notifications</div>
                  <div>
                    Dead app delivery is handled by third-party services such as FCM and Pushy. We do
                    not use extra data without your prior permission. We store a device token to send
                    notifications.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Calls</div>
                  <div>
                    Calls are designed to be peer-to-peer to bypass servers when possible. A TURN server
                    is used as a fallback. Call history is saved locally on your device.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Your choices</div>
                  <div>
                    You can edit your profile, manage sessions, and request account deletion.
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-800 mb-1">Contact</div>
                  <div>If you have questions about privacy, contact support.</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {!activeSection && !isDesktopWebProfile && (
          <div className="p-3">
            <button
              onClick={handleLogout}
              className="logout-btn w-full"
            >
              Logout
            </button>
          </div>
        )}
      </div>
      {/* Sessions modal */}
  {sessionsOpen && (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 99999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "min(92vw, 680px)",
          maxHeight: "min(80vh, 760px)",
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>Active logins</div>
          <button onClick={() => setSessionsOpen(false)} style={{ fontSize: 18, background: "transparent", border: "none", cursor: "pointer" }}><IoChevronBack size={16} /></button>
        </div>
        <div style={{ padding: 16, overflowY: "auto" }}>
          {sessionsMessage && (
            <div style={{ fontSize: 12, color: "#0f172a", marginBottom: 10 }}>
              {sessionsMessage}
            </div>
          )}
          {sessionsLoading && <div style={{ fontSize: 14 }}>Loading...</div>}
          {!sessionsLoading && sessions.length === 0 && (
            <div style={{ fontSize: 14 }}>No active sessions</div>
          )}
          {!sessionsLoading && sessions.map((s, idx) => {
            const sessionKey = `${s.deviceId || "unknown"}-${s.ip || "na"}-${s.lastUsedAt || "na"}-${idx}`;
            return (
            <div key={sessionKey} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>
                  {s.deviceName || "Unknown device"} {s.deviceType ? `(${s.deviceType})` : ""}
                </span>
                {currentDeviceId && s.deviceId === currentDeviceId && (
                  <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                    This device
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                {s.osName} {s.osVersion} {s.appVersion ? `� App ${s.appVersion}` : ""}
              </div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                IP: {s.ip || "n/a"} � Last used: {s.lastUsedAt ? new Date(s.lastUsedAt).toLocaleString() : "n/a"}
              </div>
              <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                User Agent: {s.userAgent || "n/a"}
              </div>
              {(!currentDeviceId || s.deviceId !== currentDeviceId) && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => openRevokeModal(s.deviceId)}
                    style={{ background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}
                  >
                    Revoke
                  </button>
                </div>
              )}
            </div>
          );
          })}
        </div>
      </div>
    </div>
  )}

  {/* Revoke password modal */}
  {revokeModalOpen && (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 100000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "min(92vw, 420px)",
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          padding: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Confirm revoke</div>
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
          Enter your password to revoke this device session.
        </div>
        <input
          type="password"
          value={revokePassword}
          onChange={(e) => setRevokePassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        {revokeError && (
          <div style={{ fontSize: 12, color: "#e11d48", marginTop: 8 }}>
            {revokeError}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button
            onClick={closeRevokeModal}
            disabled={revokeLoading}
            style={{ background: "#e2e8f0", color: "#0f172a", border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={confirmRevokeSession}
            disabled={revokeLoading}
            style={{ background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}
          >
            {revokeLoading ? "Revoking..." : "Revoke"}
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Fullscreen image */}
  {isFullScreen && (
    <div
      className="fullscreen-overlay"
      onClick={() => {
        setIsFullScreen(false);
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          gap: 8,
          zIndex: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            setIsFullScreen(false);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <MdClose size={16} />
        </button>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <ImageRenderer
          src={profilePhoto}
          zoomable
          maxZoom={4}
          className="fullscreen-image"
          alt="Full View"
          style={{
            width: "100%",
            maxWidth: "100vw",
            maxHeight: "100vh",
          }}
          onClick={() => {}}
        />
      </div>
    </div>
  )}

  {/* Cropper */}
  {imageSrc && (
    <div className="cropper-container">
      <Cropper
        image={imageSrc}
        crop={crop}
        zoom={zoom}
        aspect={4 / 3}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={onCropComplete}
      />
      <div className="cropper-controls">
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(e.target.value)}
        />
        <div className="cropper-buttons">
          <button onClick={cropAndSave}>Crop & Save</button>
          <button onClick={cancelCrop}>Cancel</button>
        </div>
      </div>
    </div>
  )}
</div>

  );
};

export default ProfilePage;





















