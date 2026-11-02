import { describe, expect, it } from "vitest";
import { pasteTheWallGuide } from "../src/wallpaper/guide";
import { wallpaperLesson } from "../src/wallpaper/lesson";
import {
  SETTLE_SECONDS,
  VIDEO_HOLD_SECONDS,
  pacedOffsets,
  pacedStepSeconds,
  pacedTotalSeconds,
  readingSeconds,
  spokenText,
  videoProgress,
} from "../src/lesson/pacing";
import { buildWebVtt, captionForStep, fitFontSize, wrapText } from "../src/lesson/captions";
import { INTRO_SECONDS, planLessonExport } from "../src/lesson/exportLessonVideo";

const steps = wallpaperLesson.steps;

describe("lesson pacing (reading/narration time vs animation time)", () => {
  it("never paces a step shorter than its choreography", () => {
    for (const step of steps) expect(pacedStepSeconds(step)).toBeGreaterThanOrEqual(step.seconds);
  });

  it("gives every step enough time to read its own text at ~150 wpm", () => {
    for (const step of steps) {
      const words = spokenText(step).split(/\s+/).length;
      expect(pacedStepSeconds(step)).toBeGreaterThanOrEqual(Math.ceil(words / 2.5) + SETTLE_SECONDS);
    }
  });

  it("documents the finding that the raw animation timeline is too short to read", () => {
    const animation = steps.reduce((s, x) => s + x.seconds, 0);
    expect(animation).toBe(111);
    expect(pacedTotalSeconds(steps)).toBeGreaterThan(animation * 2);
  });

  it("offsets are cumulative and consistent with the total", () => {
    const offsets = pacedOffsets(steps);
    expect(offsets[0]).toBe(0);
    const last = steps.length - 1;
    expect(offsets[last] + pacedStepSeconds(steps[last])).toBeCloseTo(pacedTotalSeconds(steps), 6);
  });

  it("holds first and last pose and spans 0..1 in between", () => {
    const paced = 20;
    expect(videoProgress(0, paced)).toBe(0);
    expect(videoProgress(VIDEO_HOLD_SECONDS, paced)).toBe(0);
    expect(videoProgress(paced, paced)).toBe(1);
    expect(videoProgress(paced / 2, paced)).toBeCloseTo(0.5, 2);
  });

  it("reading time grows with word count", () => {
    expect(readingSeconds("a ".repeat(50))).toBeGreaterThan(readingSeconds("a ".repeat(10)));
  });
});

describe("subtitles and captions", () => {
  it("builds a valid WebVTT with one monotonic cue per step", () => {
    const vtt = buildWebVtt(wallpaperLesson);
    expect(vtt.startsWith("WEBVTT\n")).toBe(true);
    const cues = [...vtt.matchAll(/(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})/g)];
    expect(cues).toHaveLength(steps.length);
    const toSec = (t: string) => {
      const [h, m, s] = t.split(":");
      return Number(h) * 3600 + Number(m) * 60 + Number(s);
    };
    let previousEnd = 0;
    for (const [, start, end] of cues) {
      expect(toSec(start)).toBeCloseTo(previousEnd, 2);
      expect(toSec(end)).toBeGreaterThan(toSec(start));
      previousEnd = toSec(end);
    }
    expect(previousEnd).toBeCloseTo(pacedTotalSeconds(steps), 1);
    for (const step of steps) expect(vtt).toContain(step.instruction);
  });

  it("includes warnings in narration/subtitle text so safety content is never silent", () => {
    for (const step of steps.filter((s) => s.warning)) expect(spokenText(step)).toContain(step.warning!);
  });

  it("burns the disclaimer into every caption", () => {
    steps.forEach((step, i) => {
      const caption = captionForStep(wallpaperLesson, step, i);
      expect(caption.footer).toMatch(/not a substitute/i);
      expect(caption.stepLabel).toBe(`STEP ${String(i + 1).padStart(2, "0")} / 14`);
    });
  });

  it("wraps without losing words and fits every instruction in the caption bar at an approximate width model", () => {
    const measureAt = (px: number, text: string) => text.length * px * 0.52; // conservative average glyph width
    const textWidth = 1920 - 112;
    for (const step of steps) {
      const lines = wrapText(step.instruction, textWidth, (c) => measureAt(18, c));
      expect(lines.join(" ")).toBe(step.instruction.replace(/\s+/g, " ").trim());
      const fit = fitFontSize(step.instruction, textWidth, step.warning ? 2 : 3, measureAt);
      expect(fit.fits).toBe(true);
      expect(fit.fontPx).toBeGreaterThanOrEqual(18);
    }
  });
});

describe("export planning", () => {
  it("plans frames from paced time plus a 4 s intro card, not animation time", () => {
    const plan = planLessonExport(wallpaperLesson, "lesson", 0, 30);
    expect(plan.indices).toHaveLength(14);
    expect(plan.introFrames).toBe(INTRO_SECONDS * 30);
    expect(plan.totalFrames).toBe(plan.introFrames + plan.perStepFrames.reduce((a, b) => a + b, 0));
    expect(plan.totalFrames).toBeGreaterThan(111 * 30);
    expect(plan.seconds).toBeCloseTo(INTRO_SECONDS + pacedTotalSeconds(steps), 6);
  });

  it("subtitle cues are shifted by the intro so they stay in sync with the video", () => {
    const vtt = buildWebVtt(wallpaperLesson, INTRO_SECONDS);
    expect(vtt).toContain(`00:00:00.000 --> 00:00:0${INTRO_SECONDS}.000`);
    expect(vtt).toContain(`1\n00:00:0${INTRO_SECONDS}.000 -->`);
  });

  it("every tool named on the intro card exists in the guide data", () => {
    const allTools = steps.flatMap((s) => s.tools).join(" ").toLowerCase();
    const named = wallpaperLesson.introLines![0].replace(/^You need:\s*/, "").replace(/\.$/, "").split(/,\s*/);
    for (const tool of named) expect(allTools).toContain(tool.toLowerCase());
  });

  it("plans a single step without an intro", () => {
    const plan = planLessonExport(wallpaperLesson, "step", 6, 30);
    expect(plan.indices).toEqual([6]);
    expect(plan.introFrames).toBe(0);
    expect(plan.totalFrames).toBe(Math.round(pacedStepSeconds(steps[6]) * 30));
  });

  it("the wallpaper guide satisfies the construction-agnostic lesson contract", () => {
    expect(wallpaperLesson.steps).toBe(pasteTheWallGuide.steps);
    for (const step of wallpaperLesson.steps) {
      expect(typeof step.operation).toBe("string");
      expect(step.shortTitle.length).toBeGreaterThan(0);
    }
  });
});
