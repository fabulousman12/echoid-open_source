import { authFetch } from "./apiClient";
import Maindata from "../data";
import { getDeviceInfo } from "./deviceInfo";

const defaultHost = `https://${Maindata.SERVER_URL}`;

const tryPostCommentRoutes = async (host, postId, options = {}, suffix = "") => {
  const normalizedPostId = encodeURIComponent(postId);
  const method = String(options?.method || "GET").toUpperCase();
  const routes = [
    ...(method === "POST"
      ? [`${host}/post/${normalizedPostId}/comment${suffix}`]
      : [`${host}/post/${normalizedPostId}/comments${suffix}`]),
    ...(method === "POST"
      ? [`${host}/post/${normalizedPostId}/comments${suffix}`]
      : [`${host}/post/${normalizedPostId}/comment${suffix}`]),
    `${host}/post/comment/${normalizedPostId}${suffix}`,
    `${host}/post/comments/${normalizedPostId}${suffix}`,
  ];

  let lastResponse = null;
  for (const route of routes) {
    const response = await authFetch(route, options, host);
    lastResponse = response;
    if (response.status !== 404) {
      return response;
    }
  }

  return lastResponse;
};

export const api = {
  getUser: (host) =>
    authFetch(`${host}/user/getuser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, host),

  editUser: (host, body, headers = {}) =>
    authFetch(`${host}/user/edituser`, {
      method: "PUT",
      headers,
      body
    }, host),

  allUsers: (host, timestamps) =>
    authFetch(`${host}/user/alluser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamps })
    }, host),


  fetchUser: (host, userId) =>
    authFetch(`${host}/user/fetchuser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userid: userId })
    }, host),

  blocked: (host) =>
    authFetch(`${host}/user/blocked`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  updateKey: async (host, publicKey, privateKeyHash, privateKeyFingerprint) => {
    const deviceInfo = await getDeviceInfo();
    return authFetch(`${host}/user/updateKey`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey, privateKeyHash, privateKeyFingerprint, ...deviceInfo })
    }, host);
  },

  createTemporaryUser: (host, payload = {}) =>
    fetch(`${host}/user/temp/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),

  temporaryMe: (host) =>
    authFetch(`${host}/user/temp/me`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  anonymousMe: (host) =>
    authFetch(`${host}/user/anonymous/me`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  anonymousLogin: (host) =>
    authFetch(`${host}/user/anonymous/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, host),

  getAnonymousUser: (host, clientId) =>
    authFetch(`${host}/user/anonymous/getuser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId })
    }, host),

  anonymousUserByUsername: (host, username) =>
    authFetch(`${host}/user/anonymous/username/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    }, host),

  anonymousUsernameCheck: (host, username) =>
    authFetch(`${host}/user/anonymous/username/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    }, host),

  createAnonymousUser: (host, payload = {}) =>
    authFetch(`${host}/user/anonymous/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  editAnonymousUser: (host, payload = {}) =>
    authFetch(`${host}/user/anonymous/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  deleteAnonymousUser: (host) =>
    authFetch(`${host}/user/anonymous/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    }, host),

  temporaryLogout: (host) =>
    authFetch(`${host}/user/temp/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, host),

  temporaryChats: (host) =>
    authFetch(`${host}/user/temp/chats`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  createTemporaryChat: (host, payload = {}) =>
    authFetch(`${host}/user/temp/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  joinTemporaryChatByPayload: (host, payload = {}) =>
    authFetch(`${host}/user/temp/chats/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  joinTemporaryChat: (host, uid) =>
    authFetch(`${host}/user/temp/chats/${encodeURIComponent(uid)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, host),

  getTemporaryRoomMembers: (host, uid) =>
    authFetch(`${host}/user/temp/chats/${encodeURIComponent(uid)}/members`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  getTemporaryRoomRequests: (host, uid) =>
    authFetch(`${host}/user/temp/chats/${encodeURIComponent(uid)}/requests`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  respondTemporaryRoomRequest: (host, uid, payload = {}) =>
    authFetch(`${host}/user/temp/chats/${encodeURIComponent(uid)}/requests/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  removeTemporaryRoomMember: (host, uid, targetUserId) =>
    authFetch(`${host}/user/temp/chats/${encodeURIComponent(uid)}/members/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId })
    }, host),

  exitTemporaryChat: (host, uid) =>
    authFetch(`${host}/user/temp/chats/${encodeURIComponent(uid)}/exit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, host),

  deleteTemporaryChat: (host, uid) =>
    authFetch(`${host}/user/temp/chats/${encodeURIComponent(uid)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    }, host),

  existsUser: (host, phoneNumber) =>
    authFetch(`${host}/user/existsuser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber })
    }, host),

  userGroups: async (host) => {
    const primary = await authFetch(`${host}/api/groups/user-groups`, {
      method: "GET"
    }, host);
    if (primary?.ok || (primary && primary.status !== 404)) return primary;

    return authFetch(`${host}/groups/user-groups`, {
      method: "GET"
    }, host);
  },

  syncUserGroups: (host, groups = []) =>
    authFetch(`${host}/api/groups/user-groups/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups })
    }, host),

  createGroup: (host, payload = {}) =>
    authFetch(`${host}/api/groups/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  groupInvites: (host) =>
    authFetch(`${host}/api/groups/invites/me`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  groupInvitesByGroup: (host, groupId) =>
    authFetch(`${host}/api/groups/${encodeURIComponent(groupId)}/invites`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  respondGroupInvite: (host, inviteId, action) =>
    authFetch(`${host}/api/groups/invites/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId, action })
    }, host),

  groupDetails: (host, groupId) =>
    authFetch(`${host}/api/groups/${encodeURIComponent(groupId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  updateGroupSettings: (host, payload = {}) =>
    authFetch(`${host}/api/groups/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  updateGroupAvatar: (host, payload = {}) =>
    authFetch(`${host}/api/groups/avatar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  updateGroupName: (host, payload = {}) =>
    authFetch(`${host}/api/groups/name`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  updateGroupDescription: (host, payload = {}) =>
    authFetch(`${host}/api/groups/description`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  addGroupMember: (host, payload = {}) =>
    authFetch(`${host}/api/groups/add-member`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  removeGroupMember: (host, payload = {}) =>
    authFetch(`${host}/api/groups/remove-member`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  exitGroup: (host, payload = {}) =>
    authFetch(`${host}/api/groups/exit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  transferGroupOwner: (host, payload = {}) =>
    authFetch(`${host}/api/groups/owner/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  changeGroupAdminRole: (host, payload = {}) =>
    authFetch(`${host}/api/groups/admin/change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host),

  groupMessagesInitial: (host, cursorMap = {}, limitPerGroup = 30) =>
    authFetch(`${host}/api/group-messages/initial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursorMap, limitPerGroup })
    }, host),

  groupMessagesSync: (host, cursors = [], limitPerGroup = 30) =>
    authFetch(`${host}/api/group-messages/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursors, limitPerGroup })
    }, host),

  markGroupMessagesRead: (host, messageIds = []) =>
    authFetch(`${host}/api/group-messages/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds })
    }, host),

  getGroupMessageReadState: (host, messageId) =>
    authFetch(`${host}/api/group-messages/read/${encodeURIComponent(messageId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  deleteGroupMessage: (host, messageId) =>
    authFetch(`${host}/api/group-messages/${encodeURIComponent(messageId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    }, host),

  getPendingGroupMessageUpdates: (host) =>
    authFetch(`${host}/api/group-messages/updates/pending`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, host),

  ackPendingGroupMessageUpdates: (host, updateIds = []) =>
    authFetch(`${host}/api/group-messages/updates/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateIds })
    }, host),

  blockUser: (host, targetUserId) =>
    authFetch(`${host}/use/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId })
    }, host),

  unblockUser: (host, targetUserId) =>
    authFetch(`${host}/use/unblock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId })
    }, host),

  adminMessages: (host, params = {}) => {
    const { afterId, beforeId, limit } = params || {};
    const qsParts = [];
    if (afterId) qsParts.push(`afterId=${encodeURIComponent(afterId)}`);
    if (beforeId) qsParts.push(`beforeId=${encodeURIComponent(beforeId)}`);
    if (limit) qsParts.push(`limit=${encodeURIComponent(limit)}`);
    const qs = qsParts.length ? `?${qsParts.join("&")}` : "";
    return authFetch(`${host}/message/messages${qs}`, {
      method: "GET"
    }, host);
  },

  adminSend: (host, content) =>
    authFetch(`${host}/admin/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    }, host),

  logout: (host, refreshToken) =>
    fetch(`${host}/user/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    }),

  logoutAll: (host) =>
    authFetch(`${host}/user/logoutall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, host),

  sessions: (host) =>
    authFetch(`${host}/user/sessions`, {
      method: "GET"
    }, host),

  revokeDevice: (host, deviceId, password) =>
    authFetch(`${host}/user/logout-device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, password })
    }, host),

  statusFeed: (host = defaultHost, cursor) => {
    const qs = cursor ? `?before=${encodeURIComponent(JSON.stringify(cursor))}` : "";
    return authFetch(`${host}/status/feed${qs}`, {
      method: "GET"
    }, host);
  },

  statusIds: (host = defaultHost) =>
    authFetch(`${host}/status/ids`, {
      method: "GET"
    }, host),

  uploadstatusInit: (host = defaultHost, payload) =>
    authFetch(
      `${host}/status/upload/init`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      },
      host
    ),

  uploadstatusCommit: (host = defaultHost, payload) =>
    authFetch(
      `${host}/status/upload/commit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      },
      host
    ),

  uploadstatusAbort: (host = defaultHost, payload) =>
    authFetch(
      `${host}/status/upload/abort`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      },
      host
    ),

  postFeed: (host = defaultHost, params = {}) => {
    const { category, subCategory, filter, page } = params || {};
    const search = new URLSearchParams();
    if (category) search.set("category", category);
    if (subCategory) search.set("subCategory", subCategory);
    if (filter) search.set("filter", filter);
    if (page) search.set("page", String(page));
    const qs = search.toString() ? `?${search.toString()}` : "";
    return authFetch(`${host}/post/feed${qs}`, { method: "GET" }, host);
  },

  postSearch: (host = defaultHost, q, params = {}) => {
    const { page } = params || {};
    const search = new URLSearchParams();
    search.set("q", q || "");
    if (page) search.set("page", String(page));
    return authFetch(`${host}/post/search?${search.toString()}`, { method: "GET" }, host);
  },

  postById: (host = defaultHost, postId) =>
    authFetch(`${host}/post/${encodeURIComponent(postId)}`, { method: "GET" }, host),

  postReactionsBatch: (host = defaultHost, payload = {}) =>
    authFetch(
      `${host}/post/reactions/batch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  postLike: (host = defaultHost, postId, payload = {}) =>
    authFetch(
      `${host}/post/${encodeURIComponent(postId)}/like`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  postDislike: (host = defaultHost, postId, payload = {}) =>
    authFetch(
      `${host}/post/${encodeURIComponent(postId)}/dislike`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  postMyPosts: (host = defaultHost) =>
    authFetch(`${host}/post/my-posts`, { method: "GET" }, host),

  postByClientId: (host = defaultHost, clientId) =>
    authFetch(`${host}/post/user/${encodeURIComponent(clientId)}`, { method: "GET" }, host),

  postWitness: (host = defaultHost, postId, payload = {}) =>
    authFetch(
      `${host}/post/${encodeURIComponent(postId)}/witness`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  postUnwitness: (host = defaultHost, postId, payload = {}) =>
    authFetch(
      `${host}/post/${encodeURIComponent(postId)}/witness`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  postWitnesses: (host = defaultHost, postId) =>
    authFetch(`${host}/post/${encodeURIComponent(postId)}/witnesses`, { method: "GET" }, host),

  postDelete: (host = defaultHost, postId, payload = {}) =>
    authFetch(
      `${host}/post/${encodeURIComponent(postId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  postReport: (host = defaultHost, postId, payload = {}) =>
    authFetch(
      `${host}/post/${encodeURIComponent(postId)}/report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  postComments: (host = defaultHost, postId, params = {}) => {
    const { page } = params || {};
    const search = new URLSearchParams();
    if (page) search.set("page", String(page));
    const qs = search.toString() ? `?${search.toString()}` : "";
    return tryPostCommentRoutes(host, postId, { method: "GET" }, qs);
  },

  postCommentReplies: (host = defaultHost, commentId, params = {}) => {
    const { page } = params || {};
    const search = new URLSearchParams();
    if (page) search.set("page", String(page));
    const qs = search.toString() ? `?${search.toString()}` : "";
    return authFetch(`${host}/post/comment/${encodeURIComponent(commentId)}/replies${qs}`, { method: "GET" }, host);
  },

  createPostComment: (host = defaultHost, postId, payload = {}) =>
    tryPostCommentRoutes(
      host,
      postId,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    ),

  postUploadInit: (host = defaultHost, payload = {}) =>
    authFetch(
      `${host}/post/upload/init`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  postUploadDelete: (host = defaultHost, payload = {}) =>
    authFetch(
      `${host}/post/upload/delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  createPost: (host = defaultHost, payload = {}) =>
    authFetch(
      `${host}/post/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      host
    ),

  groupMediaUploadInit: (host = defaultHost, groupId, payload) =>
    authFetch(
      `${host}/api/groups/${encodeURIComponent(groupId)}/upload/init`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      },
      host
    ),


  myfeed: (host = defaultHost) =>
    authFetch(`${host}/status/me`, {
      method: "GET"
    }, host),

  statusView: (host = defaultHost, statusId) =>
    authFetch(`${host}/status/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId })
    }, host),

  deleteStatus: (host = defaultHost, statusId) =>
    authFetch(`${host}/status/${encodeURIComponent(statusId)}`, {
      method: "DELETE"
    }, host),

  deleteMessage: (host, messageId) =>
    authFetch(`${host}/api/delete/${encodeURIComponent(messageId)}`, {
      method: "DELETE"
    }, host),

  markReadWeb: (host, payload = {}) =>
    authFetch(`${host}/messages/mark-read-web`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, host)


};
