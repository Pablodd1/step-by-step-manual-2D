import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, FileVideo, LoaderCircle, Square, Video, X } from "lucide-react";
import { exportLessonVideo, planLessonExport, type ExportedLessonVideo, type LessonExportScope } from "../lesson/exportLessonVideo";
import { pacedTotalSeconds } from "../lesson/pacing";
import type { LessonDefinition, LessonRenderer, LessonStyle } from "../lesson/types";

interface Props {
  open: boolean;
  lesson: LessonDefinition;
  renderer: LessonRenderer | null;
  currentStep: number;
  onClose: () => void;
}

type Status = "idle" | "exporting" | "cancelling" | "done" | "error" | "cancelled";

const FPS = 30;
const minutes = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function LessonVideoDialog({ open, lesson, renderer, currentStep, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [scope, setScope] = useState<LessonExportScope>("lesson");
  const [style, setStyle] = useState<LessonStyle>("room");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ video: ExportedLessonVideo; videoUrl: string; vttUrl: string } | null>(null);

  const plan = useMemo(() => planLessonExport(lesson, scope, currentStep, FPS), [lesson, scope, currentStep]);
  const busy = status === "exporting" || status === "cancelling";
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => () => {
    if (result) {
      URL.revokeObjectURL(result.videoUrl);
      URL.revokeObjectURL(result.vttUrl);
    }
  }, [result]);

  const start = async () => {
    if (!renderer || busy) return;
    setResult(null);
    setMessage("");
    setProgress({ done: 0, total: plan.totalFrames });
    setStatus("exporting");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const video = await exportLessonVideo({
        lesson,
        renderer,
        scope,
        stepIndex: currentStep,
        style,
        fps: FPS,
        includeAudio: audioEnabled,
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setResult({
        video,
        videoUrl: URL.createObjectURL(video.blob),
        vttUrl: URL.createObjectURL(new Blob([video.vtt], { type: "text/vtt" })),
      });
      setStatus("done");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("cancelled");
        setMessage("Export cancelled. No incomplete file was kept and the interactive scene was restored.");
      } else {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "The MP4 could not be created.");
      }
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <dialog
      ref={ref}
      className="evidence-dialog lesson-video-dialog"
      onClose={() => { if (!busy) onClose(); }}
      onCancel={(event) => { if (busy) event.preventDefault(); }}
    >
      <div className="evidence-dialog-inner">
        <header>
          <div>
            <span className="ui-label">Deterministic MP4 export</span>
            <h2>Render the video manual</h2>
          </div>
          <button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close video export"><X size={19} /></button>
        </header>

        {!busy && status !== "done" && (
          <>
            <div className="export-options" role="group" aria-label="Export range">
              <button className={scope === "lesson" ? "selected" : ""} aria-pressed={scope === "lesson"} onClick={() => setScope("lesson")}>
                <strong>Complete lesson</strong>
                <small>{lesson.steps.length} steps · {minutes(pacedTotalSeconds(lesson.steps))}</small>
              </button>
              <button className={scope === "step" ? "selected" : ""} aria-pressed={scope === "step"} onClick={() => setScope("step")}>
                <strong>Current step</strong>
                <small>{String(currentStep + 1).padStart(2, "0")} · {lesson.steps[currentStep].shortTitle}</small>
              </button>
            </div>
            <div className="export-options" role="group" aria-label="Visual style">
              <button className={style === "room" ? "selected" : ""} aria-pressed={style === "room"} onClick={() => setStyle("room")}>
                <strong>Realistic 3D</strong><small>Lit room, soft shadows</small>
              </button>
              <button className={style === "drawing" ? "selected" : ""} aria-pressed={style === "drawing"} onClick={() => setStyle("drawing")}>
                <strong>CAD line drawing</strong><small>Ink outlines on white</small>
              </button>
            </div>
            <div className="export-options" role="group" aria-label="Audio soundtrack">
              <button className={audioEnabled ? "selected" : ""} aria-pressed={audioEnabled} onClick={() => setAudioEnabled(true)}>
                <strong>Instructional audio cues</strong><small>AAC 48kHz (intro chord, step chimes, tool sounds)</small>
              </button>
              <button className={!audioEnabled ? "selected" : ""} aria-pressed={!audioEnabled} onClick={() => setAudioEnabled(false)}>
                <strong>Silent video</strong><small>Video with .vtt subtitles sidecar only</small>
              </button>
            </div>
            <dl className="export-summary">
              <div><dt>Format</dt><dd>1920×1080 · {FPS} fps · H.264 MP4</dd></div>
              <div><dt>Length</dt><dd>{minutes(plan.seconds)} ({plan.totalFrames.toLocaleString()} frames)</dd></div>
              <div><dt>Audio</dt><dd>{audioEnabled ? "Stereo AAC (synced tone cues & sound design)" : "Silent in file (WebVTT subtitle sidecar provided)"}</dd></div>
            </dl>
            <p className="dialog-copy">
              Each step is paced so its text can be read or narrated (about 150 words per minute), so the video is longer than the
              {" "}interactive animation timeline. Frames are rendered one by one at exact times, not recorded live. Keep this tab open.
              Burned-in captions repeat the on-screen instruction and the safety disclaimer.
            </p>
          </>
        )}

        {busy && (
          <div className="export-progress" aria-live="polite">
            <LoaderCircle size={26} className="spin" />
            <h3>{status === "cancelling" ? "Cancelling safely…" : "Rendering fixed frames…"}</h3>
            <progress max={100} value={percent} aria-label="Video export progress" />
            <p>{progress.done.toLocaleString()} / {progress.total.toLocaleString()} frames · {percent}%</p>
            <button className="text-button" disabled={status === "cancelling"} onClick={() => { abortRef.current?.abort(); setStatus("cancelling"); }}>
              <Square size={14} /> Cancel export
            </button>
          </div>
        )}

        {status === "done" && result && (
          <div className="export-complete">
            <div className="export-complete-header">
              <CheckCircle2 size={30} />
              <div>
                <h3>Your video manual is ready</h3>
                <p>
                  {result.video.frames.toLocaleString()} frames · {minutes(result.video.seconds)} · {(result.video.blob.size / 1024 / 1024).toFixed(1)} MB · {result.video.hasAudio ? "AAC audio track" : "Silent"}
                </p>
              </div>
            </div>
            <div className="export-video-preview">
              <video
                controls
                playsInline
                preload="metadata"
                src={result.videoUrl}
                className="export-preview-player"
              >
                <track default kind="subtitles" src={result.vttUrl} srcLang="en" label="English" />
              </video>
            </div>
            <div className="export-downloads">
              <a className="next-step-button" href={result.videoUrl} download={result.video.fileName}><Download size={16} /> Download MP4</a>
              <a className="text-button" href={result.vttUrl} download={result.video.vttFileName}><FileText size={16} /> Subtitles (.vtt)</a>
              <button className="text-button" onClick={() => { setStatus("idle"); setResult(null); }}>Export another</button>
            </div>
          </div>
        )}

        {(status === "error" || status === "cancelled") && (
          <div className={`export-message ${status}`} role="alert"><AlertCircle size={18} /><p>{message}</p></div>
        )}

        {!busy && status !== "done" && (
          <>
            <button className="next-step-button export-start" onClick={start} disabled={!renderer}>
              <Video size={17} /> {status === "error" || status === "cancelled" ? "Try export again" : scope === "lesson" ? "Render complete lesson" : "Render current step"}
            </button>
            <p className="export-compat"><FileVideo size={13} /> H.264 support is checked before any frame is rendered; if unsupported, no file is produced.</p>
          </>
        )}
      </div>
    </dialog>
  );
}
