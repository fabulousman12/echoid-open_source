package com.swipe;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

public class WarmupActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.d("Warmup", "Warmup activity launched to preload app");

        // DO NOTHING — Just existing is enough to start WebView + JS runtime

        // Immediately quit
        finish();
    }
}
