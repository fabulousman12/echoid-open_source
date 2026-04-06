import { getAccessToken, getRefreshToken, setTokens, globalLogout, isTemporarySession } from "./authTokens";
import { getDeviceInfo, getDeviceId } from "./deviceInfo";
import Swal from "sweetalert2";

let refreshPromise = null;
let refreshSwalShown = false;

function isBannedMessage(message) {
  return String(message || "").toLowerCase().includes("banned");
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
      try {
        const json = await res.json();
        serverMessage = json?.error || json?.message || serverMessage;
      } catch {
        // ignore JSON parse failures
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
    try {
      const json = await res.json();
      errorMessage = json?.error || json?.message || errorMessage;
    } catch {
      // ignore JSON parse failures
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
