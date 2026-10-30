import { describe, expect, it } from "vitest";
import {
  DROP_COUNT,
  TASK_TOTAL_SECONDS,
  WALL,
  WALLPAPER_TASK,
  buildHumanChecklist,
  buildMachineTask,
  dropRect,
  sampleStep,
  stepAtTime,
  stepMotion,
} from "../contracts/tasks/wallpaperTask";

describe("Wallpaper 3D task spec", () => {
  it("has unique ids and covers every phase from safety to finish", () => {
    const ids = new Set(WALLPAPER_TASK.map((s) => s.id));
    expect(ids.size).toBe(WALLPAPER_TASK.length);
    expect(WALLPAPER_TASK.length).toBeGreaterThanOrEqual(30);
    const phases = new Set(WALLPAPER_TASK.map((s) => s.phase));
    ["Safety", "Protect", "Clean", "Repair", "Prime", "Layout", "Glue", "Hang", "Finish"].forEach((p) => expect(phases.has(p as never)).toBe(true));
  });

  it("drops tile the wall exactly with no gaps", () => {
    expect(dropRect(0).x0).toBeCloseTo(WALL.x0, 6);
    expect(dropRect(DROP_COUNT - 1).x1).toBeCloseTo(WALL.x1, 6);
    for (let i = 1; i < DROP_COUNT; i += 1) expect(dropRect(i).x0).toBeCloseTo(dropRect(i - 1).x1, 6);
  });

  it("every step produces a finite toolpath that stays in the room", () => {
    for (const step of WALLPAPER_TASK) {
      const m = stepMotion(step);
      expect(m.primary.length).toBeGreaterThan(0);
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const s = sampleStep(step, t);
        const [x, y, z] = s.primary.p;
        expect(Number.isFinite(x + y + z)).toBe(true);
        expect(x).toBeGreaterThan(WALL.x0 - 0.2);
        expect(x).toBeLessThan(WALL.x1 + 0.2);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(WALL.height + 0.1);
        expect(z).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("contact work never penetrates the wall plane", () => {
    for (const step of WALLPAPER_TASK) {
      for (let k = 0; k <= 50; k += 1) {
        const s = sampleStep(step, k / 50);
        if (s.primary.contact) expect(s.primary.p[2]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("maps time to steps consistently", () => {
    expect(stepAtTime(0).index).toBe(0);
    expect(stepAtTime(TASK_TOTAL_SECONDS).index).toBe(WALLPAPER_TASK.length - 1);
  });

  it("exports a machine task and a human checklist for every step", () => {
    const task = buildMachineTask(12);
    expect(task.schema).toBe("plumb.task/v1");
    expect(task.steps).toHaveLength(WALLPAPER_TASK.length);
    task.steps.forEach((s) => expect(s.waypoints).toHaveLength(12));
    const md = buildHumanChecklist();
    WALLPAPER_TASK.forEach((s) => expect(md).toContain(s.title));
  });
});
