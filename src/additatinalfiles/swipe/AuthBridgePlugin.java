package com.swipe.plugins; // change this to your actual package

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "AuthBridge")
public class AuthBridgePlugin extends Plugin {

    @PluginMethod
    public void getAuthToken(PluginCall call) {
        Context context = getContext();
        SharedPreferences preferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = preferences.getString("token", null);

        JSObject result = new JSObject();
        result.put("value", token);
        call.resolve(result);
    }
}
