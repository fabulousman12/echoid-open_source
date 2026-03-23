package com.swipe;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;

public class AppLifecycleTracker {

    private static boolean isAppInForeground = false;

    public static void init(Application application) {
        application.registerActivityLifecycleCallbacks(new Application.ActivityLifecycleCallbacks() {
            @Override
            public void onActivityResumed(Activity activity) {
                isAppInForeground = true; // App comes to the foreground
            }

            @Override
            public void onActivityPaused(Activity activity) {
                isAppInForeground = false; // App goes to the background
            }

            @Override
            public void onActivityCreated(Activity activity, Bundle savedInstanceState) {}

            @Override
            public void onActivityStarted(Activity activity) {}

            @Override
            public void onActivityStopped(Activity activity) {}

            @Override
            public void onActivitySaveInstanceState(Activity activity, Bundle outState) {}

            @Override
            public void onActivityDestroyed(Activity activity) {}
        });
    }

    public static boolean isAppInForeground() {
        return isAppInForeground;
    }
}
