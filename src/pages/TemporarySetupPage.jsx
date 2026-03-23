import React, { useState } from "react";
import { isPlatform } from "@ionic/react";
import { useHistory } from "react-router-dom";
import PropTypes from "prop-types";
import Maindata from "../data";
import { api } from "../services/api";
import { generateTemporaryKeyPair, setTemporarySession } from "../services/temporarySession";
import { getDeviceInfo } from "../services/deviceInfo";

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #141E30, #243B55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 22,
    color: "#fff",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
    backdropFilter: "blur(10px)",
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9fc1e7",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 10,
  },
  copy: {
    fontSize: 14,
    color: "#d5dfeb",
    marginBottom: 18,
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    padding: "13px 14px",
    outline: "none",
  },
  error: {
    marginTop: 10,
    color: "#ffb4b4",
    fontSize: 13,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 20,
  },
  secondary: {
    flex: 1,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "transparent",
    color: "#fff",
    borderRadius: 12,
    padding: "12px 14px",
  },
  primary: {
    flex: 1,
    border: 0,
    background: "#4CAF50",
    color: "#fff",
    borderRadius: 12,
    padding: "12px 14px",
  },
};

export default function TemporarySetupPage({ connectTemporarySocket, connect }) {
  const history = useHistory();
  const host = `https://${Maindata.SERVER_URL}`;
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ensureSQLiteReady = async () => {
    if (!isPlatform("hybrid")) return;
    if (!window.sqlitePlugin?.openDatabase) return;

    await new Promise((resolve, reject) => {
      const db = window.sqlitePlugin.openDatabase(
        { name: "Conversa_chats_store.db", location: "default" },
        () => resolve(true),
        (err) => reject(err)
      );

      db.transaction(
        (tx) => {
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              sender TEXT,
              recipient TEXT,
              content TEXT,
              timestamp TEXT,
              status TEXT,
              read INTEGER DEFAULT 0,
              isDeleted INTEGER DEFAULT 0,
              isDownload INTEGER DEFAULT 0,
              type TEXT DEFAULT 'text',
              file_name TEXT,
              file_type TEXT DEFAULT null,
              file_size INTEGER,
              thumbnail BLOB DEFAULT null,
              file_path TEXT,
              isError INTEGER DEFAULT 0,
              isSent INTEGER DEFAULT 1,
              encryptedMessage TEXT DEFAULT null,
              encryptedAESKey TEXT DEFAULT null,
              eniv TEXT DEFAULT null,
              isReplyTo TEXT DEFAULT null
            );`
          );
          tx.executeSql(
            `ALTER TABLE messages ADD COLUMN isReplyTo TEXT DEFAULT null;`,
            [],
            () => {},
            () => false
          );
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS unreadCount (
              sender TEXT PRIMARY KEY,
              count INTEGER DEFAULT 0
            );`
          );
        },
        (err) => reject(err),
        () => resolve(true)
      );
    });
  };

  const handleStart = async () => {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const keyPair = await generateTemporaryKeyPair();
      const deviceInfo = await getDeviceInfo();
      const response = await api.createTemporaryUser(host, {
        name: trimmedName,
        publicKey: keyPair.publicKey,
        ...deviceInfo,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Failed to create temporary user");
      }

      await setTemporarySession({
        user: json.user,
        accessToken: json.authtoken,
        refreshToken: json.refreshToken,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
      });

      await ensureSQLiteReady();
      const deviceId = (await getDeviceInfo()).deviceId;
      const wsUrl = `wss://${Maindata.SERVER_URL}?token=${json.authtoken}&deviceId=${encodeURIComponent(deviceId)}`;
      if (typeof connectTemporarySocket === "function") {
        await connectTemporarySocket(wsUrl);
      } else {
        await connect(wsUrl);
      }
      history.replace("/temporaryhome");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Could not continue without an account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.eyebrow}>Temporary Session</div>
        <div style={styles.title}>Choose your display name</div>
        <div style={styles.copy}>
          This name will be shown in temporary rooms and groups for this session.
        </div>

        <label htmlFor="temporary-name" style={styles.label}>Name</label>
        <input
          id="temporary-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          autoComplete="off"
          style={styles.input}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleStart();
          }}
        />

        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.actions}>
          <button type="button" style={styles.secondary} onClick={() => history.push("/login")} disabled={loading}>
            Back
          </button>
          <button type="button" style={styles.primary} onClick={handleStart} disabled={loading}>
            {loading ? "Starting..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

TemporarySetupPage.propTypes = {
  connectTemporarySocket: PropTypes.func,
  connect: PropTypes.func,
};
