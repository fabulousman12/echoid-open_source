// src/bootstrap/callRingtone.js

let audio = null;
let ringtoneTimeoutId = null;
let callTimeoutId = null;

/* =====================================================
   🔔 RINGTONE CONTROL
   ===================================================== */

export function startCallRingtone() {
  stopCallRingtone(); // safety

  audio = new Audio('/ringtone.mp3'); // public/
  audio.loop = true;
  audio.volume = 1;

  audio.play().catch(() => {
    console.warn('🔇 ringtone autoplay blocked');
  });

  // ⏰ safety stop (ringtone only)
  ringtoneTimeoutId = setTimeout(() => {
    console.log('⏰ ringtone auto-stop');
    stopCallRingtone();
  }, 39_000);

  console.log('🔔 ringtone started');
}

export function stopCallRingtone() {
  if (ringtoneTimeoutId) {
    clearTimeout(ringtoneTimeoutId);
    ringtoneTimeoutId = null;
  }

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
    console.log('🔕 ringtone stopped');
  }
}

/* =====================================================
   ☎️ CALL TIMEOUT (STATE)
   ===================================================== */

export function startCallTimeout(onTimeout) {
  clearCallTimeout();

  callTimeoutId = setTimeout(async () => {
    console.warn('⏰ call timed out');
    onTimeout?.();
  }, 39_000);
}

export function clearCallTimeout() {
  if (callTimeoutId) {
    clearTimeout(callTimeoutId);
    callTimeoutId = null;
  }
}
