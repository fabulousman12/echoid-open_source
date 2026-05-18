package com.swipe;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

import com.swipe.MainActivity;   // Adjust this to your actual MainActivity package
import java.math.BigInteger;
import java.net.URLDecoder;
import com.google.gson.Gson;
import java.security.spec.RSAPrivateCrtKeySpec;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import javax.crypto.spec.PSource;
import org.json.JSONObject;
import android.app.PendingIntent;
import com.swipe.NotificationHelper;
import me.pushy.sdk.Pushy;

import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONException;
import com.swipe.Constants;
import com.swipe.auth.TokenRefresher;

import javax.crypto.spec.IvParameterSpec;
import javax.crypto.Cipher;
import javax.crypto.spec.OAEPParameterSpec;

import java.security.spec.PSSParameterSpec;
import java.security.spec.MGF1ParameterSpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.interfaces.RSAPrivateKey;
import java.security.KeyFactory;
import java.security.spec.AlgorithmParameterSpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.PrivateKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;


import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Instant;

public class PushyMessagingService extends BroadcastReceiver {

    @Override

    public void onReceive(Context context, Intent intent) {
        try {
            JSONObject data = extractPushPayload(intent);
            if (data == null || data.length() == 0) {
                Log.w("PushReceiver", "No usable data payload in intent");
                return;
            }
            String receiveType = data.optString("receive_type");

            if ("message".equals(receiveType)) {
                // ✅ Start Foreground Service for long tasks
                startMessageWorker(context, data);
            } else if ("group_message".equals(receiveType)) {
                if (isExpiredPayload(data)) {
                    Log.i("PushReceiver", "Dropping stale Pushy group push: " + data.optString("id"));
                    return;
                }
                startGroupMessageWorker(context, data);
            } else if ("call".equals(receiveType)) {
                handleCallNotification(context, data);
            }  else {
                Log.w("PushReceiver", "Unknown receive_type: " + receiveType);
            }

        } catch (Exception e) { 
            Log.e("PushReceiver", "Error processing push data", e);
        }
    }

    private JSONObject extractPushPayload(Intent intent) {
        try {
            String jsonData = intent.getStringExtra("data");
            if (jsonData != null && !jsonData.trim().isEmpty()) {
                return new JSONObject(jsonData);
            }

            Bundle extras = intent.getExtras();
            if (extras == null || extras.isEmpty()) {
                return null;
            }

            JSONObject data = new JSONObject();
            for (String key : extras.keySet()) {
                Object value = extras.get(key);
                if (value == null) continue;
                data.put(key, String.valueOf(value));
            }
            return data;
        } catch (Exception e) {
            Log.e("PushReceiver", "Failed to extract push payload", e);
            return null;
        }
    }

    private boolean isExpiredPayload(JSONObject data) {
        try {
            long ttlMs = data.optLong("ttlMs", 30000L);
            if (ttlMs <= 0) ttlMs = 30000L;
            String sentAt = data.optString("sentAt", "");
            if (sentAt == null || sentAt.trim().isEmpty()) return false;
            long sentAtMs = Instant.parse(sentAt).toEpochMilli();
            return System.currentTimeMillis() - sentAtMs > ttlMs;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void startMessageWorker(Context context, JSONObject data) {
        try {
            Intent i = new Intent(context, MessageWorkerService.class);
            i.putExtra("data", data.toString());
            context.startService(i);

            Log.i("OneSignalExt", "MessageWorkerService started");
        } catch (Exception e) {
            Log.e("OneSignalExt", "Failed to start MessageWorkerService", e);
        }
    }

    private void startGroupMessageWorker(Context context, JSONObject data) {
        try {
            Intent i = new Intent(context, GroupMessageWorkerService.class);
            i.putExtra("data", data.toString());
            context.startService(i);

            Log.i("OneSignalExt", "GroupMessageWorkerService started");
        } catch (Exception e) {
            Log.e("OneSignalExt", "Failed to start GroupMessageWorkerService", e);
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
        KeyFactory factory = KeyFactory.getInstance("RSA");
        return factory.generatePrivate(spec);
    }

    public static String decryptAESGCM(byte[] encryptedData, byte[] aesKey, byte[] iv) throws Exception {
    SecretKeySpec keySpec = new SecretKeySpec(aesKey, "AES");
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");

    // GCM tag is 16 bytes (128 bits)
    GCMParameterSpec spec = new GCMParameterSpec(128, iv);
    cipher.init(Cipher.DECRYPT_MODE, keySpec, spec);

    byte[] decrypted = cipher.doFinal(encryptedData);
    return new String(decrypted, "UTF-8");
}
    public static Message getmessage(Context context, String messageid, String token, String deviceId, boolean retried) {
    String urlString = Constants.BASE_API_URL + "/api/messages/" + messageid;
    HttpURLConnection conn = null;

    try {
        URL url = new URL(urlString);
        conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Auth", token);
        if (deviceId != null && !deviceId.isEmpty()) {
            conn.setRequestProperty("X-Device-Id", deviceId);
        }
        conn.setRequestProperty("Accept", "application/json");

        int responseCode = conn.getResponseCode();
        if (responseCode == 401 && !retried) {
            String newToken = TokenRefresher.refresh(context);
            if (newToken != null) {
                return getmessage(context, messageid, newToken, deviceId, true);
            }
        }

        BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                        responseCode == 200 ? conn.getInputStream() : conn.getErrorStream()
                )
        );

        StringBuilder response = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            response.append(line);
        }
        reader.close();

        System.out.println("Raw JSON response: " + response.toString());

        if (responseCode == 200) {
         JsonObject json = JsonParser.parseString(response.toString()).getAsJsonObject();

if (json.has("thumbnail") && json.get("thumbnail").isJsonObject()) {
    JsonObject thumbObj = json.getAsJsonObject("thumbnail");

    if (thumbObj.has("data") && thumbObj.get("data").isJsonArray()) {
        JsonArray dataArray = thumbObj.getAsJsonArray("data");

        // This is not binary data — it's ASCII character codes.
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < dataArray.size(); i++) {
            sb.append((char) dataArray.get(i).getAsInt());
        }

        String alreadyEncoded = sb.toString();

        // Validate that it begins with "data:image/"
        if (alreadyEncoded.startsWith("data:image/")) {
            json.addProperty("thumbnail", alreadyEncoded);
        } else {
            json.remove("thumbnail"); // fallback if corrupted
        }

    } else {
        json.remove("thumbnail");
    }
}


            // Now convert JSON to Message class
            Gson gson = new Gson();
            return gson.fromJson(json, Message.class);
        } else {
            System.out.println("Error fetching message: " + response.toString());
            return null;
        }

    } catch (Exception e) {
        e.printStackTrace();
        return null;
    } finally {
        if (conn != null) {
            conn.disconnect();
        }
    }
}



public class Message {
    public String id;
    public String sender;
    public String recipient;
    public String content;
    public String timestamp;
    public String status;
    public int read; // ✅ fix: changed from boolean to int

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


    @Override
    public String toString() {
        return "Message{" +
                "id='" + id + '\'' +
                ", sender='" + sender + '\'' +
                ", recipient='" + recipient + '\'' +
                ", content='" + content + '\'' +
                ", timestamp='" + timestamp + '\'' +
                ", status='" + status + '\'' +
                ", read=" + read +
                ", encryptedMessage='" + encryptedMessage + '\'' +
                ", encryptedAESKey='" + encryptedAESKey + '\'' +
                ", eniv='" + eniv + '\'' +
                ", fileName='" + fileName + '\'' +
                ", fileType='" + fileType + '\'' +
                ", file_path='" + file_path + '\'' +
                ", fileSize=" + fileSize +
                ", thumbnail='" + thumbnail + '\'' +
                ", type='" + type + '\'' +
                ", isReplyTo='" + isReplyTo + '\'' +
                
                '}';
    }

}
public static byte[] decryptAESKeyRSA_OAEP(byte[] encryptedKey, PrivateKey privateKey) throws Exception {
    Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");

    OAEPParameterSpec oaepParams = new OAEPParameterSpec(
        "SHA-256",
        "MGF1",
        MGF1ParameterSpec.SHA256,
        PSource.PSpecified.DEFAULT
    );
    cipher.init(Cipher.DECRYPT_MODE, privateKey, oaepParams);
    return cipher.doFinal(encryptedKey);
}
    private static class UserResult {
        String name = "Unknown";
        String avatar = null;
        JSONObject userObject = null;
    }
  public void handleMessageNotification(Context context, JSONObject data) {
    try {
                SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        String id = data.optString("id", null);
        String token = prefs.getString("token", null);
String deviceId = prefs.getString("deviceId", null);
Message msg = getmessage(context, id, token, deviceId, false);

if (msg != null) {
    System.out.println("Message content: " + msg.content);
} else {
    System.out.println("Failed to fetch message.");
}

    String senderId = msg.sender;
         
        String timestamp = msg.timestamp;
         String encryptedMessageog = msg.encryptedMessage;
    String encryptedAESKeyog = msg.encryptedAESKey;
String enivog = msg.eniv;
String type = data.optString("type", null);
   System.out.println("test on messgae" + data);
   String content = msg.content;

    String userListJson = prefs.getString("usersMain", null); // stored as JSON array string
        JSONArray userArray = userListJson != null ? new JSONArray(userListJson) : new JSONArray();
        String message = "new message appears";
if ("message".equals(type)) {
    // Decrypt only if it's a message type
    JSONObject jwk = new JSONObject(prefs.getString("privateKey", null));
    PrivateKey privateKey = getPrivateKeyFromJWK(jwk);

    // Decode base64 values
    byte[] encryptedAESKey = Base64.decode(encryptedAESKeyog, Base64.DEFAULT);
    byte[] iv = Base64.decode(enivog, Base64.DEFAULT);
    byte[] encryptedMessage = Base64.decode(encryptedMessageog, Base64.DEFAULT);

    // Decrypt AES key and then the message
    byte[] aesKey = decryptAESKeyRSA_OAEP(encryptedAESKey, privateKey);
    message = decryptAESGCM(encryptedMessage, aesKey, iv);  // <--- corrected to pass actual byte[] iv
} else {
    // Fallback: use plain content
    message = "new message comes";
}
       boolean userFound = false;

        String senderName = "Unknown"; // fallback
        String avatarUrl = null;   
        JSONArray updatedArray = new JSONArray();

        final String finalMessage = message;

        System.out.println("all previous " + userArray  );
        for (int i = 0; i < userArray.length(); i++) {
            JSONObject user = userArray.getJSONObject(i);
            if (user.optString("id").equals(senderId)) {
                user.put("lastMessage", finalMessage);
                user.put("timestamp", timestamp);
                  senderName = user.optString("name", "Unknown");
                avatarUrl = user.optString("avatar", null);
                userFound = true;
                System.out.println("this found use");
            }
            updatedArray.put(user);
        }

        if (!userFound) {
            // Fetch from API (run in new thread or executor)
            System.out.println("this shouldn run" + userFound );
            new Thread(() -> {
                try {
 // Get from SharedPreferences
                  URL url = new URL(Constants.FETCH_USER_ENDPOINT);

                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Auth", token);
                    String deviceIdx = "localPrefs.getString(";
                    if (deviceIdx != null && !deviceId.isEmpty()) {
                        conn.setRequestProperty("X-Device-Id", deviceId);
                    }
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("userid", senderId);

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(payload.toString().getBytes("UTF-8"));
                    }

                    int responseCode = conn.getResponseCode();
                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder response = new StringBuilder();
                        String line;
                        while ((line = in.readLine()) != null) {
                            response.append(line);
                        }
                        in.close();

                        JSONObject responseJson = new JSONObject(response.toString());

                        if (responseJson.optBoolean("success")) {
                            JSONObject userResponse = responseJson.getJSONObject("userResponse");
                            String fetchedName = userResponse.optString("name", "Unknown");
                            String fetchedAvatar = userResponse.optString("profilePic", "");


                            JSONObject newUser = new JSONObject();
                            newUser.put("id", userResponse.optString("id"));
                            newUser.put("name", userResponse.optString("name"));
                            newUser.put("avatar", userResponse.optString("profilePic", ""));
                            newUser.put("lastMessage", finalMessage);
                            newUser.put("timestamp", timestamp);
                            newUser.put("unreadCount", 1);
                            newUser.put("phoneNumber", userResponse.optString("phoneNumber", ""));
                            newUser.put("updatedAt", userResponse.optString("updatedAt", ""));
                            newUser.put("gender", userResponse.optString("gender", ""));
                            newUser.put("dob", userResponse.optString("dob", ""));
                            newUser.put("Location", userResponse.optString("location", ""));
newUser.put("publicKey", userResponse.optString("publicKey", ""));
newUser.put("About", userResponse.optString("About", ""));
                            updatedArray.put(newUser);
                            // Save to SharedPreferences
                            editor.putString("usersMain", updatedArray.toString());
                            editor.apply();




                            String stored = prefs.getString("usersMain", "[]");
                            Log.d("UserSaveDebug", "Stored usersMain after save: " + stored);


      boolean ismute = Boolean.parseBoolean(prefs.getString("ismute", "false"));

                            String soundPath = "default"; 
                


                            boolean customSoundFound = false;

                

                            if (!customSoundFound && !ismute ) {
                             String globalSound = prefs.getString("ForAllSoundNotification", null);
                              if (globalSound != null && !globalSound.equals("null") && !globalSound.trim().isEmpty()) {
                             soundPath = globalSound;
                             } else {
                                           soundPath = "default"; // 3. Android system default
                                     }
                            }



                            

                              saveMessageToDB(context, msg,finalMessage,type);

                        }
                    }

                    conn.disconnect();
                } catch (Exception e) {
                    Log.e("PushReceiver", "Error fetching user", e);
                }
            }).start();
            System.out.println("This is the result " );
            return;


        } else {
            // Save updated array if user was found and updated
            editor.putString("usersMain", updatedArray.toString());
            editor.apply();

            String stored = prefs.getString("usersMain", "[]");
            Log.d("UserSaveDebug", "Stored usersMain after save: " + stored);
        }

        System.out.println("now we should see this if userfound false" + userFound);



        String customSoundsJson = prefs.getString("customSounds", null);
        boolean ismute = Boolean.parseBoolean(prefs.getString("ismute", "false"));

String mutedUSers = prefs.getString("mutedUsers",null);
String soundPath = "default"; // fallback for sound
boolean isMutedSender = false;



boolean customSoundFound = false;
        if (mutedUSers != null) {
            try {
                JSONArray mutedUsers = new JSONArray(mutedUSers);
                for (int i = 0; i < mutedUsers.length(); i++) {
                    if (senderId.equals(mutedUsers.optString(i))) {
                        isMutedSender = true;
                        break;
                    }
                }
            } catch (JSONException e) {
                Log.e("PushReceiver", "Failed to parse mutedUsers", e);
            }
        }


        if (customSoundsJson != null && !ismute && !isMutedSender) {
            try {
                JSONArray customSounds = new JSONArray(customSoundsJson);

                for (int i = 0; i < customSounds.length(); i++) {
                    JSONObject entry = customSounds.getJSONObject(i);
                    if (senderId.equals(entry.optString("senderId"))) {
                        soundPath = entry.optString("soundPath", "default");
                        customSoundFound = true;
                        break;
                    }
                }
            } catch (JSONException e) {

                Log.e("PushReceiver", "Failed to parse customSounds", e);
            }
        }
        if (!customSoundFound && !ismute && !isMutedSender) {
            String globalSound = prefs.getString("ForAllSoundNotification", null);
            if (globalSound != null && !globalSound.equals("null") && !globalSound.trim().isEmpty()) {
                try {
                    JSONObject globalSound2 = new JSONObject(globalSound);
                    // ✅ Global one still uses "path" key
                    soundPath = globalSound2.optString("path", "default");
                } catch (JSONException e) {
                    Log.e("PushReceiver", "Failed to parse global sound JSON", e);
                    soundPath = "default";
                }
            } else {
                soundPath = "default"; // 3. Android system default
            }
        }


        // Show notification only if content is present
        if ("message".equals(type) && !ismute && !isMutedSender) {
            showLocalNotification(context, senderId, senderName, finalMessage, soundPath, avatarUrl);
        }else{
            if(!ismute){
                showLocalNotification(context, senderId, senderName, "New " + msg.fileType,  soundPath, avatarUrl);
            }
        }

        saveMessageToDB(context, msg,finalMessage,type);

    } catch (Exception e) {
        Log.e("PushReceiver", "handleMessageNotification failed", e);
    }
}

   private void showLocalNotification(Context context, String senderId, String title, String body, String soundPath, String avatarUrl) {
    // Use NotificationHelper to create channel and show notification
    NotificationHelper.showNotification(
            context,
            title,
            body,
            soundPath,
            NotificationHelper.getStableDirectNotificationId(senderId),
            avatarUrl
    );
}

    private void saveMessageToDB(Context context, Message msg,String message,String type) {


        try {
            JSONObject message2 = new JSONObject();

            // Extract with default fallback
                message2.put("id", msg.id != null ? msg.id : "");
        message2.put("sender", msg.sender != null ? msg.sender : "");
        message2.put("recipient", msg.recipient != null ? msg.recipient : "");
        message2.put("content", message != null ? message : ""); // Use provided message or empty string
        message2.put("timestamp", msg.timestamp != null ? msg.timestamp : String.valueOf(System.currentTimeMillis()));
        message2.put("status", msg.status != null ? msg.status : "sent");
        message2.put("read", 0 );  // convert boolean to int
        message2.put("isDeleted", 0); // default unless you add a field
        message2.put("isDownload", 0); // default unless you add a field
        message2.put("type", msg.type != null ? msg.type : type); // default or update based on your needs
        message2.put("isReplyTo", msg.isReplyTo != null ? msg.isReplyTo : JSONObject.NULL);

     message2.put("file_name", msg.fileName != null ? msg.fileName : JSONObject.NULL);
        message2.put("file_type", msg.fileType != null ? msg.fileType : JSONObject.NULL);
        message2.put("file_size", msg.fileSize != 0 ? msg.fileSize : JSONObject.NULL);
        message2.put("encryptedMessage", msg.encryptedMessage != null ? msg.encryptedMessage : JSONObject.NULL);
        message2.put("encryptedAESKey", msg.encryptedAESKey != null ? msg.encryptedAESKey : JSONObject.NULL);
        message2.put("eniv", msg.eniv != null ? msg.eniv : JSONObject.NULL);
        message2.put("file_path", msg.file_path != null ? msg.file_path : JSONObject.NULL);

        // Thumbnail check
        if (msg.thumbnail != null && !msg.thumbnail.equals("null")) {
            message2.put("thumbnail", msg.thumbnail);
        } else {
            message2.put("thumbnail", JSONObject.NULL);
        }

        message2.put("isError", 0); // default unless error flag added
        message2.put("isSent", 1);  // assume already sent

        // Save to SharedPreferences
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("message_" + msg.id, message2.toString());
        editor.apply();

            Log.d("MessageSave", "Saved normalized message to prefs: " + msg.id);

        } catch (Exception e) {
            Log.e("PushReceiver", "Failed to save message to SQLite", e);
        } finally {
System.out.println("we have saved it ");
        }
    }


// Utility to bind nullable strings
private void bindNullableString(SQLiteStatement stmt, int index, String value) {
    if (value != null && !value.equals("null")) {
        stmt.bindString(index, value);
    } else {
        stmt.bindNull(index);
    }
}


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
        // You can add call UI logic here if needed
    }
}
