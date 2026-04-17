import React, { useState, useRef, useMemo } from "react";
import { useHistory } from "react-router";
import { ArrowLeft, ZoomIn, ZoomOut } from "lucide-react";
import "./EchoIdPage.css";

const GRID_SIZE = 50;
const TILE_SIZE = 128;
const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;

const getTileType = (x, y) => {
  // Buildings block in center
  if (x >= 23 && x <= 27 && y >= 23 && y <= 27) {
    return "building";
  }

  // Ring road
  if (
    (x >= 17 && x <= 33 && (y === 17 || y === 33)) ||
    (y >= 17 && y <= 33 && (x === 17 || x === 33))
  ) {
    return "road";
  }

  // Radiating roads from the ring road to out margins
  if ((x === 25 && (y < 17 || y > 33)) || (y === 25 && (x < 17 || x > 33))) {
    return "road";
  }

  // Park block
  if (x >= 18 && x <= 32 && y >= 18 && y <= 32) {
    return "park";
  }

  return "default";
};

const EchoIdPage = () => {
  const history = useHistory();
  const containerRef = useRef(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const isDragging = useRef(false);
  const startDragPos = useRef({ x: 0, y: 0 });

  const initialDistance = useRef(null);
  const initialScale = useRef(null);

  const boundPosition = (x, y, currentScale) => {
    // We roughly estimate the isometric bounds
    // Since the actual size changes after rotation, we give generous bounds
    const mapWidth = GRID_SIZE * TILE_SIZE * currentScale * 2; 
    const mapHeight = GRID_SIZE * TILE_SIZE * currentScale * 2;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const minX = Math.min(-mapWidth, viewportWidth - mapWidth);
    const maxX = Math.max(mapWidth, mapWidth);
    const minY = Math.min(-mapHeight, window.innerHeight - mapHeight);
    const maxY = Math.max(mapHeight, mapHeight);

    // Allowing flexible boundaries because of isometric skew
    return {
      x: x, //Math.max(minX, Math.min(maxX, x)),
      y: y  //Math.max(minY, Math.min(maxY, y))
    };
  };

  const updateScale = (newScale) => {
    newScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    setScale(newScale);
    setPosition((prev) => boundPosition(prev.x, prev.y, newScale));
  };

  const handlePointerDown = (e) => {
    if (e.touches && e.touches.length > 1) return;

    isDragging.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    startDragPos.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  const handlePointerMove = (e) => {
    if (e.touches && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );

      if (initialDistance.current === null) {
        initialDistance.current = dist;
        initialScale.current = scale;
      } else {
        const delta = dist / initialDistance.current;
        updateScale(initialScale.current * delta);
      }
      return;
    }

    if (!isDragging.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newX = clientX - startDragPos.current.x;
    const newY = clientY - startDragPos.current.y;

    setPosition(boundPosition(newX, newY, scale));
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    initialDistance.current = null;
    initialScale.current = null;
  };

  const handleWheel = (e) => {
    const zoomAmount = -e.deltaY * 0.001;
    updateScale(scale * (1 + zoomAmount));
  };

  const tiles = useMemo(() => {
    const arr = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const type = getTileType(x, y);
        
        arr.push(
          <div key={`${x}-${y}`} className={`city-tile ${type}`}>
             {type === "building" && (
                <div className="building-shape">
                   <div className="face top"></div>
                   <div className="face left"></div>
                   <div className="face right"></div>
                </div>
             )}
            {/* Provide coords loosely for blueprint look if not a building */}
            {type !== "building" && <span className="coord">{x},{y}</span>}
          </div>
        );
      }
    }
    return arr;
  }, []);

  return (
    <div
      className="echoid-page"
      onWheel={handleWheel}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
    >
      <div className="echoid-topbar-layer">
        <button className="echoid-back" onClick={() => history.goBack()}>
          <ArrowLeft size={18} color="white" />
        </button>
        <h1>Echo Id City Blueprint</h1>
      </div>

      <div
        ref={containerRef}
        className="map-container"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
      >
        <div className="city-grid isometric-view">{tiles}</div>
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => updateScale(scale * 1.5)}>
          <ZoomIn size={24} />
        </button>
        <button className="zoom-btn" onClick={() => updateScale(scale / 1.5)}>
          <ZoomOut size={24} />
        </button>
      </div>
    </div>
  );
};

export default EchoIdPage;