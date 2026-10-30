import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Box,
  Check,
  Clock3,
  Expand,
  Layers,
  MousePointer2,
  PackageOpen,
  Pause,
  PencilRuler,
  Play,
  Printer,
  Rewind,
  RotateCcw,
  SkipBack,
  SkipForward,
  Users,
  Video,
  Volume2,
  VolumeX,
  Wrench,
} from "lucide-react";
import { guideTimeAtStep, guideTotalDuration, type Guide } from "@contracts/guide";
import { Blueprint2DOverlay } from "@/scene/Blueprint2DOverlay";
import type { GuideEngine } from "@/scene/GuideEngine";
import type { SceneStyle } from "@/scene/WallpaperScene";
import { SafetyGate } from "./SafetyGate";
import { SceneCanvas } from "./SceneCanvas";

interface GuidePlayerProps {
  guide: Guide;
  onPrint?: (engine: GuideEngine) => void;
  onExport?: (engine: GuideEngine) => void;
}

const formatTime = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

export function GuidePlayer({ guide, onPrint, onExport }: GuidePlayerProps) {
  const duration = useMemo(() => guideTotalDuration(guide), [guide]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [style, setStyle] = useState<SceneStyle>(guide.product ? "realistic" : "2d");
  const [narration, setNarration] = useState(false);
  const [engine, setEngine] = useState<GuideEngine | null>(null);
  const [safetyStep, setSafetyStep] = useState<number | null>(null);
  const [confirmedGates, setConfirmedGates] = useState<Set<number>>(() => new Set());
  const pendingTime = useRef<number | null>(null);
  const playerRef = useRef<HTMLElement>(null);
  const frameRef = useRef(0);
  const previousFrame = useRef<number | null>(null);

  const currentStepIndex = useMemo(() => {
    for (let index = guide.steps.length - 1; index >= 0; index -= 1) {
      if (time >= guideTimeAtStep(guide, index)) return index;
    }
    return 0;
  }, [guide, time]);
  const step = guide.steps[currentStepIndex];
  const stepStart = guideTimeAtStep(guide, currentStepIndex);
  const stepProgress = Math.min(1, Math.max(0, (time - stepStart) / step.duration));

  const stepIndexAtTime = useCallback(
    (value: number) => {
      for (let index = guide.steps.length - 1; index >= 0; index -= 1) {
        if (value >= guideTimeAtStep(guide, index)) return index;
      }
      return 0;
    },
    [guide]
  );

  const requestSeek = useCallback(
    (value: number) => {
      const nextTime = Math.min(duration, Math.max(0, value));
      const nextIndex = stepIndexAtTime(Math.min(nextTime, Math.max(0, duration - 0.001)));
      const nextStep = guide.steps[nextIndex];
      if (nextStep.gate && !confirmedGates.has(nextIndex)) {
        setPlaying(false);
        pendingTime.current = nextTime;
        setSafetyStep(nextIndex);
        return;
      }
      setTime(nextTime);
    },
    [confirmedGates, duration, guide.steps, stepIndexAtTime]
  );

  const goToStep = useCallback(
    (index: number) => {
      const safeIndex = Math.max(0, Math.min(guide.steps.length - 1, index));
      setPlaying(false);
      requestSeek(guideTimeAtStep(guide, safeIndex) + 0.001);
    },
    [guide, requestSeek]
  );

  useEffect(() => {
    setTime(0);
    setPlaying(false);
    setDirection(1);
    setStyle(guide.product ? "realistic" : "2d");
    setConfirmedGates(new Set());
    setSafetyStep(null);
    pendingTime.current = null;
  }, [guide]);

  useEffect(() => {
    if (!playing) {
      previousFrame.current = null;
      cancelAnimationFrame(frameRef.current);
      return;
    }
    const tick = (now: number) => {
      const previous = previousFrame.current ?? now;
      const elapsed = Math.min(0.1, (now - previous) / 1000);
      previousFrame.current = now;
      setTime((current) => {
        const next = current + elapsed * speed * direction;
        if (direction === 1 && next >= duration) {
          setPlaying(false);
          return duration;
        }
        if (direction === -1 && next <= 0) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [direction, duration, playing, speed]);

  useEffect(() => {
    if (playing && step.gate && !confirmedGates.has(currentStepIndex)) {
      setPlaying(false);
      pendingTime.current = stepStart + 0.001;
      setSafetyStep(currentStepIndex);
    }
  }, [confirmedGates, currentStepIndex, playing, step.gate, stepStart]);

  useEffect(() => {
    if (!narration || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(step.narration);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [currentStepIndex, narration, step.narration]);

  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    []
  );

  const confirmGate = () => {
    if (safetyStep === null) return;
    const confirmed = safetyStep;
    setConfirmedGates((current) => new Set(current).add(confirmed));
    const destination = pendingTime.current ?? guideTimeAtStep(guide, confirmed) + 0.001;
    setSafetyStep(null);
    pendingTime.current = null;
    setTime(destination);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await playerRef.current?.requestFullscreen();
    } catch {
      // Fullscreen availability is browser-controlled; the player remains usable inline.
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (safetyStep !== null || event.target !== event.currentTarget) return;
    if (event.key === " " || event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (time >= duration) setTime(0);
      setPlaying((value) => !value);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToStep(currentStepIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToStep(currentStepIndex - 1);
    } else if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      engine?.resetCamera();
    }
  };

  return (
    <section
      className="guide-player"
      ref={playerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`${guide.title} interactive guide`}
    >
      <div className="player-scene-column">
        <div className="scene-topbar">
          <div className="scene-topbar-meta">
            <span className="live-dot" />
            <span>{style === "2d" ? "2D Orthographic CAD" : "Deterministic 3D"}</span>
            <span className="meta-divider">/</span>
            <span>{guide.steps.length} steps</span>
          </div>
          <div className="scene-style-switch" aria-label="Scene rendering style">
            <button
              className={style === "2d" ? "active" : ""}
              onClick={() => setStyle("2d")}
              aria-pressed={style === "2d"}
              title="2D Orthographic Blueprint & Cross-Section"
            >
              <Layers size={15} /> 2D Blueprint
            </button>
            <button
              className={style === "drawing" ? "active" : ""}
              onClick={() => setStyle("drawing")}
              aria-pressed={style === "drawing"}
              title="3D Architectural Line Drawing"
            >
              <PencilRuler size={15} /> Drawing
            </button>
            <button
              className={style === "realistic" ? "active" : ""}
              onClick={() => setStyle("realistic")}
              aria-pressed={style === "realistic"}
              title="3D Realistic PBR View"
            >
              <Box size={15} /> Realistic
            </button>
          </div>
        </div>

        <div className="scene-stage">
          <SceneCanvas key={guide.slug} guide={guide} time={time} style={style} onReady={setEngine} />
          {style === "2d" && <Blueprint2DOverlay guide={guide} currentTime={time} />}
          {style !== "2d" && (
            <div className="scene-callout">
              <span>{String(currentStepIndex + 1).padStart(2, "0")}</span>
              <p>{step.visual.callout}</p>
            </div>
          )}
          <div className="scene-utilities">
            {style !== "2d" && (
              <button
                className="glass-icon-button"
                onClick={() => engine?.resetCamera()}
                aria-label="Reset 3D camera"
                title="Reset camera (R)"
              >
                <RotateCcw size={18} />
              </button>
            )}
            <button
              className="glass-icon-button"
              onClick={toggleFullscreen}
              aria-label="Toggle fullscreen"
              title="Fullscreen"
            >
              <Expand size={18} />
            </button>
          </div>
          <div className="orbit-hint">
            {style === "2d" ? (
              <>
                <Layers size={14} /> 2D Orthographic Elevation + Section A-A · Print & 1080p30 MP4 Ready
              </>
            ) : (
              <>
                <MousePointer2 size={14} /> Drag to orbit · Pinch or scroll to zoom
              </>
            )}
          </div>
        </div>

        <div className="playback-panel">
          <div className="timeline-labels">
            <span>{formatTime(time)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            className="timeline-range"
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={time}
            onChange={(event) => requestSeek(Number(event.target.value))}
            aria-label="Guide timeline"
            style={{ "--timeline-progress": `${(time / duration) * 100}%` } as React.CSSProperties}
          />
          <div className="playback-row">
            <div className="playback-buttons">
              <button
                className="icon-button"
                onClick={() => goToStep(currentStepIndex - 1)}
                disabled={currentStepIndex === 0}
                aria-label="Previous step"
              >
                <SkipBack size={19} />
              </button>
              <button
                className="play-button"
                onClick={() => {
                  if (time >= duration) setTime(0);
                  setDirection(1);
                  setPlaying((value) => !value);
                }}
                aria-label={playing ? "Pause guide" : "Play guide"}
              >
                {playing ? (
                  <Pause size={21} fill="currentColor" />
                ) : (
                  <Play size={21} fill="currentColor" />
                )}
              </button>
              <button
                className="icon-button"
                onClick={() => goToStep(currentStepIndex + 1)}
                disabled={currentStepIndex === guide.steps.length - 1}
                aria-label="Next step"
              >
                <SkipForward size={19} />
              </button>
              <button
                className="icon-button replay-button"
                onClick={() => requestSeek(stepStart + 0.001)}
                aria-label="Replay current step"
                title="Replay step"
              >
                <RotateCcw size={17} />
              </button>
              <button
                className={`icon-button ${direction === -1 && playing ? "selected" : ""}`}
                onClick={() => {
                  if (time <= 0) setTime(duration);
                  setDirection(-1);
                  setPlaying(true);
                }}
                aria-label="Reverse playback"
                title="Play backward"
              >
                <Rewind size={17} />
              </button>
            </div>
            <div className="playback-options">
              <label className="speed-control">
                <span className="sr-only">Playback speed</span>
                <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                  {[0.5, 0.75, 1, 1.5, 2].map((value) => (
                    <option key={value} value={value}>
                      {value}×
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={`icon-button ${narration ? "selected" : ""}`}
                onClick={() => setNarration((value) => !value)}
                aria-label={narration ? "Turn narration off" : "Turn narration on"}
                aria-pressed={narration}
                title="Narration uses your browser's speech voice"
              >
                {narration ? <Volume2 size={19} /> : <VolumeX size={19} />}
              </button>
              {onPrint && (
                <button
                  className="text-button compact-action"
                  onClick={() => {
                    setPlaying(false);
                    if (engine) onPrint(engine);
                  }}
                  disabled={!engine}
                >
                  <Printer size={17} /> Print
                </button>
              )}
              {onExport && (
                <button
                  className="text-button compact-action"
                  onClick={() => {
                    setPlaying(false);
                    if (engine) onExport(engine);
                  }}
                  disabled={!engine}
                >
                  <Video size={17} /> Export
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="step-rail" aria-label="Guide steps and instruction">
        <div className="step-rail-heading">
          <p className="mono-kicker">
            {guide.product ? "PRODUCT TRAINING SEQUENCE" : "INSTALLATION SEQUENCE"}
          </p>
          <div className="guide-facts">
            <span>
              <Clock3 size={14} /> ≈{guide.estimatedMinutes} min
            </span>
            <span>
              <Users size={14} /> {guide.people} {guide.people === 1 ? "person" : "people"}
            </span>
          </div>
        </div>
        <ol className="step-list">
          {guide.steps.map((item, index) => {
            const active = index === currentStepIndex;
            const complete = index < currentStepIndex;
            return (
              <li key={item.id}>
                <button
                  className={`step-list-button ${active ? "active" : ""} ${
                    complete ? "complete" : ""
                  }`}
                  onClick={() => goToStep(index)}
                  aria-current={active ? "step" : undefined}
                >
                  <span className="step-number">
                    {complete ? <Check size={14} /> : String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="step-list-copy">
                    <strong>{item.shortTitle}</strong>
                    {active && <span>{Math.round(stepProgress * 100)}% viewed</span>}
                  </span>
                  {item.gate && <span className="gate-dot" title="Safety confirmation required" />}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="current-instruction" key={step.id}>
          <p className="mono-kicker">
            STEP {String(currentStepIndex + 1).padStart(2, "0")} /{" "}
            {String(guide.steps.length).padStart(2, "0")}
          </p>
          <h2>{step.title}</h2>
          <p className="instruction-lead">{step.instruction}</p>
          <details className="instruction-details">
            <summary>Professional detail</summary>
            <p>{step.detail}</p>
          </details>
          {step.warning && (
            <div className="warning-note">
              <AlertTriangle size={18} />
              <p>{step.warning}</p>
            </div>
          )}
          <div className="instruction-resources">
            {step.tools.length > 0 && (
              <div>
                <h3>
                  <Wrench size={15} /> Tools
                </h3>
                <ul>
                  {step.tools.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {step.materials.length > 0 && (
              <div>
                <h3>
                  <PackageOpen size={15} /> Materials
                </h3>
                <ul>
                  {step.materials.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="sr-only" aria-live="polite">
        Step {currentStepIndex + 1}: {step.title}
      </div>
      {safetyStep !== null && guide.steps[safetyStep].gate && (
        <SafetyGate
          step={guide.steps[safetyStep]}
          stepNumber={safetyStep + 1}
          onCancel={() => {
            setSafetyStep(null);
            pendingTime.current = null;
          }}
          onConfirm={confirmGate}
        />
      )}
    </section>
  );
}
