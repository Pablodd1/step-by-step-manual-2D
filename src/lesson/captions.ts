import { pacedOffsets, pacedStepSeconds, spokenText } from "./pacing";
import type { FrameCaption, LessonDefinition, LessonStepLike } from "./types";

function vttTime(totalSeconds: number): string {
  const ms = Math.round(totalSeconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const rest = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(rest, 3)}`;
}

/** Sidecar subtitle file whose cue times match the paced MP4 timeline exactly. */
export function buildWebVtt(lesson: LessonDefinition): string {
  const offsets = pacedOffsets(lesson.steps);
  const cues = lesson.steps.map((step, index) => {
    const start = offsets[index];
    const end = start + pacedStepSeconds(step);
    return `${index + 1}\n${vttTime(start)} --> ${vttTime(end)}\n${spokenText(step)}`;
  });
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

export function captionForStep(lesson: LessonDefinition, step: LessonStepLike, index: number): FrameCaption {
  return {
    stepLabel: `STEP ${String(index + 1).padStart(2, "0")} / ${String(lesson.steps.length).padStart(2, "0")}`,
    title: step.title,
    body: step.instruction,
    warning: step.warning,
    footer: lesson.disclaimer,
  };
}

/** Greedy word wrap with an injected measurer so it is testable without a canvas. */
export function wrapText(text: string, maxWidth: number, measure: (candidate: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest font size (px) at which `text` fits in `maxLines`; never truncates. Returns the minimum size if nothing fits. */
export function fitFontSize(
  text: string,
  maxWidth: number,
  maxLines: number,
  measureAt: (fontPx: number, candidate: string) => number,
  maxPx = 30,
  minPx = 18,
): { fontPx: number; lines: string[]; fits: boolean } {
  for (let px = maxPx; px >= minPx; px -= 1) {
    const lines = wrapText(text, maxWidth, (c) => measureAt(px, c));
    if (lines.length <= maxLines) return { fontPx: px, lines, fits: true };
  }
  const lines = wrapText(text, maxWidth, (c) => measureAt(minPx, c));
  return { fontPx: minPx, lines, fits: lines.length <= maxLines };
}

/** Height in px of the caption bar for a frame of `width` px (1920x1080 design space scaled by width). */
export function captionBarHeight(width: number, caption: FrameCaption): number {
  return (caption.warning ? 258 : 214) * (width / 1920);
}

/** Draws the lower-third caption bar onto a 2D canvas. Layout is expressed in a 1920x1080 design space. */
export function drawCaptionBar(ctx: CanvasRenderingContext2D, width: number, height: number, caption: FrameCaption): void {
  const k = width / 1920;
  const barH = captionBarHeight(width, caption);
  const top = height - barH;
  ctx.save();
  ctx.fillStyle = "rgba(6, 10, 18, 0.9)";
  ctx.fillRect(0, top, width, barH);
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(0, top, width, 4 * k);

  const padX = 56 * k;
  const textW = width - padX * 2;
  ctx.textBaseline = "alphabetic";
  let y = top + 44 * k;

  ctx.font = `700 ${20 * k}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillStyle = "#22d3ee";
  ctx.fillText(caption.stepLabel, padX, y);
  ctx.font = `700 ${34 * k}px Inter, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#f4f7f8";
  ctx.fillText(caption.title, padX + 170 * k, y + 2 * k);

  const bodyLines = caption.warning ? 2 : 3;
  const fit = fitFontSize(
    caption.body,
    textW,
    bodyLines,
    (px, candidate) => {
      ctx.font = `500 ${px * k}px Inter, "Segoe UI", sans-serif`;
      return ctx.measureText(candidate).width;
    },
    30,
    18,
  );
  ctx.font = `500 ${fit.fontPx * k}px Inter, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#d9e2e8";
  y += 46 * k;
  for (const line of fit.lines) {
    ctx.fillText(line, padX, y);
    y += (fit.fontPx + 8) * k;
  }

  if (caption.warning) {
    ctx.font = `600 ${22 * k}px Inter, "Segoe UI", sans-serif`;
    ctx.fillStyle = "#fbbf24";
    const warning = fitFontSize(`⚠ ${caption.warning}`, textW, 1, (px, c) => {
      ctx.font = `600 ${px * k}px Inter, "Segoe UI", sans-serif`;
      return ctx.measureText(c).width;
    }, 22, 16);
    ctx.font = `600 ${warning.fontPx * k}px Inter, "Segoe UI", sans-serif`;
    ctx.fillText(warning.lines.join(" "), padX, y + 4 * k);
  }

  ctx.font = `500 ${15 * k}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillStyle = "#8b98a8";
  ctx.fillText(caption.footer, padX, height - 16 * k);
  ctx.restore();
}
