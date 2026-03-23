import React, { useCallback } from "react";
import { useHistory } from "react-router";
import { Calendar, LogOut, Shield, User } from "lucide-react";
import { IoChevronBack } from "react-icons/io5";
import Swal from "sweetalert2";
import { api } from "../services/api";
import Maindata from "../data";
import { clearTemporarySession } from "../services/temporarySession";
import useTemporarySessionUser from "../services/useTemporarySessionUser";
import "./ProfilePage.css";
import "./TemporaryProfilePage.css";

const host = `https://${Maindata.SERVER_URL}`;

export default function TemporaryProfilePage() {
  const history = useHistory();
  const currentUser = useTemporarySessionUser();

  const handleLogout = useCallback(async () => {
    const confirm = await Swal.fire({
      title: "Logout temporary account?",
      text: "Logging out permanently deletes this temporary account from the device and server.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete and logout",
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
    <div className="temporary-profile-page">
      <div className="profile-web-shell profile-web-shell--light temporary-profile-shell">
        <div className="profile-web-card temporary-profile-card">
          <div className="profile-web-topbar">
            <button
              type="button"
              className="profile-web-settings-btn"
              onClick={() => history.push("/temporaryhome")}
              title="Back to chats"
            >
              <IoChevronBack size={18} />
            </button>
            <div className="profile-web-topbar-title">Temporary Profile</div>
            <button
              type="button"
              className="temporary-profile-navbtn"
              onClick={() => history.push("/temporaryhome")}
            >
              Chats
            </button>
          </div>

          <div className="temporary-profile-navbar">
            <button type="button" className="temporary-profile-navlink" onClick={() => history.push("/temporaryhome")}>
              Chats
            </button>
            <button type="button" className="temporary-profile-navlink is-active">
              Profile
            </button>
          </div>

          <div className="profile-web-hero">
            <div className="profile-web-avatar-wrap">
              <div className="profile-web-avatar profile-web-avatar--fallback temporary-profile-avatar">
                <User size={40} />
              </div>
            </div>

            <h2 className="profile-web-name">{currentUser?.name || "Temporary User"}</h2>
            <div className="temporary-profile-eyebrow">Temporary session</div>
          </div>

          <div className="profile-web-grid">
            <div className="profile-web-info-card">
              <span className="profile-web-label">Display Name</span>
              <div className="profile-web-value">{currentUser?.name || "Not set"}</div>
            </div>

            <div className="profile-web-info-card">
              <span className="profile-web-label">Temporary ID</span>
              <div className="profile-web-value temporary-profile-id">{currentUser?._id || currentUser?.id || "Unavailable"}</div>
            </div>
          </div>

          <div className="profile-web-panel">
            <div className="profile-web-panel-label">
              <span className="profile-web-panel-icon"><Calendar size={14} /></span>
              <span>Session Created</span>
            </div>
            <div className="profile-web-about">
              {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleString() : "Date unavailable"}
            </div>
          </div>

          <div className="profile-web-panel">
            <div className="profile-web-panel-label">
              <span className="profile-web-panel-icon"><Shield size={14} /></span>
              <span>Important</span>
            </div>
            <div className="profile-web-about temporary-profile-warning">
              Logging out deletes this temporary account permanently. Any temporary rooms you created can also be removed.
            </div>
          </div>

          <div className="profile-web-signout-wrap">
            <button type="button" className="profile-web-signout temporary-profile-signout" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Logout And Delete Account</span>
            </button>
            <div className="profile-web-version">Temporary account</div>
          </div>
        </div>
      </div>
    </div>
  );
}
