import React from "react";
import data from "../data";

const policySections = [
  {
    title: "Acceptance of terms",
    body:
      "By creating an account or using EchoID, you agree to follow these Terms of Use and all applicable laws and regulations.",
  },
  {
    title: "User responsibility",
    body:
      "Users are fully responsible for the content they upload, share, send, or store through the platform. EchoID does not actively monitor, review, or verify all user-generated content. We do not encourage illegal activity, copyright infringement, harassment, fraud, abuse, or unauthorized distribution of content.",
  },
  {
    title: "Prohibited activities",
    body:
      "You may not use the platform for unlawful activity, impersonation, malware distribution, spam, harassment, unauthorized access, copyright infringement, or distribution of stolen or illegal material. We reserve the right to restrict or terminate accounts involved in abusive or harmful behavior.",
  },
  {
    title: "End-to-end encrypted chats",
    body:
      "Private one-to-one chats are protected using end-to-end encryption. Message contents are encrypted on your device and can only be decrypted by the intended recipient. EchoID cannot read, access, or recover the contents of encrypted private chats.",
  },
  {
    title: "Group chat encryption",
    body:
      "Group chat end-to-end encryption is currently under development and may be introduced in future updates. Until then, group messages may be processed through our servers for delivery functionality.",
  },
  {
    title: "Message delivery and storage",
    body:
      "Undelivered messages and attachments may be temporarily stored on our servers until successful delivery. After delivery, content may be removed automatically according to system requirements and retention policies.",
  },
  {
    title: "Files and attachments",
    body:
      "Files, images, videos, and other attachments shared through the platform are uploaded at the user's own responsibility. Users must ensure they have the necessary rights or permissions to distribute uploaded content.",
  },
  {
    title: "Copyright and DMCA",
    body:
      "If you believe content on EchoID infringes your copyright or intellectual property rights, contact us by email with the subject line 'Copyright' email :- echoidsc@gmail.com. Your request must include proof of ownership, identification of the copyrighted work, and the direct link to the reported content.",
  },
  {
    title: "Privacy and security",
    body:
      "We store limited account and session information required for authentication, security, and service functionality. Passwords are stored using secure hashing methods. Certain local data such as chat history, downloaded files, and preferences may be stored on your device.",
  },
  {
    title: "Permissions",
    body:
      "EchoID may request permissions including notifications, camera, microphone, storage/media access, contacts, background activity, and overlay access for app functionality such as messaging, calls, media sharing, and incoming call display. Permissions can be managed from your device settings.",
  },
  {
    title: "Third-party services",
    body:
      "Some features may rely on third-party infrastructure providers such as notification delivery, TURN servers, or media hosting services. Their availability and performance may affect certain app features.",
  },
  {
    title: "Account termination",
    body:
      "We reserve the right to suspend, restrict, or terminate accounts that violate these Terms of Use, abuse the platform, or create security or legal risks for other users or the service.",
  },
  {
    title: "Limitation of liability",
    body:
      "EchoID is provided on an 'as is' and 'as available' basis without warranties of uninterrupted availability, accuracy, or reliability. Users use the platform at their own risk.",
  },
  {
    title: "Changes to terms",
    body:
      "These Terms of Use may be updated or modified at any time. Continued use of the platform after updates means you accept the revised terms.",
  },
  {
    title: "Contact",
    body:
      "For legal, copyright, or policy-related requests, contact: support@yourdomain.com",
  },
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
              <div style={baseStyles.eyebrow}>Terms of use</div>
  
            </div>
          </div>
          <div style={{ ...baseStyles.badge, ...theme.badge }}>v{data.TermsVersion}</div>
        </div>
        <p style={baseStyles.intro}>
          By using this app, you agree to this Terms of use. We respect your privacy and are committed to protecting
          your information.
        </p>
      
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
          Version {data.UseVersion}
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

export default function TermsUse({
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
