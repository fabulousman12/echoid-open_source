package com.swipe.auth;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONObject;

import java.io.IOException;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import com.swipe.Constants;

public class TokenRefresher {
    private static final String PREF_NAME = "CapacitorStorage";
    private static final String AUTH_TOKEN_KEY = "token";
    private static final String REFRESH_TOKEN_KEY = "refreshToken";
    private static final String DEVICE_ID_KEY = "deviceId";

    public static String refresh(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            String refreshToken = prefs.getString(REFRESH_TOKEN_KEY, null);
            String deviceId = prefs.getString(DEVICE_ID_KEY, null);
            if (refreshToken == null || deviceId == null) return null;

            JSONObject json = new JSONObject();
            json.put("refreshToken", refreshToken);
            json.put("deviceId", deviceId);

            RequestBody body = RequestBody.create(
                json.toString(),
                MediaType.parse("application/json; charset=utf-8")
            );

            Request request = new Request.Builder()
                .url(Constants.BASE_API_URL + "/user/refresh")
                .post(body)
                .build();

            OkHttpClient client = new OkHttpClient();
            Response response = client.newCall(request).execute();

            if (!response.isSuccessful()) {
                return null;
            }

            String respBody = response.body() != null ? response.body().string() : null;
            if (respBody == null) return null;

            JSONObject resJson = new JSONObject(respBody);
            String newToken = resJson.optString("authtoken", null);
            String newRefresh = resJson.optString("refreshToken", null);
            if (newToken == null || newToken.isEmpty()) return null;

            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(AUTH_TOKEN_KEY, newToken);
            if (newRefresh != null && !newRefresh.isEmpty()) {
                editor.putString(REFRESH_TOKEN_KEY, newRefresh);
            }
            editor.apply();

            return newToken;
        } catch (Exception e) {
            Log.e("TokenRefresher", "Refresh failed", e);
            return null;
        }
    }
}
