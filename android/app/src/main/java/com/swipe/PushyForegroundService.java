package com.swipe;

import static android.content.Intent.getIntent;
import static com.swipe.NotificationHelper.createNotificationChannel;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.util.concurrent.Executors;


public class PushyForegroundService extends Service {

    @Nullable
    @Override

    public IBinder onBind(Intent intent) { return null; }
    private Intent lastIntent;

    @SuppressLint("ForegroundServiceType")
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {

        startForegroundNotification("Processing message", "Please wait");
        lastIntent = intent;
        // Keep service alive if system kills it
        // (Android will restart with last intent)
        // Process async
        processQueue();

        return START_REDELIVER_INTENT;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        // Start worker thread here
        new Handler(Looper.getMainLooper()).post(() -> processQueue());
    }

    private void processQueue() {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {

                Intent intent = lastIntent;
                if (intent == null) return;

                String jsonData = intent.getStringExtra("data");
                if (jsonData == null) {
                    stopSelf();
                    return;
                }

                PushyMessagingService serviceHelper = new PushyMessagingService();
                serviceHelper.handleMessageNotification(getApplicationContext(),
                        new JSONObject(jsonData));

            } catch (Exception e) {
                Log.e("PushyService", "Error", e);
            } finally {
                // Allow service to die only AFTER job done
                stopForeground(true);
                stopSelf();
            }
        });
    }

    @SuppressLint("ForegroundServiceType")
    private void startForegroundNotification(String title, String text) {

        createNotificationChannel(this);

        Notification notification = new NotificationCompat.Builder(this, "foreground_channel")
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(R.drawable.ic_launcher_background)
                .setOngoing(true) // important for reliability
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .build();

        startForeground(1, notification);
    }
}
