import { clearAnonymousPosterSecret, saveAnonymousPosterSecretFromVault } from "./anonymousPosterVault";

const ANONYMOUS_PROFILE_KEY = "anonymousProfile";

function readAnonymousProfile() {
  return globalThis.storage?.readJSON?.(ANONYMOUS_PROFILE_KEY, null) || null;
}

function saveAnonymousProfile(profile) {
  if (!profile) return;
  const normalized = { ...profile };
  if (normalized.id && !normalized._id) {
    normalized._id = normalized.id;
  }
  delete normalized.id;
  globalThis.storage?.setItem?.(ANONYMOUS_PROFILE_KEY, JSON.stringify(normalized));
  if (normalized.anonymousPosterVault) {
    saveAnonymousPosterSecretFromVault(normalized.anonymousPosterVault).catch(() => {});
  }
}

function clearAnonymousProfile() {
  globalThis.storage?.removeItem?.(ANONYMOUS_PROFILE_KEY);
  clearAnonymousPosterSecret();
}

export {
  ANONYMOUS_PROFILE_KEY,
  readAnonymousProfile,
  saveAnonymousProfile,
  clearAnonymousProfile,
};
