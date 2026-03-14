import React, { useState, useRef, useEffect } from "react";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const VoiceRecorderWhatsAppStyle = ({onCancel,SendAudio}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekTime, setSeekTime] = useState(0);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordingInterval = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
const requestMicPermission = async () => {
  return new Promise((resolve, reject) => {
    const permissions = window.cordova.plugins.permissions;
    const mic = permissions.RECORD_AUDIO;

    permissions.checkPermission(mic, (status) => {
      if (status.hasPermission) {
        resolve(true);
      } else {
        permissions.requestPermission(mic, (result) => {
          resolve(result.hasPermission);
        }, (error) => {
          console.error("Permission request error", error);
          reject(false);
        });
      }
    }, reject);
  });
};

  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime((time) => time + 1);
      }, 1000);
    } else {
      clearInterval(recordingInterval.current);
    }
    return () => clearInterval(recordingInterval.current);
  }, [isRecording, isPaused]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

const togglePlay = () => {
  if (!audioBlob) return;

  // If already playing, pause and reset
  if (isPlaying && audioRef.current) {
    audioRef.current.pause();
    setIsPlaying(false);
    return;
  }

  const audioURL = URL.createObjectURL(audioBlob);

  // If there's already an existing audio instance, clean it up
  if (audioRef.current) {
    audioRef.current.pause();
    URL.revokeObjectURL(audioRef.current.src);
    audioRef.current = null;
  }

  // Create a new audio instance and play
  audioRef.current = new Audio(audioURL);

  audioRef.current.ontimeupdate = () => {
    setSeekTime(audioRef.current?.currentTime || 0);
  };

  audioRef.current.onended = () => {
    setIsPlaying(false);
    setSeekTime(0);
    audioRef.current = null;
  };

  audioRef.current.play()
    .then(() => setIsPlaying(true))
    .catch((err) => {
      console.error("Playback failed:", err);
      setIsPlaying(false);
    });
};

  const startMediaRecorder = async () => {
   const hasPermission = await requestMicPermission();
  if (!hasPermission) {
    alert("Microphone permission is required.");
    return;
  }

  // Start recording if permission is granted
  if (!streamRef.current) {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("getUserMedia error:", err);
      alert("Unable to access microphone.");
      return;
    }
  }

    mediaRecorder.current = new MediaRecorder(streamRef.current);
    audioChunks.current = [];

    mediaRecorder.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.current.push(event.data);
      }
    };

    mediaRecorder.current.onstop = () => {
      const chunkBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      setAudioBlob((prevBlob) => {
        if (prevBlob) {
          return new Blob([prevBlob, chunkBlob], { type: "audio/webm" });
        }
        return chunkBlob;
      });
    };

    mediaRecorder.current.start();
  };

  const handleRecordButtonClick = async () => {
    if (!isRecording && !isPaused) {
      await startMediaRecorder();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setAudioBlob(null);
    } else if (isRecording && !isPaused) {
      if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
        mediaRecorder.current.stop();
        setIsPaused(true);
        setIsRecording(false);
        clearInterval(recordingInterval.current);
      }
    } else if (isPaused) {
      await startMediaRecorder();
      setIsPaused(false);
      setIsRecording(true);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      console.log("Sending audio file blob:", audioBlob);
      setAudioBlob(null);
      onCancel(); // Call the onCancel prop to reset the UI
      setRecordingTime(0);
      setSeekTime(0);
      setIsRecording(false);
      SendAudio(audioBlob)
      setIsPaused(false);
      audioChunks.current = [];
      mediaRecorder.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  return (
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 4,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    width: "100%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  }}
>
    <button
    onClick={onCancel}
    style={{
      position: "absolute",
      top: "-31%",
      right: "45%",
      backgroundColor: "#e74c3c",
      color: "#fff",
      border: "none",
      borderRadius: "50%",
      width: 36,
      height: 36,
      fontSize: 18,
      cursor: "pointer",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    }}
    title="Cancel recording"
  >
    ✖
  </button>
  {/* Play/Pause Button */}
  <button
    onClick={togglePlay}
    disabled={isRecording}
    style={{
      backgroundColor: "#4a90e2",
      border: "none",
      borderRadius: "50%",
      width: 46,
      height: 46,
      color: "#fff",
      fontSize: 20,
      cursor: isRecording ? "not-allowed" : "pointer",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
    title={isPlaying ? "Pause playback" : "Play recording"}
  >
    {isPlaying ? "⏸️" : "▶️"}
  </button>

  {/* Seek bar */}
  <input
    type="range"
    min={0}
    max={audioRef.current?.duration || 0}
    value={seekTime}
    disabled={isRecording}
    step="1"
    onChange={(e) => {
      const value = Number(e.target.value);
      setSeekTime(value);
      if (audioRef.current) {
        audioRef.current.currentTime = value;
      }
    }}
    style={{
      flex: 1,
      height: 6,
      borderRadius: 5,
      background: "#ddd",
      outline: "none",
      accentColor: "#4a90e2",
      cursor: isRecording ? "not-allowed" : "pointer",
    }}
  />

  {/* Timer */}
  <span
    style={{
      fontSize: 14,
      fontWeight: 500,
      color: "#333",
      width: 50,
      textAlign: "center",
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {formatTime(recordingTime)}
  </span>

  {/* Send Button */}
  {audioBlob && (
    <button
      onClick={handleSend}
      disabled={isRecording}
      style={{
        backgroundColor: "#27ae60",
        border: "none",
        borderRadius: "50%",
        width: 46,
        height: 46,
        color: "#fff",
        fontSize: 20,
        cursor: isRecording ? "not-allowed" : "pointer",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      title="Send recording"
    >
      📤
    </button>
  )}

  {/* Record / Pause / Resume Button */}
  <button
    onClick={handleRecordButtonClick}
    style={{
      backgroundColor: isRecording
        ? isPaused
          ? "#f1c40f"
          : "#e74c3c"
        : "#9b59b6",
      border: "none",
      borderRadius: "100%",
      width: 46,
      height: 46,
      color: "#fff",
      fontSize: 20,
      cursor: "pointer",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
    title={
      !isRecording
        ? "Start recording"
        : isPaused
        ? "Resume recording"
        : "Pause recording"
    }
  >
    {!isRecording ? "🎙️" : isPaused ? "▶️" : "⏸️"}
  </button>

  {/* Hidden audio element */}
  <audio
    ref={audioRef}
    src={audioBlob ? URL.createObjectURL(audioBlob) : ""}
    onEnded={() => setIsPlaying(false)}
    preload="auto"
    style={{ display: "none" }}
  />
</div>

  );
};

export default VoiceRecorderWhatsAppStyle;
