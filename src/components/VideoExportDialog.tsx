import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileVideo, LoaderCircle, Square, Video, X } from "lucide-react";
import { guideTimeAtStep, guideTotalDuration, type Guide } from "@contracts/guide";
import type { GuideEngine } from "@/scene/GuideEngine";
import { exportGuideVideo, type ExportScope } from "@/lib/exportGuideVideo";

interface VideoExportDialogProps {
  guide: Guide;
  engine: GuideEngine;
  onClose: () => void;
}

type ExportStatus = "idle" | "exporting" | "cancelling" | "done" | "error" | "cancelled";

export function VideoExportDialog({ guide, engine, onClose }: VideoExportDialogProps) {
  const stepIndex = useRef(engine.getCurrentStepIndex()).current;
  const [scope, setScope] = useState<ExportScope>("step");
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [message, setMessage] = useState("");
  const [download, setDownload] = useState<{ url: string; name: string; size: number; frames: number; duration: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const duration = useMemo(() => scope === "step" ? guide.steps[stepIndex].duration : guideTotalDuration(guide), [guide, scope, stepIndex]);
  const frames = Math.round(duration * 30);
  const busy = status === "exporting" || status === "cancelling";
  const percent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && statusRef.current !== "exporting" && statusRef.current !== "cancelling") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!canvasRef.current || busy) return;
    const originalTime = engine.getCurrentTime();
    const originalPosition = engine.camera.position.clone();
    const originalTarget = engine.controls.target.clone();
    const seconds = scope === "step" ? guideTimeAtStep(guide, stepIndex) + 0.02 : 0.02;
    engine.renderExportFrame(canvasRef.current, seconds, 960, 540);
    engine.seekGlobal(originalTime);
    engine.camera.position.copy(originalPosition);
    engine.controls.target.copy(originalTarget);
    engine.controls.update();
  }, [busy, engine, guide, scope, stepIndex]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (download) URL.revokeObjectURL(download.url);
  }, [download]);

  const start = async () => {
    if (busy) return;
    if (download) URL.revokeObjectURL(download.url);
    setDownload(null);
    setMessage("");
    setProgress({ completed: 0, total: frames });
    setStatus("exporting");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await exportGuideVideo({
        guide,
        engine,
        scope,
        stepIndex,
        signal: controller.signal,
        onProgress: (completed, total) => setProgress({ completed, total }),
      });
      const url = URL.createObjectURL(result.blob);
      setDownload({ url, name: result.fileName, size: result.blob.size, frames: result.frames, duration: result.duration });
      setStatus("done");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("cancelled");
        setMessage("Export cancelled. No incomplete file was kept; the interactive scene was restored.");
      } else {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "The MP4 could not be created.");
      }
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <div className="modal-backdrop video-dialog-backdrop">
      <div className="video-dialog" role="dialog" aria-modal="true" aria-labelledby="video-export-title">
        <header className="export-dialog-header">
          <div><p className="mono-kicker">DETERMINISTIC MP4 EXPORT</p><h2 id="video-export-title">Render the field guide.</h2></div>
          <button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close video export"><X size={20} /></button>
        </header>
        <div className="video-export-layout">
          <div className="video-preview-column">
            <canvas ref={canvasRef} className="video-preview-canvas" width={960} height={540} aria-label="First frame of the planned video export" />
            <div className="video-specs"><span>1920 × 1080</span><span>30 FPS</span><span>H.264 / MP4</span><span>SILENT</span></div>
          </div>
          <div className="video-export-controls">
            {!busy && status !== "done" && <>
              <h3>Export range</h3>
              <div className="export-scope-options">
                <button className={scope === "step" ? "active" : ""} onClick={() => setScope("step")} aria-pressed={scope === "step"}><span>Current step</span><small>{String(stepIndex + 1).padStart(2, "0")} · {guide.steps[stepIndex].shortTitle}</small></button>
                <button className={scope === "guide" ? "active" : ""} onClick={() => setScope("guide")} aria-pressed={scope === "guide"}><span>Complete guide</span><small>{guide.steps.length} steps · {Math.round(guideTotalDuration(guide))} seconds</small></button>
              </div>
              <dl className="export-summary"><div><dt>Timeline</dt><dd>{duration.toFixed(0)} seconds</dd></div><div><dt>Fixed frames</dt><dd>{frames.toLocaleString()}</dd></div><div><dt>Instruction overlay</dt><dd>Same guide data</dd></div></dl>
              <p className="export-explainer">Frames are rendered sequentially at exact timeline positions, not captured in real time. Keep this tab open. Full guides can take several minutes on slower devices.</p>
              <p className="export-explainer">The MP4 is silent and includes on-scene instructions; browser speech narration is not mixed into the file.</p>
            </>}

            {busy && <div className="export-progress" aria-live="polite">
              <LoaderCircle size={27} className="spin" />
              <h3>{status === "cancelling" ? "Cancelling safely…" : "Rendering fixed frames…"}</h3>
              <strong>{percent}%</strong>
              <progress max={100} value={percent} aria-label="Video export progress" />
              <p>{progress.completed.toLocaleString()} / {progress.total.toLocaleString()} frames · {percent}%</p>
              <button className="secondary-button" onClick={() => { abortRef.current?.abort(); setStatus("cancelling"); }} disabled={status === "cancelling"}><Square size={15} /> Cancel export</button>
            </div>}

            {status === "done" && download && <div className="export-complete">
              <CheckCircle2 size={35} />
              <h3>Your MP4 is ready.</h3>
              <p>{download.frames.toLocaleString()} frames · {download.duration.toFixed(0)} seconds · {(download.size / 1024 / 1024).toFixed(1)} MB</p>
              <a className="primary-button" href={download.url} download={download.name}><Download size={18} /> Download MP4</a>
              <button className="secondary-button" onClick={() => { setStatus("idle"); setDownload(null); }}>Export another range</button>
            </div>}

            {(status === "error" || status === "cancelled") && <div className={`export-message ${status}`} role="alert"><AlertCircle size={18} /><p>{message}</p></div>}
            {!busy && status !== "done" && <button className="primary-button full-width export-start" onClick={start}><Video size={18} /> {status === "error" || status === "cancelled" ? "Try export again" : `Render ${scope === "step" ? "current step" : "complete guide"}`}</button>}
            {!busy && status !== "done" && <p className="export-compatibility"><FileVideo size={14} /> H.264 support is checked before any frames are rendered.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
