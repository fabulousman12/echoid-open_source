import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router";
import Cropper from "react-easy-crop";
import Lottie from "lottie-react";
import Swal from "sweetalert2";
import { ArrowLeft, Camera, Save, User } from "lucide-react";
import StarLoader from "./StarLoader";
import ghostAnimation from "../assets/empty ghost.json";
import { api } from "../services/api";
import { uploadAnonymousProfileImageInChunks } from "../services/profileChunkUpload";
import { clearAnonymousProfile, readAnonymousProfile, saveAnonymousProfile } from "../services/anonymousProfileStorage";

const NAME_LIMIT = 60;
const ABOUT_LIMIT = 500;
const USERNAME_LIMIT = 32;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const IMAGE_EXT_WHITELIST = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

function isImageFile(file) {
  if (!file) return false;
  if (file.type && ALLOWED_IMAGE_TYPES.includes(file.type)) return true;
  if (!file.name) return false;
  const lowered = file.name.toLowerCase();
  return IMAGE_EXT_WHITELIST.some((ext) => lowered.endsWith(ext));
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedImg(imageSrc, croppedAreaPixels) {
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
}

async function pickMediaAndSaveToShared() {
  return new Promise((resolve) => {
    const handler = (event) => {
      window.removeEventListener("MediaSelected", handler);
      const detail = event.detail || {};
      const names = detail.names || [];
      const types = detail.types || [];
      const previews = detail.previews || [];
      resolve(
        names.map((name, index) => ({
          name,
          type: types[index],
          preview: previews[index],
        }))
      );
    };

    window.addEventListener("MediaSelected", handler);
    if (window.NativeAds?.pickMediaNative) {
      window.NativeAds.pickMediaNative(0);
    } else {
      resolve([]);
    }
  });
}

export default function AnonymousProfilePage({ host }) {
  const history = useHistory();
  const routeLocation = useLocation();
  const mode = routeLocation?.state?.mode === "edit" ? "edit" : "create";
  const cachedAnonymous = useMemo(() => readAnonymousProfile(), []);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 0));
  const isNarrow = viewportWidth > 0 ? viewportWidth < 760 : true;

  const [name, setName] = useState(cachedAnonymous?.name || "");
  const [username, setUsername] = useState(cachedAnonymous?.username || "");
  const [about, setAbout] = useState(cachedAnonymous?.about || "");
  const [gender, setGender] = useState(cachedAnonymous?.gender || "");
  const [profilePic, setProfilePic] = useState(cachedAnonymous?.profilePic || "");
  const [initialProfilePic, setInitialProfilePic] = useState(cachedAnonymous?.profilePic || "");
  const [initialUsername, setInitialUsername] = useState(cachedAnonymous?.username || "");
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [loading, setLoading] = useState(mode === "edit" && !cachedAnonymous);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const usernameCheckIdRef = useRef(0);

  const showAnonymousBannedModal = async (message) => {
    clearAnonymousProfile();
    await Swal.fire({
      title: "Anonymous account banned",
      text: message || "Your anonymous account has been banned. If you feel this is a mistake, email the devs.",
      icon: "error",
      confirmButtonText: "OK",
      width: 320,
      padding: "1.2rem",
      backdrop: "rgba(0,0,0,0.4)",
      customClass: { popup: "mobile-alert" },
    });
  };

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let active = true;
    if (mode !== "edit") return undefined;

    const hydrate = async () => {
      try {
        const res = await api.anonymousMe(host);
        const json = await res.json();
        if (!active) return;

        if (res.status === 403 && json?.banned) {
          await showAnonymousBannedModal(json?.message);
          history.replace("/home");
          return;
        }

        if (!res.ok || !json?.success) {
          setError(json?.message || "Failed to load anonymous profile.");
          return;
        }

        const user = json.userResponse;
        if (!user) return;
        saveAnonymousProfile(user);
        setName(user.name || "");
        setUsername(user.username || "");
        setInitialUsername(user.username || "");
        setAbout(user.about || "");
        setGender(user.gender || "");
        setProfilePic(user.profilePic || "");
        setInitialProfilePic(user.profilePic || "");
      } catch (err) {
        if (active) {
          setError(err?.message || "Failed to load anonymous profile.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, [history, host, mode]);

  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || trimmed === initialUsername) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }
    if (!/^[a-z0-9._]{3,32}$/.test(trimmed)) {
      setUsernameStatus("invalid");
      setUsernameMessage("Username must be 3-32 characters (a-z, 0-9, . or _).");
      return;
    }
    setUsernameStatus("checking");
    setUsernameMessage("Checking availability...");
    const checkId = ++usernameCheckIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await api.anonymousUsernameCheck(host, trimmed);
        const json = await res.json();
        if (usernameCheckIdRef.current !== checkId) return;
        if (!res.ok || !json?.success) {
          setUsernameStatus("invalid");
          setUsernameMessage(json?.message || "Unable to check username.");
          return;
        }
        if (json.available) {
          setUsernameStatus("available");
          setUsernameMessage("Username is available.");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage("Username is already taken.");
        }
      } catch (err) {
        if (usernameCheckIdRef.current !== checkId) return;
        setUsernameStatus("invalid");
        setUsernameMessage("Unable to check username.");
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [username, initialUsername, host]);

  const handleProfilePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handlePhotoPickRequest = async (event) => {
    if (!window.NativeAds?.pickMediaNative) return;
    event.preventDefault();
    try {
      const files = await pickMediaAndSaveToShared();
      const first = files?.[0];
      if (!first || !isImageFile(first) || !first.preview) return;
      setImageSrc(first.preview);
    } catch (err) {
      console.error("Anonymous native picker failed:", err);
    }
  };

  const cropAndSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
    setProfilePic(cropped || "");
    setImageSrc(null);
  };

  const handleSubmit = async () => {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    const normalizedUsername = String(username || "").trim().toLowerCase();
    const usernameNeedsCheck = normalizedUsername && normalizedUsername !== initialUsername;
    const usernameValid = !normalizedUsername || /^[a-z0-9._]{3,32}$/.test(normalizedUsername);
    if (!usernameValid) {
      setError("Username must be 3-32 characters (a-z, 0-9, . or _).");
      return;
    }
    if (usernameNeedsCheck && (usernameStatus === "taken" || usernameStatus === "checking" || usernameStatus === "invalid")) {
      setError(usernameMessage || "Please choose an available username.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: trimmedName.slice(0, NAME_LIMIT),
        about: String(about || "").slice(0, ABOUT_LIMIT),
        gender: String(gender || "").trim().toLowerCase(),
      };
      if (normalizedUsername) {
        payload.username = normalizedUsername.slice(0, USERNAME_LIMIT);
      }

      if (profilePic && profilePic !== initialProfilePic && profilePic.startsWith("data:image")) {
        const upload = await uploadAnonymousProfileImageInChunks(host, profilePic);
        payload.profileUploadId = upload.uploadId;
      }

      const request = mode === "edit" ? api.editAnonymousUser(host, payload) : api.createAnonymousUser(host, payload);
      const response = await request;
      const json = await response.json();

      if (response.status === 403 && json?.banned) {
        await showAnonymousBannedModal(json?.message);
        history.replace("/home");
        return;
      }

      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Failed to ${mode} anonymous profile.`);
      }

      const user = json.userResponse;
      if (user) {
        saveAnonymousProfile(user);
        setInitialUsername(user.username || normalizedUsername || "");
      }
      history.replace("/Profile", { activeSection: "anonymous" });
    } catch (err) {
      setError(err?.message || `Failed to ${mode} anonymous profile.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <StarLoader />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, padding: isNarrow ? 18 : 24, borderRadius: isNarrow ? 22 : 28 }}>
        <button type="button" onClick={() => history.goBack()} style={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div
          style={{
            ...styles.hero,
            gridTemplateColumns: "1fr",
            gap: isNarrow ? 12 : 20,
          }}
        >
          <div style={styles.copy}>
            <span style={styles.eyebrow}>Anonymous Mode</span>
            <h1
              style={{
                ...styles.title,
                fontSize: isNarrow ? "2rem" : "clamp(2.4rem, 4vw, 3.4rem)",
                lineHeight: isNarrow ? 1.08 : 1.04,
                maxWidth: "100%",
                wordBreak: "normal",
              }}
            >
              {mode === "edit" ? "Edit your hidden identity" : "Create your hidden identity"}
            </h1>
            <p style={{ ...styles.subtitle, maxWidth: "100%" }}>
              Set up a separate anonymous profile with its own name, about, gender, and optional profile picture.
            </p>
          </div>
        </div>

        <div style={{ ...styles.form, marginTop: isNarrow ? 16 : 24 }}>
          <div style={styles.photoRow}>
            <div style={styles.avatar}>
              {profilePic ? <img src={profilePic} alt="Anonymous profile" style={styles.avatarImg} /> : <User size={38} color="#27445d" />}
            </div>
            <label htmlFor="anonymous-profile-upload" style={styles.photoBtn}>
              <Camera size={15} />
              <span>{profilePic ? "Change photo" : "Add photo"}</span>
              <input
                id="anonymous-profile-upload"
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoChange}
                onClick={handlePhotoPickRequest}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              maxLength={NAME_LIMIT}
              onChange={(event) => setName(event.target.value.slice(0, NAME_LIMIT))}
              placeholder="Anonymous name"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              maxLength={USERNAME_LIMIT}
              onChange={(event) => setUsername(event.target.value.slice(0, USERNAME_LIMIT))}
              placeholder="username"
              style={styles.input}
            />
            {usernameMessage ? (
              <div
                style={{
                  ...styles.usernameStatus,
                  color:
                    usernameStatus === "available"
                      ? "#15803d"
                      : usernameStatus === "taken" || usernameStatus === "invalid"
                      ? "#b91c1c"
                      : "#1d4ed8",
                }}
              >
                {usernameMessage}
              </div>
            ) : null}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>About</label>
            <textarea
              value={about}
              maxLength={ABOUT_LIMIT}
              onChange={(event) => setAbout(event.target.value.slice(0, ABOUT_LIMIT))}
              placeholder="Say something subtle"
              rows={4}
              style={{ ...styles.input, resize: "vertical", minHeight: 110 }}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Gender</label>
            <select value={gender} onChange={(event) => setGender(event.target.value)} style={styles.input}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error ? <div style={styles.error}>{error}</div> : null}

          <div
            style={{
              ...styles.actions,
              flexDirection: isNarrow ? "column-reverse" : "row",
              alignItems: isNarrow ? "stretch" : "center",
            }}
          >
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                saving ||
                (username.trim() &&
                  username.trim().toLowerCase() !== initialUsername &&
                  (usernameStatus === "checking" || usernameStatus === "taken" || usernameStatus === "invalid"))
              }
              style={{ ...styles.primaryBtn, width: isNarrow ? "100%" : "auto", justifyContent: "center" }}
            >
              <Save size={15} />
              <span>{saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create profile"}</span>
            </button>
          </div>
        </div>

        <div
          style={{
            ...styles.animationWrap,
            maxWidth: isNarrow ? 180 : 240,
            margin: isNarrow ? "18px auto 0" : "24px auto 0",
          }}
        >
          <Lottie animationData={ghostAnimation} loop style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {imageSrc ? (
        <div style={styles.cropOverlay}>
          <div style={styles.cropCard}>
            <div style={styles.cropStage}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedAreaPixels(area)}
              />
            </div>
            <div style={styles.cropActions}>
              <button type="button" onClick={() => setImageSrc(null)} style={styles.secondaryBtn}>Cancel</button>
              <button type="button" onClick={cropAndSave} style={styles.primaryBtn}>Use photo</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  page: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(160deg, #f4ede4 0%, #c7d9dd 52%, #f8f2de 100%)",
    padding: "24px 16px 40px",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    zIndex: 10,
  },
  card: {
    width: "100%",
    maxWidth: 920,
    margin: "0 auto",
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(39,68,93,0.12)",
    borderRadius: 28,
    boxShadow: "0 24px 60px rgba(39,68,93,0.12)",
    padding: 24,
    backdropFilter: "blur(10px)",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "none",
    background: "transparent",
    color: "#27445d",
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 12,
  },
  hero: {
    display: "grid",
    gap: 20,
    alignItems: "center",
  },
  copy: {
    minWidth: 0,
  },
  eyebrow: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#27445d",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "clamp(2rem, 4vw, 3.4rem)",
    lineHeight: 1.04,
    color: "#1c2f3f",
    margin: "14px 0 10px",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "#52606d",
    maxWidth: 540,
  },
  animationWrap: {
    width: "100%",
    justifySelf: "center",
  },
  form: {
    marginTop: 24,
    display: "grid",
    gap: 16,
  },
  photoRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: "50%",
    background: "#e8f0f2",
    border: "2px solid rgba(39,68,93,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid rgba(39,68,93,0.16)",
    borderRadius: 14,
    padding: "12px 16px",
    background: "#fff",
    color: "#27445d",
    cursor: "pointer",
    fontWeight: 600,
  },
  field: {
    display: "grid",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#27445d",
  },
  usernameStatus: {
    fontSize: 12,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    border: "1px solid rgba(39,68,93,0.14)",
    borderRadius: 16,
    padding: "14px 16px",
    fontSize: 15,
    outline: "none",
    background: "#fff",
    color: "#10212e",
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 8,
  },
  secondaryBtn: {
    border: "none",
    borderRadius: 14,
    padding: "12px 18px",
    background: "#dfe8ea",
    color: "#1c2f3f",
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "none",
    borderRadius: 14,
    padding: "12px 18px",
    background: "#27445d",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  loaderWrap: {
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "linear-gradient(135deg, #141E30, #243B55)",
    height: "100vh",
    width: "100%",
    overflowY: "auto",
  },
  cropOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(16, 33, 46, 0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  cropCard: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 24,
    padding: 16,
  },
  cropStage: {
    position: "relative",
    width: "100%",
    height: 360,
    background: "#111827",
    borderRadius: 18,
    overflow: "hidden",
  },
  cropActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  },
};
