package com.swipe;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

import java.io.IOException;
import java.util.Map;

import android.app.NotificationManager;

import android.content.SharedPreferences;

import org.json.JSONException;


import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import com.swipe.auth.TokenRefresher;


public class FcmNotificationService extends FirebaseMessagingService {

    private static final String TAG = "FCM-Ext";
    private static final String PREF_NAME = "CapacitorStorage";
    private static final String AUTH_TOKEN_KEY = "token";
    private static final String DEVICE_ID_KEY = "deviceId";
    private boolean oneSignalInitialized = false;

    private static final String DEVICE_TOKEN_KEY = "device_token";
    private boolean foregroundStarted = false;
    @Override
    public void onNewToken(@NonNull String token) {
        Log.d(TAG, "FCM token refreshed: " + token);

        // 1️⃣ Always store locally
        SharedPreferences prefs =
                getSharedPreferences("CapacitorStorage", MODE_PRIVATE);


        // 2️⃣ Send to backend ONLY if auth token exists
        String authToken = prefs.getString("token", null);
        if (authToken == null || authToken.isEmpty()) {
            Log.d(TAG, "Auth token missing, deferring FCM registration");
            return;
        }

        // 3️⃣ Fire-and-forget network call (NO Activity)
        compareAndHandleToken(token,"fcm" ,authToken);
    }


    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        try {
            Map<String, String> dataMap = remoteMessage.getData();
            suppressFcmNotification(remoteMessage);
            if (dataMap == null || dataMap.isEmpty()) {
                Log.w(TAG, "Empty FCM data payload");
                return;
            }

            // 🔴 EXACT replacement for OneSignal additionalData
            JSONObject data = new JSONObject(dataMap);
            Log.d(TAG, "FCM data received: " + data);

            if (!data.has("receive_type")) {
                Log.w(TAG, "Missing receive_type");
                return;
            }

            String receiveType = data.optString("receive_type");
            Context context = getApplicationContext();

            switch (receiveType) {

                case "message":
                    startMessageWorker(context, data);
                    break;

                case "group_message":
                    if (isExpiredPayload(data)) {
                        Log.i(TAG, "Dropping stale FCM group push: " + data.optString("id"));
                        return;
                    }
                    startGroupMessageWorker(context, data);
                    break;

                case "call":
                    handleCallNotification(context, data);
                    break;

                case "test":
                    showLocalNotification(
                            context,
                            "FCM Test",
                            data.optString("content"),
                            "default",
                            null
                    );
                    break;
                // case "notification":
                //     showLocalNotification(
                //             context,
                //             data.optString("title"),
                //             data.optString("body"),
                //             "default",
                //             null
                //     );
                //     break;

                default:
                    Log.w(TAG, "Unknown receive_type: " + receiveType);
            }

        } catch (Exception e) {
            Log.e(TAG, "FCM processing failed", e);
        }
    }

    private boolean isExpiredPayload(JSONObject data) {
        try {
            long ttlMs = data.optLong("ttlMs", 30000L);
            if (ttlMs <= 0) ttlMs = 30000L;
            String sentAt = data.optString("sentAt", "");
            if (sentAt == null || sentAt.trim().isEmpty()) return false;
            long sentAtMs = java.time.Instant.parse(sentAt).toEpochMilli();
            return System.currentTimeMillis() - sentAtMs > ttlMs;
        } catch (Exception ignored) {
            return false;
        }
    }
    private void startMessageWorker(Context context, JSONObject data) {
        try {
            Intent i = new Intent(context, MessageWorkerService.class);
            i.putExtra("data", data.toString());
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(i);
            }


            Log.i("OneSignalExt", "MessageWorkerService started");
        } catch (Exception e) {
            Log.e("OneSignalExt", "Failed to start MessageWorkerService", e);
        }
    }

    private void startGroupMessageWorker(Context context, JSONObject data) {
        try {
            Intent i = new Intent(context, GroupMessageWorkerService.class);
            i.putExtra("data", data.toString());
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(i);
            }

            Log.i("OneSignalExt", "GroupMessageWorkerService started");
        } catch (Exception e) {
            Log.e("OneSignalExt", "Failed to start GroupMessageWorkerService", e);
        }
    }
    private void compareAndHandleToken(String newToken, String provider, String authToken) {
        String storedToken = getStoredDeviceToken();
        if (newToken.equals(storedToken)) {
            System.out.println("MainActivity Device token unchanged." + newToken + storedToken) ;
            return;
        }
        System.out.println("Change notice" + newToken + storedToken);


        sendTokenToBackend(newToken, provider, authToken);
    }

    private void suppressFcmNotification(RemoteMessage msg) {
        NotificationManager nm =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // FCM uses tag = null, id = 0 by default
        nm.cancel("fcm_auto", 0);
    }

    private void sendTokenToBackend(String token, String provider, String authToken) {
        String backendUrl = Constants.BASE_API_URL + "/user/updatetoken";
        System.out.println("MainActivity Backend url: " + backendUrl);
        System.out.println("MainActivity Backend token: " + token);
        System.out.println("MainActivity Backend provider: " + provider);


        OkHttpClient client = new OkHttpClient();
        MediaType JSON = MediaType.parse("application/json; charset=utf-8");

        JSONObject json = new JSONObject();
        try {
            json.put("notification_Token", token);
            json.put("provider", provider);
        } catch (JSONException e) {
            System.out.println("MainActivity JSON error: " + e);
            return;
        }

        RequestBody body = RequestBody.create(json.toString(), JSON);
        String deviceId = getStoredDeviceId();
        Request.Builder builder = new Request.Builder()
                .url(backendUrl)
                .addHeader("Auth", authToken) // ✅ Correct
                .post(body);

        if (deviceId != null && !deviceId.isEmpty()) {
            builder.addHeader("X-Device-Id", deviceId);
        }

        Request request = builder.build();

        client.newCall(request).enqueue(new Callback() {
            @Override public void onFailure(Call call, IOException e) {
                System.out.println("MainActivityBackend token send failed: " + e);
            }

            @Override public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    System.out.println("MainActivity✅ Device token sent to backend.");
                    storeDeviceToken(token);
                } else {
                    if (response.code() == 401) {
                        String newToken = TokenRefresher.refresh(getApplicationContext());
                        if (newToken != null) {
                            sendTokenToBackend(token, provider, newToken);
                            return;
                        }
                    }
                    System.out.println("MainActivity⚠️ Backend error: " + response.code());
                }
            }
        });
    }
    private String getStoredAuthToken() {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        return prefs.getString(AUTH_TOKEN_KEY, null);
    }

    private String getStoredDeviceId() {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        return prefs.getString(DEVICE_ID_KEY, null);
    }

    private String getStoredDeviceToken() {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        return prefs.getString(DEVICE_TOKEN_KEY, null);
    }


    private void storeDeviceToken(String token) {
        System.out.println("MainActivity Storing device token: " + token);
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        prefs.edit().putString(DEVICE_TOKEN_KEY, token).apply();
    }
//
//    public class Message {
//        public String id;
//        public String sender;
//        public String recipient;
//        public String content;
//        public String timestamp;
//        public String status;
//        public int read; // ✅ fix: changed from boolean to int
//
//        public String encryptedMessage;
//        public String encryptedAESKey;
//        public String eniv;
//        public String fileName;
//        public String fileType;
//        public String file_path;
//        public long fileSize;
//        public String thumbnail;
//        public String type;
//
//
//        @Override
//        public String toString() {
//            return "Message{" +
//                    "id='" + id + '\'' +
//                    ", sender='" + sender + '\'' +
//                    ", recipient='" + recipient + '\'' +
//                    ", content='" + content + '\'' +
//                    ", timestamp='" + timestamp + '\'' +
//                    ", status='" + status + '\'' +
//                    ", read=" + read +
//                    ", encryptedMessage='" + encryptedMessage + '\'' +
//                    ", encryptedAESKey='" + encryptedAESKey + '\'' +
//                    ", eniv='" + eniv + '\'' +
//                    ", fileName='" + fileName + '\'' +
//                    ", fileType='" + fileType + '\'' +
//                    ", file_path='" + file_path + '\'' +
//                    ", fileSize=" + fileSize +
//                    ", thumbnail='" + thumbnail + '\'' +
//                    ", type='" + type + '\'' +
//
//                    '}';
//        }
//
//    }
//    public static Message getmessage(String messageid, String token) {
//        String urlString = Constants.BASE_API_URL + "/api/messages/" + messageid;
//        HttpURLConnection conn = null;
//
//        try {
//            URL url = new URL(urlString);
//            conn = (HttpURLConnection) url.openConnection();
//            conn.setRequestMethod("GET");
//            conn.setRequestProperty("Auth", token);
//            conn.setRequestProperty("Accept", "application/json");
//
//            int responseCode = conn.getResponseCode();
//
//            BufferedReader reader = new BufferedReader(
//                    new InputStreamReader(
//                            responseCode == 200 ? conn.getInputStream() : conn.getErrorStream()
//                    )
//            );
//
//            StringBuilder response = new StringBuilder();
//            String line;
//            while ((line = reader.readLine()) != null) {
//                response.append(line);
//            }
//            reader.close();
//
//            System.out.println("Raw JSON response: " + response.toString());
//
//            if (responseCode == 200) {
//                JsonObject json = JsonParser.parseString(response.toString()).getAsJsonObject();
//
//                if (json.has("thumbnail") && json.get("thumbnail").isJsonObject()) {
//                    JsonObject thumbObj = json.getAsJsonObject("thumbnail");
//
//                    if (thumbObj.has("data") && thumbObj.get("data").isJsonArray()) {
//                        JsonArray dataArray = thumbObj.getAsJsonArray("data");
//
//                        // This is not binary data — it's ASCII character codes.
//                        StringBuilder sb = new StringBuilder();
//                        for (int i = 0; i < dataArray.size(); i++) {
//                            sb.append((char) dataArray.get(i).getAsInt());
//                        }
//
//                        String alreadyEncoded = sb.toString();
//
//                        // Validate that it begins with "data:image/"
//                        if (alreadyEncoded.startsWith("data:image/")) {
//                            json.addProperty("thumbnail", alreadyEncoded);
//                        } else {
//                            json.remove("thumbnail"); // fallback if corrupted
//                        }
//
//                    } else {
//                        json.remove("thumbnail");
//                    }
//                }
//
//
//
//                // Now convert JSON to Message class
//                Gson gson = new Gson();
//                return gson.fromJson(json, MyNotificationExtenderService.Message.class);
//            } else {
//                System.out.println("Error fetching message: " + response.toString());
//                return null;
//            }
//
//        } catch (Exception e) {
//            e.printStackTrace();
//            return null;
//        } finally {
//            if (conn != null) {
//                conn.disconnect();
//            }
//        }
//    }


//    private static byte[] decodeUrlSafeBase64(String input) {
//        return Base64.decode(input, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
//    }

//    public static PrivateKey getPrivateKeyFromJWK(JSONObject jwk) throws Exception {
//        BigInteger n = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("n")));
//        BigInteger e = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("e")));
//        BigInteger d = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("d")));
//        BigInteger p = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("p")));
//        BigInteger q = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("q")));
//        BigInteger dp = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("dp")));
//        BigInteger dq = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("dq")));
//        BigInteger qi = new BigInteger(1, decodeUrlSafeBase64(jwk.getString("qi")));
//
//        RSAPrivateCrtKeySpec spec = new RSAPrivateCrtKeySpec(n, e, d, p, q, dp, dq, qi);
//        KeyFactory factory = KeyFactory.getInstance("RSA");
//        return factory.generatePrivate(spec);
//    }
//    public static String decryptAESGCM(byte[] encryptedData, byte[] aesKey, byte[] iv) throws Exception {
//        SecretKeySpec keySpec = new SecretKeySpec(aesKey, "AES");
//        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
//
//        // GCM tag is 16 bytes (128 bits)
//        GCMParameterSpec spec = new GCMParameterSpec(128, iv);
//        cipher.init(Cipher.DECRYPT_MODE, keySpec, spec);
//
//        byte[] decrypted = cipher.doFinal(encryptedData);
//        return new String(decrypted, "UTF-8");
//    }
//
//
//    public static byte[] decryptAESKeyRSA_OAEP(byte[] encryptedKey, PrivateKey privateKey) throws Exception {
//        Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
//
//        OAEPParameterSpec oaepParams = new OAEPParameterSpec(
//                "SHA-256",
//                "MGF1",
//                MGF1ParameterSpec.SHA256,
//                PSource.PSpecified.DEFAULT
//        );
//        cipher.init(Cipher.DECRYPT_MODE, privateKey, oaepParams);
//        return cipher.doFinal(encryptedKey);
//    }
//    private static class UserResult {
//        String name = "Unknown";
//        String avatar = null;
//        JSONObject userObject = null;
//    }
//
//    private void stopSafeForeground() {
//        if (!foregroundStarted) {
//            Log.i("MyNotificationService", "Foreground not active, skip stop");
//            stopSelf();
//            return;
//        }
//
//        try {
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
//                stopForeground(Service.STOP_FOREGROUND_REMOVE);
//            } else {
//                stopForeground(true);
//            }
//
//            Log.i("MyNotificationService", "Foreground stopped");
//
//        } catch (Exception e) {
//            Log.w("MyNotificationService", "stopForeground failed: " + e.getMessage(), e);
//
//        } finally {
//            foregroundStarted = false;
//            stopSelf();
//        }
//    }
//
//
//    public void handleMessageNotification(Context context, JSONObject data) {
//        try {
//            if (data == null) {
//                Log.w("PushReceiver", "handleMessageNotification: data == null");
//                return;
//            }
//
//            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
//            final String id = data.optString("id", null);
//            final String type = data.optString("type", null);
//
//            if (id == null || id.trim().isEmpty()) {
//                Log.w("PushReceiver", "missing message id");
//                return;
//            }
//
//            ExecutorService exec = Executors.newSingleThreadExecutor();
//            exec.submit(() -> {
//
//                boolean fgStarted = false;
//
//                try {
//                    startSafeForeground("Processing message", "Decrypting & storing message");
//                    fgStarted = true;
//
//                    SharedPreferences localPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
//                    String token = localPrefs.getString("token", null);
//
//                    MyNotificationExtenderService.Message msg = getmessage(id, token);
//                    if (msg == null) {
//                        Log.w("PushReceiver", "getmessage returned null for id=" + id);
//                        return;
//                    }
//
//                    String senderId = msg.sender;
//                    String timestamp = msg.timestamp;
//                    String encryptedMessageog = msg.encryptedMessage;
//                    String encryptedAESKeyog = msg.encryptedAESKey;
//                    String enivog = msg.eniv;
//                    String content = msg.content;
//
//                    String finalMessage;
//
//                    if ("message".equals(type)) {
//                        try {
//                            String privateKeyStr = localPrefs.getString("privateKey", null);
//                            if (privateKeyStr == null) {
//                                finalMessage = "Unable to decrypt: private key missing";
//                            } else {
//                                JSONObject jwk = new JSONObject(privateKeyStr);
//                                PrivateKey privateKey = getPrivateKeyFromJWK(jwk);
//
//                                byte[] encryptedAESKey = Base64.decode(encryptedAESKeyog, Base64.DEFAULT);
//                                byte[] iv = Base64.decode(enivog, Base64.DEFAULT);
//                                byte[] encryptedMessage = Base64.decode(encryptedMessageog, Base64.DEFAULT);
//
//                                byte[] aesKey = decryptAESKeyRSA_OAEP(encryptedAESKey, privateKey);
//                                finalMessage = decryptAESGCM(encryptedMessage, aesKey, iv);
//                            }
//                        } catch (Exception e) {
//                            Log.e("Decrypt", "message decryption failed", e);
//                            finalMessage = "Message decryption error";
//                        }
//                    } else {
//                        finalMessage = (content != null && !content.isEmpty()) ? content : "new message comes";
//                    }
//
//                    // ------------------------------
//                    // UPDATE usersMain
//                    // ------------------------------
//                    String senderName = "Unknown";
//                    String avatarUrl = null;
//
//                    try {
//                        String userListJson = localPrefs.getString("usersMain", "[]");
//                        JSONArray userArray = new JSONArray(userListJson);
//                        JSONArray updatedArray = new JSONArray();
//                        boolean userFound = false;
//
//                        for (int i = 0; i < userArray.length(); i++) {
//                            JSONObject u = userArray.getJSONObject(i);
//
//                            if (u.optString("id").equals(senderId)) {
//                                int unread = u.optInt("unreadCount", 0) + 1;
//                                u.put("unreadCount", unread);
//                                u.put("lastMessage", finalMessage);
//                                u.put("timestamp", timestamp);
//
//                                senderName = u.optString("name", "Unknown");
//                                avatarUrl = u.optString("avatar", null);
//
//                                userFound = true;
//                            }
//
//                            updatedArray.put(u);
//                        }
//
//                        if (!userFound) {
//                            JSONObject newUser = new JSONObject();
//                            newUser.put("id", senderId);
//                            newUser.put("name", senderId);
//                            newUser.put("avatar", JSONObject.NULL);
//                            newUser.put("lastMessage", finalMessage);
//                            newUser.put("timestamp", timestamp);
//                            newUser.put("unreadCount", 1);
//                            updatedArray.put(newUser);
//
//                            senderName = senderId; // fallback
//                        }
//
//                        SharedPreferences.Editor ed = localPrefs.edit();
//                        ed.putString("usersMain", updatedArray.toString());
//                        ed.apply();
//
//                    } catch (Exception e) {
//                        Log.e("PushReceiver", "Failed updating usersMain", e);
//                    }
//
//                    // ------------------------------
//                    // SOUND / MUTE LOGIC
//                    // ------------------------------
//
//                    boolean ismute = Boolean.parseBoolean(prefs.getString("ismute", "false"));
//                    boolean isMutedSender = false;
//
//                    String mutedUsersStr = prefs.getString("mutedUsers", null);
//                    if (mutedUsersStr != null) {
//                        try {
//                            JSONArray mutedUsers = new JSONArray(mutedUsersStr);
//                            for (int i = 0; i < mutedUsers.length(); i++) {
//                                if (senderId.equals(mutedUsers.optString(i))) {
//                                    isMutedSender = true;
//                                    break;
//                                }
//                            }
//                        } catch (Exception ignored) {}
//                    }
//
//                    String soundPath = "default";
//
//                    if (!ismute && !isMutedSender) {
//                        String customSoundsJson = prefs.getString("customSounds", null);
//
//                        boolean customFound = false;
//                        if (customSoundsJson != null) {
//                            try {
//                                JSONArray arr = new JSONArray(customSoundsJson);
//                                for (int i = 0; i < arr.length(); i++) {
//                                    JSONObject entry = arr.getJSONObject(i);
//                                    if (senderId.equals(entry.optString("senderId"))) {
//                                        soundPath = entry.optString("soundPath", "default");
//                                        customFound = true;
//                                        break;
//                                    }
//                                }
//                            } catch (Exception ignored) {}
//                        }
//
//                        if (!customFound) {
//                            String global = prefs.getString("ForAllSoundNotification", null);
//                            if (global != null && !global.equals("null") && !global.trim().isEmpty()) {
//                                try {
//                                    JSONObject g = new JSONObject(global);
//                                    soundPath = g.optString("path", "default");
//                                } catch (Exception ignored) {}
//                            }
//                        }
//                    }
//
//                    // ------------------------------
//                    // SHOW NOTIFICATION
//                    // ------------------------------
//                    if (!ismute && !isMutedSender) {
//                        showLocalNotification(
//                                context,
//                                senderName,
//                                finalMessage,
//                                soundPath,
//                                avatarUrl
//                        );
//                    }
//
//                    // ------------------------------
//                    // STORE MESSAGE
//                    // ------------------------------
//                    saveMessageToDB(context, msg, finalMessage, type);
//
//                } catch (Throwable t) {
//                    Log.e("PushReceiver", "Unhandled error in message worker", t);
//
//                } finally {
//                    if (fgStarted) {
//                        try { stopSafeForeground(); } catch (Throwable ignored) {}
//                    }
//                }
//
//            });
//
//            exec.shutdown();
//
//        } catch (Exception e) {
//            Log.e("PushReceiver", "handleMessageNotification failed", e);
//        }
//    }

//    @SuppressLint("ForegroundServiceType")
//    private void startSafeForeground(String title, String message) {
//
//        // prevent multiple calls
//        if (foregroundStarted) {
//            Log.i("MyNotificationService", "Foreground already started, skipping");
//            return;
//        }
//
//        try {
//            String channelId = "default_channel_id";
//            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
//
//            // create channel safely
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
//                NotificationChannel channel = nm.getNotificationChannel(channelId);
//                if (channel == null) {
//                    channel = new NotificationChannel(
//                            channelId,
//                            "Default Channel",
//                            NotificationManager.IMPORTANCE_LOW
//                    );
//                    channel.enableLights(false);
//                    channel.enableVibration(false);
//                    channel.setSound(null, null);
//                    nm.createNotificationChannel(channel);
//                }
//            }
//
//            // build notification
//            Notification notification = new NotificationCompat.Builder(this, channelId)
//                    .setContentTitle(title != null ? title : "Processing…")
//                    .setContentText(message != null ? message : "")
//                    .setSmallIcon(getSafeIcon())
//                    .setPriority(NotificationCompat.PRIORITY_LOW)
//                    .setOngoing(true)  // keep alive
//                    .build();
//
//            // IMPORTANT: Don't call unless OS expects it
//            startForeground(1, notification);
//
//            foregroundStarted = true;
//
//            Log.i("MyNotificationService", "Foreground service started");
//
//        } catch (Exception e) {
//            Log.e("MyNotificationService", "startSafeForeground failed: " + e.getMessage(), e);
//        }
//    }
//    private int getSafeIcon() {
//        try {
//            return R.drawable.custom_icon_final_background;
//        } catch (Exception e) {
//            Log.w("MyNotificationService", "Icon missing, using android default");
//            return android.R.drawable.stat_notify_chat;
//        }
//    }



    private void showLocalNotification(Context context, String title, String body, String soundPath, String avatarUrl) {
        // Use NotificationHelper to create channel and show notification
        NotificationHelper.showNotification(context, title, body, soundPath ,(int) System.currentTimeMillis(),avatarUrl);
    }

//    private void saveMessageToDB(Context context, MyNotificationExtenderService.Message msg, String message, String type) {
//
//
//        try {
//            JSONObject message2 = new JSONObject();
//
//            // Extract with default fallback
//            message2.put("id", msg.id != null ? msg.id : "");
//            message2.put("sender", msg.sender != null ? msg.sender : "");
//            message2.put("recipient", msg.recipient != null ? msg.recipient : "");
//            message2.put("content", message != null ? message : ""); // Use decrypted message or fallback
//            message2.put("timestamp", msg.timestamp != null ? msg.timestamp : String.valueOf(System.currentTimeMillis()));
//            message2.put("status", msg.status != null ? msg.status : "sent");
//            message2.put("read", 0 );  // convert boolean to int
//            message2.put("isDeleted", 0); // default unless you add a field
//            message2.put("isDownload", 0); // default unless you add a field
//            message2.put("type", msg.type != null ? msg.type : type); // default or update based on your needs
//
//            // Optional/nullable fields
//            message2.put("file_name", msg.fileName != null ? msg.fileName : JSONObject.NULL);
//            message2.put("file_type", msg.fileType != null ? msg.fileType : JSONObject.NULL);
//            message2.put("file_size", msg.fileSize != 0 ? msg.fileSize : JSONObject.NULL);
//            message2.put("encryptedMessage", msg.encryptedMessage != null ? msg.encryptedMessage : JSONObject.NULL);
//            message2.put("encryptedAESKey", msg.encryptedAESKey != null ? msg.encryptedAESKey : JSONObject.NULL);
//            message2.put("eniv", msg.eniv != null ? msg.eniv : JSONObject.NULL);
//            message2.put("file_path", msg.file_path != null ? msg.file_path : JSONObject.NULL);
//
//            // Thumbnail check
//            if (msg.thumbnail != null && !msg.thumbnail.equals("null")) {
//                message2.put("thumbnail", msg.thumbnail);
//            } else {
//                message2.put("thumbnail", JSONObject.NULL);
//            }
//
//            message2.put("isError", 0); // default unless error flag added
//            message2.put("isSent", 1);  // assume already sent
//
//            // Save to SharedPreferences
//            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
//            SharedPreferences.Editor editor = prefs.edit();
//            editor.putString("message_" + msg.id, message2.toString());
//            editor.apply();
//
//            Log.d("MessageSave", "Saved normalized message to prefs: " + msg.id);
//
//        } catch (Exception e) {
//            Log.e("PushReceiver", "Failed to save message to SQLite", e);
//        } finally {
//            System.out.println("we have saved it ");
//        }
//    }

    private void handleCallNotification(Context context, JSONObject data) {
        try {
            Log.d("OneSignalExt", "Call notification received: " + data);
            SharedPreferences localPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String token = localPrefs.getString("token", null);
            String existing = localPrefs.getString("incoming_call_data", null);
            String existingoffer = localPrefs.getString("incoming_call_offer", null);
            if ((existing != null && !existing.isEmpty()) ) {
                CallPrefsUtil.clearIncomingCall(context);
                Log.d("main thread call", "Incoming call prefs cleared");

                stopSelf();
                return;
            }

            Object rawCallOnly = data.opt("callOnly");

            boolean callOnly =
                    rawCallOnly instanceof Boolean
                            ? (Boolean) rawCallOnly
                            : "true".equalsIgnoreCase(String.valueOf(rawCallOnly));

// put back in a predictable format (STRING — safest)
            data.put("callOnly", callOnly ? "true" : "false");

            // get timestamp
            // get epoch millis from JSON
            long ts = data.optLong("ts", 0);

            if (ts == 0) {
                Log.w("OneSignalExt", "Missing timestamp; ignore call push");
                return;
            }

            long now = System.currentTimeMillis();
            long diff = now - ts;

            Log.d("Timestamp", "age=" + diff + "ms");

// Reject old or future messages
// > 30s old OR timestamp ahead of now ("future push") || diff < -3_000
            if (diff > 33_000 || diff < -25_000) {
                Log.w("OneSignalExt", "Call push expired or invalid: age=" + diff + "ms, ignoring 25");
                return;
            }



            // start foreground service
            Intent service = new Intent(context, IncomingCallService.class);
            service.putExtra("data", data.toString());

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, service);
            } else {
                context.startService(service);
            }

            Log.d("OneSignalExt", "IncomingCallService started");

        } catch (Exception e) {
            Log.e("OneSignalExt", "handleCallNotification exception", e);
        }
    }

}

