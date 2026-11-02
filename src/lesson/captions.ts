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

/** Sidecar subtitle file whose cue times match the paced MP4 timeline exactly. `offsetSeconds` accounts for an intro card. */
export function buildWebVtt(lesson: LessonDefinition, offsetSeconds = 0): string {
  const offsets = pacedOffsets(lesson.steps);
  const intro =
    offsetSeconds > 0 ? [`0\n${vttTime(0)} --> ${vttTime(offsetSeconds)}\n${lesson.title}. ${lesson.steps.length} steps.`] : [];
  const cues = lesson.steps.map((step, index) => {
    const start = offsetSeconds + offsets[index];
    const end = start + pacedStepSeconds(step);
    return `${index + 1}\n${vttTime(start)} --> ${vttTime(end)}\n${spokenText(step)}`;
  });
  return `WEBVTT\n\n${[...intro, ...cues].join("\n\n")}\n`;
}

export function captionForStep(lesson: LessonDefinition, step: LessonStepLike, index: number): FrameCaption {
  return {
    stepLabel: `STEP ${String(index + 1).padStart(2, "0")} / ${String(lesson.steps.length).padStart(2, "0")}`,
    title: step.title,
    body: step.instruction,
    warning: step.warning,
    footer: lesson.disclaimer,
    stepIndex: index,
    stepCount: lesson.steps.length,
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
export function drawCaptionBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  caption: FrameCaption,
  stepProgress = 0,
): void {
  const k = width / 1920;
  const barH = captionBarHeight(width, caption);
  const top = height - barH;
  ctx.save();
  ctx.fillStyle = "rgba(6, 10, 18, 0.9)";
  ctx.fillRect(0, top, width, barH);

  // Segmented lesson progress strip along the top edge of the bar: done steps solid, current step partial.
  const gap = 4 * k;
  const segW = (width - gap * (caption.stepCount - 1)) / caption.stepCount;
  const stripH = 6 * k;
  for (let i = 0; i < caption.stepCount; i += 1) {
    const x = i * (segW + gap);
    ctx.fillStyle = "rgba(148, 163, 184, 0.28)";
    ctx.fillRect(x, top, segW, stripH);
    const fill = i < caption.stepIndex ? 1 : i === caption.stepIndex ? Math.min(1, Math.max(0, stepProgress)) : 0;
    if (fill > 0) {
      ctx.fillStyle = i < caption.stepIndex ? "#0e7490" : "#22d3ee";
      ctx.fillRect(x, top, segW * fill, stripH);
    }
  }

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

export interface TitleCard {
  kicker: string;
  title: string;
  lines: string[];
  footer: string;
}

/** Full-frame intro card drawn over a dimmed 3D frame (1920x1080 design space). */
export function drawTitleCard(ctx: CanvasRenderingContext2D, width: number, height: number, card: TitleCard, fade = 1): void {
  const k = width / 1920;
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, fade));
  const gradient = ctx.createLinearGradient(0, 0, width * 0.75, 0);
  gradient.addColorStop(0, "rgba(6,10,18,0.94)");
  gradient.addColorStop(0.62, "rgba(6,10,18,0.78)");
  gradient.addColorStop(1, "rgba(6,10,18,0.15)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const x = 120 * k;
  let y = 300 * k;
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(x, y - 70 * k, 90 * k, 6 * k);
  ctx.font = `700 ${24 * k}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText(card.kicker, x, y - 24 * k);
  ctx.font = `700 ${84 * k}px Inter, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#f4f7f8";
  for (const line of wrapText(card.title, 1100 * k, (c) => ctx.measureText(c).width)) {
    y += 86 * k;
    ctx.fillText(line, x, y);
  }
  y += 40 * k;
  ctx.font = `500 ${32 * k}px Inter, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#c7d2db";
  for (const line of card.lines) {
    for (const wrapped of wrapText(line, 1100 * k, (c) => ctx.measureText(c).width)) {
      y += 48 * k;
      ctx.fillText(wrapped, x, y);
    }
  }
  ctx.font = `500 ${18 * k}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(card.footer, x, height - 60 * k);
  ctx.restore();
}
