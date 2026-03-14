let reconnectTimer = null;

export function scheduleReconnect(connectFn, url, delayMs = 5000) {
  clearReconnect();
  reconnectTimer = setTimeout(() => {
    try {
      connectFn(url);
    } catch {
      // swallow to avoid unhandled errors from reconnect attempts
    }
  }, delayMs);
  return reconnectTimer;
}

export function clearReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

export function hasReconnectScheduled() {
  return !!reconnectTimer;
}
