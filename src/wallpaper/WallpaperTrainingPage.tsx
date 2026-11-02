import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  BookOpen,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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
  ZoomIn
} from "lucide-react";
import { ManualToolArt, resolveManualToolKind } from "../components/ManualLineArt";
import { WallpaperScene } from "./WallpaperScene";
import { ReferenceDrawing } from "./ReferenceDrawing";
import { LearningCheck } from "./LearningCheck";
import { LessonVideoDialog } from "./LessonVideoDialog";
import { wallpaperLesson } from "./lesson";
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
  const [videoOpen, setVideoOpen] = useState(false);
  const [stepImages, setStepImages] = useState<string[]>([]);
  const [preparingSheet, setPreparingSheet] = useState(false);
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
    sceneRef.current?.seek(current, progress, step.operation);
  }, [current, progress, step.operation, sceneReady]);

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
        <div className="training-brand"><span className="training-brand-mark" aria-hidden="true"><i /><i /><i /></span><strong>PLUMB</strong><span>FIELD TRAINING</span></div>
        <div className="training-breadcrumb">WALLCOVERINGS <span>/</span> PASTE THE WALL</div>
        <div className="topbar-actions">
          <Link className="text-button" to="/simulator"><Box size={16} /> 3-Track CAD Simulator</Link>
          <button className="text-button" onClick={() => { setPlaying(false); setVideoOpen(true); }}><Film size={16} /> Export video</button>
          <button className="text-button" onClick={() => setEvidenceOpen(true)}><BookOpen size={16} /> Evidence</button>
          <button className="text-button" onClick={printFieldSheet} disabled={preparingSheet}><Printer size={16} /> {preparingSheet ? "Preparing…" : "Field sheet"}</button>
        </div>
      </header>

      <section className="training-productbar">
        <div>
          <span className="ui-label">Interactive installation lesson / v3 + CAD shader pipeline</span>
          <h1>{pasteTheWallGuide.title}</h1>
        </div>
        <div className="productbar-status">
          <span className="status-badge"><AlertTriangle size={14} /> General guidance</span>
          <span>14 steps</span><span>14 scenario checks</span><span>CAD + 3.5× Loupe</span>
        </div>
      </section>

      <main className="training-grid">
        <aside className="step-rail" aria-label="Installation steps">
          <div className="rail-heading"><span className="ui-label">Sequence</span><span title={`${completedPhases} of 4 phases visited`}>{correctChecks}/14 checks</span></div>
          <ol>
            {steps.map((item, index) => {
              const locked = !canAccessStep(index, electricalCleared);
              const phaseStart = index === 0 || steps[index - 1].phase !== item.phase;
              return (
                <li key={item.id}>
                  {phaseStart && <span className="phase-label">{item.phase}</span>}
                  <button className={`${index === current ? "active" : ""} ${index < current ? "visited" : ""}`} onClick={() => goTo(index)} aria-current={index === current ? "step" : undefined}>
                    <span className="step-number">{locked ? <LockKeyhole size={13} /> : String(index + 1).padStart(2, "0")}</span>
                    <span>{item.shortTitle}</span>
                    {index < current && !locked && <Check size={14} className="step-check" />}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="rail-source-note"><ShieldCheck size={17} /><p>One guide drives the scene, drawings, playback and print sheet.</p></div>
        </aside>

        <section className="stage-column" aria-label="Interactive 3D demonstration">
          <div className="stage-toolbar">
            <div className="view-switch" aria-label="Camera view">
              <button className={view === "room" ? "selected" : ""} onClick={() => setView("room")} aria-pressed={view === "room"}>Room</button>
              <button className={view === "drawing" ? "selected" : ""} onClick={() => setView("drawing")} aria-pressed={view === "drawing"} title="Switch to 4-band Cel + Fat Ink CAD Line-Art Shader">Front</button>
            </div>
            <button
              className={`icon-button ${showLoupe ? "active" : ""}`}
              onClick={() => setShowLoupe((v) => !v)}
              title="Toggle 3.5× Circular Magnifying Detail Loupe"
              aria-label="Toggle 3.5x detail loupe"
              aria-pressed={showLoupe}
            >
              <ZoomIn size={16} />
            </button>
            <button
              className={`icon-button ${narrate ? "active" : ""}`}
              onClick={() => setNarrate((v) => !v)}
              disabled={!speechSupported}
              title={speechSupported ? "Narrate each step aloud (playback slows to match speech)" : "Speech narration is not available in this browser"}
              aria-label="Toggle narration"
              aria-pressed={narrate}
            >
              {narrate ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <div className="stage-step-readout"><span>STEP {String(current + 1).padStart(2, "0")}</span><strong>{step.shortTitle}</strong></div>
            <button className="icon-button" onClick={() => sceneRef.current?.resetCamera(step.operation)} title="Reset camera" aria-label="Reset camera"><RotateCcw size={17} /></button>
          </div>
          <div className="scene-host" ref={hostRef}>
            {!sceneReady && <div className="scene-loading">Preparing the training wall…</div>}
            <div className="scene-legend"><span><i className="legend-cyan" /> Adhesive / set-out</span><span><i className="legend-paper" /> Dry wallcovering</span></div>
            <div className="wp-tool-corner-card" aria-label="Active step tools">
              {step.tools.slice(0, 2).map((toolName) => (
                <div key={toolName} className="wp-tool-corner-row">
                  <ManualToolArt kind={resolveManualToolKind(toolName)} size={36} />
                  <span>{toolName}</span>
                </div>
              ))}
            </div>
            <div className="scene-orbit-note">Drag to orbit • Scroll to zoom • 3.5× detail loupe tracks active work point</div>
          </div>
          <div className="playback-panel">
            <div className="timeline-labels"><span>ANIMATION TIMELINE</span><output>{formatTime(globalTime)} / {formatTime(totalAnimationSeconds)}</output></div>
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

        <aside className="instruction-pane" id="training-instruction" aria-label="Current step instruction">
          <button className="manual-figure" onClick={() => { setProgress(0); setDirection(1); setPlaying(true); }} title="Replay this step from the reference drawing">
            <div className="manual-heading"><span>REFERENCE DRAWING</span><span><Play size={12} /> Replay</span></div>
            <ReferenceDrawing step={step} number={current + 1} />
          </button>
          <div className="instruction-scroll" ref={instructionScrollRef}>
            <div className="instruction-meta"><span>{step.phase}</span><span>Step {current + 1} of {steps.length}</span></div>
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

            <section className="instruction-section"><h3>Tools and materials</h3><ul className="tool-list">{[...step.tools, ...step.materials].map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section className="instruction-section inspection-check"><h3>Inspect before moving on</h3><p>{step.check}</p></section>
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
      </main>

      <footer className="training-disclaimer"><AlertTriangle size={14} /><span>General teaching demo, not a substitute for the roll label, adhesive datasheet, site risk assessment or qualified electrical work.</span><button onClick={() => setEvidenceOpen(true)}>Review source boundaries</button></footer>
      <EvidenceDialog open={evidenceOpen} onClose={() => setEvidenceOpen(false)} />
      <LessonVideoDialog open={videoOpen} lesson={wallpaperLesson} renderer={sceneRef.current} currentStep={current} onClose={() => setVideoOpen(false)} />
      <PrintFieldSheet images={stepImages} />
    </div>
  );
}
