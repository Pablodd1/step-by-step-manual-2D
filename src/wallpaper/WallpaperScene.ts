import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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

const WALL_W = 3.18;
const WALL_H = 2.7;
const DROP_W = 0.53;
const DROP_H = 2.64;
const LEFT = -WALL_W / 2;
const FIRST_X = LEFT + 0.5 - DROP_W / 2;
const OUTLET = new THREE.Vector3(FIRST_X + DROP_W + 0.08, 1.12, 0.055);

interface DropMesh extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> {
  userData: { original: Float32Array };
}

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function paperTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e6e3da";
  ctx.fillRect(0, 0, 512, 1024);
  const random = seeded(41);
  for (let i = 0; i < 22000; i++) {
    const tone = random() > 0.5 ? 255 : 70;
    ctx.fillStyle = `rgba(${tone},${tone},${tone},${0.018 + random() * 0.022})`;
    ctx.fillRect(random() * 512, random() * 1024, 1, 1);
  }
  ctx.strokeStyle = "#315d52";
  ctx.fillStyle = "#315d52";
  ctx.lineCap = "round";
  for (let row = -1; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const ox = col * 256 + (row % 2 ? 128 : 0);
      const oy = row * 256;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ox + 24, oy + 250);
      ctx.bezierCurveTo(ox + 88, oy + 188, ox + 126, oy + 100, ox + 206, oy + 8);
      ctx.stroke();
      for (let k = 0; k < 5; k++) {
        const x = ox + 66 + k * 27;
        const y = oy + 202 - k * 39;
        const side = k % 2 ? -1 : 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * 0.72 - 0.42);
        ctx.beginPath();
        ctx.ellipse(side * 17, 0, 23, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "#b99658";
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(ox + 124 + k * 22, oy + 122 - k * 31, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#315d52";
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function floorTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const random = seeded(23);
  const planks = 8;
  const plankH = size / planks;
  for (let row = 0; row < planks; row++) {
    const shade = 0.82 + random() * 0.3;
    ctx.fillStyle = `rgb(${Math.round(150 * shade)},${Math.round(108 * shade)},${Math.round(72 * shade)})`;
    ctx.fillRect(0, row * plankH, size, plankH);
    // grain
    for (let g = 0; g < 70; g++) {
      ctx.strokeStyle = `rgba(60,36,18,${0.04 + random() * 0.07})`;
      ctx.lineWidth = 1 + random() * 1.4;
      const y = row * plankH + random() * plankH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + (random() - 0.5) * 7, size * 0.65, y + (random() - 0.5) * 7, size, y + (random() - 0.5) * 4);
      ctx.stroke();
    }
    // staggered end joints
    const joint = random() * size;
    ctx.fillStyle = "rgba(30,18,8,0.55)";
    ctx.fillRect(joint, row * plankH, 2, plankH);
    // plank seam
    ctx.fillStyle = "rgba(30,18,8,0.5)";
    ctx.fillRect(0, row * plankH, size, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = 8;
  return texture;
}

function noiseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(128, 128);
  const random = seeded(7);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 108 + Math.floor(random() * 40);
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  return texture;
}

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

function makeLevel(): THREE.Group {
  const group = new THREE.Group();
  const body = meshBox([0.072, 0.74, 0.038], "#e0bd1f", 0.36, 0.1, true);
  group.add(body);
  const topCap = meshBox([0.076, 0.035, 0.042], "#1f2937", 0.6, 0, true);
  topCap.position.y = 0.36;
  const botCap = topCap.clone();
  botCap.position.y = -0.36;
  group.add(topCap, botCap);
  for (const y of [-0.22, 0, 0.22]) {
    const bezel = meshBox([0.048, 0.088, 0.016], "#1e293b", 0.45, 0.2, true);
    bezel.position.set(0, y, 0.018);
    group.add(bezel);
    const vial = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.056, 4, 12),
      new THREE.MeshStandardMaterial({ color: "#86efac", roughness: 0.15 }),
    );
    vial.position.set(0, y, 0.025);
    group.add(vial);
  }
  return group;
}

function makeRoller(): THREE.Group {
  const group = new THREE.Group();
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.046, 0.25, 28),
    new THREE.MeshStandardMaterial({ color: "#ece9e0", roughness: 0.92 }),
  );
  sleeve.rotation.z = Math.PI / 2;
  group.add(sleeve);
  const endCapL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.047, 0.047, 0.012, 24),
    new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.5 }),
  );
  endCapL.rotation.z = Math.PI / 2;
  endCapL.position.x = -0.125;
  const endCapR = endCapL.clone();
  endCapR.position.x = 0.125;
  group.add(endCapL, endCapR);

  const metal = new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.78, roughness: 0.28 });
  const wireHorizontal = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 12), metal);
  wireHorizontal.rotation.z = Math.PI / 2;
  wireHorizontal.position.set(0.06, -0.08, 0);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 12), metal);
  arm.position.set(0.12, -0.14, 0);
  group.add(wireHorizontal, arm);

  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.03, 16), metal);
  ferrule.position.set(0.12, -0.25, 0);
  const handle = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.023, 0.13, 6, 14),
    new THREE.MeshStandardMaterial({ color: "#1d4640", roughness: 0.45 }),
  );
  handle.position.set(0.12, -0.34, 0);
  group.add(ferrule, handle);
  return group;
}

function makeSmoother(): THREE.Group {
  const group = new THREE.Group();
  const blade = meshBox([0.24, 0.12, 0.01], "#eab308", 0.38, 0.05, true);
  const feltEdge = meshBox([0.242, 0.024, 0.013], "#fef3c7", 0.85, 0, true);
  feltEdge.position.y = -0.052;
  const grip = meshBox([0.15, 0.052, 0.034], "#1e293b", 0.48, 0.1, true);
  grip.position.set(0, 0.022, 0.02);
  group.add(blade, feltEdge, grip);
  return group;
}

function makeKnife(): THREE.Group {
  const group = new THREE.Group();
  const body = meshBox([0.032, 0.155, 0.02], "#eab308", 0.4, 0.08, true);
  const grip = meshBox([0.035, 0.11, 0.023], "#1e293b", 0.65, 0.05, true);
  grip.position.set(0, -0.015, 0);
  const slider = meshBox([0.018, 0.028, 0.026], "#0f172a", 0.4, 0.2, true);
  slider.position.set(0, 0.03, 0.004);
  const channel = meshBox([0.02, 0.05, 0.01], "#cbd5e1", 0.25, 0.85);
  channel.position.y = 0.08;
  const blade = meshBox([0.016, 0.088, 0.003], "#e2e8f0", 0.18, 0.9);
  blade.position.y = 0.12;
  blade.rotation.z = -0.08;
  group.add(body, grip, slider, channel, blade);
  return group;
}

function makeStraightedge(): THREE.Group {
  const group = new THREE.Group();
  const rule = meshBox([0.56, 0.054, 0.008], "#cbd5e1", 0.28, 0.82, true);
  const ridge = meshBox([0.54, 0.018, 0.022], "#334155", 0.45, 0.4, true);
  ridge.position.set(0, 0.008, 0.012);
  group.add(rule, ridge);
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
  group.add(blade, bolster, handle);
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
  group.add(stock, ferrule, bristles, handle);
  return group;
}

function makeSponge(): THREE.Group {
  const group = new THREE.Group();
  const body = meshBox([0.15, 0.085, 0.048], "#e2c86b", 0.92, 0, true);
  const scrubPad = meshBox([0.146, 0.082, 0.012], "#2b594b", 0.88, 0, true);
  scrubPad.position.z = -0.026;
  group.add(body, scrubPad);
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
  group.add(body, woodCone, lead);
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
  group.add(body, clip, probe, led);
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
  const strip = meshBox([0.022, 2.48, 0.006], "#facc15", 0.45);
  strip.position.y = 1.24;
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

    const hemi = new THREE.HemisphereLight("#dbe8ef", "#26352e", 1.55);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight("#fff4df", 3.2);
    key.position.set(-3, 5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -2;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight("#8ec9c0", 1.2);
    rim.position.set(4, 2, 1);
    this.scene.add(rim);

    const wall = meshBox([WALL_W, WALL_H, 0.12], "#b9b6ad", 0.94);
    wall.position.set(0, WALL_H / 2, -0.065);
    wall.receiveShadow = true;
    this.architectureGroup.add(wall);
    const side = meshBox([0.12, WALL_H, 0.72], "#aaa79f", 0.94);
    side.position.set(LEFT - 0.06, WALL_H / 2, -0.36);
    this.architectureGroup.add(side);
    const skirting = meshBox([WALL_W + 0.08, 0.09, 0.055], "#e0ded6", 0.72);
    skirting.position.set(0, 0.045, 0.025);
    this.architectureGroup.add(skirting);
    const ceiling = meshBox([WALL_W + 0.15, 0.07, 0.3], "#d7d5cd", 0.85);
    ceiling.position.set(0, WALL_H + 0.035, -0.08);
    this.architectureGroup.add(ceiling);
    this.scene.add(this.architectureGroup);

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.55 }),
    );
    markCadAuxiliary(this.floor);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.005;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    const texture = paperTexture();
    const bump = noiseTexture();
    for (let i = 0; i < 6; i++) {
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: bump,
        bumpScale: 0.0015,
        roughness: 0.87,
        side: THREE.DoubleSide,
      });
      const geometry = new THREE.PlaneGeometry(DROP_W, DROP_H, 12, 48);
      const drop = new THREE.Mesh(geometry, material) as DropMesh;
      drop.userData = { original: new Float32Array(geometry.attributes.position.array) };
      drop.position.set(FIRST_X + i * DROP_W, WALL_H / 2, 0.018 + i * 0.0002);
      drop.castShadow = true;
      drop.receiveShadow = true;
      this.drops.push(drop);
      this.dropsGroup.add(drop);

      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, DROP_W, 32), material);
      roll.rotation.z = Math.PI / 2;
      roll.position.x = drop.position.x;
      roll.position.z = 0.065;
      roll.castShadow = true;
      this.rolls.push(roll);
      this.dropsGroup.add(roll);

      if (i < 2) {
        const lane = new THREE.Mesh(
          new THREE.PlaneGeometry(DROP_W + 0.035, DROP_H),
          new THREE.MeshBasicMaterial({ color: "#75c9d5", transparent: true, opacity: 0.28, depthWrite: false }),
        );
        markCadAuxiliary(lane);
        lane.position.set(drop.position.x, WALL_H / 2, 0.009);
        this.paste.push(lane);
        this.scene.add(lane);
        const points = [
          new THREE.Vector3(drop.position.x - DROP_W / 2, 0.03, 0.027),
          new THREE.Vector3(drop.position.x + DROP_W / 2, 0.03, 0.027),
          new THREE.Vector3(drop.position.x + DROP_W / 2, 2.67, 0.027),
          new THREE.Vector3(drop.position.x - DROP_W / 2, 2.67, 0.027),
          new THREE.Vector3(drop.position.x - DROP_W / 2, 0.03, 0.027),
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
    this.overhangStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(DROP_W, 0.055, 8, 2),
      this.drops[0].material,
    );
    this.overhangStrip.visible = false;
    this.dropsGroup.add(this.overhangStrip);

    // 4 Folding Triangular Flaps around the outlet for Step 12 (outlet X-cut)
    this.outletFlapsGroup.position.set(OUTLET.x, OUTLET.y, 0.032);
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

    this.plumbLine = meshBox([0.007, 2.58, 0.005], "#0891b2", 0.35);
    markCadAuxiliary(this.plumbLine);
    this.plumbLine.position.set(LEFT + 0.5, 1.36, 0.035);
    this.scene.add(this.plumbLine);

    this.outlet = new THREE.Group();
    const plate = meshBox([0.17, 0.115, 0.022], "#e2e0d8", 0.32, 0, true);
    this.outlet.add(plate);
    for (const x of [-0.042, 0.042]) {
      for (const y of [-0.022, 0.022]) {
        const slot = meshBox([0.009, 0.026, 0.006], "#30383a", 0.5);
        slot.position.set(x, y, 0.014);
        this.outlet.add(slot);
      }
    }
    this.outlet.position.copy(OUTLET);
    this.architectureGroup.add(this.outlet);

    this.outletRing = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.134, 48),
      new THREE.MeshBasicMaterial({ color: "#f59e0b", transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    markCadAuxiliary(this.outletRing);
    this.outletRing.position.set(OUTLET.x, OUTLET.y, 0.085);
    this.scene.add(this.outletRing);

    this.displayRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, DROP_W, 48), this.drops[0].material);
    this.displayRoll.rotation.z = Math.PI / 2;
    this.displayRoll.position.set(-0.72, 0.1, 0.58);
    this.displayRoll.castShadow = true;
    this.toolsGroup.add(this.displayRoll);

    this.productLabel.position.set(-0.72, 0.32, 0.36);
    this.productLabel.rotation.x = -0.14;
    this.toolsGroup.add(this.productLabel);

    const cutPoints = [
      OUTLET.x - 0.075, OUTLET.y + 0.052, 0.09, OUTLET.x + 0.075, OUTLET.y - 0.052, 0.09,
      OUTLET.x + 0.075, OUTLET.y + 0.052, 0.09, OUTLET.x - 0.075, OUTLET.y - 0.052, 0.09,
    ];
    this.outletCuts = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(cutPoints, 3)),
      new THREE.LineBasicMaterial({ color: "#b91c1c", linewidth: 2 }),
    );
    markCadAuxiliary(this.outletCuts);
    this.scene.add(this.outletCuts);

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
    ]) {
      tool.traverse((child) => {
        if (child instanceof THREE.Mesh) child.castShadow = true;
      });
      this.toolsGroup.add(tool);
    }
    this.scene.add(this.toolsGroup);

    // The patterned paper keeps its printed texture in BOTH styles (outlines are added on top), so pattern-match
    // steps stay meaningful in the line-drawing style instead of turning into blank cream sheets.
    this.paperMeshes = [...this.drops, ...this.rolls, this.displayRoll, this.overhangStrip].map((mesh) => ({
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
    for (const { mesh, material } of this.paperMeshes) mesh.material = material;
  }

  private setDrop(index: number, reveal: number, visible: boolean) {
    const drop = this.drops[index];
    const p = THREE.MathUtils.clamp(reveal, 0, 1);
    drop.visible = visible && p > 0.001;
    const position = drop.geometry.attributes.position;
    const original = drop.userData.original;
    const threshold = DROP_H / 2 - p * DROP_H;
    for (let i = 0; i < position.count; i++) {
      position.setY(i, Math.max(original[i * 3 + 1], threshold));
    }
    position.needsUpdate = true;
    drop.geometry.computeVertexNormals();
    const roll = this.rolls[index];
    roll.visible = visible && p > 0.001 && p < 0.995;
    roll.position.y = WALL_H / 2 + threshold;
  }

  private hideTools() {
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
    ]) {
      tool.visible = false;
    }
    this.overhangStrip.visible = false;
    this.outletFlapsGroup.visible = false;
  }

  setShowLoupe(show: boolean) {
    this.showLoupe = show;
    this.insetCanvas.style.display = show ? "block" : "none";
    this.detailTagEl.style.display = show ? "block" : "none";
  }

  seek(stepIndex: number, progress: number, operation: Operation) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    this.currentProgress = p;
    this.currentOperation = operation;
    if (!this.exporting) this.lastSeek = { stepIndex, progress: p, operation };
    if (stepIndex !== this.currentStep) {
      this.currentStep = stepIndex;
      this.resetCamera(operation);
    }
    this.hideTools();
    this.displayRoll.visible = operation === "verify";
    this.productLabel.visible = operation === "verify";
    this.outlet.visible = !(operation === "match" || (operation === "outlet" && p < 0.78));
    this.outletCuts.visible = operation === "outlet" && p > 0.1;
    this.outletRing.visible = operation === "safety" || operation === "outlet";
    this.outletRing.scale.setScalar(operation === "safety" ? 1 + Math.sin(p * Math.PI * 4) * 0.08 : 1);
    this.ghostLines.visible = operation === "layout";
    this.plumbLine.visible = ["plumb", "measure", "paste", "hang", "smooth"].includes(operation);
    this.paste.forEach((lane) => {
      lane.visible = false;
      lane.scale.y = 1;
      lane.position.y = WALL_H / 2;
    });
    this.drops.forEach((_, i) => this.setDrop(i, 0, false));

    if (["hang", "smooth", "trim", "match", "outlet", "clean", "inspect"].includes(operation)) {
      this.setDrop(0, 1, true);
    }
    if (["outlet", "clean", "inspect"].includes(operation)) this.setDrop(1, 1, true);
    if (operation === "inspect") for (let i = 2; i < 6; i++) this.setDrop(i, 1, true);

    switch (operation) {
      case "verify": {
        this.focusWorld.set(-0.72, 0.33, 0.37);
        this.detailCamOffset.set(0.12, 0.08, 0.85);
        this.detailTagEl.textContent = "3.5× ROLL LABEL & BATCH";
        break;
      }
      case "safety": {
        this.voltageTester.visible = true;
        this.voltageTester.position.set(OUTLET.x + 0.04, OUTLET.y - 0.06 + Math.sin(p * Math.PI * 2) * 0.025, 0.11);
        this.voltageTester.rotation.set(0.35, 0, 0.28);
        this.focusWorld.set(OUTLET.x, OUTLET.y, 0.05);
        this.detailCamOffset.set(0.14, 0.06, 0.36);
        this.detailTagEl.textContent = "3.5× ZERO-VOLTAGE TEST";
        break;
      }
      case "prepare": {
        const tool = p < 0.48 ? this.fillingKnife : this.sponge;
        tool.visible = true;
        tool.position.set(-0.25 + Math.sin(p * 12) * 0.45, 1.55 - p * 1.15, 0.12);
        tool.rotation.z = p < 0.48 ? -0.65 : Math.sin(p * 15) * 0.25;
        this.focusWorld.copy(tool.position);
        this.detailCamOffset.set(0.16, 0.08, 0.44);
        this.detailTagEl.textContent = p < 0.48 ? "3.5× FLUSH COMPOUND FILL" : "3.5× DAMP SPONGE PREP";
        break;
      }
      case "layout": {
        this.pencil.visible = true;
        this.pencil.position.set(FIRST_X + DROP_W + p * DROP_W, 1.95 - p * 0.9, 0.1);
        this.pencil.rotation.z = -0.55;
        this.focusWorld.copy(this.pencil.position);
        this.detailCamOffset.set(0.15, 0.08, 0.42);
        this.detailTagEl.textContent = "3.5× 530 MM DROP SET-OUT";
        break;
      }
      case "plumb": {
        this.level.visible = true;
        this.level.position.set(LEFT + 0.45, 2.05 - p * 1.35, 0.09);
        this.pencil.visible = true;
        this.pencil.position.set(LEFT + 0.51, 2.12 - p * 1.35, 0.09);
        this.pencil.rotation.z = 0.65;
        this.focusWorld.set(LEFT + 0.5, this.level.position.y, 0.06);
        this.detailCamOffset.set(0.16, 0.05, 0.44);
        this.detailTagEl.textContent = "3.5× SPIRIT LEVEL VIAL & PLUMB";
        break;
      }
      case "measure": {
        this.tape.visible = true;
        this.tape.position.set(FIRST_X - 0.1, 0.1, 0.08);
        this.tape.scale.y = 0.15 + p * 0.85;
        this.focusWorld.set(FIRST_X - 0.1, 0.22 + p * 1.85, 0.08);
        this.detailCamOffset.set(0.18, 0.06, 0.46);
        this.detailTagEl.textContent = "3.5× HEIGHT + 100 MM TRIM";
        break;
      }
      case "paste": {
        const coverage = Math.min(1, p / 0.72);
        this.paste[0].visible = true;
        this.paste[0].scale.y = Math.max(0.001, coverage);
        this.paste[0].position.y = 2.67 - (DROP_H * coverage) / 2;
        if (p < 0.72) {
          this.roller.visible = true;
          const rollerProgress = p / 0.72;
          const pass = (rollerProgress * 3) % 1;
          this.roller.position.set(
            FIRST_X + (Math.floor(rollerProgress * 3) % 2 ? 0.08 : -0.06),
            0.48 + pass * 1.65,
            0.13,
          );
          this.roller.rotation.z = Math.sin(rollerProgress * 18) * 0.12;
          this.focusWorld.copy(this.roller.position);
          this.detailTagEl.textContent = "3.5× ROLLER PASTE LANE (+35 MM)";
        } else {
          this.pasteBrush.visible = true;
          const brushProgress = (p - 0.72) / 0.28;
          this.pasteBrush.position.set(FIRST_X - DROP_W / 2 + brushProgress * DROP_W, 2.52, 0.12);
          this.pasteBrush.rotation.z = Math.PI / 2;
          this.focusWorld.copy(this.pasteBrush.position);
          this.detailTagEl.textContent = "3.5× BRUSH CUT-IN AT CORNICE";
        }
        this.detailCamOffset.set(0.22, 0.06, 0.52);
        break;
      }
      case "hang": {
        this.paste[0].visible = true;
        const rev = Math.max(0.18, p);
        this.setDrop(0, rev, true);
        this.focusWorld.set(FIRST_X + DROP_W / 2, WALL_H / 2 + (DROP_H / 2 - rev * DROP_H), 0.06);
        this.detailCamOffset.set(0.2, 0.06, 0.48);
        this.detailTagEl.textContent = "3.5× PLUMB EDGE ALIGNMENT";
        break;
      }
      case "smooth": {
        this.smoother.visible = true;
        const stroke = Math.min(3, Math.floor(p * 4));
        const local = (p * 4) % 1;
        const direction = stroke % 2 ? -1 : 1;
        this.smoother.position.set(FIRST_X + direction * (local - 0.5) * 0.36, 2.25 - stroke * 0.48, 0.09);
        this.smoother.rotation.z = direction * -0.18;
        this.focusWorld.copy(this.smoother.position);
        this.detailCamOffset.set(0.18, 0.06, 0.42);
        this.detailTagEl.textContent = "3.5× CENTER-OUT SMOOTHING";
        break;
      }
      case "trim": {
        this.knife.visible = true;
        this.straightedge.visible = true;
        this.overhangStrip.visible = true;
        const top = p < 0.5;
        const local = (p % 0.5) * 2;
        const yJunction = top ? 2.61 : 0.13;
        this.straightedge.position.set(FIRST_X, yJunction + (top ? -0.028 : 0.028), 0.055);
        this.straightedge.rotation.set(0, 0, 0);

        this.knife.position.set(FIRST_X - DROP_W / 2 + local * DROP_W, yJunction, 0.11);
        this.knife.rotation.set(0, 0, Math.PI / 2 - 0.35);

        this.overhangStrip.position.set(
          FIRST_X + local * 0.03,
          yJunction + (top ? 0.03 : -0.03),
          0.04 + local * 0.04,
        );
        this.overhangStrip.rotation.x = (top ? 1 : -1) * local * 0.65;

        this.focusWorld.set(this.knife.position.x, yJunction, 0.06);
        this.detailCamOffset.set(0.14, top ? -0.06 : 0.08, 0.38);
        this.detailTagEl.textContent = top ? "3.5× CORNICE STRAIGHTEDGE TRIM" : "3.5× SKIRTING 30° BLADE TRIM";
        break;
      }
      case "match": {
        this.paste[1].visible = true;
        if (p < 0.24) {
          const coverage = p / 0.24;
          this.paste[1].scale.y = Math.max(0.001, coverage);
          this.paste[1].position.y = 2.67 - (DROP_H * coverage) / 2;
          this.roller.visible = true;
          this.roller.position.set(FIRST_X + DROP_W, 0.45 + coverage * 1.75, 0.13);
          this.focusWorld.copy(this.roller.position);
        } else if (p < 0.8) {
          const rev = (p - 0.24) / 0.56;
          this.setDrop(1, rev, true);
          this.focusWorld.set(FIRST_X + DROP_W / 2, 1.45, 0.04);
        } else {
          this.setDrop(1, 1, true);
          this.smoother.visible = true;
          const smoothing = (p - 0.8) / 0.2;
          this.smoother.position.set(
            FIRST_X + DROP_W * 0.5 + Math.sin(smoothing * 10) * 0.05,
            2.15 - smoothing * 1.55,
            0.09,
          );
          this.focusWorld.copy(this.smoother.position);
        }
        this.detailCamOffset.set(0.16, 0.05, 0.4);
        this.detailTagEl.textContent = "3.5× BUTT-SEAM PATTERN MATCH";
        break;
      }
      case "outlet": {
        this.knife.visible = true;
        this.knife.scale.setScalar(0.82);
        this.knife.position.set(OUTLET.x - 0.075 + p * 0.15, OUTLET.y + 0.06 - p * 0.12, 0.105);
        this.knife.rotation.z = -0.75 + p * 1.5;

        // Physically fold the 4 triangular outlet relief flaps outward
        this.outletFlapsGroup.visible = true;
        const foldAngle = THREE.MathUtils.clamp((p - 0.15) / 0.65, 0, 1) * 1.35;
        for (const flap of this.outletFlaps) {
          const axis = flap.userData.axis as THREE.Vector3;
          flap.setRotationFromAxisAngle(axis, foldAngle);
        }

        this.focusWorld.set(OUTLET.x, OUTLET.y, 0.055);
        this.detailCamOffset.set(0.13, 0.05, 0.34);
        this.detailTagEl.textContent = "3.5× OUTLET 4-FLAP X-RELIEF CUT";
        break;
      }
      case "clean": {
        this.sponge.visible = true;
        this.sponge.position.set(FIRST_X + DROP_W / 2 + Math.sin(p * 16) * 0.025, 2.2 - p * 1.65, 0.105);
        this.sponge.rotation.z = Math.sin(p * 12) * 0.22;
        this.focusWorld.copy(this.sponge.position);
        this.detailCamOffset.set(0.16, 0.06, 0.42);
        this.detailTagEl.textContent = "3.5× DAMP SPONGE SEAM WIPE";
        break;
      }
      case "inspect": {
        this.focusWorld.set(FIRST_X + DROP_W * 0.5, 1.38, 0.04);
        this.detailCamOffset.set(0.22, 0.08, 0.52);
        this.detailTagEl.textContent = "3.5× RAKING LIGHT SEAM CHECK";
        break;
      }
    }
    if (operation !== "outlet") this.knife.scale.setScalar(1);
    this.applyCurrentViewMaterials();
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

    // 1. Render circular 3.5x Detail Loupe & tangent leader line
    if (this.showLoupe && this.insetCtx) {
      this.detailCamera.position.copy(this.focusWorld).add(this.detailCamOffset);
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

      // Leader line from circular loupe circumference to 3D focus point
      const focus2d = this.projectToScreen(this.focusWorld, w, h);
      const loupeSize = 192;
      const cx = w - 16 - loupeSize / 2;
      const cy = 16 + loupeSize / 2;
      const r = loupeSize / 2;
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
      parts.push(dimensionLineSvg(pBot, pTop, -28, "2640 mm + 100 mm TRIM"));
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

    this.leadsSvg.innerHTML = parts.join("");
  }

  private cameraPreset(operation?: Operation) {
    const closeOperations: Operation[] = ["plumb", "measure", "paste", "hang", "smooth", "trim"];
    if (this.view === "drawing") {
      if (operation === "verify") {
        this.camera.position.set(0.35, 0.92, 2.25);
        this.controls.target.set(-0.72, 0.22, 0.4);
      } else if (operation === "safety" || operation === "outlet") {
        this.camera.position.set(OUTLET.x + 0.28, 1.32, 1.55);
        this.controls.target.set(OUTLET.x, OUTLET.y, 0);
      } else {
        this.camera.position.set(FIRST_X + 0.45, 1.42, 3.65);
        this.controls.target.set(FIRST_X + 0.15, 1.35, 0);
      }
    } else if (operation === "verify") {
      this.camera.position.set(0.55, 1.0, 2.5);
      this.controls.target.set(-0.72, 0.22, 0.4);
    } else if (operation === "safety" || operation === "outlet") {
      this.camera.position.set(OUTLET.x + 0.45, 1.45, 1.75);
      this.controls.target.set(OUTLET.x, OUTLET.y, 0);
    } else if (operation && closeOperations.includes(operation)) {
      this.camera.position.set(FIRST_X + 0.75, 1.52, 3.35);
      this.controls.target.set(FIRST_X, 1.36, 0);
    } else if (operation === "clean") {
      this.camera.position.set(FIRST_X + 1.1, 1.55, 2.4);
      this.controls.target.set(FIRST_X + DROP_W / 2, 1.35, 0);
    } else {
      this.camera.position.set(3.45, 2.35, 4.95);
      this.controls.target.set(0, 1.3, 0);
    }
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  resetCamera(operation: Operation = this.currentOperation) {
    this.cameraPreset(operation);
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

    const stepChanged = request.stepIndex !== this.currentStep;
    this.seek(request.stepIndex, request.progress, request.operation as Operation);
    if (stepChanged) this.cameraPreset(request.operation as Operation);

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
    this.renderOverlays(LW, LH);
    const k = width / LW;
    if (this.leadsSvg.childNodes.length > 0) {
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
    if (this.showLoupe) {
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
    if (request.caption) drawCaptionBar(ctx, width, height, request.caption);
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

  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    if (this.exporting) return;
    this.controls.update();
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.render(this.scene, this.camera);
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
