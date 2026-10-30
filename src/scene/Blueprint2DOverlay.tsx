import { useEffect, useRef } from "react";
import type { Guide } from "@contracts/guide";
import { renderBlueprint2DFrame } from "./renderBlueprint2D";

interface Blueprint2DOverlayProps {
  guide: Guide;
  currentTime: number;
}

export function Blueprint2DOverlay({ guide, currentTime }: Blueprint2DOverlayProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(640, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(360, Math.round(wrap.clientHeight * dpr));
      renderBlueprint2DFrame(canvas, guide, currentTime, w, h);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [guide, currentTime]);

  return (
    <div ref={wrapRef} className="blueprint-2d-overlay" aria-label="2D orthographic blueprint schematic">
      <canvas ref={canvasRef} className="blueprint-2d-canvas" />
    </div>
  );
}
