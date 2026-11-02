import type { LessonStepLike } from "./types";

/** Narration/reading estimate. ~150 words per minute, plus a short settle time. An estimate, not measured speech. */
export const WORDS_PER_SECOND = 2.5;
export const SETTLE_SECONDS = 2;
/** Seconds the first/last pose is held in a video so the viewer sees the start and end state. */
export const VIDEO_HOLD_SECONDS = 0.5;

type Spoken = Pick<LessonStepLike, "title" | "instruction" | "warning">;
type Timed = Spoken & Pick<LessonStepLike, "seconds">;

/** The single text used for narration, subtitles and reading-time estimates, so all three stay in sync. */
export function spokenText(step: Spoken): string {
  const warning = step.warning ? ` Warning: ${step.warning}` : "";
  return `${step.title}. ${step.instruction}${warning}`;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function readingSeconds(text: string): number {
  return Math.ceil(wordCount(text) / WORDS_PER_SECOND) + SETTLE_SECONDS;
}

/** Step duration long enough to both play the choreography and read/narrate the text. */
export function pacedStepSeconds(step: Timed): number {
  return Math.max(step.seconds, readingSeconds(spokenText(step)));
}

export function pacedOffsets(steps: Timed[]): number[] {
  const offsets: number[] = [];
  let total = 0;
  for (const step of steps) {
    offsets.push(total);
    total += pacedStepSeconds(step);
  }
  return offsets;
}

export function pacedTotalSeconds(steps: Timed[]): number {
  return steps.reduce((sum, step) => sum + pacedStepSeconds(step), 0);
}

/** Maps time inside a paced step to choreography progress, holding the first and last pose briefly. */
export function videoProgress(localSeconds: number, pacedSeconds: number): number {
  const active = Math.max(0.001, pacedSeconds - VIDEO_HOLD_SECONDS * 2);
  return Math.min(1, Math.max(0, (localSeconds - VIDEO_HOLD_SECONDS) / active));
}
