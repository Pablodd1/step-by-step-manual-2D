import { useEffect, useRef, useState } from "react";
import { RotateCcw, Ruler, ZoomIn, ZoomOut } from "lucide-react";
import type { Guide } from "@contracts/guide";
import { useAuth } from "@/contexts/AuthContext";
import { renderBlueprint2DFrame } from "./renderBlueprint2D";

interface Blueprint2DOverlayProps {
  guide: Guide;
  currentTime: number;
}

export function Blueprint2DOverlay({ guide, currentTime }: Blueprint2DOverlayProps) {
  const { unitSystem, toggleUnitSystem } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [activeHotspot, setActiveHotspot] = useState<
    "plumb" | "joint" | "loupe" | "outlet" | null
  >(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(640, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(360, Math.round(wrap.clientHeight * dpr));
      renderBlueprint2DFrame(canvas, guide, currentTime, w, h, {
        unitSystem,
        activeHotspot,
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [guide, currentTime, unitSystem, activeHotspot]);

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.18 : -0.18;
    setZoom((z) => {
      const next = Math.min(2.8, Math.max(1, Number((z + delta).toFixed(2))));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  return (
    <div
      ref={wrapRef}
      className="blueprint-2d-overlay"
      aria-label="2D orthographic blueprint schematic"
      onWheel={handleWheel}
      onPointerDown={(e) => {
        if (zoom <= 1) return;
        setDragging(true);
        dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      <canvas
        ref={canvasRef}
        className="blueprint-2d-canvas"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default",
        }}
      />

      <div className="blueprint-2d-hud" onPointerDown={(e) => e.stopPropagation()}>
        <div className="blueprint-hotspot-bar" role="group" aria-label="2D CAD Callout Hotspots">
          <button
            type="button"
            className={activeHotspot === "plumb" ? "active" : ""}
            onClick={() => setActiveHotspot((h) => (h === "plumb" ? null : "plumb"))}
          >
            A: Plumb Datum
          </button>
          <button
            type="button"
            className={activeHotspot === "joint" ? "active" : ""}
            onClick={() => setActiveHotspot((h) => (h === "joint" ? null : "joint"))}
          >
            B: Section A-A
          </button>
          <button
            type="button"
            className={activeHotspot === "loupe" ? "active" : ""}
            onClick={() => setActiveHotspot((h) => (h === "loupe" ? null : "loupe"))}
          >
            C: 3× Loupe
          </button>
          <button
            type="button"
            className={activeHotspot === "outlet" ? "active" : ""}
            onClick={() => setActiveHotspot((h) => (h === "outlet" ? null : "outlet"))}
          >
            D: Safety Box
          </button>
        </div>

        <div className="blueprint-zoom-bar">
          <button
            type="button"
            onClick={toggleUnitSystem}
            title="Switch between Metric (cm/mm) and US Imperial (ft/in)"
          >
            <Ruler size={13} /> {unitSystem === "metric" ? "CM / MM" : "FT / IN"}
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.8, Number((z + 0.25).toFixed(2))))}
            title="Zoom in 2D Blueprint"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom((z) => {
                const next = Math.max(1, Number((z - 0.25).toFixed(2)));
                if (next === 1) setPan({ x: 0, y: 0 });
                return next;
              });
            }}
            title="Zoom out 2D Blueprint"
          >
            <ZoomOut size={13} />
          </button>
          {zoom > 1 && (
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="Reset 2D zoom"
            >
              <RotateCcw size={13} /> {zoom.toFixed(1)}×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
