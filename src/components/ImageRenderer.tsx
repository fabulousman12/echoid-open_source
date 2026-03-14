import React, { useEffect, useRef, useState } from 'react';
import { IonSpinner,IonImg } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import imga from '../../public/favicon.png';

interface Props {
  src: string;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
  onClick?: () => void;
  zoomable?: boolean;
  maxZoom?: number;
}

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

const ImageRenderer: React.FC<Props> = ({
  src,
  style,
  className,
  alt = 'Preview',
  onClick,
  zoomable = false,
  maxZoom = 4,
}) => {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
    offset: { x: number; y: number };
    center: { x: number; y: number };
  } | null>(null);
  const movedRef = useRef(false);

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const getBounds = (nextScale: number) => {
    const el = containerRef.current;
    if (!el) return { maxX: 0, maxY: 0 };
    const maxX = Math.max(0, (el.clientWidth * nextScale - el.clientWidth) / 2);
    const maxY = Math.max(0, (el.clientHeight * nextScale - el.clientHeight) / 2);
    return { maxX, maxY };
  };

  const clampOffset = (nextOffset: { x: number; y: number }, nextScale: number) => {
    const { maxX, maxY } = getBounds(nextScale);
    return {
      x: clamp(nextOffset.x, -maxX, maxX),
      y: clamp(nextOffset.y, -maxY, maxY),
    };
  };

  const normalizeSource = (input: string) => {
    if (!input) return input;
    if (
      input.startsWith("http://") ||
      input.startsWith("https://") ||
      input.startsWith("data:") ||
      input.startsWith("blob:")
    ) {
      return input;
    }
    if (input.startsWith("file://")) return Capacitor.convertFileSrc(input);
    if (input.startsWith("/")) return Capacitor.convertFileSrc(`file://${input}`);
    if (input.includes("://")) return input;
    return Capacitor.convertFileSrc(`file://${input}`);
  };

  useEffect(() => {
    let retries = 0;
    let stopped = false;

    const resolvePath = async () => {
      setLoading(true);
      setScale(1);
      setOffset({ x: 0, y: 0 });

      const normalized = normalizeSource(src);
      if (
        normalized.startsWith("http://") ||
        normalized.startsWith("https://") ||
        normalized.startsWith("data:") ||
        normalized.startsWith("blob:")
      ) {
        setUri(normalized);
        setLoading(false);
        return;
      }

      while (!stopped && retries < MAX_RETRIES) {
        try {
          // Try fetching to ensure it's available
          const response = await fetch(normalized, { method: 'GET' });

          if (response.ok) {
            setUri(normalized);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error(`Attempt ${retries + 1} failed:`, error);
        }

        retries++;
        await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
      }

      // Fallback image after retries
      setUri(imga);
      setLoading(false);
    };

    resolvePath();

    return () => {
      stopped = true;
    };
  }, [src]);

  useEffect(() => {
    const stopMousePan = () => {
      panStartRef.current = null;
      setIsInteracting(false);
    };
    window.addEventListener("mouseup", stopMousePan);
    return () => window.removeEventListener("mouseup", stopMousePan);
  }, []);

  const zoomAtPoint = (clientX: number, clientY: number, nextScale: number) => {
    const el = containerRef.current;
    if (!el) return;
    const clampedScale = clamp(nextScale, 1, maxZoom);
    const rect = el.getBoundingClientRect();
    const anchorX = clientX - rect.left - rect.width / 2;
    const anchorY = clientY - rect.top - rect.height / 2;
    const ratio = clampedScale / scale;
    const nextOffset = {
      x: anchorX + (offset.x - anchorX) * ratio,
      y: anchorY + (offset.y - anchorY) * ratio,
    };
    setScale(clampedScale);
    setOffset(clampOffset(nextOffset, clampedScale));
  };

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const getTouchCenter = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  if (loading) return <IonSpinner name="dots" />;

  if (!uri) return <div>Failed to load image</div>;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        maxWidth: "min(92vw, 520px)",
        aspectRatio: "9 / 16",
        maxHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        touchAction: zoomable ? "none" : "auto",
        ...style,
      }}
      onDoubleClick={(e) => {
        if (!zoomable) return;
        if (scale > 1) {
          setScale(1);
          setOffset({ x: 0, y: 0 });
        } else {
          zoomAtPoint(e.clientX, e.clientY, 2);
        }
      }}
      onWheel={(e) => {
        if (!zoomable) return;
        e.preventDefault();
        const step = e.deltaY < 0 ? 0.2 : -0.2;
        zoomAtPoint(e.clientX, e.clientY, scale + step);
      }}
      onMouseDown={(e) => {
        if (!zoomable || scale <= 1) return;
        setIsInteracting(true);
        panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      }}
      onMouseMove={(e) => {
        if (!zoomable || !panStartRef.current || scale <= 1) return;
        movedRef.current = true;
        const nextOffset = {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        };
        setOffset(clampOffset(nextOffset, scale));
      }}
      onTouchStart={(e) => {
        if (!zoomable) return;
        if (e.touches.length === 2) {
          const [t1, t2] = Array.from(e.touches);
          pinchStartRef.current = {
            distance: getTouchDistance(t1, t2),
            scale,
            offset,
            center: getTouchCenter(t1, t2),
          };
          setIsInteracting(true);
          return;
        }
        if (e.touches.length === 1 && scale > 1) {
          const t = e.touches[0];
          panStartRef.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
          setIsInteracting(true);
        }
      }}
      onTouchMove={(e) => {
        if (!zoomable) return;
        if (e.touches.length === 2 && pinchStartRef.current) {
          e.preventDefault();
          movedRef.current = true;
          const [t1, t2] = Array.from(e.touches);
          const currentDistance = getTouchDistance(t1, t2);
          const currentCenter = getTouchCenter(t1, t2);
          const start = pinchStartRef.current;
          const nextScale = clamp((start.scale * currentDistance) / start.distance, 1, maxZoom);

          const el = containerRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const anchorX = start.center.x - rect.left - rect.width / 2;
          const anchorY = start.center.y - rect.top - rect.height / 2;
          const ratio = nextScale / start.scale;
          const nextOffset = {
            x:
              anchorX +
              (start.offset.x - anchorX) * ratio +
              (currentCenter.x - start.center.x),
            y:
              anchorY +
              (start.offset.y - anchorY) * ratio +
              (currentCenter.y - start.center.y),
          };

          setScale(nextScale);
          setOffset(clampOffset(nextOffset, nextScale));
          return;
        }

        if (e.touches.length === 1 && panStartRef.current && scale > 1) {
          e.preventDefault();
          movedRef.current = true;
          const t = e.touches[0];
          const nextOffset = {
            x: t.clientX - panStartRef.current.x,
            y: t.clientY - panStartRef.current.y,
          };
          setOffset(clampOffset(nextOffset, scale));
        }
      }}
      onTouchEnd={(e) => {
        if (!zoomable) return;
        if (e.touches.length === 0) {
          panStartRef.current = null;
          pinchStartRef.current = null;
          setIsInteracting(false);
        } else if (e.touches.length === 1 && scale > 1) {
          const t = e.touches[0];
          panStartRef.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
          pinchStartRef.current = null;
          setIsInteracting(true);
        }
        if (scale <= 1) {
          setOffset({ x: 0, y: 0 });
        }
      }}
    >
      <IonImg
        src={uri}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transformOrigin: "center center",
          transition: isInteracting ? "none" : "transform 140ms ease",
          cursor: zoomable ? (isInteracting ? "grabbing" : scale > 1 ? "grab" : "zoom-in") : "default",
        }}
        onClick={(e) => {
          if (movedRef.current) {
            movedRef.current = false;
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onClick?.();
        }}
      />
    </div>
  );
};

export default ImageRenderer;
