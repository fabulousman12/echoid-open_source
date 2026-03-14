import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { IonContent, IonLoading } from "@ionic/react";
import { Contacts } from "@capacitor-community/contacts";
import img from "/img.jpg";
import "./StatusViewers.css";

const StatusViewers = () => {
  const history = useHistory();
  const routeLocation = useLocation();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNumbers, setSelectedNumbers] = useState([]);

  const usersMain = globalThis.storage?.readJSON?.("usersMain", []) || [];
  const blockedIds = globalThis.storage?.readJSON?.("blockedUsers", []) || [];
  const blockedIdSet = useMemo(() => new Set(blockedIds.map(String)), [blockedIds]);
  const cameFromStatusUpload = Boolean(routeLocation?.state?.fromStatusUpload);

  const dummySelected = [
    "+919876543210",
    "+918888777766",
  ];

  const dummyContacts = [
    { id: "c1", name: "Jit", phoneNumber: "+919111222333" },
    { id: "c2", name: "Riya", phoneNumber: "+919222333444" },
    { id: "c3", name: "Amit", phoneNumber: "+919333444555" },
  ];

  const normalizeNumber = (value) => {
    if (!value) return "";
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "";
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    return `+91${last10}`;
  };

  const blockedNumbers = useMemo(() => {
    const numbers = usersMain
      .filter((u) => blockedIdSet.has(String(u.id || u._id)))
      .map((u) => normalizeNumber(u.phoneNumber || u.phone || u.mobile || u.number || u.contactNumber))
      .filter(Boolean);
    return new Set(numbers);
  }, [blockedIdSet, usersMain]);

  const isBlockedNumber = (number) => blockedNumbers.has(normalizeNumber(number));

  useEffect(() => {
    const saved = globalThis.storage?.readJSON?.("status_viewers_numbers", null);
    if (Array.isArray(saved)) {
      setSelectedNumbers(
        saved
          .map(normalizeNumber)
          .filter((n) => n && !blockedNumbers.has(n))
      );
      return;
    }
    setSelectedNumbers(dummySelected.filter((n) => !blockedNumbers.has(normalizeNumber(n))));
  }, [blockedNumbers]);

  const saveSelected = (list) => {
    setSelectedNumbers(list);
    globalThis.storage?.setItem?.("status_viewers_numbers", JSON.stringify(list));
  };

  useEffect(() => {
    const isWeb =
      !globalThis?.Capacitor?.isNativePlatform?.() &&
      globalThis?.Capacitor?.getPlatform?.() !== "ios" &&
      globalThis?.Capacitor?.getPlatform?.() !== "android";

    const fetchContacts = async () => {
      try {
        setLoading(true);
        const permissionStatus = await Contacts.requestPermissions();
        if (permissionStatus.contacts !== "granted") {
          if (isWeb) setContacts(dummyContacts);
          return;
        }
        const result = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true,
          },
        });
        const formatted = result.contacts
          .map((contact) => {
            const rawNumber = contact.phones?.[0]?.number || "";
            const normalized = normalizeNumber(rawNumber);
            if (!normalized) return null;
            return {
              id: contact.contactId,
              name:
                contact.name?.display ||
                `${contact.name?.given || ""} ${contact.name?.family || ""}`.trim(),
              phoneNumber: normalized,
            };
          })
          .filter(Boolean)
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setContacts(formatted);
      } catch (err) {
        console.error("Failed to fetch contacts", err);
        if (isWeb) setContacts(dummyContacts);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  const selectedDetails = useMemo(() => {
    return selectedNumbers.map((number) => {
      const match = usersMain.find((u) => {
        const userNumber =
          u.phoneNumber || u.phone || u.mobile || u.number || u.contactNumber;
        return normalizeNumber(userNumber) === normalizeNumber(number);
      });
      const blocked = isBlockedNumber(number);
      return {
        key: number,
        phoneNumber: number,
        name: match?.name || match?.username || number,
        avatar: match?.avatar || match?.profilePhoto || img,
        blocked,
      };
    });
  }, [selectedNumbers, usersMain, blockedNumbers]);

  const availableContacts = useMemo(() => {
    const selectedSet = new Set(selectedNumbers.map(normalizeNumber));
    return contacts.filter((c) => !selectedSet.has(normalizeNumber(c.phoneNumber)));
  }, [contacts, selectedNumbers]);

  const query = searchQuery.trim().toLowerCase();
  const matchesQuery = (item) => {
    const name = (item.name || "").toLowerCase();
    const phone = (item.phoneNumber || "").toLowerCase();
    return !query || name.includes(query) || phone.includes(query);
  };

  const filteredSelected = selectedDetails.filter(matchesQuery);
  const filteredAvailable = availableContacts.filter(matchesQuery);

  const toggleSelected = (number) => {
    const normalized = normalizeNumber(number);
    if (!normalized) return;
    if (isBlockedNumber(normalized)) return;
    if (selectedNumbers.includes(normalized)) {
      saveSelected(selectedNumbers.filter((n) => n !== normalized));
    } else {
      saveSelected([...selectedNumbers, normalized]);
    }
  };

  return (
    <IonContent className="status-viewers-page">
      <div className="status-viewers-header-bar">
        <button
          type="button"
          className="status-viewers-back"
          onClick={() => {
            if (cameFromStatusUpload) {
              globalThis.storage?.setItem?.("status_upload_return", JSON.stringify(true));
            }
            history.goBack();
          }}
        >
          &larr;
        </button>
        <div className="status-viewers-title-bar">Status viewers</div>
        <div className="status-viewers-spacer" />
      </div>

      <div className="status-viewers-search">
        <input
          type="text"
          placeholder="Search name or number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {loading && (
        <div className="status-viewers-inline-loader">
          <span className="status-viewers-inline-spinner" />
          <span>Loading contacts...</span>
        </div>
      )}

      <div className="status-viewers-section-card">
        <div className="status-viewers-section-title">Selected contacts</div>
        {filteredSelected.length === 0 ? (
          <div className="status-viewers-empty">No selected contacts</div>
        ) : (
          filteredSelected.map((viewer) => (
            <div className="status-viewers-row" key={viewer.key}>
              <img src={viewer.avatar} alt={viewer.name} />
              <div className="status-viewers-row-text">
                <div className="status-viewers-row-name">{viewer.name}</div>
                <div className="status-viewers-row-sub">
                  {viewer.phoneNumber}
                  {viewer.blocked ? " · Blocked" : ""}
                </div>
              </div>
              <label className="status-viewers-check">
                <input
                  type="checkbox"
                  checked
                  disabled={viewer.blocked}
                  onChange={() => toggleSelected(viewer.phoneNumber)}
                />
                <span />
              </label>
            </div>
          ))
        )}
      </div>

      <div className="status-viewers-section-card">
        <div className="status-viewers-section-title">From contacts</div>
        {filteredAvailable.length === 0 ? (
          <div className="status-viewers-empty">No contacts found</div>
        ) : (
          filteredAvailable.map((contact) => (
            <div className="status-viewers-row" key={contact.id}>
              <img src={img} alt={contact.name || contact.phoneNumber} />
              <div className="status-viewers-row-text">
                <div className="status-viewers-row-name">
                  {contact.name || contact.phoneNumber}
                </div>
                <div className="status-viewers-row-sub">
                  {contact.phoneNumber}
                  {isBlockedNumber(contact.phoneNumber) ? " · Blocked" : ""}
                </div>
              </div>
              <label className="status-viewers-check">
                <input
                  type="checkbox"
                  checked={false}
                  disabled={isBlockedNumber(contact.phoneNumber)}
                  onChange={() => toggleSelected(contact.phoneNumber)}
                />
                <span />
              </label>
            </div>
          ))
        )}
      </div>

      <IonLoading isOpen={loading} message={"Loading..."} duration={0} />
    </IonContent>
  );
};

export default StatusViewers;
