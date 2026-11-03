import { describe, expect, it } from "vitest";
import { synthesizeLessonAudio } from "../src/lesson/audioEngine";
import { wallpaperLesson } from "../src/wallpaper/lesson";
import { pacedTotalSeconds } from "../src/lesson/pacing";
import {
  CORNICE_BOTTOM,
  DROP_W,
  FIRST_X,
  OUTLET,
  PAPER_Z,
  PLUMB_X,
  SKIRTING_TOP,
  WALL_FRONT_Z,
  WALL_LEFT,
  corniceDepth,
  skirtingDepth,
} from "../src/wallpaper/geometry";

describe("flat-pack parity: shared wall geometry", () => {
  it("sets the plumb line 500 mm from the corner on drop 1's right edge", () => {
    expect(PLUMB_X - WALL_LEFT).toBeCloseTo(0.5, 6);
    expect(FIRST_X + DROP_W / 2).toBeCloseTo(PLUMB_X, 6);
  });

  it("puts the outlet inside drop 2 and the paper on the wall, not floating in front of it", () => {
    expect(OUTLET.x - OUTLET.w / 2).toBeGreaterThan(PLUMB_X);
    expect(OUTLET.x + OUTLET.w / 2).toBeLessThan(PLUMB_X + DROP_W);
    expect(PAPER_Z - WALL_FRONT_Z).toBeLessThanOrEqual(0.004);
  });

  it("drapes the trim allowance over moldings that project forward from the wall", () => {
    expect(skirtingDepth(0.03)).toBeCloseTo(0.022, 6);
    expect(skirtingDepth(SKIRTING_TOP)).toBeCloseTo(0, 6);
    expect(corniceDepth(0)).toBeGreaterThan(0.01);
    expect(corniceDepth(2.67 - CORNICE_BOTTOM)).toBeGreaterThan(corniceDepth(0));
    for (let y = 0; y < SKIRTING_TOP; y += 0.005) expect(skirtingDepth(y)).toBeGreaterThanOrEqual(0);
  });
});

describe("flat-pack parity: deterministic export audio", () => {
  it("produces bit-identical audio on repeated synthesis", () => {
    const indices = wallpaperLesson.steps.map((_, i) => i).slice(6, 12);
    const seconds = pacedTotalSeconds(indices.map((i) => wallpaperLesson.steps[i]));
    const a = synthesizeLessonAudio(wallpaperLesson, indices, 0, seconds, 8000).getChannelData(0);
    const b = synthesizeLessonAudio(wallpaperLesson, indices, 0, seconds, 8000).getChannelData(0);
    expect(a.length).toBe(b.length);
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff = Math.max(diff, Math.abs(a[i] - b[i]));
    expect(diff).toBe(0);
  });

  it("has knife audio during the trim and outlet cuts", () => {
    for (const op of ["trim", "outlet"]) {
      const index = wallpaperLesson.steps.findIndex((s) => s.operation === op);
      const step = wallpaperLesson.steps[index];
      const seconds = Math.max(step.seconds, 12);
      const buf = synthesizeLessonAudio(wallpaperLesson, [index], 0, seconds + 30, 8000).getChannelData(0);
      // energy in the middle of the first cut window, well after the transition chime
      const from = Math.floor(8000 * 3);
      let energy = 0;
      for (let i = from; i < from + 8000; i++) energy += buf[i] * buf[i];
      expect(energy).toBeGreaterThan(0.01);
    }
  });
});
