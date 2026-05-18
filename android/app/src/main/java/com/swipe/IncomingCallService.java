package com.swipe;


import static android.media.session.PlaybackState.ACTION_STOP;

import android.app.Service;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Notification;
import android.app.PendingIntent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.PowerManager;
import android.util.Log;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import androidx.core.app.Person;
import androidx.core.app.NotificationCompat;
import com.swipe.auth.TokenRefresher;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class IncomingCallService extends Service {

    private static final String CHANNEL_ID = "incoming_call_channel";
    private MediaPlayer mediaPlayer;
    private Handler handler = new Handler(Looper.getMainLooper());
    public static final String ACTION_STOP = "com.swipe.ACTION_STOP_INCOMING_CALL";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            Log.d("CallService", "Stopping incoming call service");


            stopForeground(true); // 🔥 THIS removes the notification
            stopSelf();
            stopRingtone();
            return START_NOT_STICKY;
        }
        String dataJson = intent.getStringExtra("data");
        if (dataJson == null) {
            stopSelf();
            return START_NOT_STICKY;
        }



        triggerWarmup();
        // Save so JS can read immediately
      //  saveIncomingCall(dataJson);
        wakeScreen();
        // Show notification
        showCallNotification(dataJson);

        // Ringtone
        startRingtone();

        // Timeout
        scheduleTimeout(30_000, dataJson);

        return START_NOT_STICKY;
    }

    // ===========================================================
    // SAVE PAYLOAD FOR JS
    // ===========================================================
    private void wakeScreen() {
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);

            PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK |
                            PowerManager.ACQUIRE_CAUSES_WAKEUP |
                            PowerManager.ON_AFTER_RELEASE,
                    "swipe:call_wake"
            );

            // Acquire for 4 seconds
            wl.acquire(4000);

        } catch (Exception e) {
            Log.e("CallService", "Wake screen failed", e);
        }
    }


    // ===========================================================
    // TIMEOUT
    // ===========================================================
    private void scheduleTimeout(long ms, String dataJson) {
        handler.postDelayed(() -> {
            try {
                if (dataJson != null) {
                    JSONObject incoming = new JSONObject(dataJson);
                    String callerId = incoming.optString("callerId", incoming.optString("id", null));
                    long ts = incoming.optLong("ts", System.currentTimeMillis());
                    CallPrefsUtil.appendCallLog(
                            this,
                            callerId,
                            "incoming",
                            "missed",
                            false,
                            ts
                    );
                }
            } catch (Exception e) {
                Log.e("CallService", "Failed to log missed call", e);
            }
            clearIncomingCallPrefs("timeout");
            stopSelf();
        }, ms);
    }

    // ===========================================================
    // RINGTONE
    // ===========================================================
    private void startRingtone() {
        stopRingtone(); // ensure no previous sound running

        // 1) Try to use system ringtone
//        if (playSystemRingtone()) {
//            return; // success
//        }

        // 2) Fallback to bundled ringtone
        playFallbackRingtone();
    }
    private boolean playSystemRingtone() {
        try {
            Uri uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_RINGTONE);

            if (uri == null) {
                Log.w("CallService", "No system ringtone set");
                return false;
            }

            MediaPlayer mp = new MediaPlayer();
            mp.setAudioStreamType(AudioManager.STREAM_RING);
            mp.setLooping(true);
            mp.setDataSource(this, uri);
            mp.prepare();
            mp.start();

            mediaPlayer = mp;

            Log.d("CallService", "Playing system ringtone");
            return true;

        } catch (Exception e) {
            Log.w("CallService", "Failed system ringtone: " + e);
            safeRelease();
            return false;
        }
    }

    private void playFallbackRingtone() {
        try {
            mediaPlayer = MediaPlayer.create(this, R.raw.ringtone);

            if (mediaPlayer == null) {
                Log.e("CallService", "Fallback ringtone failed: null player");
                return;
            }

            mediaPlayer.setLooping(true);
            mediaPlayer.start();

            Log.d("CallService", "Playing fallback ringtone (raw resource)");

        } catch (Exception e) {
            Log.e("CallService", "Fallback ringtone fatal error", e);
            safeRelease();
        }
    }

    private void safeRelease() {
        try {
            if (mediaPlayer != null) {
                mediaPlayer.reset();
                mediaPlayer.release();
            }
        } catch (Exception ignored) {}
        mediaPlayer = null;
    }


    private void stopRingtone() {
        if (mediaPlayer == null) return;

        try {
            if (mediaPlayer.isPlaying()) {
                mediaPlayer.stop();
            }
        } catch (IllegalStateException ignored) {}

        safeRelease();
    }

    private void fetchAndStoreOfferAsync( String dataJson) {
        new Thread(() -> {
            HttpURLConnection conn = null;

            try {

                // --------------------------------------------------
                // 1️⃣ Parse input JSON
                // --------------------------------------------------
                JSONObject data = new JSONObject(dataJson);
                String callId = data.optString("callId", null);

                if (callId == null || callId.isEmpty()) {
                    Log.w("CallService", "Missing callId, cannot fetch offer");
                    return;
                }

                // --------------------------------------------------
                // 2️⃣ Read token from prefs
                // --------------------------------------------------
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);

                String token = prefs.getString("token", null);

                if (token == null || token.isEmpty()) {
                    Log.w("CallService", "Auth token missing, cannot fetch offer");
                    return;
                }

                // --------------------------------------------------
                // 3️⃣ Build request jit
                // --------------------------------------------------
                URL url = new URL(Constants.BASE_API_URL  + "/call/offer/" + callId);
                conn = (HttpURLConnection) url.openConnection();


                conn.setRequestMethod("GET");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setRequestProperty("Accept", "application/json");
                conn.setRequestProperty("Auth", token);
                String deviceId = prefs.getString("deviceId", null);
                if (deviceId != null && !deviceId.isEmpty()) {
                    conn.setRequestProperty("X-Device-Id", deviceId);
                }

                int code = conn.getResponseCode();
                if (code == 401) {
                    String newToken = TokenRefresher.refresh(this);
                    if (newToken != null) {
                        conn.disconnect();
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setConnectTimeout(8000);
                        conn.setReadTimeout(8000);
                        conn.setRequestProperty("Accept", "application/json");
                        conn.setRequestProperty("Auth", newToken);
                        if (deviceId != null && !deviceId.isEmpty()) {
                            conn.setRequestProperty("X-Device-Id", deviceId);
                        }
                        code = conn.getResponseCode();
                    }
                }

                if (code != 200) {
                    Log.w("CallService", "Offer fetch failed, code=" + code);
                    return;
                }

                // --------------------------------------------------
                // 4️⃣ Read response
                // --------------------------------------------------
                StringBuilder sb = new StringBuilder();
                try (java.io.BufferedReader br =
                             new java.io.BufferedReader(
                                     new java.io.InputStreamReader(conn.getInputStream()))) {

                    String line;
                    while ((line = br.readLine()) != null) {
                        sb.append(line);
                    }
                }

                JSONObject response = new JSONObject(sb.toString());
                JSONObject offer = response.optJSONObject("offer");

                if (offer == null) {
                    Log.w("CallService", "Offer missing in response");
                    return;
                }
// Abort if call already cleared / declined
                if (!prefs.contains("incoming_call_data")) {
                    Log.w("CallService", "Call inactive, discarding fetched offer");
                    return;
                }

                // --------------------------------------------------
                // 5️⃣ Store offer safely (replace any previous)
                // --------------------------------------------------
                prefs.edit()
                        .remove("incoming_call_offer")   // remove old if exists
                        .putString("incoming_call_offer", offer.toString())
                        .apply();

                Log.d("CallService", "Offer fetched & stored successfully");

            } catch (Exception e) {
                Log.e("CallService", "fetchAndStoreOfferAsync failed", e);
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }


    // ===========================================================
    // NOTIFICATION
    // ===========================================================
  private void showCallNotification(String dataJson) {
    try {
        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);

        // Check existing incoming call
        String existing = prefs.getString("incoming_call_data", null);
        String existingoffer = prefs.getString("incoming_call_offer", null);
        if ((existing != null && !existing.isEmpty()) ) {

            Log.w("CallService", "Duplicate incoming call detected — auto declining" + existing);
            clearIncomingCallPrefs("show notfications");

        }

        fetchAndStoreOfferAsync( dataJson);
        // Save so JS can read immediately
        prefs.edit().putString("incoming_call_data", dataJson).apply();

        JSONObject data = new JSONObject(dataJson);
        String callerId = data.optString("id", null);

        String userListJson = prefs.getString("usersMain", null);
        JSONArray userArray = userListJson != null ? new JSONArray(userListJson) : new JSONArray();

        JSONObject user = findUserById(userArray, callerId);

        String callerName = user != null ? user.optString("name", "Unknown") : "Unknown";
        String avatarUrl  = user != null ? user.optString("avatar", null) : null;

        Log.d("CallService", "Showing call notif for " + callerName);

        // Build notification
        startForegroundWithActions(callerName, avatarUrl, dataJson);

    } catch (Exception e) {
        Log.e("CallService", "Notif err", e);
    }
}


    private JSONObject findUserById(JSONArray arr, String id) {
        if (id == null) return null;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject u = arr.optJSONObject(i);
            if (u != null && id.equals(u.optString("id"))) return u;
        }
        return null;
    }
private void autoDecline(String dataJson) {
    new Thread(() -> {
        try {
            JSONObject j = new JSONObject(dataJson);
            j.put("status", "declined");
            j.put("reason", "auto_duplicate");
            j.put("ts", System.currentTimeMillis());

            URL url = new URL(Constants.CALL_DECLINE_ENDPOINT);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            try(OutputStream os = conn.getOutputStream()) {
                os.write(j.toString().getBytes());
            }

            conn.getResponseCode();
            conn.disconnect();
            clearIncomingCallPrefs("auto-decloine");
        } catch (Exception e) {
            Log.e("CallDecline", "Auto decline failed", e);
        }
    }).start();
}




    private void triggerWarmup() {
        Intent i = new Intent(this, WarmupService.class);

        try {
            startService(i);
        } catch (Exception e) {
            Log.e("WarmupService", "Failed to start warmup", e);
        }
    }

    private void clearIncomingCallPrefs(String reason) {
        try {
            SharedPreferences prefs =
                    getSharedPreferences("CapacitorStorage", MODE_PRIVATE);

            prefs.edit()
                    .remove("incoming_call_data")
                    .remove("incoming_call_offer")
                    .apply();

            Log.w(
                    "CallService",
                    "Incoming call prefs cleared | reason=" + reason +
                            " | thread=" + Thread.currentThread().getName()
            );

        } catch (Exception e) {
            Log.e("CallService", "Failed to clear call prefs", e);
        }
    }


    private void startForegroundWithActions(String name, String avatarUrl, String dataJson) {

        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
            if (ch == null) {
                ch = new NotificationChannel(
                        CHANNEL_ID,
                        "Incoming Calls Native",
                        NotificationManager.IMPORTANCE_HIGH
                );
                ch.setSound(null, null);
                ch.enableVibration(false);
                ch.setVibrationPattern(new long[]{0});
                ch.setBypassDnd(false);
                nm.createNotificationChannel(ch);
            }
        }

        // Accept action
        Intent acceptIntent = new Intent(this, MainActivity.class);
        acceptIntent.putExtra("data", dataJson);

// VERY IMPORTANT flags
        acceptIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                        Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        PendingIntent acceptPending = PendingIntent.getActivity(
                this,
                0,
                acceptIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Decline action
        Intent declineIntent = new Intent(this, CallDeclineReceiver.class);
        declineIntent.putExtra("data", dataJson);
        PendingIntent declinePending = PendingIntent.getBroadcast(
                this, 1, declineIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Person caller =
                new Person.Builder()
                        .setName(name)
                        .setImportant(true)
                        .build();

        // Build
        NotificationCompat.Builder b =
                new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setSmallIcon(R.drawable.echoid_v3)
                        .setContentTitle(name)
                        .setContentText("Incoming call…")
                        .setCategory(NotificationCompat.CATEGORY_CALL)
                        .setPriority(NotificationCompat.PRIORITY_MAX)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setOngoing(true)
                        .setAutoCancel(false)
                        .setSound(null)
                        .setVibrate(new long[]{0})
                        .setFullScreenIntent(acceptPending, true)
                        .setStyle(
                                NotificationCompat.CallStyle.forIncomingCall(
                                        caller,
                                        declinePending,
                                        acceptPending
                                )
                        );


        // Avatar
        if (avatarUrl != null && avatarUrl.startsWith("http")) {
            try {
                Bitmap bm = BitmapFactory.decodeStream(new URL(avatarUrl).openStream());
                if (bm != null) b.setLargeIcon(bm);
            } catch (Exception ignored) {}
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    333,
                    b.build(),
                     ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
        } else {
            startForeground(333, b.build());
        }

    }

    // ===========================================================
    // CLEANUP
    // ===========================================================

    @Override
    public void onDestroy() {
        stopRingtone();
        handler.removeCallbacksAndMessages(null);

        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
