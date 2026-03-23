import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router";
import { FaArrowDown, FaInfoCircle, FaPaperPlane } from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";
import PropTypes from "prop-types";
import Swal from "sweetalert2";
import { api } from "../services/api";
import Maindata from "../data";
import TemporaryExpandedView from "./TemporaryExpandedView";
import useTemporarySessionUser from "../services/useTemporarySessionUser";
import {
  getTemporaryMessages,
  getTemporaryRequestsForRoom,
  readTemporaryRooms,
  removeTemporaryRequest,
  removeTemporaryRoom,
  resetTemporaryUnread,
  setTemporaryRequests,
  upsertTemporaryRequest,
  upsertTemporaryRoom,
} from "../services/tempRoomStorage";
import "./GroupChatWindow.css";
import "./TemporaryChatWindow.css";
import img from "/img.jpg";

const host = `https://${Maindata.SERVER_URL}`;

export default function TemporaryChatWindow({ socket, onActiveRoomChange }) {
  const history = useHistory();
  const location = useLocation();
  const room = useMemo(() => location.state?.roomdetails || null, [location.state]);
  const roomUid = String(room?.uid || "").trim();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(() => getTemporaryMessages(roomUid));
  const [members, setMembers] = useState([]);
  const [roomMeta, setRoomMeta] = useState(room || null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [requests, setRequests] = useState(() => getTemporaryRequestsForRoom(roomUid, "incoming"));
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [roomList, setRoomList] = useState(() => readTemporaryRooms());
  const listRef = useRef(null);
  const prevMessageCountRef = useRef(messages.length);

  const currentUser = useTemporarySessionUser();
  const currentUserId = String(currentUser?._id || currentUser?.id || "");
  const roomListEntry = useMemo(
    () => roomList.find((entry) => String(entry.uid) === String(roomUid)) || null,
    [roomList, roomUid]
  );
  const resolvedCreatorId = String(
    roomMeta?.creatorId || room?.creatorId || roomListEntry?.creatorId || ""
  );
  const resolvedCreatorName = String(
    roomMeta?.creatorName || room?.creatorName || roomListEntry?.creatorName || ""
  ).trim();
  const creatorName = useMemo(() => {
    const creatorId = resolvedCreatorId;
    const memberMatch = members.find((member) => String(member.id || member._id) === creatorId)?.name || "";
    return memberMatch || resolvedCreatorName;
  }, [members, resolvedCreatorId, resolvedCreatorName]);
  const isCreator = useMemo(() => {
    const normalizedCreatorId = String(resolvedCreatorId || "").trim();
    return Boolean(currentUserId && normalizedCreatorId && currentUserId === normalizedCreatorId);
  }, [currentUserId, resolvedCreatorId]);
  const createdLabel = roomMeta?.createdAt ? new Date(roomMeta.createdAt).toLocaleDateString() : "Date unavailable";

  const syncMessages = useCallback(() => {
    setMessages(getTemporaryMessages(roomUid));
  }, [roomUid]);

  const syncRequests = useCallback(() => {
    setRequests(getTemporaryRequestsForRoom(roomUid, "incoming"));
  }, [roomUid]);

  useEffect(() => {
    const syncRooms = () => {
      setRoomList(readTemporaryRooms());
      syncRequests();
    };
    window.addEventListener("temporary-rooms-updated", syncRooms);
    return () => window.removeEventListener("temporary-rooms-updated", syncRooms);
  }, [syncRequests]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior });
    setShowJumpToLatest(false);
  }, []);

  const loadMembers = useCallback(async () => {
    if (!roomUid) return;
    setMembersLoading(true);
    try {
      const response = await api.getTemporaryRoomMembers(host, roomUid);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load room details");
      }

      setMembers(Array.isArray(json?.members) ? json.members : []);
      const resolvedCreatorName =
        (Array.isArray(json?.members) ? json.members : []).find(
          (member) => String(member.id || member._id) === String(json?.room?.creatorId || room?.creatorId || "")
        )?.name || room?.creatorName || "";
      setRoomMeta((prev) => {
        const nextRoom = {
          ...(prev || room || {}),
          ...(json?.room || {}),
          creatorName: resolvedCreatorName || prev?.creatorName || "",
        };
        upsertTemporaryRoom(nextRoom);
        return nextRoom;
      });
    } catch (error) {
      console.error(error);
    } finally {
      setMembersLoading(false);
    }
  }, [room, roomUid]);

  const loadRequests = useCallback(async () => {
    if (!roomUid || !isCreator) {
      setRequests([]);
      return;
    }
    setRequestsLoading(true);
    try {
      const response = await api.getTemporaryRoomRequests(host, roomUid);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load requests");
      }
      const nextRequests = Array.isArray(json?.requests) ? json.requests.map((entry) => ({ ...entry, direction: "incoming" })) : [];
      setTemporaryRequests(nextRequests, "incoming");
      setRequests(nextRequests);
    } catch (error) {
      console.error(error);
    } finally {
      setRequestsLoading(false);
    }
  }, [isCreator, roomUid]);

  useEffect(() => {
    if (!roomUid) return undefined;
    upsertTemporaryRoom(room);
    setRoomMeta((prev) => ({ ...(prev || {}), ...(room || {}) }));
    syncMessages();
    syncRequests();
    resetTemporaryUnread(roomUid);
    loadMembers();
    if (typeof onActiveRoomChange === "function") onActiveRoomChange(roomUid);

    window.addEventListener("temporary-rooms-updated", syncMessages);
    return () => {
      window.removeEventListener("temporary-rooms-updated", syncMessages);
      if (typeof onActiveRoomChange === "function") onActiveRoomChange(null);
    };
  }, [loadMembers, onActiveRoomChange, room, roomUid, syncMessages, syncRequests]);

  useEffect(() => {
    if (!expanded || !isCreator) return;
    loadRequests();
  }, [expanded, isCreator, loadRequests]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;

    const handleScroll = () => {
      const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
      setShowJumpToLatest(distanceFromBottom > 120);
    };

    handleScroll();
    list.addEventListener("scroll", handleScroll);
    return () => list.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const previousCount = prevMessageCountRef.current;
    const hasNewMessage = messages.length > previousCount;
    prevMessageCountRef.current = messages.length;

    if (!hasNewMessage) return;

    const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    if (distanceFromBottom < 120) {
      scrollToBottom();
    } else {
      setShowJumpToLatest(true);
    }
  }, [messages, scrollToBottom]);

  const navigateHomeAfterRemoval = useCallback(() => {
    removeTemporaryRoom(roomUid);
    if (typeof onActiveRoomChange === "function") onActiveRoomChange(null);
    history.replace("/temporaryhome");
  }, [history, onActiveRoomChange, roomUid]);

  const handleDelete = useCallback(async () => {
    const confirm = await Swal.fire({
      title: "Delete chatroom?",
      text: "This will close the temporary room for all members.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setActionLoading(true);
    try {
      const response = await api.deleteTemporaryChat(host, roomUid);
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.message || "Failed to delete room");
      }
      Promise.resolve(Swal.fire({
        title: "Chatroom deleted",
        text: "The chatroom has been deleted for all members.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      })).catch(() => {});
      navigateHomeAfterRemoval();
    } catch (error) {
      await Swal.fire("Delete failed", error?.message || "Failed to delete room", "error");
    } finally {
      setActionLoading(false);
    }
  }, [navigateHomeAfterRemoval, roomUid]);

  const handleExit = useCallback(async () => {
    const confirm = await Swal.fire({
      title: isCreator ? "Exit and delete chatroom?" : "Exit chatroom?",
      text: isCreator
        ? "As the creator, exiting will also delete the temporary room."
        : "You will be removed from this temporary room.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: isCreator ? "Exit and delete" : "Exit",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setActionLoading(true);
    try {
      const response = await api.exitTemporaryChat(host, roomUid);
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.message || "Failed to exit room");
      }
      navigateHomeAfterRemoval();
    } catch (error) {
      await Swal.fire("Exit failed", error?.message || "Failed to exit room", "error");
    } finally {
      setActionLoading(false);
    }
  }, [isCreator, navigateHomeAfterRemoval, roomUid]);

  const handleRemoveMember = useCallback(async (member) => {
    if (!member || !roomUid || !isCreator) return;
    const memberId = String(member.id || member._id || "");
    const memberName = String(member.name || "this member");
    if (!memberId) return;

    const confirm = await Swal.fire({
      title: `Remove ${memberName}?`,
      text: "This member will be removed from the chatroom.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setRemovingMemberId(memberId);
    try {
      const response = await api.removeTemporaryRoomMember(host, roomUid, memberId);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Failed to remove member");
      }
      if (json?.room) {
        setRoomMeta((prev) => ({ ...(prev || {}), ...json.room }));
        upsertTemporaryRoom(json.room);
      }
      Promise.resolve(Swal.fire({
        title: "Member removed",
        text: `${memberName} has been removed from the chatroom.`,
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      })).catch(() => {});
      await loadMembers();
    } catch (error) {
      await Swal.fire("Remove failed", error?.message || "Failed to remove member", "error");
    } finally {
      setRemovingMemberId("");
    }
  }, [isCreator, loadMembers, roomUid]);

  const handleRespondRequest = useCallback(async (request, action) => {
    if (!request || !isCreator || !roomUid) return;
    setActionLoading(true);
    try {
      const response = await api.respondTemporaryRoomRequest(host, roomUid, {
        requestId: request.id,
        action,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Failed to ${action} request`);
      }
      removeTemporaryRequest(request.id);
      if (json?.request) {
        upsertTemporaryRequest({ ...json.request, direction: "incoming" });
        removeTemporaryRequest(json.request.id || json.request._id);
      }
      Promise.resolve(Swal.fire({
        title: action === "accept" ? "Request accepted" : "Request declined",
        text: action === "accept"
          ? `${request.userName || "Guest"} can now join the chatroom.`
          : `${request.userName || "Guest"} was declined.`,
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      })).catch(() => {});
      await loadMembers();
      await loadRequests();
    } catch (error) {
      await Swal.fire("Request update failed", error?.message || `Failed to ${action} request`, "error");
    } finally {
      setActionLoading(false);
    }
  }, [isCreator, loadMembers, loadRequests, roomUid]);

  const handleSend = (e) => {
    e?.preventDefault?.();
    const content = draft.trim();
    if (!content) return;
    if (!currentUserId) {
      Swal.fire("Session missing", "Temporary session not found.", "error");
      return;
    }
    if (!members.some((member) => String(member.id || member._id) === currentUserId)) {
      Swal.fire("Not in room", "You are no longer a member of this room.", "warning");
      return;
    }
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      Swal.fire("Socket offline", "Temporary socket not connected", "error");
      return;
    }

    socket.send(JSON.stringify({
      type: "temporary-message",
      senderId: currentUserId,
      roomId: roomMeta?.id || roomMeta?._id || room?.id,
      roomUid,
      content,
    }));
    setDraft("");
  };

  if (!roomUid) {
    return <div className="gchat-page gchat-empty">Room not found.</div>;
  }

  const expandedProfileInner = (
    <TemporaryExpandedView
      room={{
        ...(roomMeta || {}),
        creatorId: resolvedCreatorId || roomMeta?.creatorId || "",
        creatorName: creatorName || resolvedCreatorName || roomMeta?.creatorName || "",
      }}
      members={members}
      creatorName={creatorName}
      isCreator={isCreator}
      loading={membersLoading}
      onClose={() => setExpanded(false)}
      onExit={handleExit}
      onDelete={handleDelete}
      onRemoveMember={handleRemoveMember}
      requests={requests}
      requestsLoading={requestsLoading}
      showRequests={showRequests}
      onToggleRequests={() => setShowRequests((prev) => !prev)}
      onRespondRequest={handleRespondRequest}
      actionLoading={actionLoading}
      removingMemberId={removingMemberId}
      currentUserId={currentUserId}
    />
  );

  if (expanded && window.innerWidth < 940) {
    return <div className="gchat-page gprofile-page temporary-expanded-mobile">{expandedProfileInner}</div>;
  }

  return (
    <div className={`gchat-shell temporary-gchat-shell ${expanded ? "is-profile-docked" : ""}`}>
      <aside className="temporary-desktop-sidebar">
        <div className="temporary-desktop-brandbar">
          <div className="temporary-desktop-brand">Echoid</div>
          <div className="temporary-desktop-tabs">
            <button type="button" className="temporary-desktop-tab is-active" onClick={() => history.push("/temporaryhome")}>Chats</button>
            <button type="button" className="temporary-desktop-tab" onClick={() => history.push("/temporary-profile")}>Profile</button>
          </div>
        </div>

        <div className="temporary-desktop-search">
          <input type="text" value="" readOnly placeholder="Search chats..." aria-label="Search chats" />
        </div>

        <div className="temporary-desktop-rail-head">
          <span>Chat Rooms</span>
          <span className="temporary-desktop-pill">{roomList.length} Active</span>
        </div>

        <div className="temporary-desktop-roomlist">
          {roomList.map((entry) => {
            const active = String(entry.uid) === String(roomUid);
            return (
              <button
                key={String(entry.uid)}
                type="button"
                className={`temporary-desktop-roomcard ${active ? "is-active" : ""} ${entry.entryType === "request" ? "is-request" : ""}`}
                disabled={entry.entryType === "request"}
                onClick={() => history.replace("/temporary-chatwindow", { roomdetails: entry })}
              >
                <span className="temporary-desktop-roomavatar">{String(entry.name || "C").slice(0, 1).toUpperCase()}</span>
                <span className="temporary-desktop-roomcopy">
                  <strong>{entry.name}</strong>
                  <small>{entry.entryType === "request" ? "Request sent" : (entry.latestMessage || `UID ${entry.uid}`)}</small>
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" className="temporary-desktop-addroom" onClick={() => history.push("/temporaryhome")}>
          +
        </button>
      </aside>

      <div className={`gchat-page temporary-gchat-page ${expanded ? "gchat-page--with-docked-profile" : ""}`}>
        <header className="gchat-header temporary-gchat-header">
          <button
            type="button"
            className="gchat-icon-btn"
            onClick={() => history.push("/temporaryhome")}
            aria-label="Back"
          >
            <IoArrowBack size={20} />
          </button>
          <img src={img} alt="chatroom avatar" className="gchat-header-avatar" />
          <div
            className="gchat-title-wrap"
            role="button"
            tabIndex={0}
            onClick={() => setExpanded((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded((prev) => !prev);
              }
            }}
          >
            <h5 className="gchat-title">{roomMeta?.name || room?.name || "Temporary Chat"}</h5>
            <small className="gchat-sub">
              {expanded ? `${members.length || roomMeta?.memberCount || 1} members` : "Tap to expand"}
            </small>
          </div>
          <button
            type="button"
            className="gchat-icon-btn"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label="Room details"
          >
            <FaInfoCircle size={16} />
          </button>
        </header>

        <div className="gchat-list-wrap temporary-gchat-list-wrap">
          <div className="gchat-list" ref={listRef}>
            {messages.length === 0 ? (
              <div className="gchat-intro-wrap">
                <div className="gchat-intro-card">
                  <img src={img} alt={roomMeta?.name || "Chatroom"} className="gchat-intro-avatar" />
                  <h6 className="gchat-intro-name">{roomMeta?.name || "Chatroom"}</h6>
                  <div className="gchat-intro-meta">
                    {members.length || roomMeta?.memberCount || 1} members · Created {createdLabel}
                  </div>
                  <div className="gchat-intro-desc">
                    Temporary chatroom · Room ID {roomUid}
                  </div>
                </div>
              </div>
            ) : null}

            {messages.map((message) => {
              const mine = String(message.senderId) === currentUserId;
              return (
                <div key={message.id} className={`gchat-row ${mine ? "mine" : "other"}`}>
                  {!mine ? (
                    <img
                      src={img}
                      alt={message.senderName || "Guest"}
                      className="gchat-user-avatar"
                    />
                  ) : null}
                  <div className="gchat-bubble">
                    {!mine ? <div className="gchat-sender">{message.senderName || "Guest"}</div> : null}
                    <p className="gchat-text">{message.content}</p>
                    <div className="gchat-time">
                      {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {showJumpToLatest ? (
            <button type="button" className="gchat-scroll-btn temporary-gchat-scroll-btn" onClick={() => scrollToBottom()}>
              <FaArrowDown />
            </button>
          ) : null}
        </div>

        <form className="gchat-form temporary-gchat-form" onSubmit={handleSend}>
          <input
            type="text"
            className="form-control gchat-input"
            placeholder={`Type a message to ${(roomMeta?.name || "chatroom")}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn gchat-send-btn">
            <FaPaperPlane size={14} />
          </button>
        </form>
      </div>

      {expanded ? expandedProfileInner : null}
    </div>
  );
}

TemporaryChatWindow.propTypes = {
  socket: PropTypes.shape({
    readyState: PropTypes.number,
    send: PropTypes.func,
  }),
  onActiveRoomChange: PropTypes.func,
};
