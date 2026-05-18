package com.swipe;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONObject;

public class CallAcceptReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {

        String dataJson = intent.getStringExtra("data");
Log.d("openapp","opeening");
        // Save for JS
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        prefs.edit().putString("incoming_call_data", dataJson).apply();

        try {
            JSONObject incoming = new JSONObject(dataJson);
            String callerId = incoming.optString("callerId", incoming.optString("id", null));
            long ts = incoming.optLong("ts", System.currentTimeMillis());
            CallPrefsUtil.appendCallLog(
                    context,
                    callerId,
                    "incoming",
                    "accepted",
                    true,
                    ts
            );
        } catch (Exception e) {
            Log.e("CallAcceptReceiver", "Failed to log accepted call", e);
        }

        // stop service
        IncomingCallUtils.stopService(context);

        Intent i = new Intent(context, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(i);

    }
}
