package com.swipe;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.util.Log;
import com.swipe.MainActivity;   // Adjust this to your actual MainActivity package

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;
import android.app.PendingIntent;
import com.swipe.NotificationHelper;
import me.pushy.sdk.Pushy;

import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONException;
import com.swipe.Constants;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
public class PushyMessagingService extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            String jsonData = intent.getStringExtra("data");
            if (jsonData == null) {
                Log.w("PushReceiver", "No data payload in intent");
                return;
            }

            JSONObject data = new JSONObject(jsonData);

            if (data.has("receive_type")) {
                String receiveType = data.optString("receive_type");

                switch (receiveType) {
                    case "message":
                        handleMessageNotification(context, data);
                        break;
                    case "call":
                        handleCallNotification(context, data);
                        break;
                    case "test":
                        showLocalNotification(context, "Pushy Test", data.optString("content"), "default",null);
                        break;
                    default:
                        Log.w("PushReceiver", "Unknown receive_type: " + receiveType);
                }

            }
        } catch (Exception e) {
            Log.e("PushReceiver", "Error processing push data", e);
        }
    }
    private static class UserResult {
        String name = "Unknown";
        String avatar = null;
        JSONObject userObject = null;
    }

    private void handleMessageNotification(Context context, JSONObject data) {
    try {
        String senderId = data.optString("sender", null);
        String content = data.optString("content", null);
        String timestamp = data.optString("timestamp", String.valueOf(System.currentTimeMillis()));
   System.out.println("test on messgae" + data);
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
    String userListJson = prefs.getString("usersMain", null); // stored as JSON array string
        JSONArray userArray = userListJson != null ? new JSONArray(userListJson) : new JSONArray();

       boolean userFound = false;

        String senderName = "Unknown"; // fallback
        String avatarUrl = null;   
        JSONArray updatedArray = new JSONArray();


        System.out.println("all previous " + userArray  );
        for (int i = 0; i < userArray.length(); i++) {
            JSONObject user = userArray.getJSONObject(i);
            if (user.optString("id").equals(senderId)) {
                user.put("lastMessage", content);
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
                    String token = prefs.getString("token", ""); // Get from SharedPreferences
                  URL url = new URL(Constants.FETCH_USER_ENDPOINT);

                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Auth", token);
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
                            newUser.put("lastMessage", content);
                            newUser.put("timestamp", timestamp);
                            newUser.put("unreadCount", 1);
                            newUser.put("phoneNumber", userResponse.optString("phoneNumber", ""));
                            newUser.put("updatedAt", userResponse.optString("updatedAt", ""));
                            newUser.put("gender", userResponse.optString("gender", ""));
                            newUser.put("dob", userResponse.optString("dob", ""));
                            newUser.put("Location", userResponse.optString("location", ""));

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



                            if(content != null && !content.equals("null") && !ismute) {
                                showLocalNotification(context, fetchedName, content, soundPath, fetchedAvatar);
                            } else {
                                if(!ismute) {
                                    showLocalNotification(context, fetchedName, "New message", soundPath, fetchedAvatar);
                                }
                            }

                              saveMessageToDB(context, data);
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
        soundPath = globalSound;
    } else {
        soundPath = "default"; // 3. Android system default
    }
}

        // Show notification only if content is present
        if (content != null && !content.equals("null") && !ismute && !isMutedSender) {
            showLocalNotification(context, senderName, content, soundPath, avatarUrl);
        }else{
            if(!ismute){
                showLocalNotification(context, senderName, "New file", soundPath, avatarUrl);
            }
        }

        saveMessageToDB(context, data);

    } catch (Exception e) {
        Log.e("PushReceiver", "handleMessageNotification failed", e);
    }
}



    private void showLocalNotification(Context context, String title, String body, String soundPath, String avatarUriString) {
    // Use NotificationHelper to create channel and show notification

    System.out.println("PushReceiver showLocalNotification: " + title + " " + body + " " + soundPath + avatarUriString);
    NotificationHelper.showNotification(context, title, body, soundPath,(int) System.currentTimeMillis(),avatarUriString);
       // NotificationHelper.testHeadsUpNotification(context);

    }

    // private void showLocalNotification(Context context, String title, String body, String soundPath) {
    //     NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "default")
    //             .setSmallIcon(android.R.drawable.ic_dialog_info)
    //             .setContentTitle(title)
    //             .setContentText(body)
    //             .setColor(Color.WHITE)
    //             .setPriority(NotificationCompat.PRIORITY_HIGH)
    //             .setAutoCancel(true)
    //             .setLights(Color.RED, 1000, 1000)
    //             .setVibrate(new long[]{0, 400, 250, 400});

    //     if (!"default".equals(soundPath)) {
    //         builder.setSound(Uri.parse(soundPath));
    //     } else {
    //         builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
    //     }

    //     // Set intent to open MainActivity on notification tap
    //     Intent intent = new Intent(context, MainActivity.class);
    //     intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    //     builder.setContentIntent(PendingIntent.getActivity(context, 0, intent,
    //             PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

    //     // Setup notification channel using Pushy helper
    //     Pushy.setNotificationChannel(builder, context);

    //     NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
    //     notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    // }

    private void saveMessageToDB(Context context, JSONObject data) {


        try {
            JSONObject message = new JSONObject();

            // Extract with default fallback
            String id = data.optString("id", "");
            message.put("id", data.optString("id", ""));
            message.put("sender", data.optString("sender", ""));
            message.put("recipient", data.optString("recipient", ""));
            message.put("content", data.optString("content", ""));
            message.put("timestamp", data.has("timestamp") ? data.optString("timestamp") : String.valueOf(System.currentTimeMillis()));
            message.put("status", data.optString("status", "sent"));
            message.put("read", data.optInt("read", 0));
            message.put("isDeleted", data.optInt("isDeleted", 0));
            message.put("isDownload", data.optInt("isDownload", 0));
            message.put("type", data.optString("type", "text"));

            // Nullable fields
            message.put("file_name", data.has("file_name") ? data.optString("file_name", null) : JSONObject.NULL);
            message.put("file_type", data.has("file_type") ? data.optString("file_type", null) : JSONObject.NULL);
            message.put("file_size", data.has("file_size") ? data.optLong("file_size") : JSONObject.NULL);

            // Thumbnail (base64 string assumed)
            String base64Thumb = data.optString("thumbnail", null);
            if (base64Thumb != null && !base64Thumb.equals("null")) {
                message.put("thumbnail", base64Thumb);
            } else {
                message.put("thumbnail", JSONObject.NULL);
            }

            message.put("file_path", data.has("file_path") ? data.optString("file_path", null) : JSONObject.NULL);
            message.put("isError", data.optInt("isError", 0));
            message.put("isSent", data.optInt("isSent", 1));

            // Save to SharedPreferences
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("message_" + id, message.toString());
            editor.apply();

            Log.d("MessageSave", "Saved normalized message to prefs: " + id);

        } catch (Exception e) {
            Log.e("PushReceiver", "Failed to save message to SQLite", e);
        } finally {

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
        Log.d("PushReceiver", "Call notification received");
        // You can add call UI logic here if needed
    }
}
