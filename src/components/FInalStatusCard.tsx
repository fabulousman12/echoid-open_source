'use client';

import React from 'react';

interface StatusCardProps {
  /**
   * URL of the image to display in the center circle
   */
  centerImageSrc: string;
  /**
   * Alt text for the center image
   */
  centerImageAlt?: string;
  /**
   * URL of the background image
   */
  backgroundImageSrc: string;
  /**
   * Status text or label to display (e.g., "Online", "Active", "Away")
   */
  status: string;
  /**
   * Optional title or name to display
   */
  title?: string;
  /**
   * Optional subtitle or description
   */
  subtitle?: string;
  /**
   * Width of the card in pixels or Tailwind class
   */
  width?: number | string;
  /**
   * Height of the card in pixels or Tailwind class
   */
  height?: number | string;
  /**
   * Size of the center circle image in pixels
   */
  circleSize?: number;
  /**
   * Status badge color (for status indicator dot)
   */
  statusColor?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

const BORDER_GRADIENT_STYLES = `
  @keyframes gradientRotate {
    0% { 
      background-position: 0% 50%;
    }
    50% { 
      background-position: 100% 50%;
    }
    100% { 
      background-position: 0% 50%;
    }
  }
`;

const STATUS_COLOR_MAP: Record<string, string> = {
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  gray: '#6b7280',
};

export default function StatusCard({
  centerImageSrc,
  centerImageAlt = 'Status image',
  backgroundImageSrc,
  status,
  title,
  subtitle,
  width = 200,
  height = 300,
  circleSize = 70,
  statusColor = 'green',
  onClick,
}: StatusCardProps) {
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;
  const resolvedBackground = backgroundImageSrc || centerImageSrc || "/placeholder.svg";


  return (
    <div
      className="status-final-card"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "14px",
        boxShadow: "0 8px 18px rgba(0,0,0,0.22)",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s ease",
        width: widthStyle,
        height: heightStyle,
        backgroundImage: `url('${resolvedBackground}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={onClick}
    >
      {/* Overlay to improve text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Content container */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "14px",
        }}
      >
        {/* Circular image container with animated gradient border */}
        <div
          style={{
            position: "relative",
            flexShrink: 0,
            borderRadius: "999px",
            padding: "4px",
            boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
            overflow: "hidden",
            width: `${circleSize + 8}px`,
            height: `${circleSize + 8}px`,
            background: 'linear-gradient(45deg, #ff006e, #00d4ff, #00ff88, #ff006e)',
            backgroundSize: '300% 300%',
            animation: 'gradientRotate 6s ease infinite',
          }}
        >
          <style>{BORDER_GRADIENT_STYLES}</style>
          <div
            style={{
              borderRadius: "999px",
              overflow: "hidden",
              background: "#ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              width: '100%',
              height: '100%',
            }}
          >
            <img
              src={centerImageSrc || "/placeholder.svg"}
              alt={centerImageAlt}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />

            {/* Status indicator dot */}
            <div
              style={{
                position: "absolute",
                right: 4,
                bottom: 4,
                width: 12,
                height: 12,
                borderRadius: "999px",
                border: "2px solid #ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                backgroundColor: STATUS_COLOR_MAP[statusColor] || STATUS_COLOR_MAP.green,
              }}
            />
          </div>
        </div>

        {/* Text content */}
        {title && (
          <div
            style={{
              width: "100%",
              textAlign: "center",
              color: "#f7f8fc",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            {title}
          </div>
        )}
      </div>
    </div>
  );
}
