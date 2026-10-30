/**
 * PLUMB Task Spec — Paste-the-wall wallpaper installation, decomposed into
 * granular, machine-replayable steps.
 *
 * ONE source of truth drives:
 *   1. the 3D human-hand simulator (src/scene/TaskSimulatorScene.ts)
 *   2. the human checklist (buildHumanChecklist)
 *   3. the machine / robot task export (buildMachineTask)
 *
 * Coordinate frame (metres): origin = wall face, floor level, wall centre.
 *   +x → right along the wall, +y → up, +z → out of the wall into the room.
 *   Wall face is the plane z = 0. Tool-tip coordinates are reported.
 *
 * Forces and real-world times are NOMINAL planning values for visualisation and
 * robot path planning; calibrate on a test patch. Product labels always win.
 */

export type Vec3 = [number, number, number];

export interface WallRegion {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export const WALL = { x0: -2.08, x1: 2.08, height: 2.55, baseboard: 0.1, widthM: 4.16 } as const;
export const DROP_WIDTH = 0.52;
export const DROP_COUNT = 8;
export const DROP_CUT_LENGTH_M = 3.2;
export const PLUMB_X = WALL.x0 + DROP_WIDTH; // right edge of drop 1 = true plumb datum
export const OUTLET = { x: -0.8, y: 0.35, w: 0.07, h: 0.11 } as const;
export const HOLES: [number, number][] = [
  [-1.35, 1.62],
  [-0.15, 1.95],
  [0.85, 1.25],
  [-0.45, 0.92],
  [1.55, 0.62],
];
export const TABLE = { x0: 0.8, x1: 2.0, z0: 1.75, z1: 2.3, y: 0.8 } as const;
export const SOAP_BUCKET: Vec3 = [1.78, 0, 0.72];
export const PASTE_BUCKET: Vec3 = [1.3, 0, 0.78];
export const PLATE_ON_TABLE: Vec3 = [0.95, TABLE.y + 0.01, TABLE.z0 + 0.12];

export function dropRect(i: number): WallRegion {
  const x0 = WALL.x0 + i * DROP_WIDTH;
  return { x0, x1: Math.min(WALL.x1, x0 + DROP_WIDTH), y0: WALL.baseboard, y1: WALL.height };
}

const FULL: WallRegion = { x0: WALL.x0 + 0.04, x1: WALL.x1 - 0.04, y0: WALL.baseboard + 0.04, y1: WALL.height - 0.04 };
const OUTLET_REGION: WallRegion = { x0: OUTLET.x - 0.12, x1: OUTLET.x + 0.12, y0: OUTLET.y - 0.14, y1: OUTLET.y + 0.14 };
const TABLE_REGION: WallRegion = { x0: TABLE.x0, x1: TABLE.x1, y0: 0.6, y1: 1.0 };
const FLOOR_REGION: WallRegion = { x0: WALL.x0, x1: WALL.x1, y0: 0, y1: 0.4 };

function band(i: number): WallRegion {
  const r = dropRect(i);
  return { x0: Math.max(WALL.x0, r.x0 - 0.03), x1: Math.min(WALL.x1, r.x1 + 0.03), y0: 0.12, y1: 2.53 };
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type TaskPhase = "Safety" | "Protect" | "Clean" | "Repair" | "Prime" | "Layout" | "Glue" | "Hang" | "Finish";

export const PHASE_ORDER: TaskPhase[] = ["Safety", "Protect", "Clean", "Repair", "Prime", "Layout", "Glue", "Hang", "Finish"];

export const PHASE_COLORS: Record<TaskPhase, string> = {
  Safety: "#f0b298",
  Protect: "#c7b38a",
  Clean: "#7fb7e6",
  Repair: "#d9c27a",
  Prime: "#f3f0e8",
  Layout: "#ff6b6b",
  Glue: "#b9d7f0",
  Hang: "#d2fd78",
  Finish: "#9be15d",
};

export type ToolId =
  | "voltageTester"
  | "screwdriver"
  | "hands"
  | "sprayBottle"
  | "sponge"
  | "microfiber"
  | "moistureMeter"
  | "fillerKnife"
  | "sandingBlock"
  | "dustBrush"
  | "angledBrush"
  | "primerRoller"
  | "clock"
  | "tapeMeasure"
  | "pencil"
  | "utilityKnife"
  | "stirStick"
  | "pasteRoller"
  | "pasteBrush"
  | "smoother"
  | "seamRoller"
  | "flashlight";

export type SecondaryTool = "straightedge" | "plate" | "dropCloth" | "dropCorner";

export type Primitive =
  | "probe"
  | "unscrew"
  | "screw"
  | "lay"
  | "spray"
  | "scrub"
  | "wipe"
  | "probeGrid"
  | "fill"
  | "sand"
  | "dust"
  | "cutIn"
  | "roll"
  | "wait"
  | "measure"
  | "markLine"
  | "cutOnTable"
  | "stir"
  | "pasteBand"
  | "pasteEdge"
  | "hangDrop"
  | "smooth"
  | "trim"
  | "wipeSeam"
  | "seamRoll"
  | "reliefCut"
  | "hangBatch"
  | "inspect";

export type Hand = "right" | "left" | "both";
export type PPE = "nitrile gloves" | "safety glasses" | "dust mask";

export interface TaskStep {
  id: string;
  phase: TaskPhase;
  title: string;
  instruction: string;
  tips: string[];
  tool: ToolId;
  secondaryTool?: SecondaryTool;
  product?: string;
  hand: Hand;
  primitive: Primitive;
  region: WallRegion;
  passes?: number;
  dropIndex?: number;
  durationS: number;
  realWorldMinutes: number;
  forceN?: number;
  ppe: PPE[];
  successCriteria: string[];
  safety?: string;
}

export const TOOLS: Record<ToolId | SecondaryTool, { name: string; spec: string }> = {
  voltageTester: { name: "Non-contact voltage tester", spec: "CAT III 1000 V pen type, self-test before and after use" },
  screwdriver: { name: "Insulated screwdriver", spec: "Slotted / PH1 to match faceplate screws, 1000 V insulated" },
  hands: { name: "Hands (flat palm)", spec: "Clean hands or nitrile gloves; no rings that can mark the paper" },
  sprayBottle: { name: "Trigger spray bottle", spec: "750 ml, fine-mist nozzle, labelled with its contents" },
  sponge: { name: "Two-sided cleaning sponge", spec: "Soft cellulose side + non-scratch scrub side" },
  microfiber: { name: "Microfiber cloths (×3)", spec: "Lint-free, rinsed in clean water and wrung damp" },
  moistureMeter: { name: "Pin / pinless moisture meter", spec: "Drywall/plaster scale; compare to primer & paste label limits" },
  fillerKnife: { name: "Flexible filler knife", spec: "50 mm stainless blade" },
  sandingBlock: { name: "Sanding block", spec: "120 grit then 220 grit" },
  dustBrush: { name: "Dusting brush + tack cloth", spec: "Soft bristle, 100 mm" },
  angledBrush: { name: "Angled sash brush", spec: "50 mm synthetic, for cutting in primer" },
  primerRoller: { name: "Primer roller + tray", spec: "230 mm frame, 10 mm nap sleeve" },
  clock: { name: "Timer", spec: "Cure time from the primer label" },
  tapeMeasure: { name: "Steel tape measure", spec: "5 m, locking blade" },
  pencil: { name: "Laser level + carpenter pencil", spec: "Cross-line laser in vertical mode; HB pencil, light line" },
  utilityKnife: { name: "Snap-off utility knife", spec: "9 mm, 30° blades; snap a fresh segment every 1–2 cuts" },
  stirStick: { name: "Stir stick", spec: "Clean timber or plastic paddle" },
  pasteRoller: { name: "Paste roller + tray", spec: "230 mm frame, short-nap sleeve reserved for adhesive" },
  pasteBrush: { name: "Pasting brush", spec: "100 mm, for ceiling and baseboard edges" },
  smoother: { name: "Plastic wallpaper smoother", spec: "230 mm flexible, burr-free edge" },
  seamRoller: { name: "Seam roller", spec: "Narrow plastic/rubber roller — only if the paper label permits" },
  flashlight: { name: "Inspection flashlight", spec: "Raking-light LED, held close to the wall" },
  straightedge: { name: "Metal straightedge / trim guide", spec: "600–700 mm steel" },
  plate: { name: "Outlet faceplate", spec: "Removed and stored with its screws" },
  dropCloth: { name: "Drop cloth", spec: "Canvas or poly-backed, full wall length" },
  dropCorner: { name: "Wallpaper drop (other corner)", spec: "Held by the second hand" },
};

export interface MaterialLine {
  item: string;
  quantity: string;
  usedIn: string[];
  note: string;
}

export const MATERIALS: MaterialLine[] = [
  { item: "Non-woven paste-the-wall wallpaper", quantity: "3 rolls · 52 cm × 10.05 m · same batch", usedIn: ["layout-cut", "hang-drop-1", "hang-drop-2", "hang-drop-3", "hang-drops-4-8"], note: "8 drops × 320 cm (64 cm repeat) — 3 drops/roll, 1 spare drop" },
  { item: "Sugar soap / TSP-free degreaser", quantity: "1 bottle, diluted per label in the spray bottle", usedIn: ["clean-spray", "clean-scrub"], note: "Removes grease, nicotine and hand marks that stop paste bonding" },
  { item: "Clean warm water", quantity: "2 buckets (rinse + paste clean-up)", usedIn: ["clean-rinse", "clean-drop-1"], note: "Change when cloudy" },
  { item: "Ready-mixed lightweight filler", quantity: "250 ml tub", usedIn: ["repair-fill"], note: "For screw holes, dents and hairline cracks" },
  { item: "Abrasive sheets", quantity: "120 + 220 grit", usedIn: ["repair-sand"], note: "Sand flush; do not burnish the board paper" },
  { item: "Tack cloth", quantity: "1", usedIn: ["repair-dust"], note: "Removes sanding dust before primer" },
  { item: "Wallcovering primer / sealer", quantity: "≈1 L for 10.6 m²", usedIn: ["prime-cutin", "prime-roll"], note: "Type and cure time as specified by the wallpaper manufacturer" },
  { item: "Paste-the-wall adhesive", quantity: "1 tub (coverage per label)", usedIn: ["glue-mix", "glue-band-1", "glue-band-2", "glue-band-3", "hang-drops-4-8"], note: "Use the adhesive named on the roll label" },
  { item: "Snap-off blades", quantity: "1 pack of 10", usedIn: ["layout-cut", "trim-drop-1", "trim-drop-2", "relief-cut", "trim-drop-3"], note: "A dull blade tears wet paper" },
  { item: "Drop cloth", quantity: "1 × 4.5 m", usedIn: ["protect-floor"], note: "Keep tools and paste off the floor" },
];

// ---------------------------------------------------------------------------
// The 36-step task
// ---------------------------------------------------------------------------

const GLOVES: PPE[] = ["nitrile gloves"];
const GLOVES_GLASSES: PPE[] = ["nitrile gloves", "safety glasses"];

export const WALLPAPER_TASK: TaskStep[] = [
  // SAFETY ------------------------------------------------------------------
  {
    id: "safety-isolate", phase: "Safety", primitive: "probe", tool: "voltageTester", hand: "right", region: OUTLET_REGION,
    title: "Switch off the breaker and prove the outlet is dead",
    instruction: "Switch off the circuit breaker for this wall. Self-test the voltage tester on a known live outlet, then hold its tip to both slots of this outlet: it must stay silent.",
    tips: ["Label the breaker 'WORK IN PROGRESS' so nobody switches it back on.", "Re-test the tester on a live outlet afterwards to prove it still works."],
    durationS: 5, realWorldMinutes: 3, ppe: [],
    successCriteria: ["Breaker OFF and labelled", "Tester silent at both slots", "Tester re-verified on a live source"],
    safety: "If you cannot identify the breaker or the tester still detects voltage, stop and call an electrician.",
  },
  {
    id: "safety-plate", phase: "Safety", primitive: "unscrew", tool: "screwdriver", secondaryTool: "plate", hand: "both", region: OUTLET_REGION,
    title: "Remove the outlet faceplate",
    instruction: "Unscrew both faceplate screws with the insulated screwdriver while the left hand supports the plate. Put the plate and screws together on the table.",
    tips: ["Do not unscrew the receptacle itself — only the decorative plate.", "Tape the screws to the back of the plate."],
    durationS: 5, realWorldMinutes: 2, ppe: [],
    successCriteria: ["Plate and both screws stored together", "Receptacle untouched in its box"],
  },
  // PROTECT -----------------------------------------------------------------
  {
    id: "protect-floor", phase: "Protect", primitive: "lay", tool: "hands", secondaryTool: "dropCloth", hand: "both", region: FLOOR_REGION,
    title: "Lay the drop cloth along the whole wall",
    instruction: "Unfold the drop cloth tight against the baseboard along the full 4.16 m wall, about 1 m deep into the room.",
    tips: ["Tape the edge to the floor if it slides."],
    durationS: 5, realWorldMinutes: 3, ppe: [],
    successCriteria: ["Floor covered full length, 1 m deep", "No trip folds"],
  },
  // CLEAN -------------------------------------------------------------------
  {
    id: "clean-spray", phase: "Clean", primitive: "spray", tool: "sprayBottle", hand: "right", region: FULL, passes: 4,
    product: "Sugar soap / TSP-free degreaser (diluted per label)",
    title: "Mist the wall with sugar-soap solution",
    instruction: "Holding the nozzle about 35 cm from the wall, mist the diluted sugar soap in overlapping horizontal passes, top to bottom. Work in sections you can scrub before it dries.",
    tips: ["Spray top-down so drips land on wall you have not cleaned yet.", "Keep spray away from the open outlet box."],
    durationS: 6, realWorldMinutes: 5, forceN: 0, ppe: GLOVES_GLASSES,
    successCriteria: ["Even wet film over the whole section", "No runs into the outlet box"],
    safety: "Wear gloves and eye protection; read the cleaner's label.",
  },
  {
    id: "clean-scrub", phase: "Clean", primitive: "scrub", tool: "sponge", hand: "right", region: FULL, passes: 5,
    product: "Sugar soap solution on the wall",
    title: "Scrub in small overlapping circles",
    instruction: "Scrub with the soft side of the sponge in 10 cm circles, row by row. Use the non-scratch side only on scuffs and hand marks.",
    tips: ["Rinse the sponge in the soap bucket every row.", "Pay extra attention around switches and at hand height."],
    durationS: 8, realWorldMinutes: 12, forceN: 15, ppe: GLOVES,
    successCriteria: ["No visible grease, scuffs or hand marks", "Uniform sheen when viewed at an angle"],
  },
  {
    id: "clean-rinse", phase: "Clean", primitive: "wipe", tool: "microfiber", hand: "right", region: FULL, passes: 6,
    product: "Clean warm water",
    title: "Rinse with a clean damp microfiber cloth",
    instruction: "Wipe the entire wall in horizontal strokes with a microfiber cloth rinsed in clean water and wrung damp, to remove all soap residue.",
    tips: ["Change the rinse water when it turns cloudy.", "Soap residue left on the wall weakens the paste bond."],
    durationS: 7, realWorldMinutes: 10, forceN: 10, ppe: GLOVES,
    successCriteria: ["No soap film or streaks", "Cloth comes away clean"],
  },
  {
    id: "clean-dry", phase: "Clean", primitive: "probeGrid", tool: "moistureMeter", hand: "right", region: FULL,
    title: "Let it dry, then confirm dryness with a moisture meter",
    instruction: "Let the wall air-dry, then check five points (four corners and centre) with the moisture meter. All readings must be within the primer manufacturer's limit.",
    tips: ["Ventilate the room; do not force-dry with direct heat."],
    durationS: 6, realWorldMinutes: 60, ppe: [],
    successCriteria: ["All 5 readings within the primer label limit", "Wall dry to the touch"],
  },
  // REPAIR ------------------------------------------------------------------
  {
    id: "repair-fill", phase: "Repair", primitive: "fill", tool: "fillerKnife", hand: "right", region: FULL,
    product: "Ready-mixed lightweight filler",
    title: "Fill holes and dents",
    instruction: "Press filler into each hole with the knife held at 45°, then draw the blade across flat to leave the filler just proud of the surface.",
    tips: ["Two thin coats beat one thick coat in deep holes."],
    durationS: 7, realWorldMinutes: 10, forceN: 12, ppe: [],
    successCriteria: ["Every hole and dent filled", "Filler slightly proud, no ridges"],
  },
  {
    id: "repair-sand", phase: "Repair", primitive: "sand", tool: "sandingBlock", hand: "right", region: FULL,
    title: "Sand repairs flush",
    instruction: "When the filler is dry, sand each patch flush with 120 grit then 220 grit in small circles. Feel with a flat palm: no edge should be felt.",
    tips: ["Wallpaper telegraphs every bump — this step matters."],
    durationS: 6, realWorldMinutes: 8, forceN: 10, ppe: ["dust mask", "safety glasses"],
    successCriteria: ["Patches flush to the touch", "Board paper not scuffed through"],
  },
  {
    id: "repair-dust", phase: "Repair", primitive: "dust", tool: "dustBrush", hand: "right", region: FULL, passes: 4,
    title: "Remove all sanding dust",
    instruction: "Brush the wall top to bottom, then wipe with a tack cloth so the primer bonds to the wall, not to dust.",
    tips: ["Vacuum the baseboard top as well."],
    durationS: 5, realWorldMinutes: 5, forceN: 3, ppe: ["dust mask"],
    successCriteria: ["Dark cloth wiped on the wall picks up no dust"],
  },
  // PRIME -------------------------------------------------------------------
  {
    id: "prime-cutin", phase: "Prime", primitive: "cutIn", tool: "angledBrush", hand: "right", region: FULL,
    product: "Wallcovering primer / sealer",
    title: "Cut in primer at the ceiling, corners and baseboard",
    instruction: "With the angled brush, paint a 5–8 cm band of primer along the ceiling line, both corners, the baseboard and around the outlet box.",
    tips: ["Keep a wet edge so the roller can blend into it."],
    durationS: 7, realWorldMinutes: 15, forceN: 5, ppe: GLOVES,
    successCriteria: ["Continuous band, no gaps at the edges"],
  },
  {
    id: "prime-roll", phase: "Prime", primitive: "roll", tool: "primerRoller", hand: "right", region: FULL,
    product: "Wallcovering primer / sealer",
    title: "Roll primer over the whole wall",
    instruction: "Load the roller evenly from the tray and roll in overlapping vertical passes from left to right, laying off with light top-to-bottom strokes.",
    tips: ["Do not over-spread; follow the coverage on the can."],
    durationS: 8, realWorldMinutes: 20, forceN: 20, ppe: GLOVES,
    successCriteria: ["Uniform coat, no holidays or heavy lap marks"],
  },
  {
    id: "prime-cure", phase: "Prime", primitive: "wait", tool: "clock", hand: "right", region: FULL,
    title: "Let the primer cure",
    instruction: "Leave the primer to cure for the full time on its label before any paste touches the wall.",
    tips: ["Use this time to read the wallpaper roll label in full."],
    durationS: 4, realWorldMinutes: 240, ppe: [],
    successCriteria: ["Label cure time elapsed", "Surface dry and not tacky"],
  },
  // LAYOUT ------------------------------------------------------------------
  {
    id: "layout-measure", phase: "Layout", primitive: "measure", tool: "tapeMeasure", hand: "right", region: FULL,
    title: "Measure the height at three points",
    instruction: "Measure floor-to-ceiling at the left, centre and right of the wall. Use the greatest height (255 cm) plus 10 cm trim to get the drop length, rounded up to the 64 cm repeat: 320 cm.",
    tips: ["Walls are rarely the same height at both ends."],
    durationS: 6, realWorldMinutes: 4, ppe: [],
    successCriteria: ["Three heights recorded", "Cut length = 320 cm confirmed"],
  },
  {
    id: "layout-plumb", phase: "Layout", primitive: "markLine", tool: "pencil", hand: "right", region: { x0: PLUMB_X - 0.2, x1: PLUMB_X + 0.2, y0: 0.1, y1: 2.55 },
    title: "Mark the true vertical (plumb) line",
    instruction: "Set the laser level to vertical, align it 52 cm from the left corner, and pencil a light line along the beam from ceiling to baseboard. This line — not the corner — guides drop 1.",
    tips: ["Keep the pencil line light so it cannot show through pale paper."],
    durationS: 5, realWorldMinutes: 4, forceN: 2, ppe: [],
    successCriteria: ["Line is laser-true from ceiling to baseboard", "Exactly 52 cm from the corner"],
  },
  {
    id: "layout-cut", phase: "Layout", primitive: "cutOnTable", tool: "utilityKnife", secondaryTool: "straightedge", hand: "both", region: TABLE_REGION,
    product: "Wallpaper rolls (same batch)",
    title: "Cut the drops to 320 cm on the table",
    instruction: "Unroll on a clean table, match the pattern start, hold the straightedge square across the paper and cut each drop to 320 cm. Number the backs in order.",
    tips: ["Cut every drop from the same pattern point so the straight match lines up.", "Snap a fresh blade segment every 1–2 cuts."],
    durationS: 6, realWorldMinutes: 15, forceN: 8, ppe: [],
    successCriteria: ["8 drops cut to 320 cm", "Backs numbered 1–8, top marked"],
    safety: "Cut away from the hand holding the straightedge.",
  },
  // GLUE --------------------------------------------------------------------
  {
    id: "glue-mix", phase: "Glue", primitive: "stir", tool: "stirStick", hand: "right", region: FLOOR_REGION,
    product: "Paste-the-wall adhesive (as named on the roll label)",
    title: "Prepare and stir the adhesive",
    instruction: "Open the adhesive named on the roll label and stir to a smooth, lump-free consistency (mix powder with water only as the label states).",
    tips: ["Keep the paste bucket covered between drops."],
    durationS: 5, realWorldMinutes: 5, ppe: GLOVES,
    successCriteria: ["Smooth, lump-free paste"],
  },
  {
    id: "glue-band-1", phase: "Glue", primitive: "pasteBand", tool: "pasteRoller", hand: "right", region: band(0), dropIndex: 0,
    product: "Paste-the-wall adhesive",
    title: "Roll paste onto the wall for drop 1",
    instruction: "Roll an even coat of paste onto the wall for drop 1 only, 3 cm wider than the drop on each side so the edges bed fully.",
    tips: ["Paste the wall, never the paper, for paste-the-wall products."],
    durationS: 6, realWorldMinutes: 3, forceN: 15, ppe: GLOVES,
    successCriteria: ["Even, fully wet band 58 cm wide", "No dry spots or puddles"],
  },
  {
    id: "glue-edge-1", phase: "Glue", primitive: "pasteEdge", tool: "pasteBrush", hand: "right", region: band(0), dropIndex: 0,
    product: "Paste-the-wall adhesive",
    title: "Brush paste into the ceiling and baseboard edges",
    instruction: "Use the pasting brush to bring paste right up to the ceiling line and down to the baseboard where the roller cannot reach.",
    tips: ["Edges peel first — give them full coverage."],
    durationS: 5, realWorldMinutes: 2, forceN: 5, ppe: GLOVES,
    successCriteria: ["Paste reaches ceiling and baseboard lines"],
  },
  // HANG drop 1 ---------------------------------------------------------------
  {
    id: "hang-drop-1", phase: "Hang", primitive: "hangDrop", tool: "hands", secondaryTool: "dropCorner", hand: "both", region: dropRect(0), dropIndex: 0,
    product: "Drop 1 (dry)",
    title: "Hang drop 1 dry onto the paste, aligned to the plumb line",
    instruction: "Hold the top corners, offer the dry drop to the wall with about 5 cm extra at the ceiling, then slide it until its right edge sits exactly on the plumb line and let it fall down the wall.",
    tips: ["Flat hands, not fingertips — fingertips dent wet paper.", "Do not stretch the paper to reach the line."],
    durationS: 7, realWorldMinutes: 3, forceN: 4, ppe: [],
    successCriteria: ["Right edge on the plumb line top to bottom", "5 cm excess at ceiling and baseboard"],
  },
  {
    id: "smooth-drop-1", phase: "Hang", primitive: "smooth", tool: "smoother", hand: "right", region: dropRect(0), dropIndex: 0,
    title: "Smooth from the centre outwards",
    instruction: "Working down the drop, sweep the smoother from the centre line out to each edge to push air and excess paste out. Keep checking the edge on the plumb line.",
    tips: ["If a crease forms, peel back gently and re-lay — do not force it flat."],
    durationS: 7, realWorldMinutes: 3, forceN: 20, ppe: [],
    successCriteria: ["No bubbles or creases", "Edge still on the plumb line"],
  },
  {
    id: "trim-drop-1", phase: "Hang", primitive: "trim", tool: "utilityKnife", secondaryTool: "straightedge", hand: "both", region: dropRect(0), dropIndex: 0,
    title: "Trim the excess at ceiling and baseboard",
    instruction: "Press the straightedge into the ceiling angle, cut along it with a fresh blade, then repeat at the baseboard. Remove the offcuts.",
    tips: ["Keep the knife against the straightedge and move the straightedge, not the knife, between cuts."],
    durationS: 6, realWorldMinutes: 3, forceN: 8, ppe: [],
    successCriteria: ["Clean straight cuts", "No tears, no gap at ceiling or baseboard"],
    safety: "Keep the straightedge hand above the cut line.",
  },
  {
    id: "clean-drop-1", phase: "Hang", primitive: "wipeSeam", tool: "sponge", hand: "right", region: dropRect(0), dropIndex: 0,
    product: "Clean water (damp sponge)",
    title: "Wipe paste off the paper face, ceiling and baseboard",
    instruction: "With a clean, well-wrung sponge, wipe the edges, ceiling line and baseboard to remove all paste before it dries.",
    tips: ["Dried paste leaves shiny patches on matt papers."],
    durationS: 5, realWorldMinutes: 2, forceN: 6, ppe: [],
    successCriteria: ["No paste residue on paper, ceiling or baseboard"],
  },
  // drop 2 --------------------------------------------------------------------
  {
    id: "glue-band-2", phase: "Glue", primitive: "pasteBand", tool: "pasteRoller", hand: "right", region: band(1), dropIndex: 1,
    product: "Paste-the-wall adhesive",
    title: "Paste the wall for drop 2",
    instruction: "Roll paste for the next drop, overlapping 3 cm onto the edge of drop 1's band so the seam is fully bedded — without getting paste on the face of drop 1.",
    tips: ["A small roller pass along the seam line is enough."],
    durationS: 5, realWorldMinutes: 3, forceN: 15, ppe: GLOVES,
    successCriteria: ["Band covers the seam line", "No paste on the face of drop 1"],
  },
  {
    id: "hang-drop-2", phase: "Hang", primitive: "hangDrop", tool: "hands", secondaryTool: "dropCorner", hand: "both", region: dropRect(1), dropIndex: 1,
    product: "Drop 2 (dry)",
    title: "Hang drop 2 and match the pattern",
    instruction: "Offer drop 2 to the wall, slide it up or down until the pattern lines up with drop 1 at eye level, then slide it sideways to a tight butt joint — no overlap, no gap.",
    tips: ["Match at eye level first; small errors are least visible near ceiling and floor."],
    durationS: 7, realWorldMinutes: 3, forceN: 4, ppe: [],
    successCriteria: ["Pattern matched across the seam", "Butt joint: no gap, no overlap"],
  },
  {
    id: "smooth-drop-2", phase: "Hang", primitive: "smooth", tool: "smoother", hand: "right", region: dropRect(1), dropIndex: 1,
    title: "Smooth drop 2 from the centre outwards",
    instruction: "Smooth as for drop 1, finishing each stroke toward the seam gently so the joint does not open.",
    tips: [],
    durationS: 6, realWorldMinutes: 3, forceN: 20, ppe: [],
    successCriteria: ["No bubbles", "Seam still closed"],
  },
  {
    id: "seam-roll-1", phase: "Hang", primitive: "seamRoll", tool: "seamRoller", hand: "right", region: { x0: dropRect(1).x0 - 0.12, x1: dropRect(1).x0 + 0.12, y0: 0.1, y1: 2.55 }, dropIndex: 1,
    title: "Roll the seam (only if the label allows)",
    instruction: "If the roll label permits it, run the seam roller once down and up the joint with light pressure. On embossed or delicate papers, press with a damp sponge instead.",
    tips: ["Heavy rolling squeezes out paste and polishes the seam."],
    durationS: 4, realWorldMinutes: 1, forceN: 10, ppe: [],
    successCriteria: ["Seam edges flat and bonded", "No shine on the seam"],
  },
  {
    id: "trim-drop-2", phase: "Hang", primitive: "trim", tool: "utilityKnife", secondaryTool: "straightedge", hand: "both", region: dropRect(1), dropIndex: 1,
    title: "Trim drop 2 and wipe the edges",
    instruction: "Trim ceiling and baseboard excess with a fresh blade, then wipe paste from the seam, ceiling and baseboard with a clean damp sponge.",
    tips: [],
    durationS: 5, realWorldMinutes: 3, forceN: 8, ppe: [],
    successCriteria: ["Clean cuts", "No paste residue"],
  },
  // drop 3 over the outlet -----------------------------------------------------
  {
    id: "glue-band-3", phase: "Glue", primitive: "pasteBand", tool: "pasteRoller", hand: "right", region: band(2), dropIndex: 2,
    product: "Paste-the-wall adhesive",
    title: "Paste the wall for drop 3 (keep paste out of the outlet box)",
    instruction: "Roll paste for drop 3. Around the outlet use the brush only, and keep paste out of the open electrical box.",
    tips: [],
    durationS: 5, realWorldMinutes: 3, forceN: 15, ppe: GLOVES,
    successCriteria: ["Band covered", "Outlet box clean and dry"],
    safety: "Breaker must still be OFF.",
  },
  {
    id: "hang-drop-3", phase: "Hang", primitive: "hangDrop", tool: "hands", secondaryTool: "dropCorner", hand: "both", region: dropRect(2), dropIndex: 2,
    product: "Drop 3 (dry)",
    title: "Hang drop 3 straight over the outlet",
    instruction: "Hang drop 3, match the pattern and butt the seam, letting the paper lie loosely over the outlet box. Smooth lightly down to just above the box.",
    tips: [],
    durationS: 6, realWorldMinutes: 3, forceN: 4, ppe: [],
    successCriteria: ["Pattern matched", "Seam closed", "Paper loose over the box"],
  },
  {
    id: "relief-cut", phase: "Hang", primitive: "reliefCut", tool: "utilityKnife", hand: "right", region: OUTLET_REGION, dropIndex: 2,
    title: "Relief-cut the outlet opening",
    instruction: "Feel the box edges through the paper. Cut an X from corner to corner across the opening, then trim the four flaps along the box edge so the faceplate will cover the cut.",
    tips: ["Cut slightly inside the box edge — the plate hides it."],
    durationS: 6, realWorldMinutes: 3, forceN: 6, ppe: [],
    successCriteria: ["Opening matches the box", "Cut edge will be covered by the plate"],
    safety: "Breaker OFF. Keep the blade out of the box and away from the terminals.",
  },
  {
    id: "smooth-drop-3", phase: "Hang", primitive: "smooth", tool: "smoother", hand: "right", region: dropRect(2), dropIndex: 2,
    title: "Smooth drop 3 around the outlet",
    instruction: "Smooth the drop fully, working the paper flat around the opening.",
    tips: [],
    durationS: 6, realWorldMinutes: 3, forceN: 20, ppe: [],
    successCriteria: ["Flat around the opening", "No bubbles"],
  },
  {
    id: "trim-drop-3", phase: "Hang", primitive: "trim", tool: "utilityKnife", secondaryTool: "straightedge", hand: "both", region: dropRect(2), dropIndex: 2,
    title: "Trim drop 3 and wipe the edges",
    instruction: "Trim ceiling and baseboard excess and wipe paste from all edges.",
    tips: [],
    durationS: 5, realWorldMinutes: 3, forceN: 8, ppe: [],
    successCriteria: ["Clean cuts", "No paste residue"],
  },
  {
    id: "hang-drops-4-8", phase: "Hang", primitive: "hangBatch", tool: "smoother", hand: "right", region: { x0: dropRect(3).x0, x1: WALL.x1, y0: 0.1, y1: 2.55 },
    product: "Drops 4–8 + paste",
    title: "Repeat for drops 4 to 8 (paste → hang → match → smooth → trim → wipe)",
    instruction: "Repeat the same cycle for each remaining drop. Drop 8 meets the right corner: trim it to the corner with 2 mm wrap.",
    tips: ["Check the plumb every third drop.", "Paste only one drop's width of wall at a time."],
    durationS: 10, realWorldMinutes: 40, forceN: 20, ppe: GLOVES,
    successCriteria: ["All 8 drops hung", "All seams matched and closed", "Corner trimmed cleanly"],
  },
  // FINISH --------------------------------------------------------------------
  {
    id: "finish-inspect", phase: "Finish", primitive: "inspect", tool: "flashlight", hand: "right", region: FULL,
    title: "Inspect the wall in raking light",
    instruction: "Hold the flashlight flat to the wall and sweep across it. Bubbles, open seams and paste shine show up as shadows or highlights. Fix while the paste is still workable.",
    tips: ["Small bubbles often disappear as the paper dries — don't puncture them unless the label allows it."],
    durationS: 6, realWorldMinutes: 5, ppe: [],
    successCriteria: ["No open seams", "No paste shine", "No large bubbles"],
  },
  {
    id: "finish-restore", phase: "Finish", primitive: "screw", tool: "screwdriver", secondaryTool: "plate", hand: "both", region: OUTLET_REGION,
    title: "Refit the faceplate and restore power (after drying)",
    instruction: "When the paper is dry (per label), refit the faceplate over the trimmed opening and screw it on. Remove the breaker label and switch power back on, then test the outlet.",
    tips: ["Keep one labelled offcut and the roll label for future repairs."],
    durationS: 5, realWorldMinutes: 5, ppe: [],
    successCriteria: ["Plate covers the cut edge", "Outlet works after power is restored", "Offcut + label stored"],
    safety: "Only switch on once the plate is fitted and hands and tools are clear.",
  },
];

export const TASK_TOTAL_SECONDS = WALLPAPER_TASK.reduce((sum, step) => sum + step.durationS, 0);
export const TASK_REAL_WORLD_MINUTES = WALLPAPER_TASK.reduce((sum, step) => sum + step.realWorldMinutes, 0);

export function stepStartSeconds(index: number): number {
  let total = 0;
  for (let i = 0; i < index; i += 1) total += WALLPAPER_TASK[i].durationS;
  return total;
}

export function stepAtTime(seconds: number): { index: number; progress: number } {
  let cursor = 0;
  for (let i = 0; i < WALLPAPER_TASK.length; i += 1) {
    const d = WALLPAPER_TASK[i].durationS;
    if (seconds < cursor + d || i === WALLPAPER_TASK.length - 1) {
      return { index: i, progress: Math.max(0, Math.min(1, (seconds - cursor) / d)) };
    }
    cursor += d;
  }
  return { index: WALLPAPER_TASK.length - 1, progress: 1 };
}

// ---------------------------------------------------------------------------
// Motion: tool-tip paths per primitive (shared by 3D scene + machine export)
// ---------------------------------------------------------------------------

export interface PathPoint {
  p: Vec3;
  contact: boolean;
}

export interface StepMotion {
  primary: PathPoint[];
  secondary?: PathPoint[];
  timed?: boolean;
}

const pt = (x: number, y: number, z: number, contact = true): PathPoint => ({ p: [x, y, z], contact });
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function restPoint(step: TaskStep): Vec3 {
  const cx = (step.region.x0 + step.region.x1) / 2;
  return [Math.max(-1.7, Math.min(1.7, cx)) + 0.15, 1.1, 0.8];
}

function withApproach(points: PathPoint[], rest: Vec3, lift = 0.12): PathPoint[] {
  if (points.length === 0) return [{ p: rest, contact: false }];
  const first = points[0].p;
  const last = points[points.length - 1].p;
  return [
    { p: rest, contact: false },
    pt(first[0], first[1], first[2] + lift, false),
    ...points,
    pt(last[0], last[1], last[2] + lift, false),
    { p: rest, contact: false },
  ];
}

function densify(a: Vec3, b: Vec3, n: number, contact = true): PathPoint[] {
  const out: PathPoint[] = [];
  for (let i = 0; i <= n; i += 1) out.push({ p: lerp3(a, b, i / n), contact });
  return out;
}

function serpentine(r: WallRegion, rows: number, z: number, contact = true): PathPoint[] {
  const out: PathPoint[] = [];
  for (let i = 0; i < rows; i += 1) {
    const y = rows === 1 ? (r.y0 + r.y1) / 2 : r.y1 - (i / (rows - 1)) * (r.y1 - r.y0);
    const a = i % 2 === 0 ? r.x0 : r.x1;
    const b = i % 2 === 0 ? r.x1 : r.x0;
    out.push(pt(a, y, z, contact), pt(b, y, z, contact));
  }
  return out;
}

function circularize(points: PathPoint[], radius: number, stepLen: number): PathPoint[] {
  const out: PathPoint[] = [];
  let k = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i].p;
    const b = points[i + 1].p;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / stepLen));
    for (let j = 0; j < n; j += 1) {
      const base = lerp3(a, b, j / n);
      out.push(pt(base[0] + Math.cos(k * 1.1) * radius, base[1] + Math.sin(k * 1.1) * radius, base[2]));
      k += 1;
    }
  }
  return out;
}

function columns(r: WallRegion, spacing: number, z: number): PathPoint[] {
  const out: PathPoint[] = [];
  let up = true;
  for (let x = r.x0 + spacing / 2; x <= r.x1 - spacing / 2 + 1e-6; x += spacing) {
    if (up) out.push(pt(x, r.y0 + 0.05, z), pt(x, r.y1 - 0.05, z));
    else out.push(pt(x, r.y1 - 0.05, z), pt(x, r.y0 + 0.05, z));
    up = !up;
  }
  return out;
}

/** Pose of a hanging drop (top-centre pivot) at hang progress h ∈ [0,1]. */
export function dropHangPose(i: number, h: number): { pos: Vec3; rotY: number; visibleFrac: number } {
  const r = dropRect(i);
  const cx = (r.x0 + r.x1) / 2;
  const nudge = i > 0 ? 0.05 : -0.04;
  const start: Vec3 = [1.3, 1.35, 1.45];
  const above: Vec3 = [cx + nudge, WALL.height, 0.28];
  const onWall: Vec3 = [cx + nudge, WALL.height + (i > 0 ? 0.05 : 0), 0.006];
  const final: Vec3 = [cx, WALL.height, 0.006];
  if (h < 0.35) {
    const k = ease(h / 0.35);
    return { pos: lerp3(start, above, k), rotY: -0.8 * (1 - k), visibleFrac: 0.28 };
  }
  if (h < 0.5) {
    const k = ease((h - 0.35) / 0.15);
    return { pos: lerp3(above, onWall, k), rotY: 0, visibleFrac: 0.28 };
  }
  if (h < 0.7) {
    const k = ease((h - 0.5) / 0.2);
    return { pos: lerp3(onWall, final, k), rotY: 0, visibleFrac: 0.28 + 0.07 * k };
  }
  const k = ease((h - 0.7) / 0.3);
  return { pos: final, rotY: 0, visibleFrac: 0.35 + 0.65 * k };
}

function hangCorners(i: number, h: number): { right: Vec3; left: Vec3 } {
  const pose = dropHangPose(i, h);
  const half = DROP_WIDTH / 2 - 0.03;
  const slide = Math.max(0, (pose.visibleFrac - 0.35) / 0.65) * 1.1;
  const y = pose.pos[1] - 0.06 - slide;
  const cos = Math.cos(pose.rotY);
  const sin = Math.sin(pose.rotY);
  return {
    right: [pose.pos[0] + half * cos, y, pose.pos[2] - half * sin + 0.004],
    left: [pose.pos[0] - half * cos, y, pose.pos[2] + half * sin + 0.004],
  };
}

export function stepMotion(step: TaskStep): StepMotion {
  const r = step.region;
  const rest = restPoint(step);
  const ox = OUTLET.x;
  const oy = OUTLET.y;

  switch (step.primitive) {
    case "probe":
      return {
        primary: withApproach(
          [pt(ox - 0.012, oy + 0.025, 0.004), pt(ox - 0.012, oy + 0.02, 0.004), pt(ox + 0.012, oy - 0.02, 0.004), pt(ox + 0.012, oy - 0.025, 0.004)],
          rest,
        ),
      };
    case "unscrew":
    case "screw": {
      const top: Vec3 = [ox, oy + 0.045, 0.012];
      const bot: Vec3 = [ox, oy - 0.045, 0.012];
      const prim: PathPoint[] = [
        { p: rest, contact: false },
        pt(top[0], top[1], 0.12, false),
        pt(...top), pt(...top), pt(...top),
        pt(top[0], top[1], 0.1, false),
        pt(bot[0], bot[1], 0.1, false),
        pt(...bot), pt(...bot), pt(...bot),
        pt(bot[0], bot[1], 0.12, false),
        { p: rest, contact: false },
      ];
      const hold: Vec3 = [ox, oy, 0.02];
      const sec: PathPoint[] = [
        pt(ox - 0.35, 1.0, 0.55, false),
        pt(...hold), pt(...hold), pt(...hold), pt(...hold), pt(...hold), pt(...hold), pt(...hold), pt(...hold),
        pt(ox, oy, 0.25, false),
        pt(...PLATE_ON_TABLE, false),
        pt(...PLATE_ON_TABLE, false),
      ];
      return step.primitive === "unscrew"
        ? { primary: prim, secondary: sec, timed: true }
        : { primary: prim, secondary: [...sec].reverse(), timed: true };
    }
    case "lay":
      return {
        primary: [pt(1.3, TABLE.y + 0.1, TABLE.z0 + 0.1, false), pt(1.9, 0.12, 0.45, false), pt(1.9, 0.04, 0.45), pt(-1.95, 0.04, 0.45), pt(-1.95, 0.04, 0.45)],
        secondary: [pt(1.1, TABLE.y + 0.1, TABLE.z0 + 0.15, false), pt(1.9, 0.12, 1.2, false), pt(1.9, 0.04, 1.2), pt(-1.95, 0.04, 1.2), pt(-1.95, 0.04, 1.2)],
        timed: true,
      };
    case "spray":
      return { primary: withApproach(serpentine(r, step.passes ?? 4, 0.35, false), rest, 0) };
    case "scrub":
      return { primary: withApproach(circularize(serpentine(r, step.passes ?? 5, 0.02), 0.05, 0.035), rest) };
    case "wipe":
      return { primary: withApproach(serpentine(r, step.passes ?? 6, 0.01), rest) };
    case "dust":
      return { primary: withApproach(serpentine(r, step.passes ?? 4, 0.015), rest) };
    case "probeGrid": {
      const spots: [number, number][] = [
        [r.x0 + 0.25, r.y1 - 0.25], [r.x1 - 0.25, r.y1 - 0.25], [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2], [r.x0 + 0.25, r.y0 + 0.25], [r.x1 - 0.25, r.y0 + 0.25],
      ];
      const out: PathPoint[] = [{ p: rest, contact: false }];
      spots.forEach(([x, y]) => out.push(pt(x, y, 0.08, false), pt(x, y, 0.004), pt(x, y, 0.004), pt(x, y, 0.004), pt(x, y, 0.08, false)));
      out.push({ p: rest, contact: false });
      return { primary: out, timed: true };
    }
    case "fill": {
      const out: PathPoint[] = [];
      HOLES.forEach(([x, y]) => out.push(pt(x - 0.05, y + 0.01, 0.04, false), pt(x - 0.05, y + 0.01, 0.004), pt(x + 0.05, y, 0.004), pt(x - 0.04, y - 0.012, 0.004), pt(x - 0.04, y - 0.012, 0.04, false)));
      return { primary: withApproach(out, rest) };
    }
    case "sand": {
      const out: PathPoint[] = [];
      HOLES.forEach(([x, y]) => {
        out.push(pt(x, y + 0.035, 0.04, false));
        for (let k = 0; k <= 16; k += 1) {
          const a = (k / 16) * Math.PI * 4;
          out.push(pt(x + Math.sin(a) * 0.035, y + Math.cos(a) * 0.035, 0.004));
        }
        out.push(pt(x, y + 0.035, 0.04, false));
      });
      return { primary: withApproach(out, rest) };
    }
    case "cutIn": {
      const i = 0.04;
      return {
        primary: withApproach(
          [
            ...densify([r.x0 + i, r.y1 - i, 0.006], [r.x1 - i, r.y1 - i, 0.006], 8),
            ...densify([r.x1 - i, r.y1 - i, 0.006], [r.x1 - i, r.y0 + i, 0.006], 5),
            ...densify([r.x1 - i, r.y0 + i, 0.006], [r.x0 + i, r.y0 + i, 0.006], 8),
            ...densify([r.x0 + i, r.y0 + i, 0.006], [r.x0 + i, r.y1 - i, 0.006], 5),
          ],
          rest,
        ),
      };
    }
    case "roll":
      return { primary: withApproach(columns(r, 0.24, 0.003), rest) };
    case "pasteBand":
      return { primary: withApproach(columns(r, 0.2, 0.003), rest) };
    case "wait":
      return { primary: [{ p: rest, contact: false }] };
    case "measure": {
      const out: PathPoint[] = [];
      [-1.5, 0, 1.5].forEach((x) => out.push(pt(x, 0.12, 0.05, false), pt(x, 0.12, 0.012), pt(x, WALL.height - 0.01, 0.012), pt(x, WALL.height - 0.01, 0.05, false)));
      return { primary: withApproach(out, rest) };
    }
    case "markLine":
      return { primary: withApproach(densify([PLUMB_X, WALL.height - 0.03, 0.004], [PLUMB_X, WALL.baseboard + 0.02, 0.004], 10), rest) };
    case "cutOnTable": {
      const y = TABLE.y + 0.012;
      const out: PathPoint[] = [];
      [1.72, 1.74, 1.76].forEach((x) => out.push(pt(x, y + 0.05, TABLE.z0 + 0.06, false), pt(x, y, TABLE.z0 + 0.06), pt(x, y, TABLE.z1 - 0.06), pt(x, y + 0.05, TABLE.z1 - 0.06, false)));
      return { primary: withApproach(out, [1.5, 1.15, TABLE.z0 - 0.25], 0), secondary: [pt(1.68, TABLE.y + 0.012, (TABLE.z0 + TABLE.z1) / 2)] };
    }
    case "stir": {
      const out: PathPoint[] = [];
      const [bx, , bz] = PASTE_BUCKET;
      for (let k = 0; k <= 48; k += 1) {
        const a = (k / 48) * Math.PI * 8;
        out.push(pt(bx + Math.cos(a) * 0.07, 0.24, bz + Math.sin(a) * 0.07));
      }
      return { primary: withApproach(out, [bx - 0.2, 1.0, bz + 0.5], 0.3) };
    }
    case "pasteEdge":
      return {
        primary: withApproach(
          [...densify([r.x0, WALL.height - 0.03, 0.005], [r.x1, WALL.height - 0.03, 0.005], 6), pt(r.x1, WALL.height - 0.03, 0.1, false), pt(r.x0, WALL.baseboard + 0.03, 0.1, false), ...densify([r.x0, WALL.baseboard + 0.03, 0.005], [r.x1, WALL.baseboard + 0.03, 0.005], 6)],
          rest,
        ),
        timed: true,
      };
    case "hangDrop": {
      const i = step.dropIndex ?? 0;
      const prim: PathPoint[] = [];
      const sec: PathPoint[] = [];
      for (let k = 0; k <= 40; k += 1) {
        const h = k / 40;
        const c = hangCorners(i, h);
        const onWall = h >= 0.5;
        prim.push({ p: c.right, contact: onWall });
        sec.push({ p: c.left, contact: onWall });
      }
      return { primary: prim, secondary: sec, timed: true };
    }
    case "smooth": {
      const cx = (r.x0 + r.x1) / 2;
      const out: PathPoint[] = [];
      for (let y = WALL.height - 0.12; y > WALL.baseboard + 0.15; y -= 0.22) {
        out.push(pt(cx, y, 0.004), pt(r.x1 - 0.03, y - 0.06, 0.004), pt(cx, y - 0.08, 0.025, false), pt(cx, y - 0.08, 0.004), pt(r.x0 + 0.03, y - 0.14, 0.004), pt(cx, y - 0.2, 0.025, false));
      }
      return { primary: withApproach(out, rest) };
    }
    case "trim": {
      const topY = WALL.height - 0.003;
      const botY = WALL.baseboard + 0.003;
      const prim: PathPoint[] = [
        { p: rest, contact: false },
        pt(r.x0 + 0.01, topY, 0.08, false),
        ...densify([r.x0 + 0.01, topY, 0.004], [r.x1 - 0.01, topY, 0.004], 8),
        pt(r.x1 - 0.01, topY, 0.1, false),
        pt(r.x0 + 0.01, botY, 0.1, false),
        ...densify([r.x0 + 0.01, botY, 0.004], [r.x1 - 0.01, botY, 0.004], 8),
        pt(r.x1 - 0.01, botY, 0.08, false),
        { p: rest, contact: false },
      ];
      const cx = (r.x0 + r.x1) / 2;
      const topSE: Vec3 = [cx, topY - 0.035, 0.008];
      const botSE: Vec3 = [cx, botY + 0.035, 0.008];
      const sec: PathPoint[] = [
        pt(cx - 0.3, 1.4, 0.5, false),
        ...Array.from({ length: 10 }, () => pt(...topSE)),
        pt(cx, 1.3, 0.12, false),
        ...Array.from({ length: 10 }, () => pt(...botSE)),
        pt(cx - 0.3, 1.0, 0.5, false),
      ];
      return { primary: prim, secondary: sec, timed: true };
    }
    case "wipeSeam":
      return {
        primary: withApproach(
          [
            pt(r.x1, WALL.height - 0.05, 0.02), pt(r.x1, WALL.baseboard + 0.05, 0.02), pt(r.x1, WALL.baseboard + 0.05, 0.08, false),
            pt(r.x0, WALL.height - 0.05, 0.08, false), pt(r.x0, WALL.height - 0.05, 0.02), pt(r.x0, WALL.baseboard + 0.05, 0.02), pt(r.x0, WALL.baseboard + 0.05, 0.08, false),
            pt(r.x0, WALL.height - 0.03, 0.08, false), pt(r.x0, WALL.height - 0.03, 0.02), pt(r.x1, WALL.height - 0.03, 0.02), pt(r.x1, WALL.height - 0.03, 0.08, false),
            pt(r.x0, WALL.baseboard + 0.02, 0.08, false), pt(r.x0, WALL.baseboard + 0.02, 0.02), pt(r.x1, WALL.baseboard + 0.02, 0.02),
          ],
          rest,
        ),
      };
    case "seamRoll": {
      const sx = dropRect(step.dropIndex ?? 1).x0;
      return { primary: withApproach([pt(sx, WALL.height - 0.08, 0.002), pt(sx, WALL.baseboard + 0.08, 0.002), pt(sx, WALL.height - 0.08, 0.002)], rest) };
    }
    case "reliefCut": {
      const hw = OUTLET.w / 2;
      const hh = OUTLET.h / 2;
      return {
        primary: withApproach(
          [
            ...densify([ox - hw, oy + hh, 0.007], [ox + hw, oy - hh, 0.007], 5),
            pt(ox + hw, oy - hh, 0.04, false), pt(ox + hw, oy + hh, 0.04, false),
            ...densify([ox + hw, oy + hh, 0.007], [ox - hw, oy - hh, 0.007], 5),
            pt(ox - hw, oy - hh, 0.04, false), pt(ox - hw, oy + hh, 0.04, false),
            ...densify([ox - hw, oy + hh, 0.007], [ox + hw, oy + hh, 0.007], 3),
            ...densify([ox + hw, oy + hh, 0.007], [ox + hw, oy - hh, 0.007], 3),
            ...densify([ox + hw, oy - hh, 0.007], [ox - hw, oy - hh, 0.007], 3),
            ...densify([ox - hw, oy - hh, 0.007], [ox - hw, oy + hh, 0.007], 3),
          ],
          rest,
        ),
        timed: true,
      };
    }
    case "hangBatch": {
      const out: PathPoint[] = [{ p: rest, contact: false }];
      for (let i = 3; i < DROP_COUNT; i += 1) {
        const d = dropRect(i);
        const cx = (d.x0 + d.x1) / 2;
        out.push(pt(cx, WALL.height - 0.1, 0.1, false));
        out.push(...densify([cx, WALL.height - 0.1, 0.004], [cx, WALL.baseboard + 0.15, 0.004], 5));
        out.push(pt(cx, WALL.baseboard + 0.15, 0.1, false));
      }
      out.push({ p: rest, contact: false });
      return { primary: out, timed: true };
    }
    case "inspect":
      return {
        primary: [
          { p: rest, contact: false },
          pt(r.x0 + 0.05, 2.0, 0.14, false), pt(r.x1 - 0.05, 2.0, 0.14, false), pt(r.x1 - 0.05, 0.9, 0.14, false), pt(r.x0 + 0.05, 0.9, 0.14, false),
          { p: rest, contact: false },
        ],
      };
    default:
      return { primary: [{ p: rest, contact: false }] };
  }
}

export function samplePath(points: PathPoint[], t: number, timed = false): { p: Vec3; contact: boolean } {
  if (points.length === 0) return { p: [0, 1.2, 0.8], contact: false };
  if (points.length === 1) return { p: [...points[0].p] as Vec3, contact: points[0].contact };
  const u = clamp01(t);
  if (timed) {
    const f = u * (points.length - 1);
    const i = Math.min(points.length - 2, Math.floor(f));
    const k = f - i;
    return { p: lerp3(points[i].p, points[i + 1].p, k), contact: points[i].contact && points[i + 1].contact };
  }
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i].p;
    const b = points[i + 1].p;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    lens.push(l);
    total += l;
  }
  if (total < 1e-6) return { p: [...points[0].p] as Vec3, contact: points[0].contact };
  let target = u * total;
  for (let i = 0; i < lens.length; i += 1) {
    if (target <= lens[i] || i === lens.length - 1) {
      const k = lens[i] > 0 ? Math.min(1, target / lens[i]) : 1;
      return { p: lerp3(points[i].p, points[i + 1].p, k), contact: points[i].contact && points[i + 1].contact };
    }
    target -= lens[i];
  }
  return { p: [...points[points.length - 1].p] as Vec3, contact: points[points.length - 1].contact };
}

export function sampleStep(step: TaskStep, t: number): { primary: { p: Vec3; contact: boolean }; secondary?: { p: Vec3; contact: boolean } } {
  const m = stepMotion(step);
  return {
    primary: samplePath(m.primary, t, m.timed),
    secondary: m.secondary ? samplePath(m.secondary, t, m.timed) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Exports: human checklist + machine task
// ---------------------------------------------------------------------------

const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function buildMachineTask(samplesPerStep = 24) {
  return {
    schema: "plumb.task/v1",
    task: "wallcovering.paste-the-wall.full-wall",
    units: { length: "m", force: "N", time: "s" },
    frame: {
      origin: "wall face, floor level, wall centre",
      x: "right along the wall",
      y: "up",
      z: "out of the wall into the room (wall face is z = 0)",
      reported: "tool-tip position",
    },
    workspace: {
      wall: { ...WALL },
      dropWidthM: DROP_WIDTH,
      dropCount: DROP_COUNT,
      dropCutLengthM: DROP_CUT_LENGTH_M,
      plumbLineX: r3(PLUMB_X),
      outlet: { ...OUTLET },
      holes: HOLES,
      table: { ...TABLE },
    },
    materials: MATERIALS,
    tools: TOOLS,
    notice: "Forces and times are nominal planning values. Manufacturer labels for primer, adhesive and wallcovering take priority.",
    steps: WALLPAPER_TASK.map((step, seq) => {
      const m = stepMotion(step);
      const sample = (path: PathPoint[]) =>
        Array.from({ length: samplesPerStep }, (_, k) => {
          const t = k / (samplesPerStep - 1);
          const s = samplePath(path, t, m.timed);
          return { t: r3(t), sec: r3(t * step.durationS), x: r3(s.p[0]), y: r3(s.p[1]), z: r3(s.p[2]), contact: s.contact };
        });
      return {
        seq: seq + 1,
        id: step.id,
        phase: step.phase,
        title: step.title,
        primitive: step.primitive,
        tool: step.tool,
        secondaryTool: step.secondaryTool ?? null,
        product: step.product ?? null,
        hand: step.hand,
        ppe: step.ppe,
        nominalForceN: step.forceN ?? 0,
        playbackS: step.durationS,
        realWorldMinutes: step.realWorldMinutes,
        region: step.region,
        preconditions: seq === 0 ? [] : [WALLPAPER_TASK[seq - 1].id],
        successCriteria: step.successCriteria,
        safety: step.safety ?? null,
        waypoints: sample(m.primary),
        secondaryWaypoints: m.secondary ? sample(m.secondary) : null,
      };
    }),
  };
}

export function buildHumanChecklist(): string {
  const lines: string[] = [
    "# Paste-the-wall wallpaper — full step-by-step task",
    "",
    `Sample wall: 4.16 m × 2.55 m · 8 drops × 320 cm · 3 rolls · ${WALLPAPER_TASK.length} steps · ≈${Math.round(TASK_REAL_WORLD_MINUTES / 60)} h incl. drying`,
    "",
    "## Materials",
    ...MATERIALS.map((m) => `- **${m.item}** — ${m.quantity}. ${m.note}`),
    "",
  ];
  let phase: TaskPhase | null = null;
  WALLPAPER_TASK.forEach((step, i) => {
    if (step.phase !== phase) {
      phase = step.phase;
      lines.push(`## ${phase}`, "");
    }
    const tool = TOOLS[step.tool].name + (step.secondaryTool ? ` + ${TOOLS[step.secondaryTool].name}` : "");
    lines.push(`### ${i + 1}. ${step.title}`);
    lines.push(`- Tool: ${tool}${step.product ? ` · Product: ${step.product}` : ""}${step.ppe.length ? ` · PPE: ${step.ppe.join(", ")}` : ""}`);
    lines.push(`- ${step.instruction}`);
    step.tips.forEach((tip) => lines.push(`- Tip: ${tip}`));
    if (step.safety) lines.push(`- ⚠ ${step.safety}`);
    step.successCriteria.forEach((c) => lines.push(`- [ ] ${c}`));
    lines.push("");
  });
  return lines.join("\n");
}
