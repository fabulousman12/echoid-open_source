import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdDeleteSweep } from "react-icons/md";
import "./StatusViewer.css";

const STATUS_CAPTION_PREVIEW_LENGTH = 16;

function getCaptionPreview(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= STATUS_CAPTION_PREVIEW_LENGTH) return text;
  return `${text.slice(0, STATUS_CAPTION_PREVIEW_LENGTH)}..`;
}

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
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [mediaUnavailable, setMediaUnavailable] = useState(false);
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
  const fullCaption = String(current?.caption || "").trim();
  const truncatedCaption = getCaptionPreview(fullCaption);
  const hasExpandableCaption = fullCaption.length > STATUS_CAPTION_PREVIEW_LENGTH;
  const hideViewerChrome = isPaused && !captionExpanded && !viewerSheetOpen && !isMediaLoading;

  useEffect(() => {
    setProgress(0);
    setTimeLeft(0);
    setIsMuted(true);
    setIsPaused(false);
    setViewerSheetOpen(false);
    setIsMediaLoading(true);
    setCaptionExpanded(false);
    setMediaUnavailable(false);
  }, [index, current?.id]);

  useEffect(() => {
    if (!open) return;
    if (!current?.mediaUrl) {
      setMediaUnavailable(true);
      setIsMediaLoading(false);
      return;
    }
    setMediaUnavailable(false);
  }, [open, current?.mediaUrl]);

  useEffect(() => {
    if (!mediaUnavailable) return;
    setProgress(0);
    setTimeLeft(3);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(1, elapsed / 3000);
      setProgress(nextProgress);
      setTimeLeft(Math.max(0, Math.ceil((3000 - elapsed) / 1000)));
      if (elapsed >= 3000) {
        window.clearInterval(interval);
        goNext();
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [mediaUnavailable]);

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
    if (captionExpanded) {
      pausePlayback();
      return;
    }
    if (!viewerSheetOpen && !isMediaLoading && isPaused) {
      resumePlayback();
    }
  }, [captionExpanded, viewerSheetOpen, isMediaLoading]);

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

  const viewerContent = (
    <div
      className="status-viewer-modal fixed top-0 left-0 w-full h-full bg-black flex flex-col items-center justify-center"
      style={{ zIndex: 9999, position: "fixed" }}
    >
      <div
        className="status-viewer-stage flex-1 flex flex-col items-center justify-center w-full"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={pausePlayback}
        onMouseUp={resumePlayback}
        onMouseLeave={resumePlayback}
      >
        <div className="status-viewer-shell">
          <div className={`status-viewer-top-overlay ${hideViewerChrome ? "is-hidden" : ""}`}>
            <div className="status-viewer-progress-row">
              {safeItems.map((_, i) => {
                const isPast = i < index;
                const isActive = i === index;
                const scale = isPast ? 1 : isActive ? Math.max(0, Math.min(1, progress)) : 0;
                return (
                  <div key={i} className="status-viewer-progress-track">
                    <div
                      className="status-viewer-progress-fill"
                      style={{
                        transform: `scaleX(${scale})`,
                        transition: isVideo ? "none" : "transform 120ms linear",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="status-viewer-header-row">
              <button
                onClick={onClose}
                className="status-viewer-top-btn"
              >
                X
              </button>

              {user ? (
                <div className="status-viewer-user-meta">
                  <img
                    src={user.avatar || "/img.jpg"}
                    alt={user.username || "User"}
                    className="status-viewer-user-avatar"
                  />
                  <div className="status-viewer-user-copy">
                    <div className="status-viewer-user-name">
                      {String(user.username || "User").length > 16
                        ? `${String(user.username || "User").slice(0, 16)}...`
                        : String(user.username || "User")}
                    </div>
                    {timeLabel ? <div className="status-viewer-user-time">{timeLabel}</div> : null}
                  </div>
                </div>
              ) : <div className="status-viewer-user-meta" />}

              <div className="status-viewer-top-actions">
                {isVideo ? (
                  <button
                    type="button"
                    className="status-viewer-top-btn"
                    onClick={() => setIsMuted((prev) => !prev)}
                  >
                    {isMuted ? "Muted" : "Sound"}
                  </button>
                ) : null}
                {timeLeft > 0 ? <div className="status-viewer-top-time">{timeLeft}s</div> : null}
                {isOwn && current?.id ? (
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
                    className="status-viewer-top-btn"
                  >
                    <MdDeleteSweep size={18} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

        <div
          className="status-viewer-frame"
          style={{
            width: "100%",
            aspectRatio: "9 / 16",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mediaUnavailable ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                color: "rgba(255,255,255,0.88)",
                fontSize: "18px",
                fontWeight: 500,
                textAlign: "center",
                padding: "24px",
              }}
            >
              Status doesn&apos;t exist
            </div>
          ) : isVideo ? (
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
              onError={() => {
                setMediaUnavailable(true);
                setIsMediaLoading(false);
              }}
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
              onError={() => {
                setMediaUnavailable(true);
                setIsMediaLoading(false);
              }}
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

        {fullCaption && (!hideViewerChrome || captionExpanded) ? (
          <div
            className={`status-viewer-caption ${captionExpanded ? "is-expanded" : ""} ${isOwn ? "is-own" : ""} ${hasExpandableCaption ? "is-clickable" : ""}`}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasExpandableCaption) return;
              setCaptionExpanded((prev) => !prev);
            }}
            role={hasExpandableCaption ? "button" : undefined}
            tabIndex={hasExpandableCaption ? 0 : undefined}
            onKeyDown={(e) => {
              if (!hasExpandableCaption) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setCaptionExpanded((prev) => !prev);
              }
            }}
          >
            <div
              className="status-viewer-caption-text"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {captionExpanded ? fullCaption : truncatedCaption}
            </div>
          </div>
        ) : null}

        {isOwn && !hideViewerChrome ? (
          <div
            className="status-viewer-own-views"
            onClick={(e) => {
              e.stopPropagation();
              setViewerSheetOpen(true);
            }}
            role="button"
            tabIndex={0}
            style={{
              position:'absolute',
              right: "14px",
              bottom:'10px',
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
          className={`status-viewer-nav-zone status-viewer-nav-zone--left ${captionExpanded ? "is-disabled" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (captionExpanded) return;
            goPrev();
          }}
        />
        <div
          className={`status-viewer-nav-zone status-viewer-nav-zone--right ${captionExpanded ? "is-disabled" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (captionExpanded) return;
            goNext();
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

  if (typeof document !== "undefined" && document.body) {
    return createPortal(viewerContent, document.body);
  }

  return viewerContent;
}
