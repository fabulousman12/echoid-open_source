import React from "react";
import PropTypes from "prop-types";
import Swal from "sweetalert2";
import { IoClose } from "react-icons/io5";
import { FaRegCopy } from "react-icons/fa";
import img from "/img.jpg";

export default function TemporaryRoomDetails({
  room,
  members,
  creatorName,
  isCreator,
  loading,
  onClose,
  onExit,
  onDelete,
  onRemoveMember,
  requests,
  requestsLoading,
  showRequests,
  onToggleRequests,
  onRespondRequest,
  actionLoading,
  removingMemberId,
  currentUserId,
}) {
  const roomId = String(room?.uid || room?.id || "").trim();
  const createdAt = room?.createdAt ? new Date(room.createdAt).toLocaleDateString() : "Date unavailable";
  const handleCopyRoomId = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      await Swal.fire({
        title: "Copied",
        text: "Room ID copied to clipboard.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch {
      await Swal.fire("Copy failed", "Could not copy the room ID.", "error");
    }
  };

  return (
    <>
      <div className="gprofile-header">
        <button type="button" className="gchat-icon-btn" onClick={onClose} aria-label="Back to chat">
          <IoClose size={18} />
        </button>
        <h5 className="gprofile-title">Chatroom Details</h5>
        <div className="gprofile-spacer" />
      </div>

      <div className="gprofile-body">
        <div className="gprofile-hero">
          <img src={img} alt={room?.name || "Chatroom"} className="gprofile-avatar" />
          <h3 className="gprofile-name">{room?.name || "Chatroom"}</h3>
          <div className="gprofile-date">Created {createdAt}</div>
        </div>

        <div className="gprofile-section-title">INFO</div>
        <div className="gprofile-card">
          <div className="temporary-gprofile-row">
            <strong>Creator</strong>
            <span>{creatorName || "Unknown creator"}</span>
          </div>
          <div className="temporary-gprofile-row">
            <strong>Room ID</strong>
            <span className="temporary-room-id-wrap">
              <span>{roomId || "Unavailable"}</span>
              {roomId ? (
                <button
                  type="button"
                  className="temporary-room-copy-btn"
                  onClick={handleCopyRoomId}
                  aria-label="Copy room ID"
                >
                  <FaRegCopy size={12} />
                </button>
              ) : null}
            </span>
          </div>
          <div className="temporary-gprofile-row">
            <strong>Members</strong>
            <span>{members.length}</span>
          </div>
        </div>

        <div className="gprofile-section-title">MEMBERS</div>
        <div className="gprofile-members">
          {loading ? <div className="gprofile-card">Loading members...</div> : null}
          {!loading && members.length === 0 ? <div className="gprofile-card">No members found.</div> : null}
          {!loading && members.map((member) => (
            <div
              key={String(member.id || member._id)}
              className={`gprofile-member-row ${String(member.id || member._id) === String(currentUserId || "") ? "is-self" : ""}`}
            >
              <img src={img} alt={member.name || "Guest"} className="gprofile-member-avatar" />
              <div className="gprofile-member-text">
                <div className="gprofile-member-name">{member.name || "Guest"}</div>
                <div className="gprofile-member-id">
                  {String(member.id || member._id) === String(room?.creatorId || "") ? "Creator" : "Member"}
                </div>
              </div>
              {isCreator && String(member.id || member._id) !== String(room?.creatorId || "") ? (
                <button
                  type="button"
                  className="temporary-member-remove-btn"
                  disabled={actionLoading || String(removingMemberId || "") === String(member.id || member._id)}
                  onClick={() => onRemoveMember?.(member)}
                >
                  {String(removingMemberId || "") === String(member.id || member._id) ? "Removing..." : "Remove"}
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {isCreator ? (
          <>
            <div className="gprofile-section-title">REQUESTS</div>
            <button type="button" className="temporary-request-toggle" onClick={onToggleRequests}>
              <span>Requests</span>
              <span className={`temporary-request-badge ${requests.length > 0 ? "has-pending" : ""}`}>{requests.length}</span>
            </button>
            {showRequests ? (
              <div className="gprofile-members">
                {requestsLoading ? <div className="gprofile-card">Loading requests...</div> : null}
                {!requestsLoading && requests.length === 0 ? <div className="gprofile-card">No pending requests.</div> : null}
                {!requestsLoading && requests.map((request) => (
                  <div key={String(request.id)} className="gprofile-member-row">
                    <img src={img} alt={request.userName || "Guest"} className="gprofile-member-avatar" />
                    <div className="gprofile-member-text">
                      <div className="gprofile-member-name">{request.userName || "Guest"}</div>
                      <div className="gprofile-member-id">Wants to join this chatroom</div>
                    </div>
                    <div className="temporary-request-actions">
                      <button
                        type="button"
                        className="temporary-request-action accept"
                        disabled={actionLoading}
                        onClick={() => onRespondRequest?.(request, "accept")}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="temporary-request-action decline"
                        disabled={actionLoading}
                        onClick={() => onRespondRequest?.(request, "decline")}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="gprofile-section-title">ACTIONS</div>
        <div className="gprofile-actions">
          <button type="button" className="gprofile-action-btn" disabled={actionLoading} onClick={onExit}>
            {actionLoading ? "Please wait..." : isCreator ? "Exit Chatroom And Delete" : "Exit Chatroom"}
          </button>
          {isCreator ? (
            <button type="button" className="gprofile-action-btn danger" disabled={actionLoading} onClick={onDelete}>
              {actionLoading ? "Please wait..." : "Delete Chatroom"}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

TemporaryRoomDetails.propTypes = {
  room: PropTypes.shape({
    uid: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string,
    creatorId: PropTypes.string,
    createdAt: PropTypes.string,
  }),
  members: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string,
    name: PropTypes.string,
  })),
  creatorName: PropTypes.string,
  isCreator: PropTypes.bool,
  loading: PropTypes.bool,
  onClose: PropTypes.func,
  onExit: PropTypes.func,
  onDelete: PropTypes.func,
  onRemoveMember: PropTypes.func,
  requests: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    userId: PropTypes.string,
    userName: PropTypes.string,
  })),
  requestsLoading: PropTypes.bool,
  showRequests: PropTypes.bool,
  onToggleRequests: PropTypes.func,
  onRespondRequest: PropTypes.func,
  actionLoading: PropTypes.bool,
  removingMemberId: PropTypes.string,
  currentUserId: PropTypes.string,
};
