package com.swipe;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import me.pushy.sdk.Pushy;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import android.util.Base64;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.content.SharedPreferences;
public class NotificationHelper {

    private static final String CHANNEL_ID = "default";
    private static final String CHANNEL_NAME = "Default Channel";

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            System.out.println("Creating notification channel");
            NotificationManager manager = context.getSystemService(NotificationManager.class);

            NotificationChannel existingChannel = manager.getNotificationChannel(CHANNEL_ID);
            if (existingChannel == null || existingChannel.getImportance() != NotificationManager.IMPORTANCE_HIGH) {
                NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Default notification channel");
                channel.enableLights(true);
                channel.setLightColor(Color.RED);
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 400, 250, 400});
                manager.createNotificationChannel(channel);
            }
        }
    }
    public static Bitmap base64ToBitmap(String base64String) {
        try {
            // Remove data URI prefix if present
            if (base64String.startsWith("data:image")) {
                base64String = base64String.substring(base64String.indexOf(",") + 1);
            }

            byte[] decodedBytes = Base64.decode(base64String, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }


    public static void testHeadsUpNotification(Context context) {
        String channelId = "test_channel";
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, "Test Channel", NotificationManager.IMPORTANCE_HIGH);
            nm.createNotificationChannel(channel);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Heads-up Test")
                .setContentText("This is a test heads-up notification")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true);

        nm.notify(12345, builder.build());
    }

    // public static void showNotification(Context context, String title, String body, String soundPath, int notificationId) {
    //     String channelId = "default_channel";

    //     NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

    //     // Create or update the channel with high importance
    //     if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    //         NotificationChannel channel = nm.getNotificationChannel(channelId);
    //         if (channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_HIGH) {
    //             channel = new NotificationChannel(channelId, "Default Channel", NotificationManager.IMPORTANCE_HIGH);
    //             channel.setDescription("Default notification channel");
    //             channel.enableLights(true);
    //             channel.setLightColor(Color.RED);
    //             channel.enableVibration(true);
    //             channel.setVibrationPattern(new long[]{0, 400, 250, 400});
    //             nm.createNotificationChannel(channel);
    //         }
    //     }

    //     Uri soundUri;
    //     if (soundPath == null || soundPath.isEmpty() || "default".equals(soundPath)) {
    //         soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
    //     } else {
    //         soundUri = Uri.parse(soundPath);
    //     }

    //     Intent intent = new Intent(context, MainActivity.class);
    //     intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

    //     PendingIntent pendingIntent = PendingIntent.getActivity(
    //             context, 0, intent,
    //             PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    //     NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
    //             .setSmallIcon(android.R.drawable.ic_dialog_info)
    //             .setContentTitle(title)
    //             .setContentText(body)
    //             .setColor(Color.WHITE)
    //             .setPriority(NotificationCompat.PRIORITY_HIGH)     // For heads-up
    //             .setDefaults(NotificationCompat.DEFAULT_ALL)        // Vibrate, sound, lights
    //             .setAutoCancel(true)
    //             .setSound(soundUri)
    //             .setContentIntent(pendingIntent)
    //             .setCategory(NotificationCompat.CATEGORY_MESSAGE)
    //             .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

    //     NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
    //     notificationManager.notify(notificationId, builder.build());
    // }
    public static void showNotification(Context context, String title, String body, String soundPath, int notificationId, String avatarUriString) {
    String channelId = "default_channel";


    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        NotificationChannel channel = nm.getNotificationChannel(channelId);
        if (channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_HIGH) {
            channel = new NotificationChannel(channelId, "Default Channel", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Default notification channel");
            channel.enableLights(true);
            channel.setLightColor(Color.RED);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 400, 250, 400});
            nm.createNotificationChannel(channel);
        }
    }


    System.out.println("All data: " + title + " " + body + " " + soundPath + " " + notificationId + " " + avatarUriString);
    Uri soundUri;
    if (soundPath == null || soundPath.isEmpty() || "default".equals(soundPath)) {
        soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
    } else {
        soundUri = Uri.parse(soundPath);
    }

 

    Intent intent = new Intent(context, MainActivity.class);
    intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

    PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);


            Bitmap avatarBitmap = null;
            try {
            if (avatarUriString != null && !avatarUriString.equals("null")) {
                avatarBitmap = base64ToBitmap(avatarUriString);
            }
        } catch (IllegalArgumentException e) {
            e.printStackTrace();
        }

        if (avatarBitmap == null) {
            // Load default avatar from drawable
            avatarBitmap = BitmapFactory.decodeResource(context.getResources(), R.drawable.default_avatar);
        }
    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
        
            .setContentText(body)
            .setColor(Color.WHITE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setContentIntent(pendingIntent)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body)); // collapsible

    if (avatarBitmap != null) {
        builder.setLargeIcon(avatarBitmap);
    }

    NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
    notificationManager.notify(notificationId, builder.build());
}


}

