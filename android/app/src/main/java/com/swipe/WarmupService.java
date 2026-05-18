package com.swipe;

import android.app.Service;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

public class WarmupService extends Service {

    @Override
    public int onStartCommand(android.content.Intent intent, int flags, int startId) {
        Log.d("WarmupService", "App warmup started");

        // Preload classes you know you will use
        preloadClasses();
        android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_BACKGROUND);

        // Stop service after a short delay
        new Handler(Looper.getMainLooper()).postDelayed(this::stopSelf, 500);

        return START_NOT_STICKY;
    }

    private void preloadClasses() {
        try {
            Class.forName("com.swipe.MainActivity");
            Class.forName("me.pushy.sdk.Pushy");
            Class.forName("okhttp3.OkHttpClient");
            // Add more if needed
        } catch (Throwable ignored) {
        }
    }

    @Override
    public IBinder onBind(android.content.Intent intent) {
        return null;
    }
}
