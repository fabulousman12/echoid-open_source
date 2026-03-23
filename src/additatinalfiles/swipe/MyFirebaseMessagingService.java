package com.swipe;

import java.util.Map;

import android.app.NotificationManager;
import android.content.ContentValues;
import android.content.Context;
import android.os.Build;
import android.util.Base64;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.ActivityManager;
import android.util.Log;
import android.database.sqlite.SQLiteDatabase;
import android.app.PendingIntent;
import android.content.Intent;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        // Check if the app is in the foreground
        if (isAppInForeground()) {
            // Handle the message internally when the app is in the foreground (no system notification)
          
        } else {
            // If the app is in the background or dead, show a notification based on the data
            if (remoteMessage.getData().size() > 0) {
                String name = remoteMessage.getData().get("username");
                String content = remoteMessage.getData().get("content");
                String base64ProfileImage = remoteMessage.getData().get("userProfilePic");
                byte[] profileImageData = null;
                String fileType = remoteMessage.getData().get("file_type");
                // Check if the profile image data exists and decode it
                if (base64ProfileImage != null) {
                    profileImageData = decodeBase64ToByteArray(base64ProfileImage);
                }
                if (content == null || content.isEmpty()) {
                    content = fileType != null ? fileType : "File";  // Show file type or a generic "File"
                }
                
                String timestamp = remoteMessage.getData().get("timestamp");
                
                // Show the notification using the extracted data
                showNotification(name, content, profileImageData, timestamp);
                handleSave(remoteMessage.getData());
            }
        }
    }
    

    private void showNotification(String senderName, String content, byte[] profileImageData, String timestamp) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    
        // Create notification channel if necessary (for Android 8.0 and above)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence channelName = "Default Channel";
            String channelDescription = "General notifications";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel("default", channelName, importance);
            channel.setDescription(channelDescription);
            notificationManager.createNotificationChannel(channel);
        }

        Bitmap profileImage = null;
        if (profileImageData != null) {
            profileImage = BitmapFactory.decodeByteArray(profileImageData, 0, profileImageData.length);
        }

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, "default")
                .setSmallIcon(android.R.drawable.ic_notification_overlay) // or another built-in icon
                .setContentTitle(senderName)
                .setContentText(content)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE)
                .setLargeIcon(profileImage)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true);

        // Use unique ID (e.g., using message ID)
        int notificationId = Integer.parseInt(content.hashCode() + "");
        notificationManager.notify(notificationId, notificationBuilder.build());
    }

    public void handleSave(Map<String, String> data) {
        // Handle any custom data sent with the push message
        String sender = getOrNull(data.get("sender"));
        String recipient = getOrNull(data.get("recipient"));
        String content = getOrNull(data.get("content"));
        String status = getOrNull(data.get("status"));
        String messageType = getOrNull(data.get("type")); // text or file
        String fileName = getOrNull(data.get("file_name")); // File name, if available or null
        String fileType = getOrNull(data.get("file_type")); // File type, if available or null
        String fileSize = getOrNull(data.get("file_size")); // File size, if available or null
        String base64ProfileImage = getOrNull(data.get("profile_image"));
        String timestamp = getOrNull(data.get("timestamp")); // or use an actual timestamp or null if not available
        String thumbnail = getOrNull(data.get("thumbnail")); // Thumbnail, if available (optional)
        String filePath = getOrNull(data.get("file_path")); // File path, if available or null
        // Decode the profile image, if available
        byte[] profileImageData = base64ProfileImage != null ? decodeBase64ToByteArray(base64ProfileImage) : null;
    
        // Parse integer fields with default values
        int isDownload = parseOrDefault(data.get("isDownload"), 0);
        int isDeleted = parseOrDefault(data.get("isDeleted"), 0);
        int read = parseOrDefault(data.get("read"), 0);
    
        ContentValues values = new ContentValues();
        values.put("id", data.get("id"));
        values.put("sender", sender);
        values.put("recipient", recipient);
        values.put("content", content); 
        values.put("type", messageType);
        values.put("file_name", fileName);
        values.put("file_type", fileType);
        values.put("file_size", fileSize);
        values.put("isDownload", isDownload);
        values.put("isDeleted", isDeleted);
        values.put("read", read);
        values.put("profile_image", profileImageData);
        values.put("timestamp", timestamp);
        values.put("thumbnail", thumbnail);
        values.put("file_path", filePath);
        values.put("status", status);
        saveMessageToDatabase(values);
    }

    private String getOrNull(String value) {
        return (value != null && !value.trim().isEmpty()) ? value : null;
    }
    
    private int parseOrDefault(String value, int defaultValue) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException | NullPointerException e) {
            return defaultValue;
        }
    }
    

    private void saveMessageToDatabase(ContentValues values) {
        // Use SQLiteOpenHelper instead for better database management
        SQLiteDatabase db = openOrCreateDatabase("Conversa_chats_store.db", MODE_PRIVATE, null);
    
        // Insert the message into the database
        try {
            db.insert("messages", null, values);
        } catch (Exception e) {
            Log.e("DB_ERROR", "Error inserting message", e);
        } finally {
            db.close();
        }
    }

    private void handleDataPayload(Map<String, String> data) {
        String type = data.get("type"); // Determine if it's an update or a normal message
        if ("update".equals(type)) {
            String updateType = data.get("updateType");
            if ("status".equals(updateType)) {
                handleStatusUpdate(data);
            } else if ("unread".equals(updateType)) {
                handleUnreadUpdate(data);
            } else {
                handleMessageData(data);
            }
        } else {
            handleMessageData(data);
        }
    }

    private void handleStatusUpdate(Map<String, String> data) {
        // Extract the message IDs to update
        String[] messageIds = data.get("messageIds").split(",");
        updateMessagesStatus(messageIds, "sent");
    }
    
    private void handleUnreadUpdate(Map<String, String> data) {
        // Extract the message IDs to update
        String[] messageIds = data.get("messageIds").split(",");
        updateMessagesReadStatus(messageIds, true);
    }
    private void updateMessagesReadStatus(String[] messageIds, boolean read) {
        SQLiteDatabase db = openOrCreateDatabase("Conversa_chats_store.db", MODE_PRIVATE, null);
        try {
            String placeholders = new String(new char[messageIds.length]).replace("\0", "?, ").replaceAll(", $", "");
            String query = "UPDATE messages SET read = ? WHERE id IN (" + placeholders + ")";
            db.execSQL(query, combineParams(new String[]{read ? "1" : "0"}, messageIds));
            Log.d("UPDATE_READ", "Messages updated to read: " + read);
        } catch (Exception e) {
            Log.e("DB_ERROR", "Error updating message read status", e);
        } finally {
            db.close();
        }
    }
    private void updateMessagesStatus(String[] messageIds, String status) {
        SQLiteDatabase db = openOrCreateDatabase("Conversa_chats_store.db", MODE_PRIVATE, null);
        try {
            String placeholders = new String(new char[messageIds.length]).replace("\0", "?, ").replaceAll(", $", "");
            String query = "UPDATE messages SET status = ? WHERE id IN (" + placeholders + ")";
            db.execSQL(query, combineParams(new String[]{status}, messageIds));
            Log.d("UPDATE_STATUS", "Messages updated to status: " + status);
        } catch (Exception e) {
            Log.e("DB_ERROR", "Error updating message status", e);
        } finally {
            db.close();
        }
    }

    private String[] combineParams(String[] prefix, String[] suffix) {
        String[] combined = new String[prefix.length + suffix.length];
        System.arraycopy(prefix, 0, combined, 0, prefix.length);
        System.arraycopy(suffix, 0, combined, prefix.length, suffix.length);
        return combined;
    }
    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        // Handle the refresh of the token (optional)
        // You can send the token to your server for user identification
    }
    private void handleMessageData(Map<String, String> data) {
        String sender = data.get("sender");
        String recipient = data.get("recipient");
        String content = data.get("content");
        String messageType = data.get("type");
        String fileName = data.get("file_name");
        String fileType = data.get("file_type");
        String fileSize = data.get("file_size");
        String timestamp = data.get("timestamp");
        String thumbnail = data.get("thumbnail");
        
        int isDownload = Integer.parseInt(data.get("isDownload"));
        int isDeleted = Integer.parseInt(data.get("isDeleted"));
        int read = Integer.parseInt(data.get("read"));

        ContentValues values = new ContentValues();
        values.put("id", data.get("id"));
        values.put("sender", sender);
        values.put("recipient", recipient);
        values.put("timestamp", timestamp);
        values.put("read", read);
        values.put("type", messageType);

        if ("file".equals(messageType)) {
            values.put("file_name", fileName);
            values.put("file_type", fileType);
            values.put("file_size", Integer.parseInt(fileSize));
            values.put("isDownload", isDownload);
            values.put("isDeleted", isDeleted);
            values.put("content", (String) null);
            values.put("thumbnail", thumbnail);
        } else {
            values.put("content", content);
            values.put("file_name", (String) null);
            values.put("file_type", (String) null);
            values.put("file_size", (Integer) null);
            values.put("isDownload", (Integer) null);
            values.put("isDeleted", (Integer) 0);
            values.put("thumbnail", (String) null);
        }

        saveMessageToDatabase(values);
    }

    // private void showNotification(String senderName, String content, byte[] profileImageData, String timestamp) {
    //     NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    
    //     if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    //         CharSequence channelName = "Default Channel";
    //         String channelDescription = "General notifications";
    //         int importance = NotificationManager.IMPORTANCE_DEFAULT;
    //         NotificationChannel channel = new NotificationChannel("default", channelName, importance);
    //         channel.setDescription(channelDescription);
    //         notificationManager.createNotificationChannel(channel);
    //     }

    //     Bitmap profileImage = null;
    //     if (profileImageData != null) {
    //         profileImage = BitmapFactory.decodeByteArray(profileImageData, 0, profileImageData.length);
    //     }

    //     NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, "default")
    //             .setSmallIcon(android.R.drawable.ic_notification_overlay)
    //             .setContentTitle(senderName)
    //             .setContentText(content)
    //             .setAutoCancel(true)
    //             .setPriority(NotificationCompat.PRIORITY_DEFAULT)
    //             .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE)
    //             .setLargeIcon(profileImage)
    //             .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
    //             .setWhen(System.currentTimeMillis())
    //             .setShowWhen(true);

    //     int notificationId = Integer.parseInt(content.hashCode() + "");
    //     notificationManager.notify(notificationId, notificationBuilder.build());
    // }

    private boolean isAppInForeground() {
        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningAppProcessInfo appProcess : activityManager.getRunningAppProcesses()) {
            if (appProcess.processName.equalsIgnoreCase(getPackageName())) {
                return appProcess.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND;
            }
        }
        return false;
    }
    
    private byte[] decodeBase64ToByteArray(String base64String) {
        try {
            return Base64.decode(base64String, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
