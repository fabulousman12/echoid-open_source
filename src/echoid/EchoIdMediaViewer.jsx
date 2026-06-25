import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getPointerDistance = (pointers) => {
  if (pointers.length < 2) return 0;
  const [first, second] = pointers;
  return Math.hypot(second.x - first.x, second.y - first.y);
};

const isSafeMediaUrl = (url) => /^(https?:\/\/|blob:|data:image\/|data:video\/)/i.test(String(url || "").trim());

export default function EchoIdMediaViewer({ preview, onClose }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isTouchViewer, setIsTouchViewer] = useState(false);
  const pointersRef = useRef(new Map());
  const dragRef = useRef(null);
  const pinchRef = useRef({ distance: 0, scale: 1 });
  const videoRef = useRef(null);
  const chromeTimerRef = useRef(null);

  const isVideo = preview?.kind === "video";
  const title = String(preview?.title || preview?.alt || (isVideo ? "Video" : "Image")).trim();
  const author = String(preview?.author || "").trim();
  const handle = String(preview?.handle || "").trim();
  const timeLabel = String(preview?.relativeTimeLabel || preview?.timeLabel || "").trim();
  const avatarUrl = String(preview?.avatarUrl || "").trim();
  const metaLine = useMemo(() => [handle, timeLabel].filter(Boolean).join(" - "), [handle, timeLabel]);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setIsChromeVisible(true);
    pointersRef.current.clear();
    dragRef.current = null;
    pinchRef.current = { distance: 0, scale: 1 };
  }, [preview?.url, preview?.kind]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const touchCapable = window.matchMedia?.("(pointer: coarse)")?.matches || navigator.maxTouchPoints > 0;
    setIsTouchViewer(Boolean(touchCapable));
    return undefined;
  }, []);

  useEffect(() => {
    if (!isTouchViewer || !isChromeVisible) return undefined;
    window.clearTimeout(chromeTimerRef.current);
    chromeTimerRef.current = window.setTimeout(() => {
      setIsChromeVisible(false);
    }, 2600);
    return () => window.clearTimeout(chromeTimerRef.current);
  }, [isChromeVisible, isTouchViewer, preview?.url]);

  useEffect(() => {
    if (!preview) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, preview]);

  useEffect(() => {
    if (!isVideo) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;
    const playPromise = video.play?.();
    if (playPromise?.catch) playPromise.catch(() => {});
    return () => video.pause?.();
  }, [isVideo, preview?.url]);

  if (!preview?.url || !isSafeMediaUrl(preview.url)) return null;

  const updateScale = (nextScale) => {
    setScale((current) => {
      const normalized = clamp(Number(nextScale), 1, 4);
      if (normalized <= 1) setOffset({ x: 0, y: 0 });
      return normalized || current;
    });
  };

  const revealChrome = () => {
    if (!isTouchViewer) return;
    setIsChromeVisible(true);
  };

  const handleWheel = (event) => {
    if (isVideo) return;
    event.preventDefault();
    updateScale(scale + (event.deltaY < 0 ? 0.22 : -0.22));
  };

  const handlePointerDown = (event) => {
    if (isTouchViewer) revealChrome();
    if (isVideo) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length >= 2) {
      pinchRef.current = { distance: getPointerDistance(pointers), scale };
      dragRef.current = null;
      return;
    }
    dragRef.current = { x: event.clientX, y: event.clientY, offset };
  };

  const handlePointerMove = (event) => {
    if (isVideo || !pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length >= 2) {
      const nextDistance = getPointerDistance(pointers);
      if (pinchRef.current.distance > 0) {
        updateScale((pinchRef.current.scale * nextDistance) / pinchRef.current.distance);
      }
      return;
    }
    if (!dragRef.current || scale <= 1) return;
    setOffset({
      x: dragRef.current.offset.x + event.clientX - dragRef.current.x,
      y: dragRef.current.offset.y + event.clientY - dragRef.current.y,
    });
  };

  const handlePointerEnd = (event) => {
    if (isVideo) return;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = { distance: 0, scale };
    }
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
    }
  };

  const handleImageDoubleClick = () => {
    updateScale(scale > 1 ? 1 : 2);
  };

  return (
    <div
      className={`echoid-media-viewer ${isVideo ? "is-video" : "is-image"} ${isTouchViewer ? "is-touch" : ""} ${
        isChromeVisible ? "is-chrome-visible" : "is-chrome-hidden"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <header className="echoid-media-viewer-header">
        <button type="button" className="echoid-media-viewer-back" onClick={onClose} aria-label="Back">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="echoid-media-viewer-author">
          <span className="echoid-media-viewer-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{(author || title || "E").charAt(0).toUpperCase()}</span>}
          </span>
          <span className="echoid-media-viewer-copy">
            {author ? <strong>{author}</strong> : null}
            {metaLine ? <span>{metaLine}</span> : null}
            {title ? <b>{title}</b> : null}
          </span>
        </div>
      </header>

      <main
        className="echoid-media-viewer-stage"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={handleImageDoubleClick}
        onClick={revealChrome}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={preview.url}
            poster={preview.thumbnailUrl}
            className="echoid-media-viewer-video"
            controls
            playsInline
            autoPlay
            preload="metadata"
            onClick={revealChrome}
          />
        ) : (
          <img
            src={preview.url}
            alt={preview.alt || title || "Post media"}
            className="echoid-media-viewer-image"
            draggable={false}
            style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}
          />
        )}
      </main>
    </div>
  );
}