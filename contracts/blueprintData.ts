export type TrackId = "paste-the-wall" | "peel-and-stick" | "unitec-panel";
export type RenderStyleMode = "drawing" | "realistic";
export type QualityTierId = "low" | "medium" | "hd";

export interface TrayItemSpec {
  id: string;
  name: string;
  code: string;
  qty: number;
  kind:
    | "roll"
    | "panel"
    | "knife"
    | "straightedge"
    | "roller"
    | "smoother"
    | "seamRoller"
    | "laser"
    | "puttyKnife"
    | "sander"
    | "sponge"
    | "spray"
    | "tester"
    | "screwdriver"
    | "caulkGun"
    | "clip"
    | "tape";
  bagOrGroup: string;
}

export interface StepPartTag {
  kind: TrayItemSpec["kind"];
  qty: number;
  code: string;
  name: string;
}

export interface BlueprintStep {
  stepNumber: number; // 1..12
  id: string;
  phase: "PREP" | "REPAIR" | "PRIME" | "LAYOUT" | "APPLY" | "TRIM" | "FINISH";
  title: string;
  instruction: string;
  /** Mapped index in WALLPAPER_TASK (0..35) so the 3D scene can render exact geometry + state */
  simStepIndex: number;
  simProgress: number;
  /** 3D target point [x, y, z] in wall coordinates where the circular detail loupe & orange target ring lock */
  focusPoint: [number, number, number];
  /** Direction vector [dx, dy, dz] for the 3D orange motion arrow */
  arrowDir: [number, number, number];
  /** Close-up detail label shown inside the circular magnifying loupe */
  detailLabel: string;
  /** Close-up camera distance (meters) */
  detailRadius: number;
  /** Main camera spherical angles [theta, phi, distance] around focusPoint */
  cameraOrbit: [number, number, number];
  /** Parts and tools used in this step (rendered as IKEA-style chips below the canvas) */
  items: StepPartTag[];
  /** Optional safety gate that must be acknowledged on this step */
  safetyGate?: {
    id: string;
    title: string;
    rule: string;
    verification: string;
  };
  /** Encouraging assembly buddy callout on milestone steps */
  buddyCheer?: {
    pose: "wave" | "point" | "thumbsUp";
    speech: string;
  };
  /** Voiceover script for the Video Factory */
  voiceover: string;
}

export interface TrackManifest {
  id: TrackId;
  name: string;
  subtitle: string;
  fichaCode: string;
  fichaUrl: string;
  defaultRollWidthCm: number;
  defaultRollLengthM: number;
  defaultRepeatCm: number;
  trayItems: TrayItemSpec[];
  steps: BlueprintStep[];
}

export const TRAY_ITEMS_COMMON: TrayItemSpec[] = [
  { id: "roll-main", name: "Wallcovering Roll", code: "53cm×10m", qty: 3, kind: "roll", bagOrGroup: "Material" },
  { id: "unitec-panel", name: "UNITEC Panel / Sheet", code: "FT_03/15", qty: 4, kind: "panel", bagOrGroup: "Material" },
  { id: "knife-30", name: "30° Snap-Off Knife", code: "9mm-30°", qty: 1, kind: "knife", bagOrGroup: "Cut" },
  { id: "rule-600", name: "Steel Straightedge", code: "600mm", qty: 1, kind: "straightedge", bagOrGroup: "Cut" },
  { id: "smoother", name: "Felt Squeegee / Smoother", code: "280mm", qty: 1, kind: "smoother", bagOrGroup: "Hang" },
  { id: "roller", name: "Microfiber Roller (12 mm)", code: "230mm", qty: 1, kind: "roller", bagOrGroup: "Paste" },
  { id: "seam-roller", name: "POM Seam Roller", code: "40mm", qty: 1, kind: "seamRoller", bagOrGroup: "Seam" },
  { id: "laser", name: "Self-Leveling Laser", code: "±0.3mm/m", qty: 1, kind: "laser", bagOrGroup: "Layout" },
  { id: "putty", name: "Flex Putty Knife", code: "100mm", qty: 1, kind: "puttyKnife", bagOrGroup: "Repair" },
  { id: "sander", name: "220-Grit Sanding Block", code: "P220", qty: 1, kind: "sander", bagOrGroup: "Repair" },
  { id: "tester", name: "Voltage Detector", code: "CAT-III", qty: 1, kind: "tester", bagOrGroup: "Safety" },
  { id: "driver", name: "Insulated Screwdriver", code: "VDE-1000V", qty: 1, kind: "screwdriver", bagOrGroup: "Safety" },
  { id: "spray", name: "Isopropyl / Sugar-Soap Spray", code: "750ml", qty: 1, kind: "spray", bagOrGroup: "Prep" },
  { id: "sponge", name: "Cellulose Seam Sponge", code: "Rinse", qty: 2, kind: "sponge", bagOrGroup: "Prep" },
  { id: "caulk", name: "PEGATEC Cartridge Gun", code: "FT_27", qty: 1, kind: "caulkGun", bagOrGroup: "Panel" },
];

export const BLUEPRINT_TRACKS: Record<TrackId, TrackManifest> = {
  "paste-the-wall": {
    id: "paste-the-wall",
    name: "Track A · Paste-the-Wall Wallpaper (12 Steps)",
    subtitle: "Non-woven 52/53 cm × 10.05 m roll · acrylic primer · flake-free starch/PVA adhesive rolled directly onto wall",
    fichaCode: "EN-233 / FT_13",
    fichaUrl: "/docs/unitec-fichas/13_FT_Marble_Adhesive_Roll.pdf",
    defaultRollWidthCm: 53,
    defaultRollLengthM: 10.05,
    defaultRepeatCm: 64,
    trayItems: TRAY_ITEMS_COMMON,
    steps: [
      {
        stepNumber: 1,
        id: "ptw-01-safety",
        phase: "PREP",
        title: "Kill power at breaker & remove outlet faceplate",
        instruction:
          "Switch off the branch circuit breaker, verify zero voltage at the receptacle with a non-contact voltage detector, and unscrew the faceplate so paper flows cleanly behind the cover.",
        simStepIndex: 1,
        simProgress: 0.48,
        focusPoint: [-0.95, 0.45, 0.015],
        arrowDir: [0, 0, 1],
        detailLabel: "2× Faceplate Screws",
        detailRadius: 0.24,
        cameraOrbit: [0.22, 1.38, 0.72],
        items: [
          { kind: "tester", qty: 1, code: "CAT-III", name: "Voltage detector" },
          { kind: "screwdriver", qty: 1, code: "VDE-4mm", name: "Insulated screwdriver" },
        ],
        safetyGate: {
          id: "gate-electrical-zero",
          title: "SAFETY GATE · ELECTRICAL LOCKOUT",
          rule: "Never wet, scrape, or slice with a steel utility blade near a live receptacle.",
          verification: "Confirm breaker is OFF and non-contact voltage tester reads 0 V across both slots.",
        },
        buddyCheer: {
          pose: "wave",
          speech: "Safety first! Kill the breaker and test for 0 V before touching the wall.",
        },
        voiceover: "Switch off the breaker, confirm zero voltage with a non-contact tester, and remove the outlet faceplate.",
      },
      {
        stepNumber: 2,
        id: "ptw-02-clean",
        phase: "PREP",
        title: "Degrease wall & verify moisture < 12% WME",
        instruction:
          "Mist sugar-soap degreaser from bottom to top, scrub in overlapping 30 cm circles, rinse with a damp microfiber cloth, and verify wall moisture is below 12% WME.",
        simStepIndex: 4,
        simProgress: 0.55,
        focusPoint: [-0.85, 1.35, 0.02],
        arrowDir: [1, 0, 0],
        detailLabel: "Sugar-Soap Scrub",
        detailRadius: 0.34,
        cameraOrbit: [0.18, 1.32, 1.55],
        items: [
          { kind: "spray", qty: 1, code: "750ml", name: "Sugar-soap spray" },
          { kind: "sponge", qty: 1, code: "Cellulose", name: "Scrub sponge" },
        ],
        voiceover: "Wash the wall with sugar-soap solution, wipe clean with damp microfiber, and let dry below twelve percent moisture.",
      },
      {
        stepNumber: 3,
        id: "ptw-03-repair",
        phase: "REPAIR",
        title: "Cross-fill anchor holes & sand flush with 220-grit",
        instruction:
          "Press lightweight spackle into all 6 fastener holes with a 100 mm flex putty knife at 35°, let cure 45 minutes, and sand dead-flat with 220-grit.",
        simStepIndex: 7,
        simProgress: 0.52,
        focusPoint: [-0.7, 1.88, 0.015],
        arrowDir: [0, -1, 0],
        detailLabel: "100mm Putty Knife",
        detailRadius: 0.28,
        cameraOrbit: [0.24, 1.35, 0.78],
        items: [
          { kind: "puttyKnife", qty: 1, code: "100mm", name: "Flex putty knife" },
          { kind: "sander", qty: 1, code: "P220", name: "Sanding block" },
        ],
        voiceover: "Fill every nail hole and dent flush using a flexible putty knife, then sand smooth with 220-grit.",
      },
      {
        stepNumber: 4,
        id: "ptw-04-prime",
        phase: "PRIME",
        title: "Roll acrylic wallpaper primer / sealer in W-strokes",
        instruction:
          "Cut in the perimeter 5 cm band with a sash brush, then roll 1 L of acrylic primer-sealer across the field so adhesive won't flash-dry into bare drywall.",
        simStepIndex: 11,
        simProgress: 0.62,
        focusPoint: [0.25, 1.35, 0.03],
        arrowDir: [0, 1, 0],
        detailLabel: "12mm Nap Primer Roller",
        detailRadius: 0.36,
        cameraOrbit: [0.16, 1.34, 1.75],
        items: [{ kind: "roller", qty: 1, code: "230mm", name: "Microfiber roller" }],
        buddyCheer: {
          pose: "thumbsUp",
          speech: "Priming locks the drywall pores so you can slide each drop into alignment!",
        },
        voiceover: "Roll one even coat of acrylic wallpaper primer across the wall and allow it to cure.",
      },
      {
        stepNumber: 5,
        id: "ptw-05-plumb",
        phase: "LAYOUT",
        title: "Project self-leveling laser plumb line at x = −1.56 m",
        instruction:
          "Measure 50 cm from the left corner (52 cm roll width minus 2 cm corner wrap) and project a true vertical laser plumb line down the wall.",
        simStepIndex: 14,
        simProgress: 0.65,
        focusPoint: [-1.56, 1.5, 0.015],
        arrowDir: [0, -1, 0],
        detailLabel: "Laser Plumb (-1.56m)",
        detailRadius: 0.3,
        cameraOrbit: [0.25, 1.35, 1.35],
        items: [
          { kind: "laser", qty: 1, code: "±0.3mm/m", name: "Cross-line laser" },
          { kind: "tape", qty: 1, code: "5m", name: "Tape measure" },
        ],
        voiceover: "Never trust an inside corner. Strike a true vertical laser plumb line fifty centimeters from the left wall.",
      },
      {
        stepNumber: 6,
        id: "ptw-06-table-cut",
        phase: "LAYOUT",
        title: "Cut numbered drops on table with 30° knife & 600 mm rule",
        instruction:
          "Unroll same-batch rolls on the table, align the 64 cm pattern repeat, hold the 600 mm steel straightedge square across the sheet, and slice cleanly with a fresh 30° blade.",
        simStepIndex: 15,
        simProgress: 0.56,
        focusPoint: [1.73, 0.77, 1.98],
        arrowDir: [0, 0, 1],
        detailLabel: "30° Blade + Steel Rule",
        detailRadius: 0.25,
        cameraOrbit: [-0.45, 1.15, 0.78],
        items: [
          { kind: "knife", qty: 1, code: "9mm-30°", name: "30° snap-off knife" },
          { kind: "straightedge", qty: 1, code: "600mm", name: "Steel straightedge" },
          { kind: "roll", qty: 3, code: "Batch-A", name: "Non-woven roll" },
        ],
        voiceover: "Hold the 600 millimeter steel straightedge square across the roll and slice each drop cleanly with a 30-degree blade.",
      },
      {
        stepNumber: 7,
        id: "ptw-07-paste-band",
        phase: "APPLY",
        title: "Roll flake-free paste onto Drop 1 wall band (+5 cm wide)",
        instruction:
          "Roll non-woven starch/PVA paste directly onto the primed wall for Drop 1, extending 5 cm past the laser plumb line so the seam edge stays fully wet.",
        simStepIndex: 18,
        simProgress: 0.65,
        focusPoint: [-1.82, 1.35, 0.03],
        arrowDir: [0, 1, 0],
        detailLabel: "Paste-the-Wall Band",
        detailRadius: 0.34,
        cameraOrbit: [0.22, 1.34, 1.35],
        items: [{ kind: "roller", qty: 1, code: "180g/m²", name: "Paste roller" }],
        voiceover: "Roll paste directly onto the wall for Drop 1, extending five centimeters past the laser plumb line.",
      },
      {
        stepNumber: 8,
        id: "ptw-08-hang-drop-1",
        phase: "APPLY",
        title: "Hang Drop 1 dry onto wet paste & kiss the laser plumb line",
        instruction:
          "Hold the top corners of Drop 1, allow 5 cm trim allowance at the ceiling, and slide the right edge until it kisses the red laser plumb line from top to bottom.",
        simStepIndex: 19,
        simProgress: 0.72,
        focusPoint: [-1.56, 1.85, 0.02],
        arrowDir: [-1, 0, 0],
        detailLabel: "Drop 1 → Plumb Line",
        detailRadius: 0.32,
        cameraOrbit: [0.28, 1.34, 1.65],
        items: [{ kind: "roll", qty: 1, code: "Drop-01", name: "Wallpaper Drop #1" }],
        buddyCheer: {
          pose: "point",
          speech: "Line Drop 1's right edge straight onto the laser line—every next drop references this one!",
        },
        voiceover: "Offer the dry drop to the wet wall with five centimeters overlap at the ceiling and slide its right edge onto the laser line.",
      },
      {
        stepNumber: 9,
        id: "ptw-09-smooth",
        phase: "APPLY",
        title: "Sweep felt smoother down the center & herring-bone outward",
        instruction:
          "Run the 280 mm felt-edge smoother down the center spine first, then sweep outward at 45° to expel every air pocket without stretching the paper.",
        simStepIndex: 20,
        simProgress: 0.58,
        focusPoint: [-1.82, 1.42, 0.02],
        arrowDir: [0, -1, 0],
        detailLabel: "280mm Felt Smoother",
        detailRadius: 0.3,
        cameraOrbit: [0.22, 1.34, 1.25],
        items: [{ kind: "smoother", qty: 1, code: "280mm", name: "Felt-edge smoother" }],
        voiceover: "Sweep the felt smoother down the center spine and angled outward to push out all air pockets.",
      },
      {
        stepNumber: 10,
        id: "ptw-10-trim",
        phase: "TRIM",
        title: "Trim ceiling & baseboard excess with 30° knife + straightedge",
        instruction:
          "Wedge the 600 mm steel straightedge tightly into the ceiling and baseboard crease, hold the 30° utility knife at a low 20° angle, and slice off the 5 cm excess in one continuous pass. Snap a fresh blade segment every 2 drops.",
        simStepIndex: 21,
        simProgress: 0.72,
        focusPoint: [-1.84, 0.1, 0.015],
        arrowDir: [1, 0, 0],
        detailLabel: "Baseboard Crease Cut",
        detailRadius: 0.22,
        cameraOrbit: [0.28, 1.42, 0.65],
        items: [
          { kind: "knife", qty: 1, code: "9mm-30°", name: "30° snap-off knife" },
          { kind: "straightedge", qty: 1, code: "600mm", name: "Steel straightedge" },
        ],
        voiceover: "Pin the steel straightedge into the baseboard crease and draw a fresh 30-degree blade across in one continuous pass.",
      },
      {
        stepNumber: 11,
        id: "ptw-11-seam",
        phase: "APPLY",
        title: "Butt Drop 2 edge-to-edge (0 mm overlap) & roll seam at ≤ 8 N",
        instruction:
          "Hang Drop 2 with patterns aligned and edges kissing (never overlapping). Lightly roll the vertical seam with a 40 mm POM seam roller and wipe any paste squeeze-out immediately.",
        simStepIndex: 27,
        simProgress: 0.55,
        focusPoint: [-1.56, 1.35, 0.018],
        arrowDir: [0, -1, 0],
        detailLabel: "40mm POM Seam Roller",
        detailRadius: 0.24,
        cameraOrbit: [0.2, 1.36, 0.88],
        items: [
          { kind: "seamRoller", qty: 1, code: "40mm-POM", name: "Barrel seam roller" },
          { kind: "sponge", qty: 1, code: "Damp", name: "Clean sponge" },
        ],
        voiceover: "Butt Drop 2 edge-to-edge against Drop 1 with patterns matched, then lightly roll the seam.",
      },
      {
        stepNumber: 12,
        id: "ptw-12-outlet",
        phase: "TRIM",
        title: "Slice diagonal X-relief cut over outlet & refit faceplate",
        instruction:
          "Feel the recessed outlet box perimeter through Drop 3, slice a diagonal X from corner to corner with a fresh 30° blade, fold back the 4 triangular flaps, trim 3 mm inside the box edge, and screw the faceplate back on.",
        simStepIndex: 30,
        simProgress: 0.52,
        focusPoint: [-0.95, 0.45, 0.015],
        arrowDir: [1, -1, 0],
        detailLabel: "Outlet 4-Flap X-Cut",
        detailRadius: 0.2,
        cameraOrbit: [0.22, 1.38, 0.54],
        items: [
          { kind: "knife", qty: 1, code: "9mm-30°", name: "30° snap-off knife" },
          { kind: "screwdriver", qty: 1, code: "VDE-4mm", name: "Insulated screwdriver" },
        ],
        safetyGate: {
          id: "gate-outlet-blade",
          title: "SAFETY GATE · BLADE NEAR RECEPTACLE",
          rule: "Keep the blade tip strictly outside the internal metal/plastic box terminals while making the diagonal X-cut.",
          verification: "Confirm breaker is still OFF before slicing the 4 relief flaps.",
        },
        buddyCheer: {
          pose: "wave",
          speech: "All 8 drops hung, trimmed, and faceplate restored—inspection complete!",
        },
        voiceover: "Slice a diagonal X across the outlet opening, fold and trim the four triangular flaps inside the box edge, and refit the faceplate.",
      },
    ],
  },

  "peel-and-stick": {
    id: "peel-and-stick",
    name: "Track B · Peel-and-Stick / UNITEC Marble Roll FT_13 (12 Steps)",
    subtitle: "UNITEC FT_13 PVC self-adhesive marble roll (9.84 ft × 23.62 in / 300 × 60 cm · 0.003 in) · alcohol prep · peel backing gradually",
    fichaCode: "FT_13",
    fichaUrl: "/docs/unitec-fichas/13_FT_Marble_Adhesive_Roll.pdf",
    defaultRollWidthCm: 60,
    defaultRollLengthM: 3.0,
    defaultRepeatCm: 60,
    trayItems: TRAY_ITEMS_COMMON,
    steps: [
      {
        stepNumber: 1,
        id: "pas-01-safety",
        phase: "PREP",
        title: "Lock out breaker & remove outlet cover plate (FT_13 Step 1)",
        instruction:
          "Turn off the circuit breaker, verify 0 V with a non-contact voltage detector, and remove the outlet faceplate so the self-adhesive marble vinyl seats flat around the box.",
        simStepIndex: 1,
        simProgress: 0.5,
        focusPoint: [-0.95, 0.45, 0.015],
        arrowDir: [0, 0, 1],
        detailLabel: "Remove Outlet Plate",
        detailRadius: 0.24,
        cameraOrbit: [0.22, 1.38, 0.72],
        items: [
          { kind: "tester", qty: 1, code: "CAT-III", name: "Voltage detector" },
          { kind: "screwdriver", qty: 1, code: "VDE-4mm", name: "Insulated screwdriver" },
        ],
        safetyGate: {
          id: "gate-pas-electrical",
          title: "SAFETY GATE · RECEPTACLE ISOLATION",
          rule: "Self-adhesive PVC foil is trimmed with a metal utility knife directly over the outlet box.",
          verification: "Confirm breaker is OFF and tester shows 0 V before removing the faceplate.",
        },
        buddyCheer: {
          pose: "wave",
          speech: "Track B uses UNITEC FT_13 Peel-and-Stick Marble Roll—no wet paste needed!",
        },
        voiceover: "Switch off the breaker, confirm zero voltage, and remove the outlet faceplate.",
      },
      {
        stepNumber: 2,
        id: "pas-02-alcohol",
        phase: "PREP",
        title: "Degrease surface with 70% Isopropyl Alcohol (FT_13 Step 1)",
        instruction:
          "Per UNITEC FT_13: wipe the entire substrate with 70% isopropyl alcohol or neutral detergent to remove all oil, silicone, and dust. Do NOT apply over rough, chalking, or damp plaster.",
        simStepIndex: 5,
        simProgress: 0.55,
        focusPoint: [-0.45, 1.35, 0.02],
        arrowDir: [1, 0, 0],
        detailLabel: "Isopropyl Alcohol Wipe",
        detailRadius: 0.32,
        cameraOrbit: [0.18, 1.34, 1.45],
        items: [
          { kind: "spray", qty: 1, code: "IPA-70%", name: "Isopropyl alcohol" },
          { kind: "sponge", qty: 1, code: "LintFree", name: "Microfiber cloth" },
        ],
        voiceover: "Degrease the smooth substrate with seventy percent isopropyl alcohol and let it evaporate completely.",
      },
      {
        stepNumber: 3,
        id: "pas-03-skim",
        phase: "REPAIR",
        title: "Spot-fill defects & sand ultra-smooth (220-grit)",
        instruction:
          "Because UNITEC FT_13 is a 0.003 in (0.08 mm) high-gloss PVC film, any grit or pin-hole will telegraph through. Fill defects flush and sand glass-smooth.",
        simStepIndex: 8,
        simProgress: 0.55,
        focusPoint: [-0.7, 1.88, 0.015],
        arrowDir: [1, 0, 0],
        detailLabel: "P220 Flush Sanding",
        detailRadius: 0.28,
        cameraOrbit: [0.22, 1.35, 0.78],
        items: [
          { kind: "puttyKnife", qty: 1, code: "100mm", name: "Putty knife" },
          { kind: "sander", qty: 1, code: "P220", name: "220-grit block" },
        ],
        voiceover: "Fill any pinholes and sand glass-smooth with 220-grit so nothing telegraphs through the glossy marble film.",
      },
      {
        stepNumber: 4,
        id: "pas-04-seal",
        phase: "PRIME",
        title: "Seal porous drywall & respect paint cure window",
        instruction:
          "Seal bare spackle or porous drywall with acrylic sealer. If the wall was recently painted, verify the full outgassing cure window (see 'Don't Guess' conflict table) so peel-and-stick adhesive does not delaminate.",
        simStepIndex: 11,
        simProgress: 0.7,
        focusPoint: [0.15, 1.35, 0.03],
        arrowDir: [0, 1, 0],
        detailLabel: "Acrylic Sealer Coat",
        detailRadius: 0.35,
        cameraOrbit: [0.18, 1.34, 1.65],
        items: [{ kind: "roller", qty: 1, code: "230mm", name: "Sealer roller" }],
        voiceover: "Seal any porous drywall patches and ensure fresh paint has fully cured before applying self-adhesive film.",
      },
      {
        stepNumber: 5,
        id: "pas-05-laser",
        phase: "LAYOUT",
        title: "Project vertical laser plumb line for Roll #1",
        instruction:
          "Strike a self-leveling laser plumb line 58 cm from the left corner (60 cm UNITEC FT_13 roll width minus 2 cm corner wrap).",
        simStepIndex: 14,
        simProgress: 0.65,
        focusPoint: [-1.56, 1.5, 0.015],
        arrowDir: [0, -1, 0],
        detailLabel: "Laser Line (-1.56m)",
        detailRadius: 0.3,
        cameraOrbit: [0.25, 1.35, 1.35],
        items: [{ kind: "laser", qty: 1, code: "±0.3mm/m", name: "Cross-line laser" }],
        voiceover: "Project a vertical laser plumb line fifty-eight centimeters from the left wall.",
      },
      {
        stepNumber: 6,
        id: "pas-06-cut",
        phase: "LAYOUT",
        title: "Cut FT_13 Marble Roll on table with 30° knife + metal ruler",
        instruction:
          "Per UNITEC FT_13 Step 2: measure using the grid lines printed on the backing paper, clamp the 600 mm metal straightedge, and slice cleanly with a sharp 30° utility knife.",
        simStepIndex: 15,
        simProgress: 0.56,
        focusPoint: [1.73, 0.77, 1.98],
        arrowDir: [0, 0, 1],
        detailLabel: "FT_13 Backing Grid Cut",
        detailRadius: 0.25,
        cameraOrbit: [-0.45, 1.15, 0.78],
        items: [
          { kind: "knife", qty: 1, code: "9mm-30°", name: "30° utility knife" },
          { kind: "straightedge", qty: 1, code: "600mm", name: "Metal ruler" },
          { kind: "roll", qty: 3, code: "FT_13", name: "UNITEC Marble Roll" },
        ],
        voiceover: "Use the backing-paper grid to measure each drop and slice along a metal ruler with a 30-degree utility knife.",
      },
      {
        stepNumber: 7,
        id: "pas-07-peel-top",
        phase: "APPLY",
        title: "Peel top 18 cm of release liner & tack crown to plumb line",
        instruction:
          "Per UNITEC FT_13 Step 3: peel back ONLY the top 15–20 cm of siliconized backing paper, fold it crease-free, and tack the exposed top adhesive band to the ceiling and laser plumb line.",
        simStepIndex: 19,
        simProgress: 0.38,
        focusPoint: [-1.56, 2.32, 0.02],
        arrowDir: [0, -1, 0],
        detailLabel: "Peel Top 18 cm Liner",
        detailRadius: 0.3,
        cameraOrbit: [0.26, 1.3, 1.45],
        items: [{ kind: "roll", qty: 1, code: "FT_13", name: "Marble Adhesive Roll" }],
        buddyCheer: {
          pose: "point",
          speech: "Never peel the whole backing sheet at once! Peel 18 cm at a time as you smooth downward.",
        },
        voiceover: "Peel only the top eighteen centimeters of backing paper and tack the top edge along the laser plumb line.",
      },
      {
        stepNumber: 8,
        id: "pas-08-peel-smooth",
        phase: "APPLY",
        title: "Pull backing liner down 25 cm at a time while smoothing outward",
        instruction:
          "Per UNITEC FT_13 Step 4: pull the backing paper downward in 25 cm increments with your bottom hand while sweeping the felt-edge spatula from the center outward to prevent air bubbles.",
        simStepIndex: 20,
        simProgress: 0.62,
        focusPoint: [-1.82, 1.38, 0.02],
        arrowDir: [0, -1, 0],
        detailLabel: "Peel & Squeegee Outward",
        detailRadius: 0.28,
        cameraOrbit: [0.22, 1.34, 1.22],
        items: [{ kind: "smoother", qty: 1, code: "FT_13", name: "Plastic/felt spatula" }],
        voiceover: "Pull the backing liner down gradually with one hand while sweeping the felt spatula outward from the center.",
      },
      {
        stepNumber: 9,
        id: "pas-09-trim",
        phase: "TRIM",
        title: "Trim ceiling & baseboard overhang with 30° blade + metal ruler",
        instruction:
          "Press the 600 mm metal straightedge firmly into the baseboard joint and slice the excess PVC marble film cleanly at a 20° blade angle.",
        simStepIndex: 21,
        simProgress: 0.72,
        focusPoint: [-1.84, 0.1, 0.015],
        arrowDir: [1, 0, 0],
        detailLabel: "30° Knife + Metal Rule",
        detailRadius: 0.22,
        cameraOrbit: [0.28, 1.42, 0.65],
        items: [
          { kind: "knife", qty: 1, code: "9mm-30°", name: "30° snap-off knife" },
          { kind: "straightedge", qty: 1, code: "600mm", name: "Metal ruler" },
        ],
        voiceover: "Pin the metal ruler into the baseboard joint and trim the excess marble vinyl cleanly.",
      },
      {
        stepNumber: 10,
        id: "pas-10-drop2",
        phase: "APPLY",
        title: "Align marble vein on Drop 2 & roll seam flat",
        instruction:
          "Match the grey Calacatta marble vein at eye level (1.50 m), peel and smooth Drop 2 from top to bottom, and roll the seam with the 40 mm roller.",
        simStepIndex: 27,
        simProgress: 0.55,
        focusPoint: [-1.56, 1.35, 0.018],
        arrowDir: [0, -1, 0],
        detailLabel: "Marble Vein Seam Match",
        detailRadius: 0.24,
        cameraOrbit: [0.2, 1.36, 0.88],
        items: [{ kind: "seamRoller", qty: 1, code: "40mm", name: "Seam roller" }],
        voiceover: "Align the marble veining on Drop 2 at eye level, smooth downward, and roll the seam flat.",
      },
      {
        stepNumber: 11,
        id: "pas-11-outlet",
        phase: "TRIM",
        title: "Cut diagonal X over outlet box & fold/trim 4 flaps",
        instruction:
          "Slice a diagonal X from corner to corner across the covered receptacle opening, trim the 4 vinyl flaps 3 mm inside the box edge, and refit the faceplate.",
        simStepIndex: 30,
        simProgress: 0.52,
        focusPoint: [-0.95, 0.45, 0.015],
        arrowDir: [1, -1, 0],
        detailLabel: "Outlet X-Relief Cut",
        detailRadius: 0.2,
        cameraOrbit: [0.22, 1.38, 0.54],
        items: [{ kind: "knife", qty: 1, code: "9mm-30°", name: "30° snap-off knife" }],
        voiceover: "Cut a diagonal X over the outlet box, trim the four triangular flaps, and restore the cover plate.",
      },
      {
        stepNumber: 12,
        id: "pas-12-finish",
        phase: "FINISH",
        title: "Refit faceplate, restore power & 24 h pressure-sensitive cure",
        instruction:
          "Screw the outlet faceplate back on without over-tightening (which can wrinkle vinyl), restore power at the breaker, and avoid steam/water contact for 24 hours.",
        simStepIndex: 35,
        simProgress: 0.65,
        focusPoint: [-0.95, 0.45, 0.015],
        arrowDir: [0, 0, -1],
        detailLabel: "Refit Outlet Cover",
        detailRadius: 0.24,
        cameraOrbit: [0.22, 1.36, 0.72],
        items: [{ kind: "screwdriver", qty: 1, code: "VDE-4mm", name: "Insulated screwdriver" }],
        buddyCheer: {
          pose: "thumbsUp",
          speech: "UNITEC FT_13 Marble Roll complete! Wait 24 hours before heavy moisture exposure.",
        },
        voiceover: "Screw the faceplate back on, restore power, and allow twenty-four hours for full adhesive cure.",
      },
    ],
  },

  "unitec-panel": {
    id: "unitec-panel",
    name: "Track C · UNITEC PVC Marble Sheet FT_03 & WPC Panel FT_15 (12 Steps)",
    subtitle: "UNITEC FT_03 (122 × 290 cm × 3 mm) + FT_15 WPC Slatted Panel (16 × 295 cm × 24 mm) + FT_27 PEGATEC Polyurethane Adhesive",
    fichaCode: "FT_03 / FT_15 / FT_27",
    fichaUrl: "/docs/unitec-fichas/03_FT_PVC_Marble_Sheet.pdf",
    defaultRollWidthCm: 122,
    defaultRollLengthM: 2.9,
    defaultRepeatCm: 0,
    trayItems: TRAY_ITEMS_COMMON,
    steps: [
      {
        stepNumber: 1,
        id: "up-01-safety",
        phase: "PREP",
        title: "Isolate breaker & remove electrical faceplates",
        instruction:
          "Switch off power at the breaker, verify 0 V with a CAT-III voltage detector, and remove faceplates (+3 mm box extenders required for 3 mm FT_03 sheets).",
        simStepIndex: 1,
        simProgress: 0.5,
        focusPoint: [-0.95, 0.45, 0.015],
        arrowDir: [0, 0, 1],
        detailLabel: "Electrical Lockout",
        detailRadius: 0.24,
        cameraOrbit: [0.22, 1.38, 0.72],
        items: [
          { kind: "tester", qty: 1, code: "CAT-III", name: "Voltage detector" },
          { kind: "screwdriver", qty: 1, code: "VDE-4mm", name: "Insulated screwdriver" },
        ],
        safetyGate: {
          id: "gate-up-electrical",
          title: "SAFETY GATE · SAW & KNIFE CLEARANCE",
          rule: "Rigid PVC sheets and WPC panels require box extenders so receptacles remain flush and enclosed.",
          verification: "Confirm breaker is OFF and 0 V is verified before removing cover plates.",
        },
        voiceover: "Isolate the circuit breaker, verify zero volts, and remove the outlet faceplate.",
      },
      {
        stepNumber: 2,
        id: "up-02-clean",
        phase: "PREP",
        title: "Degrease substrate for PEGATEC polyurethane bond (FT_27)",
        instruction:
          "Per UNITEC FT_03 & FT_27: clean the wall thoroughly to remove dust, grease, and loose paint so PEGATEC polyurethane adhesive bonds structurally.",
        simStepIndex: 4,
        simProgress: 0.55,
        focusPoint: [-0.85, 1.35, 0.02],
        arrowDir: [1, 0, 0],
        detailLabel: "Substrate Degrease",
        detailRadius: 0.34,
        cameraOrbit: [0.18, 1.32, 1.55],
        items: [{ kind: "spray", qty: 1, code: "Cleaner", name: "Degreaser spray" }],
        voiceover: "Clean and degrease the substrate so PEGATEC mounting adhesive achieves full structural bond.",
      },
      {
        stepNumber: 3,
        id: "up-03-level",
        phase: "REPAIR",
        title: "Level substrate high spots & fill hollows within ±2 mm",
        instruction:
          "Rigid 3 mm PVC Marble Sheets (FT_03) and 24 mm WPC Panels (FT_15) require a flat plane within ±2 mm over 2 m. Fill hollows and sand ridges flush.",
        simStepIndex: 7,
        simProgress: 0.52,
        focusPoint: [-0.7, 1.88, 0.015],
        arrowDir: [0, -1, 0],
        detailLabel: "±2mm Flatness Check",
        detailRadius: 0.28,
        cameraOrbit: [0.24, 1.35, 0.78],
        items: [{ kind: "puttyKnife", qty: 1, code: "100mm", name: "Putty knife" }],
        voiceover: "Fill any substrate hollows and sand high spots within two millimeters.",
      },
      {
        stepNumber: 4,
        id: "up-04-prime",
        phase: "PRIME",
        title: "Seal dusty plaster before adhesive application",
        instruction:
          "Roll one coat of acrylic sealer over chalky or dusty plaster so polyurethane beads adhere to the wall substrate rather than surface dust.",
        simStepIndex: 11,
        simProgress: 0.62,
        focusPoint: [0.25, 1.35, 0.03],
        arrowDir: [0, 1, 0],
        detailLabel: "Substrate Sealer",
        detailRadius: 0.36,
        cameraOrbit: [0.16, 1.34, 1.75],
        items: [{ kind: "roller", qty: 1, code: "230mm", name: "Roller" }],
        voiceover: "Seal porous or dusty plaster with one coat of acrylic primer.",
      },
      {
        stepNumber: 5,
        id: "up-05-plumb",
        phase: "LAYOUT",
        title: "Strike laser plumb line & set 6 mm perimeter expansion spacers (FT_03)",
        instruction:
          "Per UNITEC FT_03: set a 6 mm (1/4 in) thermal expansion gap at the ceiling, floor, and corners, and project a vertical laser reference line.",
        simStepIndex: 14,
        simProgress: 0.65,
        focusPoint: [-1.56, 1.5, 0.015],
        arrowDir: [0, -1, 0],
        detailLabel: "Laser + 6mm Gap (FT_03)",
        detailRadius: 0.3,
        cameraOrbit: [0.25, 1.35, 1.35],
        items: [{ kind: "laser", qty: 1, code: "±0.3mm/m", name: "Laser level" }],
        voiceover: "Project a vertical laser plumb line and place six-millimeter expansion spacers at floor and ceiling.",
      },
      {
        stepNumber: 6,
        id: "up-06-cut",
        phase: "LAYOUT",
        title: "Score & snap FT_03 sheet or fine-tooth cut FT_15 WPC panel",
        instruction:
          "Per UNITEC FT_03: score the 3 mm PVC Marble Sheet along the 600 mm straightedge with a utility knife (or fine-tooth circular saw). For FT_15 WPC panels, cut with a fine-tooth miter/circular saw.",
        simStepIndex: 15,
        simProgress: 0.56,
        focusPoint: [1.73, 0.77, 1.98],
        arrowDir: [0, 0, 1],
        detailLabel: "Score & Cut FT_03 Sheet",
        detailRadius: 0.25,
        cameraOrbit: [-0.45, 1.15, 0.78],
        items: [
          { kind: "knife", qty: 1, code: "FT_03", name: "Utility knife / saw" },
          { kind: "straightedge", qty: 1, code: "600mm", name: "Steel straightedge" },
        ],
        voiceover: "Cut the PVC marble sheet along a steel straightedge, leaving a six-millimeter expansion clearance.",
      },
      {
        stepNumber: 7,
        id: "up-07-pegatec",
        phase: "APPLY",
        title: "Cut PEGATEC nozzle at 45° & extrude S-pattern beads (FT_27)",
        instruction:
          "Per UNITEC FT_27 & FT_17: cut the PEGATEC 300 ml cartridge nozzle at a 45° angle and apply continuous S-pattern beads or dots every 10–15 cm across the back of the panel.",
        simStepIndex: 18,
        simProgress: 0.65,
        focusPoint: [-1.82, 1.35, 0.03],
        arrowDir: [0, 1, 0],
        detailLabel: "PEGATEC 45° Nozzle Bead",
        detailRadius: 0.34,
        cameraOrbit: [0.22, 1.34, 1.35],
        items: [{ kind: "caulkGun", qty: 1, code: "FT_27", name: "PEGATEC 300ml Gun" }],
        buddyCheer: {
          pose: "point",
          speech: "Cut the PEGATEC nozzle at 45° and bond the panel before a surface skin forms!",
        },
        voiceover: "Cut the PEGATEC cartridge nozzle at forty-five degrees and apply an S-pattern adhesive bead across the back.",
      },
      {
        stepNumber: 8,
        id: "up-08-mount",
        phase: "APPLY",
        title: "Set Panel 1 onto laser line & fasten 2 clips per linear meter (FT_15)",
        instruction:
          "Position Panel 1 against the laser plumb line (before PEGATEC forms a surface skin). For FT_15 WPC panels, lock the tongue-and-groove edge with 2 stainless clips per linear meter.",
        simStepIndex: 19,
        simProgress: 0.72,
        focusPoint: [-1.56, 1.85, 0.02],
        arrowDir: [-1, 0, 0],
        detailLabel: "2 Clips / m (FT_15)",
        detailRadius: 0.32,
        cameraOrbit: [0.28, 1.34, 1.65],
        items: [{ kind: "panel", qty: 1, code: "FT_03/15", name: "UNITEC Panel #1" }],
        voiceover: "Set Panel 1 onto the laser plumb line and secure two mounting clips per linear meter.",
      },
      {
        stepNumber: 9,
        id: "up-09-press",
        phase: "APPLY",
        title: "Press firmly across panel face for ≥ 30 seconds (FT_17 / FT_27)",
        instruction:
          "Per UNITEC FT_17 & FT_27: press evenly from center outward for at least 30 seconds so the polyurethane beads compress into a uniform structural bed.",
        simStepIndex: 20,
        simProgress: 0.58,
        focusPoint: [-1.82, 1.42, 0.02],
        arrowDir: [0, -1, 0],
        detailLabel: "≥30s Pressure Bond",
        detailRadius: 0.3,
        cameraOrbit: [0.22, 1.34, 1.25],
        items: [{ kind: "smoother", qty: 1, code: "Press", name: "Pressure pad / roller" }],
        voiceover: "Press firmly across the panel face for at least thirty seconds to seat the adhesive bed.",
      },
      {
        stepNumber: 10,
        id: "up-10-trim",
        phase: "TRIM",
        title: "Fit J-trim / L-molding at ceiling & SPC baseboard (FT_21 / FT_24)",
        instruction:
          "Snap or bond UNITEC Interior PVC Molding (FT_21) at the top edge and SPC Baseboard (FT_24) at the floor to conceal the 6 mm expansion gap.",
        simStepIndex: 21,
        simProgress: 0.72,
        focusPoint: [-1.84, 0.1, 0.015],
        arrowDir: [1, 0, 0],
        detailLabel: "6mm Gap + Trim (FT_24)",
        detailRadius: 0.22,
        cameraOrbit: [0.28, 1.42, 0.65],
        items: [{ kind: "straightedge", qty: 1, code: "FT_24", name: "SPC Baseboard trim" }],
        voiceover: "Install the top molding and baseboard trim to cover the six-millimeter expansion gap.",
      },
      {
        stepNumber: 11,
        id: "up-11-interlock",
        phase: "APPLY",
        title: "Interlock subsequent panels & wipe joint with mineral spirits",
        instruction:
          "Slide the tongue of Panel 2 into the concealed clip groove of Panel 1 (or butt FT_03 sheets with T-molding) and wipe any fresh polyurethane squeeze-out immediately.",
        simStepIndex: 27,
        simProgress: 0.55,
        focusPoint: [-1.56, 1.35, 0.018],
        arrowDir: [0, -1, 0],
        detailLabel: "Tongue-in-Groove Joint",
        detailRadius: 0.24,
        cameraOrbit: [0.2, 1.36, 0.88],
        items: [{ kind: "seamRoller", qty: 1, code: "Joint", name: "Seam roller" }],
        voiceover: "Interlock each subsequent panel into the concealed clips and wipe the joint clean.",
      },
      {
        stepNumber: 12,
        id: "up-12-outlet",
        phase: "FINISH",
        title: "Cut receptacle window, peel UV protective film & refit plate",
        instruction:
          "Trim the outlet cutout flush with the box extender, peel off the factory clear UV protective film from the FT_03 marble surface, and screw the faceplate back on.",
        simStepIndex: 30,
        simProgress: 0.52,
        focusPoint: [-0.95, 0.45, 0.015],
        arrowDir: [1, -1, 0],
        detailLabel: "Outlet Cutout & UV Film",
        detailRadius: 0.2,
        cameraOrbit: [0.22, 1.38, 0.54],
        items: [
          { kind: "knife", qty: 1, code: "FT_03", name: "Utility knife" },
          { kind: "screwdriver", qty: 1, code: "VDE-4mm", name: "Insulated screwdriver" },
        ],
        buddyCheer: {
          pose: "wave",
          speech: "Peel off the clear protective film from the FT_03 Marble Sheet for a mirror finish!",
        },
        voiceover: "Trim the outlet cutout, peel off the factory protective film, and restore the faceplate.",
      },
    ],
  },
};

export interface SourceConflictItem {
  id: string;
  topic: string;
  optionA: { label: string; value: string; source: string };
  optionB: { label: string; value: string; source: string };
  unitecOfficial: { label: string; value: string; source: string };
  engineeringRule: string;
}

/**
 * "Don't Guess" section — every open question and industry source conflict printed side-by-side instead of averaged away.
 */
export const DONT_GUESS_CONFLICTS: SourceConflictItem[] = [
  {
    id: "roll-width",
    topic: "Standard Roll Width (52 cm vs. 53 cm vs. 60 cm)",
    optionA: {
      label: "52 cm (20.5 in)",
      value: "520 mm × 10.05 m (5.22 m²/roll)",
      source: "UK / Legacy Imperial Wallcovering Spec & PLUMB Botanical Roll",
    },
    optionB: {
      label: "53 cm (20.87 in)",
      value: "530 mm × 10.05 m (5.32 m²/roll)",
      source: "European EN 233 Metric Standard ('Euro-Roll')",
    },
    unitecOfficial: {
      label: "60 cm (23.62 in)",
      value: "600 mm × 3.00 m (9.84 ft × 23.62 in = 1.80 m²/roll)",
      source: "Official UNITEC Ficha Técnica FT_13 (Marble Adhesive Roll)",
    },
    engineeringRule:
      "Never hardcode 52.5 cm. Keep rollWidthCm as an explicit parameter in the calculator & step schema (52, 53, or 60 cm) because 1 cm per drop shifts the 8th seam by 8 cm!",
  },
  {
    id: "roll-count-formula",
    topic: "Roll-Count Calculation (Formula A: Strip-by-Strip vs. Formula B: Area ÷ Usable Yield)",
    optionA: {
      label: "Formula A · Exact Strip/Drop Count (Pro)",
      value: "drops = ceil(wallW / rollW); dropLen = ceil((wallH + trim) / repeat) × repeat; rolls = ceil(drops / floor(rollLen / dropLen))",
      source: "PDRA / Guild of Master Craftsmen Strip-Yield Method",
    },
    optionB: {
      label: "Formula B · Gross Wall Area + Waste %",
      value: "netArea = (wallW × wallH) − openings; rolls = ceil((netArea × 1.15) / (rollW × rollLen))",
      source: "Retail Consumer Estimator (ignores whole-drop cutoff waste at bottom of roll)",
    },
    unitecOfficial: {
      label: "UNITEC Panel / Roll Coverage",
      value: "FT_03 Sheet = 3.53 m² (122×290 cm) · FT_13 Roll = 1.80 m² (60×300 cm) · FT_15 WPC = 0.47 m²/panel + 10% cut allowance",
      source: "Official UNITEC Fichas Técnicas FT_03, FT_13, FT_15",
    },
    engineeringRule:
      "Print BOTH Formula A and Formula B side-by-side in the calculator! Formula B routinely under-orders by 1–2 rolls when a 64 cm pattern repeat leaves an unusable 1.8 m remnant at the end of each 10.05 m roll.",
  },
  {
    id: "paint-primer-cure",
    topic: "Paint & Primer Cure Time Before Hanging (2–4 h vs. 24 h vs. 7–30 Days)",
    optionA: {
      label: "Acrylic Wallpaper Primer-Sealer",
      value: "2–4 hours touch-dry (paste-the-wall) / 12–24 hours full cure",
      source: "Zinsser ShieldZ / Roman PRO-999 Technical Data Sheet",
    },
    optionB: {
      label: "Fresh Latex / Emulsion Wall Paint (Under Peel-and-Stick)",
      value: "Minimum 7 days (low-VOC) to 28–30 days (full solvent/coalescent outgassing)",
      source: "Peel-and-Stick PSA Manufacturer Warranty Spec",
    },
    unitecOfficial: {
      label: "UNITEC FT_13 / FT_27 Surface Prep",
      value: "Clean, completely dry, smooth, dust- and grease-free; bond PEGATEC FT_27 within 5–10 min before skin forms; full cure 24 h",
      source: "Official UNITEC Fichas Técnicas FT_13 & FT_27",
    },
    engineeringRule:
      "Distinguish dedicated wallpaper primer (4–24 h) from newly painted walls under Peel-and-Stick vinyl (14–30 days). Applying PSA film over uncured paint traps outgassing bubbles and pulls paint off on removal.",
  },
  {
    id: "seam-method",
    topic: "Vertical Seam Method (0 mm Butt Seam vs. 5–10 mm Overlap Seam)",
    optionA: {
      label: "Paste-the-Wall Non-Woven (Track A)",
      value: "0.0 mm Butt Seam (edges kiss flush; dimensional stability prevents shrinkage)",
      source: "EN 233 Non-Woven Fleece Specification",
    },
    optionB: {
      label: "Thin Peel-and-Stick Vinyl Foil (Track B)",
      value: "0 mm Butt Seam on flat walls OR 2–3 mm micro-overlap (or double-cut) if thermal shrinkage is expected",
      source: "Commercial Vinyl Graphics & UNITEC FT_13 Field Guide",
    },
    unitecOfficial: {
      label: "UNITEC FT_03 & FT_15 Joints",
      value: "FT_03: 6 mm expansion gap + aluminum T/H profile or silicone · FT_15 WPC: interlocking tongue-and-groove with 2 clips/m",
      source: "Official UNITEC Fichas Técnicas FT_03 & FT_15",
    },
    engineeringRule:
      "Never overlap thick non-woven wallpaper (creates a visible ridge) and never butt-join rigid PVC sheets without a 6 mm thermal expansion allowance.",
  },
];

export const QUALITY_TIERS: Array<{
  id: QualityTierId;
  label: string;
  pixelRatio: number;
  shadows: boolean;
  antialias: boolean;
  fpsTarget: number;
  desc: string;
}> = [
  {
    id: "low",
    label: "Tier 1 · Mobile / Battery (1.0× DPR)",
    pixelRatio: 1.0,
    shadows: false,
    antialias: false,
    fpsTarget: 30,
    desc: "1.0× devicePixelRatio, unlit CAD matcap/flat materials, zero shadow maps — runs on budget phones at 30–60 fps.",
  },
  {
    id: "medium",
    label: "Tier 2 · Desktop Interactive (1.5× DPR)",
    pixelRatio: 1.5,
    shadows: true,
    antialias: true,
    fpsTarget: 60,
    desc: "1.5× DPR, MSAA antialiasing, 2048² PCF soft shadows, ACES Filmic tone mapping + live circular detail loupe.",
  },
  {
    id: "hd",
    label: "Tier 3 · HD Video Factory (2.0× Supersampled 1080p30)",
    pixelRatio: 2.0,
    shadows: true,
    antialias: true,
    fpsTarget: 30,
    desc: "1920×1080 locked viewport at 2.0× supersampling, deterministic Δt = 1/30 s frame stepping for artifact-free MP4/WebM & PNG sheets.",
  },
];

export const VIDEO_FACTORY_PIPELINES = [
  {
    id: "pipe-1",
    name: "Pipeline 1 ·Deterministic Offline Frame Stepping + FFmpeg (1080p30 Master)",
    fidelity: "Highest (Zero dropped frames, exact 33.33 ms Δt)",
    stack: "Headless Chrome (--use-angle=d3d11) + scene.setFrame(step, u) + canvas.toDataURL('image/png') + FFmpeg libx264",
    command:
      "ffmpeg -framerate 30 -i frames/step_%02d_frame_%04d.png -i voiceover.wav -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart plumb_unitec_1080p30.mp4",
  },
  {
    id: "pipe-2",
    name: "Pipeline 2 · In-Browser WebCodecs / canvas-record (MP4 Direct)",
    fidelity: "High (Hardware-accelerated H.264/AVC in browser)",
    stack: "dmnsgn/canvas-record + WebCodecs VideoEncoder + mp4-muxer",
    command:
      "const recorder = new CanvasRecorder(canvas, { frameRate: 30, videoBitsPerSecond: 12_000_000 }); await recorder.start(); /* step loop */ await recorder.stop();",
  },
  {
    id: "pipe-3",
    name: "Pipeline 3 · Live MediaRecorder Stream (Built into this Player!)",
    fidelity: "Instant One-Click Preview (WebM VP9 / MP4)",
    stack: "canvas.captureStream(30) + MediaRecorder('video/webm;codecs=vp9', { videoBitsPerSecond: 8_000_000 })",
    command: "Click 'Record Step Video (WebM)' in the toolbar above to record and download directly from the live 3D canvas.",
  },
  {
    id: "pipe-4",
    name: "Pipeline 4 · Printable Step Sheet Renderer (Built into this Player!)",
    fidelity: "Print-Ready 300 DPI Step Cards",
    stack: "Steps through steps 1..12 in Drawing mode, composites main canvas + circular Detail Loupe + SVG leader line into a printable grid.",
    command: "Click 'Generate Printable Step Sheets (12 Cards)' in the toolbar above to render all 12 steps from the same step-data file.",
  },
];

export const SIX_PHASE_PLAN = [
  {
    phase: "Phase 1",
    title: "Unified Step-Data Contract & Schema Validation",
    deliverables: "Zod / TypeScript schema for tracks, parts tray, step poses (from/to), camera orbits, detail loupe anchors, and safety gates.",
    acceptanceTest: "vitest verifies all 3 tracks (Paste-the-Wall, Peel-and-Stick FT_13, UNITEC Panels FT_03/15) have valid 3D coordinates, non-empty tool lists, and safety gates on electrical steps.",
  },
  {
    phase: "Phase 2",
    title: "Interactive 3D Manual Player (Drawing + Realistic + Circular Loupe)",
    deliverables: "Dual-canvas Three.js engine (#stage + circular #inset loupe) with SVG dashed leader line (#leads), Step 0 Parts Tray with non-overlapping 3D labels, and Drawing/Realistic toggle.",
    acceptanceTest: "Zero WebGL errors; dragging orbits smoothly; circular loupe tracks the primary fastener/tool tip via dashed SVG leader line; Step 0 displays all parts with readable tags.",
  },
  {
    phase: "Phase 3",
    title: "Dual-Track Wallpaper & UNITEC Panel Choreography + Safety Gates",
    deliverables: "Complete 12-step interactive tracks for Paste-the-Wall, Peel-and-Stick (FT_13), and Rigid Panels (FT_03/15/27) with mandatory Electrical Lockout Safety Gate.",
    acceptanceTest: "Switching tracks updates 3D surface textures, tool models, step captions, and official UNITEC Ficha Técnica PDF links immediately.",
  },
  {
    phase: "Phase 4",
    title: "Live Roll & Pattern Calculator + 'Don't Guess' Conflict Matrix",
    deliverables: "Side-by-side Formula A (Strip-by-Strip with repeat rounding) vs. Formula B (Area + Waste %) calculator supporting 52 cm, 53 cm, and 60 cm (FT_13) widths.",
    acceptanceTest: "For a 4.16 × 2.55 m wall with 64 cm repeat, Formula A and Formula B outputs are displayed side-by-side with exact drop count, waste %, and sliver warning.",
  },
  {
    phase: "Phase 5",
    title: "One-Data-File Outputs: HD Video Factory & Printable Step Sheets",
    deliverables: "In-browser 30 fps canvas video recorder + deterministic 12-step Printable Manual Sheet generator driven from the exact same step-data file.",
    acceptanceTest: "Clicking 'Generate Printable Step Sheets' renders all 12 steps into high-contrast line-drawing cards with embedded detail loupes ready for window.print().",
  },
  {
    phase: "Phase 6",
    title: "Contribution / Moderation Workflow (Draft → Review → Approved)",
    deliverables: "Role-gated studio workflow allowing authors to propose step edits, inspect diffs, and promote guides from Draft to Review to Approved.",
    acceptanceTest: "Submitting a step modification records a revision entry and transitions status badges through Draft → In Review → Approved.",
  },
];

export const REFERENCE_LINKS = {
  liveDemos: [
    { name: "Flat Pack, Step by Step (IKEA BILLY in interactive 3D)", url: "https://sael.net/flatpack/", note: "Hosted reference demo — study interaction pattern (do not clone proprietary code)" },
    { name: "Ryan Sael's Explainers", url: "https://sael.net/explainers/", note: "Interactive visual explainers" },
    { name: "Bob the Builder on GitHub (loloop00/3D-IKEA-instructions)", url: "https://github.com/loloop00/3D-IKEA-instructions", note: "LACK & BRIMNES 3D manual with circular detail inset + leader line (check license before commercial reuse)" },
    { name: "Bob the Builder Live Demo", url: "https://bob-the-builder.leakedleek.xyz", note: "Works on mobile & desktop" },
    { name: "Get Me An Alt (dl88jing/get-me-an-alt)", url: "https://github.com/dl88jing/get-me-an-alt", note: "IKEA-style 3D assembly player + exploded CAD view" },
  ],
  openSourceStack: [
    { name: "Nutlope/bygga — Open-Source 3D Manual Generator (MIT)", url: "https://github.com/Nutlope/bygga", note: "Three.js LineSegments2 + BackSide hull silhouette shader + 4-band cel faceMaterial + vector ToolArt/Figure" },
    { name: "gkjohnson/three-edge-projection (MIT)", url: "https://github.com/gkjohnson/three-edge-projection", note: "BVH-accelerated silhouette & crease projection for Three.js CAD illustrations" },
    { name: "gkjohnson/three-mesh-bvh (MIT)", url: "https://github.com/gkjohnson/three-mesh-bvh", note: "Fast raycasting & hidden-line removal for technical line drawings" },
    { name: "OmarShehata/webgl-outlines (MIT)", url: "https://github.com/OmarShehata/webgl-outlines", note: "Screen-space normal/depth/surface-ID post-process outline shaders" },
    { name: "bernhard-42/three-cad-viewer (Apache-2.0)", url: "https://github.com/bernhard-42/three-cad-viewer", note: "Three.js CAD viewport with orthographic projection & exploded assembly trees" },
    { name: "nmattia/skapa (MIT)", url: "https://github.com/nmattia/skapa", note: "Programmatic 3D woodworking & IKEA-style exploded technical diagrams" },
    { name: "Three.js (MIT)", url: "https://github.com/mrdoob/three.js/", note: "Core WebGL/WebGPU 3D engine + LineSegments2/RoundedBoxGeometry addons" },
    { name: "Babylon.js (Apache-2.0)", url: "https://github.com/BabylonJS/Babylon.js", note: "Alternative open-source 3D engine" },
    { name: "Google model-viewer (Apache-2.0)", url: "https://github.com/google/model-viewer", note: "Declarative glTF/GLB web component" },
    { name: "glTF-Transform (MIT)", url: "https://github.com/donmccurdy/glTF-Transform", note: "CLI/SDK for Draco/Meshopt & KTX2 optimization" },
    { name: "canvas-record (MIT)", url: "https://github.com/dmnsgn/canvas-record", note: "Deterministic WebCodecs / MP4 canvas recorder" },
  ],
  toolsAndVideos: [
    { name: "Assembly Maker", url: "https://assemblymaker.com/", note: "Browser-based 3D manuals" },
    { name: "ExplodeView Demo", url: "https://explodeview.com/demo/", note: "Interactive exploded CAD views" },
    { name: "Easemble", url: "https://www.easemble.com/", note: "3D assembly instructions platform" },
    { name: "Vectary 3D Manuals", url: "http://app.vectary.com/3d-manuals/", note: "Web 3D manual authoring" },
    { name: "ScrewYouIKEA (Devpost)", url: "https://devpost.com/software/screwyouikea", note: "2D manuals to 3D with AI" },
    { name: "Exploded View Animations in Blender (YouTube)", url: "https://www.youtube.com/watch?v=BppxCX9yT1I&list=PLdoc5sju3fsg&index=33", note: "Blender keyframe pipeline" },
    { name: "Interactive Assembly with Cadasio & SolidWorks (YouTube)", url: "https://www.youtube.com/watch?v=ytVM7Tks654", note: "CAD-to-interactive step choreography" },
    { name: "Vectary 3D Exploded View Tutorial (YouTube)", url: "https://www.youtube.com/watch?v=TWxZzwvhk7s", note: "Exploded layer offsets" },
    { name: "Demo Reel of Exploded Views & Assembly Animations (YouTube)", url: "https://www.youtube.com/watch?v=q03NpbNB4lw", note: "Camera & motion timing reference" },
  ],
};

export const MASTER_DEVELOPER_PROMPT = `You are a Principal 3D Graphics & Instructional Systems Engineer building the PLUMB × UNITEC USA DESIGN Interactive 3D Manual Engine.

CORE PRINCIPLE (THE ANSWER IN ONE LINE):
One unified step-data file (contracts/blueprintData.ts) drives ALL THREE outputs:
1. The Interactive 3D Manual App (Three.js dual-canvas stage + circular magnifying Detail Loupe + SVG dashed leader line + Drawing/Realistic toggle + Step 0 Parts Tray).
2. The HD Video Factory (30 fps WebM/MP4 canvas stream + deterministic frame-by-frame PNG sequence + FFmpeg 1080p30 assembly).
3. The Printable Step Sheets (automated multi-card high-contrast line-art manual generator rendered directly from the 3D scene).

ARCHITECTURE REQUIREMENTS:
- Render inside an IKEA/Flat-Pack-inspired instruction card (#f7f6f3 paper, 2px solid #141414 frame, 1.5px dashed inner guide border).
- Support Step 0 ("Parts & Tools Tray"): lay out all rolls, panels, knives, straightedges, rollers, and safety tools in 3D with non-overlapping projected HTML part chips.
- Render a circular Close-Up Detail Loupe (#inset) in the top-right corner connected via a dynamic SVG dashed leader line (#leads) to an international-orange (#e6502e) target ring at the active 3D tool tip.
- Include 3 complete 12-step tracks: (A) Paste-the-Wall Wallpaper, (B) Peel-and-Stick / UNITEC FT_13 Marble Roll, and (C) UNITEC FT_03 PVC Marble Sheet & FT_15 WPC Panel with FT_27 PEGATEC adhesive.
- Enforce an interactive Electrical Lockout Safety Gate before any outlet faceplate removal or relief-cut step.
- Include a side-by-side Roll & Pattern Calculator (Formula A: Strip-by-Strip vs. Formula B: Area + Waste %) and a "Don't Guess" Source Conflict Table (52 vs 53 vs 60 cm roll width, primer vs fresh paint cure times).`;
