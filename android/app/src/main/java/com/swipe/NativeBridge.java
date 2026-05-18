package com.swipe;

import android.webkit.JavascriptInterface;

public final class NativeBridge {

    private final MainActivity activity;

    NativeBridge(MainActivity activity) {
        this.activity = activity;
    }

    // ---- EXPOSE ONLY WHAT JS NEEDS ----

    @JavascriptInterface
    public void pickMediaNative(int limit) {
        activity.pickMediaNative(limit);
    }

    @JavascriptInterface
    public void pickAudioNative() {
        activity.pickAudioNative();
    }

    @JavascriptInterface
    public void requestOverlayPermission() {
        activity.requestOverlayPermission();
    }

    @JavascriptInterface
    public void enableOverlayMode() {
        activity.enableOverlayMode();
    }

    @JavascriptInterface
    public void restoreFromOverlay() {
        activity.restoreFromOverlay();
    }

    @JavascriptInterface
    public void showUnityRewardedAd() {
        activity.showUnityRewardedAd();
    }

    @JavascriptInterface
    public void requestCallPermissions() {
        activity.requestCallPermissions();
    }

    @JavascriptInterface
    public void setAudioRoute(String route) {
        activity.setAudioRoute(route);
    }

    @JavascriptInterface
    public void setSpeakerphoneOn(boolean enabled) {
        activity.setSpeakerphoneOn(enabled);
    }
}
