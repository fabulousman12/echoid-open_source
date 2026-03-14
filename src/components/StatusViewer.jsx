import React, { useEffect, useRef, useState } from "react";
import { MdDeleteSweep } from "react-icons/md";
import "./StatusViewer.css";

function ImageWithTimeout({ src, duration, onDone, onProgress, paused, onLoad, onError, styleOverride }) {
  const onDoneRef = useRef(onDone);
  const onProgressRef = useRef(onProgress);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    elapsedRef.current = 0;
    startRef.current = Date.now();
  }, [src, duration]);

  useEffect(() => {
    if (paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    startRef.current = Date.now() - elapsedRef.current;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      elapsedRef.current = elapsed;
      const progress = Math.min(1, elapsed / duration);
      const timeLeft = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      onProgressRef.current?.(progress, timeLeft);
      if (elapsed >= duration) {
        onDoneRef.current?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [duration, paused, src]);

  return (
    <img
      src={src}
      alt=""
      onLoad={onLoad}
      onError={onError}
      style={styleOverride}
      className="max-h-full max-w-full object-contain"
    />
  );
}

function formatTime24(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function StatusViewer({
  open,
  items,
  user,
  index,
  setIndex,
  onClose,
  onViewStatus,
  onUserStatusesDone,
  isOwn,
  onDeleteStatus,
  usersMain,
}) {
  if (!open) return null;

  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [viewerSheetOpen, setViewerSheetOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(40);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const dragStartRef = useRef(null);
  const viewedIdsRef = useRef(new Set());
  const filteredItems = safeItems.filter((item) => {
    if (!item?.id) return true;
    return !viewedIdsRef.current.has(`deleted:${item.id}`);
  });
  const activeIndex = Math.min(index - skipCount, Math.max(0, filteredItems.length - 1));
  const current = filteredItems[activeIndex];
  const isVideo =
    current?.mediaType === "video" || current?.mediaUrl?.includes(".mp4");
  const containerRef = useRef(null);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const videoRef = useRef(null);
  const timeLabel = formatTime24(current?.createdAt);

  useEffect(() => {
    setProgress(0);
    setTimeLeft(0);
    setIsMuted(true);
    setIsPaused(false);
    setViewerSheetOpen(false);
    setIsMediaLoading(true);
  }, [index, current?.id]);

  useEffect(() => {
    if (!open) {
      viewedIdsRef.current.clear();
      setSkipCount(0);
    }
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    if (!current?.id) return;
    if (viewedIdsRef.current.has(current.id)) return;
    viewedIdsRef.current.add(current.id);
    if (!isOwn) onViewStatus?.(current);
  }, [open, current?.id, onViewStatus, isOwn]);

  const goNext = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {}
    }
    const next = activeIndex + 1;
    if (next >= filteredItems.length) {
      const jumped = onUserStatusesDone?.(current);
      if (!jumped) onClose();
    } else {
      setIndex(next + skipCount);
    }
  };

  const goPrev = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {}
    }
    const prev = activeIndex - 1;
    if (prev < 0) {
      onClose();
    } else {
      setIndex(prev + skipCount);
    }
  };

  const imageDurationMs = 5000;

  const pausePlayback = () => {
    setIsPaused(true);
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
    }
  };

  const resumePlayback = () => {
    setIsPaused(false);
    if (videoRef.current && isVideo) {
      try {
        const playPromise = videoRef.current.play();
        if (playPromise?.catch) playPromise.catch(() => {});
      } catch {}
    }
  };

  useEffect(() => {
    if (viewerSheetOpen) {
      pausePlayback();
      return;
    }
    if (isPaused) {
      resumePlayback();
    }
  }, [viewerSheetOpen]);

  useEffect(() => {
    if (isMediaLoading) {
      pausePlayback();
      return;
    }
    if (!viewerSheetOpen) {
      resumePlayback();
    }
  }, [isMediaLoading, viewerSheetOpen]);

  const resolveViewerUser = (entry) => {
    if (!entry) return null;
    const rawId =
      typeof entry === "string" || typeof entry === "number"
        ? entry
        : entry.userId || entry.id || entry._id;
    const targetId = rawId ? String(rawId) : "";
    const match = Array.isArray(usersMain)
      ? usersMain.find((u) => String(u.id || u._id) === targetId)
      : null;
    if (!match) {
      return {
        id: targetId || String(Math.random()),
        name: entry.name || entry.username || "Unknown",
        avatar: entry.avatar || entry.profilePhoto || "/img.jpg",
      };
    }
    return {
      id: targetId,
      name: match.name || match.username || "Unknown",
      avatar: match.avatar || match.profilePhoto || "/img.jpg",
    };
  };

  const viewedUsers = Array.isArray(current?.viewedBy)
    ? current.viewedBy.map(resolveViewerUser).filter(Boolean)
    : [];
  const viewerListLoading =
    Array.isArray(current?.viewedBy) &&
    current.viewedBy.length > 0 &&
    (!Array.isArray(usersMain) || usersMain.length === 0);

  const startDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget?.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    dragStartRef.current = {
      startY: e.clientY,
      startHeight: sheetHeight,
      pointerId: e.pointerId,
      target: e.currentTarget,
    };
    window.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", endDrag);
  };

  const onDrag = (e) => {
    if (!dragStartRef.current) return;
    const { startY, startHeight } = dragStartRef.current;
    const delta = (startY - e.clientY) / window.innerHeight;
    const next = Math.min(50, Math.max(30, startHeight + delta * 100));
    setSheetHeight(Math.round(next * 10) / 10);
  };

  const endDrag = () => {
    if (dragStartRef.current?.pointerId && dragStartRef.current?.target?.releasePointerCapture) {
      dragStartRef.current.target.releasePointerCapture(dragStartRef.current.pointerId);
    }
    dragStartRef.current = null;
    window.removeEventListener("pointermove", onDrag);
    window.removeEventListener("pointerup", endDrag);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    pausePlayback();
  };

  const handleTouchEnd = (e) => {
    const touchStartX = touchStartXRef.current;
    const touchStartY = touchStartYRef.current;
    if (touchStartX === null || touchStartY === null) return;

    const touch = e.changedTouches?.[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const threshold = 40;

    if (absDx > absDy && absDx > threshold) {
      if (dx < 0) {
        goNext();
      } else {
        goPrev();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    resumePlayback();
  };

  return (
    <div
      className="status-viewer-modal fixed top-0 left-0 w-full h-full bg-black flex flex-col items-center justify-center"
      style={{ zIndex: 9999, position: "fixed" }}
    >
      <button
        onClick={onClose}
        className="absolute top-8 left-4 z-50 w-10 h-10 flex items-center justify-center bg-black bg-opacity-60 hover:bg-opacity-90 text-white rounded-full text-lg"
        style={{ zIndex: 120 }}
      >
        X
      </button>
      {isOwn && current?.id && (
        <button
          onClick={async () => {
            if (isDeleting) return;
            pausePlayback();
            setIsDeleting(true);
            const ok = await onDeleteStatus?.(current.id);
            setIsDeleting(false);
            if (!ok) {
              resumePlayback();
              return;
            }
            viewedIdsRef.current.add(`deleted:${current.id}`);
            if (safeItems.length > 1) {
              if (activeIndex >= filteredItems.length - 1) {
                setSkipCount((prev) => prev + 1);
                setIndex(Math.max(0, index - 1));
              } else {
                setIndex(index);
              }
              resumePlayback();
            } else {
              onClose?.();
            }
          }}
          className="absolute top-8 right-4 z-50 w-10 h-10 flex items-center justify-center bg-black bg-opacity-60 hover:bg-opacity-90 text-white rounded-full text-lg"
          style={{ marginRight: "35px", zIndex: 120 }}
        >
          <MdDeleteSweep size={20} />
        </button>
      )}
      {user && (
        <div
          className="absolute top-8 left-16 right-4 z-50"
          style={{ display: "flex", alignItems: "center", gap: "10px", color: "white" }}
        >
          <img
            src={user.avatar || "/img.jpg"}
            alt={user.username || "User"}
            style={{ width: "45px", height: "45px", borderRadius: "50%", objectFit: "cover" }}
          />
          <div style={{ fontWeight: 600 }}>
            {String(user.username || "User").length > 12
              ? `${String(user.username || "User").slice(0, 12)}...`
              : String(user.username || "User")}
            {timeLabel ? (
              <span style={{ marginLeft: "8px", fontSize: "12px", opacity: 0.8 }}>
                {timeLabel}
              </span>
            ) : null}
          </div>
          {isVideo && (
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              style={{
                marginLeft: "auto",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.4)",
                position:"absolute",
                
                color: "white",
                top:'80px',
                right:'25px',
                borderRadius: "999px",
                padding: "4px 10px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {isMuted ? "Muted" : "Sound"}
            </button>
          )}
          {timeLeft > 0 && (
            <div
              style={{
                marginLeft: isVideo ? "8px" : "auto",
                fontSize: "12px",
                opacity: 0.8,
              }}
            >
              {timeLeft}s
            </div>
          )}
        </div>
      )}

      <div
        className="absolute left-4 right-4 z-50"
        style={{ top: "100px", display: "flex", gap: "6px" }}
      >
        {safeItems.map((_, i) => {
          const isPast = i < index;
          const isActive = i === index;
          const scale = isPast ? 1 : isActive ? Math.max(0, Math.min(1, progress)) : 0;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: "4px",
                
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.65)",
                background: "transparent",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "rgba(255, 255, 255, 0.9)",
                  transform: `scaleX(${scale})`,
                  transformOrigin: "left",
                  transition: isVideo ? "none" : "transform 120ms linear",
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-center w-full"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={pausePlayback}
        onMouseUp={resumePlayback}
        onMouseLeave={resumePlayback}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "min(92vw, 520px)",
            aspectRatio: "9 / 16",
            maxHeight: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isVideo ? (
            <video
              key={current?.id}
              src={current?.mediaUrl}
              autoPlay
              playsInline
              controls={false}
              muted={isMuted}
              preload="auto"
              ref={videoRef}
              onLoadedData={() => setIsMediaLoading(false)}
              onError={() => setIsMediaLoading(false)}
              onLoadedMetadata={(e) => {
                const duration = e.currentTarget.duration || 0;
                if (duration > 0) {
                  setProgress(0);
                  setTimeLeft(Math.ceil(duration));
                }
              }}
              onTimeUpdate={(e) => {
                const duration = e.currentTarget.duration || 0;
                const currentTime = e.currentTarget.currentTime || 0;
                if (duration > 0) {
                  setProgress(currentTime / duration);
                  setTimeLeft(Math.max(0, Math.ceil(duration - currentTime)));
                }
              }}
              onEnded={() => {
                goNext();
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <ImageWithTimeout
              key={current?.id}
              src={current?.mediaUrl}
              duration={imageDurationMs}
              paused={isPaused}
              onLoad={() => setIsMediaLoading(false)}
              onError={() => setIsMediaLoading(false)}
              onProgress={(p, t) => {
                setProgress(p);
                setTimeLeft(t);
              }}
              onDone={() => {
                goNext();
              }}
              styleOverride={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          )}
        </div>

        {current?.caption ? (
          <div
            style={{
              position:'absolute',
              color: "white",
              bottom: "50px",
              fontSize: "15px",
              maxWidth: "88%",
              textAlign: "center",
            }}
          >
            {current.caption}
          </div>
        ) : null}

        {isOwn ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setViewerSheetOpen(true);
            }}
            role="button"
            tabIndex={0}
            style={{
              color: "rgba(255,255,255,0.9)",
              position:'absolute',
              bottom:'10px',
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              zIndex: 20,
            }}
          >
            <span>👁</span>
            <span>{Array.isArray(current?.viewedBy) ? current.viewedBy.length : 0}</span>
          </div>
        ) : null}

        <div
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "50%",
            cursor: "pointer",
            zIndex: 10,
          }}
        />
        <div
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "50%",
            cursor: "pointer",
            zIndex: 10,
          }}
        />
        {isMediaLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.35)",
              zIndex: 60,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.35)",
                borderTopColor: "#ffffff",
                animation: "statusLoaderSpin 0.8s linear infinite",
              }}
            />
          </div>
        )}
        {isDeleting && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.4)",
              zIndex: 80,
              color: "#fff",
              fontWeight: 600,
              gap: "10px",
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.35)",
                borderTopColor: "#ffffff",
                animation: "statusLoaderSpin 0.8s linear infinite",
              }}
            />
            Deleting...
          </div>
        )}
      </div>
      {viewerSheetOpen && (
        <div
          onClick={() => setViewerSheetOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 70,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              height: `${sheetHeight}dvh`,
              background: "#171a1f",
              borderTopLeftRadius: "18px",
              borderTopRightRadius: "18px",
              padding: "12px 16px 18px",
              boxShadow: "0 -8px 20px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              onPointerDown={startDrag}
              style={{
                alignSelf: "center",
                width: "64px",
                height: "7px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.35)",
                marginBottom: "10px",
                cursor: "grab",
                touchAction: "none",
              }}
            />
            <div
              style={{
                color: "#f7f8fc",
                fontWeight: 600,
                marginBottom: "10px",
              }}
            >
              Viewed by {viewedUsers.length}
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                paddingRight: "4px",
              }}
            >
              {viewerListLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "rgba(255,255,255,0.75)" }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.35)",
                      borderTopColor: "#ffffff",
                      animation: "statusLoaderSpin 0.8s linear infinite",
                    }}
                  />
                  Loading viewers...
                </div>
              ) : viewedUsers.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.7)" }}>
                  No views yet
                </div>
              ) : (
                viewedUsers.map((viewer) => (
                  <div
                    key={viewer.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <img
                      src={viewer.avatar || "/img.jpg"}
                      alt={viewer.name}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                    <div style={{ color: "#f7f8fc", fontWeight: 600 }}>
                      {viewer.name}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
