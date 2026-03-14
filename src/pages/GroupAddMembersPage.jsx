import React, { useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router";
import PropTypes from "prop-types";
import { LoginContext } from "../Contexts/UserContext";
import { api } from "../services/api";
import img from "/img.jpg";
import "../components/UserRow.css";
import "./GroupAddMembersPage.css";

const GroupAddMembersPage = ({ usersMain = [] }) => {
  const history = useHistory();
  const location = useLocation();
  const { host } = React.useContext(LoginContext);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const group = location?.state?.groupdetails || null;
  const groupId = String(location?.state?.groupId || group?.id || group?._id || "");
  const existingMemberIds = Array.isArray(location?.state?.memberIds)
    ? location.state.memberIds.map(String).filter(Boolean)
    : [];
  const existingSet = useMemo(() => new Set(existingMemberIds), [existingMemberIds]);

  const users = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    const arr = Array.isArray(usersMain) ? usersMain : [];
    const normalized = arr
      .map((u) => ({
        id: String(u?.id || u?._id || ""),
        name: u?.name || "",
        avatar: u?.avatar || u?.profilePhoto || "",
      }))
      .filter((u) => u.id);

    const filtered = q
      ? normalized.filter((u) =>
          [u.name, u.id].some((x) => String(x || "").toLowerCase().includes(q))
        )
      : normalized;

    const existing = filtered.filter((u) => existingSet.has(u.id));
    const others = filtered.filter((u) => !existingSet.has(u.id));
    return [...existing, ...others];
  }, [existingSet, query, usersMain]);

  const toggleUser = (id) => {
    const sid = String(id);
    if (existingSet.has(sid)) return;
    setSelectedIds((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
  };

  const handleAdd = async () => {
    if (!groupId || selectedIds.length === 0) return;
    setSaving(true);
    try {
      const tasks = selectedIds.map((targetUserId) =>
        api.addGroupMember(host, { groupId, targetUserId }).then(async (res) => ({
          ok: Boolean(res?.ok),
          json: res ? await res.json().catch(() => ({})) : {},
          targetUserId,
        }))
      );
      await Promise.all(tasks);
    } finally {
      setSaving(false);
      history.replace("/group-chatwindow", {
        groupdetails: group,
        refreshMembers: true,
        refreshInvites: true,
      });
    }
  };

  return (
    <div className="group-add-page">
      <div className="group-add-header">
        <button type="button" className="group-add-link" onClick={() => history.goBack()}>Back</button>
        <h5 className="group-add-title">Add Members</h5>
        <button type="button" className="group-add-link" disabled={saving || selectedIds.length === 0} onClick={handleAdd}>
          {saving ? "Adding..." : "Add"}
        </button>
      </div>

      <div className="group-add-body">
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="list-group">
          {users.map((user) => {
            const id = String(user.id);
            const disabled = existingSet.has(id);
            const checked = disabled || selectedIds.includes(id);
            return (
              <div
                key={id}
                className={`list-group-item user-card d-flex justify-content-between align-items-center ${disabled ? "group-add-disabled" : ""}`}
                onClick={() => toggleUser(id)}
              >
                <img src={user.avatar || img} alt={user.name || "User"} className="rounded-circle" style={{ width: 44, height: 44, marginRight: 10 }} />
                <div className="flex-grow-1">
                  <h6 className="mb-0 user-name">{user.name || "Unknown"}</h6>
                  <small className="text-muted">{id}</small>
                </div>
                <input type="checkbox" checked={checked} readOnly disabled={disabled} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GroupAddMembersPage;

GroupAddMembersPage.propTypes = {
  usersMain: PropTypes.array,
};
