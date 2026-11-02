import { buildWebVtt, captionForStep } from "./captions";
import { pacedStepSeconds, pacedTotalSeconds, videoProgress } from "./pacing";
import type { LessonDefinition, LessonRenderer, LessonStyle } from "./types";

export type LessonExportScope = "lesson" | "step";

export interface ExportLessonVideoOptions {
  lesson: LessonDefinition;
  renderer: LessonRenderer;
  scope: LessonExportScope;
  stepIndex: number;
  style: LessonStyle;
  onProgress: (completedFrames: number, totalFrames: number) => void;
  signal: AbortSignal;
  fps?: number;
  width?: number;
  height?: number;
}

export interface ExportedLessonVideo {
  blob: Blob;
  fileName: string;
  vtt: string;
  vttFileName: string;
  frames: number;
  seconds: number;
  hasAudio: false;
}

const abortError = () => new DOMException("Export cancelled.", "AbortError");

export function planLessonExport(lesson: LessonDefinition, scope: LessonExportScope, stepIndex: number, fps = 30) {
  const indices = scope === "step" ? [stepIndex] : lesson.steps.map((_, i) => i);
  const perStepFrames = indices.map((i) => Math.max(1, Math.round(pacedStepSeconds(lesson.steps[i]) * fps)));
  const totalFrames = perStepFrames.reduce((a, b) => a + b, 0);
  const seconds = scope === "step" ? pacedStepSeconds(lesson.steps[stepIndex]) : pacedTotalSeconds(lesson.steps);
  return { indices, perStepFrames, totalFrames, seconds };
}

/**
 * Deterministic, frame-by-frame MP4 (H.264). Every frame is rendered at an exact timeline position,
 * never captured in real time. The MP4 is SILENT: browser speech synthesis cannot be written to a file.
 * Narration text ships as a WebVTT subtitle sidecar timed to the same paced timeline.
 */
export async function exportLessonVideo(options: ExportLessonVideoOptions): Promise<ExportedLessonVideo> {
  const { lesson, renderer, scope, stepIndex, style, onProgress, signal } = options;
  const fps = options.fps ?? 30;
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const bitrate = 8_000_000;

  if (!("VideoEncoder" in window) || !("VideoFrame" in window)) {
    throw new Error("This browser does not provide WebCodecs video encoding. Use a current Chrome, Edge or Safari browser; no substitute file was generated.");
  }
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, canEncodeVideo } = await import("mediabunny");
  if (!(await canEncodeVideo("avc", { width, height, bitrate, frameRate: fps }))) {
    throw new Error("This browser cannot encode H.264 at 1920×1080. No video was generated. Try a current hardware-accelerated desktop browser.");
  }

  const plan = planLessonExport(lesson, scope, stepIndex, fps);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(canvas, { codec: "avc", bitrate, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: fps });
  output.setMetadataTags({ title: `${lesson.title} — PLUMB`, artist: "PLUMB field guide" });

  let started = false;
  let done = 0;
  onProgress(0, plan.totalFrames);
  renderer.beginExport(style);
  try {
    await output.start();
    started = true;
    for (let k = 0; k < plan.indices.length; k += 1) {
      const index = plan.indices[k];
      const step = lesson.steps[index];
      const paced = pacedStepSeconds(step);
      const caption = captionForStep(lesson, step, index);
      for (let f = 0; f < plan.perStepFrames[k]; f += 1) {
        if (signal.aborted) throw abortError();
        const local = Math.min(paced, f / fps);
        await renderer.renderLessonFrame(canvas, {
          stepIndex: index,
          progress: videoProgress(local, paced),
          operation: step.operation,
          width,
          height,
          caption,
        });
        await source.add(done / fps, 1 / fps);
        done += 1;
        if (done % 3 === 0 || done === plan.totalFrames) {
          onProgress(done, plan.totalFrames);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }
    if (signal.aborted) throw abortError();
    source.close();
    await output.finalize();
    if (!target.buffer) throw new Error("The encoder finished without an MP4 buffer.");
    const suffix = scope === "step" ? `step-${String(stepIndex + 1).padStart(2, "0")}` : "complete";
    const vttLesson: LessonDefinition =
      scope === "step" ? { ...lesson, steps: [lesson.steps[stepIndex]] } : lesson;
    return {
      blob: new Blob([target.buffer], { type: "video/mp4" }),
      fileName: `PLUMB-${lesson.id}-${suffix}-1080p${fps}.mp4`,
      vtt: buildWebVtt(vttLesson),
      vttFileName: `PLUMB-${lesson.id}-${suffix}.vtt`,
      frames: plan.totalFrames,
      seconds: plan.seconds,
      hasAudio: false,
    };
  } catch (error) {
    if (started && output.state !== "finalized" && output.state !== "canceled") await output.cancel();
    throw error;
  } finally {
    renderer.endExport();
  }
}
