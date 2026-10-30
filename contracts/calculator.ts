import { z } from "zod";
import { wallpaperMethods } from "./guide";

export const patternMatchSchema = z.enum(["free", "straight", "offset"]);
export type PatternMatch = z.infer<typeof patternMatchSchema>;

export const calculatorInputSchema = z.object({
  method: z.enum(wallpaperMethods),
  wallWidthCm: z.number().min(30, "Enter a wall width of at least 30 cm.").max(5000, "Enter a wall width under 50 m."),
  wallHeightCm: z.number().min(50, "Enter a wall height of at least 50 cm.").max(1200, "Enter a wall height under 12 m."),
  openingsAreaSqM: z.number().min(0, "Openings cannot be negative.").max(200, "Openings area is too large."),
  rollWidthCm: z.number().min(20, "Roll width must be at least 20 cm.").max(160, "Roll width must be 160 cm or less."),
  rollLengthCm: z.number().min(200, "Roll length must be at least 200 cm.").max(5000, "Roll length must be 50 m or less."),
  patternRepeatCm: z.number().min(0, "Pattern repeat cannot be negative.").max(200, "Pattern repeat must be 200 cm or less."),
  patternMatch: patternMatchSchema,
  trimAllowanceCm: z.number().min(0, "Trim allowance cannot be negative.").max(40, "Trim allowance must be 40 cm or less."),
  wastePercent: z.number().min(0, "Reserve cannot be negative.").max(35, "Reserve must be 35% or less."),
});
export type CalculatorInput = z.infer<typeof calculatorInputSchema>;

export interface CalculationStep {
  label: string;
  formula: string;
  value: string;
}

export interface CalculatorResult {
  valid: true;
  dropsNeeded: number;
  effectiveDropsNeeded: number;
  cutLengthCm: number;
  dropsPerRoll: number;
  baseRolls: number;
  recommendedRolls: number;
  linearMetersRequired: number;
  grossWallAreaSqM: number;
  netWallAreaSqM: number;
  rollCoverageSqM: number;
  estimatedWastePercent: number;
  warnings: string[];
  steps: CalculationStep[];
}

export const defaultCalculatorInput: CalculatorInput = {
  method: "paste-the-wall",
  wallWidthCm: 420,
  wallHeightCm: 255,
  openingsAreaSqM: 1.6,
  rollWidthCm: 52,
  rollLengthCm: 1005,
  patternRepeatCm: 64,
  patternMatch: "straight",
  trimAllowanceCm: 10,
  wastePercent: 10,
};

export function calculateWallpaper(rawInput: CalculatorInput): CalculatorResult {
  const input = calculatorInputSchema.parse(rawInput);
  const grossWallAreaSqM = (input.wallWidthCm * input.wallHeightCm) / 10000;
  const maxDeductibleSqM = grossWallAreaSqM * 0.65;
  const deductedSqM = Math.min(input.openingsAreaSqM, maxDeductibleSqM);
  const netWallAreaSqM = Math.max(grossWallAreaSqM * 0.35, grossWallAreaSqM - deductedSqM);
  const rawDrops = Math.ceil(input.wallWidthCm / input.rollWidthCm);

  const openingWidthEquivalentCm = (deductedSqM * 10000) / input.wallHeightCm;
  const conservativeOpeningDeductionDrops = Math.max(0, Math.floor((openingWidthEquivalentCm * 0.5) / input.rollWidthCm));
  const effectiveDropsNeeded = Math.max(1, rawDrops - conservativeOpeningDeductionDrops);

  const baseCutCm = input.wallHeightCm + input.trimAllowanceCm;
  let cutLengthCm = baseCutCm;
  if (input.patternMatch !== "free" && input.patternRepeatCm > 0) {
    const repeatsPerDrop = Math.ceil(baseCutCm / input.patternRepeatCm);
    cutLengthCm = repeatsPerDrop * input.patternRepeatCm;
    if (input.patternMatch === "offset") {
      cutLengthCm += input.patternRepeatCm / 2;
    }
  }

  const dropsPerRoll = Math.floor(input.rollLengthCm / cutLengthCm);
  if (dropsPerRoll < 1) {
    throw new Error("One roll is shorter than a single required drop. Increase roll length or check the wall height and repeat.");
  }

  const baseRolls = Math.ceil(effectiveDropsNeeded / dropsPerRoll);
  const dropsWithReserve = Math.ceil(effectiveDropsNeeded * (1 + input.wastePercent / 100));
  const recommendedRolls = Math.max(baseRolls, Math.ceil(dropsWithReserve / dropsPerRoll));
  const linearMetersRequired = (effectiveDropsNeeded * cutLengthCm) / 100;
  const purchasedLinearCm = recommendedRolls * input.rollLengthCm;
  const usedLinearCm = effectiveDropsNeeded * cutLengthCm;
  const estimatedWastePercent = Math.max(0, ((purchasedLinearCm - usedLinearCm) / purchasedLinearCm) * 100);
  const rollCoverageSqM = (input.rollWidthCm * input.rollLengthCm) / 10000;

  const warnings: string[] = [];
  if (input.openingsAreaSqM > 0) {
    warnings.push("Openings are deducted conservatively because headers, sills and reveals still consume full-width pattern drops.");
  }
  if (input.patternMatch === "offset" && input.patternRepeatCm > 0) {
    warnings.push("Offset match adds half a repeat per drop so alternating panels can shift into alignment.");
  }
  if (dropsPerRoll === 1) {
    warnings.push("Only one full drop fits on each roll; check whether a longer roll or smaller repeat is available.");
  }
  if (input.method === "peel-and-stick") {
    warnings.push("Some peel-and-stick brands require a small panel overlap. Confirm your product sheet before cutting final widths.");
  }

  const steps: CalculationStep[] = [
    {
      label: "Full-width drops across the wall",
      formula: `ceil(${input.wallWidthCm} cm ÷ ${input.rollWidthCm} cm)`,
      value: `${rawDrops} drops`,
    },
    {
      label: "Conservative opening adjustment",
      formula: deductedSqM > 0 ? `${rawDrops} drops − ${conservativeOpeningDeductionDrops} full-drop allowance` : "No opening deduction applied",
      value: `${effectiveDropsNeeded} working drops`,
    },
    {
      label: "Cut length per drop",
      formula:
        input.patternMatch === "free" || input.patternRepeatCm === 0
          ? `${input.wallHeightCm} cm height + ${input.trimAllowanceCm} cm trim`
          : `repeat-rounded(${baseCutCm} cm to ${input.patternRepeatCm} cm ${input.patternMatch})`,
      value: `${Math.round(cutLengthCm)} cm`,
    },
    {
      label: "Complete drops from each roll",
      formula: `floor(${input.rollLengthCm} cm ÷ ${Math.round(cutLengthCm)} cm)`,
      value: `${dropsPerRoll} drops / roll`,
    },
    {
      label: "Recommended order with reserve",
      formula: `ceil(${effectiveDropsNeeded} × (1 + ${input.wastePercent}%) ÷ ${dropsPerRoll})`,
      value: `${recommendedRolls} rolls`,
    },
  ];

  return {
    valid: true,
    dropsNeeded: rawDrops,
    effectiveDropsNeeded,
    cutLengthCm: Math.round(cutLengthCm * 10) / 10,
    dropsPerRoll,
    baseRolls,
    recommendedRolls,
    linearMetersRequired: Math.round(linearMetersRequired * 10) / 10,
    grossWallAreaSqM: Math.round(grossWallAreaSqM * 100) / 100,
    netWallAreaSqM: Math.round(netWallAreaSqM * 100) / 100,
    rollCoverageSqM: Math.round(rollCoverageSqM * 100) / 100,
    estimatedWastePercent: Math.round(estimatedWastePercent * 10) / 10,
    warnings,
    steps,
  };
}

// ============================================================================
// UNITEC USA DESIGN — ARCHITECTURAL PANEL & SHEET ESTIMATOR
// ============================================================================

export const unitecSkuSchema = z.enum(["14122019", "14121211", "14126406"]);
export type UnitecSku = z.infer<typeof unitecSkuSchema>;

export interface UnitecPanelInput {
  sku: UnitecSku;
  wallWidthCm: number;
  wallHeightCm: number;
  openingsAreaSqM: number;
  wastePercent: number;
}

export interface UnitecPanelResult {
  sku: UnitecSku;
  productName: string;
  dimensionsLabel: string;
  unitsNeeded: number;
  recommendedUnits: number;
  packsRecommended: number;
  packSize: number;
  clipsRecommended: number;
  adhesiveTubesRecommended: number;
  estimatedCostCop: number;
  estimatedCostUsd: number;
  grossWallAreaSqM: number;
  netWallAreaSqM: number;
  warnings: string[];
  steps: CalculationStep[];
}

export function calculateUnitecMaterial(input: UnitecPanelInput): UnitecPanelResult {
  const grossWallAreaSqM = (input.wallWidthCm * input.wallHeightCm) / 10000;
  const deductedSqM = Math.min(input.openingsAreaSqM, grossWallAreaSqM * 0.5);
  const netWallAreaSqM = Math.max(grossWallAreaSqM * 0.5, grossWallAreaSqM - deductedSqM);

  if (input.sku === "14122019") {
    // WPC Choco Mix (19) · 16 x 295 cm · 25 mm · pack of 10 · clip ref 14122902
    const unitWidthCm = 16;
    const unitHeightCm = 295;
    const packSize = 10;
    const priceCop = 113900;
    const columnsAcross = Math.ceil(input.wallWidthCm / unitWidthCm);
    const rowsVertical = Math.ceil(input.wallHeightCm / unitHeightCm);
    const rawUnits = columnsAcross * rowsVertical;
    const recommendedUnits = Math.ceil(rawUnits * (1 + input.wastePercent / 100));
    const packsRecommended = Math.ceil(recommendedUnits / packSize);
    // 4 concealed clips (ref 14122902) per 295 cm panel height on average (every ~60-70 cm)
    const clipsPerPanel = Math.max(3, Math.ceil(input.wallHeightCm / 65));
    const clipsRecommended = recommendedUnits * clipsPerPanel;
    const adhesiveTubesRecommended = Math.max(1, Math.ceil(recommendedUnits / 4));

    const warnings = [
      "Concealed fastener clip ref. 14122902 seats into the recessed tongue before driving the screw flush.",
      input.wallHeightCm > 295
        ? "Wall height exceeds single 295 cm panel length; plan horizontal trim band or staggered end-butt joints."
        : `Each 295 cm panel spans your ${input.wallHeightCm} cm wall height in a single continuous vertical drop.`,
    ];

    return {
      sku: "14122019",
      productName: "WPC Choco Mix (19) · Interior Fluted Panel",
      dimensionsLabel: "16 × 295 cm · 25 mm thickness",
      unitsNeeded: rawUnits,
      recommendedUnits,
      packsRecommended,
      packSize,
      clipsRecommended,
      adhesiveTubesRecommended,
      estimatedCostCop: recommendedUnits * priceCop,
      estimatedCostUsd: Math.round((recommendedUnits * priceCop) / 4000),
      grossWallAreaSqM: Math.round(grossWallAreaSqM * 100) / 100,
      netWallAreaSqM: Math.round(netWallAreaSqM * 100) / 100,
      warnings,
      steps: [
        {
          label: "Vertical panel modules across width",
          formula: `ceil(${input.wallWidthCm} cm ÷ 16 cm module)`,
          value: `${columnsAcross} panels wide`,
        },
        {
          label: "Vertical courses for wall height",
          formula: `ceil(${input.wallHeightCm} cm ÷ 295 cm panel length)`,
          value: `${rowsVertical} course(s)`,
        },
        {
          label: "Total WPC panels with reserve",
          formula: `ceil(${rawUnits} × (1 + ${input.wastePercent}%))`,
          value: `${recommendedUnits} panels (${packsRecommended} packs of 10)`,
        },
        {
          label: "Concealed fastener clips (Ref. 14122902)",
          formula: `${recommendedUnits} panels × ${clipsPerPanel} clips/panel (@ ~65 cm OC)`,
          value: `${clipsRecommended} clips`,
        },
      ],
    };
  }

  if (input.sku === "14121211") {
    // Lámina Mármol Eclipse M-11 · 122 x 244 cm · 3 mm · pack of 25
    const unitWidthCm = 122;
    const unitHeightCm = 244;
    const packSize = 25;
    const priceCop = 159900;
    const cols = Math.ceil(input.wallWidthCm / unitWidthCm);
    const rows = Math.ceil(input.wallHeightCm / unitHeightCm);
    const rawUnits = cols * rows;
    const recommendedUnits = Math.ceil(rawUnits * (1 + input.wastePercent / 100));
    const packsRecommended = Math.ceil(recommendedUnits / packSize);
    const adhesiveTubesRecommended = Math.max(2, recommendedUnits * 2);

    return {
      sku: "14121211",
      productName: "Lámina Mármol Eclipse M-11 · PVC UV Sheet",
      dimensionsLabel: "122 × 244 cm · 3 mm thickness",
      unitsNeeded: rawUnits,
      recommendedUnits,
      packsRecommended,
      packSize,
      clipsRecommended: 0,
      adhesiveTubesRecommended,
      estimatedCostCop: recommendedUnits * priceCop,
      estimatedCostUsd: Math.round((recommendedUnits * priceCop) / 4000),
      grossWallAreaSqM: Math.round(grossWallAreaSqM * 100) / 100,
      netWallAreaSqM: Math.round(netWallAreaSqM * 100) / 100,
      warnings: [
        "3 mm high-gloss UV marble sheets telegraph substrate bumps—skim and sand wall flat within ≤2 mm over 2 m before bonding.",
        "Dry-lay sheets in installation order so white marble veins flow naturally across vertical joints.",
      ],
      steps: [
        {
          label: "122 cm sheets across wall width",
          formula: `ceil(${input.wallWidthCm} cm ÷ 122 cm)`,
          value: `${cols} sheets wide`,
        },
        {
          label: "244 cm courses for wall height",
          formula: `ceil(${input.wallHeightCm} cm ÷ 244 cm)`,
          value: `${rows} course(s)`,
        },
        {
          label: "Recommended sheets with reserve",
          formula: `ceil(${rawUnits} × (1 + ${input.wastePercent}%))`,
          value: `${recommendedUnits} sheets`,
        },
        {
          label: "Neutral-cure hybrid adhesive cartridges",
          formula: `${recommendedUnits} sheets × 2 cartridges / sheet`,
          value: `${adhesiveTubesRecommended} cartridges`,
        },
      ],
    };
  }

  // 14126406: Panel Acolchado DuoSmall Vainilla (820) · 20 x 110 cm · 25 mm · pack of 16
  const unitWidthCm = 20;
  const unitHeightCm = 110;
  const packSize = 16;
  const priceCop = 49900;
  const cols = Math.ceil(input.wallWidthCm / unitWidthCm);
  // Upholstered panels are often installed as a headboard/wainscot band (110 cm) or double-stacked (220 cm)
  const rows = Math.max(1, Math.floor(input.wallHeightCm / unitHeightCm));
  const rawUnits = cols * rows;
  const recommendedUnits = Math.ceil(rawUnits * (1 + input.wastePercent / 100));
  const packsRecommended = Math.ceil(recommendedUnits / packSize);
  const adhesiveTubesRecommended = Math.max(1, Math.ceil(recommendedUnits / 6));

  return {
    sku: "14126406",
    productName: "Panel Acolchado DuoSmall Vainilla (820)",
    dimensionsLabel: "20 × 110 cm · 25 mm upholstered arch module",
    unitsNeeded: rawUnits,
    recommendedUnits,
    packsRecommended,
    packSize,
    clipsRecommended: 0,
    adhesiveTubesRecommended,
    estimatedCostCop: recommendedUnits * priceCop,
    estimatedCostUsd: Math.round((recommendedUnits * priceCop) / 4000),
    grossWallAreaSqM: Math.round(grossWallAreaSqM * 100) / 100,
    netWallAreaSqM: Math.round(netWallAreaSqM * 100) / 100,
    warnings: [
      "Do not trim through the upholstered arch top; adjust overall array width and ledger datum height so only whole 20 × 110 cm modules are used.",
      "Apply adhesive 20 mm inside rear perimeter so no squeeze-out touches the vanilla textile edge.",
    ],
    steps: [
      {
        label: "Whole 20 cm arch modules across wall",
        formula: `ceil(${input.wallWidthCm} cm ÷ 20 cm module)`,
        value: `${cols} modules wide`,
      },
      {
        label: "Full 110 cm vertical tiers",
        formula: `floor(${input.wallHeightCm} cm ÷ 110 cm module height)`,
        value: `${rows} tier(s) (${rows * 110} cm decorative height)`,
      },
      {
        label: "Recommended modules with reserve",
        formula: `ceil(${rawUnits} × (1 + ${input.wastePercent}%))`,
        value: `${recommendedUnits} modules (${packsRecommended} boxes of 16)`,
      },
      {
        label: "Low-bleed mounting adhesive cartridges",
        formula: `ceil(${recommendedUnits} modules ÷ 6 modules/cartridge)`,
        value: `${adhesiveTubesRecommended} cartridges`,
      },
    ],
  };
}
