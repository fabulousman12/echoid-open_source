package com.swipe;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.swipe.auth.TokenRefresher;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class GroupMessageWorkerService extends Service {

    private static final String FG_CHANNEL_ID = "group_msg_worker_fg";
    private static final String GROUP_NATIVE_KEY = "group_message_native";
    private boolean foregroundStarted = false;

    @Nullable
    @Override
    public IBinder onBind(android.content.Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(android.content.Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String dataString = intent.getStringExtra("data");
        if (dataString == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        try {
            JSONObject data = new JSONObject(dataString);
            startSafeForeground("Processing group message", "Syncing group notification");

            ExecutorService exec = Executors.newSingleThreadExecutor();
            exec.submit(() -> {
                try {
                    handleGroupMessageWorkerLogic(this, data);
                } catch (Throwable t) {
                    Log.e("GroupMsgWorker", "Fatal error", t);
                } finally {
                    stopSafeForeground();
                }
            });
        } catch (Exception e) {
            Log.e("GroupMsgWorker", "Invalid JSON", e);
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    private void startSafeForeground(String title, String message) {
        if (foregroundStarted) return;

        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel c = nm.getNotificationChannel(FG_CHANNEL_ID);
                if (c == null) {
                    c = new NotificationChannel(
                            FG_CHANNEL_ID,
                            "Group Message Worker",
                            NotificationManager.IMPORTANCE_LOW
                    );
                    c.enableLights(false);
                    c.enableVibration(false);
                    c.setSound(null, null);
                    nm.createNotificationChannel(c);
                }
            }

            Notification n = new NotificationCompat.Builder(this, FG_CHANNEL_ID)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setSmallIcon(R.drawable.custom_icon_final_background)
                    .setOngoing(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .build();

            startForeground(778, n);
            foregroundStarted = true;
        } catch (Exception e) {
            Log.e("GroupMsgWorker", "startSafeForeground failed", e);
        }
    }

    private void stopSafeForeground() {
        if (!foregroundStarted) {
            stopSelf();
            return;
        }
        try {
            stopForeground(true);
        } catch (Throwable ignore) {}
        foregroundStarted = false;
        stopSelf();
    }

    private void handleGroupMessageWorkerLogic(Context context, JSONObject data) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);

        final String id = data.optString("id", null);
        if (id == null || id.trim().isEmpty()) {
            Log.w("GroupMsgWorker", "Missing message ID");
            return;
        }
        if (isPushExpired(data)) {
            Log.i("GroupMsgWorker", "Ignoring stale group push for message " + id);
            return;
        }

        String token = prefs.getString("token", null);
        String deviceId = prefs.getString("deviceId", null);

        GroupMessagePayload msg = getGroupMessageForMemberFetch(context, id, token, deviceId, false);
        if (msg == null) {
            Log.w("GroupMsgWorker", "Group message fetch returned null");
            return;
        }
        if (isMessageAlreadyStored(prefs, valueOrEmpty(msg.groupId), valueOrEmpty(msg.id))) {
            Log.i("GroupMsgWorker", "Skipping duplicate cached group message " + valueOrEmpty(msg.id));
            return;
        }

        GroupContext groupContext = resolveGroupContext(context, prefs, msg, token, deviceId);
        String groupId = valueOrEmpty(msg.groupId);
        String senderId = valueOrEmpty(msg.sender);
        String senderName = nonEmpty(groupContext.senderName, nonEmpty(msg.senderName, "Member"));
        String groupName = nonEmpty(groupContext.groupName, nonEmpty(msg.groupName, "Group"));
        String groupAvatar = nonEmpty(groupContext.groupAvatar, msg.groupAvatar);
        String messagePreview = buildMessagePreview(msg);
        String notificationBody = buildNotificationBody(senderName, messagePreview);

        boolean ismute = Boolean.parseBoolean(prefs.getString("ismute", "false"));
        boolean isMutedGroup = false;
        String mutedGroups = prefs.getString("mutedGroups", null);
        if (mutedGroups != null) {
            try {
                JSONArray arr = new JSONArray(mutedGroups);
                for (int i = 0; i < arr.length(); i++) {
                    if (groupId.equals(arr.optString(i))) {
                        isMutedGroup = true;
                        break;
                    }
                }
            } catch (Exception ignored) {}
        }

        String soundPath = "default";
        if (!ismute && !isMutedGroup) {
            String global = prefs.getString("ForAllSoundNotification", null);
            if (global != null && !"null".equals(global) && !global.trim().isEmpty()) {
                try {
                    JSONObject g = new JSONObject(global);
                    soundPath = g.optString("path", "default");
                } catch (Exception ignored) {}
            }
        }

        if (!ismute && !isMutedGroup) {
            NotificationHelper.showNotification(
                    context,
                    groupName,
                    notificationBody,
                    soundPath,
                    getStableGroupNotificationId(groupId),
                    groupAvatar
            );
        }

        persistGroupMessageNative(prefs, msg, senderName, groupName, groupAvatar);
        persistGroupMessageCache(prefs, msg);
        persistGroupSummary(prefs, groupId, groupName, groupAvatar, messagePreview, msg.timestamp);
        persistFetchedMemberCaches(prefs, groupId, senderId, senderName, groupAvatar);
    }

    public static class GroupMessagePayload {
        public String id;
        public String groupId;
        public String sender;
        public String senderName;
        public String messageType;
        public String content;
        public String mediaUrl;
        public String previewUrl;
        public String isReplyTo;
        public String timestamp;
        public String status;
        public String groupName;
        public String groupAvatar;
    }

    private static class GroupContext {
        String groupName = "";
        String groupAvatar = "";
        String senderName = "";
    }

    private GroupMessagePayload getGroupMessageForMemberFetch(Context context, String messageId, String token, String deviceId, boolean retried) {
        try {
            URL url = new URL(Constants.BASE_API_URL + "/api/group-messages/member-fetch/" + messageId);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Auth", token);
            if (deviceId != null && !deviceId.isEmpty()) {
                conn.setRequestProperty("X-Device-Id", deviceId);
            }
            conn.setRequestProperty("Accept", "application/json");

            int code = conn.getResponseCode();
            if (code == 401 && !retried) {
                String newToken = TokenRefresher.refresh(context);
                if (newToken != null) {
                    return getGroupMessageForMemberFetch(context, messageId, newToken, deviceId, true);
                }
            }

            BufferedReader r = new BufferedReader(new InputStreamReader(
                    code == 200 ? conn.getInputStream() : conn.getErrorStream()
            ));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            r.close();

            if (code == 200) {
                JsonObject json = JsonParser.parseString(sb.toString()).getAsJsonObject();
                if (!json.has("message") || !json.get("message").isJsonObject()) return null;
                return new Gson().fromJson(json.getAsJsonObject("message"), GroupMessagePayload.class);
            }

            return null;
        } catch (Exception e) {
            Log.e("GroupMsgWorker", "getGroupMessageForMemberFetch failed", e);
            return null;
        }
    }

    private GroupContext resolveGroupContext(Context context, SharedPreferences prefs, GroupMessagePayload msg, String token, String deviceId) {
        GroupContext out = new GroupContext();
        out.groupName = valueOrEmpty(msg.groupName);
        out.groupAvatar = valueOrEmpty(msg.groupAvatar);
        out.senderName = valueOrEmpty(msg.senderName);
        String groupId = valueOrEmpty(msg.groupId);
        String senderId = valueOrEmpty(msg.sender);

        try {
            String groupsRaw = prefs.getString("groupsMain", "[]");
            JSONArray groups = new JSONArray(groupsRaw);
            for (int i = 0; i < groups.length(); i++) {
                JSONObject group = groups.optJSONObject(i);
                if (group == null) continue;
                if (!groupId.equals(group.optString("id"))) continue;
                if (out.groupName.isEmpty()) out.groupName = group.optString("name", "");
                if (out.groupAvatar.isEmpty()) out.groupAvatar = group.optString("avatar", "");
                break;
            }
        } catch (Exception ignored) {}

        try {
            String usersRaw = prefs.getString("usersMain", "[]");
            JSONArray users = new JSONArray(usersRaw);
            for (int i = 0; i < users.length(); i++) {
                JSONObject user = users.optJSONObject(i);
                if (user == null) continue;
                if (!senderId.equals(user.optString("id"))) continue;
                if (out.senderName.isEmpty()) out.senderName = user.optString("name", "");
                break;
            }
        } catch (Exception ignored) {}

        try {
            String memberDetailsRaw = prefs.getString("groupMemberDetailsByGroup", "{}");
            JSONObject byGroup = new JSONObject(memberDetailsRaw);
            JSONArray members = byGroup.optJSONArray(groupId);
            if (members != null) {
                for (int i = 0; i < members.length(); i++) {
                    JSONObject member = members.optJSONObject(i);
                    if (member == null) continue;
                    if (!senderId.equals(member.optString("id"))) continue;
                    if (out.senderName.isEmpty()) out.senderName = member.optString("name", "");
                    break;
                }
            }
        } catch (Exception ignored) {}

        if (!out.groupName.isEmpty() && !out.senderName.isEmpty()) {
            return out;
        }

        try {
            JSONObject fetched = fetchGroupDetails(context, groupId, token, deviceId, false);
            if (fetched == null) return out;

            if (out.groupName.isEmpty()) out.groupName = fetched.optString("name", "");
            if (out.groupAvatar.isEmpty()) out.groupAvatar = fetched.optString("avatar", "");

            JSONArray members = fetched.optJSONArray("members");
            if (members != null) {
                for (int i = 0; i < members.length(); i++) {
                    JSONObject member = members.optJSONObject(i);
                    if (member == null) continue;
                    JSONObject user = member.optJSONObject("userId");
                    if (user == null) continue;
                    if (!senderId.equals(user.optString("_id"))) continue;
                    if (out.senderName.isEmpty()) out.senderName = user.optString("name", "");
                    break;
                }
                persistFetchedGroupDetails(prefs, groupId, fetched, members);
            }
        } catch (Exception e) {
            Log.w("GroupMsgWorker", "Failed to fetch group details", e);
        }

        return out;
    }

    private JSONObject fetchGroupDetails(Context context, String groupId, String token, String deviceId, boolean retried) {
        try {
            URL url = new URL(Constants.BASE_API_URL + "/api/groups/" + groupId);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Auth", token);
            if (deviceId != null && !deviceId.isEmpty()) {
                conn.setRequestProperty("X-Device-Id", deviceId);
            }
            conn.setRequestProperty("Accept", "application/json");

            int code = conn.getResponseCode();
            if (code == 401 && !retried) {
                String newToken = TokenRefresher.refresh(context);
                if (newToken != null) {
                    return fetchGroupDetails(context, groupId, newToken, deviceId, true);
                }
            }

            BufferedReader r = new BufferedReader(new InputStreamReader(
                    code == 200 ? conn.getInputStream() : conn.getErrorStream()
            ));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            r.close();

            if (code == 200) {
                JSONObject json = new JSONObject(sb.toString());
                return json.optJSONObject("group");
            }
        } catch (Exception e) {
            Log.e("GroupMsgWorker", "fetchGroupDetails failed", e);
        }
        return null;
    }

    private boolean isPushExpired(JSONObject data) {
        try {
            long ttlMs = data.optLong("ttlMs", 30000L);
            if (ttlMs <= 0) ttlMs = 30000L;
            String sentAtRaw = data.optString("sentAt", "");
            if (sentAtRaw == null || sentAtRaw.trim().isEmpty()) return false;
            long sentAtMs = Instant.parse(sentAtRaw).toEpochMilli();
            return System.currentTimeMillis() - sentAtMs > ttlMs;
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isMessageAlreadyStored(SharedPreferences prefs, String groupId, String messageId) {
        if (messageId == null || messageId.trim().isEmpty()) return false;
        try {
            JSONArray nativeRows = new JSONArray(nonEmpty(prefs.getString(GROUP_NATIVE_KEY, "[]"), "[]"));
            for (int i = 0; i < nativeRows.length(); i++) {
                JSONObject row = nativeRows.optJSONObject(i);
                if (row == null) continue;
                if (messageId.equals(row.optString("id"))) return true;
            }
        } catch (Exception ignored) {}

        try {
            JSONObject byGroup = new JSONObject(nonEmpty(prefs.getString("groupMessagesByGroup", "{}"), "{}"));
            JSONArray groupRows = byGroup.optJSONArray(groupId);
            if (groupRows == null) return false;
            for (int i = 0; i < groupRows.length(); i++) {
                JSONObject row = groupRows.optJSONObject(i);
                if (row == null) continue;
                if (messageId.equals(row.optString("id"))) return true;
            }
        } catch (Exception ignored) {}

        return false;
    }

    private void persistGroupMessageNative(SharedPreferences prefs, GroupMessagePayload msg, String senderName, String groupName, String groupAvatar) {
        try {
            JSONArray arr = new JSONArray(nonEmpty(prefs.getString(GROUP_NATIVE_KEY, "[]"), "[]"));
            JSONObject row = toMessageJson(msg, senderName, groupName, groupAvatar);
            boolean replaced = false;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject current = arr.optJSONObject(i);
                if (current == null) continue;
                if (!valueOrEmpty(msg.id).equals(current.optString("id"))) continue;
                arr.put(i, row);
                replaced = true;
                break;
            }
            if (!replaced) arr.put(row);
            prefs.edit().putString(GROUP_NATIVE_KEY, arr.toString()).apply();
        } catch (Exception e) {
            Log.e("GroupMsgWorker", "Failed to save group_message_native", e);
        }
    }

    private void persistGroupMessageCache(SharedPreferences prefs, GroupMessagePayload msg) {
        try {
            String raw = prefs.getString("groupMessagesByGroup", "{}");
            JSONObject map = new JSONObject(nonEmpty(raw, "{}"));
            String groupId = valueOrEmpty(msg.groupId);
            JSONArray rows = map.optJSONArray(groupId);
            if (rows == null) rows = new JSONArray();

            JSONObject row = new JSONObject();
            row.put("id", valueOrEmpty(msg.id));
            row.put("clientMessageId", "");
            row.put("groupId", groupId);
            row.put("sender", valueOrEmpty(msg.sender));
            row.put("messageType", nonEmpty(msg.messageType, "text"));
            row.put("content", valueOrEmpty(msg.content));
            row.put("mediaUrl", valueOrEmpty(msg.mediaUrl));
            row.put("previewUrl", valueOrEmpty(msg.previewUrl));
            row.put("isReplyTo", msg.isReplyTo != null ? msg.isReplyTo : JSONObject.NULL);
            row.put("timestamp", nonEmpty(msg.timestamp, ""));
            row.put("status", nonEmpty(msg.status, "sent"));
            row.put("readBy", new JSONArray());

            boolean exists = false;
            for (int i = 0; i < rows.length(); i++) {
                JSONObject current = rows.optJSONObject(i);
                if (current == null) continue;
                if (!valueOrEmpty(msg.id).equals(current.optString("id"))) continue;
                rows.put(i, row);
                exists = true;
                break;
            }
            if (!exists) rows.put(row);

            map.put(groupId, rows);
            prefs.edit().putString("groupMessagesByGroup", map.toString()).apply();
        } catch (Exception e) {
            Log.e("GroupMsgWorker", "Failed to update groupMessagesByGroup", e);
        }
    }

    private void persistGroupSummary(SharedPreferences prefs, String groupId, String groupName, String groupAvatar, String messagePreview, String timestamp) {
        try {
            JSONArray groups = new JSONArray(nonEmpty(prefs.getString("groupsMain", "[]"), "[]"));
            JSONObject summary = null;
            int index = -1;

            for (int i = 0; i < groups.length(); i++) {
                JSONObject group = groups.optJSONObject(i);
                if (group == null) continue;
                if (!groupId.equals(group.optString("id"))) continue;
                summary = group;
                index = i;
                break;
            }

            if (summary == null) {
                summary = new JSONObject();
                summary.put("id", groupId);
                summary.put("description", "");
                summary.put("owner", "");
                summary.put("memberCount", 0);
                summary.put("isActive", true);
            }

            summary.put("name", groupName);
            summary.put("avatar", groupAvatar != null ? groupAvatar : "");
            summary.put("latestMessage", messagePreview);
            summary.put("latestMessageTimestamp", timestamp != null ? timestamp : "");
            summary.put("updatedAt", timestamp != null ? timestamp : "");
            summary.put("unreadCount", summary.optInt("unreadCount", 0) + 1);

            if (index >= 0) groups.put(index, summary);
            else groups.put(summary);

            prefs.edit().putString("groupsMain", groups.toString()).apply();
        } catch (Exception e) {
            Log.e("GroupMsgWorker", "Failed to update groupsMain", e);
        }
    }

    private void persistFetchedMemberCaches(SharedPreferences prefs, String groupId, String senderId, String senderName, String groupAvatar) {
        if (senderId.isEmpty() || senderName.isEmpty()) return;
        try {
            JSONObject byId = new JSONObject(nonEmpty(prefs.getString("groupMembersById", "{}"), "{}"));
            JSONObject profile = byId.optJSONObject(senderId);
            if (profile == null) profile = new JSONObject();
            profile.put("name", senderName);
            if (!groupAvatar.isEmpty() && !profile.has("avatar")) {
                profile.put("avatar", groupAvatar);
            }
            byId.put(senderId, profile);
            prefs.edit().putString("groupMembersById", byId.toString()).apply();
        } catch (Exception e) {
            Log.e("GroupMsgWorker", "Failed to update groupMembersById", e);
        }
    }

    private void persistFetchedGroupDetails(SharedPreferences prefs, String groupId, JSONObject group, JSONArray members) {
        try {
            JSONArray groups = new JSONArray(nonEmpty(prefs.getString("groupsMain", "[]"), "[]"));
            boolean found = false;
            for (int i = 0; i < groups.length(); i++) {
                JSONObject current = groups.optJSONObject(i);
                if (current == null) continue;
                if (!groupId.equals(current.optString("id"))) continue;
                current.put("name", group.optString("name", current.optString("name", "Group")));
                current.put("avatar", group.optString("avatar", current.optString("avatar", "")));
                groups.put(i, current);
                found = true;
                break;
            }
            if (!found) {
                JSONObject summary = new JSONObject();
                summary.put("id", groupId);
                summary.put("name", group.optString("name", "Group"));
                summary.put("avatar", group.optString("avatar", ""));
                summary.put("description", group.optString("description", ""));
                summary.put("owner", "");
                summary.put("memberCount", members != null ? members.length() : 0);
                summary.put("unreadCount", 0);
                summary.put("latestMessage", "");
                summary.put("latestMessageTimestamp", "");
                summary.put("updatedAt", "");
                summary.put("isActive", true);
                groups.put(summary);
            }
            prefs.edit().putString("groupsMain", groups.toString()).apply();

            JSONObject memberDetailsByGroup = new JSONObject(nonEmpty(prefs.getString("groupMemberDetailsByGroup", "{}"), "{}"));
            JSONObject memberIdsByGroup = new JSONObject(nonEmpty(prefs.getString("groupMembersByGroup", "{}"), "{}"));
            JSONArray memberRows = new JSONArray();
            JSONArray memberIds = new JSONArray();
            JSONObject membersById = new JSONObject(nonEmpty(prefs.getString("groupMembersById", "{}"), "{}"));

            if (members != null) {
                for (int i = 0; i < members.length(); i++) {
                    JSONObject member = members.optJSONObject(i);
                    if (member == null) continue;
                    JSONObject user = member.optJSONObject("userId");
                    if (user == null) continue;

                    JSONObject row = new JSONObject();
                    row.put("id", user.optString("_id", ""));
                    row.put("name", user.optString("name", "Member"));
                    row.put("avatar", "");
                    memberRows.put(row);
                    memberIds.put(user.optString("_id", ""));

                    JSONObject cached = membersById.optJSONObject(user.optString("_id", ""));
                    if (cached == null) cached = new JSONObject();
                    cached.put("name", user.optString("name", "Member"));
                    membersById.put(user.optString("_id", ""), cached);
                }
            }

            memberDetailsByGroup.put(groupId, memberRows);
            memberIdsByGroup.put(groupId, memberIds);
            prefs.edit()
                    .putString("groupMemberDetailsByGroup", memberDetailsByGroup.toString())
                    .putString("groupMembersByGroup", memberIdsByGroup.toString())
                    .putString("groupMembersById", membersById.toString())
                    .apply();
        } catch (Exception e) {
            Log.e("GroupMsgWorker", "Failed to persist fetched group details", e);
        }
    }

    private JSONObject toMessageJson(GroupMessagePayload msg, String senderName, String groupName, String groupAvatar) throws Exception {
        JSONObject row = new JSONObject();
        row.put("id", valueOrEmpty(msg.id));
        row.put("groupId", valueOrEmpty(msg.groupId));
        row.put("sender", valueOrEmpty(msg.sender));
        row.put("senderName", senderName);
        row.put("groupName", groupName);
        row.put("groupAvatar", groupAvatar != null ? groupAvatar : "");
        row.put("messageType", nonEmpty(msg.messageType, "text"));
        row.put("content", valueOrEmpty(msg.content));
        row.put("mediaUrl", valueOrEmpty(msg.mediaUrl));
        row.put("previewUrl", valueOrEmpty(msg.previewUrl));
        row.put("isReplyTo", msg.isReplyTo != null ? msg.isReplyTo : JSONObject.NULL);
        row.put("timestamp", nonEmpty(msg.timestamp, ""));
        row.put("status", nonEmpty(msg.status, "sent"));
        return row;
    }

    private int getStableGroupNotificationId(String groupId) {
        String text = valueOrEmpty(groupId);
        int hash = 0;
        for (int i = 0; i < text.length(); i += 1) {
            hash = ((hash << 5) - hash + text.charAt(i));
        }
        return 200000 + (Math.abs(hash) % 700000);
    }

    private String buildMessagePreview(GroupMessagePayload msg) {
        String type = nonEmpty(msg.messageType, "text").toLowerCase();
        if ("text".equals(type)) {
            String text = valueOrEmpty(msg.content).trim();
            if (text.isEmpty()) return "New group message";
            return text.length() > 140 ? text.substring(0, 137) + "..." : text;
        }
        if (type.contains("image")) return "Image";
        if (type.contains("video")) return "Video";
        return "Media";
    }

    private String buildNotificationBody(String senderName, String preview) {
        String safeSender = nonEmpty(senderName, "Member");
        String safePreview = nonEmpty(preview, "New group message").trim();
        String joined = safeSender + ": " + safePreview;
        return joined.length() > 120 ? joined.substring(0, 117) + "..." : joined;
    }

    private String nonEmpty(String first, String fallback) {
        return first != null && !first.trim().isEmpty() ? first : fallback;
    }

    private String valueOrEmpty(String value) {
        return value != null ? value : "";
    }
}
