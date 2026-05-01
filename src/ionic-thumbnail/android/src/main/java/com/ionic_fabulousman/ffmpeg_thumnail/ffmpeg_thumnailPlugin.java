package com.ionic_fabulousman.ffmpeg_thumnail;

import java.io.ByteArrayOutputStream;
import java.io.File;
import android.util.Base64;
import android.content.Intent;
import java.io.InputStream;
import java.io.OutputStream;
import android.app.Activity;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.content.ContentResolver;

import android.util.Log;

import java.io.FileOutputStream;
import android.media.MediaMetadataRetriever;
import android.os.Environment;
import android.net.Uri;
import android.database.Cursor;
import android.provider.OpenableColumns;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;



import com.startapp.sdk.adsbase.StartAppAd;
import com.startapp.sdk.adsbase.StartAppSDK;
import com.startapp.sdk.adsbase.adlisteners.AdDisplayListener;
import com.startapp.sdk.adsbase.adlisteners.AdEventListener;

@CapacitorPlugin(name = "ffmpeg_thumnail")
public class ffmpeg_thumnailPlugin extends Plugin {

    private ffmpeg_thumnail implementation = new ffmpeg_thumnail();

 private StartAppAd interstitialAd;
    private StartAppAd rewardedAd;
    private boolean isRewardEarned = false;
    @PluginMethod
    public void echo(PluginCall call) {
        String value = call.getString("value");

        JSObject ret = new JSObject();
        ret.put("value", implementation.echo(value));
        call.resolve(ret);
    }
    
  @PluginMethod
public String generateThumbnail(PluginCall call) {
    String videoPath = call.getString("path");
    File outFile = null;

    try {
        // Use MediaMetadataRetriever
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        retriever.setDataSource(videoPath);
        Bitmap bitmap = retriever.getFrameAtTime(1000000); // Frame at 1 second (in microseconds)
        retriever.release();

        if (bitmap == null) {
            Log.e("ThumbnailPlugin", "Failed to extract frame from video.");
            return null;
        }

        // Create temp directory
      File cacheDir = new File(getContext().getCacheDir(), "thumbs");



        if (!cacheDir.exists()) {
            cacheDir.mkdirs();
        }

        // Generate output path
        outFile = new File(cacheDir, "thumb_" + System.currentTimeMillis() + ".jpg");

        // Save bitmap to file
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 100, baos);
        byte[] imageBytes = baos.toByteArray();

        // Save to disk
        java.io.FileOutputStream fos = new java.io.FileOutputStream(outFile);
        fos.write(imageBytes);
        fos.close();

        // Convert to Base64
        String base64String = Base64.encodeToString(imageBytes, Base64.NO_WRAP);
  JSObject result = new JSObject();
        result.put("data", base64String);
        call.resolve(result);
        

    } catch (Exception e) {
        Log.e("ThumbnailPlugin", "Error generating thumbnail: ", e);
        return null;

    } finally {
        // Always delete the temp file if it exists
        if (outFile != null && outFile.exists()) {
            boolean deleted = outFile.delete();
            if (!deleted) {
                Log.w("ThumbnailPlugin", "Could not delete temporary thumbnail file.");
            }else{

                Log.d("Thumnail","succesfully delete the thumnail after use ");
            }
        }
        return null;
    }
}
@PluginMethod
public void getFileInfo(PluginCall call) {
    String uriString = call.getString("uri");
    if (uriString == null) {
        call.reject("Must provide a URI");
        return;
    }

    try {
        Uri uri = Uri.parse(uriString);
        ContentResolver resolver = getContext().getContentResolver();

        String displayName = "unknown";
        long size = -1;

        // Get file info from content resolver
        try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);

                if (nameIndex != -1) {
                    displayName = cursor.getString(nameIndex);
                }
                if (sizeIndex != -1) {
                    size = cursor.getLong(sizeIndex);
                }
            }
        }

        boolean isPersisted = false;

        // Attempt to take persistable URI permission
        try {
            getActivity().getContentResolver().takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            );
            isPersisted = true;
        } catch (SecurityException se) {
            Log.w("getFileInfo", "Could not persist URI permission, will fallback: " + se.getMessage());
        }

        JSObject ret = new JSObject();
        ret.put("name", displayName);
        ret.put("size", size);
        ret.put("uri", uri.toString());
        ret.put("persisted", isPersisted);

        // Fallback: copy the file locally if permission persist fails
        if (!isPersisted) {
            try (InputStream in = resolver.openInputStream(uri)) {
                if (in == null) {
                    call.reject("Failed to open input stream from URI");
                    return;
                }
                File outFile = new File(getContext().getFilesDir(), displayName);
                try (OutputStream out = new FileOutputStream(outFile)) {
                    byte[] buffer = new byte[8192];
                    int len;
                    while ((len = in.read(buffer)) > 0) {
                        out.write(buffer, 0, len);
                    }
                }
                ret.put("localPath", outFile.getAbsolutePath());
            }
        }

        call.resolve(ret);
    } catch (Exception e) {
        call.reject("Error getting file info: " + e.getMessage());
    }
}

    @Override
    public void load() {
        // Initialize the ad objects once
        Activity activity = getActivity();
        if (activity != null) {
            interstitialAd = new StartAppAd(activity);
            rewardedAd = new StartAppAd(activity);
        } else {
            Log.e("StartioHelper", "Activity is null during plugin load");
        }
    }
@PluginMethod
public void initStartio(PluginCall call) {
    String appId = call.getString("appId");

    try {
        StartAppSDK.init(getContext(), appId, true);
        StartAppAd.disableSplash(); // Optional
        interstitialAd = new StartAppAd(getContext());
        rewardedAd = new StartAppAd(getContext());

        call.resolve();
    } catch (Exception e) {
        call.reject("Failed to initialize Start.io: " + e.getMessage());
    }
}
    @PluginMethod
    public void showStartioInterstitial(PluginCall call) {
        if (interstitialAd == null) {
            call.reject("InterstitialAd not initialized.");
            return;
        }

        try {
            interstitialAd.loadAd(StartAppAd.AdMode.AUTOMATIC, new AdEventListener() {
                @Override
                public void onReceiveAd(com.startapp.sdk.adsbase.Ad ad) {
                    if (interstitialAd != null) {
                        interstitialAd.showAd();
                        call.resolve();
                    } else {
                        call.reject("InterstitialAd not ready.");
                    }
                }

                @Override
                public void onFailedToReceiveAd(com.startapp.sdk.adsbase.Ad ad) {
                    call.reject("Failed to load interstitial ad.");
                }
            });
        } catch (Exception e) {
            call.reject("Error showing interstitial: " + e.getMessage());
        }
    }

    @PluginMethod
    public void showStartioRewarded(PluginCall call) {
    if (rewardedAd == null) {
        rewardedAd = new StartAppAd(getActivity());
    }

        try {
            long[] adStartTime = new long[1]; // to capture start time inside inner class

            rewardedAd.setVideoListener(() -> isRewardEarned = true);

            rewardedAd.loadAd(StartAppAd.AdMode.REWARDED_VIDEO, new AdEventListener() {
                @Override
                public void onReceiveAd(com.startapp.sdk.adsbase.Ad ad) {
                    rewardedAd.showAd(new AdDisplayListener() {
                        @Override
                        public void adDisplayed(com.startapp.sdk.adsbase.Ad ad) {
                            adStartTime[0] = System.currentTimeMillis();
                        }

                        @Override
                        public void adHidden(com.startapp.sdk.adsbase.Ad ad) {
                            long adEndTime = System.currentTimeMillis();
                            long viewedMillis = adEndTime - adStartTime[0];

                            JSObject res = new JSObject();
                            res.put("rewarded", isRewardEarned);
                            res.put("viewedTime", viewedMillis / 1000); // in seconds

                            call.resolve(res);
                            isRewardEarned = false; // reset flag
                        }

                        @Override
                        public void adClicked(com.startapp.sdk.adsbase.Ad ad) {}

                        @Override
                        public void adNotDisplayed(com.startapp.sdk.adsbase.Ad ad) {
                            call.reject("Rewarded ad could not be displayed.");
                        }
                    });
                }

                @Override
                public void onFailedToReceiveAd(com.startapp.sdk.adsbase.Ad ad) {
                    call.reject("Failed to load rewarded ad.");
                }
            });
        } catch (Exception e) {
            call.reject("Error showing rewarded: " + e.getMessage());
        }
    }

}
