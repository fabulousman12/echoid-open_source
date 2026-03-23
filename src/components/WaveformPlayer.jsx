import React, { useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { playOutline, pauseOutline } from 'ionicons/icons';
import {
  createObjectUrlFromWebFileRef,
  isWebStoredFileRef,
  revokeResolvedObjectUrl,
} from '../services/webFileStore';

const SimpleAudioPlayer = ({ audioFile }) => {
  const audioRef = useRef(null);
  const [resolvedAudioFile, setResolvedAudioFile] = useState(audioFile);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buffering, setBuffering] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    const resolveAudio = async () => {
      if (isWebStoredFileRef(audioFile)) {
        objectUrl = await createObjectUrlFromWebFileRef(audioFile);
        if (active) setResolvedAudioFile(objectUrl || audioFile);
      } else {
        setResolvedAudioFile(audioFile);
      }
    };

    resolveAudio();

    return () => {
      active = false;
      revokeResolvedObjectUrl(objectUrl);
    };
  }, [audioFile]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setLoading(true);
    setError(null);

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setLoading(false);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleError = () => {
      setError('Error playing audio.');
      setIsPlaying(false);
      setLoading(false);
    };
    const handleWaiting = () => setBuffering(true);
    const handlePlaying = () => setBuffering(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, [resolvedAudioFile]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const wasPlaying = !audio.paused;
    audio.pause();
    audio.currentTime = (Number(e.target.value) / 100) * (audio.duration || 0);
    if (wasPlaying) {
      setTimeout(() => audio.play(), 300);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {loading && <p style={{ color: 'white' }}>Loading audio...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <IonIcon
              icon={isPlaying ? pauseOutline : playOutline}
              onClick={togglePlay}
              style={{
                fontSize: 24,
                cursor: 'pointer',
                color: 'white',
                opacity: buffering ? 0.5 : 1,
              }}
              title={buffering ? 'Buffering...' : isPlaying ? 'Pause' : 'Play'}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={audioRef.current?.duration ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0}
              onChange={handleSeek}
              style={{
                flex: 1,
                margin: '0 2px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: '#25D366',
                outline: 'none',
                cursor: 'pointer',
                opacity: buffering ? 0.5 : 1,
              }}
              disabled={buffering}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ fontSize: 11, color: 'white' }}>{formatTime(currentTime)}</div>
            <div style={{ fontSize: 11, color: 'white' }}>{formatTime(duration)}</div>
          </div>

          <audio ref={audioRef} src={resolvedAudioFile} preload="metadata" />
        </>
      )}
    </div>
  );
};

export default SimpleAudioPlayer;
