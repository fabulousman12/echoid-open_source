import { LocalNotifications } from '@capacitor/local-notifications';
import { stopCallRingtone, clearCallTimeout } from './callRingtone';
import { appendCallLog } from './callLog';

// Global intent flag
window.__CALL_NOTIFICATION_ACTION__ = null;
window.__CALL_NOTIFICATION_LOGGED__ = false;

LocalNotifications.addListener(
  'localNotificationActionPerformed',
  async (event) => {
    const { notification, actionId } = event;
    const extra = notification?.extra || notification?.data || {};

    if (!extra.callId) return;

    window.__CALL_NOTIFICATION_ACTION__ = actionId || 'TAP';
    stopCallRingtone();
    clearCallTimeout();

    if (actionId === 'DECLINE' && extra.callerId) {
      appendCallLog({
        userId: extra.callerId,
        status: "incoming",
        callStatus: "decline",
        read: true,
        timestamp: extra.ts
      });
      window.__CALL_NOTIFICATION_LOGGED__ = true;
    }

    if (actionId === 'ACCEPT' && extra.callerId) {
      appendCallLog({
        userId: extra.callerId,
        status: "incoming",
        callStatus: "accepted",
        read: true,
        timestamp: extra.ts
      });
      window.__CALL_NOTIFICATION_LOGGED__ = true;
    }
    // Clear state immediately
 
  }
);


