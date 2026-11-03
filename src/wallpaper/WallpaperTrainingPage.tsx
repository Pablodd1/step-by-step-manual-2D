import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Keyboard,
  LockKeyhole,
  Pause,
  Play,
  Printer,
  RotateCcw,
  Rewind,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Film,
  X,
  ZoomIn,
  Layers,
  Tag,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { ManualToolArt, type ManualToolIconKind } from "../components/ManualLineArt";
import { WallpaperScene, type ToolId } from "./WallpaperScene";
import { ReferenceDrawing } from "./ReferenceDrawing";
import { LearningCheck } from "./LearningCheck";
import { LessonVideoDialog } from "./LessonVideoDialog";
import { wallpaperLesson } from "./lesson";
import { playLiveStepCue } from "../lesson/audioEngine";
import { pacedStepSeconds, spokenText } from "../lesson/pacing";
import {
  canAccessStep,
  getSource,
  pasteTheWallGuide,
  totalAnimationSeconds,
  type GuidanceLevel
} from "./guide";
import "./wallpaper.css";

const steps = pasteTheWallGuide.steps;

/** Hardware/tool inventory shown under the build, highlighted live from the 3D pose (scene.activeToolIds()). */
const INVENTORY: Array<{ id: ToolId; label: string; icon: ManualToolIconKind }> = [
  { id: "voltageTester", label: "Voltage tester", icon: "voltageTester" },
  { id: "fillingKnife", label: "Filling knife", icon: "fillerKnife" },
  { id: "sponge", label: "Sponge", icon: "sponge" },
  { id: "tape", label: "Tape", icon: "tapeMeasure" },
  { id: "pencil", label: "Pencil", icon: "tapeMeasure" },
  { id: "level", label: "Level", icon: "plumbLevel" },
  { id: "roller", label: "Roller", icon: "pasteRoller" },
  { id: "pasteBrush", label: "Brush", icon: "pasteRoller" },
  { id: "smoother", label: "Smoother", icon: "smoother" },
  { id: "straightedge", label: "Straightedge", icon: "straightedge" },
  { id: "knife", label: "Knife", icon: "utilityKnife" },
];
const offsets = steps.map((_, index) => steps.slice(0, index).reduce((sum, step) => sum + step.seconds, 0));
const sourceLevel: Record<GuidanceLevel, string> = {
  "manufacturer-general": "Manufacturer general guidance",
  "adhesive-manufacturer": "Adhesive manufacturer guidance",
  "reconstructed-demo": "Reconstructed demonstration"
};

function formatTime(value: number) {
  const seconds = Math.max(0, Math.round(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function EvidenceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="evidence-dialog" onClose={onClose} onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="evidence-dialog-inner">
        <header>
          <div>
            <span className="ui-label">Evidence register</span>
            <h2>What this lesson is, and is not</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close evidence register"><X size={19} /></button>
        </header>
        <div className="approval-notice">
          <AlertTriangle size={20} />
          <p><strong>Not manufacturer-approved product training.</strong> {pasteTheWallGuide.productStatus}</p>
        </div>
        <p className="dialog-copy">{pasteTheWallGuide.geometryStatus} The supplied Kami document requires sign-in and has not been reviewed, so none of its contents are claimed here.</p>
        <ol className="source-register">
          {pasteTheWallGuide.sources.map((source, index) => (
            <li key={source.id}>
              <span className="source-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <span className="source-level">{sourceLevel[source.level]}</span>
                <h3>{source.title}</h3>
                <p>{source.publisher}. {source.note}</p>
                {source.url && <a href={source.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={14} /></a>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  );
}

function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="evidence-dialog shortcuts-dialog"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="evidence-dialog-inner">
        <header>
          <div>
            <span className="ui-label">Interactive 3D field manual</span>
            <h2>Keyboard shortcuts</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close keyboard shortcuts"><X size={19} /></button>
        </header>
        <div className="shortcuts-grid">
          <div><kbd>Space</kbd><span>Play / Pause step animation</span></div>
          <div><kbd>→</kbd> / <kbd>←</kbd><span>Next / Previous installation step</span></div>
          <div><kbd>↑</kbd> / <kbd>↓</kbd><span>Scrub timeline forward / backward</span></div>
          <div><kbd>[</kbd> / <kbd>]</kbd><span>Previous / Next step</span></div>
          <div><kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd><span>Jump to step 1–9, 10</span></div>
          <div><kbd>C</kbd><span>Play the complete build from step 1</span></div>
          <div><kbd>R</kbd><span>Re-engage camera on the work point</span></div>
          <div><kbd>V</kbd><span>Toggle Room / Drawing view</span></div>
          <div><kbd>⇧B</kbd><span>Show / hide the manual drawer</span></div>
          <div><kbd>⇧N</kbd><span>Part and junction callouts</span></div>
          <div><kbd>⇧X</kbd><span>Exploded layers: substrate · adhesive · paper</span></div>
          <div><kbd>L</kbd><span>Toggle 3.5× Detail Loupe</span></div>
          <div><kbd>M</kbd><span>Toggle Spoken Voice Narration</span></div>
          <div><kbd>S</kbd><span>Toggle Acoustic Step Cues</span></div>
          <div><kbd>?</kbd><span>Open this shortcuts help window</span></div>
        </div>
      </div>
    </dialog>
  );
}

function PrintFieldSheet({ images }: { images: string[] }) {
  return (
    <main className="wallpaper-print-sheet">
      <header>
        <div><strong>PLUMB</strong><span>FIELD TRAINING / WALLCOVERINGS</span></div>
        <span>GENERAL GUIDANCE • NOT PRODUCT-APPROVED</span>
      </header>
      <h1>{pasteTheWallGuide.title}</h1>
      <p>{pasteTheWallGuide.productStatus}</p>
      <p>{pasteTheWallGuide.geometryStatus}</p>
      <section className="print-safety"><strong>Required safety gate:</strong> isolate and verify electrical safety before wet adhesive or cutting near outlets. This sheet does not replace electrical instruction or product documents.</section>
      <div className="print-step-grid">
        {steps.map((step, index) => (
          <article key={step.id}>
            <div className="print-step-heading"><span>{String(index + 1).padStart(2, "0")}</span><h2>{step.title}</h2></div>
            {images[index] && <img className="print-step-figure" src={images[index]} alt={`Step ${index + 1} illustration: ${step.shortTitle}`} />}
            <p>{step.instruction}</p>
            <p><strong>Tools:</strong> {step.tools.join(", ")}</p>
            <p><strong>Inspection:</strong> {step.check}</p>
            <p><strong>Accept:</strong> {step.quality.accept} <strong>Recheck:</strong> {step.quality.recheck}</p>
            <p><strong>Decision check:</strong> {step.checkpoint.prompt}<br /><strong>Answer:</strong> {step.checkpoint.options[step.checkpoint.answer]}</p>
            {step.warning && <p><strong>Warning:</strong> {step.warning}</p>}
            <small>Evidence: {step.evidence.map((id) => getSource(id).publisher).join("; ")}</small>
          </article>
        ))}
      </div>
      <footer>Retain roll labels, adhesive datasheets and site records. Product documents take precedence.</footer>
    </main>
  );
}

export default function WallpaperTrainingPage() {
  const [params] = useSearchParams();
  const hostRef = useRef<HTMLDivElement>(null);
  const instructionScrollRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WallpaperScene | null>(null);

  const initialGate = params.get("gate") === "1" || Number(params.get("step")) > 2;
  const initialStep = useMemo(() => {
    const raw = Number(params.get("step"));
    if (!Number.isFinite(raw) || raw < 1) return 0;
    const idx = Math.max(0, Math.min(steps.length - 1, Math.floor(raw) - 1));
    return canAccessStep(idx, initialGate) ? idx : 1;
  }, [params, initialGate]);
  const initialProgress = useMemo(() => {
    const raw = Number(params.get("progress") ?? params.get("at"));
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0;
  }, [params]);

  const progressRef = useRef(initialProgress);
  const [current, setCurrent] = useState(initialStep);
  const [progress, setProgressState] = useState(initialProgress);
  const [playing, setPlaying] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<"room" | "drawing">(() =>
    params.get("view") === "drawing" || params.get("view") === "cad" ? "drawing" : "room"
  );
  const [showLoupe, setShowLoupe] = useState(() => params.get("loupe") !== "0");
  const [electricalCleared, setElectricalCleared] = useState(initialGate);
  const [gateNotice, setGateNotice] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [narrate, setNarrate] = useState(false);
  const [soundCues, setSoundCues] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [stepImages, setStepImages] = useState<string[]>([]);
  const [preparingSheet, setPreparingSheet] = useState(false);
  const [manualOpen, setManualOpen] = useState(() => params.get("manual") !== "0");
  const [showCallouts, setShowCallouts] = useState(() => params.get("labels") === "1");
  const [exploded, setExploded] = useState(() => params.get("exploded") === "1");
  const [activeTools, setActiveTools] = useState<ToolId[]>([]);
  const [workPoint, setWorkPoint] = useState<{ x: number; y: number } | null>(null);
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const step = steps[current];

  const setProgress = useCallback((value: number) => {
    progressRef.current = value;
    setProgressState(value);
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;
    const scene = new WallpaperScene(hostRef.current);
    sceneRef.current = scene;
    if (import.meta.env.DEV) (window as unknown as { __wallpaperScene?: WallpaperScene }).__wallpaperScene = scene;
    setSceneReady(true);
    const observer = new ResizeObserver(() => scene.resize());
    observer.observe(hostRef.current);
    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.seek(current, progress, step.operation);
    const tools = scene.activeToolIds();
    setActiveTools((prev) => (prev.join() === tools.join() ? prev : tools));
    const wp = scene.workPoint();
    setWorkPoint((prev) => (prev && Math.abs(prev.x - wp.x) < 0.002 && Math.abs(prev.y - wp.y) < 0.002 ? prev : wp));
  }, [current, progress, step.operation, sceneReady, exploded]);

  useEffect(() => {
    sceneRef.current?.setShowCallouts(showCallouts);
  }, [showCallouts, sceneReady]);

  useEffect(() => {
    sceneRef.current?.setExploded(exploded ? 1 : 0);
  }, [exploded, sceneReady]);

  // The canvas changes size when the manual drawer opens/closes; the ResizeObserver handles the renderer.

  useEffect(() => {
    sceneRef.current?.setView(view);
  }, [view, sceneReady]);

  useEffect(() => {
    sceneRef.current?.setShowLoupe(showLoupe);
  }, [showLoupe, sceneReady]);

  useEffect(() => {
    if (instructionScrollRef.current) instructionScrollRef.current.scrollTop = 0;
  }, [current]);

  // Live narration: speaks the same text used for subtitles and the video captions.
  useEffect(() => {
    if (!narrate || !speechSupported) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText(steps[current]));
    utterance.lang = "en-US";
    synth.speak(utterance);
    return () => synth.cancel();
  }, [narrate, current, speechSupported]);

  // While narrating, each step's animation stretches to the time needed to speak it.
  const stepSpan = narrate ? pacedStepSeconds(step) : step.seconds;

  useEffect(() => {
    if (!playing) return;
    let animationFrame = 0;
    let last = performance.now();
    let changedStep = false;
    const tick = (now: number) => {
      const delta = Math.min(0.08, (now - last) / 1000);
      last = now;
      let next = progressRef.current + (delta * speed * direction) / stepSpan;
      if (next >= 1) {
        if (current < steps.length - 1 && canAccessStep(current + 1, electricalCleared)) {
          changedStep = true;
          setCurrent((value) => value + 1);
          setProgress(0);
        } else {
          next = 1;
          setPlaying(false);
          if (!electricalCleared && current === 1) setGateNotice(true);
        }
      } else if (next <= 0) {
        if (current > 0) {
          changedStep = true;
          setCurrent((value) => value - 1);
          setProgress(1);
        } else {
          next = 0;
          setPlaying(false);
        }
      }
      if (!changedStep) {
        setProgress(next);
        animationFrame = requestAnimationFrame(tick);
      }
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [playing, current, direction, speed, electricalCleared, setProgress, stepSpan]);

  const goTo = useCallback((index: number) => {
    setPlaying(false);
    if (!canAccessStep(index, electricalCleared)) {
      setCurrent(1);
      setProgress(0);
      setGateNotice(true);
      return;
    }
    setCurrent(Math.max(0, Math.min(steps.length - 1, index)));
    setProgress(0);
    setGateNotice(false);
  }, [electricalCleared, setProgress]);

  const globalTime = offsets[current] + progress * step.seconds;
  const setGlobalTime = (value: number) => {
    let index = steps.findIndex((_, i) => value < offsets[i] + steps[i].seconds);
    if (index < 0) index = steps.length - 1;
    if (!canAccessStep(index, electricalCleared)) {
      goTo(index);
      return;
    }
    setPlaying(false);
    setCurrent(index);
    setProgress(Math.max(0, Math.min(1, (value - offsets[index]) / steps[index].seconds)));
  };

  const playForward = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (globalTime >= totalAnimationSeconds - 0.01) {
      setCurrent(0);
      setProgress(0);
    } else if (progress >= 1) setProgress(0);
    setDirection(1);
    setPlaying(true);
  };

  const playReverse = () => {
    if (playing && direction === -1) {
      setPlaying(false);
      return;
    }
    if (playing) {
      setDirection(-1);
      return;
    }
    if (current === 0 && progress === 0) setProgress(1);
    setDirection(-1);
    setPlaying(true);
  };

  // Play subtle acoustic cue on step change if sound cues are enabled
  // Rate-limited: scrubbing across several steps used to fire a chime for every boundary crossed.
  const lastCueRef = useRef(0);
  useEffect(() => {
    if (!soundCues) return;
    const now = performance.now();
    if (now - lastCueRef.current < 400) return;
    lastCueRef.current = now;
    playLiveStepCue(steps[current]);
  }, [current, soundCues]);

  // Global keyboard shortcuts for fluid manual navigation
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (event.shiftKey && key === "b") {
        event.preventDefault();
        setManualOpen((v) => !v);
      } else if (event.shiftKey && key === "n") {
        event.preventDefault();
        setShowCallouts((v) => !v);
      } else if (event.shiftKey && key === "x") {
        event.preventDefault();
        setExploded((v) => !v);
      } else if (event.key === "[") {
        event.preventDefault();
        goTo(current - 1);
      } else if (event.key === "]") {
        event.preventDefault();
        goTo(current + 1);
      } else if (/^[0-9]$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        goTo(event.key === "0" ? 9 : Number(event.key) - 1);
      } else if (key === "c" && !event.metaKey && !event.ctrlKey) {
        // Play the complete build from step 1 (the electrical gate still stops it after step 2).
        event.preventDefault();
        setCurrent(0);
        setProgress(0);
        setDirection(1);
        setPlaying(true);
      } else if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        playForward();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(current + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(current - 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setProgress(Math.min(1, progressRef.current + 0.08));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setProgress(Math.max(0, progressRef.current - 0.08));
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        sceneRef.current?.resetCamera(step.operation);
      } else if (event.key === "v" || event.key === "V") {
        event.preventDefault();
        setView((prev) => (prev === "room" ? "drawing" : "room"));
      } else if (event.key === "l" || event.key === "L") {
        event.preventDefault();
        setShowLoupe((prev) => !prev);
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setNarrate((prev) => !prev);
      } else if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        setSoundCues((prev) => !prev);
      } else if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        event.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo, playForward, setProgress, step.operation]);

  const completedPhases = useMemo(() => new Set(steps.slice(0, current).map((item) => item.phase)).size, [current]);
  const correctChecks = useMemo(() => steps.filter((item) => answers[item.id] === item.checkpoint.answer).length, [answers]);

  // Document + visual manual: render one CAD illustration per step from the same 3D scene, then print.
  const printFieldSheet = async () => {
    const scene = sceneRef.current;
    if (!scene) {
      window.print();
      return;
    }
    setPlaying(false);
    setPreparingSheet(true);
    try {
      const images: string[] = [];
      scene.beginExport("drawing");
      try {
        const canvas = document.createElement("canvas");
        for (let i = 0; i < steps.length; i += 1) {
          await scene.renderLessonFrame(canvas, { stepIndex: i, progress: 0.62, operation: steps[i].operation, width: 960, height: 540 });
          images.push(canvas.toDataURL("image/jpeg", 0.85));
        }
      } finally {
        scene.endExport();
      }
      setStepImages(images);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    } finally {
      setPreparingSheet(false);
    }
    window.print();
  };

  return (
    <div className="wallpaper-app">
      <a className="skip-link" href="#training-instruction">Skip to current instruction</a>
      <header className="training-topbar">
        <div className="training-brand"><span className="training-brand-mark" aria-hidden="true"><i /><i /><i /></span><strong>PLUMB</strong></div>
        <div className="training-title">
          <span className="ui-label">Wallcoverings / piece</span>
          <h1>{pasteTheWallGuide.title}</h1>
        </div>
        <span className="status-badge" title={pasteTheWallGuide.productStatus}><AlertTriangle size={13} /> General guidance</span>
        <div className="topbar-actions">
          <Link className="text-button" to="/simulator" title="Earlier 3-track CAD simulator"><Box size={16} /><span>Simulator</span></Link>
          <button className="text-button" onClick={() => { setPlaying(false); setVideoOpen(true); }}><Film size={16} /><span>Video</span></button>
          <button className="text-button" onClick={() => setEvidenceOpen(true)}><BookOpen size={16} /><span>Evidence</span></button>
          <button className="text-button" onClick={printFieldSheet} disabled={preparingSheet}><Printer size={16} /><span>{preparingSheet ? "Preparing…" : "Field sheet"}</span></button>
        </div>
      </header>

      <main className={`training-grid flatpack-grid ${manualOpen ? "" : "manual-collapsed"}`}>
        <aside className="manual-drawer" id="training-instruction" aria-label="Manual page for the current step" hidden={!manualOpen}>
          <button className="manual-figure" onClick={() => { setProgress(0); setDirection(1); setPlaying(true); }} title="Replay this step">
            <div className="manual-heading"><span>MANUAL · STEP {String(current + 1).padStart(2, "0")} / {steps.length}</span><span><Play size={12} /> Replay</span></div>
            <ReferenceDrawing step={step} number={current + 1} workPoint={workPoint} />
          </button>
          <div className="instruction-scroll" ref={instructionScrollRef}>
            <div className="instruction-meta"><span>{step.phase}</span><span>{correctChecks}/{steps.length} checks</span></div>
            <h2>{step.title}</h2>
            <p className="instruction-lead">{step.instruction}</p>
            <div className="why-note"><span>WHY</span><p>{step.reason}</p></div>

            {current === 1 && (
              <div className={`safety-gate ${electricalCleared ? "cleared" : ""}`}>
                <div><ShieldCheck size={21} /><strong>Required training gate</strong></div>
                <p>Later steps stay locked until the electrical hazard is addressed. This acknowledgement does not isolate power.</p>
                <label><input type="checkbox" checked={electricalCleared} onChange={(event) => { setElectricalCleared(event.target.checked); setGateNotice(false); setProgress(0); }} /><span>Power isolation and safe verification have been addressed for this training scenario.</span></label>
              </div>
            )}
            {gateNotice && !electricalCleared && <p className="gate-message" role="alert"><LockKeyhole size={15} /> Complete the electrical safety gate in step 2 to continue.</p>}
            {step.warning && <div className="step-warning"><AlertTriangle size={18} /><p>{step.warning}</p></div>}

            <section className="instruction-section inspection-check"><h3>Inspect before moving on</h3><p>{step.check}</p></section>
            <section className="instruction-section"><h3>Tools and materials</h3><ul className="tool-list">{[...step.tools, ...step.materials].map((item) => <li key={item}>{item}</li>)}</ul></section>
            <LearningCheck step={step} selected={answers[step.id]} onAnswer={(answer) => setAnswers((currentAnswers) => ({ ...currentAnswers, [step.id]: answer }))} />
            <section className="instruction-section evidence-links"><h3>Evidence for this step</h3>{step.evidence.map((id) => {
              const source = getSource(id);
              return source.url ? <a key={id} href={source.url} target="_blank" rel="noreferrer"><span>{source.publisher}<small>{sourceLevel[source.level]}</small></span><ExternalLink size={14} /></a> : <div key={id}><span>{source.publisher}<small>{sourceLevel[source.level]}</small></span></div>;
            })}</section>
          </div>
          <div className="instruction-footer">
            <button className="text-button" onClick={() => goTo(current - 1)} disabled={current === 0}><ChevronLeft size={17} /> Previous</button>
            <button className="next-step-button" onClick={() => goTo(current + 1)} disabled={current === steps.length - 1}>{current === 1 && !electricalCleared ? <LockKeyhole size={16} /> : <Check size={16} />} {current === steps.length - 1 ? "Complete" : "Done, next"}<ChevronRight size={17} /></button>
          </div>
        </aside>

        <section className="stage-column" aria-label="Interactive 3D demonstration">
          <div className="stage-toolbar">
            <button className="icon-button" onClick={() => setManualOpen((v) => !v)} aria-pressed={manualOpen} title="Manual drawer [⇧B]" aria-label="Toggle manual drawer">
              {manualOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
            <div className="view-switch" aria-label="View">
              <button className={view === "drawing" ? "selected" : ""} onClick={() => setView("drawing")} aria-pressed={view === "drawing"} title="Technical line drawing [V]">Drawing</button>
              <button className={view === "room" ? "selected" : ""} onClick={() => setView("room")} aria-pressed={view === "room"} title="Lit room view [V]">Room</button>
            </div>
            <button className={`icon-button ${showCallouts ? "active" : ""}`} onClick={() => setShowCallouts((v) => !v)} aria-pressed={showCallouts} title="Part and junction callouts [⇧N]" aria-label="Toggle callouts"><Tag size={16} /></button>
            <button className={`icon-button ${exploded ? "active" : ""}`} onClick={() => setExploded((v) => !v)} aria-pressed={exploded} title="Exploded layers [⇧X]" aria-label="Toggle exploded layers"><Layers size={16} /></button>
            <button className={`icon-button ${showLoupe ? "active" : ""}`} onClick={() => setShowLoupe((v) => !v)} title="3.5× detail loupe [L]" aria-label="Toggle 3.5x detail loupe" aria-pressed={showLoupe}><ZoomIn size={16} /></button>
            <button className={`icon-button ${narrate ? "active" : ""}`} onClick={() => setNarrate((v) => !v)} disabled={!speechSupported} title={speechSupported ? "Narrate each step aloud [M]" : "Speech narration is not available in this browser"} aria-label="Toggle narration" aria-pressed={narrate}>{narrate ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
            <button className={`icon-button ${soundCues ? "active" : ""}`} onClick={() => setSoundCues((v) => !v)} title="Instructional audio cues [S]" aria-label="Toggle audio cues" aria-pressed={soundCues}><Bell size={16} /></button>
            <button className="icon-button" onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts [?]" aria-label="Keyboard shortcuts"><Keyboard size={16} /></button>
            <div className="stage-step-readout"><span>STEP {String(current + 1).padStart(2, "0")}</span><strong>{step.shortTitle}</strong></div>
            <button className="icon-button" onClick={() => sceneRef.current?.resetCamera(step.operation)} title="Re-engage camera [R]" aria-label="Reset camera"><RotateCcw size={17} /></button>
          </div>
          <div className="scene-host" ref={hostRef}>
            {!sceneReady && <div className="scene-loading">Preparing the training wall…</div>}
            <ul className="wp-inventory" aria-label="Tools for this build; highlighted tools are in use">
              {INVENTORY.map((tool) => {
                const inUse = activeTools.includes(tool.id);
                return (
                  <li key={tool.id} className={inUse ? "in-use" : ""} aria-current={inUse ? "true" : undefined}>
                    <ManualToolArt kind={tool.icon} size={26} highlight={inUse} />
                    <span>{tool.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="playback-panel build-panel">
            <div className="timeline-labels"><span>THE BUILD</span><output>{formatTime(globalTime)} / {formatTime(totalAnimationSeconds)}</output></div>
            <ol className="build-bar" aria-label="Steps">
              {steps.map((item, index) => {
                const locked = !canAccessStep(index, electricalCleared);
                const fill = index < current ? 1 : index === current ? progress : 0;
                return (
                  <li key={item.id} style={{ flexGrow: item.seconds }}>
                    <button
                      className={`${index === current ? "active" : ""} ${locked ? "locked" : ""}`}
                      onClick={() => goTo(index)}
                      aria-current={index === current ? "step" : undefined}
                      title={`${index + 1}. ${item.shortTitle}${locked ? " (locked until the electrical gate)" : ""}`}
                    >
                      <span className="build-fill" style={{ transform: `scaleX(${fill})` }} />
                      <span className="build-num">{locked ? <LockKeyhole size={10} /> : index + 1}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <input className="timeline" type="range" min="0" max={totalAnimationSeconds} step="0.01" value={globalTime} onChange={(event) => setGlobalTime(Number(event.target.value))} aria-label="Scrub complete installation animation" />
            <div className="playback-controls">
              <div className="control-cluster">
                <button className="icon-button" onClick={() => goTo(current - 1)} disabled={current === 0} aria-label="Previous step"><SkipBack size={18} /></button>
                <button className={`icon-button ${direction === -1 && playing ? "active" : ""}`} onClick={playReverse} aria-label="Reverse playback" title="Reverse playback"><Rewind size={18} /></button>
                <button className="play-button" onClick={playForward} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}</button>
                <button className="icon-button" onClick={() => goTo(current + 1)} disabled={current === steps.length - 1} aria-label="Next step"><SkipForward size={18} /></button>
              </div>
              <label className="speed-control">Speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
            </div>
          </div>
        </section>
      </main>

      <footer className="training-disclaimer"><AlertTriangle size={14} /><span>General teaching demo, not a substitute for the roll label, adhesive datasheet, site risk assessment or qualified electrical work.</span><button onClick={() => setEvidenceOpen(true)}>Review source boundaries</button></footer>
      <EvidenceDialog open={evidenceOpen} onClose={() => setEvidenceOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <LessonVideoDialog open={videoOpen} lesson={wallpaperLesson} renderer={sceneRef.current} currentStep={current} onClose={() => setVideoOpen(false)} />
      <PrintFieldSheet images={stepImages} />
    </div>
  );
}
