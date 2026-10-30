import { describe, expect, it } from "vitest";
import {
  calculateUnitecMaterial,
  calculateWallpaper,
  defaultCalculatorInput,
} from "../contracts/calculator";
import {
  guideSchema,
  guideSliceAtTime,
  guideTimeAtStep,
  guideTotalDuration,
} from "../contracts/guide";
import { unitecPanelGuides } from "../contracts/guides/unitec-panels";
import { approvedWallpaperGuides } from "../contracts/guides/wallpaper-guides";

describe("Guide Contracts & Timeline Precision", () => {
  const allGuides = [...approvedWallpaperGuides, ...unitecPanelGuides];

  it("validates all 5 wallcovering and UNITEC panel guides against guideSchema", () => {
    expect(allGuides).toHaveLength(5);
    for (const guide of allGuides) {
      const parsed = guideSchema.safeParse(guide);
      expect(parsed.success).toBe(true);
      // Every step sourceId must resolve to an attached source record
      const validIds = new Set(guide.sources.map((s) => s.id));
      for (const step of guide.steps) {
        for (const sid of step.sourceIds) {
          expect(validIds.has(sid)).toBe(true);
        }
      }
    }
  });

  it("computes deterministic timeline slices across every step boundary", () => {
    for (const guide of allGuides) {
      const total = guideTotalDuration(guide);
      expect(total).toBeGreaterThan(30);
      const midStepIndex = Math.floor(guide.steps.length / 2);
      const stepStart = guideTimeAtStep(guide, midStepIndex);
      const slice = guideSliceAtTime(guide, stepStart + 1.5);
      expect(slice.stepIndex).toBe(midStepIndex);
      expect(slice.step.id).toBe(guide.steps[midStepIndex].id);
      expect(slice.stepProgress).toBeGreaterThan(0);
      expect(slice.stepProgress).toBeLessThanOrEqual(1);
    }
  });
});

describe("Wallpaper & UNITEC USA Calculators", () => {
  it("calculates straight and offset match wallpaper rolls accurately", () => {
    const straight = calculateWallpaper(defaultCalculatorInput);
    expect(straight.valid).toBe(true);
    expect(straight.dropsNeeded).toBe(9);
    expect(straight.cutLengthCm).toBe(320); // ceil((255+10)/64) * 64 = 5 * 64 = 320 cm
    expect(straight.dropsPerRoll).toBe(3); // floor(1005 / 320) = 3
    expect(straight.recommendedRolls).toBeGreaterThanOrEqual(straight.baseRolls);

    const offset = calculateWallpaper({
      ...defaultCalculatorInput,
      patternMatch: "offset",
    });
    expect(offset.cutLengthCm).toBe(352); // 320 + 64/2
  });

  it("calculates UNITEC WPC Choco Mix (14122019), Marble Eclipse (14121211), and DuoSmall (14126406)", () => {
    const wpc = calculateUnitecMaterial({
      sku: "14122019",
      wallWidthCm: 320,
      wallHeightCm: 260,
      openingsAreaSqM: 0,
      wastePercent: 10,
    });
    expect(wpc.unitsNeeded).toBe(20); // 320 / 16 = 20 panels
    expect(wpc.recommendedUnits).toBe(22); // 20 * 1.1
    expect(wpc.clipsRecommended).toBeGreaterThan(60); // Concealed clip ref 14122902

    const marble = calculateUnitecMaterial({
      sku: "14121211",
      wallWidthCm: 366,
      wallHeightCm: 244,
      openingsAreaSqM: 0,
      wastePercent: 10,
    });
    expect(marble.unitsNeeded).toBe(3); // 366 / 122 = 3 sheets
    expect(marble.recommendedUnits).toBe(4);
    expect(marble.adhesiveTubesRecommended).toBe(8);

    const upholstered = calculateUnitecMaterial({
      sku: "14126406",
      wallWidthCm: 200,
      wallHeightCm: 240,
      openingsAreaSqM: 0,
      wastePercent: 10,
    });
    expect(upholstered.unitsNeeded).toBe(20); // 10 cols * 2 tiers
    expect(upholstered.packsRecommended).toBe(2); // 22 units -> 2 packs of 16
  });
});
