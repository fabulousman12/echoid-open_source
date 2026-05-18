package com.swipe;

import android.app.Application;

public class MyApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        
        // Initialize AppLifecycleTracker to start tracking app lifecycle
        AppLifecycleTracker.init(this);
    }
}
