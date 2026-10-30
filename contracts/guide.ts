import { z } from "zod";

export const wallpaperMethods = ["paste-the-wall", "peel-and-stick"] as const;
export const installationMethods = [
  ...wallpaperMethods,
  "wpc-panel",
  "pvc-marble-sheet",
  "upholstered-panel",
] as const;
export type WallpaperMethod = (typeof wallpaperMethods)[number];
export type InstallationMethod = (typeof installationMethods)[number];

export const toolKinds = [
  "none",
  "tape",
  "level",
  "knife",
  "roller",
  "brush",
  "smoother",
  "sponge",
  "bucket",
  "scissors",
  "stepladder",
  "squeegee",
] as const;
export type ToolKind = (typeof toolKinds)[number];

export const sceneActions = [
  "inspect",
  "prepare",
  "tools",
  "measure",
  "mark",
  "cut",
  "paste",
  "place",
  "smooth",
  "peel",
  "match",
  "trim",
  "clean",
  "check",
] as const;
export type SceneAction = (typeof sceneActions)[number];

const tuple3 = z.tuple([z.number(), z.number(), z.number()]);
const cameraPoseSchema = z.object({ position: tuple3, target: tuple3 });
export type CameraPose = z.infer<typeof cameraPoseSchema>;

export const visualStateSchema = z.object({
  action: z.enum(sceneActions),
  tool: z.enum(toolKinds),
  strips: z.number().int().min(0).max(5),
  activeStrip: z.number().int().min(0).max(4).default(0),
  paste: z.boolean().default(false),
  backing: z.boolean().default(false),
  plumb: z.boolean().default(false),
  patternMatch: z.boolean().default(false),
  trim: z.boolean().default(false),
  outletSafe: z.boolean().default(false),
  camera: cameraPoseSchema,
  callout: z.string().min(2).max(90),
});
export type VisualState = z.infer<typeof visualStateSchema>;

export const safetyGateSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(10).max(800),
  checks: z.array(z.string().min(3).max(240)).min(2).max(6),
});
export type SafetyGate = z.infer<typeof safetyGateSchema>;

export const guideStepSchema = z.object({
  id: z.string().min(2).max(80),
  title: z.string().min(3).max(120),
  shortTitle: z.string().min(2).max(42),
  instruction: z.string().min(10).max(600),
  detail: z.string().min(10).max(1200),
  duration: z.number().min(3).max(30),
  tools: z.array(z.string().min(2).max(80)).max(12),
  materials: z.array(z.string().min(2).max(100)).max(12),
  warning: z.string().max(500).optional(),
  gate: safetyGateSchema.optional(),
  narration: z.string().min(10).max(1000),
  printCaption: z.string().min(10).max(500),
  visual: visualStateSchema,
  sourceIds: z.array(z.string()).max(8),
});
export type GuideStep = z.infer<typeof guideStepSchema>;

export const guideSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.string().url(),
  note: z.string().max(400),
});
export type GuideSource = z.infer<typeof guideSourceSchema>;

export const productSchema = z.object({
  sku: z.string().min(1).max(40),
  brand: z.string().min(1).max(80),
  category: z.string().min(1).max(120),
  application: z.string().min(1).max(160),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  thicknessMm: z.number().positive(),
  coveragePerUnitM2: z.number().positive(),
  unitsPerPack: z.number().int().positive(),
  packCoverageM2: z.number().positive(),
  imageUrl: z.string().min(1),
  textureUrl: z.string().min(1),
  technicalSheetUrl: z.string().url(),
  geometry: z.enum(["fluted", "flat", "upholstered"]),
  finish: z.string().min(1).max(160),
  approvalStatus: z.literal("visual-prototype"),
});
export type ProductProfile = z.infer<typeof productSchema>;

export const guideSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(100),
  title: z.string().min(3).max(140),
  subtitle: z.string().min(3).max(220),
  method: z.enum(installationMethods),
  difficulty: z.enum(["Careful beginner", "Intermediate", "Professional"]),
  estimatedMinutes: z.number().int().min(10).max(600),
  people: z.number().int().min(1).max(4),
  description: z.string().min(20).max(1400),
  manufacturerNotice: z.string().min(20).max(1000),
  pattern: z.object({
    name: z.string(),
    repeatCm: z.number().min(0),
    match: z.enum(["free", "straight", "offset"]),
    rollWidthCm: z.number().positive(),
    rollLengthCm: z.number().positive(),
  }),
  steps: z.array(guideStepSchema).min(3).max(40),
  sources: z.array(guideSourceSchema).min(1).max(12),
  product: productSchema.optional(),
  modelKey: z.string().max(512).optional(),
});
export type Guide = z.infer<typeof guideSchema>;
export type GuideSummary = Pick<
  Guide,
  "slug" | "title" | "subtitle" | "method" | "difficulty" | "estimatedMinutes" | "people"
> & { stepCount: number };

export interface GuideTimelineSlice {
  step: GuideStep;
  stepIndex: number;
  stepTime: number;
  stepProgress: number;
  totalDuration: number;
}

export const guideTotalDuration = (guide: Guide) =>
  guide.steps.reduce((total, step) => total + step.duration, 0);

export const guideTimeAtStep = (guide: Guide, stepIndex: number) =>
  guide.steps.slice(0, stepIndex).reduce((total, step) => total + step.duration, 0);

export function guideSliceAtTime(guide: Guide, rawTime: number): GuideTimelineSlice {
  const totalDuration = guideTotalDuration(guide);
  const clamped = Math.max(0, Math.min(totalDuration, rawTime));
  let cursor = 0;

  for (let index = 0; index < guide.steps.length; index += 1) {
    const step = guide.steps[index];
    const next = cursor + step.duration;
    if (clamped < next || index === guide.steps.length - 1) {
      const stepTime = Math.max(0, Math.min(step.duration, clamped - cursor));
      return {
        step,
        stepIndex: index,
        stepTime,
        stepProgress: step.duration > 0 ? Math.min(1, stepTime / step.duration) : 1,
        totalDuration,
      };
    }
    cursor = next;
  }

  const lastIndex = guide.steps.length - 1;
  const last = guide.steps[lastIndex];
  return {
    step: last,
    stepIndex: lastIndex,
    stepTime: last.duration,
    stepProgress: 1,
    totalDuration,
  };
}
