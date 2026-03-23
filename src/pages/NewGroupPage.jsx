import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { FaArrowLeft, FaCamera, FaCheckCircle, FaChevronDown, FaSearch, FaTimes, FaUsers } from "react-icons/fa";
import { useHistory } from "react-router-dom";
import Cropper from "react-easy-crop";
import PropTypes from "prop-types";
import { LoginContext } from "../Contexts/UserContext";
import { api } from "../services/api";
import img from "/img.jpg";
import "./NewGroupPage.css";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const IMAGE_EXT_WHITELIST = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

const SETTINGS_OPTIONS = {
  addMembersPermission: [
    { value: "ADMINS_ONLY", label: "Admins only" },
    { value: "ALL_MEMBERS", label: "All members" },
  ],
  groupInfoEditPermission: [
    { value: "ADMINS_ONLY", label: "Admins only" },
    { value: "ALL_MEMBERS", label: "All members" },
  ],
  messagingPermission: [
    { value: "ALL_MEMBERS", label: "All members" },
    { value: "ADMINS_ONLY", label: "Admins only" },
  ],
};

const SETTING_ROWS = [
  {
    key: "groupInfoEditPermission",
    title: "Edit group info",
    subtitle: "Allow members to change name or description",
  },
  {
    key: "messagingPermission",
    title: "Send messages",
    subtitle: "All members can send messages",
  },
  {
    key: "addMembersPermission",
    title: "Add other members",
    subtitle: "Members can invite their contacts",
  },
];

const isImageFile = (file) => {
  if (!file) return false;
  if (file.type && ALLOWED_IMAGE_TYPES.includes(file.type)) return true;
  if (file.name) {
    const name = file.name.toLowerCase();
    return IMAGE_EXT_WHITELIST.some((ext) => name.endsWith(ext));
  }
  return false;
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });

const getCroppedImg = async (imageSrc, croppedAreaPixels) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
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
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }, "image/jpeg");
  });
};

const NewGroupPage = ({ usersMain = [], groupsMain = [], setGroupsMain }) => {
  const history = useHistory();
  const { host } = useContext(LoginContext);
  const storage = globalThis?.storage;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 940 : false));
  const fileRef = useRef(null);

  const [settings, setSettings] = useState({
    addMembersPermission: "ADMINS_ONLY",
    groupInfoEditPermission: "ADMINS_ONLY",
    messagingPermission: "ALL_MEMBERS",
  });

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 940);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const readJSON = (key, fallback = null) => {
    try {
      if (typeof storage?.readJSON === "function") return storage.readJSON(key, fallback);
      const raw = typeof storage?.getItem === "function" ? storage.getItem(key) : null;
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    try {
      if (typeof storage?.setItem === "function") {
        storage.setItem(key, JSON.stringify(value));
      }
    } catch (err) {
      console.warn("Failed to persist groupsMain", err);
    }
  };

  const currentUser = readJSON("currentuser", null);
  const appTheme = readJSON("appTheme", "light") || "light";
  const currentId = String(currentUser?._id || currentUser?.id || "");

  const users = useMemo(() => {
    const list = Array.isArray(usersMain) ? usersMain : [];
    return list
      .filter(Boolean)
      .map((u) => ({
        ...u,
        id: String(u.id || u._id || ""),
      }))
      .filter((u) => u.id && u.id !== currentId);
  }, [usersMain, currentId]);

  const usersById = useMemo(() => new Map(users.map((u) => [String(u.id || u._id), u])), [users]);

  const selectedUsers = useMemo(
    () => selectedIds.map((id) => usersById.get(String(id))).filter(Boolean),
    [selectedIds, usersById]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((u) => {
      if (!query) return true;
      return [u.name, u.phoneNumber, u.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [search, users]);

  const frequentUsers = useMemo(
    () => filteredUsers.filter((u) => !selectedIds.includes(String(u.id))).slice(0, 3),
    [filteredUsers, selectedIds]
  );

  const allVisibleUsers = useMemo(() => {
    const selectedSet = new Set(selectedIds.map(String));
    const rest = filteredUsers.filter((u) => !selectedSet.has(String(u.id)));
    return [...selectedUsers, ...rest];
  }, [filteredUsers, selectedIds, selectedUsers]);

  const toggleUser = (userId) => {
    const id = String(userId);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleFile = (file) => {
    if (!isImageFile(file)) {
      setError("Only image files are allowed");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handleNativePick = async () => {
    if (!window.NativeAds?.pickMediaNative) return false;
    const files = await new Promise((resolve) => {
      const handler = (event) => {
        window.removeEventListener("MediaSelected", handler);
        const detail = event.detail || {};
        const names = detail.names || [];
        const types = detail.types || [];
        const previews = detail.previews || [];
        resolve(
          names.map((n, i) => ({
            name: n,
            type: types[i],
            preview: previews[i],
          }))
        );
      };
      window.addEventListener("MediaSelected", handler);
      window.NativeAds.pickMediaNative(0);
    });
    const first = files?.[0];
    if (!first?.preview) return false;
    setCropSrc(first.preview);
    return true;
  };

  const handleAvatarPick = async () => {
    if (window.NativeAds?.pickMediaNative) {
      const ok = await handleNativePick();
      if (ok) return;
    }
    fileRef.current?.click();
  };

  const createGroup = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        avatar,
        members: selectedIds,
        settings,
      };
      const res = await api.createGroup(host, payload);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to create group");
      }

      const group = json.group;
      if (group && typeof setGroupsMain === "function") {
        const summary = {
          id: String(group._id || group.id),
          name: group.name,
          description: group.description || "",
          avatar: group.avatar || "",
          owner: String(group.owner || group.createdBy || ""),
          memberCount: Number(group.memberCount || 0),
          unreadCount: 0,
          latestMessage: "",
          latestMessageTimestamp: null,
          updatedAt: group.updatedAt || new Date().toISOString(),
          isActive: true,
        };
        const existing = Array.isArray(groupsMain) ? groupsMain : [];
        const byId = new Map(existing.map((g) => [String(g.id), g]));
        byId.set(summary.id, summary);
        const merged = Array.from(byId.values()).sort(
          (a, b) =>
            new Date(b.latestMessageTimestamp || b.updatedAt || 0).getTime() -
            new Date(a.latestMessageTimestamp || a.updatedAt || 0).getTime()
        );
        setGroupsMain(merged);
        writeJSON("groupsMain", merged);
      }

      history.push("/home");
    } catch (e) {
      setError(e.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const renderUserRow = (user, compact = false) => {
    const id = String(user.id || user._id);
    const checked = selectedIds.includes(id);
    return (
      <button
        key={id}
        type="button"
        onClick={() => toggleUser(id)}
        className={`new-group-user-row ${checked ? "is-selected" : ""} ${compact ? "is-compact" : ""}`}
      >
        <img
          src={user.avatar || user.profilePhoto || img}
          alt={user.name || user.phoneNumber || "User"}
          className="new-group-user-avatar"
        />
        <span className="new-group-user-main">
          <strong className="new-group-user-name">{user.name || user.phoneNumber || "Unknown"}</strong>
          <small className="new-group-user-sub">{user.phoneNumber || user.email || ""}</small>
        </span>
        {checked ? (
          <FaCheckCircle className="new-group-user-check-icon" size={18} />
        ) : (
          <span className="new-group-user-check" aria-hidden="true" />
        )}
      </button>
    );
  };

  return (
    <div className={`new-group-page new-group-page--${appTheme} ${isDesktop ? "is-desktop" : "is-mobile"}`}>
      <div className="new-group-container">
        <header className="new-group-header">
          <div className="new-group-header__left">
            <button type="button" className="new-group-header-btn icon" onClick={() => history.push("/home")} aria-label="Back">
              <FaArrowLeft size={15} />
            </button>
            <div className="new-group-header__copy">
              <h1>New Group</h1>
            </div>
          </div>

          {isDesktop ? (
            <div className="new-group-header__center">
              <span>Chats</span>
              <span className="is-active">Groups</span>
              <span>Calls</span>
              <span>Settings</span>
            </div>
          ) : null}

          <div className="new-group-header__right">
            <button type="button" className="new-group-header-btn" onClick={() => history.push("/home")}>
              Cancel
            </button>
            {isDesktop ? (
              <button type="button" className="new-group-header-submit" disabled={loading} onClick={createGroup}>
                {loading ? "Creating..." : "Create Group"}
              </button>
            ) : null}
          </div>
        </header>

        <div className="new-group-layout">
          <aside className="new-group-sidebar">
            <section className="new-group-card new-group-card--profile">
              <div className="new-group-avatar-block">
                <div className="new-group-avatar-wrap">
                  <img
                    src={avatar || img}
                    alt="Group avatar"
                    className="new-group-avatar"
                    onClick={handleAvatarPick}
                  />
                  <button type="button" className="new-group-avatar-pick" onClick={handleAvatarPick} aria-label="Pick image">
                    <FaCamera size={14} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              </div>

              <div className="new-group-field">
                <label className="new-group-label">Group Name</label>
                <input
                  className="new-group-input"
                  placeholder={isDesktop ? "Enter group name..." : "Group name"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="new-group-field">
                <label className="new-group-label">Description</label>
                <textarea
                  className="new-group-input new-group-input--textarea"
                  placeholder={isDesktop ? "What is this group about?" : "Description [optional]"}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={isDesktop ? 4 : 3}
                />
              </div>
            </section>

            <section className="new-group-card new-group-card--permissions">
              <div className="new-group-section-head">
                <h2>Permissions</h2>
              </div>

              <div className="new-group-settings-list">
                {SETTING_ROWS.map((row) => (
                  <label key={row.key} className="new-group-setting-row">
                    <span className="new-group-setting-copy">
                      <strong>{row.title}</strong>
                      <small>{row.subtitle}</small>
                    </span>
                    <span className="new-group-setting-control">
                      <select
                        value={settings[row.key]}
                        onChange={(event) => setSettings((prev) => ({ ...prev, [row.key]: event.target.value }))}
                        className="new-group-setting-select"
                      >
                        {SETTINGS_OPTIONS[row.key].map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown className="new-group-setting-chevron" size={12} />
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </aside>

          <section className="new-group-main">
            <div className="new-group-card new-group-card--members">
              <div className="new-group-main-head">
                <div>
                  <h2>Add Members</h2>
                </div>
                <span className="new-group-selected-pill">{selectedIds.length} Selected</span>
              </div>

              <div className="new-group-searchbar">
                <FaSearch className="new-group-searchbar-icon" size={13} />
                <input
                  type="text"
                  className="new-group-searchbar-input"
                  placeholder="Search contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {isDesktop && selectedUsers.length > 0 ? (
                <div className="new-group-chip-row">
                  {selectedUsers.map((user) => (
                    <button
                      key={String(user.id)}
                      type="button"
                      className="new-group-chip"
                      onClick={() => toggleUser(user.id)}
                    >
                      <img src={user.avatar || user.profilePhoto || img} alt={user.name || "User"} />
                      <span>{user.name || user.phoneNumber || "Unknown"}</span>
                      <FaTimes size={10} />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="new-group-list-wrap">
                {isDesktop ? (
                  <>
                    {frequentUsers.length > 0 ? <div className="new-group-list-label">Frequent</div> : null}
                    {frequentUsers.map((user) => renderUserRow(user))}
                    <div className="new-group-list-label">All Contacts</div>
                    {allVisibleUsers.map((user) => renderUserRow(user))}
                  </>
                ) : (
                  <>
                    <div className="new-group-mobile-members-head">
                      <div className="new-group-mobile-members-title">
                        <FaUsers size={14} />
                        <span>Add Members</span>
                      </div>
                      <span className="new-group-selected-pill">{selectedIds.length} selected</span>
                    </div>
                    {allVisibleUsers.map((user) => renderUserRow(user, true))}
                  </>
                )}

                {!allVisibleUsers.length ? (
                  <div className="new-group-empty">No users found.</div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        {!isDesktop ? (
          <div className="new-group-bottom">
            {error ? <div className="new-group-error">{error}</div> : null}
            <button type="button" className="new-group-create-btn" disabled={loading} onClick={createGroup}>
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        ) : error ? (
          <div className="new-group-web-error">{error}</div>
        ) : null}
      </div>

      {cropSrc ? (
        <div className="new-group-cropper-overlay">
          <div className="new-group-cropper-box">
            <div className="new-group-cropper-stage">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>
            <div className="new-group-cropper-actions">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="new-group-cropper-range"
              />
              <div className="new-group-cropper-buttons">
                <button className="new-group-cropper-btn secondary" onClick={() => setCropSrc(null)}>Cancel</button>
                <button
                  className="new-group-cropper-btn primary"
                  onClick={async () => {
                    const cropped = await getCroppedImg(cropSrc, croppedAreaPixels);
                    setAvatar(cropped);
                    setCropSrc(null);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NewGroupPage;

NewGroupPage.propTypes = {
  usersMain: PropTypes.array,
  groupsMain: PropTypes.array,
  setGroupsMain: PropTypes.func,
};
