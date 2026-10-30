import { useEffect, useRef } from "react";
import type { Guide } from "@contracts/guide";
import { WallpaperScene, type SceneStyle } from "@/scene/WallpaperScene";
import { PanelTrainingScene } from "@/scene/PanelTrainingScene";
import type { GuideEngine } from "@/scene/GuideEngine";

interface SceneCanvasProps {
  guide: Guide;
  time: number;
  style: SceneStyle;
  onReady: (engine: GuideEngine) => void;
}

export function SceneCanvas({ guide, time, style, onReady }: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GuideEngine | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = guide.product
      ? new PanelTrainingScene(canvasRef.current, guide)
      : new WallpaperScene(canvasRef.current, guide);
    engineRef.current = engine;
    readyRef.current(engine);
    const observer = new ResizeObserver(() => engine.resize());
    if (canvasRef.current.parentElement) observer.observe(canvasRef.current.parentElement);
    return () => {
      observer.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
    // The engine is intentionally created once; guide changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setGuide(guide);
  }, [guide]);

  useEffect(() => {
    engineRef.current?.seekGlobal(time);
  }, [time]);

  useEffect(() => {
    engineRef.current?.setStyle(style);
  }, [style]);

  return (
    <div className="scene-canvas-wrap" data-testid="scene-canvas-wrap">
      <div className="scene-poster" aria-hidden="true">
        <span className="poster-wall" />
        <span className="poster-drop poster-drop-one" />
        <span className="poster-drop poster-drop-two" />
      </div>
      <canvas ref={canvasRef} className="scene-canvas" aria-label={`Interactive 3D scene for ${guide.title}. Drag to orbit, scroll or pinch to zoom.`} />
    </div>
  );
}
