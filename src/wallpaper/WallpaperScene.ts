import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import type { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {
  applyGroupViewMode,
  arcArrow,
  arrowPath,
  dimensionLineSvg,
  markCadAuxiliary,
  setLineArtResolution,
  upgradeGroupToLineArt,
  type Pt2,
} from "../scene/lineArtMaterials";
import type { Operation } from "./guide";
import { captionBarHeight, drawCaptionBar } from "../lesson/captions";
import type { LessonFrameRequest, LessonRenderer, LessonStyle } from "../lesson/types";
import {
  createFloorPbrMaps,
  createPaperPbrMaps,
  createProfiledCornice,
  createProfiledSkirting,
  createWallPbrMaps,
  createWetPasteMaterial,
} from "./pbrMaterials";
import {
  CORNICE_BOTTOM,
  CORNICE_H,
  DROP_H,
  DROP_W,
  FIRST_X,
  OUTLET as OUTLET_SPEC,
  PAPER_Z,
  PASTE_Z,
  PLUMB_X,
  SKIRTING_TOP,
  WALL_FRONT_Z,
  WALL_H,
  WALL_LEFT as LEFT,
  WALL_W,
  corniceDepth,
  skirtingDepth,
} from "./geometry";

/** Faceplate centre: the plate sits on the paper (back face 1 mm proud), not 5 cm in front of the wall. */
const OUTLET = new THREE.Vector3(OUTLET_SPEC.x, OUTLET_SPEC.y, PAPER_Z + 0.001 + OUTLET_SPEC.d / 2);
const OUTLET_FRONT_Z = OUTLET.z + OUTLET_SPEC.d / 2;
/** On-screen magnification the loupe is labelled with; detail-camera distance is solved to make it true. */
export const LOUPE_MAG = 3.5;
const DROP_SEGMENTS_X = 24;
const DROP_SEGMENTS_Y = 96;

interface DropMesh extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial> {
  userData: { original: Float32Array; baseX: number };
}

export interface DropState {
  reveal: number;
  visible: boolean;
  /** Lateral slide (m) while the dry drop is being brought to the plumb line / pattern. */
  xOffset?: number;
  /** Vertical slide (m) used when matching the pattern on the next drop. */
  yOffset?: number;
  /** 0..1: fraction of the cornice allowance already cut away, from the left edge. */
  trimTop?: number;
  /** 0..1: fraction of the skirting allowance already cut away, from the left edge. */
  trimBottom?: number;
}

/** A labelled, world-anchored callout (⇧N). `anchor` is evaluated after seek() so it tracks moving parts. */
export interface Callout {
  id: string;
  label: string;
  anchor: THREE.Vector3;
  /** Preferred screen direction for the label, in px (x right, y down). */
  dir: [number, number];
}

/** Ids of the hand tools, used by the UI inventory bar to highlight what is in use. */
export type ToolId =
  | "level"
  | "roller"
  | "smoother"
  | "knife"
  | "straightedge"
  | "fillingKnife"
  | "pasteBrush"
  | "sponge"
  | "pencil"
  | "tape"
  | "voltageTester";

function meshBox(
  size: [number, number, number],
  color: string,
  roughness = 0.65,
  metalness = 0,
  bevel = false,
): THREE.Mesh {
  const geo = bevel
    ? new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(...size) * 0.14)
    : new THREE.BoxGeometry(...size);
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
}

function makeCraftsmanHand(
  isLeft = false,
  gloveColor = "#2d3748",
  palmColor = "#141923",
  accentColor = "#eab308",
): THREE.Group {
  const hand = new THREE.Group();
  hand.name = "glove";
  const dir = isLeft ? -1 : 1;

  const fabricMat = new THREE.MeshPhysicalMaterial({
    color: gloveColor,
    roughness: 0.72,
    metalness: 0.02,
    sheen: 0.55,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color("#94a3b8"),
  });
  const nitrileMat = new THREE.MeshPhysicalMaterial({
    color: palmColor,
    roughness: 0.52,
    metalness: 0.04,
    clearcoat: 0.18,
    clearcoatRoughness: 0.45,
  });
  const sleeveMat = new THREE.MeshPhysicalMaterial({
    color: "#1e293b",
    roughness: 0.84,
    sheen: 0.4,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color("#64748b"),
  });

  // Sculpted anatomical metacarpal palm body
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.056, 0.066, 0.032, 4, 0.011), fabricMat);
  hand.add(palm);

  // Nitrile micro-foam grip pad across palm and lower fingers
  const gripPad = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.054, 0.009, 3, 0.004), nitrileMat);
  gripPad.position.set(0, -0.002, -0.015);
  hand.add(gripPad);

  // Thenar eminence (thumb muscle pad)
  const thenar = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.024, 6, 12), fabricMat);
  thenar.position.set(-0.022 * dir, -0.008, 0.006);
  thenar.rotation.z = -0.35 * dir;
  hand.add(thenar);

  // Molded TPR knuckle protector across dorsal ridge
  const knuckleGuard = new THREE.Mesh(new RoundedBoxGeometry(0.052, 0.015, 0.01, 3, 0.004), nitrileMat);
  knuckleGuard.position.set(0, 0.02, 0.015);
  hand.add(knuckleGuard);

  // Elasticated wrist cuff + hi-vis reflective safety band + angled forearm sleeve
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.042, 18), nitrileMat);
  cuff.scale.set(1.08, 1, 0.82);
  cuff.position.set(0, -0.048, 0.002);
  const trim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0275, 0.0285, 0.009, 18),
    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3, metalness: 0.25 }),
  );
  trim.scale.set(1.08, 1, 0.82);
  trim.position.set(0, -0.056, 0.002);
  // Short sleeve stub: a 13 cm sleeve on a 35°-tipped knife pointed straight at the camera and hid the cut.
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.033, 0.07, 18), sleeveMat);
  forearm.scale.set(1.06, 1, 0.86);
  forearm.position.set(0.006 * dir, -0.094, 0.012);
  forearm.rotation.set(0.22, 0, -0.08 * dir);
  hand.add(cuff, trim, forearm);

  // 4 articulated multi-phalange fingers curled around the grip
  const fingerLengths = [0.028, 0.032, 0.03, 0.025];
  for (let i = 0; i < 4; i++) {
    const xOff = (i - 1.5) * 0.0125 * dir;
    const fLen = fingerLengths[i];
    const fingerGroup = new THREE.Group();
    fingerGroup.position.set(xOff, 0.031, 0.004);

    // Proximal phalanx
    const prox = new THREE.Mesh(new THREE.CapsuleGeometry(0.0058, fLen * 0.55, 5, 10), fabricMat);
    prox.position.set(0, fLen * 0.28, -0.006);
    prox.rotation.x = -0.55;
    fingerGroup.add(prox);

    // Middle + distal phalanges curled inward to grip handle
    const dist = new THREE.Mesh(new THREE.CapsuleGeometry(0.0052, fLen * 0.52, 5, 10), nitrileMat);
    dist.position.set(0, fLen * 0.42, -0.022);
    dist.rotation.x = -1.65;
    fingerGroup.add(dist);

    hand.add(fingerGroup);
  }

  // Articulated 2-segment thumb pressing firmly along tool spine
  const thumbProx = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, 0.022, 5, 10), fabricMat);
  thumbProx.position.set(-0.031 * dir, 0.008, 0.01);
  thumbProx.rotation.set(0.25, 0.25 * dir, -0.52 * dir);
  const thumbDist = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.018, 5, 10), nitrileMat);
  thumbDist.position.set(-0.035 * dir, 0.028, 0.014);
  thumbDist.rotation.set(0.12, 0.15 * dir, -0.18 * dir);
  hand.add(thumbProx, thumbDist);

  return hand;
}

function makeLevel(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(0.072, 0.74, 0.038, 3, 0.005),
    new THREE.MeshPhysicalMaterial({
      color: "#e5be1f",
      roughness: 0.28,
      metalness: 0.45,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
    }),
  );
  group.add(body);
  const topCap = meshBox([0.076, 0.035, 0.042], "#1f2937", 0.65, 0, true);
  topCap.position.y = 0.36;
  const botCap = topCap.clone();
  botCap.position.y = -0.36;
  group.add(topCap, botCap);
  for (const y of [-0.22, 0, 0.22]) {
    const bezel = meshBox([0.048, 0.088, 0.016], "#1e293b", 0.4, 0.25, true);
    bezel.position.set(0, y, 0.018);
    group.add(bezel);
    const vial = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.056, 6, 14),
      new THREE.MeshPhysicalMaterial({
        color: "#86efac",
        emissive: "#166534",
        emissiveIntensity: 0.25,
        roughness: 0.1,
        transmission: 0.35,
        transparent: true,
        opacity: 0.92,
      }),
    );
    vial.position.set(0, y, 0.025);
    group.add(vial);
    // Plumb vial center air bubble
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.0085, 12, 12),
      new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, clearcoat: 1 }),
    );
    bubble.scale.set(0.85, 1.35, 0.6);
    bubble.position.set(0, y, 0.031);
    group.add(bubble);
  }
  const hand = makeCraftsmanHand(true);
  hand.position.set(-0.02, -0.05, 0.028);
  hand.rotation.set(0, 0, -Math.PI / 2);
  group.add(hand);
  return group;
}

function makeRoller(): THREE.Group {
  const group = new THREE.Group();
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.046, 0.25, 32),
    new THREE.MeshPhysicalMaterial({
      color: "#f1eee4",
      roughness: 0.94,
      sheen: 0.65,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color("#ffffff"),
    }),
  );
  sleeve.rotation.z = Math.PI / 2;
  group.add(sleeve);
  const endCapL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.047, 0.047, 0.012, 24),
    new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.45 }),
  );
  endCapL.rotation.z = Math.PI / 2;
  endCapL.position.x = -0.125;
  const endCapR = endCapL.clone();
  endCapR.position.x = 0.125;
  group.add(endCapL, endCapR);

  const metal = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.88, roughness: 0.18 });
  const wireHorizontal = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 14), metal);
  wireHorizontal.rotation.z = Math.PI / 2;
  wireHorizontal.position.set(0.06, -0.08, 0);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 14), metal);
  arm.position.set(0.12, -0.14, 0);
  group.add(wireHorizontal, arm);

  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.03, 18), metal);
  ferrule.position.set(0.12, -0.25, 0);
  const handle = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.023, 0.13, 8, 16),
    new THREE.MeshPhysicalMaterial({ color: "#1d4640", roughness: 0.38, clearcoat: 0.25 }),
  );
  handle.position.set(0.12, -0.34, 0);
  const hand = makeCraftsmanHand(false);
  hand.position.set(0.12, -0.34, 0.012);
  group.add(ferrule, handle, hand);
  return group;
}

function makeSmoother(): THREE.Group {
  const group = new THREE.Group();
  const blade = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.12, 0.01, 3, 0.003),
    new THREE.MeshPhysicalMaterial({ color: "#eab308", roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
  );
  const feltEdge = meshBox([0.242, 0.024, 0.013], "#fef3c7", 0.9, 0, true);
  feltEdge.position.y = -0.052;
  const grip = meshBox([0.15, 0.052, 0.034], "#1e293b", 0.48, 0.1, true);
  grip.position.set(0, 0.022, 0.02);
  const hand = makeCraftsmanHand(false);
  hand.position.set(0, 0.015, 0.035);
  hand.rotation.set(0.18, 0, 0);
  group.add(blade, feltEdge, grip, hand);
  return group;
}

function makeKnife(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(0.032, 0.155, 0.02, 3, 0.004),
    new THREE.MeshPhysicalMaterial({ color: "#eab308", roughness: 0.32, clearcoat: 0.42 }),
  );
  const grip = meshBox([0.035, 0.11, 0.023], "#1e293b", 0.65, 0.05, true);
  grip.position.set(0, -0.015, 0);
  const slider = meshBox([0.018, 0.028, 0.026], "#0f172a", 0.35, 0.2, true);
  slider.position.set(0, 0.03, 0.004);
  const channel = meshBox([0.02, 0.05, 0.01], "#cbd5e1", 0.2, 0.9);
  channel.position.y = 0.08;
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.088, 0.003),
    new THREE.MeshPhysicalMaterial({ color: "#f1f5f9", roughness: 0.12, metalness: 0.94, clearcoat: 0.5 }),
  );
  blade.position.y = 0.12;
  blade.rotation.z = -0.08;
  const hand = makeCraftsmanHand(false);
  hand.position.set(0, -0.02, 0.015);
  hand.rotation.set(-0.1, 0, 0.05);
  group.add(body, grip, slider, channel, blade, hand);
  return group;
}

function makeStraightedge(): THREE.Group {
  const group = new THREE.Group();
  const rule = new THREE.Mesh(
    new RoundedBoxGeometry(0.56, 0.054, 0.008, 2, 0.002),
    new THREE.MeshPhysicalMaterial({ color: "#dbe4ee", roughness: 0.22, metalness: 0.88, clearcoat: 0.25 }),
  );
  const ridge = meshBox([0.54, 0.018, 0.022], "#334155", 0.42, 0.45, true);
  ridge.position.set(0, 0.008, 0.012);
  const handL = makeCraftsmanHand(true);
  handL.position.set(-0.16, 0.01, 0.028);
  handL.scale.setScalar(0.88);
  group.add(rule, ridge, handL);
  return group;
}

function makeFillingKnife(): THREE.Group {
  const group = new THREE.Group();
  const blade = meshBox([0.135, 0.11, 0.005], "#cbd5e1", 0.22, 0.85);
  blade.position.y = 0.058;
  const bolster = meshBox([0.048, 0.022, 0.026], "#94a3b8", 0.3, 0.75, true);
  bolster.position.y = 0.004;
  const handle = meshBox([0.044, 0.125, 0.03], "#1e3a34", 0.5, 0.05, true);
  handle.position.y = -0.065;
  const hand = makeCraftsmanHand(false);
  hand.position.set(0, -0.065, 0.015);
  group.add(blade, bolster, handle, hand);
  return group;
}

function makePasteBrush(): THREE.Group {
  const group = new THREE.Group();
  const stock = meshBox([0.145, 0.048, 0.034], "#926c40", 0.6, 0, true);
  const ferrule = meshBox([0.148, 0.022, 0.036], "#cbd5e1", 0.3, 0.8);
  ferrule.position.y = -0.022;
  const bristles = meshBox([0.142, 0.062, 0.028], "#e5dec9", 0.92, 0, true);
  bristles.position.y = -0.058;
  const handle = meshBox([0.038, 0.145, 0.026], "#1e3a34", 0.5, 0, true);
  handle.position.y = 0.095;
  const hand = makeCraftsmanHand(false);
  hand.position.set(0, 0.095, 0.015);
  group.add(stock, ferrule, bristles, handle, hand);
  return group;
}

function makeSponge(): THREE.Group {
  const group = new THREE.Group();
  const body = meshBox([0.15, 0.085, 0.048], "#e2c86b", 0.92, 0, true);
  const scrubPad = meshBox([0.146, 0.082, 0.012], "#2b594b", 0.88, 0, true);
  scrubPad.position.z = -0.026;
  const hand = makeCraftsmanHand(false);
  hand.position.set(0, 0, 0.025);
  hand.rotation.set(0.2, 0, 0);
  group.add(body, scrubPad, hand);
  return group;
}

function makePencil(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.55 }),
  );
  const woodCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.008, 0.028, 12),
    new THREE.MeshStandardMaterial({ color: "#fde68a", roughness: 0.65 }),
  );
  woodCone.position.y = 0.104;
  const lead = new THREE.Mesh(
    new THREE.ConeGeometry(0.0035, 0.012, 10),
    new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.5 }),
  );
  lead.position.y = 0.116;
  const hand = makeCraftsmanHand(false);
  hand.position.set(0, 0, 0.015);
  hand.scale.setScalar(0.72);
  group.add(body, woodCone, lead, hand);
  return group;
}

function makeVoltageTester(): THREE.Group {
  const group = new THREE.Group();
  const body = meshBox([0.028, 0.145, 0.024], "#ef4444", 0.38, 0.08, true);
  const clip = meshBox([0.01, 0.065, 0.008], "#1e293b", 0.5, 0.2, true);
  clip.position.set(0, -0.02, 0.015);
  const probe = meshBox([0.012, 0.036, 0.008], "#f8fafc", 0.25, 0.1, true);
  probe.position.y = 0.088;
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.009, 12, 12),
    new THREE.MeshBasicMaterial({ color: "#22c55e" }),
  );
  led.position.y = 0.068;
  const hand = makeCraftsmanHand(false);
  hand.position.set(0, -0.03, 0.015);
  hand.scale.setScalar(0.85);
  group.add(body, clip, probe, led, hand);
  return group;
}

function makeProductLabel(): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f1efe7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#315d52";
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  ctx.fillStyle = "#203b35";
  ctx.font = "700 54px sans-serif";
  ctx.fillText("PASTE THE WALL", 58, 105);
  ctx.font = "28px monospace";
  ctx.fillText("BATCH  •  WIDTH  •  REPEAT", 58, 177);
  ctx.fillText("MATCH  •  ADHESIVE", 58, 224);
  ctx.fillStyle = "#8b6a28";
  ctx.font = "700 25px sans-serif";
  ctx.fillText("VERIFY LABEL BEFORE PASTE", 58, 303);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.275),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88, side: THREE.DoubleSide }),
  );
}

function makeTape(): THREE.Group {
  const group = new THREE.Group();
  // Unit-height blade scaled on its own: scaling the whole group used to squash the tape case to 15 %.
  const strip = meshBox([0.022, 1, 0.006], "#facc15", 0.45);
  strip.name = "tapeBlade";
  strip.position.y = 0.5;
  const caseBody = meshBox([0.095, 0.085, 0.052], "#1e3a34", 0.38, 0.15, true);
  caseBody.position.set(0, 0.03, 0.022);
  const badge = meshBox([0.055, 0.05, 0.056], "#eab308", 0.35, 0.1, true);
  badge.position.set(0, 0.03, 0.022);
  group.add(strip, caseBody, badge);
  return group;
}

export class WallpaperScene implements LessonRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  readonly detailCamera = new THREE.PerspectiveCamera(26, 1, 0.03, 30);
  readonly controls: OrbitControls;
  private readonly host: HTMLElement;
  private readonly insetCanvas: HTMLCanvasElement;
  private readonly insetCtx: CanvasRenderingContext2D | null;
  private readonly detailTagEl: HTMLDivElement;
  private readonly leadsSvg: SVGSVGElement;
  private readonly architectureGroup = new THREE.Group();
  private readonly dropsGroup = new THREE.Group();
  private readonly toolsGroup = new THREE.Group();
  private readonly drops: DropMesh[] = [];
  private readonly rolls: THREE.Mesh[] = [];
  private readonly paste: THREE.Mesh[] = [];
  private readonly ghostLines = new THREE.Group();
  private readonly plumbLine: THREE.Mesh;
  private readonly outlet: THREE.Group;
  private readonly outletRing: THREE.Mesh;
  private readonly outletFlapsGroup = new THREE.Group();
  private readonly outletFlaps: THREE.Group[] = [];
  private readonly overhangStrip: THREE.Mesh;
  private readonly level = makeLevel();
  private readonly roller = makeRoller();
  private readonly smoother = makeSmoother();
  private readonly knife = makeKnife();
  private readonly straightedge = makeStraightedge();
  private readonly fillingKnife = makeFillingKnife();
  private readonly pasteBrush = makePasteBrush();
  private readonly sponge = makeSponge();
  private readonly pencil = makePencil();
  private readonly tape = makeTape();
  private readonly voltageTester = makeVoltageTester();
  /** Two free gloves that carry the dry drop during the hang (dry-drop alignment is a two-handed job). */
  private readonly hangHands = new THREE.Group();
  private readonly hangLeft = makeCraftsmanHand(true);
  private readonly hangRight = makeCraftsmanHand(false);
  /** Proud filler patch that the filling knife works flush during "prepare". */
  private readonly fillerPatch: THREE.Mesh;
  /** Grazing light for the final raking-light inspection. */
  private readonly rakeLight = new THREE.DirectionalLight("#fff1d6", 0);
  private readonly keyLight: THREE.DirectionalLight;
  private readonly displayRoll: THREE.Mesh;
  private readonly productLabel = makeProductLabel();
  private readonly outletCuts: THREE.LineSegments;
  private readonly floor: THREE.Mesh;
  private readonly focusWorld = new THREE.Vector3(0, 1.2, 0.05);
  private readonly detailCamOffset = new THREE.Vector3(0.16, 0.08, 0.42);
  private currentStep = -1;
  private currentProgress = 0;
  private currentOperation: Operation = "verify";
  private view: "room" | "drawing" = "room";
  private showLoupe = true;
  private frame = 0;
  private disposed = false;
  private exporting = false;
  private paperMeshes: Array<{ mesh: THREE.Mesh; material: THREE.Material }> = [];
  private lastSeek: { stepIndex: number; progress: number; operation: Operation } = { stepIndex: 0, progress: 0, operation: "verify" };
  private exportSaved: {
    view: "room" | "drawing";
    seek: { stepIndex: number; progress: number; operation: Operation };
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null = null;
  private environmentTarget: THREE.WebGLRenderTarget | null = null;
  /** ⇧X: 0 = assembled, 1 = substrate / adhesive bed / wallcovering pulled apart along the wall normal. */
  private exploded = 0;
  /** ⇧N: world-anchored part and junction labels. */
  private showCallouts = false;
  private callouts: Callout[] = [];
  /** Interactive camera follows the work point until the user orbits; R / step change re-engages it. */
  private followCamera = true;
  private readonly shotTarget = new THREE.Vector3(0, 1.3, 0);
  private readonly shotPosition = new THREE.Vector3(3.45, 2.35, 4.95);
  private lastFrameTime = 0;
  /** Height in overlay px that the main camera's vertical FOV spans (smaller than the frame under a caption bar). */
  private mainViewPx: number | null = null;
  /** Dark electrical-box opening revealed behind the folded relief flaps. */
  private readonly outletOpening: THREE.Mesh;

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Interactive reconstructed wallpaper installation demonstration");
    this.renderer.domElement.setAttribute("role", "img");
    host.appendChild(this.renderer.domElement);

    // Image-based lighting for the Realistic style (soft room reflections on tools, plates and paper sheen).
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.32;
    pmrem.dispose();

    // Circular 3.5x Magnifying Detail Loupe (#inset)
    this.insetCanvas = document.createElement("canvas");
    this.insetCanvas.className = "wp-detail-loupe";
    this.insetCanvas.width = 400;
    this.insetCanvas.height = 400;
    this.insetCtx = this.insetCanvas.getContext("2d");
    host.appendChild(this.insetCanvas);

    this.detailTagEl = document.createElement("div");
    this.detailTagEl.className = "wp-detail-loupe-tag";
    this.detailTagEl.textContent = "3.5× DETAIL LOUPE";
    host.appendChild(this.detailTagEl);

    // Screen-Space Vector SVG Leader Line + Motion Arrows + CAD Dimensions (#leads)
    this.leadsSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.leadsSvg.setAttribute("class", "wp-leads-svg");
    this.leadsSvg.setAttribute("aria-hidden", "true");
    host.appendChild(this.leadsSvg);

    this.scene.background = new THREE.Color("#0c1220");
    this.scene.fog = new THREE.Fog("#0c1220", 9, 18);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.65;
    this.controls.maxDistance = 9;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.target.set(0, 1.3, 0);
    // A user orbit/zoom hands the camera to the user until R (reset) or the next step re-engages the shot.
    this.controls.addEventListener("start", () => {
      this.followCamera = false;
    });

    const hemi = new THREE.HemisphereLight("#dbe8ef", "#26352e", 1.55);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight("#fff4df", 3.35);
    this.keyLight = key;
    key.position.set(-2.8, 4.8, 4.8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -3.6;
    key.shadow.camera.right = 3.6;
    key.shadow.camera.top = 3.6;
    key.shadow.camera.bottom = -1.6;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.012;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight("#8ec9c0", 1.25);
    rim.position.set(4, 2.2, 1.4);
    this.scene.add(rim);
    // Raking light: almost parallel to the wall so seams, bubbles and edge lift throw visible relief.
    this.rakeLight.position.set(-4.2, 1.45, 0.32);
    this.rakeLight.target.position.set(0, 1.3, WALL_FRONT_Z);
    this.scene.add(this.rakeLight, this.rakeLight.target);

    // Physically based architectural wall (gypsum plaster albedo + normal + roughness + baked AO)
    const wallMaps = createWallPbrMaps();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallMaps.map,
      normalMap: wallMaps.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: wallMaps.roughnessMap,
      roughness: 0.96,
      metalness: 0.0,
    });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(WALL_W, WALL_H, 0.12), wallMat);
    wall.position.set(0, WALL_H / 2, -0.065);
    wall.receiveShadow = true;
    this.architectureGroup.add(wall);

    const sideMat = wallMat.clone();
    sideMat.color.set("#ebe8df");
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, WALL_H, 0.78), sideMat);
    side.position.set(LEFT - 0.06, WALL_H / 2, -0.36);
    side.castShadow = true;
    side.receiveShadow = true;
    this.architectureGroup.add(side);

    const trimMat = new THREE.MeshPhysicalMaterial({
      color: "#ebe9e1",
      roughness: 0.34,
      metalness: 0.0,
      clearcoat: 0.38,
      clearcoatRoughness: 0.28,
    });
    const skirting = createProfiledSkirting(WALL_W + 0.08, trimMat);
    skirting.position.set(0, 0, WALL_FRONT_Z);
    this.architectureGroup.add(skirting);

    const cornice = createProfiledCornice(WALL_W + 0.15, trimMat);
    // The cornice hangs from the ceiling line; it used to sit on top of the wall (y 2.70–2.775), out of sight.
    cornice.position.set(0, WALL_H - CORNICE_H, WALL_FRONT_Z);
    this.architectureGroup.add(cornice);
    this.scene.add(this.architectureGroup);

    const floorMaps = createFloorPbrMaps();
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      new THREE.MeshPhysicalMaterial({
        map: floorMaps.map,
        normalMap: floorMaps.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: floorMaps.roughnessMap,
        roughness: 0.65,
        clearcoat: 0.26,
        clearcoatRoughness: 0.36,
      }),
    );
    markCadAuxiliary(this.floor);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.005;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    const paperMaps = createPaperPbrMaps();
    const kraftCoreMat = new THREE.MeshStandardMaterial({
      color: "#8f6d48",
      roughness: 0.88,
      side: THREE.DoubleSide,
    });
    const wetPasteMat = createWetPasteMaterial();
    for (let i = 0; i < 6; i++) {
      const material = new THREE.MeshPhysicalMaterial({
        map: paperMaps.map,
        normalMap: paperMaps.normalMap,
        normalScale: new THREE.Vector2(0.65, 0.65),
        roughnessMap: paperMaps.roughnessMap,
        roughness: 0.86,
        sheen: 0.45,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color("#f7f4eb"),
        side: THREE.DoubleSide,
      });
      const geometry = new THREE.PlaneGeometry(DROP_W, DROP_H, DROP_SEGMENTS_X, DROP_SEGMENTS_Y);
      const drop = new THREE.Mesh(geometry, material) as DropMesh;
      drop.userData = { original: new Float32Array(geometry.attributes.position.array), baseX: FIRST_X + i * DROP_W };
      // Paper lies 3 mm off the plaster (on its adhesive bed); it used to float 23 mm in front of the wall.
      drop.position.set(FIRST_X + i * DROP_W, WALL_H / 2, PAPER_Z + i * 0.0002);
      drop.castShadow = true;
      drop.receiveShadow = true;
      this.drops.push(drop);
      this.dropsGroup.add(drop);

      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, DROP_W, 36, 1, false), material);
      roll.rotation.z = Math.PI / 2;
      roll.position.x = drop.position.x;
      roll.position.z = PAPER_Z + 0.044;
      roll.castShadow = true;
      const coreTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, DROP_W + 0.003, 24, 1, false),
        kraftCoreMat,
      );
      roll.add(coreTube);
      const coreHole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, DROP_W + 0.005, 24),
        new THREE.MeshStandardMaterial({ color: "#2d2115", roughness: 0.95 }),
      );
      roll.add(coreHole);
      this.rolls.push(roll);
      this.dropsGroup.add(roll);

      if (i < 2) {
        const lane = new THREE.Mesh(
          new THREE.PlaneGeometry(DROP_W + 0.035, DROP_H),
          wetPasteMat,
        );
        markCadAuxiliary(lane);
        lane.position.set(drop.position.x, WALL_H / 2, PASTE_Z);
        this.paste.push(lane);
        this.scene.add(lane);
        const points = [
          new THREE.Vector3(drop.position.x - DROP_W / 2, 0.03, WALL_FRONT_Z + 0.002),
          new THREE.Vector3(drop.position.x + DROP_W / 2, 0.03, WALL_FRONT_Z + 0.002),
          new THREE.Vector3(drop.position.x + DROP_W / 2, 2.67, WALL_FRONT_Z + 0.002),
          new THREE.Vector3(drop.position.x - DROP_W / 2, 2.67, WALL_FRONT_Z + 0.002),
          new THREE.Vector3(drop.position.x - DROP_W / 2, 0.03, WALL_FRONT_Z + 0.002),
        ];
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineDashedMaterial({ color: "#087d8c", dashSize: 0.05, gapSize: 0.035 }),
        );
        line.computeLineDistances();
        this.ghostLines.add(line);
      }
    }
    this.scene.add(this.dropsGroup);
    this.scene.add(this.ghostLines);

    // Trim overhang strip that visibly separates during Step 10 (trim)
    // Unit plane, scaled to the strip that has actually been cut off (see seek "trim").
    this.overhangStrip = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 4, 2), this.drops[0].material);
    this.overhangStrip.visible = false;
    this.dropsGroup.add(this.overhangStrip);

    // 4 Folding Triangular Flaps around the outlet for Step 12 (outlet X-cut)
    this.outletFlapsGroup.position.set(OUTLET.x, OUTLET.y, PAPER_Z + 0.0006);
    const flapConfigs: Array<{ pos: [number, number]; rotAxis: [number, number, number]; verts: number[] }> = [
      { pos: [0, 0.052], rotAxis: [1, 0, 0], verts: [-0.078, 0, 0, 0.078, 0, 0, 0, -0.052, 0] },
      { pos: [0, -0.052], rotAxis: [-1, 0, 0], verts: [0.078, 0, 0, -0.078, 0, 0, 0, 0.052, 0] },
      { pos: [-0.078, 0], rotAxis: [0, -1, 0], verts: [0, -0.052, 0, 0, 0.052, 0, 0.078, 0, 0] },
      { pos: [0.078, 0], rotAxis: [0, 1, 0], verts: [0, 0.052, 0, 0, -0.052, 0, -0.078, 0, 0] },
    ];
    for (const cfg of flapConfigs) {
      const pivot = new THREE.Group();
      pivot.position.set(cfg.pos[0], cfg.pos[1], 0);
      pivot.userData = { axis: new THREE.Vector3(...cfg.rotAxis) };
      const fGeo = new THREE.BufferGeometry();
      fGeo.setAttribute("position", new THREE.Float32BufferAttribute(cfg.verts, 3));
      fGeo.computeVertexNormals();
      const fMesh = new THREE.Mesh(
        fGeo,
        new THREE.MeshStandardMaterial({ color: "#f5efe0", roughness: 0.75, side: THREE.DoubleSide }),
      );
      pivot.add(fMesh);
      this.outletFlaps.push(pivot);
      this.outletFlapsGroup.add(pivot);
    }
    this.outletFlapsGroup.visible = false;
    this.scene.add(this.outletFlapsGroup);
    this.outletOpening = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.1),
      new THREE.MeshStandardMaterial({ color: "#1b1f24", roughness: 0.9 }),
    );
    markCadAuxiliary(this.outletOpening);
    this.outletOpening.position.set(OUTLET.x, OUTLET.y, PAPER_Z + 0.0003);
    this.outletOpening.visible = false;
    this.scene.add(this.outletOpening);

    // Pencil line on the plaster, under the paper: the drop's dry edge is brought onto it.
    this.plumbLine = meshBox([0.007, 1, 0.001], "#0891b2", 0.35);
    markCadAuxiliary(this.plumbLine);
    this.plumbLine.position.set(PLUMB_X, 1.36, WALL_FRONT_Z + 0.0015);
    this.scene.add(this.plumbLine);

    this.outlet = new THREE.Group();
    const plate = new THREE.Mesh(
      new RoundedBoxGeometry(0.17, 0.115, 0.022, 4, 0.004),
      new THREE.MeshPhysicalMaterial({
        color: "#e8e6de",
        roughness: 0.24,
        clearcoat: 0.65,
        clearcoatRoughness: 0.18,
      }),
    );
    this.outlet.add(plate);
    for (const x of [-0.042, 0.042]) {
      // Recessed duplex socket face
      const socketFace = new THREE.Mesh(
        new RoundedBoxGeometry(0.052, 0.068, 0.005, 3, 0.004),
        new THREE.MeshStandardMaterial({ color: "#dcdad0", roughness: 0.36 }),
      );
      socketFace.position.set(x, 0, 0.011);
      this.outlet.add(socketFace);
      for (const y of [-0.015, 0.015]) {
        const slot = meshBox([0.006, 0.022, 0.006], "#181d20", 0.5);
        slot.position.set(x - 0.008, y, 0.013);
        this.outlet.add(slot);
        const slotR = meshBox([0.006, 0.018, 0.006], "#181d20", 0.5);
        slotR.position.set(x + 0.008, y, 0.013);
        this.outlet.add(slotR);
      }
      // Ground pin aperture
      const groundPin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0042, 0.0042, 0.006, 12),
        new THREE.MeshStandardMaterial({ color: "#181d20", roughness: 0.5 }),
      );
      groundPin.rotation.x = Math.PI / 2;
      groundPin.position.set(x, -0.024, 0.013);
      this.outlet.add(groundPin);
    }
    // Center faceplate mounting screw
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0045, 0.0045, 0.005, 14),
      new THREE.MeshStandardMaterial({ color: "#b8b4a8", roughness: 0.28, metalness: 0.8 }),
    );
    screw.rotation.x = Math.PI / 2;
    screw.position.set(0, 0, 0.012);
    this.outlet.add(screw);
    this.outlet.position.copy(OUTLET);
    this.architectureGroup.add(this.outlet);

    this.outletRing = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.134, 48),
      new THREE.MeshBasicMaterial({ color: "#f59e0b", transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    markCadAuxiliary(this.outletRing);
    this.outletRing.position.set(OUTLET.x, OUTLET.y, OUTLET_FRONT_Z + 0.004);
    this.scene.add(this.outletRing);

    this.displayRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, DROP_W, 48), this.drops[0].material);
    this.displayRoll.rotation.z = Math.PI / 2;
    this.displayRoll.position.set(-0.72, 0.1, 0.58);
    this.displayRoll.castShadow = true;
    const dispCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, DROP_W + 0.004, 32),
      kraftCoreMat,
    );
    this.displayRoll.add(dispCore);
    const dispHole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.031, 0.031, DROP_W + 0.006, 32),
      new THREE.MeshStandardMaterial({ color: "#2d2115", roughness: 0.95 }),
    );
    this.displayRoll.add(dispHole);
    this.toolsGroup.add(this.displayRoll);

    this.productLabel.position.set(-0.72, 0.32, 0.36);
    this.productLabel.rotation.x = -0.14;
    this.toolsGroup.add(this.productLabel);

    // Positions are rewritten every seek so each relief cut grows with the blade.
    const cutPoints = new Array(12).fill(0);
    this.outletCuts = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(cutPoints, 3)),
      new THREE.LineBasicMaterial({ color: "#b91c1c", linewidth: 2 }),
    );
    markCadAuxiliary(this.outletCuts);
    this.scene.add(this.outletCuts);

    this.fillerPatch = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 40),
      new THREE.MeshStandardMaterial({ color: "#f3efe4", roughness: 0.9 }),
    );
    this.fillerPatch.position.set(-0.25, 1.22, WALL_FRONT_Z + 0.002);
    this.architectureGroup.add(this.fillerPatch);

    this.hangHands.add(this.hangLeft, this.hangRight);
    for (const tool of [
      this.level,
      this.roller,
      this.smoother,
      this.knife,
      this.straightedge,
      this.fillingKnife,
      this.pasteBrush,
      this.sponge,
      this.pencil,
      this.tape,
      this.voltageTester,
      this.hangHands,
    ]) {
      tool.traverse((child) => {
        if (child instanceof THREE.Mesh) child.castShadow = true;
      });
      this.toolsGroup.add(tool);
    }
    this.scene.add(this.toolsGroup);

    // The patterned paper keeps its printed texture in BOTH styles (outlines are added on top), so pattern-match
    // steps stay meaningful in the line-drawing style instead of turning into blank cream sheets.
    this.paperMeshes = [...this.drops, ...this.rolls, this.displayRoll, this.overhangStrip, this.productLabel].map((mesh) => ({
      mesh,
      material: mesh.material as THREE.Material,
    }));
    // Upgrade all 3D groups with our MIT-licensed CAD Cel + Fat Ink Creases + BackSide Hull Silhouettes
    upgradeGroupToLineArt(this.architectureGroup, {
      thresholdAngle: 24,
      includeHull: false,
      celBaseHex: 0xf4f2ec,
      tintAmt: 0.0,
      drawingLineWidth: 1.5,
    });
    upgradeGroupToLineArt(this.dropsGroup, {
      thresholdAngle: 22,
      includeHull: true,
      celBaseHex: 0xfaf8f2,
      tintAmt: 0.16,
      drawingLineWidth: 1.85,
    });
    upgradeGroupToLineArt(this.toolsGroup, {
      thresholdAngle: 22,
      includeHull: true,
      celBaseHex: 0xfffbeb,
      tintAmt: 0.34,
      drawingLineWidth: 2.15,
    });
    // Relief flaps are open triangles: outline them, but no silhouette hull (it would render as solid black wedges).
    upgradeGroupToLineArt(this.outletFlapsGroup, {
      thresholdAngle: 22,
      includeHull: false,
      celBaseHex: 0xfaf8f2,
      tintAmt: 0.16,
      drawingLineWidth: 1.9,
    });

    this.resize();
    this.applyCurrentViewMaterials();
    this.seek(0, 0, "verify");
    this.animate();
  }

  private applyCurrentViewMaterials() {
    applyGroupViewMode(this.architectureGroup, {
      viewMode: this.view,
      emphasis: "context",
    });
    applyGroupViewMode(this.dropsGroup, {
      viewMode: this.view,
      emphasis: "active",
    });
    applyGroupViewMode(this.outletFlapsGroup, {
      viewMode: this.view,
      emphasis: "active",
    });
    applyGroupViewMode(this.toolsGroup, {
      viewMode: this.view,
      emphasis: "accent",
    });
    // Drawing view prints the paper pattern flat (unlit, untone-mapped) like ink on a manual page instead of
    // a lit PBR sheet sitting inside an otherwise cel-shaded illustration.
    for (const { mesh, material } of this.paperMeshes) {
      mesh.material = this.view === "drawing" ? this.flatPaper(material) : material;
    }
  }

  private readonly flatPaperCache = new WeakMap<THREE.Material, THREE.MeshBasicMaterial>();
  private flatPaper(material: THREE.Material): THREE.MeshBasicMaterial {
    let flat = this.flatPaperCache.get(material);
    if (!flat) {
      flat = new THREE.MeshBasicMaterial({
        map: (material as THREE.MeshStandardMaterial).map ?? null,
        side: THREE.DoubleSide,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      this.flatPaperCache.set(material, flat);
    }
    return flat;
  }

  private setDrop(index: number, state: DropState) {
    // Deterministic: every call rebuilds the drop from its pristine vertex buffer, so scrubbing never drifts.
    const drop = this.drops[index];
    const p = THREE.MathUtils.clamp(state.reveal, 0, 1);
    const trimTop = THREE.MathUtils.clamp(state.trimTop ?? 0, 0, 1);
    const trimBottom = THREE.MathUtils.clamp(state.trimBottom ?? 0, 0, 1);
    drop.visible = state.visible && p > 0.001;
    drop.position.x = drop.userData.baseX + (state.xOffset ?? 0);
    drop.position.y = WALL_H / 2 + (state.yOffset ?? 0);
    const roll = this.rolls[index];
    roll.visible = drop.visible && p < 0.995;
    if (!drop.visible) return;

    const position = drop.geometry.attributes.position;
    const original = drop.userData.original;
    const threshold = DROP_H / 2 - p * DROP_H; // local y of the unrolled edge (the roll sits here)
    const baseY = drop.position.y;
    const baseZ = drop.position.z;
    for (let i = 0; i < position.count; i++) {
      const x = original[i * 3];
      const u = (x + DROP_W / 2) / DROP_W; // 0 = left edge, 1 = right edge
      let worldY = baseY + Math.max(original[i * 3 + 1], threshold);
      // Allowance already cut away collapses onto the junction line.
      if (trimTop > 0 && u <= trimTop + 1e-6 && worldY > CORNICE_BOTTOM) worldY = CORNICE_BOTTOM;
      if (trimBottom > 0 && u <= trimBottom + 1e-6 && worldY < SKIRTING_TOP) worldY = SKIRTING_TOP;
      // Uncut allowance drapes over the cornice cove / skirting ogee instead of passing through them.
      let z = 0;
      if (worldY > CORNICE_BOTTOM) z = WALL_FRONT_Z + corniceDepth(worldY - CORNICE_BOTTOM) + 0.0015 - baseZ;
      else if (worldY < SKIRTING_TOP) z = WALL_FRONT_Z + skirtingDepth(worldY) + 0.0015 - baseZ;
      position.setXYZ(i, x, worldY - baseY, Math.max(0, z));
    }
    position.needsUpdate = true;
    drop.geometry.computeVertexNormals();
    // The vertices move every seek; refresh bounds or Three.js frustum-culls the drop using a stale
    // (collapsed) bounding sphere, which made hung paper vanish in low/close camera shots.
    drop.geometry.computeBoundingSphere();
    drop.geometry.computeBoundingBox();
    this.refreshOutline(drop);
    roll.position.set(drop.position.x, baseY + threshold, PAPER_Z + 0.044);
  }

  /**
   * Drawing view: rebuild the drop's ink outline from its live boundary. The EdgesGeometry was computed once
   * from the full-height plane, so a half-unrolled drop used to be drawn as a full-height ink rectangle.
   * The interleaved buffer is updated in place (no per-seek GPU buffer allocation during a 9,000-frame export).
   */
  private refreshOutline(drop: DropMesh) {
    const lines = drop.children.find((c) => (c as LineSegments2).isLineSegments2) as LineSegments2 | undefined;
    if (!lines) return;
    const pos = drop.geometry.attributes.position;
    const cols = DROP_SEGMENTS_X + 1;
    const rows = DROP_SEGMENTS_Y + 1;
    const ring: number[] = [];
    for (let c = 0; c < cols; c++) ring.push(c); // top row (PlaneGeometry row 0 is the top)
    for (let r = 1; r < rows; r++) ring.push(r * cols + cols - 1); // right edge
    for (let c = cols - 2; c >= 0; c--) ring.push((rows - 1) * cols + c); // bottom row
    for (let r = rows - 2; r > 0; r--) ring.push(r * cols); // left edge
    const out = new Float32Array(ring.length * 6);
    for (let k = 0; k < ring.length; k++) {
      const a = ring[k];
      const b = ring[(k + 1) % ring.length];
      out[k * 6] = pos.getX(a);
      out[k * 6 + 1] = pos.getY(a);
      out[k * 6 + 2] = pos.getZ(a);
      out[k * 6 + 3] = pos.getX(b);
      out[k * 6 + 4] = pos.getY(b);
      out[k * 6 + 5] = pos.getZ(b);
    }
    const geo = lines.geometry as LineSegmentsGeometry;
    const start = geo.getAttribute("instanceStart") as THREE.InterleavedBufferAttribute | undefined;
    if (start && start.data.array.length === out.length) {
      (start.data.array as Float32Array).set(out);
      start.data.needsUpdate = true;
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
    } else {
      geo.setPositions(out);
    }
  }

  private get toolList(): THREE.Object3D[] {
    return [
      this.level,
      this.roller,
      this.smoother,
      this.knife,
      this.straightedge,
      this.fillingKnife,
      this.pasteBrush,
      this.sponge,
      this.pencil,
      this.tape,
      this.voltageTester,
      this.hangHands,
    ];
  }

  private hideTools() {
    // Reset the full pose, not just visibility: an operation that only set rotation.z used to inherit
    // rotation.x/y and scale from whichever operation was seeked before it (history-dependent frames).
    for (const tool of this.toolList) {
      tool.visible = false;
      tool.position.set(0, 0, 0);
      tool.rotation.set(0, 0, 0);
      tool.scale.set(1, 1, 1);
    }
    for (const hand of [this.hangLeft, this.hangRight]) {
      hand.position.set(0, 0, 0);
      hand.rotation.set(0, 0, 0);
    }
    this.overhangStrip.visible = false;
    this.outletFlapsGroup.visible = false;
    this.outletOpening.visible = false;
    this.fillerPatch.visible = false;
  }

  /** Moves `tool` along the wall normal until its working face (glove excluded) rests on the plane z = surfaceZ. */
  private touch(tool: THREE.Object3D, surfaceZ: number) {
    tool.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    let minZ = Infinity;
    tool.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || (mesh.parent as THREE.Mesh | null)?.isMesh) return; // skip ink hulls / edge lines
      for (let p: THREE.Object3D | null = mesh; p && p !== tool; p = p.parent) if (p.name === "glove") return;
      const attr = mesh.geometry.getAttribute("position");
      for (let i = 0; i < attr.count; i++) {
        v.fromBufferAttribute(attr, i).applyMatrix4(mesh.matrixWorld);
        if (v.z < minZ) minZ = v.z;
      }
    });
    if (Number.isFinite(minZ)) tool.position.z += surfaceZ - minZ;
  }

  /** Translates `tool` so the local point `tipLocal` (e.g. a blade or probe tip) lands exactly on `target`. */
  private anchorTip(tool: THREE.Object3D, tipLocal: THREE.Vector3, target: THREE.Vector3) {
    tool.updateMatrixWorld(true);
    const tip = tool.localToWorld(tipLocal.clone());
    tool.position.add(target.clone().sub(tip));
    tool.updateMatrixWorld(true);
  }

  /**
   * Blade pose: travelling along `travel` (wall plane), blade tipped `angle` rad into the wall with the tip
   * trailing the hand, and the blade plane perpendicular to the wall along the cut line.
   */
  private bladeQuaternion(travel: THREE.Vector3, angle: number): THREE.Quaternion {
    const t = travel.clone().normalize();
    const n = new THREE.Vector3(0, 0, 1);
    const yAxis = t.clone().multiplyScalar(-Math.cos(angle)).addScaledVector(n, -Math.sin(angle)).normalize();
    const zAxis = n.clone().cross(t).normalize();
    const xAxis = yAxis.clone().cross(zAxis).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
  }

  /** W-pattern paste roller pass whose leading edge is the coverage edge (adhesive appears where the roller is). */
  private rollPaste(lane: THREE.Mesh, centreX: number, coverage: number) {
    const c = THREE.MathUtils.clamp(coverage, 0, 1);
    lane.visible = true;
    lane.scale.y = Math.max(0.001, c);
    lane.position.y = 2.67 - (DROP_H * c) / 2;
    const edgeY = 2.67 - DROP_H * c;
    this.roller.visible = true;
    this.roller.position.set(centreX + Math.sin(c * Math.PI * 7) * 0.13, Math.max(0.2, edgeY + 0.03), 0);
    this.roller.rotation.z = Math.cos(c * Math.PI * 7) * 0.1;
    this.touch(this.roller, PASTE_Z + 0.0005);
    this.focusWorld.set(this.roller.position.x, Math.max(0.2, edgeY + 0.03), PASTE_Z);
  }

  /** Two-handed dry hang: hold the top corners while sliding onto the plumb/pattern, then guide the roll down. */
  private hangDrop(index: number, p: number, slideX: number, slideY: number, trimmed: number) {
    const holdEnd = 0.3;
    const slide = 1 - THREE.MathUtils.smoothstep(p, 0, holdEnd);
    const reveal = p < holdEnd ? 0.2 : 0.2 + ((p - holdEnd) / (1 - holdEnd)) * 0.8;
    this.setDrop(index, { reveal, visible: true, xOffset: slideX * slide, yOffset: slideY * slide, trimTop: trimmed, trimBottom: trimmed });
    const drop = this.drops[index];
    const left = drop.position.x - DROP_W / 2;
    const right = drop.position.x + DROP_W / 2;
    this.hangHands.visible = true;
    if (p < holdEnd) {
      // Palms flat on the paper at the top corners, fingers up.
      const y = drop.position.y + DROP_H / 2 - 0.09;
      this.hangLeft.position.set(left + 0.05, y, PAPER_Z + 0.017);
      this.hangRight.position.set(right - 0.05, y, PAPER_Z + 0.017);
      this.focusWorld.set(right, y - 0.05, PAPER_Z);
    } else {
      // Fingers wrapped onto the roll ends while it is lowered.
      const y = this.rolls[index].position.y;
      this.hangLeft.position.set(left - 0.012, y, PAPER_Z + 0.044);
      this.hangLeft.rotation.set(0, 0, -Math.PI / 2);
      this.hangRight.position.set(right + 0.012, y, PAPER_Z + 0.044);
      this.hangRight.rotation.set(0, 0, Math.PI / 2);
      this.focusWorld.set(right, y - 0.06, PAPER_Z);
    }
  }

  /** Centre-out smoothing: each stroke starts on the drop centre line and travels outward and slightly down. */
  private smoothStrokes(centreX: number, p: number, topY: number) {
    const stroke = Math.min(5, Math.floor(p * 6));
    const local = p * 6 - stroke;
    const dir = stroke % 2 ? -1 : 1;
    const y0 = topY - Math.floor(stroke / 2) * 0.62;
    this.smoother.visible = true;
    this.smoother.position.set(centreX + dir * local * 0.17, y0 - local * 0.1, 0);
    this.smoother.rotation.z = dir * -0.45;
    this.touch(this.smoother, PAPER_Z + 0.0005);
    this.focusWorld.set(this.smoother.position.x, this.smoother.position.y, PAPER_Z);
    return dir;
  }

  seek(stepIndex: number, progress: number, operation: Operation) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    this.currentProgress = p;
    this.currentOperation = operation;
    if (!this.exporting) this.lastSeek = { stepIndex, progress: p, operation };
    const stepChanged = stepIndex !== this.currentStep;
    const firstSeek = this.currentStep === -1;
    this.currentStep = stepIndex;
    this.hideTools();
    this.displayRoll.visible = operation === "verify";
    this.productLabel.visible = operation === "verify";
    // Faceplate is off from the relief cuts until it is refitted at the end of the outlet step.
    this.outlet.visible = !(operation === "match" || (operation === "outlet" && p < 0.9));
    this.outletCuts.visible = operation === "outlet" && p > 0.08;
    this.outletRing.visible = operation === "safety" || operation === "outlet";
    this.outletRing.scale.setScalar(operation === "safety" ? 1 + Math.sin(p * Math.PI * 4) * 0.08 : 1);
    this.ghostLines.visible = operation === "layout";
    this.plumbLine.visible = ["plumb", "measure", "paste", "hang", "smooth"].includes(operation);
    this.plumbLine.scale.y = 2.58;
    this.plumbLine.position.y = 2.65 - 2.58 / 2;
    this.rakeLight.intensity = 0;
    this.keyLight.intensity = 3.35;
    this.paste.forEach((lane) => {
      lane.visible = false;
      lane.scale.y = 1;
      lane.position.y = WALL_H / 2;
      lane.position.z = PASTE_Z;
    });
    this.drops.forEach((_, i) => this.setDrop(i, { reveal: 0, visible: false }));

    // Persistent state from earlier steps (a pure function of the operation, never of seek history).
    const after = (op: Operation) => {
      const order: Operation[] = ["verify", "safety", "prepare", "layout", "plumb", "measure", "paste", "hang", "smooth", "trim", "match", "outlet", "clean", "inspect"];
      return order.indexOf(operation) > order.indexOf(op);
    };
    if (after("hang") && operation !== "trim") this.setDrop(0, { reveal: 1, visible: true, trimTop: after("trim") ? 1 : 0, trimBottom: after("trim") ? 1 : 0 });
    if (after("match")) this.setDrop(1, { reveal: 1, visible: true, trimTop: 1, trimBottom: 1 });
    if (operation === "inspect") for (let i = 2; i < 6; i++) this.setDrop(i, { reveal: 1, visible: true, trimTop: 1, trimBottom: 1 });

    const tipOfKnife = new THREE.Vector3(0.0035, 0.164, 0);
    switch (operation) {
      case "verify": {
        this.focusWorld.set(-0.72, 0.33, 0.37);
        this.detailCamOffset.set(0.12, 0.08, 0.85);
        this.detailTagEl.textContent = "ROLL LABEL & BATCH";
        break;
      }
      case "safety": {
        // Probe goes into the socket and is held there while the tester reads, then withdraws.
        this.voltageTester.visible = true;
        const d = new THREE.Vector3(-0.3, 0.3, -0.9).normalize();
        this.voltageTester.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
        const contact = THREE.MathUtils.smoothstep(p, 0.12, 0.3) * (1 - THREE.MathUtils.smoothstep(p, 0.78, 0.94));
        const slot = new THREE.Vector3(OUTLET.x - 0.05, OUTLET.y + 0.015, OUTLET_FRONT_Z - 0.004);
        this.anchorTip(this.voltageTester, new THREE.Vector3(0, 0.106, 0), slot.addScaledVector(d, -(1 - contact) * 0.05));
        this.focusWorld.set(OUTLET.x - 0.05, OUTLET.y + 0.015, OUTLET_FRONT_Z);
        this.detailCamOffset.set(0.14, 0.06, 0.36);
        this.detailTagEl.textContent = "VERIFY ISOLATION";
        break;
      }
      case "prepare": {
        this.fillerPatch.visible = true;
        const knifePhase = THREE.MathUtils.clamp(p / 0.48, 0, 1);
        // Patch stands 4 mm proud until the filling knife has worked it flush.
        this.fillerPatch.position.z = WALL_FRONT_Z + 0.002 + (1 - knifePhase) * 0.004;
        if (p < 0.48) {
          const tool = this.fillingKnife;
          tool.visible = true;
          tool.rotation.set(-0.45, 0, 0.25);
          const pass = Math.floor(knifePhase * 3);
          const local = knifePhase * 3 - pass;
          const sx = pass % 2 ? 1 - local : local;
          this.anchorTip(tool, new THREE.Vector3(0, 0.113, 0), new THREE.Vector3(-0.36 + sx * 0.22, 1.2 + pass * 0.025, WALL_FRONT_Z + 0.001));
          this.focusWorld.set(-0.25, 1.22, WALL_FRONT_Z);
          this.detailTagEl.textContent = "FLUSH COMPOUND FILL";
        } else {
          const tool = this.sponge;
          tool.visible = true;
          const local = (p - 0.48) / 0.52;
          tool.position.set(-0.25 + Math.sin(local * Math.PI * 4) * 0.12, 1.42 - local * 0.4, 0);
          tool.rotation.z = Math.sin(local * 15) * 0.2;
          this.touch(tool, WALL_FRONT_Z + 0.0005);
          this.focusWorld.set(tool.position.x, tool.position.y, WALL_FRONT_Z);
          this.detailTagEl.textContent = "DAMP SPONGE PREP";
        }
        this.detailCamOffset.set(0.16, 0.08, 0.44);
        break;
      }
      case "layout": {
        // Tick the drop boundaries at eye level, one after another, against the dry-lay ghost drops.
        this.pencil.visible = true;
        const k = Math.min(3, Math.floor(p * 4));
        const local = p * 4 - k;
        const x = FIRST_X + DROP_W / 2 + k * DROP_W;
        this.pencil.rotation.set(-0.85, 0, -0.35);
        this.anchorTip(this.pencil, new THREE.Vector3(0, 0.122, 0), new THREE.Vector3(x, 1.62 - local * 0.05, WALL_FRONT_Z + 0.0005));
        this.focusWorld.set(x, 1.6, WALL_FRONT_Z);
        this.detailCamOffset.set(0.15, 0.08, 0.42);
        this.detailTagEl.textContent = "530 MM DROP SET-OUT";
        break;
      }
      case "plumb": {
        // Level held against the wall, pencil drawing down its edge; the line exists only where it is drawn.
        this.level.visible = true;
        const y = 2.05 - p * 1.35;
        this.level.position.set(PLUMB_X - 0.042, y, 0);
        this.touch(this.level, WALL_FRONT_Z);
        this.pencil.visible = true;
        this.pencil.rotation.set(-0.85, 0, 0.5);
        const tipY = y + 0.3;
        this.anchorTip(this.pencil, new THREE.Vector3(0, 0.122, 0), new THREE.Vector3(PLUMB_X, tipY, WALL_FRONT_Z + 0.0005));
        const drawn = Math.max(0.01, 2.65 - tipY);
        this.plumbLine.scale.y = drawn;
        this.plumbLine.position.y = 2.65 - drawn / 2;
        this.focusWorld.set(PLUMB_X, y, WALL_FRONT_Z);
        this.detailCamOffset.set(0.16, 0.05, 0.44);
        this.detailTagEl.textContent = "SPIRIT LEVEL VIAL & PLUMB";
        break;
      }
      case "measure": {
        this.tape.visible = true;
        const blade = this.tape.getObjectByName("tapeBlade");
        const length = 0.15 + p * (2.67 - SKIRTING_TOP - 0.15);
        if (blade) {
          blade.scale.y = length;
          blade.position.y = length / 2;
        }
        this.tape.position.set(FIRST_X - DROP_W / 2 + 0.03, SKIRTING_TOP, 0);
        this.touch(this.tape, WALL_FRONT_Z);
        this.focusWorld.set(this.tape.position.x, SKIRTING_TOP + length, WALL_FRONT_Z);
        this.detailCamOffset.set(0.18, 0.06, 0.46);
        this.detailTagEl.textContent = "HEIGHT + 2–3 CM TOP ALLOWANCE";
        break;
      }
      case "paste": {
        if (p < 0.72) {
          this.rollPaste(this.paste[0], FIRST_X, p / 0.72);
          this.detailTagEl.textContent = "PASTE SLIGHTLY WIDER THAN DROP";
        } else {
          this.paste[0].visible = true;
          this.pasteBrush.visible = true;
          const brushProgress = (p - 0.72) / 0.28;
          this.pasteBrush.position.set(FIRST_X - DROP_W / 2 + brushProgress * DROP_W, CORNICE_BOTTOM - 0.04, 0);
          this.pasteBrush.rotation.z = Math.PI / 2;
          this.touch(this.pasteBrush, PASTE_Z);
          this.focusWorld.set(this.pasteBrush.position.x, CORNICE_BOTTOM - 0.02, PASTE_Z);
          this.detailTagEl.textContent = "BRUSH CUT-IN AT CORNICE";
        }
        this.detailCamOffset.set(0.22, 0.06, 0.52);
        break;
      }
      case "hang": {
        this.paste[0].visible = true;
        // Dry drop arrives 3 cm off the plumb line and is slid onto it before it is lowered.
        this.hangDrop(0, p, 0.03, 0, 0);
        this.detailCamOffset.set(0.2, 0.06, 0.48);
        this.detailTagEl.textContent = "PLUMB EDGE ALIGNMENT";
        break;
      }
      case "smooth": {
        this.setDrop(0, { reveal: 1, visible: true });
        this.smoothStrokes(FIRST_X, p, 2.3);
        this.detailCamOffset.set(0.18, 0.06, 0.42);
        this.detailTagEl.textContent = "CENTRE-OUT SMOOTHING";
        break;
      }
      case "trim": {
        const top = p < 0.5;
        const local = THREE.MathUtils.clamp(top ? p * 2 : (p - 0.5) * 2, 0, 1);
        const yJunction = top ? CORNICE_BOTTOM : SKIRTING_TOP;
        this.setDrop(0, { reveal: 1, visible: true, trimTop: top ? local : 1, trimBottom: top ? 0 : local });
        const left = FIRST_X - DROP_W / 2;

        this.straightedge.visible = true;
        this.straightedge.position.set(FIRST_X, yJunction + (top ? -0.029 : 0.029), 0);
        this.touch(this.straightedge, PAPER_Z + 0.0005);

        this.knife.visible = true;
        this.knife.quaternion.copy(this.bladeQuaternion(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(35)));
        const tip = new THREE.Vector3(left + local * DROP_W, yJunction, PAPER_Z + 0.0005);
        this.anchorTip(this.knife, tipOfKnife, tip);

        // The strip that has been cut so far peels away from the junction.
        const overlap = top ? 2.67 - CORNICE_BOTTOM : SKIRTING_TOP - 0.03;
        if (local > 0.02) {
          this.overhangStrip.visible = true;
          this.overhangStrip.scale.set(local * DROP_W, overlap, 1);
          this.overhangStrip.position.set(left + (local * DROP_W) / 2, top ? CORNICE_BOTTOM + overlap / 2 : 0.03 + overlap / 2, PAPER_Z + 0.02 + local * 0.03);
          this.overhangStrip.rotation.set((top ? -1 : 1) * (0.35 + local * 0.5), 0, 0);
        }
        this.focusWorld.copy(tip);
        this.detailCamOffset.set(0.14, top ? -0.06 : 0.08, 0.38);
        this.detailTagEl.textContent = top ? "CORNICE STRAIGHTEDGE TRIM" : "SKIRTING GUIDED BLADE TRIM";
        break;
      }
      case "match": {
        this.setDrop(0, { reveal: 1, visible: true, trimTop: 1, trimBottom: 1 });
        this.paste[1].visible = true;
        if (p < 0.24) {
          this.rollPaste(this.paste[1], FIRST_X + DROP_W, p / 0.24);
        } else if (p < 0.8) {
          // Second dry drop arrives 4 cm high and 2 cm off the seam, then slides down into pattern match and butts the seam.
          this.hangDrop(1, (p - 0.24) / 0.56, 0.02, 0.04, 0);
        } else {
          this.setDrop(1, { reveal: 1, visible: true });
          this.smoothStrokes(FIRST_X + DROP_W, (p - 0.8) / 0.2, 2.3);
        }
        this.detailCamOffset.set(0.16, 0.05, 0.4);
        this.detailTagEl.textContent = "PATTERN MATCH AT THE SEAM";
        break;
      }
      case "outlet": {
        // Plate off, two relief diagonals cut corner-to-corner, flaps folded back, trim, plate refitted.
        const hw = 0.075;
        const hh = 0.05;
        const cut1 = THREE.MathUtils.clamp((p - 0.08) / 0.3, 0, 1);
        const cut2 = THREE.MathUtils.clamp((p - 0.42) / 0.3, 0, 1);
        const a0 = new THREE.Vector3(OUTLET.x - hw, OUTLET.y + hh, PAPER_Z + 0.0005);
        const a1 = new THREE.Vector3(OUTLET.x + hw, OUTLET.y - hh, PAPER_Z + 0.0005);
        const b0 = new THREE.Vector3(OUTLET.x + hw, OUTLET.y + hh, PAPER_Z + 0.0005);
        const b1 = new THREE.Vector3(OUTLET.x - hw, OUTLET.y - hh, PAPER_Z + 0.0005);
        const c1 = a0.clone().lerp(a1, cut1);
        const c2 = b0.clone().lerp(b1, cut2);
        const cutAttr = this.outletCuts.geometry.getAttribute("position") as THREE.BufferAttribute;
        cutAttr.setXYZ(0, a0.x, a0.y, a0.z + 0.0007);
        cutAttr.setXYZ(1, c1.x, c1.y, c1.z + 0.0007);
        cutAttr.setXYZ(2, b0.x, b0.y, b0.z + 0.0007);
        cutAttr.setXYZ(3, cut2 > 0 ? c2.x : b0.x, cut2 > 0 ? c2.y : b0.y, b0.z + 0.0007);
        cutAttr.needsUpdate = true;
        this.outletCuts.geometry.computeBoundingSphere();
        if (p < 0.74) {
          const second = p >= 0.42;
          const from = second ? b0 : a0;
          const to = second ? b1 : a1;
          this.knife.visible = true;
          this.knife.scale.setScalar(0.82);
          this.knife.quaternion.copy(this.bladeQuaternion(to.clone().sub(from), THREE.MathUtils.degToRad(40)));
          this.anchorTip(this.knife, tipOfKnife, second ? c2 : c1); // localToWorld already applies the 0.82 scale
          this.focusWorld.copy(second ? c2 : c1);
        } else {
          this.focusWorld.set(OUTLET.x, OUTLET.y, PAPER_Z);
        }
        this.outletFlapsGroup.visible = p < 0.9;
        const foldAngle = THREE.MathUtils.smoothstep(p, 0.74, 0.86) * 1.35;
        this.outletOpening.visible = foldAngle > 0.05 && p < 0.9;
        for (const flap of this.outletFlaps) {
          flap.setRotationFromAxisAngle(flap.userData.axis as THREE.Vector3, foldAngle);
        }
        this.detailCamOffset.set(0.13, 0.05, 0.34);
        this.detailTagEl.textContent = "OUTLET RELIEF CUTS (POWER OFF)";
        break;
      }
      case "clean": {
        this.sponge.visible = true;
        this.sponge.position.set(FIRST_X + DROP_W / 2 + Math.sin(p * 16) * 0.025, 2.2 - p * 1.65, 0);
        this.sponge.rotation.z = Math.sin(p * 12) * 0.22;
        this.touch(this.sponge, PAPER_Z + 0.0005);
        this.focusWorld.set(FIRST_X + DROP_W / 2, this.sponge.position.y, PAPER_Z);
        this.detailCamOffset.set(0.16, 0.06, 0.42);
        this.detailTagEl.textContent = "DAMP SPONGE SEAM WIPE";
        break;
      }
      case "inspect": {
        // Raking light swings in: the key light drops and a grazing light picks out seam and surface relief.
        const k = THREE.MathUtils.smoothstep(p, 0.05, 0.4);
        this.rakeLight.intensity = 3.4 * k;
        this.keyLight.intensity = 3.35 * (1 - 0.55 * k);
        this.focusWorld.set(FIRST_X + DROP_W * 0.5, 1.38, PAPER_Z);
        this.detailCamOffset.set(0.22, 0.08, 0.52);
        this.detailTagEl.textContent = "RAKING LIGHT SEAM CHECK";
        break;
      }
    }
    this.detailTagEl.textContent = `${LOUPE_MAG}× ${this.detailTagEl.textContent}`;
    this.applyExploded();
    this.applyCurrentViewMaterials();
    this.buildCallouts();
    // Camera framing depends on the work point computed above, so apply it last.
    // Export: exact shot every frame (deterministic). Interactive: the shot is the goal the camera eases to.
    this.computeShot(operation);
    if (stepChanged) this.followCamera = true;
    if (this.exporting || firstSeek) this.cameraPreset(operation);
  }

  setShowLoupe(show: boolean) {
    this.showLoupe = show;
    this.insetCanvas.style.display = show ? "block" : "none";
    this.detailTagEl.style.display = show ? "block" : "none";
  }

  /** ⇧N: toggle world-anchored part / junction callouts (also burned into exported frames). */
  setShowCallouts(show: boolean) {
    this.showCallouts = show;
    this.buildCallouts();
  }

  /** ⇧X: 0..1 layer separation (substrate → adhesive bed → wallcovering). Re-applies the current pose. */
  setExploded(amount: number) {
    this.exploded = THREE.MathUtils.clamp(amount, 0, 1);
    const { stepIndex, progress, operation } = this.lastSeek;
    this.currentStep = stepIndex;
    this.seek(stepIndex, progress, operation);
    this.followCamera = true;
  }

  /** Tools visible in the current pose, for the UI inventory bar's live highlight. */
  activeToolIds(): ToolId[] {
    const ids: ToolId[] = ["level", "roller", "smoother", "knife", "straightedge", "fillingKnife", "pasteBrush", "sponge", "pencil", "tape", "voltageTester"];
    return ids.filter((id) => this[id].visible);
  }

  /** Current work point in wall coordinates (metres), for the 2D manual figure's live marker. */
  workPoint(): { x: number; y: number } {
    return { x: this.focusWorld.x, y: this.focusWorld.y };
  }

  private applyExploded() {
    const e = this.exploded;
    // Fanned like an exploded parts drawing: each layer comes forward and steps left, so every face shows.
    this.dropsGroup.position.set(-e * 0.24, 0, e * 0.45);
    // Tools ride with the outermost layer so a smoother never ends up inside the gap.
    this.toolsGroup.position.set(-e * 0.24, 0, e * 0.45);
    for (let i = 0; i < this.paste.length; i++) {
      const lane = this.paste[i];
      lane.position.z = PASTE_Z + e * 0.22;
      lane.position.x = this.drops[i].userData.baseX - e * 0.12;
      // In the exploded view the adhesive bed under every hung drop is shown, even after it is covered.
      if (e > 0.01 && this.drops[i].visible) {
        lane.visible = true;
        lane.scale.y = Math.max(lane.scale.y, 1);
        lane.position.y = Math.min(lane.position.y, WALL_H / 2);
      }
    }
    this.outletFlapsGroup.position.set(OUTLET.x - e * 0.24, OUTLET.y, PAPER_Z + 0.0006 + e * 0.45);
  }

  private buildCallouts() {
    const list: Callout[] = [];
    if (this.showCallouts) {
      const tip = (obj: THREE.Object3D, local: [number, number, number]) => obj.localToWorld(new THREE.Vector3(...local));
      const add = (id: string, label: string, anchor: THREE.Vector3, dir: [number, number]) => list.push({ id, label, anchor, dir });
      if (this.knife.visible) add("K", "Snap-blade knife · 35° to wall", tip(this.knife, [0.0035, 0.164, 0]), [-1, 0.6]);
      if (this.straightedge.visible) add("S", "Straightedge", tip(this.straightedge, [0.22, 0, 0]), [1, 0.7]);
      if (this.level.visible) add("L", "Spirit level", tip(this.level, [0, 0.3, 0.02]), [-1, -0.3]);
      if (this.pencil.visible) add("P", "Pencil", tip(this.pencil, [0, 0.122, 0]), [1, -0.5]);
      if (this.roller.visible) add("R", "Paste roller", tip(this.roller, [0, 0, 0.046]), [-1, 0.2]);
      if (this.pasteBrush.visible) add("B", "Cut-in brush", tip(this.pasteBrush, [0, -0.06, 0]), [1, 0.6]);
      if (this.smoother.visible) add("M", "Smoother · centre-out", tip(this.smoother, [0.1, -0.05, 0]), [1, 0.4]);
      if (this.sponge.visible) add("G", "Damp sponge", tip(this.sponge, [0.07, 0, 0]), [1, 0.3]);
      if (this.tape.visible) add("T", "Tape · height + 2–3 cm", this.focusWorld.clone(), [1, 0.2]);
      if (this.fillingKnife.visible) add("F", "Filling knife", tip(this.fillingKnife, [0, 0.113, 0]), [1, 0.4]);
      if (this.voltageTester.visible) add("V", "Voltage tester", tip(this.voltageTester, [0, 0.106, 0]), [-1, 0.5]);
      if (this.plumbLine.visible) add("1", "Plumb line · 500 mm from corner", new THREE.Vector3(PLUMB_X, 2.2, WALL_FRONT_Z), [1, -0.3]);
      if (this.outlet.visible || this.outletFlapsGroup.visible) add("2", "Outlet · power isolated", new THREE.Vector3(OUTLET.x + 0.08, OUTLET.y, OUTLET_FRONT_Z), [1, 0.2]);
      if (this.drops[0].visible || this.currentOperation === "trim") {
        add("3", "Cornice junction", new THREE.Vector3(FIRST_X + DROP_W * 0.35, CORNICE_BOTTOM, PAPER_Z), [1, -0.6]);
        add("4", "Skirting junction", new THREE.Vector3(FIRST_X + DROP_W * 0.35, SKIRTING_TOP, PAPER_Z), [1, 0.6]);
      }
    }
    if (this.exploded > 0.01) {
      const add = (id: string, label: string, anchor: THREE.Vector3, dir: [number, number]) => list.push({ id, label, anchor, dir });
      {
        add("A", "Wall substrate (sound, clean, primed)", new THREE.Vector3(FIRST_X + 0.5, 2.1, WALL_FRONT_Z), [1, -0.3]);
        add("B", "Adhesive bed · wider than drop", new THREE.Vector3(FIRST_X + 0.12 - this.exploded * 0.12, 1.75, PASTE_Z + this.exploded * 0.22), [1, -0.2]);
        add("C", "Wallcovering drop", new THREE.Vector3(FIRST_X - 0.1 - this.exploded * 0.24, 1.0, PAPER_Z + this.exploded * 0.45), [-1, 0.4]);
      }
    }
    this.callouts = list;
  }

  private computeShot(operation: Operation) {
    const shot = this.shotFor(operation);
    const target = shot.anchor ? shot.anchor.clone().lerp(this.focusWorld, shot.follow) : this.focusWorld.clone();
    const offset = shot.offset.clone();
    if (this.exploded > 0.01) {
      // Swing to a three-quarter side view of the whole drop so the separated layers read as layers.
      target.lerp(new THREE.Vector3(FIRST_X + 0.05, 1.35, 0.2), this.exploded);
      // From the open (right) side: the return wall on the left would otherwise block the layer gap.
      offset.lerp(new THREE.Vector3(0.85, 0.35, 2.0), this.exploded);
    }
    this.shotTarget.copy(target);
    this.shotPosition.copy(target).add(offset);
  }

  /** Loupe circle in overlay pixels: the logical 1280×720 export layout, or the live CSS box of the loupe element. */
  private loupeCircle(w: number): { cx: number; cy: number; r: number } {
    if (this.exporting || this.insetCanvas.offsetWidth === 0) return { cx: w - 16 - 96, cy: 16 + 96, r: 96 };
    const r = this.insetCanvas.offsetWidth / 2;
    return { cx: this.insetCanvas.offsetLeft + r, cy: this.insetCanvas.offsetTop + r, r };
  }

  /**
   * Per-operation "shot": the camera looks at a blend of a fixed anchor and the moving work point, from an
   * operation-specific offset. A pure function of (operation, progress), so exported video is deterministic.
   */
  private shotFor(operation: Operation): { anchor: THREE.Vector3 | null; follow: number; offset: THREE.Vector3 } {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const top = this.currentProgress < 0.5;
    switch (operation) {
      case "verify": return { anchor: v(-0.72, 0.26, 0.42), follow: 0, offset: v(0.62, 0.5, 1.45) };
      case "safety": return { anchor: null, follow: 1, offset: v(0.26, 0.1, 0.72) };
      case "prepare": return { anchor: v(-0.25, 1.0, 0.1), follow: 0.5, offset: v(0.4, 0.12, 1.55) };
      case "layout": return { anchor: v(FIRST_X + DROP_W * 0.75, 1.45, 0.05), follow: 0.25, offset: v(0.5, 0.1, 2.3) };
      case "plumb": return { anchor: v(LEFT + 0.5, 1.35, 0.05), follow: 0.8, offset: v(0.34, 0.05, 1.15) };
      case "measure": return { anchor: v(FIRST_X, 1.3, 0.05), follow: 0.3, offset: v(0.65, 0.05, 2.55) };
      case "paste": return { anchor: v(FIRST_X, 1.45, 0.05), follow: 0.35, offset: v(0.5, 0.05, 1.85) };
      case "hang": return { anchor: v(FIRST_X, 1.35, 0.05), follow: 0.5, offset: v(0.6, 0.1, 2.25) };
      case "smooth": return { anchor: null, follow: 0.75, offset: v(0.34, 0.05, 1.25) };
      // Shot from the trailing side so the knife hand is beyond the blade, not between camera and cut.
      case "trim": return { anchor: null, follow: 1, offset: top ? v(-0.34, -0.16, 0.85) : v(-0.34, 0.26, 0.85) };
      case "match": return { anchor: v(FIRST_X + DROP_W * 0.5, 1.4, 0.05), follow: 0.4, offset: v(0.42, 0.05, 1.85) };
      case "outlet": return { anchor: null, follow: 1, offset: v(0.24, 0.09, 0.62) };
      case "clean": return { anchor: null, follow: 0.6, offset: v(0.34, 0.05, 1.25) };
      case "inspect": return { anchor: v(-0.03, 1.35, 0.05), follow: 0, offset: v(1.25, 0.15, 4.25) };
      default: return { anchor: v(0, 1.3, 0), follow: 0, offset: v(3.45, 1.05, 4.95) };
    }
  }

  private projectToScreen(world: THREE.Vector3, w: number, h: number): Pt2 {
    const v = world.clone().project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * w,
      y: (-v.y * 0.5 + 0.5) * h,
    };
  }

  private renderOverlays(w: number, h: number) {
    if (w < 10 || h < 10) return;
    this.leadsSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const parts: string[] = [];
    const isDrawing = this.view === "drawing";
    const arrowFill = isDrawing ? "#141414" : "#22d3ee";
    const arrowStroke = isDrawing ? "#ffffff" : "#050810";

    // 1. Render circular detail loupe & tangent leader line
    if (this.showLoupe && this.insetCtx) {
      const loupe = this.loupeCircle(w);
      // Solve the detail-camera distance so the loupe really shows LOUPE_MAG× the main view's on-screen scale:
      // mag = (loupeDiameter / mainViewHeight) · (D / d) · tan(fovMain/2) / tan(fovDetail/2).
      // The fixed offsets used before gave 1.0×–2.8× (4.7× on the overview) under a "3.5×" label.
      const mainH = this.mainViewPx ?? h;
      const D = this.camera.position.distanceTo(this.focusWorld);
      const tanMain = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const tanDetail = Math.tan(THREE.MathUtils.degToRad(this.detailCamera.fov / 2));
      const d = Math.max(0.07, ((2 * loupe.r) / mainH) * D * (tanMain / tanDetail) / LOUPE_MAG);
      this.detailCamera.position.copy(this.focusWorld).addScaledVector(this.detailCamOffset.clone().normalize(), d);
      this.detailCamera.lookAt(this.focusWorld);
      // Match the canvas aspect so the centre-square crop below is undistorted.
      this.detailCamera.aspect = this.renderer.domElement.width / Math.max(1, this.renderer.domElement.height);
      this.detailCamera.updateProjectionMatrix();
      this.detailCamera.updateMatrixWorld();

      this.outletRing.visible = false;
      this.renderer.render(this.scene, this.detailCamera);
      this.outletRing.visible = this.currentOperation === "safety" || this.currentOperation === "outlet";

      const ctx = this.insetCtx;
      const cw = this.insetCanvas.width;
      const ch = this.insetCanvas.height;
      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, cw / 2 - 4, 0, Math.PI * 2);
      ctx.clip();

      const domCanvas = this.renderer.domElement;
      const side = Math.min(domCanvas.width, domCanvas.height);
      const sx = (domCanvas.width - side) * 0.5;
      const sy = (domCanvas.height - side) * 0.5;
      ctx.drawImage(domCanvas, sx, sy, side, side, 0, 0, cw, ch);

      // Crosshair reticle inside the loupe
      ctx.strokeStyle = isDrawing ? "rgba(20,20,20,0.22)" : "rgba(34,211,238,0.28)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Re-render main camera to the primary canvas
      this.renderer.render(this.scene, this.camera);

      // Leader line from the loupe's actual circumference (108 px on phones, 192 px on desktop) to the work point
      const focus2d = this.projectToScreen(this.focusWorld, w, h);
      const { cx, cy, r } = loupe;
      const dx = focus2d.x - cx;
      const dy = focus2d.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > r + 14) {
        const startX = cx + (dx / dist) * r;
        const startY = cy + (dy / dist) * r;
        const lineColor = isDrawing ? "#141414" : "#22d3ee";
        parts.push(
          `<circle cx="${focus2d.x.toFixed(1)}" cy="${focus2d.y.toFixed(1)}" r="15" fill="none" stroke="${lineColor}" stroke-width="2" stroke-dasharray="4 3" />`,
          `<line x1="${startX.toFixed(1)}" y1="${startY.toFixed(1)}" x2="${focus2d.x.toFixed(1)}" y2="${focus2d.y.toFixed(1)}" stroke="${lineColor}" stroke-width="1.8" stroke-dasharray="5 4" />`,
          `<circle cx="${focus2d.x.toFixed(1)}" cy="${focus2d.y.toFixed(1)}" r="4" fill="${lineColor}" />`,
        );
      }
    }

    // 2. Operation-specific CAD vector motion arrows & architectural dimensions
    const op = this.currentOperation;
    if (op === "layout" || op === "measure" || op === "hang" || op === "match") {
      const pLeft = this.projectToScreen(new THREE.Vector3(FIRST_X - DROP_W / 2, 2.67, 0.03), w, h);
      const pRight = this.projectToScreen(new THREE.Vector3(FIRST_X + DROP_W / 2, 2.67, 0.03), w, h);
      parts.push(dimensionLineSvg(pLeft, pRight, -20, "530 mm DROP"));
    }
    if (op === "measure") {
      const pBot = this.projectToScreen(new THREE.Vector3(FIRST_X - DROP_W / 2, 0.05, 0.03), w, h);
      const pTop = this.projectToScreen(new THREE.Vector3(FIRST_X - DROP_W / 2, 2.67, 0.03), w, h);
      parts.push(dimensionLineSvg(pBot, pTop, 34, "MEASURED HEIGHT + 2–3 cm TOP"));
    }
    if (op === "paste" || op === "hang" || op === "plumb") {
      const a = this.projectToScreen(new THREE.Vector3(this.focusWorld.x, this.focusWorld.y + 0.28, 0.12), w, h);
      const b = this.projectToScreen(new THREE.Vector3(this.focusWorld.x, this.focusWorld.y - 0.28, 0.12), w, h);
      const d = arrowPath(a, b, 1.05);
      if (d) parts.push(`<path d="${d}" fill="${arrowFill}" stroke="${arrowStroke}" stroke-width="1.5" />`);
    }
    if (op === "smooth") {
      const c = this.projectToScreen(this.focusWorld, w, h);
      const leftD = arrowPath({ x: c.x - 10, y: c.y }, { x: c.x - 58, y: c.y }, 0.95);
      const rightD = arrowPath({ x: c.x + 10, y: c.y }, { x: c.x + 58, y: c.y }, 0.95);
      if (leftD) parts.push(`<path d="${leftD}" fill="${arrowFill}" stroke="${arrowStroke}" stroke-width="1.4" />`);
      if (rightD) parts.push(`<path d="${rightD}" fill="${arrowFill}" stroke="${arrowStroke}" stroke-width="1.4" />`);
    }
    if (op === "trim") {
      const a = this.projectToScreen(new THREE.Vector3(this.focusWorld.x - 0.16, this.focusWorld.y, 0.11), w, h);
      const b = this.projectToScreen(new THREE.Vector3(this.focusWorld.x + 0.16, this.focusWorld.y, 0.11), w, h);
      const d = arrowPath(a, b, 1.1);
      if (d) parts.push(`<path d="${d}" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" />`);
    }
    if (op === "outlet" || op === "safety") {
      const c = this.projectToScreen(OUTLET, w, h);
      const arc = arcArrow(c.x, c.y, 42, -Math.PI * 0.75, Math.PI * 0.35);
      parts.push(`<path d="${arc}" fill="#f59e0b" stroke="#141414" stroke-width="1.3" />`);
    }

    // 3. World-anchored callouts (⇧N): dot on the part, elbow leader, lettered label; labels are nudged
    //    apart vertically so they never overprint each other.
    if (this.callouts.length > 0) {
      const ink = isDrawing ? "#141414" : "#e2e8f0";
      const paper = isDrawing ? "#ffffff" : "rgba(8,14,25,0.88)";
      const placed: Array<{ x: number; y: number; w: number }> = [];
      const maxY = (this.mainViewPx ?? h) - 16; // keep labels above an export caption bar
      const lc = this.showLoupe ? this.loupeCircle(w) : null;
      const items = this.callouts
        .map((c) => ({ c, a: this.projectToScreen(c.anchor, w, h) }))
        .filter(({ a }) => a.x > -20 && a.x < w + 20 && a.y > -20 && a.y < h + 20)
        .sort((m, n) => m.a.y - n.a.y);
      for (const { c, a } of items) {
        const label = `${c.id}  ${c.label}`;
        const lw = label.length * 6.3 + 18;
        let lx = a.x + c.dir[0] * 70;
        let ly = a.y + c.dir[1] * 46;
        lx = Math.min(w - lw - 8, Math.max(8, c.dir[0] < 0 ? lx - lw : lx));
        ly = Math.min(maxY, Math.max(16, ly));
        // Never print a label under the loupe or its tag.
        if (lc && lx + lw > lc.cx - lc.r - 8 && ly < lc.cy + lc.r + 34) lx = Math.max(8, lc.cx - lc.r - 12 - lw);
        for (const q of placed) if (Math.abs(q.y - ly) < 22 && lx < q.x + q.w && lx + lw > q.x) ly = q.y + 24;
        placed.push({ x: lx, y: ly, w: lw });
        const ex = c.dir[0] < 0 ? lx + lw : lx;
        parts.push(
          `<circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="3.2" fill="${ink}" />`,
          `<path d="M${a.x.toFixed(1)},${a.y.toFixed(1)} L${ex.toFixed(1)},${ly.toFixed(1)}" stroke="${ink}" stroke-width="1.2" fill="none" />`,
          `<rect x="${lx.toFixed(1)}" y="${(ly - 10).toFixed(1)}" width="${lw.toFixed(1)}" height="20" rx="3" fill="${paper}" stroke="${ink}" stroke-width="1" />`,
          `<text x="${(lx + 9).toFixed(1)}" y="${(ly + 4).toFixed(1)}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10.5" font-weight="700" fill="${ink}">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`,
        );
      }
    }

    this.leadsSvg.innerHTML = parts.join("");
  }

  private cameraPreset(operation: Operation = this.currentOperation) {
    this.computeShot(operation);
    this.controls.target.copy(this.shotTarget);
    this.camera.position.copy(this.shotPosition);
    this.camera.lookAt(this.shotTarget);
    this.controls.update();
  }

  /** R: hand the camera back to the shot (eases there in the live view). */
  resetCamera(operation: Operation = this.currentOperation) {
    this.computeShot(operation);
    this.followCamera = true;
  }

  private applyView(view: "room" | "drawing") {
    this.view = view;
    this.floor.visible = view === "room";
    this.scene.background = new THREE.Color(view === "room" ? "#0c1220" : "#ffffff");
    this.scene.fog = view === "room" ? new THREE.Fog("#0c1220", 9, 18) : null;
    this.host.classList.toggle("cad-drawing-mode", view === "drawing");
    this.applyCurrentViewMaterials();
  }

  setView(view: "room" | "drawing") {
    this.applyView(view);
    this.resetCamera();
  }

  resize() {
    if (this.exporting) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    setLineArtResolution(width, height);
  }

  // ---- LessonRenderer: deterministic offscreen frames for MP4 export and printable step images ----

  /** Logical layout size used for overlays/loupe; frames are rendered at any 16:9 size and scaled from this. */
  private static readonly LOGICAL_W = 1280;
  private static readonly LOGICAL_H = 720;

  beginExport(style: LessonStyle) {
    if (this.exporting) return;
    this.exportSaved = {
      view: this.view,
      seek: { ...this.lastSeek },
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
    this.exporting = true;
    this.currentStep = -1; // force the first exported seek to apply the step's camera preset
    this.applyView(style);
  }

  async renderLessonFrame(target: HTMLCanvasElement, request: LessonFrameRequest): Promise<void> {
    if (!this.exporting) throw new Error("Call beginExport() before renderLessonFrame().");
    const { width, height } = request;
    const LW = WallpaperScene.LOGICAL_W;
    const LH = WallpaperScene.LOGICAL_H;
    if (Math.abs(width / height - LW / LH) > 0.01) throw new Error("Lesson frames must be 16:9.");

    // seek() applies the per-frame follow shot while exporting.
    this.seek(request.stepIndex, request.progress, request.operation as Operation);

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    // With a caption bar, frame the 3D view in the region above the bar so the action is never covered:
    // the camera's full frustum maps to the visible area and the extra rows fall behind the bar.
    if (request.caption) {
      const visibleH = Math.max(1, height - captionBarHeight(width, request.caption));
      this.camera.aspect = width / visibleH;
      this.camera.setViewOffset(width, visibleH, 0, 0, width, height);
    } else {
      this.camera.clearViewOffset();
      this.camera.aspect = LW / LH;
    }
    this.camera.updateProjectionMatrix();
    // Line widths are authored in "logical pixels"; resolution = logical size keeps proportions at any export size.
    setLineArtResolution(LW, LH);

    this.renderer.render(this.scene, this.camera);
    target.width = width;
    target.height = height;
    const ctx = target.getContext("2d");
    if (!ctx) throw new Error("2D canvas is unavailable.");
    ctx.drawImage(this.renderer.domElement, 0, 0, width, height);

    // Loupe pass + SVG overlays are computed in logical space, then scaled onto the frame.
    const overlays = request.overlays !== false;
    this.mainViewPx = request.caption ? LH * (Math.max(1, height - captionBarHeight(width, request.caption)) / height) : LH;
    if (overlays) this.renderOverlays(LW, LH);
    const k = width / LW;
    if (overlays && this.leadsSvg.childNodes.length > 0) {
      const clone = this.leadsSvg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(LW));
      clone.setAttribute("height", String(LH));
      const xml = new XMLSerializer().serializeToString(clone);
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      await image.decode();
      ctx.drawImage(image, 0, 0, width, height);
    }
    if (overlays && this.showLoupe) {
      const size = 192 * k;
      const x = width - 16 * k - size;
      const y = 16 * k;
      const drawing = this.view === "drawing";
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.insetCanvas, x, y, size, size);
      ctx.restore();
      ctx.lineWidth = 2.5 * k;
      ctx.strokeStyle = drawing ? "#141414" : "#22d3ee";
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2 - 1.25 * k, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = `700 ${9 * k * 1.1}px "JetBrains Mono", ui-monospace, monospace`;
      const tag = this.detailTagEl.textContent ?? "";
      const tw = ctx.measureText(tag).width + 16 * k;
      ctx.fillStyle = drawing ? "#ffffff" : "rgba(8,14,25,0.9)";
      ctx.strokeStyle = drawing ? "#141414" : "#244b5e";
      ctx.lineWidth = 1 * k;
      const ty = y + size + 6 * k;
      ctx.beginPath();
      ctx.roundRect(x + size - tw, ty, tw, 20 * k, 10 * k);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = drawing ? "#141414" : "#22d3ee";
      ctx.fillText(tag, x + size - tw + 8 * k, ty + 14 * k);
    }
    if (request.caption) drawCaptionBar(ctx, width, height, request.caption, request.progress);
  }

  endExport() {
    if (!this.exporting) return;
    const saved = this.exportSaved;
    this.exporting = false;
    this.exportSaved = null;
    this.camera.clearViewOffset();
    this.resize();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.resize();
    if (saved) {
      this.currentStep = saved.seek.stepIndex; // avoid a camera preset reset on restore
      this.applyView(saved.view);
      this.seek(saved.seek.stepIndex, saved.seek.progress, saved.seek.operation);
      this.camera.position.copy(saved.position);
      this.controls.target.copy(saved.target);
      this.camera.lookAt(this.controls.target);
      this.controls.update();
    }
  }

  private animate = (now = 0) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    if (this.exporting) return;
    const dt = this.lastFrameTime ? Math.min(0.1, (now - this.lastFrameTime) / 1000) : 1 / 60;
    this.lastFrameTime = now;
    if (this.followCamera) {
      // Critically-damped ease toward the operation's shot: the work point stays framed while playing or
      // scrubbing (it used to be framed once per step, so e.g. the skirting cut happened off-screen).
      const k = 1 - Math.exp(-dt * 7);
      this.controls.target.lerp(this.shotTarget, k);
      this.camera.position.lerp(this.shotPosition, k);
      this.camera.lookAt(this.controls.target);
    }
    this.controls.update();
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.mainViewPx = null;
    // The loupe pass ends with the main render, so only render here when it is off (was 3 renders/frame).
    if (!(this.showLoupe && this.insetCtx)) this.renderer.render(this.scene, this.camera);
    this.renderOverlays(width, height);
  };

  getPerformanceInfo() {
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
    };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.controls.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material) => {
          materials.add(material);
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        });
      }
    });
    geometries.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    textures.forEach((item) => item.dispose());
    this.environmentTarget?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.insetCanvas.remove();
    this.detailTagEl.remove();
    this.leadsSvg.remove();
  }
}
