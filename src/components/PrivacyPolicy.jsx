import React from "react";
import data from "../data";

const policySections = [
  {
    title: "Information we store",
    body:
      "We store basic account details you provide such as name, email, phone number, and profile image at account creation.",
  },
  {
    title: "Messages and delivery",
    body:
      "Messages are stored on our servers only while undelivered. After delivery, they are removed from the database.",
  },
  {
    title: "Local device storage",
    body:
      "Chat history, call history, app preferences (mute, notification sounds), and downloaded files are stored locally on your device for performance and offline access. You can delete local data from within the app.",
  },
  {
    title: "Security and sessions",
    body: "Device details like model and OS are used to manage login sessions and keep your account secure.",
  },
  {
    title: "Session metadata",
    body:
      "For security, we store session metadata such as device name, OS, app version, IP address, last active time, and user agent And you can revoke any session.",
  },
  {
    title: "Encryption",
    body:
      "Messages are encrypted using asymmetric RSA 2048-bit cryptography. Your private key stays only on your device. A Encrytped copy using your password is stored in the database for matching purposes. Passwords are also stored as one-way hash + salt.",
  },
  {
    title: "Media and permissions",
    body:
      "Camera and microphone access are used for calls and voice messages. Photo and media access are used for profile images and attachments. Contacts access is optional and only used to show your device contacts when you create a new chat.",
  },
  {
    title: "Files and attachments",
    body:
      "Files you send are uploaded to our servers for delivery and may be retained as needed for recipients to download. Downloaded files are saved on your device. And then deleted from our servers after delivery. You can delete downloaded files from your device to free up space.",
  },
  {
    title: "Location",
    body:
      "If you choose to set a location, we use a location search service to help you pick it. Providing location is optional.",
  },
  {
    title: "Notifications",
    body:
      "Dead app delivery is handled by third-party services such as FCM and Pushy. We do not use extra data without your prior permission. We store a device token to send notifications.",
  },
  {
    title: "Calls",
    body:
      "Calls are designed to be peer-to-peer to bypass servers when possible. A TURN server is used as a fallback. Call history is saved locally on your device.",
  },
  {
    title: "Your choices",
    body: "You can edit your profile, manage sessions, and request account deletion.",
  },
  {
    title: "Contact",
    body: "If you have questions about privacy, contact support through admin chat in settings.",
  },
  {
    title: "Anonymous posts",
    body:
      "EchoID supports anonymous posting through Maskey Tier 3 anonymization. When a post is created anonymously, the system is designed to separate the author's identity from the published content and minimize the ability to link the two. If a user does not voluntarily reveal identifying information within the post or through external actions, determining the author's identity from the anonymous post alone is intended to be computationally and practically infeasible under normal operation. However, anonymity may be reduced if users disclose personal information, reuse identifiable usernames elsewhere, reveal their identity through writing patterns, or if disclosure is required by applicable law.",
  },
  {
    title: "Permissions and their usage ",
    body: "We request permissions for camera, microphone, photos/media/files, contacts, background activity ,overlay and notifications. Camera and microphone access are used for calls and voice messages. Photo and media access are used for profile images and attachments. Contacts access is optional and only used to show your device contacts when you create a new chat. Notifications permission is used to send you alerts about new messages and calls.Background activity permission is used to keep the app running in the background for timely message delivery and notifications. Overlay permission is used to show incoming call screens and chat heads when the app is in the background. We only request permissions that are necessary for the app's core functionality, and you can choose to grant or deny them based on your preferences.",
  }
];

const palette = {
  light: {
    shell: {
      color: "#334155",
    },
    hero: {
      border: "1px solid #dbeafe",
      background: "linear-gradient(135deg, #eef6ff 0%, #f8f5ff 58%, #fff7ed 100%)",
      boxShadow: "0 16px 38px rgba(30, 41, 59, 0.08)",
    },
    badge: {
      color: "#1d4ed8",
      background: "rgba(37, 99, 235, 0.1)",
      border: "1px solid rgba(37, 99, 235, 0.14)",
    },
    card: {
      color: "#475569",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
    },
    title: {
      color: "#0f172a",
    },
  },
  dark: {
    shell: {
      color: "#dbeafe",
    },
    hero: {
      border: "1px solid rgba(148, 163, 184, 0.18)",
      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(49, 46, 129, 0.38) 62%, rgba(15, 23, 42, 0.98) 100%)",
      boxShadow: "0 16px 38px rgba(0, 0, 0, 0.28)",
    },
    badge: {
      color: "#bfdbfe",
      background: "rgba(96, 165, 250, 0.12)",
      border: "1px solid rgba(147, 197, 253, 0.16)",
    },
    card: {
      color: "#cbd5e1",
      background: "rgba(15, 23, 42, 0.72)",
      border: "1px solid rgba(148, 163, 184, 0.16)",
      boxShadow: "0 10px 26px rgba(0, 0, 0, 0.18)",
    },
    title: {
      color: "#f8fafc",
    },
  },
};

const baseStyles = {
  shell: {
    fontSize: 13,
    lineHeight: 1.65,
    paddingRight: 2,
  },
  hero: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  heroTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    color: "#ffffff",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    fontWeight: 800,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    marginBottom: 4,
    opacity: 0.72,
  },
  heroTitle: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.15,
    fontWeight: 800,
  },
  badge: {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  intro: {
    margin: "0 0 12px",
  },
  highlights: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 8,
  },
  highlight: {
    borderRadius: 12,
    padding: "10px 12px",
    background: "rgba(255, 255, 255, 0.42)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    fontWeight: 700,
  },
  sectionGrid: {
    display: "grid",
    gap: 10,
  },
  card: {
    borderRadius: 14,
    padding: "13px 14px",
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontWeight: 800,
    marginBottom: 5,
  },
  sectionNumber: {
    minWidth: 24,
    height: 24,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    fontSize: 11,
    fontWeight: 800,
  },
  body: {
    marginLeft: 33,
  },
};

function PrivacyPolicyBody({ variant = "light" }) {
  const isDark = variant === "dark";
  const theme = isDark ? palette.dark : palette.light;
  const highlights = ["Encrypted messages", "Local chat history", "Optional contacts", "Session control"];
  const shellStyle = {
    ...baseStyles.shell,
    ...theme.shell,
    ...(isDark ? { maxHeight: "min(68vh, 720px)", overflowY: "auto" } : {}),
  };

  return (
    <div style={shellStyle}>
      <div style={{ ...baseStyles.hero, ...theme.hero }}>
        <div style={baseStyles.heroTop}>
          <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
            <div style={baseStyles.icon} aria-hidden="true">
              P
            </div>
            <div>
              <div style={baseStyles.eyebrow}>Privacy at a glance</div>
              <h2 style={{ ...baseStyles.heroTitle, ...theme.title }}>Your data stays purposeful and controlled.</h2>
            </div>
          </div>
          <div style={{ ...baseStyles.badge, ...theme.badge }}>v{data.TermsVersion}</div>
        </div>
        <p style={baseStyles.intro}>
          By using this app, you agree to this Privacy Policy. We respect your privacy and are committed to protecting
          your information.
        </p>
        <div style={baseStyles.highlights}>
          {highlights.map((item) => (
            <div key={item} style={baseStyles.highlight}>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div style={baseStyles.sectionGrid}>
        {policySections.map((section, index) => (
          <section key={section.title} style={{ ...baseStyles.card, ...theme.card }}>
            <div style={{ ...baseStyles.title, ...theme.title }}>
              <span style={baseStyles.sectionNumber}>{index + 1}</span>
              <span>{section.title}</span>
            </div>
            <div style={baseStyles.body}>{section.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

const headingStyles = {
  light: {
    wrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 12,
    },
    title: {
      margin: 0,
      color: "#0f172a",
      fontSize: 22,
      lineHeight: 1.15,
      fontWeight: 800,
    },
    version: {
      color: "#64748b",
      fontSize: 12,
      fontWeight: 700,
    },
  },
  dark: {
    wrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 12,
    },
    title: {
      margin: 0,
      color: "#f8fafc",
      fontSize: 20,
      lineHeight: 1.15,
      fontWeight: 800,
    },
    version: {
      color: "#94a3b8",
      fontSize: 12,
      fontWeight: 700,
    },
  },
};

function PrivacyPolicyHeader({ title, showVersionHeader, variant }) {
  if (!title && !showVersionHeader) return null;
  const styles = variant === "dark" ? headingStyles.dark : headingStyles.light;

  return (
    <div style={styles.wrapper}>
      {title ? <h1 style={styles.title}>{title}</h1> : <span />}
      {showVersionHeader ? (
        <div style={styles.version}>
          Version {data.TermsVersion}
        </div>
      ) : null}
    </div>
  );
}

function ActionBar({ onClose, onAccept, closeLabel, acceptLabel, cancelButtonStyle, acceptButtonStyle }) {
  const hasActions = Boolean(onClose || onAccept);
  if (!hasActions) return null;

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
      {onClose ? (
        <button type="button" onClick={onClose} style={cancelButtonStyle}>
          {closeLabel}
        </button>
      ) : null}
      {onAccept ? (
        <button type="button" onClick={onAccept} style={acceptButtonStyle}>
          {acceptLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function PrivacyPolicy({
  variant = "light",
  title = "Privacy Policy",
  showVersionHeader = false,
  onClose,
  onAccept,
  closeLabel = "Close",
  acceptLabel = "Accept",
  cancelButtonStyle,
  acceptButtonStyle,
}) {
  return (
    <>
      <PrivacyPolicyHeader title={title} showVersionHeader={showVersionHeader} variant={variant} />
      <PrivacyPolicyBody variant={variant} />
      <ActionBar
        onClose={onClose}
        onAccept={onAccept}
        closeLabel={closeLabel}
        acceptLabel={acceptLabel}
        cancelButtonStyle={cancelButtonStyle}
        acceptButtonStyle={acceptButtonStyle}
      />
    </>
  );
}
