import type { Guide, ProductProfile, SceneAction } from "../guide";

const productRoot = "https://www.unitecusadesign.com/productos";
const sheetRoot = "https://www.unitecusadesign.com/fichas";

export const unitecWpc: ProductProfile = {
  sku: "14122019",
  brand: "UNITEC",
  category: "WPC Choco Mix (19) · interior fluted panel",
  application: "Interior architectural wall demonstration",
  widthCm: 16,
  heightCm: 295,
  thicknessMm: 25,
  coveragePerUnitM2: 0.472,
  unitsPerPack: 10,
  packCoverageM2: 4.72,
  imageUrl: "/products/14122019.webp",
  textureUrl: "/products/14122019-wood.jpg",
  technicalSheetUrl: `${sheetRoot}/Paneles_WPC_Interior_Platinas_y_Angulos.pdf`,
  geometry: "fluted",
  finish: "Dark wood-look raised flutes with contrasting recessed channels",
  approvalStatus: "visual-prototype",
};

export const unitecMarble: ProductProfile = {
  sku: "14121211",
  brand: "UNITEC",
  category: "Lámina Mármol Eclipse M-11 · PVC sheet",
  application: "Interior architectural wall demonstration",
  widthCm: 122,
  heightCm: 244,
  thicknessMm: 3,
  coveragePerUnitM2: 2.9768,
  unitsPerPack: 110,
  packCoverageM2: 327.448,
  imageUrl: "/products/14121211.webp",
  textureUrl: "/products/14121211.webp",
  technicalSheetUrl: `${sheetRoot}/Paneles_Acrilicos_Marmol.pdf`,
  geometry: "flat",
  finish: "High-gloss black marble look with UV-coated PVC surface",
  approvalStatus: "visual-prototype",
};

export const unitecVanilla: ProductProfile = {
  sku: "14126406",
  brand: "UNITEC",
  category: "Panel Acolchado DuoSmall Vainilla (820)",
  application: "Interior decorative / acoustic upholstered wall demonstration",
  widthCm: 20,
  heightCm: 110,
  thicknessMm: 25,
  coveragePerUnitM2: 0.22,
  unitsPerPack: 12,
  packCoverageM2: 2.64,
  imageUrl: "/products/14126406.webp",
  textureUrl: "/products/14126406-surface.jpg",
  technicalSheetUrl: `${sheetRoot}/Paredes_y_Paneles_Acolchados.pdf`,
  geometry: "upholstered",
  finish: "Vainilla upholstered face with softly rounded DuoSmall geometry",
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
  return [
    {
      title: "Identify the actual product",
      action: "inspect",
      instruction: `Compare the ${product.widthCm} × ${product.heightCm} cm ${product.category} with the official catalogue image before planning the wall.`,
      detail: `SKU ${product.sku}; ${product.thicknessMm} mm thick; ${product.coveragePerUnitM2} m² per unit; ${product.unitsPerPack} units / ${product.packCoverageM2} m² per package. ${product.finish}. Orbit the model to inspect the interpreted depth and edge profile.`,
      caution: "The 3D profile is interpreted from product photography and published dimensions, not manufacturing CAD.",
      tools: ["Official catalogue image", "Tape measure"],
      camera: product.geometry === "upholstered" ? camera([2.4, 1.75, 4.1], [0, 1.35, 0]) : camera([3.4, 2.0, 5.8], [0, 1.5, 0]),
    },
    {
      title: "Measure and plan the layout",
      action: "measure",
      instruction: "Measure the actual wall, establish the visual centre and calculate complete panels plus cuts before ordering or opening adhesive packaging.",
      detail: `The lesson uses true product scale: ${product.widthCm / 100} m wide × ${product.heightCm / 100} m high. Use the dimensions overlay to check the intended module, joints and perimeter cuts.`,
      caution: "Published coverage is a planning figure. Confirm waste, cuts, site tolerances and packaging with the supplier.",
      tools: ["Tape measure", "Pencil", "Spirit level"],
      camera: camera([0.2, 1.55, 4.8], [0, 1.4, 0], 46),
    },
    {
      title: "Verify the wall and installation system",
      action: "prepare",
      instruction: "Stop for the current SKU-specific manufacturer instructions and confirm that the wall, environment and proposed installation system are compatible.",
      detail: "Record flatness, dryness, cleanliness and substrate type on the site checklist. The public catalogue and reviewed sheets do not provide enough information to approve a complete installation procedure.",
      caution: "Do not infer adhesive, primer, fastener spacing, curing time, substrate limits or exterior suitability from this visual prototype.",
      tools: ["Spirit level", "Pencil", "Approved cleaning tools"],
      camera: camera([-2.5, 1.75, 3.5], [0, 1.35, 0]),
    },
    {
      title: "Identify connection components",
      action: "tools",
      instruction: connection,
      detail: product.geometry === "fluted"
        ? "The official WPC interior technical sheet lists concealed stainless-steel fixing clips, reference 14122902. The scene isolates a representative clip for identification only; it does not prescribe spacing or fastening."
        : "No compatible fixing or adhesive system is assumed in this lesson. Keep this as an approval checkpoint until UNITEC or the project installer supplies the current written method.",
      caution: "Component identification is not an installation approval. Confirm corrosion compatibility, substrate fixing and spacing through the approved project method.",
      tools: ["Spirit level", "Pencil", "Tape measure"],
      camera: camera([1.4, 1.75, 2.4], [0, 1.55, 0.25], 36),
    },
    {
      title: "Dry-position the first module",
      action: "place",
      instruction: "Visualise the first module against the approved reference line without bonding or permanently fixing it.",
      detail: "Play, reverse or scrub to inspect the approach path, final elevation and relationship to the wall. This is a spatial coordination demonstration, not a fixing instruction.",
      caution: "Keep hands, services and site hazards under the project installer’s approved safety procedure. Do not use this animation as a lifting or fixing method.",
      tools: ["Spirit level", "Pencil"],
      camera: camera([2.2, 1.55, 3.1], [0.25, 1.35, 0], 40),
    },
    {
      title: "Align the next module",
      action: "match",
      instruction: "Bring the adjacent module into the planned position and inspect the joint, face alignment and overall visual rhythm.",
      detail: product.geometry === "flat"
        ? "Check the marble-look direction and the intended joint before any adhesive is introduced. The digital veining follows the supplied catalogue surface."
        : "Inspect the repeated profile and joint line under the same light direction used throughout the scene. Confirm the acceptable site tolerance with the manufacturer or installer.",
      caution: "No joint width, clip spacing, overlap, expansion gap or adhesive coverage is specified by the public evidence reviewed for this pilot.",
      tools: ["Spirit level", "Tape measure", "Pencil"],
      camera: camera([1.2, 1.45, 2.1], [0.38, 1.4, 0.06], 34),
    },
    {
      title: "Inspect and hand over for approval",
      action: "check",
      instruction: "Review the complete visual layout, record open technical questions and obtain client / manufacturer approval before turning this into operational field training.",
      detail: "Check colour, module direction, joints, perimeter conditions and the approved cleaning method. Add the missing SKU-specific fixing, adhesive, curing, safety and maintenance documents to the guide before publishing an installation lesson.",
      caution: "PILOT STATUS: visual and layout training only. Not a UNITEC-approved installation manual.",
      tools: ["Camera or phone", "Spirit level", "Tape measure"],
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
): Guide {
  return {
    schemaVersion: 1,
    slug,
    title,
    subtitle,
    method: product.geometry === "fluted" ? "wpc-panel" : product.geometry === "flat" ? "pvc-marble-sheet" : "upholstered-panel",
    difficulty: "Professional",
    estimatedMinutes: 20,
    people: 2,
    description,
    manufacturerNotice: "Visual training prototype based on official UNITEC product information reviewed 30 October 2026. It is not a UNITEC-approved installation manual. Before cutting, adhesive application, fixing, cleaning or site work, obtain and approve the current SKU-specific instructions. Geometry is interpreted from product photography and published dimensions, not manufacturing CAD.",
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
      materials: [product.category, "Approved site checklist"],
      warning: step.caution,
      narration: `${step.instruction} ${step.caution}`,
      printCaption: step.instruction,
      visual: {
        action: step.action,
        tool: step.action === "measure" ? "tape" : step.action === "prepare" ? "brush" : step.action === "check" ? "sponge" : "level",
        strips: 0,
        activeStrip: 0,
        paste: false,
        backing: false,
        plumb: step.action === "mark" || step.action === "measure" || step.action === "place",
        patternMatch: step.action === "match",
        trim: false,
        outletSafe: true,
        camera: step.camera,
        callout: index === 6 ? "Visual pilot · installation approval required" : step.title,
      },
      sourceIds: ["product", "technical-sheet"],
    })),
    sources: [
      {
        id: "product",
        title: product.category,
        publisher: "UNITEC · official product catalogue",
        url: productUrl,
        note: `Official SKU, dimensions, packaging, application and catalogue imagery. Product image used in the pilot: ${product.imageUrl}.`,
      },
      {
        id: "technical-sheet",
        title: "Related UNITEC technical sheet",
        publisher: "UNITEC",
        url: product.technicalSheetUrl,
        note: product.geometry === "fluted"
          ? "Confirms the interior WPC family and lists concealed stainless-steel fixing clips, reference 14122902; no complete installation sequence is published in the reviewed sheet."
          : "Used to corroborate product family and dimensions. It does not provide a complete SKU-specific fixing, adhesive, curing or cleaning method.",
      },
    ],
  };
}

export const unitecPanelGuides: Guide[] = [
  makePanelGuide(
    unitecWpc,
    "unitec-wpc-choco-mix-19",
    "WPC Choco Mix · relief, rhythm and concealed-clip concept",
    "True-scale interior fluted-panel pilot using UNITEC’s official Choco Mix imagery and published dimensions.",
    "A high-fidelity material and layout study for UNITEC WPC Choco Mix (19). Explore the deep fluted profile, catalogue-derived wood-look surface, wall layout, representative concealed fixing clip and alignment sequence. Operational fixing instructions remain gated pending approved manufacturer documentation.",
    "Identify the concealed stainless-steel clip referenced by UNITEC for the interior WPC/PVC panel family, then keep the fixing specification open for approval.",
    `${productRoot}/panel-wpc-choco-mix-19/`,
  ),
  makePanelGuide(
    unitecMarble,
    "unitec-marmol-eclipse-m-11",
    "Mármol Eclipse · gloss, scale and veining alignment",
    "Large-format PVC marble-look sheet pilot with physical clear-coat reflections and source-based Eclipse veining.",
    "A high-fidelity material and layout study for UNITEC Lámina Mármol Eclipse M-11. Inspect the 122 × 244 cm sheet at true scale, glossy UV-coated response, dry-positioning path and veining alignment. Adhesive, substrate, cutting, curing and cleaning requirements remain approval gates.",
    "Identify the installation system as an unresolved technical checkpoint; the reviewed public evidence does not establish a specific adhesive or fixing method for this SKU.",
    `${productRoot}/lamina-marmol-eclipse-m-11/`,
  ),
  makePanelGuide(
    unitecVanilla,
    "unitec-duosmall-vainilla-820",
    "DuoSmall Vainilla · soft geometry and textile response",
    "Rounded upholstered-panel pilot using the official silhouette and colour with deterministic fine-fabric detail.",
    "A high-fidelity material and layout study for UNITEC Panel Acolchado DuoSmall Vainilla (820). Explore rounded 25 mm upholstery, a woven roughness/bump response, modular wall composition and joint alignment. The narrow source image informs colour and silhouette; fine textile detail is reconstructed rather than claimed as a PBR scan.",
    "Identify the mounting system as an unresolved technical checkpoint; no adhesive, impaling clip, mechanical fixing or spacing is inferred from the product photograph.",
    `${productRoot}/panel-acolchado-duosmall-vainilla-820/`,
  ),
];
