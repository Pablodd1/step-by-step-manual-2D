import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  AlertTriangle,
  Bot,
  Camera,
  Check,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileText,
  Hand,
  Layers,
  Pause,
  Play,
  Route,
  Scissors,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sparkles,
  Timer,
  Wrench,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { TaskSimulatorScene } from "@/scene/TaskSimulatorScene";
import {
  MATERIALS,
  PHASE_COLORS,
  PHASE_ORDER,
  SIMULATOR_SURFACE_MODES,
  TASK_REAL_WORLD_MINUTES,
  TASK_TOTAL_SECONDS,
  TOOLS,
  WALLPAPER_TASK,
  buildHumanChecklist,
  buildMachineTask,
  sampleStep,
  stepAtTime,
  stepStartSeconds,
  type SimulatorSurfaceMode,
} from "@contracts/tasks/wallpaperTask";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}` : `${m} min`);

const CUTTING_SHORTCUTS = [
  { stepIndex: 15, label: "16 · Table Cut (Knife + Straightedge)" },
  { stepIndex: 21, label: "22 · Drop 1 Ceiling & Baseboard Cut" },
  { stepIndex: 26, label: "27 · Drop 2 Trim & Peel" },
  { stepIndex: 30, label: "31 · Outlet X-Relief Cut (4 Flaps)" },
];

export default function TaskSimulatorPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TaskSimulatorScene | null>(null);
  const [params] = useSearchParams();
  const [time, setTime] = useState(() => {
    const n = Number(params.get("step"));
    const at = Number(params.get("at") ?? 0.5);
    if (!Number.isFinite(n) || n < 1) return 0;
    const i = Math.min(WALLPAPER_TASK.length, Math.floor(n)) - 1;
    return stepStartSeconds(i) + WALLPAPER_TASK[i].durationS * Math.max(0, Math.min(0.999, at));
  });
  const [playing, setPlaying] = useState(() => params.get("play") !== "0" && !params.get("step"));
  const [speed, setSpeed] = useState(1);
  const [autoCam, setAutoCam] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [surfaceMode, setSurfaceMode] = useState<SimulatorSurfaceMode>(() => {
    const m = params.get("surface") as SimulatorSurfaceMode | null;
    return m && SIMULATOR_SURFACE_MODES.some((s) => s.id === m) ? m : "botanical";
  });
  const [feedback, setFeedback] = useState("");
  const [webglError, setWebglError] = useState("");

  const { index, progress } = stepAtTime(time);
  const step = WALLPAPER_TASK[index];
  const sample = sampleStep(step, progress);
  const activeSurface = SIMULATOR_SURFACE_MODES.find((s) => s.id === surfaceMode) ?? SIMULATOR_SURFACE_MODES[0];

  useEffect(() => {
    if (!stageRef.current) return;
    try {
      const scene = new TaskSimulatorScene(stageRef.current);
      scene.onUserCamera = () => setAutoCam(false);
      sceneRef.current = scene;
    } catch (error) {
      setWebglError(error instanceof Error ? error.message : "WebGL could not start in this browser.");
    }
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setFrame(index, progress);
  }, [index, progress]);

  useEffect(() => {
    sceneRef.current?.setAutoCamera(autoCam);
  }, [autoCam]);

  useEffect(() => {
    sceneRef.current?.setShowToolpath(showPath);
  }, [showPath]);

  useEffect(() => {
    sceneRef.current?.setSurfaceMode(surfaceMode);
  }, [surfaceMode]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setTime((t) => {
        const next = t + dt * speed;
        if (next >= TASK_TOTAL_SECONDS) {
          setPlaying(false);
          return TASK_TOTAL_SECONDS;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  const goTo = useCallback((i: number, atFrac = 0.001) => {
    const safe = Math.max(0, Math.min(WALLPAPER_TASK.length - 1, i));
    setTime(stepStartSeconds(safe) + WALLPAPER_TASK[safe].durationS * atFrac);
    setAutoCam(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index]);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(""), 2600);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label} copied to clipboard`);
    } catch {
      flash("Clipboard blocked by the browser — use Download instead");
    }
  };

  const download = (text: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const machineJson = useMemo(() => JSON.stringify(buildMachineTask(), null, 2), []);
  const currentStepJson = useMemo(() => {
    const all = buildMachineTask(16);
    return JSON.stringify(all.steps[index], null, 2);
  }, [index]);

  const phaseSegments = PHASE_ORDER.map((phase) => {
    const seconds = WALLPAPER_TASK.filter((s) => s.phase === phase).reduce((a, s) => a + s.durationS, 0);
    return { phase, pct: (seconds / TASK_TOTAL_SECONDS) * 100 };
  });

  return (
    <div className="site-shell sim-page">
      <SiteHeader />
      <main className="sim-main">
        <header className="sim-heading">
          <div>
            <p className="mono-kicker acid-text">3D HUMAN + MACHINE SIMULATOR · OFFICIAL UNITEC FICHAS TÉCNICAS (FT_03 / FT_13 / FT_15 / FT_27)</p>
            <h1>Full-body human installer, real cuts & machine toolpaths</h1>
            <p className="sim-sub">
              {WALLPAPER_TASK.length} steps · 4.16 × 2.55 m wall · 8 drops · ≈{fmtMinutes(TASK_REAL_WORLD_MINUTES)} on site ·{" "}
              <strong>{activeSurface.spec}</strong>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px", alignItems: "center" }}>
              <span className="mono-kicker" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginRight: "4px" }}>
                <Layers size={13} /> Surface:
              </span>
              {SIMULATOR_SURFACE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSurfaceMode(m.id)}
                  className={surfaceMode === m.id ? "primary-button" : "ghost-button"}
                  style={{ padding: "5px 10px", fontSize: "12px" }}
                >
                  {m.label}
                </button>
              ))}
              <a
                href={activeSurface.fichaUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
                style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
              >
                <FileText size={13} /> Open {activeSurface.fichaCode} PDF <ExternalLink size={12} />
              </a>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px", alignItems: "center" }}>
              <span className="mono-kicker" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginRight: "4px" }}>
                <Scissors size={13} /> Jump to real human cuts:
              </span>
              {CUTTING_SHORTCUTS.map((c) => (
                <button
                  key={c.stepIndex}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    goTo(c.stepIndex, 0.58);
                  }}
                  className={index === c.stepIndex ? "primary-button" : "ghost-button"}
                  style={{ padding: "4px 9px", fontSize: "11.5px" }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="sim-export">
            <button className="secondary-button" onClick={() => copy(buildHumanChecklist(), "Human checklist")}>
              <ClipboardCopy size={15} /> Copy human steps
            </button>
            <button className="secondary-button" onClick={() => copy(machineJson, "Machine task JSON")}>
              <Bot size={15} /> Copy machine JSON
            </button>
            <button className="primary-button" onClick={() => download(machineJson, "plumb-wallpaper-task.v1.json", "application/json")}>
              <Download size={15} /> Download task
            </button>
            {feedback && <span className="sim-feedback">{feedback}</span>}
          </div>
        </header>

        <section className="sim-grid">
          <div className="sim-stage-col">
            <div className="sim-stage" ref={stageRef}>
              {webglError && (
                <div className="sim-error">
                  <AlertTriangle size={18} /> {webglError}
                </div>
              )}
              <div className="sim-hud">
                <span className="sim-chip" style={{ background: PHASE_COLORS[step.phase] }}>
                  {step.phase.toUpperCase()}
                </span>
                <strong>
                  {String(index + 1).padStart(2, "0")} / {WALLPAPER_TASK.length} · {step.title}
                </strong>
              </div>
              <div className="sim-hud-tools">
                <span>
                  <Wrench size={13} /> {TOOLS[step.tool].name}
                  {step.secondaryTool ? ` + ${TOOLS[step.secondaryTool].name}` : ""}
                </span>
                {step.product && (
                  <span>
                    <Sparkles size={13} /> {step.product}
                  </span>
                )}
                <span>
                  <Hand size={13} /> {step.hand === "both" ? "Both hands" : `${step.hand} hand`}
                  {step.ppe.length > 0 ? ` · ${step.ppe.join(", ")}` : ""}
                </span>
              </div>
              <div className="sim-hud-right">
                <button className={autoCam ? "active" : ""} onClick={() => setAutoCam(true)} title="Camera follows the work">
                  <Camera size={13} /> Auto camera
                </button>
                <button className={showPath ? "active" : ""} onClick={() => setShowPath((v) => !v)} title="Show the robot toolpath and wall frame axes">
                  <Route size={13} /> Toolpath
                </button>
              </div>
              <div className="sim-telemetry">
                <span>TOOL TIP</span>
                <code>
                  x {sample.primary.p[0].toFixed(3)} · y {sample.primary.p[1].toFixed(3)} · z {sample.primary.p[2].toFixed(3)} m
                </code>
                <span className={sample.primary.contact ? "contact on" : "contact"}>{sample.primary.contact ? "CONTACT" : "TRAVEL"}</span>
                {sample.primary.contact && step.forceN ? <span>{step.forceN} N</span> : null}
              </div>
            </div>

            <div className="sim-playback">
              <div className="sim-phasebar" aria-hidden="true">
                {phaseSegments.map((seg) => (
                  <i key={seg.phase} style={{ width: `${seg.pct}%`, background: PHASE_COLORS[seg.phase] }} title={seg.phase} />
                ))}
              </div>
              <input
                className="timeline-range"
                type="range"
                min={0}
                max={TASK_TOTAL_SECONDS}
                step={0.01}
                value={time}
                onChange={(e) => setTime(Number(e.target.value))}
                aria-label="Task timeline"
                style={{ "--timeline-progress": `${(time / TASK_TOTAL_SECONDS) * 100}%` } as React.CSSProperties}
              />
              <div className="playback-row">
                <div className="playback-buttons">
                  <button className="icon-button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous step">
                    <SkipBack size={18} />
                  </button>
                  <button
                    className="play-button"
                    onClick={() => {
                      if (time >= TASK_TOTAL_SECONDS) setTime(0);
                      setPlaying((p) => !p);
                    }}
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <button className="icon-button" onClick={() => goTo(index + 1)} disabled={index === WALLPAPER_TASK.length - 1} aria-label="Next step">
                    <SkipForward size={18} />
                  </button>
                  <span className="sim-time">
                    {fmt(time)} / {fmt(TASK_TOTAL_SECONDS)}
                  </span>
                </div>
                <label className="speed-control">
                  <span className="sr-only">Speed</span>
                  <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                    {[0.5, 1, 1.5, 2, 3].map((v) => (
                      <option key={v} value={v}>
                        {v}×
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <aside className="sim-rail">
            <article className="sim-card" key={step.id}>
              <p className="mono-kicker">
                STEP {String(index + 1).padStart(2, "0")} · {step.primitive.toUpperCase()} · ≈{fmtMinutes(step.realWorldMinutes)} on site
              </p>
              <h2>{step.title}</h2>
              <p className="sim-instruction">{step.instruction}</p>
              {step.tips.length > 0 && (
                <ul className="sim-tips">
                  {step.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              )}
              {step.safety && (
                <div className="warning-note">
                  <ShieldCheck size={16} />
                  <p>{step.safety}</p>
                </div>
              )}
              <div className="sim-criteria">
                <h3>
                  <Check size={14} /> Done when
                </h3>
                <ul>
                  {step.successCriteria.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <details className="sim-json">
                <summary>
                  <Bot size={13} /> Machine spec for this step
                </summary>
                <pre>{currentStepJson}</pre>
                <button className="text-button" onClick={() => copy(currentStepJson, "Step JSON")}>
                  <ClipboardCopy size={13} /> Copy step JSON
                </button>
              </details>
            </article>

            <ol className="sim-steps">
              {WALLPAPER_TASK.map((s, i) => (
                <li key={s.id}>
                  <button className={`${i === index ? "active" : ""} ${i < index ? "done" : ""}`} onClick={() => goTo(i)}>
                    <span className="sim-step-dot" style={{ background: PHASE_COLORS[s.phase] }} />
                    <span className="sim-step-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="sim-step-title">{s.title}</span>
                    {i === index && <span className="sim-step-pct">{Math.round(progress * 100)}%</span>}
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="sim-bom">
          <div>
            <p className="mono-kicker acid-text">MATERIALS & OFFICIAL UNITEC FICHAS TÉCNICAS</p>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Used in steps</th>
                </tr>
              </thead>
              <tbody>
                {MATERIALS.map((m) => (
                  <tr key={m.item}>
                    <td>
                      <strong>
                        {m.item}{" "}
                        {m.fichaUrl && (
                          <a
                            href={m.fichaUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--acid)", fontSize: "11px", marginLeft: "6px", textDecoration: "underline" }}
                          >
                            [PDF]
                          </a>
                        )}
                      </strong>
                      <small>{m.note}</small>
                    </td>
                    <td>{m.quantity}</td>
                    <td>
                      {m.usedIn
                        .map((id) => WALLPAPER_TASK.findIndex((s) => s.id === id) + 1)
                        .filter((n) => n > 0)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="mono-kicker acid-text">TOOLS</p>
            <table>
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Spec</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(TOOLS)
                  .filter(([id]) => !["hands", "clock", "plate", "dropCorner"].includes(id))
                  .map(([id, t]) => (
                    <tr key={id}>
                      <td>
                        <strong>{t.name}</strong>
                      </td>
                      <td>{t.spec}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="sim-note">
              <Timer size={13} /> Forces and times are nominal planning values for people and robots. Official UNITEC USA DESIGN Technical Data
              Sheets (FT_03, FT_13, FT_15, FT_17, FT_27) take priority.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
