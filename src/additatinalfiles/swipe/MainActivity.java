package com.swipe;

import android.annotation.TargetApi;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.view.ViewParent;
import android.widget.Toast;
import org.json.JSONObject;
import android.webkit.WebView;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

import android.view.ViewGroup;
import android.provider.Settings;


import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.util.Base64;
import me.pushy.sdk.Pushy;
import com.swipe.plugins.AuthBridgePlugin;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

import me.pushy.sdk.util.exceptions.PushyException;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.io.IOException;
import org.json.JSONArray;


import com.unity3d.ads.UnityAds;
import com.unity3d.ads.IUnityAdsInitializationListener;

import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAdsShowOptions;
import android.content.Intent;
import android.content.Context;
import android.database.Cursor;

import android.provider.DocumentsContract;

import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.swipe.auth.TokenRefresher;

public class MainActivity extends BridgeActivity implements IUnityAdsInitializationListener {
    private final AtomicBoolean pushyRegistered = new AtomicBoolean(false);
    private final AtomicBoolean pushRegistered = new AtomicBoolean(false);
    public static MainActivity instance;          // 🔴 global reference


    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 1001;

   // private static final String ONESIGNAL_APP_ID = "381d6702-9013-4d0e-818a-ddca168d1c53";
    private static final String PREF_NAME = "CapacitorStorage";
    private static final String AUTH_TOKEN_KEY = "token";
    private static final String DEVICE_ID_KEY = "deviceId";
    private boolean oneSignalInitialized = false;
    private long adStartTimeMs = 0;

    private static final String KEY_AD_TIME = "ad_time";



    private static final String DEVICE_TOKEN_KEY = "device_token";
public  static String unitytest = "xxxxx";
    private static final String UNITY_GAME_ID = "xxxxx"; // replace with real
private static final String UNITY_AD_UNIT_ID = "Rewarded_Android"; // reward ad id
private static final boolean UNITY_TEST_MODE = false;
private static final boolean Is_Debig = false;
private static final int VERSION_CODE = 1051;


    public static final String FCM_CHANNEL_ID = "fcm_default";



    public WebView getMainWebView() {            // 🔴 expose the WebView
        return this.bridge.getWebView();
    }
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        instance = this;   // 🔴 keep reference for the Service

        super.onCreate(savedInstanceState);
 WebView webView = this.bridge.getWebView(); // ← FIX
                webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.getSettings().setDomStorageEnabled(true);
        stopIncomingCallServiceIfRunning();
       webView.setWebChromeClient(new WebChromeClient() {
           @Override
           public void onPermissionRequest(final PermissionRequest request) {
               runOnUiThread(() -> {
                   request.grant(request.getResources());
               });
           }


       });
        NotificationHelper.createNotificationChannel(this);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
    if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, 1003);
    }
}

        createFcmChannel(this);
        FirebaseApp app = FirebaseApp.getInstance();

        FirebaseOptions opts = app.getOptions();

        Log.d("FIREBASE", "projectId=" + opts.getProjectId());
        Log.d("FIREBASE", "appId=" + opts.getApplicationId());
        Log.d("FIREBASE", "senderId=" + opts.getGcmSenderId());

SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
prefs.edit()
     .putString("native_version_code", String.valueOf(VERSION_CODE))
     .commit();

        webView.addJavascriptInterface(
                new NativeBridge(this),
                "NativeAds"
        );



        checkAndRequestNotificationPermission();
// StartAppSDK.init(this, "205258541", true);
//    StartAppAd.disableSplash(); // Optional - disables default splash ad
//System.out.println("registering class");
         // ✅ This registers your custom plugin
        // Optional - disable splash


        System.out.println("registering class should done");

       WebView.setWebContentsDebuggingEnabled(false);
        
  // Pushy.listen(this);
        registerPlugin(AuthBridgePlugin.class);
        UnityAds.initialize(getApplicationContext(), unitytest, UNITY_TEST_MODE, this);

        String authToken = getStoredAuthToken();
        String deviceToken = getStoredDeviceToken();
        System.out.println("MainActivity Device token: 2 " + deviceToken);
     // 1. Check if authToken is present
     System.out.println("MainActivity Auth token: " + authToken);
        if (authToken == null || authToken.isEmpty()) {
            return;
        }


        boolean bgPageShown = prefs.getBoolean("bg_page_shown", false);
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
           Log.d("Battery","check");
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                if (pm == null) return;
            Log.d("Battery","shoudl work" + bgPageShown);
                if (!pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    Log.d("Battery","yes");
                    checkAndRequestBatteryOptimization();
                } else if (!bgPageShown) {
                    openBatteryBackgroundSettingsWithToast();
                    Log.d("Battery","no");
                    prefs.edit().putBoolean("bg_page_shown", true).apply();
                }


        }
        }, 5000); // ✅ 3-second delay


// 2. Init OneSignal

//        try {
//            OneSignal.initWithContext(this, ONESIGNAL_APP_ID);
//            OneSignal.getUser().getPushSubscription().addObserver(this);
//            oneSignalInitialized = true;
//        } catch (Exception e) {
//            oneSignalInitialized = false;
//            registerWithPushy(authToken);
//            return;
//        }
        // FirebaseMessaging.getInstance()
//                 .getToken()
//                 .addOnCompleteListener(task -> {
//                     if (task.isSuccessful()) {
//                         String token = task.getResult();
//                         if (token != null && !token.isEmpty()) {
//                             compareAndHandleToken(token, "fcm", authToken);
//                             return;
//                         }
//                     }
//
//                     // Only fallback if FCM is truly unavailable
//                     fallbackToPushy(authToken);
//                 });



// 4. Request permission
//OneSignal.getNotifications().requestPermission(true, Continue.with(result -> {
//    System.out.println("MainActivity OneSignal permission result: " + result + " " + result.isSuccess()+ " " + result.getData()) ;
//    if (result.isSuccess() && result.getData()) {
//        // Permission granted
//
//        String id = OneSignal.getUser().getOnesignalId();
//String subscriptionId = OneSignal.getUser().getPushSubscription().getId();
//System.out.println("OneSignal ID: " + id);
//System.out.println("Subscription ID (UUID): " + subscriptionId);
//
//
//        // Set external ID, etc.
//    } else {
//        // Permission denied or error
//        registerWithPushy(authToken);
//        pushyRegistered.set(true);
//    }
//}));


        // 🔋 Delay 20 seconds → then check and ask battery optimization
    

    }

    private void createFcmChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

            NotificationChannel channel = new NotificationChannel(
                    FCM_CHANNEL_ID,
                    "Messages native",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Fallback FCM notifications");
            channel.enableVibration(true);
            channel.setShowBadge(true);

            nm.createNotificationChannel(channel);
        }
    }
    private void openBatteryBackgroundSettingsWithToast() {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);

            Toast.makeText(
                    this,
                    "Set Battery usage to UNRESTRICTED and allow Background activity for Call reliability",
                    Toast.LENGTH_LONG
            ).show();

        } catch (Exception e) {
            Toast.makeText(
                    this,
                    "Please allow background activity for reliable calls",
                    Toast.LENGTH_LONG
            ).show();
        }
    }


    private void fallbackToPushy(String authToken) {

            registerWithPushy(authToken);

    }


    @JavascriptInterface
    public void pickMediaNative(int limit) {
        runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            System.out.println("test from pick"+limit);
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, limit != 1);
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});
            startActivityForResult(Intent.createChooser(intent, "Select Media"), 5678);
        });
    }

    @JavascriptInterface
    public void requestOverlayPermission() {
        if (!Settings.canDrawOverlays(this)) {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        }
    }



    @JavascriptInterface
    public void enableOverlayMode() {
        if (!Settings.canDrawOverlays(this)) {
            runOnUiThread(() -> Toast.makeText(this, "Grant overlay permission first", Toast.LENGTH_SHORT).show());
            return;
        }

        runOnUiThread(() -> {
            startService(new Intent(this, FloatingCallService.class));
            moveTaskToBack(true); // push app behind
        });
    }

    private void stopIncomingCallServiceIfRunning() {
        try {
            Intent stop = new Intent(this, IncomingCallService.class);
            stop.setAction(IncomingCallService.ACTION_STOP);
            startService(stop);
        } catch (Exception ignored) {}
    }

    /*************** FINAL RESTORE FIX (Correct Task Restore) ***************/
    @JavascriptInterface
    public void restoreFromOverlay() {
        MainActivity activity = MainActivity.instance;
        if (activity == null) return;
        // 2) Stop overlay service window
        activity.stopService(new Intent(activity, FloatingCallService.class));

        // 1) Restore Activity to Foreground — NO new instance
        Intent restore = new Intent(Intent.ACTION_MAIN);
        restore.addCategory(Intent.CATEGORY_LAUNCHER);
        restore.setClass(activity, MainActivity.class);
        restore.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        activity.startActivity(restore);


        // 3) Restore WebView to main UI tree
        activity.runOnUiThread(() -> {
            WebView web = activity.getMainWebView();
            ViewGroup root = activity.findViewById(android.R.id.content);

            if (web != null) {
                ViewParent parent = web.getParent();
                if (parent instanceof ViewGroup) ((ViewGroup) parent).removeView(web);

                if (web.getParent() == null) {
                    root.addView(web, new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT));
                }
                      web.setClickable(true);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.setOnTouchListener(null);
            }
        });
    }

//    @JavascriptInterface
//    public void restoreFromOverlay() {
//        MainActivity activity = MainActivity.instance;
//
//        // 1) Bring existing Activity *front* (NO new instance)
//        Intent i = new Intent(Intent.ACTION_MAIN);
//        i.addCategory(Intent.CATEGORY_LAUNCHER);
//        i.setClass(activity, MainActivity.class);
//        i.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
//        activity.startActivity(i);
//
//        // 2) Stop floating service (removes overlay window)
//        activity.stopService(new Intent(activity, FloatingCallService.class));
//
//        // 3) Reattach WebView back to screen
//        activity.runOnUiThread(() -> {
//            WebView web = activity.getMainWebView();
//            ViewGroup root = activity.findViewById(android.R.id.content);
//
//            ViewParent p = web.getParent();
//            if (p instanceof ViewGroup) ((ViewGroup)p).removeView(web);
//
//            root.addView(web,new ViewGroup.LayoutParams(-1,-1)); // FULLSCREEN restored
//        });
//    }


    @JavascriptInterface
    public void pickAudioNative() {
        runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("audio/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false); // single audio selection
            startActivityForResult(Intent.createChooser(intent, "Select Audio"), 7890);
        });
    }

    public void notifyOverlayRestored() {
        dispatchJsEvent("RestoreOverlay", "{ restored: true }");
    }

    @TargetApi(Build.VERSION_CODES.M)
    private void checkAndRequestBatteryOptimization() {
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);

        if (pm == null) return;

        boolean ignoring = pm.isIgnoringBatteryOptimizations(getPackageName());

        if (!ignoring) {
            // ⛔ Not allowed → Ask the system permission dialog
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            try {
                startActivity(intent);
            } catch (Exception e) {
                System.out.println("Battery opt request failed: " + e);
            }
        } else {
            System.out.println("Battery Optimization already ignored ✔");
        }
    }

    public void dispatchJsEvent(String eventName, String jsonDetail) {
        try {
            WebView wv = getMainWebView();
            if (wv == null) return;

            String js = "window.dispatchEvent(new CustomEvent('" + eventName + "', { detail: " + jsonDetail + " }));";

            wv.post(() -> wv.evaluateJavascript(js, null));

        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data); 

        if (requestCode == 5678 && resultCode == RESULT_OK && data != null) {
            List<String> names = new ArrayList<>();
            List<String> types = new ArrayList<>();
            List<String> previews = new ArrayList<>();

            if (data.getClipData() != null) { // multiple selection
                int count = data.getClipData().getItemCount();
                for (int i = 0; i < count; i++) {
                    Uri uri = data.getClipData().getItemAt(i).getUri();
                    addMedia(uri, names, types, previews);
                }
            } else { // single selection
                Uri uri = data.getData();
                addMedia(uri, names, types, previews);
            }

            try {
                JSONArray jsNames = new JSONArray(names);
                JSONArray jsTypes = new JSONArray(types);
                JSONArray jsPreviews = new JSONArray(previews);

                String jsCode = "window.dispatchEvent(new CustomEvent('MediaSelected', { detail: { names: "
                        + jsNames.toString() + ", types: " + jsTypes.toString() + ", previews: " + jsPreviews.toString() + " } }));";
                this.bridge.getWebView().post(() -> this.bridge.getWebView().evaluateJavascript(jsCode, null));
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        if (requestCode == 7890 && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                try {
                    String name = queryFileName(uri);
                    String type = getContentResolver().getType(uri);

                    InputStream inputStream = getContentResolver().openInputStream(uri);
                    byte[] bytes = new byte[inputStream.available()];
                    inputStream.read(bytes);
                    inputStream.close();

                    String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
                    String dataUrl = "data:" + type + ";base64," + base64;

                    // send result to JS
                    String jsCode = "window.dispatchEvent(new CustomEvent('AudioSelected', { detail: { name: '"
                            + name + "', type: '" + type + "', preview: '" + dataUrl + "' } }));";

                    this.bridge.getWebView().post(() -> this.bridge.getWebView().evaluateJavascript(jsCode, null));
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

    }

    // Helper to read file and convert to base64
    private void addMedia(Uri uri, List<String> names, List<String> types, List<String> previews) {
        if (uri == null) return;
        try {
            String name = queryFileName(uri);
            String type = getContentResolver().getType(uri);

            InputStream inputStream = getContentResolver().openInputStream(uri);
            byte[] bytes = new byte[inputStream.available()];
            inputStream.read(bytes);
            inputStream.close();

            String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
            String dataUrl = "data:" + type + ";base64," + base64;

            names.add(name);
            types.add(type);
            previews.add(dataUrl);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String queryFileName(Uri uri) {
        String name = "file";
        Cursor cursor = getContentResolver().query(uri, null, null, null, null);
        if (cursor != null && cursor.moveToFirst()) {
            int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
            if (index >= 0) name = cursor.getString(index);
            cursor.close();
        }
        return name;
    }

    @android.webkit.JavascriptInterface
    public void pickMediaFile() { 
        runOnUiThread(() -> {
   Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
intent.setType("*/*");
intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});
intent.addCategory(Intent.CATEGORY_OPENABLE);
startActivityForResult(Intent.createChooser(intent, "Select Media"), 999);

        });
    }



    public String getFilePathFromUri(Context context, Uri uri) {
        String filePath = null;

        if (uri == null) return null;

        // Handle modern document URIs
        if (DocumentsContract.isDocumentUri(context, uri)) {
            final String docId = DocumentsContract.getDocumentId(uri);
            final String[] split = docId.split(":");
            final String type = split[0];

            Uri contentUri = null;
            if ("image".equals(type)) {
                contentUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            } else if ("video".equals(type)) {
                contentUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
            }

            String selection = "_id=?";
            String[] selectionArgs = new String[]{split[1]};

            try (Cursor cursor = context.getContentResolver().query(
                    contentUri, new String[]{MediaStore.MediaColumns.DATA},
                    selection, selectionArgs, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATA);
                    filePath = cursor.getString(idx);
                }
            }
        }

        // Fallback to copy if file path is still null
        if (filePath == null) {
            try {
                InputStream inputStream = context.getContentResolver().openInputStream(uri);
                if (inputStream != null) {
                    String fileName = getFileName(context, uri);
                    File tempFile = new File(context.getCacheDir(), fileName);
                    try (OutputStream output = new FileOutputStream(tempFile)) {
                        byte[] buffer = new byte[4096];
                        int length;
                        while ((length = inputStream.read(buffer)) > 0) {
                            output.write(buffer, 0, length);
                        }
                    }
                    filePath = tempFile.getAbsolutePath();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        return filePath;
    }

    private String getFileName(Context context, Uri uri) {
        String result = null;
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = context.getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    result = cursor.getString(cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME));
                }
            }
        }
        if (result == null) {
            result = uri.getLastPathSegment();
        }
        return result;
    }



//    @Override
//    public void onPushSubscriptionChange(@NotNull PushSubscriptionChangedState pushSubscriptionChangedState) {
//        Log.i("OneSignal", "onPushSubscriptionChange triggered");
//
//        try {
//            Log.i("OneSignal", "Push Subscription ID: " + pushSubscriptionChangedState.getCurrent().getId());
//            Log.i("OneSignal", "Push Token: " );
//            String uuid = pushSubscriptionChangedState.getCurrent().getId();
//            Log.i("OneSignal", "Subscription ID (UUID): " + uuid);
//            Log.i("OneSignal", "Push Token: " + uuid);
//
//            if ((uuid == null || uuid.isEmpty()) ) {
//                Log.w("OneSignal", "Missing UUID or Token — fallback to Pushy");
//                registerWithPushy(getStoredAuthToken());
//            } else {
//                Log.i("OneSignal", "Valid OneSignal credentials, proceeding with compareAndHandleToken");
//                compareAndHandleToken(uuid, "onesignal", getStoredAuthToken());
//                pushRegistered.set(true);
//            }
//
//        } catch (Exception e) {
//            Log.e("OneSignal", "Exception in onPushSubscriptionChange", e);
//            registerWithPushy(getStoredAuthToken());
//        }
//    }


      @Override
    public void onDestroy() {
        // Remove observer to avoid leaks
//          if (oneSignalInitialized) {
//              try {
//                  OneSignal.getUser()
//                          .getPushSubscription()
//                          .removeObserver(this);
//              } catch (Exception ignored) {
//                  // Defensive: never crash on destroy
//              }
//          }
        super.onDestroy();
    }

// Dummy method - replace with your real logic to get logged in user ID
@Override
public void onInitializationComplete() {
    // Called when Unity Ads initialization is complete
}

    @Override
    public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
        // Called when Unity Ads initialization fails
        // You can log or show an alert here
    }


    // --- Unity Ad Logic ---

    private final IUnityAdsLoadListener loadListener = new IUnityAdsLoadListener() {
        @Override
        public void onUnityAdsAdLoaded(String placementId) {
            UnityAds.show(MainActivity.this, UNITY_AD_UNIT_ID, new UnityAdsShowOptions(), showListener);
        }

        @Override
        public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
            Log.e("UnityAds", "Load failed: [" + error + "] " + message);
        }
    };

    private final IUnityAdsShowListener showListener = new IUnityAdsShowListener() {

        @Override
        public void onUnityAdsShowFailure(
                String placementId,
                UnityAds.UnityAdsShowError error,
                String message
        ) {
            adStartTimeMs = 0;
            Log.e("UnityAds", "Show failed: [" + error + "] " + message);
        }

        @Override
        public void onUnityAdsShowStart(String placementId) {
            adStartTimeMs = System.currentTimeMillis();
            Log.d("UnityAds", "Ad started: " + placementId);
        }

        @Override
        public void onUnityAdsShowClick(String placementId) {
            Log.d("UnityAds", "Ad clicked: " + placementId);
        }

        @Override
        public void onUnityAdsShowComplete(
                String placementId,
                UnityAds.UnityAdsShowCompletionState state
        ) {
            Log.d("UnityAds", "Ad completed: " + placementId + " | State: " + state);

            if (state == UnityAds.UnityAdsShowCompletionState.COMPLETED) {

                long watchedMs = System.currentTimeMillis() - adStartTimeMs;
                long watchedSeconds = Math.max(0, watchedMs / 1000);

                SharedPreferences prefs =
                        getApplicationContext().getSharedPreferences(
                                PREF_NAME,
                                Context.MODE_PRIVATE
                        );

                long previousTime = prefs.getLong(KEY_AD_TIME, 0);
                long finalTime = previousTime + watchedSeconds;

                prefs.edit()
                        .putLong(KEY_AD_TIME, finalTime)
                        .apply();

                // ===== LOG EVERYTHING =====
                Log.d("UnityAds", "Ad watch seconds: " + watchedSeconds);
                Log.d("UnityAds", "Previous ad_time: " + previousTime);
                Log.d("UnityAds", "Final ad_time: " + finalTime);

                // 👇 Notify JavaScript (unchanged logic)
                String jsCode =
                        "window.dispatchEvent(new CustomEvent('AdRewarded', { " +
                                "detail: { placementId: '" + placementId + "', " +
                                "watchedSeconds: " + watchedSeconds + ", " +
                                "totalAdTime: " + finalTime + " } }));";

                if (bridge != null && bridge.getWebView() != null) {
                    runOnUiThread(() ->
                            bridge.getWebView().evaluateJavascript(jsCode, null)
                    );
                }

            } else {
                Log.d("UnityAds", "Ad skipped — no reward");
            }

            adStartTimeMs = 0;
        }
    };
    private void addAdTime(Context context, long secondsToAdd) {
        SharedPreferences prefs =
                context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

        long current = prefs.getLong(KEY_AD_TIME, 0);

        prefs.edit()
                .putLong(KEY_AD_TIME, current + secondsToAdd)
                .apply();
    }

    private void loadUnityRewardedAd() {
        UnityAds.load(UNITY_AD_UNIT_ID, loadListener);
    }

    @android.webkit.JavascriptInterface
    public void showUnityRewardedAd() {
        runOnUiThread(() -> {
            UnityAds.load(UNITY_AD_UNIT_ID, loadListener); // No need for isReady()
        });
    }




    private void registerWithPushy(String authToken) {
        System.out.println("MainActivity Registering with Pushy");
        new Thread(() -> {
            try {
                System.out.println("MainActivity Registering with Pushy inside this");
                Pushy.listen(getApplicationContext());
                String token = Pushy.register(getApplicationContext());
                System.out.println("MainActivity Pushy token:pushy " + token);
                pushyRegistered.set(true); // <-- ✅ Update here

                runOnUiThread(() -> Toast.makeText(this, "Pushy registered", Toast.LENGTH_SHORT).show());

                compareAndHandleToken(token, "pushy", authToken);
            } catch (PushyException e) {
             System.out.println("MainActivity Pushy registration failed: " + e.getMessage());
            }
        }).start();
    }

    private void compareAndHandleToken(String newToken, String provider, String authToken) {
        String storedToken = getStoredDeviceToken();
        if (newToken.equals(storedToken)) {
            System.out.println("MainActivity Device token unchanged." + newToken + storedToken) ;
            return;
        }
        System.out.println("Change notice" + newToken + storedToken);

        
        sendTokenToBackend(newToken, provider, authToken);
    }

    private void sendTokenToBackend(String token, String provider, String authToken) {
        String backendUrl = Constants.BASE_API_URL + "/user/updatetoken";
System.out.println("MainActivity Backend url: " + backendUrl);
        System.out.println("MainActivity Backend token: " + token);
        System.out.println("MainActivity Backend provider: " + provider);


        OkHttpClient client = new OkHttpClient();
        MediaType JSON = MediaType.parse("application/json; charset=utf-8");

        JSONObject json = new JSONObject();
        try {
            json.put("notification_Token", token);
            json.put("provider", provider);
        } catch (JSONException e) {
            System.out.println("MainActivity JSON error: " + e.getMessage());
            return;
        }

        RequestBody body = RequestBody.create(json.toString(), JSON);
        String deviceId = getStoredDeviceId();
        Request.Builder builder = new Request.Builder()
                .url(backendUrl)
                .addHeader("Auth", authToken) // ✅ Correct
                .post(body);

        if (deviceId != null && !deviceId.isEmpty()) {
            builder.addHeader("X-Device-Id", deviceId);
        }

        Request request = builder.build();

        client.newCall(request).enqueue(new Callback() {
            @Override public void onFailure(Call call, IOException e) {
               System.out.println("MainActivityBackend token send failed: " + e.getMessage());
            }

            @Override public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                   System.out.println("MainActivity✅ Device token sent to backend.");
                   storeDeviceToken(token);
                } else {
                    if (response.code() == 401) {
                        String newToken = TokenRefresher.refresh(getApplicationContext());
                        if (newToken != null) {
                            sendTokenToBackend(token, provider, newToken);
                            return;
                        }
                    }
                   System.out.println("MainActivity⚠️ Backend error: " + response.code());
                }
            }
        });
    }

    private String getStoredAuthToken() {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        return prefs.getString(AUTH_TOKEN_KEY, null);
    }

    private String getStoredDeviceId() {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        return prefs.getString(DEVICE_ID_KEY, null);
    }

    private String getStoredDeviceToken() {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        return prefs.getString(DEVICE_TOKEN_KEY, null);
    }

    private void storeDeviceToken(String token) {
        System.out.println("MainActivity Storing device token: " + token);
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        prefs.edit().putString(DEVICE_TOKEN_KEY, token).apply();
    }
    private void checkAndRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED) {

                System.out.println("🔔 Notification permission not granted — requesting...");
                ActivityCompat.requestPermissions(
                        this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        NOTIFICATION_PERMISSION_REQUEST_CODE
                );
            } else {
                System.out.println("✅ Notification permission already granted.");
            }
        } else {
            System.out.println("✅ No need to request notification permission on this Android version.");
        }
    }
    private void sendPermissionResultToJs(boolean granted) {
        String js = "window.dispatchEvent(new CustomEvent('NativeCallPermissionResult', { detail: { granted: "
                + (granted ? "true" : "false") + " } }));";

        if (bridge != null && bridge.getWebView() != null) {
            runOnUiThread(() -> bridge.getWebView().evaluateJavascript(js, null));
        }
    }

    private static final int CALL_PERMISSION_REQUEST_CODE = 2001;

    @JavascriptInterface
    public void requestCallPermissions() {
        runOnUiThread(() -> {
            String[] perms = new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO
            };

            List<String> toRequest = new ArrayList<>();
            for (String p : perms) {
                if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                    toRequest.add(p);
                }
            }

            if (toRequest.isEmpty()) {
                // Already granted → notify JS
                sendPermissionResultToJs(true);
            } else {
                ActivityCompat.requestPermissions(
                        this,
                        toRequest.toArray(new String[0]),
                        CALL_PERMISSION_REQUEST_CODE
                );
            }
        });
    }
    @Override
protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    if ("stopFloating".equals(intent.getStringExtra("action"))) {
        stopService(new Intent(this, FloatingCallService.class));
    }
}



    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                System.out.println("🎉 Notification permission granted by user.");
            } else {
                System.out.println("🚫 Notification permission denied by user.");
            }
        }
        if (requestCode == CALL_PERMISSION_REQUEST_CODE) {
            boolean granted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    granted = false;
                    break;
                }
            }
            sendPermissionResultToJs(granted);
        }
        
    if (requestCode == 1003) {
        boolean micGranted = false;

        for (int i = 0; i < permissions.length; i++) {
            if (permissions[i].equals(android.Manifest.permission.RECORD_AUDIO)
                && grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                micGranted = true;
            }
        }

        if (micGranted) {
            System.out.println("🎤 MIC PERMISSION GRANTED (Android runtime)");
        } else {
            System.out.println("❌ MIC DENIED AT OS LEVEL");
        }
    }
    }
}

