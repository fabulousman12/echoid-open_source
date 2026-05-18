package com.swipe;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class NotificationHelper {

    // 🔥 ONE channel only
    private static final String CHANNEL_ID = "chat_messages";

    public static int getStableDirectNotificationId(String senderId) {
        String text = senderId == null ? "" : senderId;
        int hash = 0;
        for (int i = 0; i < text.length(); i++) {
            hash = ((hash << 5) - hash) + text.charAt(i);
        }
        return 10000 + (Math.abs(hash) % 90000);
    }

    /* ============================================================
       CHANNEL CREATION (CALL ON APP START)
       ============================================================ */
    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Chat Messages",
                NotificationManager.IMPORTANCE_HIGH
        );

        channel.setDescription("Incoming chat messages");
        channel.enableLights(true);
        channel.setLightColor(Color.BLUE);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 250, 200, 250});

        // ⚠️ REQUIRED for heads-up
        channel.setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build()
        );

        nm.createNotificationChannel(channel);
    }

    /* ============================================================
       BASE64 → BITMAP
       ============================================================ */
    private static Bitmap base64ToBitmap(String base64) {
        try {
            if (base64.startsWith("data:image")) {
                base64 = base64.substring(base64.indexOf(",") + 1);
            }
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception e) {
            return null;
        }
    }

    /* ============================================================
       SHOW MESSAGE NOTIFICATION (HEADS-UP)
       ============================================================ */
    public static void showNotification(
            Context context,
            String title,
            String body,
            String soundPath,
            int notificationId,
            String avatarBase64OrUri
    ) {

        // Android 13+ permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                return;
            }
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Bitmap avatar = null;
        try {
            if (avatarBase64OrUri != null && !"null".equals(avatarBase64OrUri)) {
                if (avatarBase64OrUri.startsWith("data:image") || avatarBase64OrUri.length() > 100) {
                    avatar = base64ToBitmap(avatarBase64OrUri);
                } else {
                    Uri uri = Uri.parse(avatarBase64OrUri);
                    avatar = BitmapFactory.decodeStream(
                            context.getContentResolver().openInputStream(uri)
                    );
                }
            }
        } catch (Exception ignored) {}

        if (avatar == null) {
            avatar = BitmapFactory.decodeResource(
                    context.getResources(),
                    R.drawable.default_avatar
            );
        }

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(context, CHANNEL_ID)
                        .setSmallIcon(R.drawable.echoid_v3)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setLargeIcon(avatar)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                        .setPriority(NotificationCompat.PRIORITY_HIGH) // pre-O
                        .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent)
                        .setDefaults(NotificationCompat.DEFAULT_VIBRATE);

        NotificationManagerCompat.from(context).notify(notificationId, builder.build());

        /* ========================================================
           OPTIONAL: custom sound (does NOT block heads-up)
           ======================================================== */
        if (soundPath != null && !soundPath.isEmpty() && !"default".equals(soundPath)) {
            playCustomSound(context, soundPath);
        }
    }

    /* ============================================================
       CUSTOM SOUND (OPTIONAL)
       ============================================================ */
    private static void playCustomSound(Context context, String soundPath) {
        try {
            Uri uri = Uri.parse(soundPath);
            MediaPlayer mp = new MediaPlayer();
            mp.setDataSource(context, uri);
            mp.setAudioStreamType(AudioManager.STREAM_NOTIFICATION);
            mp.setOnCompletionListener(MediaPlayer::release);
            mp.prepare();
            mp.start();

            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    if (mp.isPlaying()) mp.stop();
                } catch (Exception ignored) {}
                mp.release();
            }, 4000);

        } catch (Exception ignored) {}
    }
}
