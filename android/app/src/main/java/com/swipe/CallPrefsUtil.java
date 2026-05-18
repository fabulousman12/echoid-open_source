package com.swipe;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public final class CallPrefsUtil {

    private static final String PREF_NAME = "CapacitorStorage";
    private static final String KEY_CALL_DATA  = "incoming_call_data";
    private static final String KEY_CALL_OFFER = "incoming_call_offer";
    private static final String KEY_CALLS = "calls";

    // Prevent instantiation
    private CallPrefsUtil() {}

    // --------------------------------------------------
    // Clear all incoming call-related prefs
    // --------------------------------------------------
    public static void clearIncomingCall(Context context) {
        try {
            SharedPreferences prefs =
                    context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

            prefs.edit()
                    .remove(KEY_CALL_DATA)
                    .remove(KEY_CALL_OFFER)
                    .apply();

            Log.d("CallPrefsUtil", "Incoming call prefs cleared");
        } catch (Exception e) {
            Log.e("CallPrefsUtil", "Failed to clear incoming call prefs", e);
        }
    }

    // --------------------------------------------------
    // Store offer safely (replaces existing)
    // --------------------------------------------------
    public static void storeOffer(Context context, String offerJson) {
        if (offerJson == null) return;

        SharedPreferences prefs =
                context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

        prefs.edit()
                .remove(KEY_CALL_OFFER)
                .putString(KEY_CALL_OFFER, offerJson)
                .apply();
    }

    // --------------------------------------------------
    // Get offer (nullable)
    // --------------------------------------------------
    public static String getOffer(Context context) {
        SharedPreferences prefs =
                context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

        return prefs.getString(KEY_CALL_OFFER, null);
    }

    // --------------------------------------------------
    // Store incoming call metadata
    // --------------------------------------------------
    public static void storeCallData(Context context, String dataJson) {
        if (dataJson == null) return;

        SharedPreferences prefs =
                context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

        prefs.edit()
                .putString(KEY_CALL_DATA, dataJson)
                .apply();
    }

    // --------------------------------------------------
    // Get incoming call metadata
    // --------------------------------------------------
    public static String getCallData(Context context) {
        SharedPreferences prefs =
                context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

        return prefs.getString(KEY_CALL_DATA, null);
    }

    // --------------------------------------------------
    // Append call log with timestamp de-dupe
    // --------------------------------------------------
    public static void appendCallLog(
            Context context,
            String userId,
            String status,
            String callStatus,
            boolean read,
            long tsMillis
    ) {
        try {
            SharedPreferences prefs =
                    context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

            String existing = prefs.getString(KEY_CALLS, null);
            JSONArray calls = existing != null && !existing.isEmpty()
                    ? new JSONArray(existing)
                    : new JSONArray();

            String timestamp = formatIso(tsMillis);

            for (int i = 0; i < calls.length(); i++) {
                JSONObject item = calls.optJSONObject(i);
                if (item != null && timestamp.equals(item.optString("timestamp"))) {
                    return; // de-dupe by timestamp only
                }
            }

            JSONObject entry = new JSONObject();
            entry.put("id", (userId != null ? userId : "unknown") + "-" + tsMillis);
            entry.put("userid", userId);
            entry.put("status", status);
            entry.put("callstatus", callStatus);
            entry.put("read", read);
            entry.put("timestamp", timestamp);

            JSONArray updated = new JSONArray();
            updated.put(entry);
            for (int i = 0; i < calls.length(); i++) {
                updated.put(calls.get(i));
            }

            prefs.edit().putString(KEY_CALLS, updated.toString()).apply();
        } catch (Exception e) {
            Log.e("CallPrefsUtil", "Failed to append call log", e);
        }
    }

    private static String formatIso(long tsMillis) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date(tsMillis));
    }
}
