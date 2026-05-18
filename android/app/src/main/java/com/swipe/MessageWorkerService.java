package com.swipe;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.gson.Gson;
import com.swipe.auth.TokenRefresher;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.json.JSONArray;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;

import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.MGF1ParameterSpec;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import java.security.spec.RSAPrivateCrtKeySpec;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MessageWorkerService extends Service {

    private static final String FG_CHANNEL_ID = "msg_worker_fg";
    private boolean foregroundStarted = false;

    private static JSONObject sanitizeUsersMainEntry(JSONObject user) {
        if (user == null) return null;

        String id = user.optString("id", "").trim();
        if (id.isEmpty()) return null;

        String name = user.optString("name", "").trim();
        if (name.isEmpty()) {
            name = id;
        }

        try {
            user.put("id", id);
            user.put("name", name);
            if (!user.has("avatar")) user.put("avatar", JSONObject.NULL);
            if (!user.has("lastMessage")) user.put("lastMessage", "");
            if (!user.has("timestamp")) user.put("timestamp", "");
            if (!user.has("unreadCount")) user.put("unreadCount", 0);
            return user;
        } catch (Exception e) {
            Log.e("MessageWorker", "Failed to sanitize usersMain entry", e);
            return null;
        }
    }

    // ---------------------------------------------------------------------
    // Foreground service required overrides
    // ---------------------------------------------------------------------

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {

        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String dataString = intent.getStringExtra("data");
        if (dataString == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        try {
            JSONObject data = new JSONObject(dataString);
            startSafeForeground("Processing message", "Decrypting & storing");

            ExecutorService exec = Executors.newSingleThreadExecutor();
            exec.submit(() -> {
                try {
                    handleMessageWorkerLogic(this, data);
                } catch (Throwable t) {
                    Log.e("MessageWorker", "Fatal error", t);
                } finally {
                    stopSafeForeground();
                }
            });

        } catch (Exception e) {
            Log.e("MessageWorker", "Invalid JSON", e);
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    // ---------------------------------------------------------------------
    // Foreground setup
    // ---------------------------------------------------------------------

    private void startSafeForeground(String title, String message) {
        if (foregroundStarted) return;

        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel c = nm.getNotificationChannel(FG_CHANNEL_ID);
                if (c == null) {
                    c = new NotificationChannel(
                            FG_CHANNEL_ID,
                            "Message Worker",
                            NotificationManager.IMPORTANCE_LOW
                    );
                    c.enableLights(false);
                    c.enableVibration(false);
                    c.setSound(null, null);
                    nm.createNotificationChannel(c);
                }
            }

            Notification n = new NotificationCompat.Builder(this, FG_CHANNEL_ID)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setSmallIcon(R.drawable.custom_icon_final_background)
                    .setOngoing(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .build();

            startForeground(777, n);
            foregroundStarted = true;
        } catch (Exception e) {
            Log.e("MessageWorker", "startSafeForeground failed", e);
        }
    }

    private void stopSafeForeground() {
        if (!foregroundStarted) {
            stopSelf();
            return;
        }
        try {
            stopForeground(true);
        } catch (Throwable ignore) {}
        foregroundStarted = false;
        stopSelf();
    }

    // ---------------------------------------------------------------------
    // MAIN LOGIC (COPIED EXACTLY FROM YOUR handleMessageNotification)
    // ---------------------------------------------------------------------

    private void handleMessageWorkerLogic(Context context, JSONObject data) {

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);

        final String id = data.optString("id", null);
        final String type = data.optString("type", null);

        if (id == null || id.trim().isEmpty()) {
            Log.w("MessageWorker", "Missing message ID");
            return;
        }

        String token = prefs.getString("token", null);
        String deviceId = prefs.getString("deviceId", null);

        Message msg = getmessage(context, id, token, deviceId, false);
        if (msg == null) {
            Log.w("MessageWorker", "Message fetch returned null");
            return;
        }

        String senderId = msg.sender;
        String timestamp = msg.timestamp;
        String content = msg.content;

        String finalMessage;

        if ("message".equals(type)) {
            try {
                String privateKeyStr = prefs.getString("privateKey", null);
                if (privateKeyStr == null) {
                    finalMessage = "Unable to decrypt: private key missing";
                } else {
                    JSONObject jwk = new JSONObject(privateKeyStr);
                    PrivateKey privateKey = getPrivateKeyFromJWK(jwk);

                    byte[] encryptedAESKey = decodeBase64Strict(msg.encryptedAESKey);
                    byte[] iv = decodeBase64Strict(msg.eniv);
                    byte[] encryptedMessage = decodeBase64Strict(msg.encryptedMessage);

                    byte[] aesKey = decryptAESKeyRSA_OAEP(encryptedAESKey, privateKey);
                    finalMessage = decryptAESGCM(encryptedMessage, aesKey, iv);
                }

            } catch (Exception e) {
                Log.e("Decrypt", "Decryption failed", e);
                finalMessage = "Message decryption error";
            }
        } else {
            finalMessage = (content != null && !content.isEmpty()) ? content : "new message comes";
        }

        // ---------------------------------------------------------
        // UPDATE usersMain
        // ---------------------------------------------------------

        String senderName = "Unknown";
        String avatarUrl = null;

        try {
            String json = prefs.getString("usersMain", "[]");
            JSONArray userArray = new JSONArray(json);
            JSONArray updated = new JSONArray();
            boolean found = false;

            for (int i = 0; i < userArray.length(); i++) {
                JSONObject u = sanitizeUsersMainEntry(userArray.optJSONObject(i));
                if (u == null) {
                    continue;
                }

                if (u.optString("id").equals(senderId)) {
                    int unread = u.optInt("unreadCount", 0) + 1;
                    u.put("unreadCount", unread);
                    u.put("lastMessage", finalMessage);
                    u.put("timestamp", timestamp);

                    senderName = u.optString("name", "Unknown");
                    avatarUrl = u.optString("avatar", null);

                    found = true;
                }

                updated.put(u);
            }

            if (!found) {
                JSONObject newUser = new JSONObject();
                newUser.put("id", senderId);
                newUser.put("name", senderId);
                newUser.put("avatar", JSONObject.NULL);
                newUser.put("lastMessage", finalMessage);
                newUser.put("timestamp", timestamp);
                newUser.put("unreadCount", 1);

                updated.put(newUser);
                senderName = senderId;
            }

            prefs.edit().putString("usersMain", updated.toString()).apply();

        } catch (Exception e) {
            Log.e("MessageWorker", "Failed updating usersMain", e);
        }

        // ---------------------------------------------------------
        // SOUND / MUTE LOGIC
        // ---------------------------------------------------------

        boolean ismute = Boolean.parseBoolean(prefs.getString("ismute", "false"));
        boolean isMutedSender = false;

        String mutedUsers = prefs.getString("mutedUsers", null);
        if (mutedUsers != null) {
            try {
                JSONArray arr = new JSONArray(mutedUsers);
                for (int i = 0; i < arr.length(); i++) {
                    if (senderId.equals(arr.optString(i))) {
                        isMutedSender = true;
                        break;
                    }
                }
            } catch (Exception ignored) {}
        }

        String soundPath = "default";

        if (!ismute && !isMutedSender) {
            String custom = prefs.getString("customSounds", null);
            boolean customFound = false;

            if (custom != null) {
                try {
                    JSONArray a = new JSONArray(custom);
                    for (int i = 0; i < a.length(); i++) {
                        JSONObject e = a.getJSONObject(i);
                        if (senderId.equals(e.optString("senderId"))) {
                            soundPath = e.optString("soundPath", "default");
                            customFound = true;
                            break;
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (!customFound) {
                String global = prefs.getString("ForAllSoundNotification", null);
                if (global != null && !global.equals("null") && !global.trim().isEmpty()) {
                    try {
                        JSONObject g = new JSONObject(global);
                        soundPath = g.optString("path", "default");
                    } catch (Exception ignored) {}
                }
            }
        }

        // ---------------------------------------------------------
        // SHOW NOTIFICATION
        // ---------------------------------------------------------

        if (!ismute && !isMutedSender) {
            showLocalNotification(context, senderId, senderName, finalMessage, soundPath, avatarUrl);
        }

        // ---------------------------------------------------------
        // SAVE NORMALIZED MESSAGE
        // ---------------------------------------------------------

        saveMessageToDB(context, msg, finalMessage, type);
    }

    // ---------------------------------------------------------------------
    // ******* ALL YOUR HELPERS (COPIED EXACTLY) ********
    // ---------------------------------------------------------------------

    public static class Message {
        public String id;
        public String sender;
        public String recipient;
        public String content;
        public String timestamp;
        public String status;
        public int read;

        public String encryptedMessage;
        public String encryptedAESKey;
        public String eniv;
        public String fileName;
        public String fileType;
        public String file_path;
        public long fileSize;
        public String thumbnail;
        public String type;
        public String isReplyTo;
    }

    public static Message getmessage(Context context, String messageid, String token, String deviceId, boolean retried) {
        try {
            URL url = new URL(Constants.BASE_API_URL + "/api/messages/" + messageid);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Auth", token);
            if (deviceId != null && !deviceId.isEmpty()) {
                conn.setRequestProperty("X-Device-Id", deviceId);
            }
            conn.setRequestProperty("Accept", "application/json");

            int code = conn.getResponseCode();
            if (code == 401 && !retried) {
                String newToken = TokenRefresher.refresh(context);
                if (newToken != null) {
                    return getmessage(context, messageid, newToken, deviceId, true);
                }
            }

            BufferedReader r = new BufferedReader(new InputStreamReader(
                    code == 200 ? conn.getInputStream() : conn.getErrorStream()
            ));

            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            r.close();

            if (code == 200) {
                JsonObject json = JsonParser.parseString(sb.toString()).getAsJsonObject();

                if (json.has("thumbnail") && json.get("thumbnail").isJsonObject()) {
                    JsonArray arr = json.getAsJsonObject("thumbnail").getAsJsonArray("data");
                    StringBuilder b = new StringBuilder();
                    for (int i = 0; i < arr.size(); i++) b.append((char) arr.get(i).getAsInt());
                    String thumb = b.toString();
                    if (!thumb.startsWith("data:image/")) json.remove("thumbnail");
                    else json.addProperty("thumbnail", thumb);
                }

                return new Gson().fromJson(json, Message.class);
            }

            return null;

        } catch (Exception e) {
            Log.e("MsgFetch", "getmessage failed", e);
            return null;
        }
    }

    private static byte[] decodeUrlSafeBase64(String input) {
        return Base64.decode(input, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }

    public static PrivateKey getPrivateKeyFromJWK(JSONObject jwk) throws Exception {
        BigInteger n = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("n")));
        BigInteger e = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("e")));
        BigInteger d = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("d")));
        BigInteger p = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("p")));
        BigInteger q = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("q")));
        BigInteger dp = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("dp")));
        BigInteger dq = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("dq")));
        BigInteger qi = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("qi")));

        RSAPrivateCrtKeySpec spec = new RSAPrivateCrtKeySpec(n, e, d, p, q, dp, dq, qi);
        return KeyFactory.getInstance("RSA").generatePrivate(spec);
    }

    public static String decryptAESGCM(byte[] encryptedData, byte[] aesKey, byte[] iv) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(128, iv);
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(aesKey, "AES"), spec);
        return new String(c.doFinal(encryptedData), "UTF-8");
    }

    public static byte[] decryptAESKeyRSA_OAEP(byte[] encryptedKey, PrivateKey privateKey) throws Exception {
        Cipher c = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
        c.init(Cipher.DECRYPT_MODE, privateKey,
                new OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT)
        );
        return c.doFinal(encryptedKey);
    }

    private static byte[] decodeBase64Strict(String s) {
        // Normalize URL-safe to standard (safe even if already standard)
        s = s.replace('-', '+').replace('_', '/');

        // Fix padding (Vivo REQUIRES this)
        int mod = s.length() % 4;
        if (mod != 0) {
            s += "====".substring(mod);
        }

        return Base64.decode(s, Base64.NO_WRAP);
    }


    private void showLocalNotification(Context context, String senderId, String title, String body, String soundPath, String avatarUrl) {
        NotificationHelper.showNotification(
                context,
                title,
                body,
                soundPath,
                NotificationHelper.getStableDirectNotificationId(senderId),
                avatarUrl
        );
    }

    private void saveMessageToDB(Context context, Message msg, String message, String type) {
        try {
            JSONObject message2 = new JSONObject();

            message2.put("id", msg.id != null ? msg.id : "");
            message2.put("sender", msg.sender != null ? msg.sender : "");
            message2.put("recipient", msg.recipient != null ? msg.recipient : "");
            message2.put("content", message);
            message2.put("timestamp", msg.timestamp != null ? msg.timestamp : System.currentTimeMillis());
            message2.put("status", msg.status != null ? msg.status : "sent");
            message2.put("read", 0);
            message2.put("isDeleted", 0);
            message2.put("isDownload", 0);
            message2.put("type", msg.type != null ? msg.type : type);
            message2.put("isReplyTo", msg.isReplyTo != null ? msg.isReplyTo : JSONObject.NULL);

            message2.put("file_name", msg.fileName != null ? msg.fileName : JSONObject.NULL);
            message2.put("file_type", msg.fileType != null ? msg.fileType : JSONObject.NULL);
            message2.put("file_size", msg.fileSize != 0 ? msg.fileSize : JSONObject.NULL);
            message2.put("encryptedMessage", msg.encryptedMessage != null ? msg.encryptedMessage : JSONObject.NULL);
            message2.put("encryptedAESKey", msg.encryptedAESKey != null ? msg.encryptedAESKey : JSONObject.NULL);
            message2.put("eniv", msg.eniv != null ? msg.eniv : JSONObject.NULL);
            message2.put("file_path", msg.file_path != null ? msg.file_path : JSONObject.NULL);

            if (msg.thumbnail != null && !msg.thumbnail.equals("null")) {
                message2.put("thumbnail", msg.thumbnail);
            } else {
                message2.put("thumbnail", JSONObject.NULL);
            }

            message2.put("isError", 0);
            message2.put("isSent", 1);

            SharedPreferences pref = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            pref.edit().putString("message_" + msg.id, message2.toString()).apply();

            Log.d("MessageSave", "Saved message " + msg.id);

        } catch (Exception e) {
            Log.e("MessageWorker", "Failed to save message", e);
        }
    }

}
