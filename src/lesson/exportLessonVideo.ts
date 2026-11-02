import { synthesizeLessonAudio } from "./audioEngine";
import { buildWebVtt, captionForStep, drawTitleCard } from "./captions";
import { pacedStepSeconds, pacedTotalSeconds, videoProgress } from "./pacing";
import type { LessonDefinition, LessonRenderer, LessonStyle } from "./types";

/** Length of the intro card that opens a complete-lesson video (shows the finished result). */
export const INTRO_SECONDS = 4;

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
  /** Whether to synthesize and mux the AAC instructional audio cues track into the MP4 (default true). */
  includeAudio?: boolean;
}

export interface ExportedLessonVideo {
  blob: Blob;
  fileName: string;
  vtt: string;
  vttFileName: string;
  frames: number;
  seconds: number;
  hasAudio: boolean;
}

const abortError = () => new DOMException("Export cancelled.", "AbortError");

export function planLessonExport(lesson: LessonDefinition, scope: LessonExportScope, stepIndex: number, fps = 30) {
  const indices = scope === "step" ? [stepIndex] : lesson.steps.map((_, i) => i);
  const perStepFrames = indices.map((i) => Math.max(1, Math.round(pacedStepSeconds(lesson.steps[i]) * fps)));
  const introSeconds = scope === "lesson" ? INTRO_SECONDS : 0;
  const introFrames = Math.round(introSeconds * fps);
  const totalFrames = introFrames + perStepFrames.reduce((a, b) => a + b, 0);
  const seconds = introSeconds + (scope === "step" ? pacedStepSeconds(lesson.steps[stepIndex]) : pacedTotalSeconds(lesson.steps));
  return { indices, perStepFrames, introFrames, introSeconds, totalFrames, seconds };
}

/**
 * Deterministic, frame-by-frame MP4 (H.264 + optional AAC instructional audio cues).
 * Every frame is rendered at an exact timeline position, never captured in real time.
 * Narration text ships as a WebVTT subtitle sidecar timed to the same paced timeline.
 */
export async function exportLessonVideo(options: ExportLessonVideoOptions): Promise<ExportedLessonVideo> {
  const { lesson, renderer, scope, stepIndex, style, onProgress, signal } = options;
  const fps = options.fps ?? 30;
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const bitrate = 8_000_000;

  if (!("VideoEncoder" in window) || !("VideoFrame" in window)) {
    throw new Error("This browser does not provide WebCodecs video encoding. Use a current Chrome, Edge, Firefox, or Safari browser; no substitute file was generated.");
  }
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, AudioBufferSource, canEncodeVideo, canEncodeAudio } = await import("mediabunny");
  let videoCodec: "avc" | "vp9" | null = null;
  if (await canEncodeVideo("avc", { width, height, bitrate, frameRate: fps })) {
    videoCodec = "avc";
  } else if (await canEncodeVideo("vp9", { width, height, bitrate, frameRate: fps })) {
    videoCodec = "vp9";
  }
  if (!videoCodec) {
    throw new Error("This browser cannot encode H.264 or VP9 at 1920×1080. No video was generated. Try a current hardware-accelerated desktop browser.");
  }

  const plan = planLessonExport(lesson, scope, stepIndex, fps);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(canvas, { codec: videoCodec, bitrate, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: fps });
  output.setMetadataTags({ title: `${lesson.title} — PLUMB`, artist: "PLUMB field guide" });

  let audioBuffer: AudioBuffer | null = null;
  let audioSource: InstanceType<typeof AudioBufferSource> | null = null;
  const wantAudio = options.includeAudio !== false;
  if (wantAudio) {
    try {
      let audioCodec: "aac" | "opus" | null = null;
      if (await canEncodeAudio("aac", { sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })) {
        audioCodec = "aac";
      } else if (await canEncodeAudio("opus", { sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })) {
        audioCodec = "opus";
      }
      if (audioCodec) {
        audioBuffer = synthesizeLessonAudio(lesson, plan.indices, plan.introSeconds, plan.seconds, 48000);
        audioSource = new AudioBufferSource({ codec: audioCodec, bitrate: 128000 });
        output.addAudioTrack(audioSource);
      }
    } catch {
      audioBuffer = null;
      audioSource = null;
    }
  }

  let started = false;
  let done = 0;
  onProgress(0, plan.totalFrames);
  renderer.beginExport(style);
  try {
    await output.start();
    started = true;

    if (audioSource && audioBuffer) {
      await audioSource.add(audioBuffer);
      audioSource.close();
    }
    // Intro card over the finished result (last step, final pose), fading in over the first second.
    if (plan.introFrames > 0) {
      const last = lesson.steps.length - 1;
      const ctx = canvas.getContext("2d");
      for (let f = 0; f < plan.introFrames; f += 1) {
        if (signal.aborted) throw abortError();
        await renderer.renderLessonFrame(canvas, {
          stepIndex: last,
          progress: 1,
          operation: lesson.steps[last].operation,
          width,
          height,
          overlays: false,
        });
        ctx?.save();
        drawTitleCard(
          canvas.getContext("2d")!,
          width,
          height,
          {
            kicker: "PLUMB VIDEO MANUAL",
            title: lesson.title,
            lines: [`${lesson.steps.length} steps · ${Math.round(pacedTotalSeconds(lesson.steps) / 60)} min`, ...(lesson.introLines ?? [])],
            footer: lesson.disclaimer,
          },
          Math.min(1, f / fps / 0.8),
        );
        ctx?.restore();
        await source.add(done / fps, 1 / fps);
        done += 1;
        if (done % 3 === 0) {
          onProgress(done, plan.totalFrames);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }
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
      vtt: buildWebVtt(vttLesson, plan.introSeconds),
      vttFileName: `PLUMB-${lesson.id}-${suffix}.vtt`,
      frames: plan.totalFrames,
      seconds: plan.seconds,
      hasAudio: Boolean(audioSource && audioBuffer),
    };
  } catch (error) {
    if (started && output.state !== "finalized" && output.state !== "canceled") await output.cancel();
    throw error;
  } finally {
    renderer.endExport();
  }
}
