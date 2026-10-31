import { describe, expect, it } from "vitest";
import { canAccessStep, getSource, pasteTheWallGuide, totalAnimationSeconds } from "../src/wallpaper/guide";

const steps = pasteTheWallGuide.steps;

describe("evidence-linked wallpaper guide", () => {
  it("uses one ordered sequence with unique stable identifiers", () => {
    expect(steps).toHaveLength(14);
    expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
    expect(steps[0].operation).toBe("verify");
    expect(steps.at(-1)?.operation).toBe("inspect");
  });

  it("provides instruction, inspection and traceable evidence for every step", () => {
    for (const step of steps) {
      expect(step.instruction.length).toBeGreaterThan(60);
      expect(step.check.length).toBeGreaterThan(30);
      expect(step.tools.length).toBeGreaterThan(0);
      expect(step.evidence.length).toBeGreaterThan(0);
      for (const id of step.evidence) {
        const source = getSource(id);
        expect(source.title.length).toBeGreaterThan(3);
        if (source.level !== "reconstructed-demo") expect(source.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("blocks every wet-work and installation step until electrical safety is cleared", () => {
    expect(canAccessStep(0, false)).toBe(true);
    expect(canAccessStep(1, false)).toBe(true);
    for (let index = 2; index < steps.length; index++) {
      expect(canAccessStep(index, false)).toBe(false);
      expect(canAccessStep(index, true)).toBe(true);
    }
    expect(steps[1].warning).toContain("Do not work on a live outlet");
  });

  it("keeps paste-the-wall operations distinct from paste-the-paper booking", () => {
    expect(pasteTheWallGuide.method).toBe("paste-the-wall");
    expect(steps.some((step) => step.operation === "paste")).toBe(true);
    expect(steps.find((step) => step.operation === "paste")?.instruction).toContain("Do not paste the back");
    expect(steps.some((step) => /book the paper/i.test(step.instruction))).toBe(false);
  });

  it("does not claim product approval or use inaccessible documents as evidence", () => {
    expect(pasteTheWallGuide.approval).toBe("general-guidance-not-product-approved");
    expect(pasteTheWallGuide.sources.some((source) => /kami/i.test(source.url))).toBe(false);
    expect(pasteTheWallGuide.sources.some((source) => source.publisher === "Graham & Brown")).toBe(true);
    expect(pasteTheWallGuide.sources.some((source) => source.publisher === "ROMAN Decorating Products")).toBe(true);
  });

  it("provides a valid scenario decision and accept/recheck criteria for every step", () => {
    for (const step of steps) {
      expect(step.checkpoint.prompt.length).toBeGreaterThan(35);
      expect(step.checkpoint.options).toHaveLength(3);
      expect(new Set(step.checkpoint.options).size).toBe(3);
      expect(step.checkpoint.answer).toBeGreaterThanOrEqual(0);
      expect(step.checkpoint.answer).toBeLessThan(step.checkpoint.options.length);
      expect(step.checkpoint.options[step.checkpoint.answer].length).toBeGreaterThan(20);
      expect(step.checkpoint.feedback.length).toBeGreaterThan(40);
      expect(step.quality.accept.length).toBeGreaterThan(30);
      expect(step.quality.recheck.length).toBeGreaterThan(30);
    }
  });

  it("uses a finite positive animation timeline without presenting it as site duration", () => {
    const sum = steps.reduce((total, step) => total + step.seconds, 0);
    expect(totalAnimationSeconds).toBe(sum);
    for (const step of steps) expect(step.seconds).toBeGreaterThan(0);
    expect(totalAnimationSeconds).toBeLessThan(150);
  });
});
