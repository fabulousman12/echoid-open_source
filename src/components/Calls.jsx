import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaPhoneAlt,
  FaVideo
} from "react-icons/fa";
import { FcMissedCall } from "react-icons/fc";
import { TfiCut } from "react-icons/tfi";
import { SlCallIn, SlCallOut } from "react-icons/sl";
import "./Calls.css";
import Lottie from "lottie-react";
import sticker from "../assets/No notification.json";
const normalizeCall = (call = {}) => {
  const userId =
    call.userid ||
    call.userId ||
    call.callerId ||
    call.targetId ||
    call.uid ||
    null;

  const timestamp =
    call.timestamp ||
    call.Timestamp ||
    call.time ||
    call.createdAt ||
    null;

  const statusRaw = (call.status || call.direction || "").toString().toLowerCase();
  const callStatusRaw = (call.callstatus || call.callStatus || "").toString().toLowerCase();

  return {
    id: call.id || call.callId || `${userId || "unknown"}-${timestamp || "0"}`,
    userId,
    status: statusRaw || "unknown",
    callStatus: callStatusRaw || "unknown",
    read: Boolean(call.read ?? call.Read ?? false),
    timestamp
  };
};

const formatTimestamp = (value) => {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (value) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString();
};

const INITIAL_BATCH = 10;
const LOAD_BATCH = 10;
const LOAD_MORE_THRESHOLD_PX = 160;

const Calls = ({
  calls,
  setCalls,
  usersMain,
  selectionMode,
  setSelectionMode,
  selectedCallIds,
  setSelectedCallIds
}) => {
  const usersById = useMemo(() => {
    const list = Array.isArray(usersMain) ? usersMain : [];
    return new Map(list.map((user) => [user.id, user]));
  }, [usersMain]);

  const normalizedCalls = useMemo(() => {
    const list = Array.isArray(calls) ? calls : [];
    return list
      .map(normalizeCall)
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [calls]);

  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [expandedId, setExpandedId] = useState(null);
  const pressTimerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [calls]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (remaining <= LOAD_MORE_THRESHOLD_PX) {
        setVisibleCount((prev) => Math.min(prev + LOAD_BATCH, normalizedCalls.length));
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [normalizedCalls.length]);

  useEffect(() => {
    if (!setCalls) return;
    const hasUnread = Array.isArray(calls) && calls.some((call) => call?.read === false);
    if (!hasUnread) return;

    const updated = calls.map((call) =>
      call?.read === false ? { ...call, read: true } : call
    );
    setCalls(updated);
    try {
      globalThis.storage?.setItem?.("calls", JSON.stringify(updated));
    } catch (error) {
      console.error("Error updating call read status:", error);
    }
  }, [calls, setCalls]);

  const visibleCalls = normalizedCalls.slice(0, visibleCount);

  const renderStatusIcon = (call) => {
    const isIncoming = call.status === "incoming";
    const isOutgoing = call.status === "outgoing";
    if (isOutgoing) {
      return <SlCallOut size={19} className="call-status-icon outgoing" />;
    }
    if (isIncoming) {
      if (call.callStatus === "accepted") {
        return <SlCallIn size={19} className="call-status-icon incoming" />;
      }
      if (call.callStatus === "decline") {
        return (
          <span className="call-status-icon decline">
            <TfiCut size={19} />
            <span className="call-status-strike" />
          </span>
        );
      }
      if (call.callStatus === "missed") {
        return <FcMissedCall size={19} className="call-status-icon missed" />;
      }
      return <SlCallIn size={19} className="call-status-icon incoming" />;
    }
    return null;
  };

  const selectedIds = Array.isArray(selectedCallIds) ? selectedCallIds : [];

  const toggleSelection = (callId) => {
    if (!setSelectedCallIds) return;
    if (selectedIds.includes(callId)) {
      setSelectedCallIds(selectedIds.filter((id) => id !== callId));
    } else {
      setSelectedCallIds([...selectedIds, callId]);
    }
  };

  const startPress = (callId) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      if (setSelectionMode) setSelectionMode(true);
      toggleSelection(callId);
      pressTimerRef.current = null;
    }, 450);
  };

  const cancelPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleRowClick = (callId) => {
    if (selectionMode) {
      toggleSelection(callId);
      return;
    }
    setExpandedId((prev) => (prev === callId ? null : callId));
  };

  return (
    <div className="calls-container">
      <div className="calls-scroll" ref={scrollContainerRef}>
        {normalizedCalls.length === 0 && (
          <div className="calls-empty">No calls yet.
             <Lottie
            animationData={sticker}
            loop={true}
            style={{ width: 240, height: 240 }}
          />
          </div>
        )}
        {visibleCalls.map((call) => {
          const user = call.userId ? usersById.get(call.userId) : null;
          const name = user?.name || "Unknown user";
          const avatar = user?.avatar || "/img.jpg";
          const timeLabel = formatTimestamp(call.timestamp);
          const dateLabel = formatDate(call.timestamp);
          const isExpanded = expandedId === call.id;
          const isSelected = selectedIds.includes(call.id);

          return (
            <div
              key={call.id}
              className={`call-row ${call.read ? "" : "unread"} ${isExpanded ? "expanded" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => handleRowClick(call.id)}
              onMouseDown={() => startPress(call.id)}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={() => startPress(call.id)}
              onTouchEnd={cancelPress}
              onTouchCancel={cancelPress}
            >
              <img className="call-avatar" src={avatar} alt={name} loading="lazy" decoding="async" />
              <div className="call-meta">
                <div className="call-name-row">
                  <div className="call-name">{name}</div>
                  {renderStatusIcon(call)}
                </div>
                <div className={`call-details ${isExpanded ? "open" : ""}`}>
                  <span className="call-direction">{call.status}</span>
                  {call.status !== "outgoing" && call.callStatus !== "none" && (
                    <>
                      <span className="call-sep">•</span>
                      <span className="call-status">{call.callStatus}</span>
                    </>
                  )}
                  <span className="call-sep">•</span>
                  <span className="call-date">{dateLabel}</span>
                </div>
              </div>
              <div className="call-actions">
                <div className="call-action-row">
                  <button
                    type="button"
                    className="call-action-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaPhoneAlt />
                  </button>
                  <button
                    type="button"
                    className="call-action-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaVideo />
                  </button>
                </div>
                <div className="call-time">{timeLabel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calls;


