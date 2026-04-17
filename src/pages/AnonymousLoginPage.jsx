import React, { useState } from "react";
import { useHistory } from "react-router";
import Lottie from "lottie-react";
import Swal from "sweetalert2";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import ghostAnimation from "../assets/empty ghost.json";
import { api } from "../services/api";
import { clearAnonymousProfile, saveAnonymousProfile } from "../services/anonymousProfileStorage";

export default function AnonymousLoginPage({ host }) {
  const history = useHistory();
  const [loading, setLoading] = useState(false);

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
    history.replace("/home");
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await api.anonymousLogin(host);
      const json = await res.json();

      if (res.status === 403 && json?.banned) {
        await showAnonymousBannedModal(json?.message);
        return;
      }

      if (res.status === 404) {
        clearAnonymousProfile();
        await Swal.fire({
          title: "User does not exist",
          text: json?.message || "Anonymous profile not found. Create one now.",
          icon: "info",
          confirmButtonText: "OK",
          width: 320,
          padding: "1.2rem",
          backdrop: "rgba(0,0,0,0.4)",
          customClass: { popup: "mobile-alert" },
        });
        history.replace("/anonymous/create", { mode: "create" });
        return;
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to login anonymous account.");
      }

      const user = json.userResponse;
      if (user) {
        saveAnonymousProfile(user);
      }
      history.replace("/Profile", { activeSection: "anonymous" });
    } catch (err) {
      await Swal.fire({
        title: "Login failed",
        text: err?.message || "Failed to login anonymous account.",
        icon: "error",
        confirmButtonText: "OK",
        width: 320,
        padding: "1.2rem",
        backdrop: "rgba(0,0,0,0.4)",
        customClass: { popup: "mobile-alert" },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <button type="button" onClick={() => history.goBack()} style={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div style={styles.copy}>
          <span style={styles.eyebrow}>Anonymous Mode</span>
          <h1 style={styles.title}>Login to your anonymous profile</h1>
          <p style={styles.subtitle}>
            This uses your current signed-in account token to open the anonymous profile linked to you.
          </p>
        </div>

        <div style={styles.actions}>
          <button type="button" onClick={() => history.push("/anonymous/create", { mode: "create" })} style={styles.secondaryBtn}>
            Create account
          </button>
          <button type="button" onClick={handleLogin} disabled={loading} style={styles.primaryBtn}>
            <LockKeyhole size={15} />
            <span>{loading ? "Logging in..." : "Login"}</span>
          </button>
        </div>

        <div style={styles.animationWrap}>
          <Lottie animationData={ghostAnimation} loop style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
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
    maxWidth: 760,
    margin: "0 auto",
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(39,68,93,0.12)",
    borderRadius: 24,
    boxShadow: "0 24px 60px rgba(39,68,93,0.12)",
    padding: 20,
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
  copy: {
    display: "grid",
    gap: 10,
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
    width: "fit-content",
  },
  title: {
    fontSize: "clamp(2rem, 4vw, 3rem)",
    lineHeight: 1.08,
    color: "#1c2f3f",
    margin: 0,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "#52606d",
    margin: 0,
  },
  actions: {
    marginTop: 22,
    display: "flex",
    flexDirection: "column-reverse",
    gap: 12,
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
    justifyContent: "center",
    gap: 8,
    border: "none",
    borderRadius: 14,
    padding: "12px 18px",
    background: "#27445d",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  animationWrap: {
    width: "100%",
    maxWidth: 210,
    margin: "20px auto 0",
  },
};
