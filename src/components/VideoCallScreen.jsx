import React, { useEffect, useRef, useState } from "react";
import {
  startCall,
  answerCall,
  endCall,
  
  declineIncomingCall,
  
  onCallAnswer,
  
  onRemoteIce,
  toggleCamera,
 toggleMic,
 switchCamera ,
  handleIceRestartOffer,
  handleIceRestartAnswer
} from "../components/webrtc/callHandler";
import { startCallRingtone,stopCallRingtone,startCallTimeout,clearCallTimeout } from '../services/callRingtone';
import { appendCallLog } from "../services/callLog";

import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone, X, Settings, Volume2, Headphones } from 'lucide-react';
import { useCallStore } from "../store/useCallStore";
import { CallRuntime } from "../store/CallRuntime";  // REQUIRED

//import { useNavigate } from "react-router-dom";
import { useLocation, useHistory } from 'react-router-dom';
function VideoCallScreen({ socket, ...callData }) {
  //const { socket, ...callData } = CallRuntime.data
  const history = useHistory();
  const location = useLocation();

  const {
    currentUser,
    targetUser,
    mode,
    offer,
    callerId,
    userId,
    callOnly: initCallOnly,
    userdetail,
    Answer = false,  
  } = callData;

  const [callOnly, setCallOnly] = useState(initCallOnly ?? false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
const [showSwapBtn, setShowSwapBtn] = useState(false);
const [localBig, setLocalBig] = useState(false); // false = remote big (default)

  const [cameraOn, setCameraOn] = useState(!callOnly);
  const [micOn, setMicOn] = useState(true);
  const [audioRoute, setAudioRoute] = useState("speaker");
  const [callStatus, setCallStatus] = useState(
    mode === "answer" ? "INCOMING" : "OUTGOING"
  );
  const [floating, setFloating] = useState(false);   // MINI FLOAT MODE
const floatRef = useRef(null);                     // for draggable later

// ================= AUTO TIMEOUT IF CALL NOT PICKED ================
const CALL_TIMEOUT = 40000; // 45 
const [miniActive, setMiniActive] = useState(false); // show enlarge + button
const [activeLabel, setActiveLabel] = useState("");  // "You" or remote user name
const [localVideoAvailable, setLocalVideoAvailable] = useState(callOnly ? false : true);

const [remoteVideoAvailable, setRemoteVideoAvailable] = useState(callOnly ? false : true);
const loggedOutgoingRef = useRef(false);
const loggedTimeoutRef = useRef(false);


const ringtoneRef = useRef(null);
const ringtoneTimer = useRef(null);

// when LOCAL video is tapped
const togglePreCallCamera = () => {
    setCameraOn(v => !v);
    setLocalVideoAvailable(v => !v);   
      setCallOnly(v => !v);    
    console.log(callOnly)
       // temporary switch mode
};

const clickLocal = () => {
  setActiveLabel( "You");
  showMiniControls(); // already triggers timer
};



// when REMOTE video is tapped
const clickRemote = () => {
   setActiveLabel(userdetail?.name || "User");
  showMiniControls();
};

// called when user taps the mini preview
const showMiniControls = () => {
  setMiniActive(true);
  setTimeout(() => setMiniActive(false), 3000); // hide icon after 2 sec
};
useEffect(() => {
  const handler = (ev) => {
    ev.preventDefault();

    // block navigation and minimize instead
    if (!CallRuntime.isFloating) {
      minimizeCall();
    }
  };

  window.addEventListener("ionBackButton", handler);

  return () => {
    window.removeEventListener("ionBackButton", handler);
  };
}, []);


useEffect(() => {
  if (callStatus === "OUTGOING" || callStatus === "INCOMING") {
    const timer = setTimeout(() => {
      console.log("⏳ No response — call auto ended");

      endCall(localVideoRef, remoteVideoRef);
      setCallStatus("ENDED");

      if (callStatus === "INCOMING" && !loggedTimeoutRef.current) {
        appendCallLog({
          userId: callerId,
          status: "incoming",
          callStatus: "missed",
          read: false
        });
        loggedTimeoutRef.current = true;
      }

      socket?.send(JSON.stringify({
        type: "end-call",
        targetId: targetUser || callerId,
        senderId: userId || currentUser,
      }));

    CallRuntime.hide();
window.dispatchEvent(new Event("render-call-ui"));

    }, CALL_TIMEOUT);

    return () => clearTimeout(timer); // Cleans if call answered or declined
  }
}, [callStatus]);
// 🔄 REMOUNT VIDEO STREAMS AFTER RETURNING FROM FLOAT



  // Start / Answer call
useEffect(() => {
  let cancelled = false;

  const run = async () => {
    console.log("mode", mode);

    if (mode === "call") {
      if (!socket) {
        setCallStatus("OFFLINE");
        return;
      }

      console.log("going");
      startCall(
        socket,
        targetUser,
        currentUser,
        localVideoRef,
        remoteVideoRef,
        callOnly
      );
      if (!loggedOutgoingRef.current) {
        appendCallLog({
          userId: targetUser,
          status: "outgoing",
          callStatus: "none",
          read: true
        });
        loggedOutgoingRef.current = true;
      }
      setCallStatus("OUTGOING");
      return;
    }

    if (mode === "answer" && offer && !Answer) {
      
      setCallStatus("INCOMING");
      return;
    }

    if (mode === "answer") {
      setCallStatus("CONNECTING");

      if (cancelled) return;

      await answerCall(
        socket,
        callerId,
        userId,
        offer,
        localVideoRef,
        remoteVideoRef,
        callOnly
      );

      if (!cancelled) {
        setCallStatus("ACTIVE");
      }
    }
  };

  run();

  return () => {
    cancelled = true;
    console.log("CLEANUP");
  };
}, []);


  // WebRTC Events
  useEffect(() => {

    const handleCallAnswer = async (e) => {
      await onCallAnswer(socket, e.detail);
      setCallStatus("ACTIVE");
    };

    const handleIce = e => onRemoteIce(e.detail);

    const handleDecline = () => {
      setCallStatus("DECLINED");
      setTimeout(() => { endCall(localVideoRef,remoteVideoRef); 
  CallRuntime.hide();                 // ← closes floating + fullscreen
  window.dispatchEvent(new Event("render-call-ui")); }, 1200);
    };

    const handleOffline = () => {
      setCallStatus("OFFLINE");
      setTimeout(() => { endCall(localVideoRef,remoteVideoRef); 
  CallRuntime.hide();                 // ← closes floating + fullscreen
  window.dispatchEvent(new Event("render-call-ui")); }, 1200);
    };

    const handleEnd = () => {
      try{
      setCallStatus("ENDED");
      endCall(localVideoRef,remoteVideoRef);
      setTimeout(()=>{
        console.log("might be this")
        try{
  CallRuntime.hide();                 // ← closes floating + fullscreen
        }catch(E){
          console.log("e",E)
        }
  },1200);
}catch(e){
    console.log("e not",e)
}
    };


    const handleCameraState = (e) => {
  console.log("📩 remote camera state:", e.detail.enabled);
  setRemoteVideoAvailable(e.detail.enabled);
};

    const restartOffer = async (e) => {
        await handleIceRestartOffer(socket, e.detail);
    };

    const restartAnswer = async (e) => {
        await handleIceRestartAnswer(e.detail);
    };

    window.addEventListener("ice-restart-offer", restartOffer);
    window.addEventListener("ice-restart-answer", restartAnswer);


    window.addEventListener("call-answer", handleCallAnswer);
    window.addEventListener("ice-candidate", handleIce);
    window.addEventListener("call-declined", handleDecline);
    window.addEventListener("user-offline", handleOffline);
    window.addEventListener("end-call", handleEnd);
    window.addEventListener("camera-state", handleCameraState);

    return () => {
      window.removeEventListener("call-answer", handleCallAnswer);
      window.removeEventListener("ice-candidate", handleIce);
      window.removeEventListener("call-declined", handleDecline);
      window.removeEventListener("user-offline", handleOffline);
      window.removeEventListener("end-call", handleEnd);
      window.removeEventListener("camera-state", handleCameraState);
      
    window.removeEventListener("ice-restart-offer", restartOffer);
    window.removeEventListener("ice-restart-answer", restartAnswer);

    };
  }, []);


  const handleAccept = async () => {
    setCallStatus("CONNECTING");
    
    stopCallRingtone();
     clearCallTimeout();
    console.log("callonly",callOnly)
    await answerCall(socket, callerId, userId, offer, localVideoRef, remoteVideoRef, callOnly);
    appendCallLog({
      userId: callerId,
      status: "incoming",
      callStatus: "accepted",
      read: true
    });
    setCallStatus("ACTIVE");
  };

  const handleDecline = () => {
    declineIncomingCall(socket, callerId, userId, localVideoRef, remoteVideoRef);
    appendCallLog({
      userId: callerId,
      status: "incoming",
      callStatus: "decline",
      read: true
    });
    setCallStatus("ENDED");
     stopCallRingtone();
      clearCallTimeout();
    setTimeout(()=>{
  CallRuntime.hide();                 // ← closes floating + fullscreen
  window.dispatchEvent(new Event("render-call-ui"));},800);
  };

  const handleEnd = () => {


    console.log("we at ending", targetUser || callerId,userId || currentUser)
    endCall(localVideoRef, remoteVideoRef);
    socket?.send(JSON.stringify({ type:"end-call", targetId: targetUser || callerId, senderId:userId || currentUser}));
     
  CallRuntime.hide();                 // ← closes floating + fullscreen
  

  };


  // Swap fullscreen <-> mini
const swapViews = () => {
  setLocalBig(prev => !prev);   // swap positions
  setMiniActive(false);         // hide UI after swap
};
const minimizeCall = () => {
console.log("test")

CallRuntime.minimize()
};

const reopenFullscreen = () => {
    CallRuntime.maximize();

}

const applyAudioRoute = async (route) => {
  const normalized = route === "headset" ? "headset" : "speaker";
  const useSpeaker = normalized === "speaker";

  try {
    const bridge = window?.NativeAds;
    if (bridge) {
      if (typeof bridge.setAudioRoute === "function") {
        await Promise.resolve(bridge.setAudioRoute(normalized));
      } else if (typeof bridge.setSpeakerphoneOn === "function") {
        await Promise.resolve(bridge.setSpeakerphoneOn(useSpeaker));
      } else if (typeof bridge.routeAudioToSpeaker === "function") {
        await Promise.resolve(bridge.routeAudioToSpeaker(useSpeaker));
      }
    }

    const sinkTarget = useSpeaker ? "default" : "communications";
    const mediaEls = [remoteVideoRef.current, localVideoRef.current].filter(Boolean);
    for (const el of mediaEls) {
      if (typeof el.setSinkId === "function") {
        try {
          await el.setSinkId(sinkTarget);
        } catch {
          // Browser/device may not expose this sink; keep call active.
        }
      }
    }

    setAudioRoute(normalized);
  } catch (error) {
    console.warn("Failed to apply audio route:", error);
  }
};

const toggleAudioRoute = () => {
  const next = audioRoute === "speaker" ? "headset" : "speaker";
  void applyAudioRoute(next);
};

useEffect(() => {
  if (callStatus !== "ACTIVE") return;
  void applyAudioRoute(audioRoute);
}, [callStatus]);


return (

  <>

<div
  className="text-white overflow-hidden"
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: CallRuntime.isFloating ? "100%" : "100vw",
    height: CallRuntime.isFloating ? "100%" : "100vh",
    borderRadius: CallRuntime.isFloating ? "14px" : "0px",
    overflow: "hidden",
    backgroundColor: "rgb(43,45,49)",
  }}
>

    <style>
{`
.fadeIn {
  animation: fadeIn 0.35s ease-out forwards;
  opacity: 0;
}
@keyframes fadeIn {
  to { opacity: 1; }
}

.pulseBadge {
  animation: pulseBadge 1.8s infinite ease-in-out;
}
@keyframes pulseBadge {
  0% { transform: scale(1); opacity:0.8 }
  50% { transform: scale(1.12); opacity:1 }
  100% { transform: scale(1); opacity:0.8 }
}
`}
</style>

    {/* animation for avatar float */}
    <style>{`
      @keyframes hover-up {
        0%,100% { transform: translateY(0px); }
        50% { transform: translateY(-15px); }
      }
      .animate-hover-up {
        animation: hover-up 3s ease-in-out infinite;
      }
    `}</style>

    {/* ================= VIDEO LAYERS ALWAYS MOUNTED ================= */}
  {/* REMOTE VIDEO */}
{/* REMOTE VIDEO — will be mini if localBig = true */}
{/* ================= REMOTE WRAPPER ================= */}
<div
  onClick={clickRemote}
  className={`
    ${   !localBig 
      ? "absolute inset-0 z-[5]" 
      : "absolute right-5 bottom-[8rem] w-24 h-36 rounded-lg border-2 border-white shadow-xl z-[50]"
    }
    transition-transform duration-300 ease-out
    ${miniActive && localBig ? "scale-[1.15]" : ""}   // ZOOM WHEN CLICKED
  `}
  style={{ display: callStatus === "ACTIVE" ? CallRuntime.isFloating  && localBig || localBig && CallRuntime.overlayActive  ? 'none' : 'block' : "none" }}
>


  <video ref={remoteVideoRef} autoPlay playsInline muted={false}
         className="w-full h-full object-cover transition duration-300" />

  {/* AVATAR OVERLAY */}
 {/* REMOTE AVATAR WHEN VIDEO OFF */}
{!remoteVideoAvailable && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/40 fadeIn">

    {/* Slight Blurred Background */}
    <div className="absolute inset-0 backdrop-blur-sm"></div>

    <div className="flex flex-col items-center gap-3 z-[3]">
      
      {/* Circular avatar */}
      <img
        src={userdetail?.avatar}
        className={`${localBig ? 'w-16 h-16':CallRuntime.isFloating  ?'w-16 h-16' : 'w-28 h-28'} rounded-full border-4 border-white shadow-xl object-cover fadeIn`}
      />

      {/* Camera off badge */}
    <div className={`
  flex items-center gap-2 
  bg-white/15 rounded-full font-medium backdrop-blur-md
  ${localBig ? "px-2 py-[2px] text-[0.60rem]" : "px-3 py-1 text-sm"}  // TEXT & PADDING REACTS
  fadeIn
`}>
  <VideoOff className={`${localBig ? "w-3 h-3" : CallRuntime.isFloating  ?'w-3 h-3' : 'w-4 h-4'} text-red-300`} />
  <span className="text-white/90 tracking-wide">Camera off</span>
</div>


    </div>
  </div>
)}


  {miniActive && localBig && !CallRuntime.isFloating && (
    <button
      onClick={(e)=>{e.stopPropagation(); swapViews();}}
      className="absolute bg-black/60 text-white rounded-full flex items-center justify-center"
      style={{width:50,height:50,top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:999}}
    >⤢</button>
  )}
</div>



{/* ================= LOCAL WRAPPER ================= */}
<div
  onClick={clickLocal}
  className={`
    ${localBig 
      ? "absolute inset-0 z-[5]"  
      : "absolute right-5 bottom-[8rem] w-24 h-36 rounded-lg border-2 border-white shadow-xl z-[50]"
    }
    transition-transform duration-300 ease-out
    ${miniActive && !localBig ? "scale-[1.15]" : ""}   // MINI → ZOOM POP
  `}
  style={{ display: callStatus === "ACTIVE" ? CallRuntime.isFloating && !localBig || !localBig && CallRuntime.overlayActive ? 'none' : 'block'  : "none" }}
>


  <video ref={localVideoRef} autoPlay playsInline muted
         className="w-full h-full object-cover transition duration-300"/>

  {/* AVATAR OVERLAY */}
{/* LOCAL AVATAR WHEN CAMERA OFF */}
{!localVideoAvailable && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/40 fadeIn">

    <div className="absolute inset-0 backdrop-blur-sm"></div>

    <div className="flex flex-col items-center gap-3 z-[3]">

      <img
        src={currentUser?.avatar || "/default.jpg"}
        className={`${!localBig ? 'w-16 h-16':CallRuntime.isFloating  ?'w-16 h-16' : 'w-28 h-28'}  rounded-full border-4 border-white shadow-xl object-cover fadeIn`}
      />

     <div className={`
  flex items-center gap-2 backdrop-blur-md  rounded-full font-medium
  ${!localBig ? "px-2 py-[2px] text-[0.60rem]" : "px-3 py-1 text-sm"}
`}>
  <VideoOff className={`${!localBig ? "w-3 h-3" : "w-4 h-4"} text-red-400`} />
  <span className="text-white/90">Camera off</span>
</div>


    </div>
  </div>
)}


  {miniActive && !localBig && !CallRuntime.isFloating && (
    <button
      onClick={(e)=>{e.stopPropagation(); swapViews();}}
      className="absolute bg-black/60 text-white rounded-full flex items-center justify-center"
      style={{width:50,height:50,top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:999}}
    >⤢</button>
  )}
</div>

{miniActive && activeLabel && !CallRuntime.isFloating && (
  <div
    className="
      absolute left-1/2 -translate-x-1/2
      bg-black/60 text-white text-base px-4 py-[6px]
      rounded-full font-semibold tracking-wide z-[200]
      animate-[labelPop_2s_ease-out]
    "
    style={{ top: "3rem" }}  // adjust lower/higher as needed
  >
    {activeLabel}
  </div>
)}



<style>
{`
@keyframes labelPop {
  0%   { opacity:0; transform:translate(-50%, -10px) scale(0.9); }
  40%  { opacity:1; transform:translate(-50%, 0) scale(1); }
  70%  { opacity:1; }
  100% { opacity:0; transform:translate(-50%, -10px) scale(0.92); }
}
`}
</style>
   {/* ================================================================ */}
    {/* 🔥 CALL OVERLAY UI (INCOMING/OUTGOING/CONNECTING etc) for lfoating obly */}
    {/* ================================================================ */}
{CallRuntime.isFloating && callStatus !=="ACTIVE" && (
  <div
  onClick={clickLocal}
  className={ "absolute inset-0 z-[5]"  }
  style={{ display:"block"}}
>
  
  <button
  onClick={reopenFullscreen}
  className="absolute top-6 left-4 w-12 h-12 rounded-full ... "
  style={{zIndex: '66'}}
>
  <Settings className="w-5 h-5 rotate-90"/>
</button>
<div className="absolute inset-0 z-[5] flex flex-col items-center justify-end pb-16">

        
          <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <img src={userdetail?.avatar} alt={userdetail?.name} className={`${CallRuntime.isFloating? 'w-16 h-16' : 'w-full h-full'} object-cover`} />
          </div>
               <h2 className="text-base sm:text-base font-bold mt-6" style={{marginBottom:'20px'}}>{userdetail?.name || "Unknown User"}</h2>
              
        </div>

        {callStatus && callStatus ==="OUTGOING" && (
    <div
    className="absolute inset-0 z-[5] flex flex-col items-center justify-end gap-2"
    style={{ position: "absolute", bottom: "5%", left: "50%", transform: "translateX(-50%)" }}
  >
  <p className="text-xs text-gray-200 animate-pulse tracking-wide">

    {callStatus === "INCOMING"  && "Incoming call..."}
    {callStatus === "OUTGOING"  && "Calling..."}
    {callStatus === "CONNECTING" && "Connecting..."}
    {callStatus === "ACTIVE"     && "Connected"}
    {callStatus === "DECLINED"   && "User Declined"}
    {callStatus === "OFFLINE"    && "User is Offline"}
    {callStatus === "ENDED"      && "Call Ended"}

  </p>
    
 {(callStatus === "OUTGOING" || callStatus ==="CONNECTING" ) &&  (
  <button
    onClick={handleEnd}
    className={`${CallRuntime.isFloating? 'w-8 h-8 ': 'w-14 h-14 '}rounded-full bg-red-600 text-xl flex items-center justify-center shadow-xl active:scale-90`}
  >
       <X className="w-6 h-6" />
  </button>
)}

  </div>
)}
{/* 📩 Incoming UI — Floating mode only */}
{CallRuntime.isFloating && callStatus === "INCOMING" && (
  <div className="absolute inset-0 z-[5] flex flex-col items-center justify-end px-4">

  



    <div className="flex items-center gap-2 mt-4" style={{marginBottom: '20px'}}>

      {/* Decline */}
      <button
        onClick={handleDecline}
        className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center active:scale-95"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Accept */}
      <button
        onClick={handleAccept}
        className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center 
        active:scale-95 animate-[pulse_1.6s_infinite]"
      >
        <Phone className="w-5 h-5" />
      </button>

    </div>

    {/* Toggle Camera (small) */}
   
  </div>
)}


  </div>
)}

    {/* ================================================================ */}
    {/* 🔥 CALL OVERLAY UI (INCOMING/OUTGOING/CONNECTING etc) */}
    {/* ================================================================ */}
    {!CallRuntime.isFloating && callStatus !== "ACTIVE" && (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">

  <button
  onClick={minimizeCall}
  className="absolute top-6 left-6 w-12 h-12 rounded-full ..."
  style={{display: CallRuntime.overlayActive ? 'none' : 'block'}}
>
  <Settings className="w-5 h-5 rotate-90"/>
</button>



        <div className="flex flex-col items-center " style={{marginBottom:'60%'}}>
             <h2 className="text-2xl sm:text-3xl font-bold mt-8" style={{marginBottom:'20px'}}>{userdetail?.name || "Unknown User"}</h2>
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <img src={userdetail?.avatar} alt={userdetail?.name} className={`${CallRuntime.isFloating? 'w-16 h-16' : 'w-full h-full'} object-cover`} />
          </div>
              
        </div>

 
{callStatus && (
    <div
    className="flex flex-col items-center gap-10"
    style={{ position: "absolute", bottom: "20%", left: "50%", transform: "translateX(-50%)" }}
  >
  <p className="text-lg text-gray-200 animate-pulse tracking-wide">

    {callStatus === "INCOMING"  && "Incoming call..."}
    {callStatus === "OUTGOING"  && "Calling..."}
    {callStatus === "CONNECTING" && "Connecting..."}
    {callStatus === "ACTIVE"     && "Connected"}
    {callStatus === "DECLINED"   && "User Declined"}
    {callStatus === "OFFLINE"    && "User is Offline"}
    {callStatus === "ENDED"      && "Call Ended"}

  </p>
    
 {(callStatus === "OUTGOING" || callStatus === "CONNECTING" )&&  (
  <button
    onClick={handleEnd}
    className={`${CallRuntime.isFloating? 'w-10 h-10 ': 'w-14 h-14 '}rounded-full bg-red-600 text-xl flex items-center justify-center shadow-xl active:scale-90`}
  >
    🔴
  </button>
)}
  </div>
)}
        {/* 📩 Incoming UI */}
    { !CallRuntime.isFloating && callStatus === "INCOMING" && (
  <div
    className="flex flex-col items-center gap-10"
    style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)" }}
  >

{/* 🔔 Status Text — shows based on callStatus */}
{callStatus && (
  <>
  <p className="text-lg text-gray-200 animate-pulse tracking-wide">

    {callStatus === "INCOMING"  && "Incoming call..."}
    {callStatus === "OUTGOING"  && "Calling..."}
    {callStatus === "CONNECTING" && "Connecting..."}
    {callStatus === "ACTIVE"     && "Connected"}
    {callStatus === "DECLINED"   && "User Declined"}
    {callStatus === "OFFLINE"    && "User is Offline"}
    {callStatus === "ENDED"      && "Call Ended"}

  </p>

</>
)}

    

    {/* ---------------- Animation keyframes ONLY for ACCEPT ---------------- */}
    <style>{`
      @keyframes acceptPulse {
        0% { transform: translateY(0px) scale(1); box-shadow:0 0 10px rgba(0,255,0,0.15); }
        50% { transform: translateY(-8px) scale(1.10); box-shadow:0 0 22px rgba(0,255,0,0.45); }
        100% { transform: translateY(0px) scale(1); box-shadow:0 0 10px rgba(0,255,0,0.15); }
      }
      .accept-animate { animation: acceptPulse 1.8s ease-in-out infinite; }
    `}</style>

    <div className="flex gap-12 mt-3">

      {/* ❌ Decline (Static) */}
      <button
        onClick={handleDecline}
        className={`${CallRuntime.isFloating? 'w-10 h-10 ' : 'w-14 h-14 '}rounded-full bg-red-600 text-white flex items-center justify-center
        shadow-lg hover:scale-110 active:scale-95 transition-all duration-200`}
      >
        <X className="w-7 h-7" />
      </button>

      {/* 📞 Accept — Animated like WhatsApp */}
      <button
        onClick={handleAccept}
        className={`${CallRuntime.isFloating? 'w-10 h-10 ' : 'w-14 h-14 '} rounded-full bg-green-500 text-white flex items-center justify-center
        active:scale-95 transition-all duration-200 accept-animate`}
      >
        <Phone className="w-7 h-7" />
      </button>

    </div>

    {/* Camera Toggle */}
   <button
  onClick={togglePreCallCamera}
  className={`mt-4 ${CallRuntime.isFloating? 'w-10 h-10 ' : 'w-14 h-14 '} rounded-full border-2 border-white/80 bg-white/10 
  flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200`}
>
  {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
</button>


  </div>
)}


      </div>
    )}

    {/* ================================================================ */}
    {/* 🔥 ACTIVE CALL CONTROLS — Bottom bar */}
    {/* ================================================================ */}
  {callStatus === "ACTIVE"  && (
  <>
    {/* SETTINGS BUTTON — top left, floating */}
 <button
  onClick={() => {
    if(CallRuntime.isFloating){
reopenFullscreen()
    }else{
minimizeCall()
    }
    }
}
  className={`absolute top-6 left-6 ${CallRuntime.isFloating ? 'w-10 h-10' : 'w-12 h-12'} rounded-full
  flex items-center justify-center text-white
  backdrop-blur-md bg-white/10 border border-white/30
  hover:scale-110 active:scale-95 transition z-[60]`}
>
  <Settings className="w-5 h-5 rotate-90" />   {/* icon same but now MINIMIZES */}
</button>


    {/* 🔥 Bottom Call Controls */}
    {true && (
   <div
      className={`
        absolute bottom-6 w-full flex justify-center items-center gap-2 z-[50]
        
        /* Animation behaviour */
        transition-all duration-300 ease-out
        ${miniActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}
      `}
    >
  {/* Camera */}
  <button
   onClick={() => {
    const status = toggleCamera(socket, targetUser || callerId);
       setLocalVideoAvailable(status); 
    setCameraOn(status);
}}

    className={`${ CallRuntime.isFloating ?  'w-10 h-10' : 'w-12 h-12'} rounded-full flex items-center justify-center 
      backdrop-blur-md border text-white 
      ${cameraOn ? "bg-white/10 border-white/40" : "bg-red-600/80 border-red-400"}
      hover:scale-105 active:scale-95 transition`}
  >
    {cameraOn ? <Video className="w-5 h-5"/> : <VideoOff className="w-5 h-5"/>}
  </button>

  {/* Mic */}
{!CallRuntime.isFloating && (<button
  onClick={() => setMicOn(toggleMic())}
  className={`w-12 h-12 rounded-full flex items-center justify-center 
    backdrop-blur-md border text-white 
    ${micOn ? "bg-white/10 border-white/40" : "bg-red-600/80 border-red-400"}
    hover:scale-105 active:scale-95 transition`}
>
  {micOn ? <Mic className="w-5 h-5"/> : <MicOff className="w-5 h-5"/>}
</button>)}

  {/* Camera Flip */}
  <button
    onClick={() => switchCamera(localVideoRef)}
    className={`${ CallRuntime.isFloating ?  'w-10 h-10' : 'w-12 h-12'} rounded-full flex items-center justify-center
      backdrop-blur-md border bg-white/10 border-white/40 text-white
      hover:scale-105 active:scale-95 transition`}
  >
    🔄
  </button>
  {/* Audio Route: Speaker / Headset */}
  <button
    onClick={toggleAudioRoute}
    className={`${ CallRuntime.isFloating ?  'w-10 h-10' : 'w-12 h-12'} rounded-full flex items-center justify-center
      backdrop-blur-md border text-white
      ${audioRoute === "speaker" ? "bg-white/10 border-white/40" : "bg-slate-600/80 border-slate-300"}
      hover:scale-105 active:scale-95 transition`}
    title={audioRoute === "speaker" ? "Speaker" : "Headset"}
    aria-label={audioRoute === "speaker" ? "Speaker" : "Headset"}
  >
    {audioRoute === "speaker" ? <Volume2 className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
  </button>
  {/* END CALL — Slightly bigger */}
  <button
    onClick={handleEnd}
    className={`${ CallRuntime.isFloating ?  'w-10 h-10' : 'w-14 h-14'} rounded-full flex items-center justify-center
     bg-red-600 text-white shadow-xl border border-red-400
     hover:scale-120 active:scale-95 transition`}
  >
    <PhoneOff className="w-6 h-6" />
  </button>


</div>
)}

  </>
)}

{/* ================================================================
     📌 FLOATING MODES — Based on callStatus
================================================================ */}



  </div>

</>
  
);


}
export default VideoCallScreen;
