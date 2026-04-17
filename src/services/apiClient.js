import { getAccessToken, getRefreshToken, setTokens, globalLogout, isTemporarySession } from "./authTokens";
import { getDeviceInfo, getDeviceId } from "./deviceInfo";
import Swal from "sweetalert2";

let refreshPromise = null;
let refreshSwalShown = false;
let bannedModalPromise = null;
let bannedModalTimer = null;

function isBannedMessage(message) {
  return String(message || "").toLowerCase().includes("banned");
}

export function isUserBannedResponse(status, payload = {}) {
  const message = payload?.error || payload?.message || "";
  return status === 403 && (payload?.banned === true || isBannedMessage(message));
}

export async function showBannedAccountModal(message) {
  const finalMessage =
    message ||
    "You have been banned. If you feel this is a mistake, email the devs.";

  if (bannedModalPromise) return bannedModalPromise;

  bannedModalPromise = new Promise((resolve) => {
    if (bannedModalTimer) {
      clearTimeout(bannedModalTimer);
    }

    bannedModalTimer = setTimeout(async () => {
      try {
        await Swal.fire({
          title: "You have been banned",
          text: finalMessage,
          icon: "error",
          confirmButtonText: "OK",
          width: 320,
          padding: "1.2rem",
          backdrop: "rgba(0,0,0,0.4)",
          customClass: {
            popup: "mobile-alert",
          },
        });
      } finally {
        await globalLogout();
        bannedModalTimer = null;
        bannedModalPromise = null;
        resolve(true);
      }
    }, 120);
  });

  return bannedModalPromise;
}

async function maybeHandleBannedResponse(status, payload = {}) {
  if (!isUserBannedResponse(status, payload)) return false;
  await showBannedAccountModal(
    payload?.error ||
      payload?.message ||
      "You have been banned. If you feel this is a mistake, email the devs."
  );
  return true;
}

export async function refreshAccessToken(host) {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    const deviceInfo = await getDeviceInfo();

    const refreshPath = isTemporarySession() ? "/user/temp/refresh" : "/user/refresh";
    const res = await fetch(`${host}${refreshPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, ...deviceInfo })
    });

    if (!res.ok) {
      let serverMessage = "Your session was revoked. Please login again.";
      let serverPayload = null;
      try {
        const json = await res.json();
        serverPayload = json;
        serverMessage = json?.error || json?.message || serverMessage;
      } catch {
        // ignore JSON parse failures
      }

      if (await maybeHandleBannedResponse(res.status, serverPayload || { message: serverMessage })) {
        return null;
      }

      if (res.status === 401 || res.status === 403) {
        if (!refreshSwalShown) {
          refreshSwalShown = true;
          Swal.fire({
            title: isBannedMessage(serverMessage) ? "Account banned" : "Session revoked",
            text: serverMessage,
            icon: "error",
            confirmButtonText: "OK",
            width: 320,
            padding: "1.2rem",
            backdrop: "rgba(0,0,0,0.4)",
            customClass: {
              popup: "mobile-alert"
            }
          });
        }
        await globalLogout();
      }
      return null;
    }
    const json = await res.json();

    if (!json.authtoken) return null;
    await setTokens({
      accessToken: json.authtoken,
      refreshToken: json.refreshToken || refreshToken,
      isTemporary: isTemporarySession()
    });
    refreshSwalShown = false;
    return json.authtoken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function refreshAccessTokenWithReason(host) {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return { token: null, error: "Missing refresh token" };
  }

  const deviceInfo = await getDeviceInfo();
  const refreshPath = isTemporarySession() ? "/user/temp/refresh" : "/user/refresh";
  const res = await fetch(`${host}${refreshPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, ...deviceInfo })
  });

  if (!res.ok) {
    let errorMessage = "Failed to refresh session";
    let errorPayload = null;
    try {
      const json = await res.json();
      errorPayload = json;
      errorMessage = json?.error || json?.message || errorMessage;
    } catch {
      // ignore JSON parse failures
    }
    if (await maybeHandleBannedResponse(res.status, errorPayload || { message: errorMessage })) {
      return { token: null, error: errorMessage, status: res.status, banned: true };
    }
    if (res.status === 401 || res.status === 403) {
      await globalLogout();
    }
    return { token: null, error: errorMessage, status: res.status };
  }

  const json = await res.json();
  if (!json.authtoken) {
    return { token: null, error: "Missing access token in refresh response" };
  }

  await setTokens({
    accessToken: json.authtoken,
    refreshToken: json.refreshToken || refreshToken,
    isTemporary: isTemporarySession()
  });
  return { token: json.authtoken, error: null };
}

export async function authFetch(url, options = {}, hostForRefresh) {
  const headers = new Headers(options.headers || {});

  const deviceId = await getDeviceId();
  if (deviceId && !headers.has("X-Device-Id")) {
    headers.set("X-Device-Id", deviceId);
  }

  if (!headers.has("Auth") && !headers.has("Authorization")) {
    const accessToken = await getAccessToken();
    if (accessToken) headers.set("Auth", accessToken);
  }

  const method = options.method || "GET";
  console.log("[api] authFetch start", {
    method,
    url,
    hasBody: Boolean(options.body),
    contentType: headers.get("Content-Type") || undefined,
  });

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    console.error("[api] authFetch network error", { method, url, message: err?.message });
    throw err;
  }
  if (hostForRefresh && res.status === 403) {
    try {
      const payload = await res.clone().json();
      if (await maybeHandleBannedResponse(res.status, payload)) {
        return res;
      }
    } catch {
      // ignore parse failures
    }
  }
  if ((res.status !== 401 && res.status !== 403) || !hostForRefresh) return res;

  const newToken = await refreshAccessToken(hostForRefresh);
  if (!newToken) return res;

  headers.set("Auth", newToken);
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    console.error("[api] authFetch retry error", { method, url, message: err?.message });
    throw err;
  }
  return res;
}
