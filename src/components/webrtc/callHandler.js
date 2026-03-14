// src/webrtc/callHandler.jsx

/**
 * Maintains shared call state within this module only.
 * Socket is always passed in explicitly so nothing is global.
 */

import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

// Permissions
export async function ensureMediaPermissions() {
  try {
    const isNative = !!window.Capacitor && Capacitor.isNativePlatform;
    if (!isNative) return true; // browser handles permissions itself

    const result = await Camera.requestPermissions({
      permissions: ["camera", "microphone"]
    });

    if (result.camera === "granted" && result.microphone === "granted") {
      console.log("🎉 Capacitor Camera + Mic Granted");
      return true;
    } else {
      console.warn("❌ Camera/Microphone denied");
      return false;
    }

  } catch (err) {
    console.error("🔻 Permission request failed", err);
    return false;
  }
}

function requestNativeCallPermissions() {
  return new Promise((resolve) => {
    if (!(window ).NativeAds) {
      console.warn("NativeAds bridge not available, assuming web env");
      resolve(true);
      return;
    }

    const handler = (e) => {
      window.removeEventListener("NativeCallPermissionResult", handler);
      resolve(!!e.detail?.granted);
    };

    window.addEventListener("NativeCallPermissionResult", handler );

    // Call into Android
    (window ).NativeAds.requestCallPermissions();
  });
}


const CallState = {
  IDLE: 'IDLE',
  OUTGOING: 'OUTGOING',
  INCOMING: 'INCOMING',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
};

export let pc = null;          // optional global export
export let localStream = null;
export let remoteStream = null;

export const globalRefs = {
  localVideo: null,
  remoteVideo: null,
};

let pendingTargetId = null;
let pendingCallerId = null;

let peerConnection = null;
let pendingIceCandidates = [];
let callerIceBuffer = [];
let remoteIceBuffer = [];

window.peerConnection = peerConnection;

export function bindVideoRefs(localEl, remoteEl) {
  if (localEl) {
    globalRefs.localVideo = localEl;
    if (localStream) localEl.srcObject = localStream;
  }

  if (remoteEl) {
    globalRefs.remoteVideo = remoteEl;
    if (remoteStream) remoteEl.srcObject = remoteStream;
  }
}

/* ==========================================================
   🔄 CAMERA SWITCH (Front ↔ Rear) WITHOUT RE-NEGOTIATION
   ==========================================================*/

let usingFrontFacing = true; // default front camera

async function switchCamera(localVideoRef) {
  try {
    if (!localStream) {
      console.warn("❗ No local stream to switch camera");
      return;
    }

    usingFrontFacing = !usingFrontFacing; // toggle state

    console.log("🔁 Switching camera →", usingFrontFacing ? "Front" : "Back");

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: usingFrontFacing ? "user" : "environment" },
      audio: false
    });

    const newTrack = newStream.getVideoTracks()[0];
    if (!newTrack) return console.warn("❗ No video track available on new camera");

    const sender = peerConnection
      ?.getSenders()
      .find(s => s.track && s.track.kind === "video");

    await sender?.replaceTrack(newTrack);
    console.log("📡 Stream updated → Remote now sees new camera");

    const oldTrack = localStream.getVideoTracks()[0];
    if (oldTrack) {
      oldTrack.stop();
      localStream.removeTrack(oldTrack);
    }
    localStream.addTrack(newTrack);

    if (localVideoRef?.current) localVideoRef.current.srcObject = localStream;
    if (globalRefs.localVideo) globalRefs.localVideo.srcObject = localStream;

    return usingFrontFacing;

  } catch (err) {
    console.error("❌ Camera Switch Failed:", err);
    return null;
  }
}

function setPeerConnection(newPc) {
  peerConnection = newPc;
  pc = newPc;
}

function getPeerConnection() {
  return peerConnection || window.peerConnection || null;
}

/* ========================================================================== */
function attachIceAutoRestart(socket, localId, targetId) {
  const pcNow = getPeerConnection();
  if (!pcNow) return;

  pcNow.oniceconnectionstatechange = () => {
    console.log("❄ ICE connection state:", pcNow.iceConnectionState);

    if (pcNow.iceConnectionState === "failed") {
      console.warn("💥 ICE failure detected — restarting ICE");
      restartIce(socket, localId, targetId);
    }
  };
}

async function restartIce(socket, localId, targetId) {
  const pcNow = getPeerConnection();
  if (!pcNow) return console.warn("❗ restartIce: No PeerConnection");

  try {
    console.log("🔁 Restarting ICE negotiation...");

    const offer = await pcNow.createOffer({ iceRestart: true });
    await pcNow.setLocalDescription(offer);

    socket.send(JSON.stringify({
      type: "ice-restart-offer",
      senderId: localId,
      targetId,
      offer: pcNow.localDescription,
    }));

    console.log("📨 ICE restart offer SENT → waiting for remote answer");
  } catch (err) {
    console.error("❌ ICE restart creation failed:", err);
  }
}

async function handleIceRestartOffer(socket, { offer, senderId, targetId }) {
  const pcNow = getPeerConnection();
  if (!pcNow) return console.warn("❗ No peerConnection for restart-offer");

  try {
    console.log("📥 ICE RESTART OFFER received from:", senderId);

    await pcNow.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pcNow.createAnswer();
    await pcNow.setLocalDescription(answer);

    socket.send(JSON.stringify({
      type: "ice-restart-answer",
      senderId: targetId,
      targetId: senderId,
      answer: pcNow.localDescription,
    }));

    console.log("📤 ICE restart ANSWER returned");
  } catch (err) {
    console.error("❌ Failed to apply restart offer:", err);
  }
}

async function handleIceRestartAnswer(answer) {
  const pcNow = getPeerConnection();
  if (!pcNow) return console.warn("❗ No peerConnection to apply restart-answer");

  try {
    console.log("📥 ICE RESTART ANSWER received");
    await pcNow.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("⚡ ICE Restart Success — streams should resume");
  } catch (err) {
    console.error("❌ Failed applying ICE restart answer:", err);
  }
}

/* ================== CAMERA / MIC CONTROL ================== */
function toggleCamera(socket, targetId) {
  if (!localStream) return null;

  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return null;

  videoTrack.enabled = !videoTrack.enabled;
  console.log("📷 Local camera:", videoTrack.enabled ? "ON" : "OFF");

  socket.send(JSON.stringify({
    type: "camera-state",
    senderId: targetId,
    targetId,
    enabled: videoTrack.enabled,
  }));

  return videoTrack.enabled;
}

function toggleMic() {
  if (!localStream) {
    console.warn("❗ No localStream");
    return null;
  }

  const audioTrack = localStream.getAudioTracks()[0];
  if (!audioTrack) {
    console.warn("❗ No audio track available");
    return null;
  }

  audioTrack.enabled = !audioTrack.enabled;
  console.log("🎤 Mic is now:", audioTrack.enabled ? "UNMUTED" : "MUTED");
  return audioTrack.enabled;
}

/* -------------------------- UTIL: Cleanup -------------------------- */
function safeCleanup(localVideoRef, remoteVideoRef) {
  try { peerConnection?.close(); } catch {}
  peerConnection = null;
  window.peerConnection = null;
  pendingIceCandidates = [];
  callerIceBuffer = [];
  remoteIceBuffer = [];

  if (localStream) {
    localStream.getTracks().forEach(t => { try { t.stop(); } catch {} });
  }
  localStream = null;
  remoteStream = null;
  window.localAudioTrack = null;
  window.localVideoTrack = null;

  if (localVideoRef?.current) localVideoRef.current.srcObject = null;
  if (remoteVideoRef?.current) remoteVideoRef.current.srcObject = null;

  if (globalRefs.localVideo) globalRefs.localVideo.srcObject = null;
  if (globalRefs.remoteVideo) globalRefs.remoteVideo.srcObject = null;
}

/* -------------------------- CALLER: Start call -------------------------- */

async function onRemoteIce(candidate) {
  const pcNow = getPeerConnection();
  if (!pcNow) return console.warn("❗ No peerConn yet — ICE ignored");

  if (!pcNow.remoteDescription) {
    console.log("🧊 Remote ICE buffered:", candidate.candidate);
    remoteIceBuffer.push(candidate);
    return;
  }

  await pcNow.addIceCandidate(new RTCIceCandidate(candidate));
  console.log("🟢 Remote ICE applied instantly",candidate);
}

const startCall = async (socket, targetId, userId, localVideoRef, remoteVideoRef, callOnly = false) => {
  console.log("\n===============================");
  console.log("📞 CALLER: CALL STARTED");
  console.log("🎥 Video Enabled Initially:", !callOnly);
  console.log("===============================\n");

  const ok = await requestNativeCallPermissions();
if (!ok) {
  console.log("Native mic/cam not granted");
  // show toast / UI error
  return;
}
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  localStream = stream;
  window.localStream = stream;

  console.log("🎤 Local Tracks Started:", stream.getTracks().map(t => t.kind));

  if (localVideoRef.current) {
    localVideoRef.current.srcObject = stream;
    localVideoRef.current.muted = true;
    localVideoRef.current.play().catch(() => {});
  }
  if (globalRefs.localVideo) globalRefs.localVideo.srcObject = stream;

  if (peerConnection) peerConnection.close();

  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
        {
        urls: "stun:stun.relay.metered.ca:80",
      },
         {
  urls: "turn:52.66.175.155:3478",
  username: "turnuser",
  credential: "gj54th5hY&H7"
},
      {
        urls: "turn:standard.relay.metered.ca:80",
        username: "89e65db3fd751ec1579f8285",
        credential: "ttmrHOOJBcsTFYs2",
      },
      {
        urls: "turn:standard.relay.metered.ca:80?transport=tcp",
        username: "89e65db3fd751ec1579f8285",
        credential: "ttmrHOOJBcsTFYs2",
      },
      {
        urls: "turn:standard.relay.metered.ca:443",
        username: "89e65db3fd751ec1579f8285",
        credential: "ttmrHOOJBcsTFYs2",
      },
      {
        urls: "turns:standard.relay.metered.ca:443?transport=tcp",
        username: "89e65db3fd751ec1579f8285",
        credential: "ttmrHOOJBcsTFYs2",
      },
   

    ],
  });

  window.peerConnection = peerConnection;
  setPeerConnection(peerConnection);
  attachIceAutoRestart(socket, userId, targetId);

  if (callOnly) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = false;
      console.log("📷 Camera is now:", videoTrack.enabled ? "ON" : "OFF");
    }
  }

  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.ontrack = (ev) => {
    const inboundStream = ev.streams[0];

    if (remoteVideoRef?.current) {
      remoteVideoRef.current.srcObject = inboundStream;
      remoteVideoRef.current.play().catch(() => {});
    }

    remoteStream = inboundStream;
    if (globalRefs.remoteVideo) {
      globalRefs.remoteVideo.srcObject = inboundStream;
    }

    console.log("🎯 REMOTE STREAM ACTIVE");
  };

  await peerConnection.setLocalDescription(await peerConnection.createOffer());
  socket.send(JSON.stringify({
    type: "call-offer",
    callerId: userId,
    targetId,
    callOnly,
    offer: peerConnection.localDescription,
  }));
  console.log("📨 OFFER SENT → waiting for ANSWER");

  callerIceBuffer = [];
  pendingCallerId = userId;
  pendingTargetId = targetId;

  peerConnection.onicecandidate = (e) => {
    if (!e.candidate) return;
    if (!peerConnection.remoteDescription) {
      callerIceBuffer.push(e.candidate);
    } else {
      socket.send(JSON.stringify({
        type: "ice-candidate",
        senderId: userId,
        targetId,
        candidate: e.candidate,
      }));
    }
  };
};

async function onCallAnswer(socket, answer) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  console.log("\n📥 ANSWER RECEIVED — Activating ICE",answer);

  callerIceBuffer.forEach((c) => {
    socket?.send(JSON.stringify({
      type: "ice-candidate",
      senderId: pendingCallerId,
      targetId: pendingTargetId,
      candidate: c,
    }));
  });

  callerIceBuffer = [];
  if (remoteIceBuffer) {
    for (const c of remoteIceBuffer) {
      await peerConnection.addIceCandidate(c);
    }
  }
  remoteIceBuffer = [];

  console.log("🔥 ICE PATH LIVE — WebRTC should carry media now\n");
}

function confirmRemoteAccepted(socket) {

  if (pendingIceCandidates.length > 0 && pendingTargetId && pendingCallerId) {
    console.log(`📤 Sending ${pendingIceCandidates.length} buffered ICE candidates`);
    pendingIceCandidates.forEach((candidate) => {
      socket?.send(JSON.stringify({
        type: "ice-candidate",
        targetId: pendingTargetId,
        senderId: pendingCallerId,
        candidate,
      }));
    });
    pendingIceCandidates = [];
  }
}

/* -------------------------- CALLER: when declined -------------------------- */
function onCallDeclined(socket, callerid, userid, localVideoRef, remoteVideoRef) {
  endCall(localVideoRef, remoteVideoRef);
  socket?.send(JSON.stringify({
    type: "call-declined",
    targetId: callerid,
    calleeId: userid,
  }));
}

/* -------------------------- CALLEE: Accept / Decline -------------------------- */

const declineIncomingCall = (socket, callerId, userId, localVideoRef, remoteVideoRef) => {
  socket?.send(JSON.stringify({
    type: 'call-declined',
    targetId: callerId,
    calleeId: userId,
  }));

  endCall(localVideoRef, remoteVideoRef);
};

/* ================================================================
 *   CALLEE — ACCEPT CALL + FULL RTC VISIBILITY
 * ================================================================ */
const answerCall = async (socket, callerId, userId, offer, localVideoRef, remoteVideoRef, callOnly = false) => {
  console.log("\n===============================");
  console.log("📞 CALLEE ANSWERING CALL");
  console.log("🎥 Initial Video:", !callOnly);
  console.log("===============================\n");

  const ok = await requestNativeCallPermissions();
if (!ok) {
  console.log("Native mic/cam not granted");
  // show toast / UI error
  return;
}

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  window.localStream = localStream;

  console.log("🎤 Local Tracks:", localStream.getTracks().map(t => t.kind));

  if (peerConnection) peerConnection.close();

  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
        {
        urls: "stun:stun.relay.metered.ca:80",
      },
         {
  urls: "turn:52.66.175.155:3478",
  username: "turnuser",
  credential: "gj54th5hY&H7"
},
      {
        urls: "turn:standard.relay.metered.ca:80",
        username: "89e65db3fd751ec1579f8285",
        credential: "ttmrHOOJBcsTFYs2",
      },
      {
        urls: "turn:standard.relay.metered.ca:80?transport=tcp",
        username: "89e65db3fd751ec1579f8285",
        credential: "ttmrHOOJBcsTFYs2",
      },
      {
        urls: "turn:standard.relay.metered.ca:443",
        username: "89e65db3fd751ec1579f8285",
        credential: "ttmrHOOJBcsTFYs2",
      },
      {
        urls: "turns:standard.relay.metered.ca:443?transport=tcp",
        username: "89e65db3fd751ec1579f8285",
        credential: "ttmrHOOJBcsTFYs2",
      },
    ],
  });
  

  window.peerConnection = peerConnection;
  setPeerConnection(peerConnection);
  attachIceAutoRestart(socket, userId, callerId);

  peerConnection.onconnectionstatechange = () =>
    console.log("🔄 RTC:", peerConnection.connectionState);
  peerConnection.onsignalingstatechange = () =>
    console.log("📡 Signal:", peerConnection.signalingState);

  if (localVideoRef.current) {
    localVideoRef.current.srcObject = localStream;
    localVideoRef.current.muted = true;
    localVideoRef.current.play().catch(() => {});
  }
  if (globalRefs.localVideo) globalRefs.localVideo.srcObject = localStream;

  if (callOnly) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = false;
      console.log("📷 Camera is now:", videoTrack.enabled ? "ON" : "OFF");
    }
  }

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  console.log("📡 Senders:", peerConnection.getSenders().map(s => s.track?.kind));

  peerConnection.ontrack = (ev) => {
    const inboundStream = ev.streams[0];
    console.log("🎯 REMOTE TRACKS:", inboundStream.getTracks().map(t => t.kind));

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = inboundStream;
      remoteVideoRef.current.play().catch(() => {});
    }

    remoteStream = inboundStream;
    if (globalRefs.remoteVideo) globalRefs.remoteVideo.srcObject = inboundStream;
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  console.log("📥 REMOTE OFFER SET");

  await peerConnection.setLocalDescription(await peerConnection.createAnswer());

  socket.send(JSON.stringify({
    type: "call-answer",
    calleeId: userId,
    targetId: callerId,
    answer: peerConnection.localDescription,
  }));

  console.log("📨 ANSWER SENT");

  peerConnection.onicecandidate = (e) => {
    if (!e.candidate) return;
    socket.send(JSON.stringify({
      type: "ice-candidate",
      senderId: userId,
      targetId: callerId,
      candidate: e.candidate,
    }));
    console.log("🧊 ICE OUT:", e.candidate.candidate);
  };
};

/* -------------------------- End Call -------------------------- */
const endCall = (localVideoRef, remoteVideoRef) => {
  console.log("📴 Ending call — destroying media & PC");

  try { peerConnection?.close(); } catch {}
  peerConnection = null;
  window.peerConnection = null;

  if (localStream) {
    localStream.getTracks().forEach((t) => {
      try { t.stop(); } catch {}
    });
  }

  localStream = null;
  remoteStream = null;
  window.localAudioTrack = null;
  window.localVideoTrack = null;

  if (localVideoRef?.current) localVideoRef.current.srcObject = null;
  if (remoteVideoRef?.current) remoteVideoRef.current.srcObject = null;

  if (globalRefs.localVideo) globalRefs.localVideo.srcObject = null;
  if (globalRefs.remoteVideo) globalRefs.remoteVideo.srcObject = null;

  console.log("🧹 FULL MEDIA CLEANUP DONE");
};

/* ==========================================================
   AUDIO ONLY MODES (unchanged logic)
   ========================================================== */

const startaudiocall = async (socket, targetId, userId, localVideoRef, remoteVideoRef) => {
  console.log("\n===== 🔊 AUDIO CALL START (video can be enabled later) =====\n");

  await ensureMediaPermissions();

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localStream = stream;
  window.localStream = stream;

  const video = stream.getVideoTracks()[0];
  if (video) {
    video.enabled = false;
    console.log("📷 Camera initially OFF — but ready for toggle");
  }

  if (localVideoRef.current) localVideoRef.current.srcObject = null;
  if (peerConnection) peerConnection.close();

  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "turn:global.relay.metered.ca:80", username: "89e65db3fd751ec1579f8285", credential: "ttmrHOOJBcsTFYs2" },
      { urls: "turn:global.relay.metered.ca:443", username: "89e65db3fd751ec1579f8285", credential: "ttmrHOOJBcsTFYs2" },
    ],
  });
  window.peerConnection = peerConnection;
  setPeerConnection(peerConnection);

  stream.getTracks().forEach(t => peerConnection.addTrack(t, stream));

  peerConnection.ontrack = (ev) => {
    const inboundStream = ev.streams[0];
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = inboundStream;
      remoteVideoRef.current.play();
    }
    remoteStream = inboundStream;
    if (globalRefs.remoteVideo) globalRefs.remoteVideo.srcObject = inboundStream;
  };

  await peerConnection.setLocalDescription(await peerConnection.createOffer());

  socket.send(JSON.stringify({
    type: "call-offer",
    callerId: userId,
    targetId,
    callOnly: true,
    offer: peerConnection.localDescription,
  }));

  console.log("📨 AUDIO CALL OFFER SENT");
};

const answeraudiocall = async (socket, callerId, userId, offer, localVideoRef, remoteVideoRef) => {
  console.log("\n===== 🔊 AUDIO CALL ANSWER (video toggle-ready) =====\n");

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localStream = stream;
  window.localStream = stream;

  const video = stream.getVideoTracks()[0];
  if (video) {
    video.enabled = false;
    console.log("📷 Video OFF at start — can toggle ON later");
  }

  if (localVideoRef.current) localVideoRef.current.srcObject = null;

  if (peerConnection) peerConnection.close();
  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "turn:global.relay.metered.ca:80", username: "89e65db3fd751ec1579f8285", credential: "ttmrHOOJBcsTFYs2" },
      { urls: "turn:global.relay.metered.ca:443", username: "89e65db3fd751ec1579f8285", credential: "ttmrHOOJBcsTFYs2" },
    ],
  });
  window.peerConnection = peerConnection;
  setPeerConnection(peerConnection);

  stream.getTracks().forEach(t => peerConnection.addTrack(t, stream));

  peerConnection.ontrack = (ev) => {
    const inboundStream = ev.streams[0];
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = inboundStream;
      remoteVideoRef.current.play();
    }
    remoteStream = inboundStream;
    if (globalRefs.remoteVideo) globalRefs.remoteVideo.srcObject = inboundStream;
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  await peerConnection.setLocalDescription(await peerConnection.createAnswer());

  socket.send(JSON.stringify({
    type: "call-answer",
    targetId: callerId,
    calleeId: userId,
    callOnly: true,
    answer: peerConnection.localDescription,
  }));

  peerConnection.onicecandidate = (e) => {
    if (!e.candidate) return;
    socket.send(JSON.stringify({
      type: "ice-candidate",
      senderId: userId,
      targetId: callerId,
      candidate: e.candidate,
    }));
  };

  console.log("📨 AUDIO CALL ANSWER SENT");
};

async function toggleCameraAudioModeUpgrade() {
  if (!localStream) {
    console.warn("❗ No localStream");
    return null;
  }

  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) {
    console.warn("❗ No video track available");
    return null;
  }

  videoTrack.enabled = !videoTrack.enabled;
  console.log("📷 Camera is now:", videoTrack.enabled ? "ON" : "OFF");
  return videoTrack.enabled;
}

function toggleMicAudioMode() {
  if (!localStream) {
    console.warn("❗ No localStream");
    return null;
  }

  const audioTrack = localStream.getAudioTracks()[0];
  if (!audioTrack) {
    console.warn("❗ No audio track available");
    return null;
  }

  audioTrack.enabled = !audioTrack.enabled;
  console.log("🎤 Mic is now:", audioTrack.enabled ? "UNMUTED" : "MUTED");
  return audioTrack.enabled;
}

/* -------------------------- Exports -------------------------- */
export {
  CallState,
  startCall,
  answerCall,
  endCall,
  onCallDeclined,
  safeCleanup,
  declineIncomingCall,
  confirmRemoteAccepted,
  setPeerConnection,
  getPeerConnection,
  onCallAnswer,
  onRemoteIce,
  toggleCamera,
  toggleMic,
  startaudiocall,
  answeraudiocall,
  toggleCameraAudioModeUpgrade,
  toggleMicAudioMode,
  switchCamera,
  handleIceRestartOffer,
  handleIceRestartAnswer,
};
