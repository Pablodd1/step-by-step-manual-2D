import type { Guide, ProductProfile, SceneAction } from "../guide";

const productRoot = "https://www.unitecusadesign.com/productos";
const localSheetRoot = "/docs/unitec-fichas";

export const unitecWpc: ProductProfile = {
  sku: "14122019",
  brand: "UNITEC USA DESIGN",
  category: "WPC Choco Mix (19) · Interior WPC Panel (FT_15)",
  application: "Decorative interior wall cladding & occasional moisture areas (living rooms, offices, kitchens, bathrooms)",
  widthCm: 16,
  heightCm: 295,
  thicknessMm: 25,
  coveragePerUnitM2: 0.472,
  unitsPerPack: 10,
  packCoverageM2: 4.72,
  imageUrl: "/products/14122019.webp",
  textureUrl: "/products/14122019-wood.jpg",
  technicalSheetUrl: `${localSheetRoot}/15_FT_Interior_WPC_Panel.pdf`,
  geometry: "fluted",
  finish: "Dark wood-look raised WPC flutes with contrasting recessed channels (~9 kg/m², 0.61 lbs/ft²)",
  approvalStatus: "visual-prototype",
};

export const unitecMarble: ProductProfile = {
  sku: "14121211",
  brand: "UNITEC USA DESIGN",
  category: "Lámina Mármol Eclipse M-11 · PVC Marble Sheet (FT_03 / FT_19)",
  application: "100% water-resistant interior wall cladding (residential, kitchens, bathrooms, hotels, clinics)",
  widthCm: 122,
  heightCm: 244,
  thicknessMm: 3,
  coveragePerUnitM2: 2.9768,
  unitsPerPack: 110,
  packCoverageM2: 327.448,
  imageUrl: "/products/14121211.webp",
  textureUrl: "/products/14121211.webp",
  technicalSheetUrl: `${localSheetRoot}/03_FT_PVC_Marble_Sheet.pdf`,
  geometry: "flat",
  finish: "High-gloss black marble look with UV-coated PVC/WPC surface (~8 kg/m², 3.89 lbs/ft²)",
  approvalStatus: "visual-prototype",
};

export const unitecVanilla: ProductProfile = {
  sku: "14126406",
  brand: "UNITEC USA DESIGN",
  category: "Panel Acolchado DuoSmall Vainilla (820) · Upholstered Panel (FT_17)",
  application: "Interior decorative & acoustic reverberation-control wall system (bedrooms, play areas, lounges)",
  widthCm: 20,
  heightCm: 110,
  thicknessMm: 25,
  coveragePerUnitM2: 0.22,
  unitsPerPack: 12,
  packCoverageM2: 2.64,
  imageUrl: "/products/14126406.webp",
  textureUrl: "/products/14126406-surface.jpg",
  technicalSheetUrl: `${localSheetRoot}/17_FT_Upholstered_Panel_DuoBig_y_DuoSmall.pdf`,
  geometry: "upholstered",
  finish: "High-quality Vanilla synthetic leather over 25 mm polyurethane acoustic foam core (~15 kg/m²)",
  approvalStatus: "visual-prototype",
};

type PanelStep = {
  title: string;
  action: SceneAction;
  instruction: string;
  detail: string;
  caution: string;
  tools: string[];
  camera: Guide["steps"][number]["visual"]["camera"];
};

const camera = (
  position: [number, number, number],
  target: [number, number, number],
  _fov = 42,
): Guide["steps"][number]["visual"]["camera"] => ({ position, target });

function panelSteps(product: ProductProfile, connection: string): PanelStep[] {
  const isWpc = product.geometry === "fluted";
  const isMarble = product.geometry === "flat";
  return [
    {
      title: "1. Inspect product & Technical Data Sheet",
      action: "inspect",
      instruction: `Verify ${product.category} dimensions (${product.widthCm} × ${product.heightCm} cm, ${product.thicknessMm} mm thick) and inspect shade/surface uniformity before installation.`,
      detail: `Official UNITEC Technical Data Sheet spec: SKU ${product.sku}; ${product.coveragePerUnitM2} m² per unit; ${product.unitsPerPack} units (${product.packCoverageM2} m²) per package. ${product.finish}. Per UNITEC warranty policy, inspect all units for size, shade, color, scratches, or warping prior to cutting or bonding.`,
      caution: "UNITEC USA DESIGN warranty does not cover installed products showing visible defects, shade variations, or warping that could have been detected prior to installation.",
      tools: ["Measuring tape", "Official UNITEC Ficha Técnica", "Gloves"],
      camera: product.geometry === "upholstered" ? camera([2.4, 1.75, 4.1], [0, 1.35, 0]) : camera([3.4, 2.0, 5.8], [0, 1.5, 0]),
    },
    {
      title: "2. Surface preparation & cleaning",
      action: "prepare",
      instruction: "Ensure the wall is clean, dry, flat, smooth, and completely free of dust, moisture, or grease.",
      detail: isWpc
        ? "Per Technical Data Sheet 15 (Interior WPC Panel): Clean the wall thoroughly so it is dry, flat, and free of dust or grease. Check flatness with a spirit level across the full installation span."
        : isMarble
          ? "Per Technical Data Sheet 03 & 19 (PVC / Acrylic Marble Sheet): Ensure the substrate is dry, clean, smooth, and structurally sound. If there are surface irregularities, sand or patch the wall beforehand and wipe off all dust."
          : "Per Technical Data Sheet 17 (Upholstered Panel DuoBig & DuoSmall): The wall must be clean, dry, and free of dust, moisture, or grease so the polyurethane mounting adhesive achieves full bond strength.",
      caution: "Dust, grease, or residual moisture on the substrate will prevent PEGATEC mounting adhesive from bonding properly.",
      tools: ["Spirit level", "Clean dry cloth", "Filler knife & sandpaper (if uneven)"],
      camera: camera([-2.5, 1.75, 3.5], [0, 1.35, 0]),
    },
    {
      title: "3. Layout marking & precision cutting",
      action: "measure",
      instruction: isWpc
        ? "Mark vertical alignment using a level and pencil, then cut WPC slats to length with a circular saw or fine-tooth jigsaw."
        : isMarble
          ? "Mark the panel outline and leave 6 mm (1/4 in) perimeter expansion gaps; cut sheets using a utility knife with metal straightedge or a fine-tooth jigsaw."
          : "Mark the modular panel grid on the wall using a bubble level and pencil before applying adhesive; trim edges with a precision cutter if required.",
      detail: isWpc
        ? "Technical Data Sheet 15 Step 2 (Cutting): Mark alignment using a level and pencil. Cut panels (9.68 ft × 6.30 in / 295 × 16 cm) with a circular saw or jigsaw for a precise fit at corners, ceiling, baseboards, and outlets."
        : isMarble
          ? "Technical Data Sheet 03 & 19 Step 2 (Cutting): Leave approximately 6 mm (1/4 in) expansion gaps around perimeter edges and undercut door frames where needed. Score and snap with a sharp utility knife against a metal ruler, or cut with a fine-tooth jigsaw."
          : "Technical Data Sheet 17 Step 2 (Cutting/Layout): Mark the horizontal and vertical panel layout on the wall using a level and pencil before starting installation so every 20 × 110 cm DuoSmall module sits plumb.",
      caution: isWpc
        ? "Always wear safety glasses and gloves when cutting WPC profiles with a circular saw or jigsaw."
        : "Support the sheet flat on a worktable and guide the utility knife against a steel straightedge to prevent blade slip.",
      tools: isWpc
        ? ["Measuring tape", "Spirit level", "Pencil", "Circular saw or jigsaw", "Safety glasses"]
        : ["Measuring tape", "Spirit or laser level", "Pencil", "Utility knife / precision cutter", "Metal straightedge"],
      camera: camera([0.2, 1.55, 4.8], [0, 1.4, 0], 46),
    },
    {
      title: "4. Prepare PEGATEC adhesive & clips",
      action: "tools",
      instruction: connection,
      detail: isWpc
        ? "Per Technical Data Sheet 15 Step 3 & Technical Data Sheet 27 (PEGATEC Mounting Adhesive): Use 2 metal clips (ref. 14122902) per linear meter (~500 mm vertical spacing). For supplemental bonding, cut the PEGATEC 395 ml polyurethane cartridge nozzle at a 45° angle and load into the applicator gun."
        : isMarble
          ? "Per Technical Data Sheet 27 (PEGATEC Mounting Adhesive): Cut the PEGATEC White (395 ml) or Clear (300 ml) cartridge nozzle at a 45° angle to the desired bead size and load into the silicone/applicator gun. Prepare 6 mm (1/4 in) perimeter spacers."
          : "Per Technical Data Sheet 17 Step 3 & Technical Data Sheet 27 (PEGATEC Mounting Adhesive): Cut the PEGATEC cartridge nozzle at a 45° angle and load into the applicator gun. Apply construction adhesive in an 'S' pattern or in evenly spaced dots on the back of the panel.",
      caution: "Per Technical Data Sheet 27: Bond pieces firmly together before an adhesive skin forms on the polyurethane bead.",
      tools: isWpc
        ? ["Stainless clips (2 per linear meter)", "PEGATEC Mounting Adhesive (FT_27)", "Silicone applicator gun", "Utility knife (45° nozzle cut)"]
        : ["PEGATEC Mounting Adhesive (FT_27)", "Silicone applicator gun", "Utility knife (45° nozzle cut)", "6 mm (1/4 in) spacers"],
      camera: camera([1.4, 1.75, 2.4], [0, 1.55, 0.25], 36),
    },
    {
      title: "5. Install & bond the first module",
      action: "place",
      instruction: isWpc
        ? "Secure 2 clips per linear meter to the wall or frame along the plumb line, apply PEGATEC beads on the back, and snap the first WPC panel into place."
        : isMarble
          ? "Apply PEGATEC mounting adhesive in continuous beads or evenly spaced dots on the back of the sheet, then press firmly onto the wall maintaining 6 mm spacers."
          : "Apply PEGATEC adhesive in an 'S' pattern or dots on the back of the DuoSmall panel and press firmly against the wall for at least 30 seconds.",
      detail: isWpc
        ? "Technical Data Sheet 15 Step 3 (Installation): First secure the metal clips to the frame or wall (2 clips per linear meter), then snap the WPC panel tongue-and-groove edge into place and verify plumb with a spirit level."
        : isMarble
          ? "Technical Data Sheet 03, 19 & 27 Step 3 (Installation): Apply PEGATEC adhesive evenly on the back of the panel and press firmly against the wall across the full surface so no hollow air pockets remain."
          : "Technical Data Sheet 17 Step 3 (Installation): Press the upholstered module firmly against the wall along the layout marks for a minimum of 30 seconds until initial grab is achieved.",
      caution: "Remove any excess PEGATEC adhesive immediately with a putty knife or damp cloth before it cures.",
      tools: ["Spirit level", "PEGATEC Mounting Adhesive (FT_27)", "Rubber mallet / tapping block", "Clean damp cloth"],
      camera: camera([2.2, 1.55, 3.1], [0.25, 1.35, 0], 40),
    },
    {
      title: "6. Interlock & align adjacent modules",
      action: "match",
      instruction: isWpc
        ? "Slide the next WPC panel tongue into the concealed clip groove, snap flush, and verify vertical slat alignment."
        : isMarble
          ? "Position the adjacent marble sheet, align the stone veining pattern across the joint, and press firmly into the adhesive bed."
          : "Install the next DuoSmall upholstered module tight against the reference edge, keeping joints and horizontal tiers level.",
      detail: isWpc
        ? "Technical Data Sheet 15 Step 3 & 4: Each WPC panel locks over the concealed clips of the previous slat, hiding the fastener head inside the recessed channel while maintaining uniform flute rhythm."
        : isMarble
          ? "Technical Data Sheet 03 & 13 Step 4: Align the marble veins and pattern direction between adjacent sheets before pressing the panel into final contact with the PEGATEC adhesive."
          : "Technical Data Sheet 17 Step 4: Check alignment between rounded polyurethane-foam panels as each column and tier progresses across the wall.",
      caution: "Verify plumb on every panel so cumulative drift does not open tapered joints at corners.",
      tools: ["Spirit level", "Measuring tape", "Clean cloth"],
      camera: camera([1.2, 1.45, 2.1], [0.38, 1.4, 0.06], 34),
    },
    {
      title: "7. Finishing trims & maintenance handover",
      action: "check",
      instruction: "Install UNITEC finishing moldings or SPC baseboards over perimeter joints, remove any adhesive residue, and perform final inspection.",
      detail: isWpc
        ? "Technical Data Sheet 15 Step 4 & 5: Install UNITEC Interior PVC Moldings (FT_21) or SPC Baseboards (FT_24) at ends to cover visible joints. Clean with a dry or damp cloth and mild detergent."
        : isMarble
          ? "Technical Data Sheet 03 Step 4 & 5: Install SPC Baseboards (FT_24) or decorative trims (FT_21) covering the 6 mm expansion joints. Clean with mild detergent and a soft damp cloth."
          : "Technical Data Sheet 17 Step 4 & 5: Cover perimeter terminations with decorative trims if required by the design. Clean synthetic leather with a dry or slightly damp cloth and mild soap and water.",
      caution: "NEVER use waxes, harsh solvents, acids, sandpaper, or abrasive sponges on UNITEC PVC, WPC, or synthetic leather surfaces.",
      tools: ["UNITEC PVC Molding (FT_21) / SPC Baseboard (FT_24)", "Soft damp cloth", "Mild pH-neutral soap", "Spirit level"],
      camera: product.geometry === "upholstered" ? camera([2.4, 1.75, 4.1], [0, 1.35, 0]) : camera([3.4, 2.0, 5.8], [0, 1.5, 0]),
    },
  ];
}

function makePanelGuide(
  product: ProductProfile,
  slug: string,
  title: string,
  subtitle: string,
  description: string,
  connection: string,
  productUrl: string,
  fichaCode: string,
  fichaTitle: string,
): Guide {
  return {
    schemaVersion: 1,
    slug,
    title,
    subtitle,
    method: product.geometry === "fluted" ? "wpc-panel" : product.geometry === "flat" ? "pvc-marble-sheet" : "upholstered-panel",
    difficulty: "Professional",
    estimatedMinutes: 25,
    people: 2,
    description,
    manufacturerNotice: `Official UNITEC USA DESIGN Technical Data Sheet (${fichaCode} + FT_27 PEGATEC Mounting Adhesive) integrated. Follow all surface preparation, cutting, clip spacing (2 clips/m for WPC), expansion gap (6 mm for PVC Marble Sheet), and 30-second press rules (for DuoSmall Upholstered Panels). Inspect all merchandise prior to installation per UNITEC warranty policy.`,
    product,
    pattern: {
      name: product.category,
      repeatCm: 0,
      match: product.geometry === "flat" ? "straight" : "free",
      rollWidthCm: product.widthCm,
      rollLengthCm: product.heightCm,
    },
    steps: panelSteps(product, connection).map((step, index) => ({
      id: `${slug}-${index + 1}`,
      title: step.title,
      shortTitle: step.title.length <= 42 ? step.title : step.title.slice(0, 39) + "…",
      duration: 6,
      instruction: step.instruction,
      detail: step.detail,
      tools: step.tools,
      materials: [product.category, "PEGATEC Mounting Adhesive (FT_27)", "UNITEC Trims / Baseboard (FT_21 / FT_24)"],
      warning: step.caution,
      narration: `${step.instruction} ${step.caution}`,
      printCaption: step.instruction,
      visual: {
        action: step.action,
        tool: step.action === "measure" ? "tape" : step.action === "prepare" ? "brush" : step.action === "check" ? "sponge" : "level",
        strips: 0,
        activeStrip: 0,
        paste: step.action === "place" || step.action === "tools",
        backing: false,
        plumb: step.action === "mark" || step.action === "measure" || step.action === "place",
        patternMatch: step.action === "match",
        trim: step.action === "measure",
        outletSafe: true,
        camera: step.camera,
        callout: index === 6 ? `Verified · UNITEC ${fichaCode} + FT_27` : step.title,
      },
      sourceIds: ["product", "technical-sheet", "pegatec-sheet"],
    })),
    sources: [
      {
        id: "product",
        title: product.category,
        publisher: "UNITEC USA DESIGN · Official Catalogue",
        url: productUrl,
        note: `Official SKU ${product.sku}, dimensions (${product.widthCm} × ${product.heightCm} cm), packaging, and catalogue surface imagery.`,
      },
      {
        id: "technical-sheet",
        title: `UNITEC Technical Data Sheet ${fichaCode} — ${fichaTitle}`,
        publisher: "UNITEC USA DESIGN",
        url: product.technicalSheetUrl,
        note: "Official 5-stage installation guide covering surface preparation, cutting tools, fastening/clip rules, finishing moldings, and maintenance.",
      },
      {
        id: "pegatec-sheet",
        title: "UNITEC Technical Data Sheet 27 — PEGATEC Mounting Adhesive",
        publisher: "UNITEC USA DESIGN",
        url: `${localSheetRoot}/27_FT_PEGATEC_Mounting_Adhesive.pdf`,
        note: "High-performance polyurethane mounting adhesive (Pegatec White 395 ml / Clear 300 ml): 45° nozzle cut, continuous beads or dots, bond before skin forms.",
      },
    ],
  };
}

export const unitecPanelGuides: Guide[] = [
  makePanelGuide(
    unitecWpc,
    "unitec-wpc-choco-mix-19",
    "WPC Choco Mix · FT_15 official clip & PEGATEC installation",
    "True-scale interior fluted WPC panel guide backed by UNITEC Technical Data Sheet 15 & FT_27.",
    "Complete 7-stage 3D installation guide for UNITEC Interior WPC Panel Choco Mix (SKU 14122019) built from official Technical Data Sheet 15 (Interior WPC Panel) and Technical Data Sheet 27 (PEGATEC Mounting Adhesive). Covers surface preparation, circular saw / jigsaw cutting, securing 2 metal clips per linear meter (ref. 14122902), snapping tongue-and-groove slats into alignment, and finishing with FT_21 / FT_24 moldings.",
    "Secure 2 stainless-steel clips (ref. 14122902) per linear meter (~500 mm vertical spacing) and apply PEGATEC Polyurethane Mounting Adhesive (FT_27) with nozzle cut at 45°.",
    `${productRoot}/panel-wpc-choco-mix-19/`,
    "FT_15",
    "Interior WPC Panel",
  ),
  makePanelGuide(
    unitecMarble,
    "unitec-marmol-eclipse-m-11",
    "Mármol Eclipse · FT_03 / FT_19 sheet cutting, 6 mm gap & PEGATEC bonding",
    "Large-format PVC marble sheet guide backed by UNITEC Technical Data Sheets 03, 19 & 27.",
    "Complete 7-stage 3D installation guide for UNITEC Lámina Mármol Eclipse M-11 (SKU 14121211) built from official Technical Data Sheet 03 (PVC Marble Sheet), Technical Data Sheet 19 (Acrylic Marble Panel), and Technical Data Sheet 27 (PEGATEC Mounting Adhesive). Covers substrate leveling, 6 mm (1/4 in) expansion gaps, utility knife / fine-tooth jigsaw cutting, PEGATEC bead bonding, vein alignment, and FT_24 SPC baseboard finishing.",
    "Prepare PEGATEC Mounting Adhesive (FT_27, 45° nozzle cut) for continuous bead or dot bonding on the back of the sheet while maintaining 6 mm (1/4 in) perimeter expansion spacers (FT_03).",
    `${productRoot}/lamina-marmol-eclipse-m-11/`,
    "FT_03",
    "PVC Marble Sheet",
  ),
  makePanelGuide(
    unitecVanilla,
    "unitec-duosmall-vainilla-820",
    "DuoSmall Vainilla · FT_17 S-pattern PEGATEC adhesive & 30s press",
    "Rounded acoustic upholstered panel guide backed by UNITEC Technical Data Sheet 17 & FT_27.",
    "Complete 7-stage 3D installation guide for UNITEC Panel Acolchado DuoSmall Vainilla (SKU 14126406) built from official Technical Data Sheet 17 (Upholstered Panel DuoBig y DuoSmall) and Technical Data Sheet 27 (PEGATEC Mounting Adhesive). Covers wall cleaning, level grid marking, precision cutter trimming, applying PEGATEC adhesive in an 'S' pattern or dots on the foam backing, pressing firmly for ≥ 30 seconds, and gentle synthetic leather maintenance.",
    "Cut the PEGATEC cartridge nozzle at 45° (FT_27), apply adhesive in an 'S' pattern or evenly spaced dots on the back of the panel, and press firmly against the wall for at least 30 seconds (FT_17).",
    `${productRoot}/panel-acolchado-duosmall-vainilla-820/`,
    "FT_17",
    "Upholstered Panel DuoBig y DuoSmall",
  ),
];
