package com.swipe;

import android.annotation.SuppressLint;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.view.ViewParent;

public class FloatingCallService extends Service {

    WindowManager wm;
    FrameLayout root;
    FrameLayout container; // overlay gesture layer
    WebView webView;
    WindowManager.LayoutParams params;
    private static final long DOUBLE_TAP_INTERVAL = 250;

    private long lastTapTime = 0;
    private boolean waitingForSecondTap = false;
    private boolean introToastShown = false;


    final Handler ui = new Handler(android.os.Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        MainActivity act = MainActivity.instance;
        if (act == null) { stopSelf(); return; }
        webView = act.getMainWebView();
        if (webView == null) { stopSelf(); return; }
        // detach from activity
        ViewParent parent = webView.getParent();
        if (parent instanceof ViewGroup) ((ViewGroup) parent).removeView(webView);
        // root overlay
        root = new FrameLayout(this);
        // bottom layer holds webview (not interactive)
        FrameLayout webLayer = new FrameLayout(this);
        webLayer.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        // top layer for drag + gestures
        container = new FrameLayout(this);
        root.addView(webLayer);
        root.addView(container);
        // prevent touch on WebView
        webView.setClickable(false);
        webView.setFocusable(false);
        webView.setOnTouchListener((v, e) -> true);
        // overlay window params
        params = new WindowManager.LayoutParams(
                320, 420,
                Build.VERSION.SDK_INT >= 26 ?
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
                        WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 200;

        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        wm.addView(root, params);
        showHintToastOnce();

        enableDragAndDoubleTap();

    }
    private void showHintToastOnce() {
        if (introToastShown) return;
        introToastShown = true;

        ui.post(() ->
                android.widget.Toast.makeText(
                        this,
                        "Double tap to return to normal",
                        android.widget.Toast.LENGTH_SHORT
                ).show()
        );
    }

    // ==========================================================================
    // DRAG + DOUBLE TAP TO RESTORE
    // ==========================================================================
    @SuppressLint("ClickableViewAccessibility")
    private void enableDragAndDoubleTap() {

        container.setOnTouchListener(new View.OnTouchListener() {

            final int[] last = new int[2];
            boolean dragging = false;

            @Override
            public boolean onTouch(View v, MotionEvent e) {

                switch (e.getActionMasked()) {

                    case MotionEvent.ACTION_DOWN:

                        last[0] = (int) e.getRawX();
                        last[1] = (int) e.getRawY();
                        dragging = false;
                        return true;

                    case MotionEvent.ACTION_MOVE:

                        int dx = (int) e.getRawX() - last[0];
                        int dy = (int) e.getRawY() - last[1];

                        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {

                            dragging = true;

                            params.x += dx;
                            params.y += dy;

                            wm.updateViewLayout(root, params);

                            last[0] = (int) e.getRawX();
                            last[1] = (int) e.getRawY();
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        if (!dragging) {
                            handleTap();
                        }
                        return true;
                }

                return false;
            }
        });
    }

    // ==========================================================================
    // DOUBLE TAP = RESTORE APP
    // ==========================================================================
  private void detectDoubleTap() {
    long now = System.currentTimeMillis();

    if (now - lastTapTime < DOUBLE_TAP_INTERVAL) {
        callRestoreInActivity();
    }

    lastTapTime = now;
}

    private void handleTap() {
        long now = System.currentTimeMillis();

        if (waitingForSecondTap && (now - lastTapTime) < DOUBLE_TAP_INTERVAL) {
            // DOUBLE TAP → RESTORE
            waitingForSecondTap = false;
            callRestoreInActivity();
        } else {
            // SINGLE TAP → TOAST ONLY
            waitingForSecondTap = true;
            lastTapTime = now;

            showHintToast();
        }
    }
    private void showHintToast() {
        ui.post(() ->
                android.widget.Toast.makeText(
                        this,
                        "Double tap to return to normal",
                        android.widget.Toast.LENGTH_SHORT
                ).show()
        );
    }

private void callRestoreInActivity() {

    MainActivity activity = MainActivity.instance;
    if (activity == null) return;

    // Just call the existing method
    activity.restoreFromOverlay();
    activity.notifyOverlayRestored();
}
    // ==========================================================================
    // RESTORE APP LOGIC
    // ==========================================================================


    // ==========================================================================
    // JS BRIDGE (OPTIONAL)
    // ==========================================================================


    private void callJs(String script) {
        ui.post(() -> webView.evaluateJavascript(script, null));
    }

    // ==========================================================================
    // CLEANUP
    // ==========================================================================
    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            if (wm != null && root != null) wm.removeView(root);
        } catch (Exception ignored) {}
    }

    @Override public IBinder onBind(Intent i) { return null; }
}
