import { guideTimeAtStep, guideTotalDuration, type Guide } from "@contracts/guide";
import type { GuideEngine } from "@/scene/GuideEngine";

export type ExportScope = "step" | "guide";

interface ExportGuideVideoOptions {
  guide: Guide;
  engine: GuideEngine;
  scope: ExportScope;
  stepIndex: number;
  onProgress: (completedFrames: number, totalFrames: number) => void;
  signal: AbortSignal;
}

export interface ExportedGuideVideo {
  blob: Blob;
  fileName: string;
  frames: number;
  duration: number;
}

const abortError = () => new DOMException("Export cancelled.", "AbortError");

export async function exportGuideVideo({
  guide,
  engine,
  scope,
  stepIndex,
  onProgress,
  signal,
}: ExportGuideVideoOptions): Promise<ExportedGuideVideo> {
  if (!("VideoEncoder" in window) || !("VideoFrame" in window)) {
    throw new Error("This browser does not provide WebCodecs video encoding. Use a current Chrome, Edge or Safari browser; no substitute file was generated.");
  }

  const width = 1920;
  const height = 1080;
  const fps = 30;
  const bitrate = 8_000_000;
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, canEncodeVideo } = await import("mediabunny");
  const supported = await canEncodeVideo("avc", { width, height, bitrate, frameRate: fps });
  if (!supported) {
    throw new Error("This browser cannot encode H.264 at 1920×1080. No video was generated. Try a current hardware-accelerated desktop browser.");
  }

  const startTime = scope === "step" ? guideTimeAtStep(guide, stepIndex) : 0;
  const duration = scope === "step" ? guide.steps[stepIndex].duration : guideTotalDuration(guide);
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const canvas = document.createElement("canvas");
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const videoSource = new CanvasSource(canvas, { codec: "avc", bitrate, keyFrameInterval: 2 });
  output.addVideoTrack(videoSource, { frameRate: fps });
  output.setMetadataTags({ title: `${guide.title} — PLUMB`, artist: "PLUMB field guide" });

  const originalTime = engine.getCurrentTime();
  const originalPosition = engine.camera.position.clone();
  const originalTarget = engine.controls.target.clone();
  let started = false;
  onProgress(0, totalFrames);
  engine.setSuspended(true);

  try {
    await output.start();
    started = true;
    for (let frame = 0; frame < totalFrames; frame += 1) {
      if (signal.aborted) throw abortError();
      const seconds = Math.min(startTime + frame / fps, startTime + duration - 0.0001);
      engine.renderExportFrame(canvas, seconds, width, height);
      await videoSource.add(frame / fps, 1 / fps);
      if (frame % 3 === 0 || frame === totalFrames - 1) {
        onProgress(frame + 1, totalFrames);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    if (signal.aborted) throw abortError();
    videoSource.close();
    await output.finalize();
    if (!target.buffer) throw new Error("The encoder finished without an MP4 buffer.");
    const blob = new Blob([target.buffer], { type: "video/mp4" });
    const suffix = scope === "step" ? `step-${String(stepIndex + 1).padStart(2, "0")}` : "complete-guide";
    return {
      blob,
      fileName: `PLUMB-${guide.slug}-${suffix}-1080p30.mp4`,
      frames: totalFrames,
      duration,
    };
  } catch (error) {
    if (started && output.state !== "finalized" && output.state !== "canceled") await output.cancel();
    throw error;
  } finally {
    engine.seekGlobal(originalTime);
    engine.camera.position.copy(originalPosition);
    engine.controls.target.copy(originalTarget);
    engine.controls.update();
    engine.setSuspended(false);
  }
}
