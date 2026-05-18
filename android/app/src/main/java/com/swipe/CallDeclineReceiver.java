package com.swipe;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
public class CallDeclineReceiver extends BroadcastReceiver {

    private static final String TAG = "CallDeclineReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {

        String dataJson = intent.getStringExtra("data");

        if (dataJson == null) {
            Log.w(TAG, "Decline triggered but dataJson is null");
            return;
        }

        Log.d(TAG, "Decline received — starting background request");

        new Thread(() -> {
            HttpURLConnection conn = null;

            try {
                JSONObject incoming = new JSONObject(dataJson);
                String callerId = incoming.getString("callerId"); // who started the call
                long ts = incoming.optLong("ts", System.currentTimeMillis());

                JSONObject j = new JSONObject();
                j.put("calleeId", callerId);
                j.put("targetId", callerId);
                j.put("status", "declined");
                j.put("ts", System.currentTimeMillis());

                URL url = new URL(Constants.CALL_DECLINE_ENDPOINT);
                Log.d(TAG, "Sending decline request → " + url);

                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setDoOutput(true);

                // Clear prefs BEFORE sending (idempotent & safe)
                CallPrefsUtil.clearIncomingCall(context);
                Log.d(TAG, "Incoming call prefs cleared");

                CallPrefsUtil.appendCallLog(
                        context,
                        callerId,
                        "incoming",
                        "decline",
                        true,
                        ts
                );

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(j.toString().getBytes());
                    os.flush();
                }

                int code = conn.getResponseCode();
                Log.d(TAG, "Decline request sent, response code = " + code);

            } catch (Exception e) {
                Log.e(TAG, "Decline request failed", e);
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();

        // Stop foreground service immediately
        IncomingCallUtils.stopService(context);
        Log.d(TAG, "IncomingCallService stop requested");
    }
}
