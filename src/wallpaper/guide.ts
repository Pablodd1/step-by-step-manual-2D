export type GuidanceLevel = "manufacturer-general" | "adhesive-manufacturer" | "reconstructed-demo";
export type Operation =
  | "verify"
  | "safety"
  | "prepare"
  | "layout"
  | "plumb"
  | "measure"
  | "paste"
  | "hang"
  | "smooth"
  | "trim"
  | "match"
  | "outlet"
  | "clean"
  | "inspect";

export interface EvidenceSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  level: GuidanceLevel;
  note: string;
}

export interface WallpaperStep {
  id: string;
  phase: "Prepare" | "Set out" | "Install" | "Finish";
  title: string;
  shortTitle: string;
  instruction: string;
  reason: string;
  tools: string[];
  materials: string[];
  check: string;
  warning?: string;
  operation: Operation;
  seconds: number;
  evidence: string[];
  requiresGate?: "electrical";
}

export interface WallpaperGuide {
  id: string;
  title: string;
  method: "paste-the-wall";
  approval: "general-guidance-not-product-approved";
  productStatus: string;
  geometryStatus: string;
  sources: EvidenceSource[];
  steps: WallpaperStep[];
}

export const wallpaperSources: EvidenceSource[] = [
  {
    id: "gb-hang",
    title: "How to Hang Wallpaper",
    publisher: "Graham & Brown",
    url: "https://www.grahambrown.com/us/how-to/hang-wallpaper/",
    level: "manufacturer-general",
    note: "General paste-the-wall guidance from a wallpaper manufacturer. It is not approval for an unspecified product."
  },
  {
    id: "roman-ptw",
    title: "Can I Use the Paste-the-Wall Technique to Hang Wallpaper?",
    publisher: "ROMAN Decorating Products",
    url: "https://romandecoratingproducts.com/blogs/knowledge/paste-the-wall-technique-to-hang-wallpaper",
    level: "adhesive-manufacturer",
    note: "Preparation, adhesive application, smoothing and trimming guidance from an adhesive manufacturer."
  },
  {
    id: "roman-pro838",
    title: "PRO-838 Heavy Duty Clear Adhesive, product information",
    publisher: "ROMAN Decorating Products",
    url: "https://images.thdstatic.com/catalog/pdfImages/88/88936571-5292-4372-b150-378b0708cde6.pdf",
    level: "adhesive-manufacturer",
    note: "Used only for the principle of removing excess adhesive before it dries. Adhesive selection still follows the wallcovering label."
  },
  {
    id: "demo-geometry",
    title: "PLUMB reconstructed training wall",
    publisher: "PLUMB",
    url: "",
    level: "reconstructed-demo",
    note: "The room, outlet, tools, paper pattern and motion are reconstructed teaching graphics, not manufacturer drawings."
  }
];

export const pasteTheWallGuide: WallpaperGuide = {
  id: "paste-the-wall-field-guide-v3",
  title: "Paste-the-wall wallpaper",
  method: "paste-the-wall",
  approval: "general-guidance-not-product-approved",
  productStatus: "General teaching sequence. Confirm the wallcovering roll label and adhesive datasheet before site work.",
  geometryStatus: "Reconstructed 53 cm example drop and training wall. Dimensions and pattern are illustrative, not a product specification.",
  sources: wallpaperSources,
  steps: [
    {
      id: "verify-method",
      phase: "Prepare",
      title: "Verify the product and installation method",
      shortTitle: "Verify product",
      instruction: "Read the roll label before opening the adhesive. Confirm that the wallcovering is specifically marked paste-the-wall, then check batch numbers, roll width, pattern repeat, match type and the specified adhesive.",
      reason: "Paste-the-paper, pre-pasted, peel-and-stick and rigid panels need different choreography. Do not infer the method from appearance.",
      tools: ["Camera or phone for label records"],
      materials: ["Wallcovering rolls", "Roll labels", "Adhesive datasheet"],
      check: "Method, batch, width, repeat, match and adhesive are recorded; damaged or mismatched rolls are isolated.",
      operation: "verify",
      seconds: 7,
      evidence: ["roman-ptw", "demo-geometry"]
    },
    {
      id: "isolate-electrical",
      phase: "Prepare",
      title: "Make the outlet work area safe",
      shortTitle: "Electrical safety",
      instruction: "This training wall contains an outlet. Before wet adhesive or cutting near it, switch off the relevant power supply and confirm the outlet area is safe. Use a qualified electrician if isolation cannot be verified.",
      reason: "Water-based adhesive and metal cutting tools introduce electrical risk. A visual switch position alone is not verification.",
      tools: ["Approved isolation and verification equipment"],
      materials: ["Outlet cover protection as appropriate"],
      check: "The required electrical gate is acknowledged before any later training step can run.",
      warning: "Do not work on a live outlet. Do not treat this animation as electrical instruction.",
      operation: "safety",
      seconds: 6,
      evidence: ["gb-hang", "demo-geometry"]
    },
    {
      id: "prepare-wall",
      phase: "Prepare",
      title: "Repair, clean, dry and prepare the wall",
      shortTitle: "Prepare wall",
      instruction: "Remove old wallcovering and loose material. Fill cracks and holes, sand repairs smooth, clean contamination and allow the wall to dry. Prime or size when the wallcovering and adhesive instructions require it, following their drying requirements.",
      reason: "A sound, smooth, clean and correctly prepared substrate supports adhesion and reduces visible defects.",
      tools: ["Filling knife", "Sandpaper", "Clean sponge", "Roller or brush for required primer"],
      materials: ["Suitable filler", "Specified primer or sizing when required"],
      check: "The surface is sound, smooth, clean and dry; repairs are flush; required primer or sizing is dry.",
      operation: "prepare",
      seconds: 8,
      evidence: ["gb-hang", "roman-ptw"],
      requiresGate: "electrical"
    },
    {
      id: "plan-layout",
      phase: "Set out",
      title: "Plan the starting point and pattern",
      shortTitle: "Plan layout",
      instruction: "Inspect the whole wall and choose the starting point. Account for corners, the strongest natural light, focal features and the pattern match. Dry-lay or visualize the first two drops before applying paste.",
      reason: "The first drop controls subsequent alignment; layout decisions also determine where narrow trims and seams will land.",
      tools: ["Tape measure", "Pencil", "Straight edge"],
      materials: ["Two rolls for pattern review"],
      check: "Start point, hanging direction, focal alignment and corner treatment are decided before paste is mixed or applied.",
      operation: "layout",
      seconds: 7,
      evidence: ["gb-hang"],
      requiresGate: "electrical"
    },
    {
      id: "mark-plumb",
      phase: "Set out",
      title: "Mark a true vertical for the first drop",
      shortTitle: "Mark plumb line",
      instruction: "Set out the first edge from the corner using the actual roll width and the planned corner allowance. Draw a plumb line with a level or plumb bob. For the manufacturer example of a 52/53 cm roll, the cited guide marks 50 cm from the left corner.",
      reason: "A corner is not reliably vertical. A true first edge prevents accumulating misalignment across the wall.",
      tools: ["Tape measure", "Pencil", "Spirit level or plumb bob"],
      materials: ["Actual roll width from the label"],
      check: "The line is continuous, visible and vertical; the first drop will still turn into the corner as planned.",
      operation: "plumb",
      seconds: 8,
      evidence: ["gb-hang", "demo-geometry"],
      requiresGate: "electrical"
    },
    {
      id: "measure-allowance",
      phase: "Set out",
      title: "Measure the drop and plan trimming allowance",
      shortTitle: "Measure drop",
      instruction: "Measure the wall height at the drop position and plan extra material for final trimming. The cited paste-the-wall guide allows approximately 2–3 cm at the top when hanging dry from the roll; follow the product label if it specifies a different allowance.",
      reason: "Ceilings and skirting are not always level. Allowance lets the installer trim to the actual junction instead of coming up short.",
      tools: ["Tape measure", "Pencil", "Wallpaper scissors when pre-cutting"],
      materials: ["Dry wallcovering roll"],
      check: "Drop height, pattern position and top/bottom allowance are understood before hanging.",
      operation: "measure",
      seconds: 7,
      evidence: ["gb-hang"],
      requiresGate: "electrical"
    },
    {
      id: "paste-first-lane",
      phase: "Install",
      title: "Paste the first lane and cut in the edges",
      shortTitle: "Paste first lane",
      instruction: "Apply the specified adhesive evenly to the wall with a roller, covering an area slightly wider than the drop. Use a brush at the ceiling, skirting, corners and other places the roller misses. Do not paste the back of a product designed for paste-the-wall installation.",
      reason: "Complete edge coverage reduces lifting; a slightly wider pasted lane lets the dry drop slide into position.",
      tools: ["Roller and tray", "2–3 in paste brush"],
      materials: ["Adhesive specified for the wallcovering"],
      check: "The lane is evenly coated, including all edges, without dry strips or excessive pooling.",
      warning: "Adhesive coverage, open time and mixing are product-specific. Follow the selected adhesive datasheet.",
      operation: "paste",
      seconds: 9,
      evidence: ["gb-hang", "roman-ptw"],
      requiresGate: "electrical"
    },
    {
      id: "hang-first-drop",
      phase: "Install",
      title: "Hang the first drop dry to the plumb line",
      shortTitle: "Hang first drop",
      instruction: "Position the top with the planned trimming allowance. Align the edge to the plumb line and lower the dry drop gradually, keeping the corner allowance and vertical edge under control. Leave the final trimming until the drop is seated.",
      reason: "Dry handling avoids the booking stage used for many traditional papers; the plumb edge is the reference for every later drop.",
      tools: ["Stable step ladder", "Wallpaper brush or smoother"],
      materials: ["Dry paste-the-wall drop"],
      check: "The edge follows the plumb line from top to bottom, the top allowance remains, and the drop is repositionable while the adhesive permits.",
      operation: "hang",
      seconds: 9,
      evidence: ["gb-hang", "roman-ptw"],
      requiresGate: "electrical"
    },
    {
      id: "smooth-first-drop",
      phase: "Install",
      title: "Smooth from the centre towards the edges",
      shortTitle: "Smooth paper",
      instruction: "Use the specified smoothing brush or tool lightly. Work from the centre towards the edges and down the drop, removing air without stretching the wallcovering or forcing adhesive onto the face.",
      reason: "Centre-out strokes give air a path to escape and help the drop sit flat without disturbing alignment.",
      tools: ["Wallpaper brush or approved smoother"],
      materials: ["Clean dry cloth for tool faces"],
      check: "No bubbles, wrinkles or bridging remain; the plumb edge and corner allowance have not moved.",
      operation: "smooth",
      seconds: 8,
      evidence: ["gb-hang", "roman-ptw"],
      requiresGate: "electrical"
    },
    {
      id: "trim-junctions",
      phase: "Install",
      title: "Form and trim the ceiling and skirting junctions",
      shortTitle: "Trim edges",
      instruction: "Work the wallcovering gently into each junction, then trim with a sharp blade or suitable scissors using a straight edge where appropriate. Follow the actual ceiling or skirting line rather than a guessed horizontal.",
      reason: "A sharp, guided cut produces a clean junction and avoids tearing the damp adhesive-supported drop.",
      tools: ["Sharp craft knife with fresh blade", "Straight edge or wallpaper scissors"],
      materials: ["Safe blade disposal container"],
      check: "Top and bottom edges are continuous and neat, with no fraying, gaps or cuts into adjacent finishes.",
      warning: "Keep hands out of the blade path and isolate electrical hazards before working near outlets.",
      operation: "trim",
      seconds: 8,
      evidence: ["gb-hang"],
      requiresGate: "electrical"
    },
    {
      id: "match-next-drop",
      phase: "Install",
      title: "Paste the next lane and match the next drop",
      shortTitle: "Match next drop",
      instruction: "Paste slightly beyond the next drop width. Starting at the top, align the pattern and bring the edge to the first drop for the seam treatment specified by the product. Slide gently into position, smooth, and repeat the sequence for remaining drops.",
      reason: "Pattern alignment and seam control must happen together while the adhesive still permits adjustment.",
      tools: ["Roller and tray", "Paste brush", "Smoother", "Seam roller only if product-approved"],
      materials: ["Next dry drop", "Specified adhesive"],
      check: "The pattern matches at eye level and down the seam; there is no gap, overlap or edge lift unless the product explicitly requires it.",
      operation: "match",
      seconds: 10,
      evidence: ["gb-hang", "roman-ptw"],
      requiresGate: "electrical"
    },
    {
      id: "work-around-outlet",
      phase: "Install",
      title: "Fit the wallcovering around the outlet safely",
      shortTitle: "Cut around outlet",
      instruction: "With power isolated and the area verified safe, locate the outlet through the wallcovering and make controlled relief cuts. Trim only enough for the cover plate to conceal the edge. Avoid contact with electrical parts and follow local electrical requirements for refitting.",
      reason: "The cover should conceal the trimmed perimeter without leaving wallcovering trapped against live components.",
      tools: ["Sharp knife or scissors", "Appropriate insulated-handled tools for cover work"],
      materials: ["Clean cloth"],
      check: "The outlet area is dry, the trim is concealed by the plate, no adhesive entered the fitting, and electrical work is completed safely.",
      warning: "If safe isolation or refitting is uncertain, stop and use a qualified electrician.",
      operation: "outlet",
      seconds: 8,
      evidence: ["gb-hang", "demo-geometry"],
      requiresGate: "electrical"
    },
    {
      id: "clean-adhesive",
      phase: "Finish",
      title: "Remove excess adhesive before it dries",
      shortTitle: "Clean adhesive",
      instruction: "Use a clean, damp cloth or sponge suitable for the wallcovering face. Lift adhesive gently from seams, trims and adjacent surfaces, rinsing and wringing the cloth frequently. Do not scrub or flood the wallcovering.",
      reason: "Dried residue can mark the face and adjacent finishes; excessive moisture or abrasion can also cause damage.",
      tools: ["Clean damp cloth or sponge", "Bucket of clean water"],
      materials: ["Replacement clean water as needed"],
      check: "Face, seams, ceiling, skirting and tools are free of visible adhesive, with no overwetting or surface damage.",
      operation: "clean",
      seconds: 8,
      evidence: ["gb-hang", "roman-pro838"],
      requiresGate: "electrical"
    },
    {
      id: "inspect-finish",
      phase: "Finish",
      title: "Inspect the completed wall and record the result",
      shortTitle: "Final inspection",
      instruction: "Inspect in the room's normal light and at a low angle. Check plumb, pattern match, seams, bubbles, wrinkles, edge adhesion, trimmed junctions, outlet finish and cleanliness. Photograph the wall and retain product and batch records.",
      reason: "A structured inspection catches installation defects and preserves traceability for review or later maintenance.",
      tools: ["Inspection light when appropriate", "Camera or phone"],
      materials: ["Product labels and site record"],
      check: "All listed defects are checked, any issue is recorded before further work, and the completed area is left clean.",
      operation: "inspect",
      seconds: 8,
      evidence: ["gb-hang", "demo-geometry"],
      requiresGate: "electrical"
    }
  ]
};

export function canAccessStep(index: number, electricalCleared: boolean): boolean {
  const step = pasteTheWallGuide.steps[index];
  if (!step) return false;
  return step.requiresGate !== "electrical" || electricalCleared;
}

export function getSource(id: string): EvidenceSource {
  const source = wallpaperSources.find((item) => item.id === id);
  if (!source) throw new Error(`Unknown evidence source: ${id}`);
  return source;
}

export const totalAnimationSeconds = pasteTheWallGuide.steps.reduce((sum, step) => sum + step.seconds, 0);
