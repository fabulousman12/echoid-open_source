import React, { useMemo, useRef, useState, useContext } from "react";
import { FaCamera } from "react-icons/fa";
import { useHistory } from "react-router-dom";
import Cropper from "react-easy-crop";
import PropTypes from "prop-types";
import { LoginContext } from "../Contexts/UserContext";
import { api } from "../services/api";
import img from "/img.jpg";
import "./NewGroupPage.css";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const IMAGE_EXT_WHITELIST = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

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

const SettingsField = ({ label, value, onChange, options }) => (
  <>
    <label className="new-group-label">{label}</label>
    <select className="form-select mb-2" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </>
);

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
  const fileRef = useRef(null);

  const [settings, setSettings] = useState({
    addMembersPermission: "ADMINS_ONLY",
    groupInfoEditPermission: "ADMINS_ONLY",
    messagingPermission: "ALL_MEMBERS",
  });

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

  const usersById = useMemo(
    () => new Map(users.map((u) => [String(u.id || u._id), u])),
    [users]
  );

  const selectedUsers = selectedIds.map((id) => usersById.get(String(id))).filter(Boolean);
  const unselectedFiltered = users.filter((u) => {
    const id = String(u.id || u._id);
    if (selectedIds.includes(id)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [u.name, u.phoneNumber, u.email]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const visibleUsers = [...selectedUsers, ...unselectedFiltered].filter(Boolean);

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

  const selectedCount = selectedIds.length;

  const renderHeaderBar = () => (
    <div className="new-group-header">
      <button type="button" className="new-group-header-btn" onClick={() => history.push("/home")}>
        Back
      </button>
      <h5 className="new-group-header-title">New Group</h5>
      <button
        type="button"
        className="new-group-header-btn"
        onClick={() => setSelectedIds([])}
        title="Deselect all"
      >
        Cancel
      </button>
    </div>
  );

  const renderProfileSection = () => (
    <div className="new-group-section">
      <div className="new-group-avatar-wrap">
        <img
          src={avatar || img}
          alt="Group avatar"
          className="new-group-avatar"
          onClick={handleAvatarPick}
        />
        <button type="button" className="new-group-avatar-pick" onClick={handleAvatarPick} aria-label="Pick image">
          <FaCamera size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      <input
        className="form-control mt-3"
        placeholder="Group name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        className="form-control mt-2"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
    </div>
  );

  const renderSettingsSection = () => (
    <div className="new-group-section">
      <h6 className="new-group-section-title">Settings</h6>
      <SettingsField
        label="Who can add members"
        value={settings.addMembersPermission}
        onChange={(value) => setSettings((s) => ({ ...s, addMembersPermission: value }))}
        options={[
          { value: "ADMINS_ONLY", label: "Admins only" },
          { value: "ALL_MEMBERS", label: "All members" },
        ]}
      />
      <SettingsField
        label="Who can change group details"
        value={settings.groupInfoEditPermission}
        onChange={(value) => setSettings((s) => ({ ...s, groupInfoEditPermission: value }))}
        options={[
          { value: "ADMINS_ONLY", label: "Admins only" },
          { value: "ALL_MEMBERS", label: "All members" },
        ]}
      />
      <SettingsField
        label="Who can send messages"
        value={settings.messagingPermission}
        onChange={(value) => setSettings((s) => ({ ...s, messagingPermission: value }))}
        options={[
          { value: "ALL_MEMBERS", label: "All members" },
          { value: "ADMINS_ONLY", label: "Admins only" },
        ]}
      />
    </div>
  );

  return (
    <div className="new-group-page">
      <div className="new-group-container">
        {renderHeaderBar()}
        <div className="new-group-content">
          {renderProfileSection()}
          {renderSettingsSection()}

          <div className="new-group-section new-group-members-section">
            <div className="new-group-members-header">
              <label className="new-group-label">Members</label>
              <div className="new-group-meta">{selectedCount} selected</div>
            </div>
            <div className="new-group-search">
              <input
                type="text"
                className="new-group-search-input"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="new-group-users-box">
              <div className="new-group-users-list">
                {visibleUsers.map((user) => {
                  const id = String(user.id || user._id);
                  const checked = selectedIds.includes(id);
                  return (
                    <div
                      key={id}
                      onClick={() => toggleUser(id)}
                      className={`new-group-user-row ${checked ? "is-selected" : ""}`}
                    >
                      <img
                        src={user.avatar || img}
                        alt="Profile"
                        className="new-group-user-avatar"
                      />
                      <div className="new-group-user-main">
                        <h6 className="new-group-user-name">{user.name || user.phoneNumber || "Unknown"}</h6>
                        <small className="new-group-user-sub">{user.phoneNumber || user.email || ""}</small>
                      </div>
                      <span className={`new-group-user-check ${checked ? "is-checked" : ""}`} aria-hidden="true" />
                    </div>
                  );
                })}
                {!visibleUsers.length && (
                  <div className="text-center text-secondary p-3">No users found.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="new-group-bottom">
          {error && <div className="text-danger mb-2">{error}</div>}
          <button type="button" className="btn new-group-create-btn w-100" disabled={loading} onClick={createGroup}>
            {loading ? "Creating..." : `Create Group (${selectedCount} selected)`}
          </button>
        </div>
      </div>

      {cropSrc && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 d-flex flex-column justify-content-center">
          <div style={{ position: "relative", height: 320, margin: 16, background: "#111", borderRadius: 12 }}>
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
          <div className="px-4">
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-100"
            />
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-outline-light w-50" onClick={() => setCropSrc(null)}>Cancel</button>
              <button
                className="btn btn-light w-50"
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
      )}
    </div>
  );
};

export default NewGroupPage;

NewGroupPage.propTypes = {
  usersMain: PropTypes.array,
  groupsMain: PropTypes.array,
  setGroupsMain: PropTypes.func,
};

SettingsField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
};
