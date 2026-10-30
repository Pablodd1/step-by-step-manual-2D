import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Box,
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileText,
  Film,
  GitBranch,
  Grid,
  Layers,
  Pause,
  PenTool,
  Play,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Video,
  Wrench,
  X,
  ZoomIn,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BuilderFigure, ManualToolArt, resolveManualToolKind } from "@/components/ManualLineArt";
import { TaskSimulatorScene, type SimulatorViewMode } from "@/scene/TaskSimulatorScene";
import {
  BLUEPRINT_TRACKS,
  DONT_GUESS_CONFLICTS,
  MASTER_DEVELOPER_PROMPT,
  QUALITY_TIERS,
  REFERENCE_LINKS,
  SIX_PHASE_PLAN,
  VIDEO_FACTORY_PIPELINES,
  type QualityTierId,
  type TrackId,
} from "@contracts/blueprintData";
import {
  MATERIALS,
  SIMULATOR_SURFACE_MODES,
  TOOLS,
  WALLPAPER_TASK,
  buildHumanChecklist,
  buildMachineTask,
  sampleStep,
  type SimulatorSurfaceMode,
} from "@contracts/tasks/wallpaperTask";

interface PrintedCard {
  stepNumber: number;
  title: string;
  instruction: string;
  phase: string;
  detailLabel: string;
  itemsText: string;
  dataUrl: string;
}

function BuddySvg({ pose }: { pose: "wave" | "point" | "thumbsUp" }) {
  const wavePath =
    "M300 30 C232 34 204 104 220 162 C230 212 238 258 240 292 C150 328 18 402 14 452 C10 502 92 560 150 600 C142 622 136 640 140 650 C152 664 172 656 178 640 L184 975 L392 975 L580 975 L497 872 C504 700 502 560 500 466 C556 396 630 244 656 152 C664 124 626 112 610 140 C566 226 466 320 400 268 L408 152 L462 136 C438 66 366 28 300 30 Z";
  const pointPath =
    "M300 30 C232 34 204 104 220 162 C230 212 238 258 240 292 C150 328 18 402 14 452 C10 502 92 560 150 600 C142 622 136 640 140 650 C152 664 172 656 178 640 L184 975 L392 975 L580 975 L497 872 C504 700 502 560 500 470 C580 486 664 480 742 478 C768 476 768 424 742 422 C650 368 520 320 400 268 L408 152 L462 136 C438 66 366 28 300 30 Z";
  const d = pose === "point" ? pointPath : wavePath;
  return (
    <svg viewBox="0 0 862 1010" fill="none" stroke="#141414" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <g transform="rotate(4 400 975)">
        <path fill="#ffffff" d={d} />
        <path d="M268 92 C246 160 288 214 352 212 C392 210 404 190 408 152" />
        <path d="M388 706 L388 975" />
        <circle cx="360" cy="100" r="16" fill="#141414" stroke="none" />
      </g>
    </svg>
  );
}

export default function TaskSimulatorPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TaskSimulatorScene | null>(null);
  const [params] = useSearchParams();

  // Track selector: Paste-the-Wall vs Peel-and-Stick (FT_13) vs UNITEC Rigid Panel (FT_03/15/27)
  const [trackId, setTrackId] = useState<TrackId>(() => {
    const t = params.get("track") as TrackId | null;
    if (t && t in BLUEPRINT_TRACKS) return t;
    if (params.get("surface") === "marble-roll") return "peel-and-stick";
    if (params.get("surface") === "eclipse-sheet" || params.get("surface") === "wpc-choco") return "unitec-panel";
    return "paste-the-wall";
  });

  // Step mode: "demo12" (12-step canonical blueprint player + Step 0 Parts Tray) or "full36" (36-step granular timeline)
  const [playerMode, setPlayerMode] = useState<"demo12" | "full36">(() =>
    params.get("step") && Number(params.get("step")) > 12 ? "full36" : "demo12",
  );

  // In demo12 mode, stepCursor = 0 is "Parts & Tools Tray", 1..12 are the 12 canonical steps
  const [demoCursor, setDemoCursor] = useState<number>(() => {
    if (params.get("parts") === "1") return 0;
    const s = Number(params.get("bstep"));
    if (Number.isFinite(s) && s >= 0 && s <= 12) return Math.floor(s);
    const legacy = Number(params.get("step"));
    if (legacy === 16) return 6;
    if (legacy === 20) return 8;
    if (legacy === 22) return 10;
    if (legacy === 31) return 12;
    return 10; // Default to Step 10 (Baseboard 30° knife + 600mm steel straightedge trim cut!) so the user immediately sees the signature close-up
  });

  // In full36 mode, stepIdx = 0..35
  const [fullIdx, setFullIdx] = useState<number>(() => {
    const n = Number(params.get("step"));
    return Number.isFinite(n) && n >= 1 ? Math.max(0, Math.min(35, Math.floor(n) - 1)) : 21;
  });

  const [stepProgress, setStepProgress] = useState<number>(() => {
    const at = Number(params.get("at"));
    return Number.isFinite(at) && at > 0 && at < 1 ? at : 0.65;
  });

  const [playing, setPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<SimulatorViewMode>(() =>
    params.get("view") === "room" || params.get("view") === "realistic" ? "room" : "drawing",
  );
  const [qualityTier, setQualityTier] = useState<QualityTierId>("medium");
  const [showMacro, setShowMacro] = useState(() => params.get("macro") !== "0");
  const [exploded, setExploded] = useState(() => params.get("exploded") === "1");
  const [showManual, setShowManual] = useState(() => params.get("manual") === "1");
  const [safetyCleared, setSafetyCleared] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"sheets" | "video" | "calc" | "schema" | "links">("calc");

  // Live Roll & Pattern Calculator state (side-by-side Formula A vs Formula B)
  const [calcWallW, setCalcWallW] = useState(4.16);
  const [calcWallH, setCalcWallH] = useState(2.55);
  const [calcRollW, setCalcRollW] = useState<52 | 53 | 60>(53);
  const [calcRollLen, setCalcRollLen] = useState(10.05);
  const [calcRepeatCm, setCalcRepeatCm] = useState(64);
  const [calcMatchType, setCalcMatchType] = useState<"free" | "straight" | "half">("straight");

  // Printable Step Sheets & Video Recording state
  const [printedCards, setPrintedCards] = useState<PrintedCard[]>([]);
  const [generatingSheets, setGeneratingSheets] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>("");
  const [moderationState, setModerationState] = useState<"draft" | "review" | "approved">("approved");
  const [feedback, setFeedback] = useState("");
  const [webglError, setWebglError] = useState("");

  const track = BLUEPRINT_TRACKS[trackId];
  const isPartsTray = playerMode === "demo12" && demoCursor === 0;
  const activeBlueprintStep =
    playerMode === "demo12"
      ? track.steps[Math.max(0, Math.min(11, (demoCursor || 1) - 1))]
      : track.steps[Math.min(11, Math.floor((fullIdx / 36) * 12))];

  const effectiveSimIdx = playerMode === "demo12" ? activeBlueprintStep.simStepIndex : fullIdx;
  const effectiveSimStep = WALLPAPER_TASK[effectiveSimIdx];
  const sample = sampleStep(effectiveSimStep, stepProgress);

  const surfaceMode: SimulatorSurfaceMode = useMemo(() => {
    const paramSurf = params.get("surface") as SimulatorSurfaceMode | null;
    if (paramSurf && SIMULATOR_SURFACE_MODES.some((s) => s.id === paramSurf)) return paramSurf;
    if (trackId === "peel-and-stick") return "marble-roll";
    if (trackId === "unitec-panel") return "eclipse-sheet";
    return "botanical";
  }, [params, trackId]);

  const activeSurface = SIMULATOR_SURFACE_MODES.find((s) => s.id === surfaceMode) ?? SIMULATOR_SURFACE_MODES[0];

  useEffect(() => {
    if (!stageRef.current) return;
    try {
      const scene = new TaskSimulatorScene(stageRef.current);
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
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setPartsTrayMode(isPartsTray);
    if (!isPartsTray) {
      scene.setDetailLabel(
        playerMode === "demo12" ? activeBlueprintStep.detailLabel : TOOLS[effectiveSimStep.tool].name,
      );
      scene.setFrame(effectiveSimIdx, stepProgress);
    }
  }, [isPartsTray, effectiveSimIdx, stepProgress, playerMode, activeBlueprintStep, effectiveSimStep]);

  useEffect(() => {
    sceneRef.current?.setViewMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    sceneRef.current?.setShowMacroZoom(showMacro);
  }, [showMacro]);

  useEffect(() => {
    sceneRef.current?.setExploded(exploded);
  }, [exploded]);

  useEffect(() => {
    sceneRef.current?.setSurfaceMode(surfaceMode);
  }, [surfaceMode]);

  useEffect(() => {
    sceneRef.current?.setQualityTier(qualityTier);
  }, [qualityTier]);

  // Playback loop through steps
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      setStepProgress((p) => {
        const next = p + dt * 0.38;
        if (next >= 0.98) {
          if (playerMode === "demo12") {
            setDemoCursor((c) => (c >= 12 ? 1 : c + 1));
          } else {
            setFullIdx((i) => (i >= 35 ? 0 : i + 1));
          }
          return 0.12;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, playerMode]);

  const stepPrev = useCallback(() => {
    setPlaying(false);
    if (playerMode === "demo12") {
      setDemoCursor((c) => Math.max(0, c - 1));
      setStepProgress(0.62);
    } else {
      setFullIdx((i) => Math.max(0, i - 1));
      setStepProgress(0.62);
    }
  }, [playerMode]);

  const stepNext = useCallback(() => {
    setPlaying(false);
    if (playerMode === "demo12") {
      setDemoCursor((c) => Math.min(12, c + 1));
      setStepProgress(0.62);
    } else {
      setFullIdx((i) => Math.min(35, i + 1));
      setStepProgress(0.62);
    }
  }, [playerMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowRight") stepNext();
      else if (e.key === "ArrowLeft") stepPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepNext, stepPrev]);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(""), 3200);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label} copied to clipboard`);
    } catch {
      flash("Clipboard blocked by browser — use Download instead");
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

  // Output #2: Generate All 12 Printable Step Sheets directly from the same step-data file + 3D scene!
  const handleGeneratePrintableSheets = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene) return;
    setGeneratingSheets(true);
    setPlaying(false);
    setActiveTab("sheets");
    const savedMode = viewMode;
    scene.setViewMode("drawing");

    const cards: PrintedCard[] = [];
    for (const st of track.steps) {
      scene.setDetailLabel(st.detailLabel);
      scene.setFrame(st.simStepIndex, st.simProgress);
      const dataUrl = scene.captureStepComposite(
        `${String(st.stepNumber).padStart(2, "0")} / 12`,
        st.title,
        st.detailLabel,
      );
      cards.push({
        stepNumber: st.stepNumber,
        title: st.title,
        instruction: st.instruction,
        phase: st.phase,
        detailLabel: st.detailLabel,
        itemsText: st.items.map((it) => `${it.qty}× ${it.name} (${it.code})`).join(" · "),
        dataUrl,
      });
    }

    scene.setViewMode(savedMode);
    scene.setPartsTrayMode(isPartsTray);
    if (!isPartsTray) {
      scene.setFrame(effectiveSimIdx, stepProgress);
    }
    setPrintedCards(cards);
    setGeneratingSheets(false);
    flash(`Generated 12 printable step sheets from ${track.name}`);
  }, [viewMode, track, isPartsTray, effectiveSimIdx, stepProgress]);

  // Output #3: Record 30 fps HD Video directly from the 3D scene canvas!
  const handleRecordVideo = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || recordingVideo) return;
    const canvas = scene.getCanvas();
    if (typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
      flash("MediaRecorder not supported in this browser — use Pipeline 1 (FFmpeg) below");
      setActiveTab("video");
      return;
    }
    setRecordingVideo(true);
    setActiveTab("video");
    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      setRecordingVideo(false);
      flash("HD 30fps WebM video captured from the 3D scene!");
    };
    recorder.start();
    setPlaying(true);
    window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
      setPlaying(false);
    }, 4500);
  }, [recordingVideo]);

  // Dual Roll-Count Calculator (Formula A: Strip-by-Strip vs Formula B: Area + Waste %)
  const calcMetrics = useMemo(() => {
    const rollW_m = calcRollW / 100;
    const drops = Math.ceil(calcWallW / rollW_m);
    const lastDropWidthCm = Math.round((calcWallW - (drops - 1) * rollW_m) * 100);
    const repeat_m = calcRepeatCm / 100;
    const rawDropLen = calcWallH + 0.1; // +10 cm top/bottom trim allowance
    const effectiveRepeat = calcMatchType === "free" || repeat_m <= 0 ? 0 : calcMatchType === "half" ? repeat_m * 1.5 : repeat_m;
    const dropLenM =
      effectiveRepeat > 0 ? Math.ceil(rawDropLen / effectiveRepeat) * effectiveRepeat : rawDropLen;
    const dropsPerRoll = Math.max(1, Math.floor(calcRollLen / dropLenM));
    const rollsFormulaA = Math.ceil(drops / dropsPerRoll);
    const remnantPerRollM = Math.max(0, calcRollLen - dropsPerRoll * dropLenM);

    // Formula B: Area + 15% waste
    const wallAreaM2 = calcWallW * calcWallH;
    const rollAreaM2 = rollW_m * calcRollLen;
    const rollsFormulaB = Math.ceil((wallAreaM2 * 1.15) / rollAreaM2);

    return {
      drops,
      lastDropWidthCm,
      dropLenM,
      dropsPerRoll,
      rollsFormulaA,
      remnantPerRollM,
      wallAreaM2,
      rollAreaM2,
      rollsFormulaB,
      deltaRolls: rollsFormulaA - rollsFormulaB,
    };
  }, [calcWallW, calcWallH, calcRollW, calcRollLen, calcRepeatCm, calcMatchType]);

  const unifiedStepFileJson = useMemo(
    () =>
      JSON.stringify(
        {
          schemaVersion: "plumb-unitec-blueprint.v1",
          principle: "One step-data file generates the interactive 3D app, the HD videos, and the printable step images.",
          activeTrack: track.id,
          fichaCode: track.fichaCode,
          stepCount: track.steps.length,
          steps: track.steps,
        },
        null,
        2,
      ),
    [track],
  );

  const totalSteps = playerMode === "demo12" ? 12 : 36;
  const currentStepDisplay = isPartsTray
    ? "Parts"
    : playerMode === "demo12"
      ? `${activeBlueprintStep.stepNumber}`
      : `${fullIdx + 1}`;

  return (
    <div className="site-shell sim-page">
      <SiteHeader />
      <main className="sim-main">
        {/* ONE-LINE CORE ANSWER BANNER */}
        <section className="blueprint-hero-banner">
          <div>
            <p className="mono-kicker acid-text">
              THE ANSWER IN ONE LINE · UNIFIED STEP-DATA ENGINE (THREE.JS + GLTF + FFMPEG + PRINT SHEETS)
            </p>
            <h1>
              One step-data file generates the interactive 3D app, the HD videos, and the printable step images.
            </h1>
            <p className="sim-sub">
              Steps are data — parts, tools, from/to positions, camera pose, and circular detail-loupe anchors — so the{" "}
              <strong>exact same step-data file</strong> drives the live 3D manual below, the 1080p30 Video Factory, and the
              printable IKEA-style step cards.
            </p>
          </div>
          <div className="blueprint-output-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleGeneratePrintableSheets}
              disabled={generatingSheets}
            >
              <Printer size={15} /> {generatingSheets ? "Rendering 12 Sheets…" : "Generate Printable Step Sheets (12 Cards)"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleRecordVideo}
              disabled={recordingVideo}
            >
              <Video size={15} /> {recordingVideo ? "Recording 30fps WebM…" : "Record 3D Video (30fps WebM)"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => download(unifiedStepFileJson, `plumb-${track.id}-blueprint.v1.json`, "application/json")}
            >
              <Download size={15} /> Download Step-Data JSON
            </button>
            {feedback && <span className="sim-feedback">{feedback}</span>}
          </div>
        </section>

        {/* ICONIC IKEA / FLAT-PACK / BOB-THE-BUILDER 3D MANUAL SHEET */}
        <section className="bobby-manual-wrapper">
          <div className={`bobby-page ${viewMode === "room" ? "realistic-theme" : "drawing-theme"}`}>
            {/* Top Bar inside the dashed manual frame */}
            <div className="bobby-topbar">
              <div className="bobby-track-pills" role="tablist" aria-label="Installation tracks">
                {(Object.keys(BLUEPRINT_TRACKS) as TrackId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`bobby-pill ${trackId === id ? "active" : ""}`}
                    onClick={() => {
                      setTrackId(id);
                      if (id === "peel-and-stick") setCalcRollW(60);
                      else if (id === "paste-the-wall") setCalcRollW(53);
                    }}
                  >
                    {id === "paste-the-wall"
                      ? "Track A · Paste-the-Wall (12)"
                      : id === "peel-and-stick"
                        ? "Track B · Peel & Stick FT_13 (12)"
                        : "Track C · UNITEC Panels FT_03/15 (12)"}
                  </button>
                ))}
              </div>

              <div className="bobby-controls-right">
                <button
                  type="button"
                  className={`bobby-pill ${isPartsTray ? "active" : ""}`}
                  onClick={() => {
                    setPlaying(false);
                    setPlayerMode("demo12");
                    setDemoCursor((c) => (c === 0 ? 1 : 0));
                  }}
                  title="Step 0: Lay out all parts and tools in 3D with floating part tags"
                >
                  <Grid size={13} /> {isPartsTray ? "Exit Parts Tray" : "Step 0 · Parts Tray"}
                </button>
                <button
                  type="button"
                  className={`bobby-pill ${viewMode === "drawing" ? "active" : ""}`}
                  onClick={() => setViewMode((m) => (m === "drawing" ? "room" : "drawing"))}
                  title="Toggle between CAD Line-Drawing style and Realistic 3D Room lighting"
                >
                  <PenTool size={13} /> {viewMode === "drawing" ? "Style: Drawing (CAD)" : "Style: Realistic 3D"}
                </button>
                <button
                  type="button"
                  className={`bobby-pill ${exploded ? "active" : ""}`}
                  onClick={() => setExploded((v) => !v)}
                  title="Explode the 5 wall assembly layers along +Z"
                >
                  <Box size={13} /> Explode
                </button>
                <button
                  type="button"
                  className={`bobby-pill ${playerMode === "full36" ? "active" : ""}`}
                  onClick={() => setPlayerMode((m) => (m === "demo12" ? "full36" : "demo12"))}
                  title="Switch between 12-Step Canonical Demo Player and Full 36-Step Granular Sub-Operations"
                >
                  <Layers size={13} /> {playerMode === "demo12" ? "12-Step Demo" : "36-Step Full"}
                </button>
                <select
                  className="bobby-tier-select"
                  value={qualityTier}
                  onChange={(e) => setQualityTier(e.target.value as QualityTierId)}
                  aria-label="Adaptive rendering quality tier"
                >
                  {QUALITY_TIERS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`bobby-pill ${showManual ? "active" : ""}`}
                  onClick={() => setShowManual((v) => !v)}
                >
                  <BookOpen size={13} /> {track.fichaCode} PDF
                </button>
              </div>
            </div>

            {/* Quick Step-Zoom Jump Bar */}
            <div className="bobby-jump-bar">
              <span className="bobby-jump-label">Jump to key 3D zoom:</span>
              {[
                { cursor: 0, label: "00 · Parts & Tools Tray" },
                { cursor: 1, label: "01 · Safety Lockout & Outlet Plate" },
                { cursor: 3, label: "03 · Putty Knife Hole Fill" },
                { cursor: 6, label: "06 · Table Cut (30° Knife + Rule)" },
                { cursor: 8, label: "08 · Hang / Peel Drop 1" },
                { cursor: 10, label: "10 · Baseboard Crease Trim Cut" },
                { cursor: 12, label: "12 · Outlet 4-Flap X-Relief Cut" },
              ].map((j) => (
                <button
                  key={j.cursor}
                  type="button"
                  className={`bobby-jump-chip ${playerMode === "demo12" && demoCursor === j.cursor ? "active" : ""}`}
                  onClick={() => {
                    setPlaying(false);
                    setPlayerMode("demo12");
                    setDemoCursor(j.cursor);
                    setStepProgress(0.65);
                  }}
                >
                  {j.label}
                </button>
              ))}
            </div>

            {/* Main 3D View + Optional Side-by-Side Official UNITEC PDF Drawer */}
            <div className={`bobby-stage-split ${showManual ? "with-manual" : ""}`}>
              <div className="bobby-view" ref={stageRef}>
                {webglError && (
                  <div className="sim-error">
                    <AlertTriangle size={18} /> {webglError}
                  </div>
                )}

                {/* Big IKEA / Bygga Step Number + Corner Vector Tool/Hardware Box in Top-Left */}
                <div className="bobby-corner-stack">
                  <div className="bobby-stepno">
                    {currentStepDisplay}
                    {!isPartsTray && <small>/ {totalSteps}</small>}
                  </div>
                  {!isPartsTray && (
                    <div className="bobby-hw-box" aria-label="Step tools and parts">
                      {activeBlueprintStep.items.slice(0, 3).map((it, idx) => (
                        <div key={`${it.code}-${idx}`} className="bobby-hw-row">
                          <span className="bobby-hw-qty">{it.qty}×</span>
                          <ManualToolArt kind={resolveManualToolKind(`${it.name} ${it.code}`)} size={48} />
                          <div className="bobby-hw-meta">
                            <strong>{it.name}</strong>
                            <code>{it.code}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Safety Gate Overlay Banner on Electrical Steps */}
                {!isPartsTray && activeBlueprintStep.safetyGate && (
                  <div className="bobby-safety-gate">
                    <div className="bobby-safety-title">
                      <ShieldAlert size={16} />
                      <strong>{activeBlueprintStep.safetyGate.title}</strong>
                      <span className="bobby-safety-badge">
                        {safetyCleared[activeBlueprintStep.safetyGate.id] ? "LOCKOUT VERIFIED" : "ACTION REQUIRED"}
                      </span>
                    </div>
                    <p>{activeBlueprintStep.safetyGate.rule}</p>
                    <label className="bobby-safety-check">
                      <input
                        type="checkbox"
                        checked={!!safetyCleared[activeBlueprintStep.safetyGate.id]}
                        onChange={(e) =>
                          setSafetyCleared((prev) => ({
                            ...prev,
                            [activeBlueprintStep.safetyGate!.id]: e.target.checked,
                          }))
                        }
                      />
                      <span>{activeBlueprintStep.safetyGate.verification}</span>
                    </label>
                  </div>
                )}

                {/* Encouraging Assembly Buddy (#buddy) on milestone steps */}
                {!isPartsTray && activeBlueprintStep.buddyCheer && (
                  <div className="bobby-buddy show">
                    <div className="bobby-buddy-speech">{activeBlueprintStep.buddyCheer.speech}</div>
                    <div className="bobby-buddy-guy">
                      <BuilderFigure
                        pose={
                          activeBlueprintStep.buddyCheer.pose === "thumbsUp"
                            ? "cheer"
                            : activeBlueprintStep.buddyCheer.pose === "wave"
                              ? "wave"
                              : "point"
                        }
                        size={86}
                      />
                    </div>
                  </div>
                )}

                <div className="bobby-hint">
                  drag to rotate · scroll to zoom · circular loupe tracks the active tool tip ({sample.primary.p[0].toFixed(2)},{" "}
                  {sample.primary.p[1].toFixed(2)}, {sample.primary.p[2].toFixed(2)} m)
                </div>
              </div>

              {showManual && (
                <div className="sim-manual-drawer">
                  <div className="sim-manual-header">
                    <div>
                      <span className="mono-kicker acid-text">OFFICIAL UNITEC FICHA TÉCNICA · {track.fichaCode}</span>
                      <strong>{track.name}</strong>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <a
                        href={track.fichaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ghost-button"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                      >
                        New Tab <ExternalLink size={11} />
                      </a>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setShowManual(false)}
                        aria-label="Close manual drawer"
                        style={{ width: "28px", height: "28px" }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                  <iframe src={track.fichaUrl} title={`UNITEC Ficha Técnica ${track.fichaCode}`} className="sim-manual-iframe" />
                </div>
              )}
            </div>

            {/* Parts & Tools Chips Row (#legend) */}
            <div className="bobby-legend">
              {isPartsTray
                ? track.trayItems.map((it) => (
                    <div key={it.id} className="bobby-chip">
                      <span className="dot" />
                      <span className="q">{it.qty}×</span>
                      <span>{it.name}</span>
                      <code>
                        {it.code} · {it.bagOrGroup}
                      </code>
                    </div>
                  ))
                : activeBlueprintStep.items.map((it, idx) => (
                    <div key={`${it.code}-${idx}`} className="bobby-chip">
                      <span className="dot" />
                      <span className="q">{it.qty}×</span>
                      <span>{it.name}</span>
                      <code>{it.code}</code>
                    </div>
                  ))}
              <div className="bobby-chip phase-pill">
                <code>PHASE: {isPartsTray ? "PARTS TRAY" : activeBlueprintStep.phase}</code>
              </div>
            </div>

            {/* Step Title & Caption (.cap) */}
            <div className="bobby-cap">
              <div className="bobby-cap-name">
                {isPartsTray
                  ? "0. Sort tools, rolls & fittings (3D Parts Tray)"
                  : playerMode === "demo12"
                    ? `${activeBlueprintStep.stepNumber}. ${activeBlueprintStep.title}`
                    : `${fullIdx + 1}. ${effectiveSimStep.title}`}
              </div>
              <div className="bobby-cap-txt">
                {isPartsTray
                  ? "All required tools, rolls, straightedges, and safety testers laid out in 3D. Drag to rotate or click Step 1 to begin the installation."
                  : playerMode === "demo12"
                    ? activeBlueprintStep.instruction
                    : effectiveSimStep.instruction}
              </div>
            </div>

            {/* Bottom Step Ruler & Circular Navigation Bar (.bar) */}
            <div className="bobby-bar">
              <div className="bobby-bar-group">
                <button
                  type="button"
                  className={`bobby-nav-btn ${playing ? "active" : ""}`}
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? "Pause" : "Play"}
                  title={playing ? "Pause animation" : "Play through the steps"}
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  type="button"
                  className={`bobby-nav-btn ${showMacro ? "active" : ""}`}
                  onClick={() => setShowMacro((v) => !v)}
                  aria-label="Toggle close-up detail loupe"
                  title="Toggle circular 3.5× close-up detail loupe & leader line"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  type="button"
                  className={`bobby-nav-btn ${isPartsTray ? "active" : ""}`}
                  onClick={() => {
                    setPlaying(false);
                    setPlayerMode("demo12");
                    setDemoCursor((c) => (c === 0 ? 1 : 0));
                  }}
                  aria-label="Toggle Parts Tray"
                  title="Step 0: 3D Parts & Tools Tray"
                >
                  <Wrench size={17} />
                </button>
              </div>

              {/* Ticked Step Ruler (.track) */}
              <div className="bobby-track">
                <div
                  className="bobby-track-fill"
                  style={{
                    width: `${
                      playerMode === "demo12" ? (demoCursor / 12) * 100 : ((fullIdx + 1) / 36) * 100
                    }%`,
                  }}
                />
                <span className="bobby-track-lbl">Step</span>
                <span className="bobby-track-val">
                  {isPartsTray
                    ? "Parts Tray (0 / 12)"
                    : playerMode === "demo12"
                      ? `${activeBlueprintStep.stepNumber} / 12 · ${activeBlueprintStep.phase}`
                      : `${fullIdx + 1} / 36`}
                </span>
                <input
                  type="range"
                  min={playerMode === "demo12" ? 0 : 0}
                  max={playerMode === "demo12" ? 12 : 35}
                  step={1}
                  value={playerMode === "demo12" ? demoCursor : fullIdx}
                  onChange={(e) => {
                    setPlaying(false);
                    const v = Number(e.target.value);
                    if (playerMode === "demo12") setDemoCursor(v);
                    else setFullIdx(v);
                    setStepProgress(0.65);
                  }}
                  aria-label="Step selector"
                />
              </div>

              {/* Intra-step motion scrubber */}
              <div className="bobby-subscrub" title="Scrub tool motion within the current step">
                <span>Motion</span>
                <input
                  type="range"
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  value={stepProgress}
                  onChange={(e) => {
                    setPlaying(false);
                    setStepProgress(Number(e.target.value));
                  }}
                  aria-label="Tool motion progress"
                />
                <code>{Math.round(stepProgress * 100)}%</code>
              </div>

              <div className="bobby-bar-group">
                <button
                  type="button"
                  className="bobby-nav-btn"
                  onClick={stepPrev}
                  disabled={playerMode === "demo12" ? demoCursor === 0 : fullIdx === 0}
                  aria-label="Previous step"
                >
                  <ArrowLeft size={18} />
                </button>
                <button
                  type="button"
                  className="bobby-nav-btn"
                  onClick={stepNext}
                  disabled={playerMode === "demo12" ? demoCursor === 12 : fullIdx === 35}
                  aria-label="Next step"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FULL BLUEPRINT SECTIONS NAVIGATION TABS */}
        <section className="blueprint-tabs-section">
          <div className="blueprint-tab-bar" role="tablist">
            <button
              type="button"
              className={activeTab === "calc" ? "active" : ""}
              onClick={() => setActiveTab("calc")}
            >
              <Calculator size={15} /> 1. Live Roll Calculator &amp; "Don't Guess" Conflicts
            </button>
            <button
              type="button"
              className={activeTab === "sheets" ? "active" : ""}
              onClick={() => setActiveTab("sheets")}
            >
              <Printer size={15} /> 2. Printable Step Sheets ({printedCards.length || 12} Cards)
            </button>
            <button
              type="button"
              className={activeTab === "video" ? "active" : ""}
              onClick={() => setActiveTab("video")}
            >
              <Film size={15} /> 3. HD Video Factory &amp; Blender-to-glTF Pipeline
            </button>
            <button
              type="button"
              className={activeTab === "schema" ? "active" : ""}
              onClick={() => setActiveTab("schema")}
            >
              <GitBranch size={15} /> 4. System Map, Schema, Moderation &amp; 6-Phase Plan
            </button>
            <button
              type="button"
              className={activeTab === "links" ? "active" : ""}
              onClick={() => setActiveTab("links")}
            >
              <ExternalLink size={15} /> 5. Live Reference Links &amp; Open-Source Stack
            </button>
          </div>

          {/* TAB 1: LIVE ROLL & PATTERN CALCULATOR + "DON'T GUESS" CONFLICT MATRIX */}
          {activeTab === "calc" && (
            <div className="blueprint-panel">
              <div className="blueprint-two-col">
                <div className="blueprint-card">
                  <p className="mono-kicker acid-text">LIVE ROLL &amp; PATTERN CALCULATOR · SIDE-BY-SIDE FORMULAS</p>
                  <h2>Formula A (Exact Strip-by-Strip) vs. Formula B (Area + 15% Waste)</h2>
                  <p className="sim-sub" style={{ marginBottom: "14px" }}>
                    Why two formulas? Retail estimators divide wall area by roll area (Formula B), ignoring the unusable remnant at the
                    bottom of each roll when matching a 64 cm pattern repeat. We print both side by side instead of averaging them away.
                  </p>
                  <div className="calc-grid-inputs">
                    <label>
                      <span>Wall Width (m)</span>
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        max="25"
                        value={calcWallW}
                        onChange={(e) => setCalcWallW(Math.max(0.5, Number(e.target.value)))}
                      />
                    </label>
                    <label>
                      <span>Wall Height (m)</span>
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        max="6"
                        value={calcWallH}
                        onChange={(e) => setCalcWallH(Math.max(0.5, Number(e.target.value)))}
                      />
                    </label>
                    <label>
                      <span>Roll Width Conflict (52 vs 53 vs 60 cm)</span>
                      <select
                        value={calcRollW}
                        onChange={(e) => {
                          const w = Number(e.target.value) as 52 | 53 | 60;
                          setCalcRollW(w);
                          if (w === 60) setCalcRollLen(3.0);
                          else setCalcRollLen(10.05);
                        }}
                      >
                        <option value={52}>52 cm (UK / Legacy Imperial Roll)</option>
                        <option value={53}>53 cm (EN 233 Euro-Standard Roll)</option>
                        <option value={60}>60 cm (UNITEC FT_13 Marble Roll · 3.0 m)</option>
                      </select>
                    </label>
                    <label>
                      <span>Roll Length (m)</span>
                      <input
                        type="number"
                        step="0.05"
                        min="2"
                        max="30"
                        value={calcRollLen}
                        onChange={(e) => setCalcRollLen(Math.max(1, Number(e.target.value)))}
                      />
                    </label>
                    <label>
                      <span>Pattern Repeat (cm)</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="120"
                        value={calcRepeatCm}
                        onChange={(e) => setCalcRepeatCm(Math.max(0, Number(e.target.value)))}
                      />
                    </label>
                    <label>
                      <span>Pattern Match</span>
                      <select
                        value={calcMatchType}
                        onChange={(e) => setCalcMatchType(e.target.value as "free" | "straight" | "half")}
                      >
                        <option value="free">Free match (0 cm waste)</option>
                        <option value="straight">Straight match (full repeat)</option>
                        <option value="half">Half-drop / offset match (+0.5 repeat)</option>
                      </select>
                    </label>
                  </div>

                  <div className="calc-side-by-side">
                    <div className="calc-result-box pro">
                      <span className="mono-kicker acid-text">FORMULA A · PRO STRIP-BY-STRIP (RECOMMENDED)</span>
                      <div className="calc-big-num">{calcMetrics.rollsFormulaA} Rolls</div>
                      <ul>
                        <li>
                          <strong>{calcMetrics.drops} vertical drops</strong> ({calcRollW} cm wide; last drop trimmed to{" "}
                          {calcMetrics.lastDropWidthCm} cm)
                        </li>
                        <li>
                          Cut length per drop: <strong>{calcMetrics.dropLenM.toFixed(2)} m</strong> (includes 10 cm trim + repeat rounding)
                        </li>
                        <li>
                          Yield: <strong>{calcMetrics.dropsPerRoll} drops per roll</strong> ({calcMetrics.remnantPerRollM.toFixed(2)} m offcut
                          remnant per roll)
                        </li>
                      </ul>
                    </div>
                    <div className="calc-result-box retail">
                      <span className="mono-kicker">FORMULA B · GROSS AREA + 15% WASTE</span>
                      <div className="calc-big-num">{calcMetrics.rollsFormulaB} Rolls</div>
                      <ul>
                        <li>
                          Wall area: <strong>{calcMetrics.wallAreaM2.toFixed(2)} m²</strong> (+15% ={" "}
                          {(calcMetrics.wallAreaM2 * 1.15).toFixed(2)} m²)
                        </li>
                        <li>
                          Single roll area: <strong>{calcMetrics.rollAreaM2.toFixed(2)} m²</strong>
                        </li>
                        <li>
                          {calcMetrics.deltaRolls > 0 ? (
                            <span style={{ color: "#f0b298" }}>
                              ⚠️ Under-orders by {calcMetrics.deltaRolls} roll(s) due to {calcRepeatCm} cm repeat cutoff waste!
                            </span>
                          ) : (
                            <span>Matches Formula A for this wall height and repeat.</span>
                          )}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* "DON'T GUESS" SOURCE CONFLICTS TABLE */}
                <div className="blueprint-card">
                  <p className="mono-kicker acid-text">"DON'T GUESS" SECTION · OPEN QUESTIONS &amp; SOURCE CONFLICTS</p>
                  <h2>Printed Side-by-Side Instead of Averaged Away</h2>
                  <div className="conflict-list">
                    {DONT_GUESS_CONFLICTS.map((c) => (
                      <div key={c.id} className="conflict-item">
                        <h3>{c.topic}</h3>
                        <div className="conflict-cols">
                          <div>
                            <small>{c.optionA.label}</small>
                            <strong>{c.optionA.value}</strong>
                            <span>{c.optionA.source}</span>
                          </div>
                          <div>
                            <small>{c.optionB.label}</small>
                            <strong>{c.optionB.value}</strong>
                            <span>{c.optionB.source}</span>
                          </div>
                          <div className="unitec-col">
                            <small>{c.unitecOfficial.label}</small>
                            <strong>{c.unitecOfficial.value}</strong>
                            <span>{c.unitecOfficial.source}</span>
                          </div>
                        </div>
                        <p className="conflict-rule">
                          <ShieldCheck size={14} /> {c.engineeringRule}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRINTABLE STEP SHEETS (GENERATED FROM THE SAME STEP-DATA FILE) */}
          {activeTab === "sheets" && (
            <div className="blueprint-panel">
              <div className="blueprint-card">
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div>
                    <p className="mono-kicker acid-text">OUTPUT #2 FROM THE SAME STEP-DATA FILE · PRINTABLE MANUAL SHEETS</p>
                    <h2>{track.name} — Printable 3D Step Cards (with Circular Detail Loupes)</h2>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" className="primary-button" onClick={handleGeneratePrintableSheets} disabled={generatingSheets}>
                      <Printer size={15} /> {printedCards.length ? "Re-Render All 12 Step Cards" : "Render All 12 Step Cards Now"}
                    </button>
                    {printedCards.length > 0 && (
                      <button type="button" className="secondary-button" onClick={() => window.print()}>
                        <FileText size={15} /> Print / Save as PDF
                      </button>
                    )}
                  </div>
                </div>

                {printedCards.length === 0 ? (
                  <div className="empty-sheets-cta">
                    <p>
                      Click <strong>"Render All 12 Step Cards Now"</strong> above. The engine will automatically step through steps 1–12 of{" "}
                      <strong>{track.name}</strong>, render the 3D scene in CAD Line-Drawing mode along with the circular Detail Loupe and
                      dashed leader line, and assemble a complete printable manual sheet.
                    </p>
                    <button type="button" className="primary-button" onClick={handleGeneratePrintableSheets}>
                      <Sparkles size={15} /> Generate 12 Printable Cards from 3D Scene
                    </button>
                  </div>
                ) : (
                  <div className="printed-sheets-grid">
                    {printedCards.map((card) => (
                      <article key={card.stepNumber} className="printed-step-card">
                        <img src={card.dataUrl} alt={`Step ${card.stepNumber}: ${card.title}`} />
                        <div className="printed-step-body">
                          <div className="printed-step-meta">
                            <span>STEP {String(card.stepNumber).padStart(2, "0")} / 12</span>
                            <code>{card.phase}</code>
                            <code>LOUPE: {card.detailLabel}</code>
                          </div>
                          <h3>{card.title}</h3>
                          <p>{card.instruction}</p>
                          <small>{card.itemsText}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HD VIDEO FACTORY & BLENDER-TO-GLTF ASSET PIPELINE */}
          {activeTab === "video" && (
            <div className="blueprint-panel">
              <div className="blueprint-two-col">
                <div className="blueprint-card">
                  <p className="mono-kicker acid-text">OUTPUT #3 FROM THE SAME STEP-DATA FILE · THE VIDEO FACTORY</p>
                  <h2>4 Capture Pipelines, Camera-Path Rules &amp; 1080p30 FFmpeg Spec</h2>
                  <div style={{ display: "flex", gap: "10px", margin: "12px 0 16px", flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" className="primary-button" onClick={handleRecordVideo} disabled={recordingVideo}>
                      <Video size={15} /> {recordingVideo ? "Recording 30fps Canvas Stream…" : "Record Live 3D Clip (30fps WebM)"}
                    </button>
                    {recordedVideoUrl && (
                      <a
                        href={recordedVideoUrl}
                        download={`plumb-${track.id}-30fps.webm`}
                        className="secondary-button"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <Download size={15} /> Download Recorded WebM Video
                      </a>
                    )}
                  </div>
                  {recordedVideoUrl && (
                    <video
                      src={recordedVideoUrl}
                      controls
                      loop
                      style={{ width: "100%", borderRadius: "10px", border: "1px solid var(--line-dark)", marginBottom: "14px" }}
                    />
                  )}
                  <div className="pipeline-list">
                    {VIDEO_FACTORY_PIPELINES.map((p) => (
                      <div key={p.id} className="pipeline-item">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                          <strong>{p.name}</strong>
                          <span className="unit-inline-pill">{p.fidelity}</span>
                        </div>
                        <p style={{ margin: "4px 0", fontSize: "12px", color: "#aeb8af" }}>Stack: {p.stack}</p>
                        <pre>{p.command}</pre>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="blueprint-card">
                  <p className="mono-kicker acid-text">BLENDER-TO-GLTF ASSET PIPELINE &amp; CAMERA / VOICEOVER RULES</p>
                  <h2>Production CAD &amp; Audio Choreography Spec</h2>
                  <ul className="blueprint-spec-list">
                    <li>
                      <strong>1. Blender-to-glTF Node Naming &amp; Pivots:</strong> Model at true metric scale (`1 unit = 1.0 m`). Name
                      every animated part and tool node deterministically (`tool_knife_30deg`, `tool_straightedge_600mm`, `drop_01`..`drop_08`,
                      `flap_outlet_top`). Place screw/fastener origins at the insertion tip (`-Y` axis) and knife origins at the 30° blade
                      point so `step.from` → `step.to` interpolation requires zero offset hacks.
                    </li>
                    <li>
                      <strong>2. glTF-Transform Compression:</strong> Run{" "}
                      <code>gltf-transform optimize input.glb output.glb --compress meshopt --texture-compress ktx2</code> to keep the entire
                      12-step room + tool kit under <code>1.8 MB</code> for instant mobile load.
                    </li>
                    <li>
                      <strong>3. Camera-Path Rule (Zero Whip-Pans):</strong> Use critically damped spherical interpolation (`lerp` factor{" "}
                      <code>0.11</code>) for main camera transitions, and lock the circular <code>#inset</code> telephoto camera (`24°` FOV)
                      at <code>0.22–0.32 m</code> from the active tool tip along its surface normal.
                    </li>
                    <li>
                      <strong>4. Voiceover Synchronization Rule:</strong> Each step's TTS / voiceover track (`step.voiceover`) must finish{" "}
                      <code>0.4 s</code> before the step duration ends, with tool-contact sound effects triggered when{" "}
                      <code>sample.primary.contact === true</code>.
                    </li>
                  </ul>
                  <h3 style={{ marginTop: "16px", fontSize: "14px" }}>Voiceover Script (Active Track: {track.name})</h3>
                  <div className="voiceover-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Step</th>
                          <th>Voiceover Line (1080p30 Audio Track)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {track.steps.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <code>{String(s.stepNumber).padStart(2, "0")}</code>
                            </td>
                            <td>"{s.voiceover}"</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM MAP, UNIFIED STEP-DATA SCHEMA, MODERATION & 6-PHASE BUILD PLAN */}
          {activeTab === "schema" && (
            <div className="blueprint-panel">
              <div className="blueprint-two-col">
                <div className="blueprint-card">
                  <p className="mono-kicker acid-text">CONTRIBUTION / MODERATION SYSTEM &amp; 6-PHASE BUILD PLAN</p>
                  <h2>Governance State &amp; Acceptance Tests</h2>
                  <div className="moderation-bar">
                    <span>Guide Moderation Status:</span>
                    {(["draft", "review", "approved"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={moderationState === st ? "primary-button" : "ghost-button"}
                        style={{ padding: "5px 12px", fontSize: "12px", textTransform: "uppercase" }}
                        onClick={() => {
                          setModerationState(st);
                          flash(`Guide status transitioned to ${st.toUpperCase()}`);
                        }}
                      >
                        <CheckCircle2 size={13} /> {st}
                      </button>
                    ))}
                  </div>
                  <div className="phase-plan-list">
                    {SIX_PHASE_PLAN.map((p) => (
                      <div key={p.phase} className="phase-plan-item">
                        <div>
                          <span className="unit-inline-pill">{p.phase}</span> <strong>{p.title}</strong>
                        </div>
                        <p>{p.deliverables}</p>
                        <small>
                          <Check size={12} /> <strong>Acceptance Test:</strong> {p.acceptanceTest}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="blueprint-card">
                  <p className="mono-kicker acid-text">COPY-READY MASTER DEVELOPER PROMPT &amp; LIVE STEP-DATA SCHEMA</p>
                  <h2>Master Prompt &amp; Unified JSON Contract</h2>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => copy(MASTER_DEVELOPER_PROMPT, "Master developer prompt")}
                    >
                      <ClipboardCopy size={14} /> Copy Master Developer Prompt
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => copy(unifiedStepFileJson, "Unified Step-Data JSON")}
                    >
                      <Bot size={14} /> Copy Unified Step-Data JSON
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => copy(buildHumanChecklist(), "Human checklist")}
                    >
                      <ClipboardCopy size={14} /> Copy 36-Step Checklist
                    </button>
                  </div>
                  <pre className="blueprint-code-block">{MASTER_DEVELOPER_PROMPT}</pre>
                  <h3 style={{ marginTop: "14px", fontSize: "13px" }}>Live Unified Step-Data File (`contracts/blueprintData.ts`)</h3>
                  <pre className="blueprint-code-block" style={{ maxHeight: "240px" }}>
                    {unifiedStepFileJson}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ALL REFERENCE LINKS, OPEN-SOURCE STACK & VIDEOS TO WATCH */}
          {activeTab === "links" && (
            <div className="blueprint-panel">
              <div className="blueprint-three-col">
                <div className="blueprint-card">
                  <p className="mono-kicker acid-text">LINKS — TRY IT LIVE</p>
                  <h2>Interactive 3D Manual Benchmarks</h2>
                  <ul className="ref-link-list">
                    {REFERENCE_LINKS.liveDemos.map((l) => (
                      <li key={l.url}>
                        <a href={l.url} target="_blank" rel="noreferrer">
                          <strong>{l.name}</strong> <ExternalLink size={12} />
                        </a>
                        <span>{l.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="blueprint-card">
                  <p className="mono-kicker acid-text">LINKS — OPEN-SOURCE STACK &amp; STARTERS</p>
                  <h2>Verified Engines &amp; Capture Tools</h2>
                  <ul className="ref-link-list">
                    {REFERENCE_LINKS.openSourceStack.map((l) => (
                      <li key={l.url}>
                        <a href={l.url} target="_blank" rel="noreferrer">
                          <strong>{l.name}</strong> <ExternalLink size={12} />
                        </a>
                        <span>{l.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="blueprint-card">
                  <p className="mono-kicker acid-text">LINKS — MORE EXAMPLES, TOOLS &amp; VIDEOS</p>
                  <h2>Exploded Views &amp; CAD Manuals</h2>
                  <ul className="ref-link-list">
                    {REFERENCE_LINKS.toolsAndVideos.map((l) => (
                      <li key={l.url}>
                        <a href={l.url} target="_blank" rel="noreferrer">
                          <strong>{l.name}</strong> <ExternalLink size={12} />
                        </a>
                        <span>{l.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
