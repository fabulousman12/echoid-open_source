import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router";
import { FaPlus, FaSearch, FaTimes, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { BiMessageRoundedDots } from "react-icons/bi";
import Swal from "sweetalert2";
import { api } from "../services/api";
import Maindata from "../data";
import {
  createTemporaryRoomRequestEntry,
  readTemporaryRooms,
  removeTemporaryRequestsForRoom,
  setTemporaryRooms,
  setTemporaryRequests,
  upsertTemporaryRequest,
  upsertTemporaryRoom,
} from "../services/tempRoomStorage";
import { getAccessToken } from "../services/authTokens";
import { clearTemporarySession } from "../services/temporarySession";
import useTemporarySessionUser from "../services/useTemporarySessionUser";
import "./TemporaryHome.css";

const host = `https://${Maindata.SERVER_URL}`;

function normalizeEntry(entry) {
  if (!entry) return null;
  const id = String(entry._id || entry.id || entry.uid || "").trim();
  if (!id) return null;
  const members = Array.isArray(entry.members) ? entry.members : [];
  return {
    id,
    uid: String(entry.uid || entry.code || id),
    name: String(entry.name || "Chatroom").trim(),
    creatorId: String(entry.creatorId || ""),
    creatorName: String(entry.creatorName || ""),
    members,
    memberCount: Number(entry.memberCount || members.length || 1),
    type: "chat",
    kind: "chat",
    latestMessage: String(entry.latestMessage || ""),
    latestMessageTimestamp: entry.latestMessageTimestamp || entry.updatedAt || new Date().toISOString(),
    unreadCount: Number(entry.unreadCount || 0),
  };
}

export default function TemporaryHome() {
  const history = useHistory();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [rooms, setRooms] = useState(() => readTemporaryRooms());

  const currentUser = useTemporarySessionUser();

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.temporaryChats(host);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const nextRooms = [...(Array.isArray(json?.chats) ? json.chats : []), ...(Array.isArray(json?.groups) ? json.groups : [])]
        .map((entry) => normalizeEntry(entry))
        .filter(Boolean);
      const requests = Array.isArray(json?.requests) ? json.requests.map((entry) => ({ ...entry, direction: "outgoing" })) : [];
      setTemporaryRequests(requests, "outgoing");
      setTemporaryRooms(nextRooms, requests);
      setRooms(readTemporaryRooms());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    const syncFromStorage = () => {
      setRooms(readTemporaryRooms());
    };
    window.addEventListener("temporary-rooms-updated", syncFromStorage);
    return () => window.removeEventListener("temporary-rooms-updated", syncFromStorage);
  }, []);

  const createRoom = useCallback(async () => {
    const result = await Swal.fire({
      title: "Create chatroom",
      input: "text",
      inputLabel: "Chatroom name",
      inputPlaceholder: "Enter chatroom name",
      showCancelButton: true,
      confirmButtonText: "Create",
      inputValidator: (value) => {
        if (!String(value || "").trim()) return "Name is required";
        return undefined;
      },
    });
    const roomName = String(result.value || "").trim();
    if (!result.isConfirmed || !roomName) return;
    setCreating(true);
    try {
      const res = await api.createTemporaryChat(host, { name: roomName, kind: "chat" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        await Swal.fire("Create failed", json?.message || "Failed to create temporary room", "error");
        return;
      }
      const createdRoom = normalizeEntry(json?.room);
      upsertTemporaryRoom(createdRoom);
      history.push("/temporary-chatwindow", { roomdetails: createdRoom });
    } finally {
      setCreating(false);
    }
  }, [history]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rooms;
    return rooms.filter((entry) =>
      [entry.name, entry.uid]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rooms, search]);

  const handleJoinRoom = useCallback(async () => {
    const roomId = joinRoomId.trim().toUpperCase();
    const userId = String(currentUser?._id || currentUser?.id || "").trim();
    if (!roomId) {
      await Swal.fire("Missing room ID", "Enter a room ID", "warning");
      return;
    }
    if (!userId) {
      await Swal.fire("Missing user", "Temporary user not found", "error");
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      await Swal.fire("Session expired", "Please continue without account again.", "error");
      return;
    }

    setJoining(true);
    try {
      const response = await api.joinTemporaryChatByPayload(host, { roomId, userId });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        await Swal.fire("Join failed", json?.message || "Room does not exist", "error");
        return;
      }
      if (json?.alreadyMember && json?.room) {
        const joinedRoom = normalizeEntry(json.room || {});
        removeTemporaryRequestsForRoom(joinedRoom.uid, "outgoing");
        upsertTemporaryRoom(joinedRoom);
        setJoinRoomId("");
        setShowJoinSheet(false);
        history.push("/temporary-chatwindow", { roomdetails: joinedRoom });
        return;
      }

      if (json?.request) {
        upsertTemporaryRequest({ ...json.request, room: json.room, direction: "outgoing" });
      } else if (json?.room) {
        const requestEntry = createTemporaryRoomRequestEntry({
          id: `${json.room.uid}-pending`,
          room: json.room,
          roomUid: json.room.uid,
          roomId: json.room._id || json.room.id,
          roomName: json.room.name,
          creatorId: json.room.creatorId,
          status: "pending",
          direction: "outgoing",
        });
        if (requestEntry) upsertTemporaryRoom(requestEntry);
      }
      setJoinRoomId("");
      setShowJoinSheet(false);
      await Swal.fire("Request sent", "The creator will be notified about your join request.", "success");
    } finally {
      setJoining(false);
    }
  }, [currentUser, history, joinRoomId]);

  const handleLogout = useCallback(async () => {
    const confirm = await Swal.fire({
      title: "Logout temporary session?",
      text: "This will delete the temporary user and clear this session from the device.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Logout",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    try {
      const response = await api.temporaryLogout(host);
      const json = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 404) {
        throw new Error(json?.message || "Failed to logout temporary session");
      }

      try {
        globalThis.sessionStorage?.clear?.();
      } catch {
        // no-op
      }
      await clearTemporarySession();

      try {
        window.dispatchEvent(new Event("auth-logout"));
      } catch {
        // no-op
      }
      history.replace("/login");
    } catch (error) {
      await Swal.fire("Logout failed", error?.message || "Failed to logout temporary session", "error");
    }
  }, [history]);

  return (
    <div className="temporary-home-page">
      <div className="temporary-home-shell">
        <div className="temporary-home-topbar">
          <div className="temporary-home-brand">
            <span className="temporary-home-brand-badge">
              <BiMessageRoundedDots size={12} />
            </span>
            <strong>Echoid</strong>
          </div>
          <div className="temporary-home-topbar-actions">
            <button type="button" className="temporary-home-navpill is-active">
              Chats
            </button>
            <button type="button" className="temporary-home-navpill" onClick={() => history.push("/temporary-profile")}>
              Profile
            </button>
            <button
              type="button"
              className="temporary-home-web-createbtn"
              disabled={creating}
              onClick={createRoom}
            >
              <FaPlus size={11} />
              <span>{creating ? "Creating..." : "New room"}</span>
            </button>
            <button type="button" className="temporary-home-iconbtn" disabled={creating} onClick={createRoom} aria-label="New room">
              <FaPlus size={11} />
            </button>
            <button type="button" className="temporary-home-logoutbtn" onClick={handleLogout}>
              <FaSignOutAlt size={11} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <section className="temporary-home-intro">
          <div className="temporary-home-eyebrow">Temporary session</div>
          <h1>{currentUser?.name || "Guest lobby"}</h1>
          <p>Join or create chatrooms and talk with multiple people without signing in.</p>
        </section>

       

        <div className="temporary-home-search">
          <div className="temporary-home-search-iconwrap">
            <FaSearch size={13} />
          </div>
          <div className="temporary-home-search-field">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find your frequency..."
            />
          </div>
        </div>

        <section className="temporary-home-list">
          {loading ? <div className="temporary-home-empty">Loading temporary rooms...</div> : null}
          {!loading && filteredEntries.length === 0 ? (
            <div className="temporary-home-empty">No chatrooms yet.</div>
          ) : null}
          {!loading && filteredEntries.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={`temporary-home-card ${entry.entryType === "request" ? "is-request" : ""}`}
              disabled={entry.entryType === "request"}
              onClick={async () => {
                if (entry.entryType === "request") return;
                history.push("/temporary-chatwindow", { roomdetails: entry });
              }}
            >
              <div className="temporary-home-card-icon">
                <BiMessageRoundedDots size={20} />
              </div>
              <div className="temporary-home-card-copy">
                <strong>{entry.name}</strong>
                <span>{entry.entryType === "request" ? "Request sent to join this room" : (entry.latestMessage || `UID: ${entry.uid}`)}</span>
              </div>
              <div className="temporary-home-card-meta">
                <span>{entry.entryType === "request" ? "Pending" : `${entry.memberCount} members`}</span>
              </div>
            </button>
          ))}
        </section>

        <div className="temporary-home-bottomnav">
          <button type="button" className="temporary-home-bottomnav-btn is-active">
            <BiMessageRoundedDots size={18} />
            <span>Chats</span>
          </button>
          <button type="button" className="temporary-home-bottomnav-btn" onClick={() => history.push("/temporary-profile")}>
            <FaUserCircle size={18} />
            <span>Profile</span>
          </button>
        </div>

        <button type="button" className="temporary-home-fab" onClick={() => setShowJoinSheet(true)}>
          <FaPlus size={18} />
        </button>

        {showJoinSheet ? (
          <div className="temporary-home-join-overlay" onClick={() => setShowJoinSheet(false)}>
            <div className="temporary-home-join-card" onClick={(e) => e.stopPropagation()}>
              <div className="temporary-home-join-head">
                <strong>Join a room</strong>
                <button type="button" className="temporary-home-join-close" onClick={() => setShowJoinSheet(false)}>
                  <FaTimes size={14} />
                </button>
              </div>
              <input
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="temporary-home-join-input"
              />
              <button type="button" className="temporary-home-join-submit" onClick={handleJoinRoom} disabled={joining}>
                {joining ? "Joining..." : "Send"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
