import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  DROP_COUNT,
  DROP_WIDTH,
  HOLES,
  OUTLET,
  PASTE_BUCKET,
  PLATE_ON_TABLE,
  PLUMB_X,
  SOAP_BUCKET,
  TABLE,
  WALL,
  WALLPAPER_TASK,
  clamp01,
  dropHangPose,
  dropRect,
  sampleStep,
  stepMotion,
  type SimulatorSurfaceMode,
  type TaskStep,
  type ToolId,
  type Vec3,
} from "@contracts/tasks/wallpaperTask";

const ACID = 0xd2fd78;
const INK = 0x1c221e;

export type SimulatorViewMode = "room" | "drawing";

const std = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opts });

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function box(w: number, h: number, d: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop: number, rBot: number, h: number, mat: THREE.Material, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.castShadow = true;
  return m;
}

/** Cylinder whose axis is +z, starting at z0 and ending at z1. */
function zCyl(r: number, z0: number, z1: number, mat: THREE.Material) {
  const m = cyl(r, r, Math.abs(z1 - z0), mat);
  m.rotation.x = Math.PI / 2;
  m.position.z = (z0 + z1) / 2;
  return m;
}

/** Plane anchored at its left/right/top/bottom edge. */
function anchoredPlane(w: number, h: number, mat: THREE.Material, anchor: "left" | "right" | "top" | "bottom") {
  const g = new THREE.PlaneGeometry(w, h);
  if (anchor === "left") g.translate(w / 2, 0, 0);
  if (anchor === "right") g.translate(-w / 2, 0, 0);
  if (anchor === "top") g.translate(0, -h / 2, 0);
  if (anchor === "bottom") g.translate(0, h / 2, 0);
  return new THREE.Mesh(g, mat);
}

// ---------------------------------------------------------------------------
// Surface Textures (Botanical + UNITEC FT_13 Marble Roll + FT_03 Eclipse + FT_15 WPC)
// ---------------------------------------------------------------------------

function wallpaperTexture(mode: SimulatorSurfaceMode = "botanical"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 260;
  c.height = 320;
  const g = c.getContext("2d")!;
  const rand = rng(mode === "botanical" ? 7 : mode === "marble-roll" ? 19 : mode === "eclipse-sheet" ? 31 : 43);

  if (mode === "marble-roll") {
    const grad = g.createLinearGradient(0, 0, 260, 320);
    grad.addColorStop(0, "#f5f4f0");
    grad.addColorStop(0.5, "#eae8e2");
    grad.addColorStop(1, "#f3f2ee");
    g.fillStyle = grad;
    g.fillRect(0, 0, 260, 320);
    for (let i = 0; i < 9; i += 1) {
      g.strokeStyle = i % 3 === 0 ? "rgba(145,130,105,0.42)" : "rgba(110,118,126,0.35)";
      g.lineWidth = i % 2 === 0 ? 2.4 : 1.3;
      g.beginPath();
      let x = rand() * 260;
      g.moveTo(x, -10);
      for (let y = 0; y <= 330; y += 40) {
        x += (rand() - 0.48) * 42;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  } else if (mode === "eclipse-sheet") {
    const grad = g.createLinearGradient(0, 0, 260, 320);
    grad.addColorStop(0, "#17181b");
    grad.addColorStop(0.5, "#23252a");
    grad.addColorStop(1, "#141518");
    g.fillStyle = grad;
    g.fillRect(0, 0, 260, 320);
    for (let i = 0; i < 10; i += 1) {
      g.strokeStyle = i % 3 === 0 ? "rgba(218,185,120,0.58)" : "rgba(235,238,242,0.38)";
      g.lineWidth = i % 3 === 0 ? 2.6 : 1.2;
      g.beginPath();
      let x = rand() * 260;
      g.moveTo(x, -10);
      for (let y = 0; y <= 330; y += 35) {
        x += (rand() - 0.48) * 38;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  } else if (mode === "wpc-choco") {
    g.fillStyle = "#2b1d14";
    g.fillRect(0, 0, 260, 320);
    const slats = 8;
    const sw = 260 / slats;
    for (let i = 0; i < slats; i += 1) {
      const x = i * sw;
      g.fillStyle = "#160e09";
      g.fillRect(x, 0, sw * 0.28, 320);
      const fluteGrad = g.createLinearGradient(x + sw * 0.28, 0, x + sw, 0);
      fluteGrad.addColorStop(0, "#4b3222");
      fluteGrad.addColorStop(0.5, "#63432e");
      fluteGrad.addColorStop(1, "#3a2518");
      g.fillStyle = fluteGrad;
      g.fillRect(x + sw * 0.28, 0, sw * 0.72, 320);
    }
  } else {
    g.fillStyle = "#ece6d5";
    g.fillRect(0, 0, 260, 320);
    const leaves: [number, number, number, number, string][] = [];
    for (let i = 0; i < 22; i += 1) {
      leaves.push([rand() * 260, rand() * 320, 16 + rand() * 18, rand() * Math.PI, rand() > 0.5 ? "#55704d" : "#8aa27c"]);
    }
    const drawLeaf = (x: number, y: number, r: number, a: number, col: string) => {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(0, 0, r * 0.36, r, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(30,45,30,0.55)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(0, -r);
      g.lineTo(0, r);
      g.stroke();
      g.restore();
    };
    g.strokeStyle = "#6f8466";
    g.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const x = 30 + i * 65;
      g.beginPath();
      g.moveTo(x, -10);
      g.bezierCurveTo(x + 30, 100, x - 30, 220, x, 330);
      g.stroke();
    }
    for (const [x, y, r, a, col] of leaves) {
      for (const dx of [-260, 0, 260]) for (const dy of [-320, 0, 320]) drawLeaf(x + dx, y + dy, r, a, col);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function rulerTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d5dade";
  g.fillRect(0, 0, 512, 64);
  g.fillStyle = "#22282a";
  for (let i = 0; i <= 60; i += 1) {
    const x = Math.round((i / 60) * 496) + 8;
    const h = i % 10 === 0 ? 22 : i % 5 === 0 ? 15 : 9;
    g.fillRect(x, 0, i % 10 === 0 ? 2 : 1, h);
    g.fillRect(x, 64 - h, i % 10 === 0 ? 2 : 1, h);
  }
  g.fillStyle = "#18201c";
  g.font = "bold 11px monospace";
  g.fillText("UNITEC PRO 600mm STEEL STRAIGHTEDGE", 130, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function woodTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  const rand = rng(3);
  for (let i = 0; i < 8; i += 1) {
    g.fillStyle = `hsl(28, ${32 + rand() * 10}%, ${38 + rand() * 10}%)`;
    g.fillRect(0, i * 64, 512, 64);
    g.strokeStyle = "rgba(40,25,10,0.35)";
    g.strokeRect(0, i * 64, 512, 64);
    for (let k = 0; k < 14; k += 1) {
      g.strokeStyle = `rgba(60,35,15,${0.08 + rand() * 0.12})`;
      g.beginPath();
      const y = i * 64 + rand() * 64;
      g.moveTo(0, y);
      g.bezierCurveTo(170, y + rand() * 8 - 4, 340, y + rand() * 8 - 4, 512, y);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

// ---------------------------------------------------------------------------
// Precision Self-Actuated 3D Tools (working tip at origin, handle toward +z)
// ---------------------------------------------------------------------------

function makeTool(id: ToolId): THREE.Group {
  const g = new THREE.Group();
  const grip = new THREE.Vector3(0, 0, 0.1);
  const black = std(0x1f2420, { roughness: 0.45 });
  const steel = std(0xd8dde2, { metalness: 0.88, roughness: 0.18 });
  const yellow = std(0xf2c230, { roughness: 0.38 });
  const acidMat = std(ACID, { roughness: 0.3, emissive: 0x3f5812, emissiveIntensity: 0.25 });

  switch (id) {
    case "voltageTester": {
      g.add(zCyl(0.009, 0.02, 0.17, yellow));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.022, 16), black);
      tip.rotation.x = -Math.PI / 2;
      tip.position.z = 0.011;
      g.add(tip);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshStandardMaterial({ color: 0x45ff7a, emissive: 0x23ff5a, emissiveIntensity: 1.8 }));
      led.position.set(0, 0.009, 0.03);
      g.add(led);
      grip.set(0, 0, 0.12);
      break;
    }
    case "screwdriver": {
      g.add(zCyl(0.0032, 0, 0.1, steel));
      const tipFlat = box(0.006, 0.0014, 0.012, steel);
      tipFlat.position.z = 0.006;
      g.add(tipFlat);
      g.add(zCyl(0.015, 0.1, 0.2, std(0xe0402a, { roughness: 0.4 })));
      grip.set(0, 0, 0.16);
      break;
    }
    case "sprayBottle": {
      const body = cyl(0.04, 0.042, 0.2, new THREE.MeshPhysicalMaterial({ color: 0x8fc8ff, transmission: 0.6, roughness: 0.15, thickness: 0.02 }));
      body.position.set(0, -0.14, 0.09);
      g.add(body);
      const liquid = cyl(0.036, 0.038, 0.12, std(0x4aa3f0, { transparent: true, opacity: 0.6 }));
      liquid.position.set(0, -0.17, 0.09);
      g.add(liquid);
      const head = box(0.035, 0.05, 0.1, std(0xffffff, { roughness: 0.4 }));
      head.position.set(0, -0.02, 0.06);
      g.add(head);
      const trigger = box(0.012, 0.05, 0.015, std(0x2d6ad6));
      trigger.position.set(0, -0.05, 0.03);
      g.add(trigger);
      const nozzle = zCyl(0.006, 0, 0.015, black);
      g.add(nozzle);
      grip.set(0, -0.06, 0.09);
      break;
    }
    case "sponge": {
      const s = box(0.12, 0.08, 0.04, std(0xf5d04a, { roughness: 0.95 }));
      s.position.z = 0.026;
      const scour = box(0.12, 0.08, 0.008, std(0x2f8f4e, { roughness: 1 }));
      scour.position.z = 0.004;
      g.add(s, scour);
      grip.set(0, 0, 0.065);
      break;
    }
    case "microfiber": {
      const c = box(0.2, 0.15, 0.022, std(0x3c8fd8, { roughness: 1 }));
      c.position.z = 0.011;
      g.add(c);
      grip.set(0, 0, 0.04);
      break;
    }
    case "moistureMeter": {
      const b = box(0.065, 0.14, 0.03, std(0xf07a1e));
      b.position.set(0, -0.03, 0.05);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.03), new THREE.MeshStandardMaterial({ color: 0x9be15d, emissive: 0x5aa02a, emissiveIntensity: 0.9 }));
      screen.position.set(0, -0.0, 0.066);
      g.add(b, screen);
      [-0.012, 0.012].forEach((x) => {
        const pin = zCyl(0.0018, 0, 0.035, steel);
        pin.position.x = x;
        g.add(pin);
      });
      grip.set(0, -0.06, 0.06);
      break;
    }
    case "fillerKnife": {
      const blade = box(0.065, 0.002, 0.075, steel);
      blade.position.z = 0.035;
      blade.rotation.x = 0.7;
      g.add(blade);
      g.add(zCyl(0.011, 0.06, 0.16, std(0x2d5aa8)));
      grip.set(0, 0, 0.12);
      break;
    }
    case "sandingBlock": {
      const b = box(0.1, 0.065, 0.04, std(0x3b6fb8, { roughness: 0.9 }));
      b.position.z = 0.024;
      const paper = box(0.1, 0.065, 0.004, std(0xb9874c, { roughness: 1 }));
      paper.position.z = 0.002;
      g.add(b, paper);
      grip.set(0, 0, 0.05);
      break;
    }
    case "dustBrush": {
      const br = box(0.1, 0.03, 0.04, std(0xc49a62, { roughness: 1 }));
      br.position.z = 0.02;
      const h = box(0.1, 0.03, 0.03, std(0x7a4b2a));
      h.position.z = 0.055;
      g.add(br, h);
      grip.set(0, 0, 0.07);
      break;
    }
    case "angledBrush":
    case "pasteBrush": {
      const w = id === "pasteBrush" ? 0.1 : 0.055;
      const bristles = box(w, 0.014, 0.05, std(id === "pasteBrush" ? 0xe9eef2 : 0xf3f0e8, { roughness: 1 }));
      bristles.position.z = 0.025;
      const ferrule = box(w + 0.004, 0.018, 0.025, steel);
      ferrule.position.z = 0.062;
      g.add(bristles, ferrule);
      g.add(zCyl(0.011, 0.075, 0.2, std(0x9b6a3f)));
      grip.set(0, 0, 0.15);
      break;
    }
    case "primerRoller":
    case "pasteRoller": {
      const nap = id === "primerRoller" ? 0xf4f1ea : 0xdfe7ee;
      const sleeve = cyl(0.026, 0.026, 0.23, std(nap, { roughness: 1 }));
      sleeve.rotation.z = Math.PI / 2;
      sleeve.position.z = 0.026;
      g.add(sleeve);
      const rod1 = cyl(0.004, 0.004, 0.13, steel);
      rod1.position.set(0.122, -0.06, 0.04);
      const rod2 = cyl(0.004, 0.004, 0.13, steel);
      rod2.rotation.z = Math.PI / 2;
      rod2.position.set(0.06, -0.125, 0.05);
      g.add(rod1, rod2);
      const handle = cyl(0.016, 0.016, 0.16, std(0x2a2f2b));
      handle.position.set(0, -0.2, 0.09);
      handle.rotation.x = -0.55;
      g.add(handle);
      grip.set(0, -0.21, 0.1);
      break;
    }
    case "tapeMeasure": {
      const hook = box(0.022, 0.012, 0.01, steel);
      g.add(hook);
      grip.set(0, -0.02, 0.05);
      break;
    }
    case "pencil": {
      g.add(zCyl(0.004, 0.02, 0.18, std(0xf0b72a)));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.02, 10), std(0x3a2a1a));
      tip.rotation.x = -Math.PI / 2;
      tip.position.z = 0.01;
      g.add(tip);
      grip.set(0, 0, 0.1);
      break;
    }
    case "utilityKnife": {
      // Pro 30° Snap-Off Precision Utility Knife with segmented steel blade
      const bladeGroup = new THREE.Group();
      const bladeStrip = box(0.0018, 0.014, 0.052, steel);
      bladeStrip.position.set(0, 0.002, 0.026);
      bladeGroup.add(bladeStrip);
      const bevelTip = new THREE.Mesh(new THREE.ConeGeometry(0.0085, 0.018, 4), steel);
      bevelTip.rotation.x = -Math.PI / 2;
      bevelTip.rotation.z = Math.PI / 4;
      bevelTip.scale.set(0.22, 1, 1);
      bevelTip.position.set(0, 0, 0.006);
      bladeGroup.add(bevelTip);
      for (let s = 1; s <= 4; s += 1) {
        const segLine = box(0.0022, 0.0145, 0.0008, black);
        segLine.position.set(0, 0.002, s * 0.0095);
        bladeGroup.add(segLine);
      }
      const guideChannel = box(0.008, 0.019, 0.05, steel);
      guideChannel.position.set(0, 0.002, 0.064);
      const body = box(0.022, 0.032, 0.145, yellow);
      body.position.set(0, 0, 0.118);
      const overmold = box(0.024, 0.026, 0.095, black);
      overmold.position.set(0, -0.003, 0.128);
      const sliderLock = box(0.026, 0.014, 0.022, std(0xe03a2a));
      sliderLock.position.set(0, 0.014, 0.09);
      g.add(bladeGroup, guideChannel, body, overmold, sliderLock);
      grip.set(0, 0, 0.125);
      break;
    }
    case "stirStick": {
      const s = box(0.03, 0.006, 0.42, std(0xc89a62, { roughness: 0.9 }));
      s.position.z = 0.21;
      g.add(s);
      grip.set(0, 0, 0.38);
      break;
    }
    case "smoother": {
      const blade = box(0.23, 0.1, 0.005, std(0x2fa0c8, { roughness: 0.3, transparent: true, opacity: 0.92 }));
      blade.position.z = 0.003;
      const handle = box(0.14, 0.03, 0.03, std(0x1d6f8f));
      handle.position.set(0, 0.02, 0.02);
      g.add(blade, handle);
      grip.set(0, 0.02, 0.04);
      break;
    }
    case "seamRoller": {
      const roller = cyl(0.016, 0.016, 0.035, std(0x2a2a2a, { roughness: 0.6 }));
      roller.rotation.z = Math.PI / 2;
      roller.position.z = 0.016;
      const fork = box(0.045, 0.06, 0.008, steel);
      fork.position.set(0, -0.03, 0.03);
      const handle = cyl(0.012, 0.012, 0.12, std(0xd84a2a));
      handle.position.set(0, -0.1, 0.06);
      handle.rotation.x = -0.6;
      g.add(roller, fork, handle);
      grip.set(0, -0.11, 0.07);
      break;
    }
    case "flashlight": {
      g.add(zCyl(0.018, 0, 0.16, black));
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.016, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6d0, emissiveIntensity: 2 }));
      lens.position.z = -0.001;
      lens.rotation.y = Math.PI;
      g.add(lens);
      const spot = new THREE.SpotLight(0xfff3d6, 18, 4, 0.5, 0.6, 1.2);
      spot.position.set(0, 0, 0);
      const target = new THREE.Object3D();
      target.position.set(0, 0, -1);
      g.add(spot, target);
      spot.target = target;
      grip.set(0, 0, 0.11);
      break;
    }
    case "hands": {
      // Clean precision placement pad / suction-grip callout puck (no human clutter!)
      const pad = box(0.09, 0.06, 0.012, acidMat);
      pad.position.z = 0.008;
      const handle = box(0.05, 0.022, 0.022, black);
      handle.position.z = 0.024;
      g.add(pad, handle);
      grip.set(0, 0, 0.03);
      break;
    }
    case "clock":
    default:
      grip.set(0, 0, 0);
      break;
  }
  g.userData.grip = grip;
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
  });
  return g;
}

// ---------------------------------------------------------------------------
// Drop rig (with live progressive Top & Bottom Cut Flaps + Floor Offcut Strip)
// ---------------------------------------------------------------------------

interface DropRig {
  group: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  clip: THREE.Plane;
  topFlapUncut: THREE.Mesh;
  topFlapCut: THREE.Mesh;
  botFlapUncut: THREE.Mesh;
  botFlapCut: THREE.Mesh;
  floorOffcut: THREE.Mesh;
  topKerfLine: THREE.Mesh;
  botKerfLine: THREE.Mesh;
  flapMat: THREE.MeshStandardMaterial;
  bubbles: THREE.Mesh[];
  smears: THREE.Mesh[];
  paste: THREE.Mesh;
  pasteMat: THREE.MeshStandardMaterial;
}

export class TaskSimulatorScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly macroCamera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  onUserCamera?: () => void;

  private container: HTMLElement;
  private raf = 0;
  private resizeObserver: ResizeObserver;
  private autoCam = true;
  private camGoalPos = new THREE.Vector3(0.6, 1.5, 4.2);
  private camGoalTarget = new THREE.Vector3(0, 1.3, 0);
  private macroPos = new THREE.Vector3(0, 1.2, 0.25);
  private macroTarget = new THREE.Vector3(0, 1.2, 0);
  private stepIdx = -1;
  private progress = 0;
  private showPath = true;
  private showMacro = true;
  private exploded = false;
  private explodeCurrent = 0;
  private viewMode: SimulatorViewMode = "room";
  private snapNext = true;
  private lastStepIdx: number | null = null;
  private surfaceMode: SimulatorSurfaceMode = "botanical";

  private toolCache = new Map<ToolId, THREE.Group>();
  private activeTool: THREE.Group | null = null;
  private secondaryPad: THREE.Group;
  private straightedge: THREE.Group;
  private plate: THREE.Group;
  private dropCloth: THREE.Mesh;

  private floorMesh!: THREE.Mesh;
  private wallMesh!: THREE.Mesh;
  private drawingOutlines: THREE.LineSegments[] = [];

  private dirt: THREE.Mesh[] = [];
  private holes: THREE.Mesh[] = [];
  private patches: THREE.Mesh[] = [];
  private wetOverlay: THREE.Mesh;
  private foamOverlay: THREE.Mesh;
  private primerFill: THREE.Mesh;
  private primerFrame: THREE.Mesh[] = [];
  private pencilLine: THREE.Mesh;
  private laserLine: THREE.Mesh;
  private laserDevice: THREE.Group;
  private tapeCase: THREE.Mesh;
  private tapeBlade: THREE.Mesh;
  private drops: DropRig[] = [];
  private opening: THREE.Mesh;
  private xCuts: THREE.Mesh[] = [];
  private outletFlaps: THREE.Group[] = [];
  private sheetOnTable: THREE.Mesh;
  private tableCutKerf: THREE.Mesh;
  private tableOffcutStrip: THREE.Mesh;
  private stack: THREE.Mesh;
  private mist: THREE.Points;
  private pathLines: THREE.LineSegments;
  private axes: THREE.AxesHelper;
  private marker: THREE.Mesh;
  private focusRing: THREE.Mesh;

  constructor(container: HTMLElement) {
    this.container = container;
    const w = Math.max(320, container.clientWidth);
    const h = Math.max(240, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    this.renderer.domElement.className = "sim-canvas";
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.background = new THREE.Color(0x161b18);

    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.03, 40);
    this.camera.position.copy(this.camGoalPos);
    // Dedicated 3.5x Telephoto Macro Camera for the Step Detail Zoom PiP window
    this.macroCamera = new THREE.PerspectiveCamera(24, 1, 0.01, 12);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.camGoalTarget);
    this.controls.enableDamping = true;
    this.controls.maxDistance = 7;
    this.controls.minDistance = 0.18;
    this.controls.addEventListener("start", () => {
      if (this.autoCam) {
        this.autoCam = false;
        this.onUserCamera?.();
      }
    });

    this.buildLights();
    this.buildRoom();

    // Secondary placement pad (for 2-point operations like holding the second corner of a drop)
    this.secondaryPad = makeTool("hands");
    this.secondaryPad.visible = false;
    this.scene.add(this.secondaryPad);

    // Pro 600mm Graduated Stainless-Steel Straightedge with Finger-Guard Rib
    this.straightedge = new THREE.Group();
    const ruleMat = new THREE.MeshStandardMaterial({
      map: rulerTexture(),
      metalness: 0.78,
      roughness: 0.24,
    });
    const ruleBlade = box(0.56, 0.056, 0.004, ruleMat);
    const guardRib = box(0.52, 0.016, 0.016, std(0x232a26, { metalness: 0.4, roughness: 0.4 }));
    guardRib.position.set(0, 0, 0.009);
    const capL = box(0.018, 0.058, 0.012, std(ACID, { roughness: 0.35 }));
    capL.position.set(-0.275, 0, 0.004);
    const capR = box(0.018, 0.058, 0.012, std(ACID, { roughness: 0.35 }));
    capR.position.set(0.275, 0, 0.004);
    this.straightedge.add(ruleBlade, guardRib, capL, capR);
    this.straightedge.visible = false;
    this.scene.add(this.straightedge);

    this.plate = new THREE.Group();
    const plateBody = box(0.085, 0.125, 0.008, std(0xf6f4ee, { roughness: 0.35 }));
    this.plate.add(plateBody);
    [-0.028, 0.028].forEach((dy) => {
      const rec = box(0.035, 0.03, 0.004, std(0xe4e1d8));
      rec.position.set(0, dy, 0.005);
      this.plate.add(rec);
    });
    [-0.045, 0.045].forEach((dy) => {
      const screw = zCyl(0.004, 0.004, 0.007, std(0xb5b9bc, { metalness: 0.8, roughness: 0.3 }));
      screw.position.y = dy;
      this.plate.add(screw);
    });
    this.scene.add(this.plate);

    // Wall-state overlays -----------------------------------------------------
    const rand = rng(11);
    const dirtMat = (o: number) => new THREE.MeshBasicMaterial({ color: 0x5b4a36, transparent: true, opacity: o, depthWrite: false });
    for (let i = 0; i < 18; i += 1) {
      const r = 0.05 + rand() * 0.13;
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), dirtMat(0.18 + rand() * 0.2));
      m.scale.y = 0.5 + rand();
      m.position.set(WALL.x0 + 0.2 + rand() * (WALL.widthM - 0.4), 0.4 + rand() * 1.9, 0.0015);
      m.userData.base = (m.material as THREE.MeshBasicMaterial).opacity;
      this.dirt.push(m);
      this.scene.add(m);
    }
    HOLES.forEach(([x, y]) => {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.011, 16), new THREE.MeshBasicMaterial({ color: 0x2a221a }));
      hole.position.set(x, y, 0.0012);
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), std(0xffffff, { roughness: 0.95, transparent: true, opacity: 0 }));
      patch.position.set(x, y, 0.0018);
      this.holes.push(hole);
      this.patches.push(patch);
      this.scene.add(hole, patch);
    });

    const fullW = WALL.widthM;
    const fullH = WALL.height - WALL.baseboard;
    const midY = WALL.baseboard + fullH / 2;
    this.wetOverlay = new THREE.Mesh(new THREE.PlaneGeometry(fullW, fullH), new THREE.MeshStandardMaterial({ color: 0x8fb4d6, transparent: true, opacity: 0, roughness: 0.1, depthWrite: false }));
    this.wetOverlay.position.set(0, midY, 0.0024);
    this.foamOverlay = new THREE.Mesh(new THREE.PlaneGeometry(fullW, fullH), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    this.foamOverlay.position.set(0, midY, 0.0026);
    this.scene.add(this.wetOverlay, this.foamOverlay);

    const primerMat = std(0xf4f1ea, { roughness: 0.85 });
    this.primerFill = anchoredPlane(fullW, fullH, primerMat, "left");
    this.primerFill.position.set(WALL.x0, midY, 0.003);
    this.primerFill.receiveShadow = true;
    this.scene.add(this.primerFill);
    const band = 0.08;
    const top = anchoredPlane(fullW, band, primerMat, "left");
    top.position.set(WALL.x0, WALL.height - band / 2, 0.0032);
    const rightS = anchoredPlane(band, fullH, primerMat, "top");
    rightS.position.set(WALL.x1 - band / 2, WALL.height, 0.0032);
    const bottom = anchoredPlane(fullW, band, primerMat, "right");
    bottom.position.set(WALL.x1, WALL.baseboard + band / 2, 0.0032);
    const leftS = anchoredPlane(band, fullH, primerMat, "bottom");
    leftS.position.set(WALL.x0 + band / 2, WALL.baseboard, 0.0032);
    this.primerFrame = [top, rightS, bottom, leftS];
    this.scene.add(...this.primerFrame);

    this.pencilLine = anchoredPlane(0.0025, fullH, new THREE.MeshBasicMaterial({ color: 0x4a4a4a }), "top");
    this.pencilLine.position.set(PLUMB_X, WALL.height, 0.0036);
    this.laserLine = new THREE.Mesh(new THREE.PlaneGeometry(0.003, WALL.height), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.85 }));
    this.laserLine.position.set(PLUMB_X, WALL.height / 2, 0.0095);
    this.scene.add(this.pencilLine, this.laserLine);

    this.laserDevice = new THREE.Group();
    const lb = box(0.09, 0.1, 0.07, std(0x2e7d32));
    lb.position.y = 0.05;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff1111, emissiveIntensity: 2 }));
    win.position.set(0, 0.07, -0.036);
    win.rotation.y = Math.PI;
    this.laserDevice.add(lb, win);
    this.laserDevice.position.set(PLUMB_X, 0, 0.6);
    this.scene.add(this.laserDevice);

    this.tapeCase = box(0.07, 0.07, 0.035, std(0xf2c230));
    this.tapeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.019, 1, 0.0015), std(0xf6d64a, { metalness: 0.4, roughness: 0.35 }));
    this.scene.add(this.tapeCase, this.tapeBlade);

    // Drops + Precision Cut Flaps & Kerf Lines ------------------------------
    const tex = wallpaperTexture(this.surfaceMode);
    const kerfMat = new THREE.MeshBasicMaterial({ color: 0x141614 });
    for (let i = 0; i < DROP_COUNT; i += 1) {
      const r = dropRect(i);
      const width = r.x1 - r.x0;
      const t = tex.clone();
      t.needsUpdate = true;
      t.repeat.set(width / DROP_WIDTH, fullH / 0.64);
      const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, clippingPlanes: [clip], side: THREE.DoubleSide });
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, fullH), mat);
      mesh.position.y = -fullH / 2;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      group.add(mesh);
      this.addOutline(mesh);

      const flapMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, transparent: true, side: THREE.DoubleSide });
      const topFlapUncut = anchoredPlane(width, 0.048, flapMat, "right");
      const topFlapCut = anchoredPlane(width, 0.048, flapMat, "left");
      const botFlapUncut = anchoredPlane(width, 0.065, flapMat, "right");
      const botFlapCut = anchoredPlane(width, 0.065, flapMat, "left");
      const floorOffcut = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.92, 0.055), flapMat);
      floorOffcut.rotation.x = -Math.PI / 2 + 0.08;
      floorOffcut.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.06;
      floorOffcut.position.set((r.x0 + r.x1) / 2, 0.008, 0.16 + (i % 3) * 0.05);

      const topKerfLine = anchoredPlane(width, 0.0038, kerfMat, "left");
      topKerfLine.position.set(r.x0, WALL.height - 0.003, 0.0082);
      const botKerfLine = anchoredPlane(width, 0.0038, kerfMat, "left");
      botKerfLine.position.set(r.x0, WALL.baseboard + 0.003, 0.0082);

      this.scene.add(topFlapUncut, topFlapCut, botFlapUncut, botFlapCut, floorOffcut, topKerfLine, botKerfLine);

      const bubbles: THREE.Mesh[] = [];
      const br = rng(100 + i);
      for (let k = 0; k < 6; k += 1) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.022 + br() * 0.015, 14, 10), std(0xece6d5, { roughness: 0.6 }));
        b.scale.z = 0.25;
        b.position.set((br() - 0.5) * (width - 0.1), -(0.2 + br() * (fullH - 0.4)), 0.001);
        group.add(b);
        bubbles.push(b);
      }
      const smears: THREE.Mesh[] = [];
      for (let k = 0; k < 3; k += 1) {
        const s = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }));
        s.scale.set(0.6, 1.6, 1);
        s.position.set((k % 2 === 0 ? 1 : -1) * (width / 2 - 0.03), -(0.4 + k * 0.7), 0.0012);
        group.add(s);
        smears.push(s);
      }

      const pr = { x0: Math.max(WALL.x0, r.x0 - 0.03), x1: Math.min(WALL.x1, r.x1 + 0.03) };
      const pasteMat = new THREE.MeshStandardMaterial({ color: 0x9fc3e0, transparent: true, opacity: 0.62, roughness: 0.05, metalness: 0.1, depthWrite: false });
      const paste = anchoredPlane(pr.x1 - pr.x0, fullH - 0.04, pasteMat, "left");
      paste.position.set(pr.x0, midY, 0.004 + i * 0.0001);
      this.scene.add(group, paste);
      this.drops.push({
        group,
        mat,
        clip,
        topFlapUncut,
        topFlapCut,
        botFlapUncut,
        botFlapCut,
        floorOffcut,
        topKerfLine,
        botKerfLine,
        flapMat,
        bubbles,
        smears,
        paste,
        pasteMat,
      });
    }

    // Outlet recess + Diagonal X-Cut lines + 4 Hinged Triangular Relief Flaps
    this.opening = new THREE.Mesh(new THREE.PlaneGeometry(OUTLET.w, OUTLET.h), new THREE.MeshStandardMaterial({ color: 0x262522, roughness: 0.9 }));
    this.opening.position.set(OUTLET.x, OUTLET.y, 0.0078);
    this.scene.add(this.opening);
    const diag = Math.hypot(OUTLET.w, OUTLET.h);
    const ang = Math.atan2(OUTLET.h, OUTLET.w);
    [ang, -ang].forEach((a) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(diag, 0.0024), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
      line.position.set(OUTLET.x, OUTLET.y, 0.0085);
      line.rotation.z = a;
      this.xCuts.push(line);
      this.scene.add(line);
    });

    const hw = OUTLET.w / 2;
    const hh = OUTLET.h / 2;
    const flapDefs: { hinge: [number, number]; verts: [number, number][]; axis: "x" | "y"; dir: 1 | -1 }[] = [
      { hinge: [OUTLET.x, OUTLET.y + hh], verts: [[-hw, 0], [hw, 0], [0, -hh]], axis: "x", dir: -1 },
      { hinge: [OUTLET.x, OUTLET.y - hh], verts: [[-hw, 0], [hw, 0], [0, hh]], axis: "x", dir: 1 },
      { hinge: [OUTLET.x - hw, OUTLET.y], verts: [[0, -hh], [0, hh], [hw, 0]], axis: "y", dir: -1 },
      { hinge: [OUTLET.x + hw, OUTLET.y], verts: [[0, -hh], [0, hh], [-hw, 0]], axis: "y", dir: 1 },
    ];
    const triFlapMat = std(0xece6d5, { roughness: 0.8, side: THREE.DoubleSide });
    flapDefs.forEach((d) => {
      const shape = new THREE.Shape();
      shape.moveTo(d.verts[0][0], d.verts[0][1]);
      shape.lineTo(d.verts[1][0], d.verts[1][1]);
      shape.lineTo(d.verts[2][0], d.verts[2][1]);
      shape.closePath();
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), triFlapMat);
      const pivot = new THREE.Group();
      pivot.position.set(d.hinge[0], d.hinge[1], 0.0082);
      pivot.userData = { axis: d.axis, dir: d.dir };
      pivot.add(mesh);
      pivot.visible = false;
      this.outletFlaps.push(pivot);
      this.scene.add(pivot);
    });

    // Table items + Table Cutting Kerf & Peeling Offcut Strip
    this.sheetOnTable = new THREE.Mesh(new THREE.PlaneGeometry(0.95, DROP_WIDTH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
    this.sheetOnTable.rotation.x = -Math.PI / 2;
    this.sheetOnTable.rotation.z = Math.PI / 2;
    this.sheetOnTable.position.set(1.45, TABLE.y + 0.002, (TABLE.z0 + TABLE.z1) / 2);

    this.tableCutKerf = anchoredPlane(DROP_WIDTH, 0.0038, kerfMat, "left");
    this.tableCutKerf.rotation.x = -Math.PI / 2;
    this.tableCutKerf.rotation.z = -Math.PI / 2;
    this.tableCutKerf.position.set(1.73, TABLE.y + 0.0035, TABLE.z0 + 0.05);
    this.tableCutKerf.visible = false;

    this.tableOffcutStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, DROP_WIDTH),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }),
    );
    this.tableOffcutStrip.rotation.x = -Math.PI / 2;
    this.tableOffcutStrip.position.set(1.78, TABLE.y + 0.004, (TABLE.z0 + TABLE.z1) / 2);
    this.tableOffcutStrip.visible = false;

    this.stack = box(0.52, 1, 0.5, std(0xe5dfcd, { roughness: 0.9 }));
    this.scene.add(this.sheetOnTable, this.tableCutKerf, this.tableOffcutStrip, this.stack);

    this.dropCloth = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), std(0xd9cfb8, { roughness: 1, side: THREE.DoubleSide }));
    this.dropCloth.rotation.x = -Math.PI / 2;
    this.dropCloth.receiveShadow = true;
    this.scene.add(this.dropCloth);

    // Mist particles
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(220 * 3), 3));
    this.mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({ color: 0xcfe8ff, size: 0.012, transparent: true, opacity: 0.75, depthWrite: false }));
    this.mist.frustumCulled = false;
    this.scene.add(this.mist);

    // Robot toolpath overlay + Active Callout Target Ring
    this.pathLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthTest: false }));
    this.pathLines.renderOrder = 10;
    this.pathLines.frustumCulled = false;
    this.marker = new THREE.Mesh(new THREE.SphereGeometry(0.009, 14, 10), new THREE.MeshBasicMaterial({ color: ACID, depthTest: false }));
    this.marker.renderOrder = 11;
    this.focusRing = new THREE.Mesh(
      new THREE.RingGeometry(0.024, 0.03, 28),
      new THREE.MeshBasicMaterial({ color: ACID, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthTest: false }),
    );
    this.focusRing.renderOrder = 11;
    this.axes = new THREE.AxesHelper(0.35);
    this.axes.position.set(0, 0.005, 0.005);
    this.scene.add(this.pathLines, this.marker, this.focusRing, this.axes);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.setFrame(0, 0);
    this.loop();
  }

  private addOutline(mesh: THREE.Mesh) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.65 }),
    );
    line.visible = false;
    mesh.add(line);
    this.drawingOutlines.push(line);
  }

  // -------------------------------------------------------------------------

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x3a3328, 0.65));
    const key = new THREE.DirectionalLight(0xfff1dd, 2.2);
    key.position.set(2.5, 3.6, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -1;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    const fill = new THREE.PointLight(0xdfe9ff, 6, 8);
    fill.position.set(-1.8, 2.2, 2.2);
    this.scene.add(fill);
  }

  private buildRoom() {
    const floorMat = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.7 });
    this.floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(0, 0, 2.6);
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    const wallMat = std(0xb6a892, { roughness: 0.92 });
    this.wallMesh = box(WALL.widthM + 0.4, WALL.height, 0.1, wallMat);
    this.wallMesh.position.set(0, WALL.height / 2, -0.05);
    this.addOutline(this.wallMesh);
    this.scene.add(this.wallMesh);

    const sideMat = std(0xcfc6b6, { roughness: 0.95, side: THREE.DoubleSide });
    [WALL.x0, WALL.x1].forEach((x, i) => {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(4, WALL.height), sideMat);
      side.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
      side.position.set(x, WALL.height / 2, 2);
      side.receiveShadow = true;
      this.scene.add(side);
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(WALL.widthM, 4), std(0xf2efe8, { side: THREE.DoubleSide }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, WALL.height, 2);
    this.scene.add(ceiling);

    const baseboard = box(WALL.widthM, WALL.baseboard, 0.018, std(0xf4f2ec, { roughness: 0.4 }));
    baseboard.position.set(0, WALL.baseboard / 2, 0.009);
    this.addOutline(baseboard);
    this.scene.add(baseboard);

    const recess = new THREE.Mesh(new THREE.PlaneGeometry(OUTLET.w, OUTLET.h), std(0x3d3c38));
    recess.position.set(OUTLET.x, OUTLET.y, 0.0008);
    this.scene.add(recess);

    // Table
    const woodMat = std(0x8c6a4a, { roughness: 0.6 });
    const top = box(TABLE.x1 - TABLE.x0, 0.035, TABLE.z1 - TABLE.z0, woodMat);
    top.position.set((TABLE.x0 + TABLE.x1) / 2, TABLE.y - 0.018, (TABLE.z0 + TABLE.z1) / 2);
    this.addOutline(top);
    this.scene.add(top);
    [[TABLE.x0 + 0.05, TABLE.z0 + 0.05], [TABLE.x1 - 0.05, TABLE.z0 + 0.05], [TABLE.x0 + 0.05, TABLE.z1 - 0.05], [TABLE.x1 - 0.05, TABLE.z1 - 0.05]].forEach(([x, z]) => {
      const leg = box(0.04, TABLE.y - 0.035, 0.04, woodMat);
      leg.position.set(x, (TABLE.y - 0.035) / 2, z);
      this.addOutline(leg);
      this.scene.add(leg);
    });
    [0.85, 0.97, 1.09].forEach((x, i) => {
      const roll = cyl(0.05, 0.05, DROP_WIDTH, std(i === 0 ? 0xe9e2cf : 0xe3dcc8, { roughness: 0.85 }));
      roll.rotation.x = Math.PI / 2;
      roll.position.set(x, TABLE.y + 0.05, (TABLE.z0 + TABLE.z1) / 2);
      this.scene.add(roll);
    });

    // Buckets
    const bucket = (pos: Vec3, liquid: number) => {
      const g = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.3, 28, 1, true), std(0xf2f2f2, { side: THREE.DoubleSide, roughness: 0.4 }));
      shell.position.y = 0.15;
      shell.castShadow = true;
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.13, 28), std(0xe8e8e8));
      bottom.rotation.x = -Math.PI / 2;
      bottom.position.y = 0.005;
      const liq = new THREE.Mesh(new THREE.CircleGeometry(0.142, 28), std(liquid, { roughness: 0.15 }));
      liq.rotation.x = -Math.PI / 2;
      liq.position.y = 0.22;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.004, 6, 24, Math.PI), std(0x888888, { metalness: 0.7 }));
      handle.position.y = 0.3;
      g.add(shell, bottom, liq, handle);
      g.position.set(...pos);
      this.scene.add(g);
    };
    bucket(SOAP_BUCKET, 0x6fb3e8);
    bucket(PASTE_BUCKET, 0xf0f2f2);

    const tray = box(0.3, 0.04, 0.38, std(0x9aa3a8, { metalness: 0.3 }));
    tray.position.set(0.55, 0.02, 0.75);
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.2), std(0xf4f1ea, { roughness: 0.2 }));
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(0.55, 0.042, 0.82);
    this.scene.add(tray, puddle);

    // Stepladder
    const ladMat = std(0xb8bec2, { metalness: 0.6, roughness: 0.35 });
    const lad = new THREE.Group();
    [-0.2, 0.2].forEach((x) => {
      const f = box(0.03, 1.3, 0.03, ladMat);
      f.position.set(x, 0.62, 0);
      f.rotation.x = 0.17;
      const b = box(0.03, 1.3, 0.03, ladMat);
      b.position.set(x, 0.62, 0.35);
      b.rotation.x = -0.17;
      lad.add(f, b);
    });
    [0.3, 0.6, 0.9].forEach((y) => {
      const step = box(0.42, 0.025, 0.1, ladMat);
      step.position.set(0, y, 0.11 - y * 0.12);
      lad.add(step);
    });
    lad.position.set(-1.65, 0, 1.4);
    lad.rotation.y = 0.4;
    this.scene.add(lad);
  }

  private resize() {
    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderScene();
  }

  private renderScene() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 500;
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.renderer.render(this.scene, this.camera);

    // Render the 3.5x Step Detail Macro Zoom inset in the bottom-right corner
    if (this.showMacro && w > 520 && h > 360) {
      const size = 216;
      const padX = 14;
      const padY = 52;
      this.macroCamera.aspect = 1;
      this.macroCamera.updateProjectionMatrix();
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(w - size - padX, padY, size, size);
      this.renderer.setViewport(w - size - padX, padY, size, size);
      this.renderer.render(this.scene, this.macroCamera);
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, w, h);
    }
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    if (this.autoCam) {
      this.camera.position.lerp(this.camGoalPos, 0.11);
      this.controls.target.lerp(this.camGoalTarget, 0.11);
    }
    const targetExplode = this.exploded ? 1 : 0;
    if (Math.abs(this.explodeCurrent - targetExplode) > 0.001) {
      this.explodeCurrent += (targetExplode - this.explodeCurrent) * 0.14;
      this.applyExplodedOffsets();
    }
    this.controls.update();
    this.updateMist(performance.now() / 1000);
    this.renderScene();
  };

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  setAutoCamera(on: boolean) {
    this.autoCam = on;
  }

  setShowToolpath(on: boolean) {
    this.showPath = on;
    this.pathLines.visible = on;
    this.marker.visible = on;
    this.axes.visible = on;
  }

  setShowMacroZoom(on: boolean) {
    this.showMacro = on;
    this.renderScene();
  }

  setExploded(on: boolean) {
    if (this.exploded === on && Math.abs(this.explodeCurrent - (on ? 1 : 0)) < 0.01) return;
    this.exploded = on;
    this.explodeCurrent = on ? 1 : 0;
    this.applyExplodedOffsets();
    if (on && this.autoCam) {
      this.camGoalPos.set(1.65, 1.65, 3.45);
      this.camGoalTarget.set(0, 1.3, 0.2);
      this.camera.position.copy(this.camGoalPos);
      this.controls.target.copy(this.camGoalTarget);
      this.controls.update();
    } else if (!on && this.stepIdx >= 0) {
      this.placeActors(WALLPAPER_TASK[this.stepIdx], this.progress);
      if (this.autoCam) {
        this.camera.position.copy(this.camGoalPos);
        this.controls.target.copy(this.camGoalTarget);
        this.controls.update();
      }
    }
    this.renderScene();
  }

  setViewMode(mode: SimulatorViewMode) {
    this.viewMode = mode;
    const isDrawing = mode === "drawing";
    this.scene.background = new THREE.Color(isDrawing ? 0xf2eee3 : 0x161b18);
    (this.wallMesh.material as THREE.MeshStandardMaterial).color.setHex(isDrawing ? 0xfaf7f0 : 0xb6a892);
    (this.floorMesh.material as THREE.MeshStandardMaterial).opacity = isDrawing ? 0.35 : 1;
    (this.floorMesh.material as THREE.MeshStandardMaterial).transparent = isDrawing;
    this.drawingOutlines.forEach((l) => {
      l.visible = isDrawing;
    });
    this.renderScene();
  }

  setSurfaceMode(mode: SimulatorSurfaceMode) {
    this.surfaceMode = mode;
    const fullH = WALL.height - WALL.baseboard;
    const baseTex = wallpaperTexture(mode);
    const rough = mode === "eclipse-sheet" ? 0.14 : mode === "marble-roll" ? 0.32 : mode === "wpc-choco" ? 0.55 : 0.82;
    this.drops.forEach((rig, i) => {
      const r = dropRect(i);
      const width = r.x1 - r.x0;
      const t = baseTex.clone();
      t.needsUpdate = true;
      t.repeat.set(width / DROP_WIDTH, fullH / 0.64);
      rig.mat.map = t;
      rig.mat.roughness = rough;
      rig.mat.needsUpdate = true;
      rig.flapMat.map = t;
      rig.flapMat.roughness = rough;
      rig.flapMat.needsUpdate = true;
    });
    const sheetMat = this.sheetOnTable.material as THREE.MeshStandardMaterial;
    sheetMat.map = baseTex;
    sheetMat.roughness = rough;
    sheetMat.needsUpdate = true;
    this.renderScene();
  }

  snapshot(): string {
    this.renderScene();
    return this.renderer.domElement.toDataURL("image/png");
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  setFrame(stepIdx: number, progress: number) {
    const step = WALLPAPER_TASK[stepIdx];
    const stepChanged = stepIdx !== this.stepIdx;
    const progressJump = Math.abs(progress - this.progress) > 0.2;
    this.stepIdx = stepIdx;
    this.progress = progress;
    if (stepChanged) {
      this.buildPathOverlay(step);
      this.updateCameraGoal(step);
    }
    this.applyWallState();
    this.placeActors(step, progress);
    this.applyExplodedOffsets();
    if (this.autoCam && (this.snapNext || stepChanged || progressJump)) {
      const far = this.camera.position.distanceTo(this.camGoalPos) > 0.5;
      if (this.snapNext || far) {
        this.camera.position.copy(this.camGoalPos);
        this.controls.target.copy(this.camGoalTarget);
        this.controls.update();
      }
    }
    this.snapNext = false;
    this.lastStepIdx = stepIdx;
    this.renderScene();
  }

  // -------------------------------------------------------------------------

  private applyExplodedOffsets() {
    const e = this.explodeCurrent;
    this.primerFill.position.z = 0.003 + e * 0.12;
    this.primerFrame.forEach((m) => {
      m.position.z = 0.0032 + e * 0.12;
    });
    this.drops.forEach((rig, i) => {
      const ph = this.dropPhases(i);
      rig.paste.visible = ph.paste > 0.001 && (ph.hang < 1 || e > 0.05);
      rig.paste.position.z = 0.004 + i * 0.0001 + e * 0.24;
      if (rig.group.visible) {
        const pose = dropHangPose(i, ph.hang);
        rig.group.position.z = pose.pos[2] + e * (0.36 + (i % 2) * 0.025);
      }
    });
    this.laserLine.position.z = 0.0095 + e * 0.48;
    if (this.plate.visible) {
      this.plate.position.z = Math.max(this.plate.position.z, 0.009 + e * 0.52);
    }
  }

  private done(id: string): number {
    const idx = WALLPAPER_TASK.findIndex((s) => s.id === id);
    if (idx < this.stepIdx) return 1;
    if (idx === this.stepIdx) return this.progress;
    return 0;
  }

  private dropPhases(i: number) {
    const d = (id: string) => this.done(id);
    if (i <= 2) {
      const n = i + 1;
      return {
        paste: d(`glue-band-${n}`),
        hang: d(`hang-drop-${n}`),
        smooth: d(`smooth-drop-${n}`),
        trim: d(`trim-drop-${n}`),
        clean: i === 0 ? d("clean-drop-1") : d(`trim-drop-${n}`),
        relief: i === 2 ? d("relief-cut") : 0,
      };
    }
    const p = d("hang-drops-4-8");
    const local = clamp01(p * 5 - (i - 3));
    return {
      paste: clamp01(local / 0.2),
      hang: clamp01((local - 0.2) / 0.4),
      smooth: clamp01((local - 0.6) / 0.2),
      trim: clamp01((local - 0.8) / 0.2),
      clean: clamp01((local - 0.8) / 0.2),
      relief: 0,
    };
  }

  private applyWallState() {
    const d = (id: string) => this.done(id);

    // Clean
    const scrub = d("clean-scrub");
    const rinse = d("clean-rinse");
    const dirtLeft = Math.max(0, 1 - 0.65 * scrub - 0.35 * rinse);
    this.dirt.forEach((m) => {
      (m.material as THREE.MeshBasicMaterial).opacity = m.userData.base * dirtLeft;
    });
    const wet = Math.min(1, d("clean-spray") * 1.2) * (1 - d("clean-dry"));
    (this.wetOverlay.material as THREE.MeshStandardMaterial).opacity = 0.22 * wet;
    (this.foamOverlay.material as THREE.MeshBasicMaterial).opacity = 0.2 * Math.sin(Math.min(1, scrub) * Math.PI * 0.5) * (1 - rinse);

    // Repair
    const fill = d("repair-fill");
    const sand = d("repair-sand");
    this.patches.forEach((p, i) => {
      const reached = clamp01(fill * HOLES.length - i);
      const mat = p.material as THREE.MeshStandardMaterial;
      mat.opacity = reached;
      p.scale.setScalar(1 - 0.3 * sand);
      mat.color.setHex(sand > 0.5 ? 0xe2dccf : 0xffffff);
      this.holes[i].visible = reached < 0.9;
    });

    // Prime
    const cutIn = d("prime-cutin");
    const lens = [WALL.widthM, WALL.height, WALL.widthM, WALL.height];
    const total = lens.reduce((a, b) => a + b, 0);
    let acc = 0;
    this.primerFrame.forEach((m, i) => {
      const seg = clamp01((cutIn * total - acc) / lens[i]);
      acc += lens[i];
      m.visible = seg > 0.001;
      if (i % 2 === 0) m.scale.x = Math.max(0.001, seg);
      else m.scale.y = Math.max(0.001, seg);
    });
    const roll = d("prime-roll");
    this.primerFill.visible = roll > 0.001;
    this.primerFill.scale.x = Math.max(0.001, roll);
    (this.primerFill.material as THREE.MeshStandardMaterial).roughness = 0.4 + 0.5 * d("prime-cure");

    // Layout & Table Cutting
    const plumb = d("layout-plumb");
    const laserOn = plumb > 0 && d("trim-drop-1") < 1;
    this.laserLine.visible = laserOn;
    this.laserDevice.visible = laserOn;
    this.pencilLine.visible = plumb > 0;
    this.pencilLine.scale.y = Math.max(0.001, plumb);

    const cut = d("layout-cut");
    const onTableCut = cut > 0 && cut < 1;
    this.sheetOnTable.visible = onTableCut;
    this.tableCutKerf.visible = onTableCut;
    this.tableOffcutStrip.visible = onTableCut;
    if (onTableCut) {
      const passFrac = (cut * 3) % 1;
      this.tableCutKerf.scale.x = Math.max(0.01, clamp01((passFrac - 0.1) / 0.75));
      this.tableOffcutStrip.position.x = 1.77 + Math.max(0, passFrac - 0.5) * 0.06;
      this.tableOffcutStrip.rotation.y = Math.max(0, passFrac - 0.3) * 0.35;
    }

    let hungCount = 0;
    for (let i = 0; i < DROP_COUNT; i += 1) if (this.dropPhases(i).hang > 0) hungCount += 1;
    const remaining = cut <= 0 ? 0 : Math.max(0, Math.round(DROP_COUNT * Math.min(1, cut * 1.05)) - hungCount);
    this.stack.visible = remaining > 0;
    this.stack.scale.y = Math.max(0.001, remaining * 0.004);
    this.stack.position.set(1.62, TABLE.y + (remaining * 0.004) / 2, (TABLE.z0 + TABLE.z1) / 2);

    // Drop cloth
    const lay = d("protect-floor");
    this.dropCloth.visible = lay > 0.05;
    const clothW = Math.max(0.05, lay * WALL.widthM);
    this.dropCloth.scale.set(clothW, 0.95, 1);
    this.dropCloth.position.set(WALL.x1 - clothW / 2, 0.003, 0.03 + 0.95 / 2);

    // Drops + Progressive Cut Flaps (Ceiling + Baseboard + Floor Offcuts)
    this.drops.forEach((rig, i) => {
      const ph = this.dropPhases(i);
      rig.paste.visible = ph.paste > 0.001 && ph.hang < 1;
      rig.paste.scale.x = Math.max(0.001, ph.paste);
      rig.pasteMat.opacity = 0.62;

      const visible = ph.hang > 0;
      rig.group.visible = visible;
      if (!visible) {
        rig.topFlapUncut.visible = false;
        rig.topFlapCut.visible = false;
        rig.botFlapUncut.visible = false;
        rig.botFlapCut.visible = false;
        rig.floorOffcut.visible = false;
        rig.topKerfLine.visible = false;
        rig.botKerfLine.visible = false;
        return;
      }
      const pose = dropHangPose(i, ph.hang);
      rig.group.position.set(...pose.pos);
      rig.group.rotation.set(0, pose.rotY, 0);
      const fullH = WALL.height - WALL.baseboard;
      const cutY = pose.pos[1] - pose.visibleFrac * fullH - 0.001;
      rig.clip.constant = -cutY;

      const settled = ph.hang >= 0.999;
      rig.bubbles.forEach((b) => {
        const depth = -b.position.y / fullH;
        b.visible = settled && ph.smooth < depth + 0.02;
      });
      rig.smears.forEach((s) => {
        (s.material as THREE.MeshStandardMaterial).opacity = settled ? 0.4 * (1 - ph.clean) : 0;
      });

      const r = dropRect(i);
      const topCutFrac = clamp01((ph.trim - 0.05) / 0.38);
      const topFall = clamp01((ph.trim - 0.4) / 0.14);
      rig.topFlapUncut.visible = settled && topCutFrac < 0.995;
      rig.topFlapUncut.position.set(r.x1, WALL.height - 0.024, 0.009);
      rig.topFlapUncut.scale.x = Math.max(0.001, 1 - topCutFrac);

      rig.topFlapCut.visible = settled && topCutFrac > 0.01 && topFall < 1;
      rig.topFlapCut.position.set(r.x0, WALL.height - 0.024 - topFall * 0.45, 0.014 + topFall * 0.14);
      rig.topFlapCut.scale.x = Math.max(0.001, topCutFrac);
      rig.topFlapCut.rotation.x = 0.55 + topCutFrac * 0.55 + topFall * 1.4;
      rig.topKerfLine.visible = settled && ph.trim > 0.04 && ph.trim < 0.95;
      rig.topKerfLine.scale.x = Math.max(0.001, topCutFrac);

      const botCutFrac = clamp01((ph.trim - 0.52) / 0.36);
      const botFall = clamp01((ph.trim - 0.85) / 0.15);
      rig.botFlapUncut.visible = settled && botCutFrac < 0.995;
      rig.botFlapUncut.position.set(r.x1, 0.072, 0.019);
      rig.botFlapUncut.scale.x = Math.max(0.001, 1 - botCutFrac);

      rig.botFlapCut.visible = settled && botCutFrac > 0.01 && botFall < 1;
      rig.botFlapCut.position.set(r.x0, 0.072 - botFall * 0.06, 0.024 + botFall * 0.1);
      rig.botFlapCut.scale.x = Math.max(0.001, botCutFrac);
      rig.botFlapCut.rotation.x = 0.45 + botCutFrac * 0.65 + botFall * 0.9;
      rig.botKerfLine.visible = settled && ph.trim > 0.5;
      rig.botKerfLine.scale.x = Math.max(0.001, botCutFrac);

      rig.flapMat.opacity = 1;
      rig.floorOffcut.visible = settled && ph.trim >= 0.88 && d("finish-inspect") < 0.5;
    });

    // Outlet + Diagonal X-Relief Cut + 4 Folding Triangular Flaps
    const relief = this.dropPhases(2).relief;
    const dropOverOutlet = this.dropPhases(2).hang >= 0.999;
    this.xCuts.forEach((l, k) => {
      const seg = clamp01(relief * 2.4 - k * 0.45);
      l.visible = dropOverOutlet && seg > 0 && relief < 0.92;
      l.scale.x = Math.max(0.001, seg);
    });
    this.outletFlaps.forEach((pivot, k) => {
      const openAmt = clamp01((relief - 0.15 - k * 0.06) / 0.45);
      const trimOff = clamp01((relief - 0.58 - k * 0.08) / 0.25);
      pivot.visible = dropOverOutlet && openAmt > 0.01 && trimOff < 1;
      const angle = openAmt * 1.15 * (pivot.userData.dir as number);
      if (pivot.userData.axis === "x") {
        pivot.rotation.set(angle, 0, 0);
      } else {
        pivot.rotation.set(0, angle, 0);
      }
      pivot.scale.setScalar(Math.max(0.01, 1 - trimOff * 0.7));
    });
    this.opening.visible = dropOverOutlet && relief >= 0.22;

    this.placePlate();

    const measuring = WALLPAPER_TASK[this.stepIdx].primitive === "measure";
    this.tapeCase.visible = measuring;
    this.tapeBlade.visible = measuring;
  }

  private placePlate() {
    const step = WALLPAPER_TASK[this.stepIdx];
    const removed = this.done("safety-plate");
    const restored = this.done("finish-restore");
    const onWall: Vec3 = [OUTLET.x, OUTLET.y, 0.0105];
    let pos: Vec3 = onWall;
    let onTable = false;
    if (step.primitive === "unscrew" || step.primitive === "screw") {
      const s = sampleStep(step, this.progress).secondary;
      const detached = step.primitive === "unscrew" ? this.progress > 0.62 : this.progress < 0.75;
      if (s && detached) {
        pos = [s.p[0], s.p[1], s.p[2] - 0.01];
        onTable = pos[1] < TABLE.y + 0.05 && pos[2] > 1;
      }
    } else if (removed >= 1 && restored <= 0) {
      pos = PLATE_ON_TABLE;
      onTable = true;
    }
    this.plate.position.set(...pos);
    this.plate.rotation.set(onTable ? -Math.PI / 2 : 0, 0, 0);
  }

  private placeActors(step: TaskStep, t: number) {
    const s = sampleStep(step, t);
    const tip = new THREE.Vector3(...s.primary.p);

    // Active Tool (self-actuated precision tool — no human mannequin clutter!)
    if (this.activeTool && this.activeTool.userData.id !== step.tool) {
      this.scene.remove(this.activeTool);
      this.activeTool = null;
    }
    if (!this.activeTool && step.tool !== "clock") {
      let tool = this.toolCache.get(step.tool);
      if (!tool) {
        tool = makeTool(step.tool);
        tool.userData.id = step.tool;
        this.toolCache.set(step.tool, tool);
      }
      this.activeTool = tool;
      this.scene.add(tool);
    }

    const q = new THREE.Quaternion();
    const e = new THREE.Euler(0, 0, 0);
    switch (step.primitive) {
      case "cutOnTable":
        e.set(-Math.PI / 2 + 0.48, 0.12, 0);
        break;
      case "stir":
        e.set(-Math.PI / 2, 0, 0);
        break;
      case "unscrew":
      case "screw":
        e.set(0, 0, s.primary.contact ? t * 60 : 0);
        break;
      case "spray":
        e.set(0.12, -0.1, 0);
        break;
      case "trim":
        e.set(0.22, -0.72, -0.18);
        break;
      case "reliefCut":
        e.set(0.28, -0.52, -0.25);
        break;
      case "markLine":
        e.set(0.5, 0, 0);
        break;
      case "roll":
      case "pasteBand":
      case "seamRoll":
        e.set(0, 0, 0);
        break;
      case "inspect": {
        const target = new THREE.Vector3(step.region.x1 + 0.5, tip.y, 0);
        const m = new THREE.Matrix4().lookAt(tip, target, new THREE.Vector3(0, 1, 0));
        q.setFromRotationMatrix(m);
        break;
      }
      default:
        e.set(0.22, 0, 0);
    }
    if (step.primitive !== "inspect") q.setFromEuler(e);

    if (this.activeTool) {
      this.activeTool.position.copy(tip);
      this.activeTool.quaternion.copy(q);
      this.activeTool.updateMatrixWorld(true);
    }

    // Secondary prop (Steel Straightedge or second corner guide pad)
    this.straightedge.visible = false;
    this.secondaryPad.visible = false;
    if (s.secondary) {
      const sp = new THREE.Vector3(...s.secondary.p);
      if (step.secondaryTool === "straightedge") {
        this.straightedge.visible = true;
        this.straightedge.position.copy(sp);
        if (step.primitive === "cutOnTable") {
          this.straightedge.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
        } else {
          this.straightedge.rotation.set(0, 0, 0);
        }
      } else if (step.secondaryTool === "dropCorner") {
        this.secondaryPad.visible = true;
        this.secondaryPad.position.copy(sp);
        this.secondaryPad.rotation.set(0, 0, 0);
      }
    }

    // Tape blade
    if (step.primitive === "measure") {
      const base = new THREE.Vector3(tip.x, WALL.baseboard + 0.04, 0.03);
      this.tapeCase.position.copy(base);
      const len = Math.max(0.01, tip.y - base.y);
      this.tapeBlade.position.set(tip.x, base.y + len / 2, 0.013);
      this.tapeBlade.scale.set(1, len, 1);
    }

    // Choreographed Step Zoom Camera + Live 3.5x Macro Camera tracking the exact working tip
    if (this.autoCam && !this.exploded) {
      this.computeStepZoomCamera(step, tip, t);
    }
    this.computeMacroCamera(step, tip);

    this.marker.position.copy(tip);
    (this.marker.material as THREE.MeshBasicMaterial).color.setHex(s.primary.contact ? ACID : 0x8e9a92);
    this.focusRing.position.set(tip.x, tip.y, Math.max(0.009, tip.z + 0.002));
    this.focusRing.rotation.set(step.primitive === "cutOnTable" || step.primitive === "lay" ? -Math.PI / 2 : 0, 0, t * Math.PI * 2);
  }

  /**
   * Choreographs the main 3D camera so each step zooms smoothly onto the exact active assembly/installation zone.
   */
  private computeStepZoomCamera(step: TaskStep, tip: THREE.Vector3, t: number) {
    // Smooth zoom-in factor during the first 15% of the step
    const zoomIn = THREE.MathUtils.smoothstep(t, 0.0, 0.18);
    switch (step.primitive) {
      case "probe":
      case "unscrew":
      case "screw":
      case "reliefCut": {
        const d = THREE.MathUtils.lerp(0.85, 0.52, zoomIn);
        this.camGoalTarget.set(OUTLET.x, OUTLET.y, 0.01);
        this.camGoalPos.set(OUTLET.x + 0.18 * d, OUTLET.y + 0.12 * d, d);
        break;
      }
      case "trim": {
        const isCeiling = tip.y > 1.25;
        const tx = Math.max(WALL.x0 + 0.25, Math.min(WALL.x1 - 0.25, tip.x));
        const d = THREE.MathUtils.lerp(1.1, 0.68, zoomIn);
        if (isCeiling) {
          this.camGoalTarget.set(tx, WALL.height - 0.04, 0.02);
          this.camGoalPos.set(tx + 0.24, WALL.height - 0.22, d);
        } else {
          this.camGoalTarget.set(tx, WALL.baseboard + 0.02, 0.02);
          this.camGoalPos.set(tx + 0.24, WALL.baseboard + 0.22, d);
        }
        break;
      }
      case "cutOnTable": {
        const d = THREE.MathUtils.lerp(1.05, 0.68, zoomIn);
        this.camGoalTarget.set(1.72, TABLE.y + 0.02, tip.z);
        this.camGoalPos.set(1.32, TABLE.y + 0.45 * d, tip.z + d * 0.65);
        break;
      }
      case "stir": {
        this.camGoalTarget.set(PASTE_BUCKET[0], 0.22, PASTE_BUCKET[2]);
        this.camGoalPos.set(PASTE_BUCKET[0] - 0.42, 0.72, PASTE_BUCKET[2] + 0.62);
        break;
      }
      case "fill":
      case "sand": {
        const d = THREE.MathUtils.lerp(1.25, 0.65, zoomIn);
        const tx = Math.max(WALL.x0 + 0.3, Math.min(WALL.x1 - 0.3, tip.x));
        const ty = Math.max(0.35, Math.min(WALL.height - 0.25, tip.y));
        this.camGoalTarget.set(tx, ty, 0.01);
        this.camGoalPos.set(tx + 0.22, ty + 0.12, d);
        break;
      }
      case "hangDrop": {
        const r = dropRect(step.dropIndex ?? 0);
        const cx = (r.x0 + r.x1) / 2;
        const ty = Math.max(0.85, Math.min(WALL.height - 0.35, tip.y));
        this.camGoalTarget.set(cx, ty, 0.05);
        this.camGoalPos.set(cx + 0.55, ty + 0.18, 1.95);
        break;
      }
      case "smooth":
      case "seamRoll":
      case "wipeSeam":
      case "pasteBand":
      case "pasteEdge":
      case "markLine":
      case "measure": {
        const tx = Math.max(WALL.x0 + 0.4, Math.min(WALL.x1 - 0.4, tip.x));
        const ty = Math.max(0.45, Math.min(WALL.height - 0.32, tip.y));
        const d = step.primitive === "seamRoll" || step.primitive === "pasteEdge" ? 0.92 : 1.45;
        this.camGoalTarget.set(tx, ty, 0.02);
        this.camGoalPos.set(tx + 0.28, ty + 0.14, d);
        break;
      }
      default: {
        this.updateCameraGoal(step);
        break;
      }
    }
  }

  /**
   * Positions the 3.5x Telephoto Macro Camera locked onto the active tool tip for the PiP detail inset.
   */
  private computeMacroCamera(step: TaskStep, tip: THREE.Vector3) {
    this.macroTarget.copy(tip);
    if (step.primitive === "cutOnTable") {
      this.macroPos.set(tip.x - 0.18, tip.y + 0.22, tip.z + 0.18);
    } else if (step.primitive === "stir") {
      this.macroPos.set(PASTE_BUCKET[0] - 0.18, 0.48, PASTE_BUCKET[2] + 0.24);
      this.macroTarget.set(PASTE_BUCKET[0], 0.22, PASTE_BUCKET[2]);
    } else if (step.primitive === "lay") {
      this.macroPos.set(tip.x + 0.28, 0.32, tip.z + 0.35);
    } else {
      const my = THREE.MathUtils.clamp(tip.y + (tip.y > 2.2 ? -0.08 : 0.08), 0.16, WALL.height - 0.12);
      this.macroPos.set(tip.x + 0.14, my, Math.max(0.28, tip.z + 0.26));
    }
    this.macroCamera.position.copy(this.macroPos);
    this.macroCamera.lookAt(this.macroTarget);
  }

  private updateMist(time: number) {
    const step = WALLPAPER_TASK[this.stepIdx];
    const active = step?.primitive === "spray" && this.progress > 0.06 && this.progress < 0.94;
    this.mist.visible = active;
    if (!active || !this.activeTool) return;
    const nozzle = new THREE.Vector3().setFromMatrixPosition(this.activeTool.matrixWorld);
    const pos = this.mist.geometry.getAttribute("position") as THREE.BufferAttribute;
    const n = pos.count;
    for (let i = 0; i < n; i += 1) {
      const phase = (time * 2.4 + i / n) % 1;
      const a = (i * 2.399) % (Math.PI * 2);
      const spread = 0.04 + ((i * 7919) % 100) / 100 * 0.16;
      const end = new THREE.Vector3(nozzle.x + Math.cos(a) * spread, nozzle.y + Math.sin(a) * spread, 0.004);
      const p = nozzle.clone().lerp(end, phase);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
  }

  private buildPathOverlay(step: TaskStep) {
    const m = stepMotion(step);
    const positions: number[] = [];
    const colors: number[] = [];
    const contact = new THREE.Color(ACID);
    const travel = new THREE.Color(0x46504a);
    const secondary = new THREE.Color(0x5fb0ff);
    const push = (pts: typeof m.primary, colorFor: (c: boolean) => THREE.Color) => {
      for (let i = 0; i < pts.length - 1; i += 1) {
        const a = pts[i];
        const b = pts[i + 1];
        positions.push(...a.p, ...b.p);
        const c = colorFor(a.contact && b.contact);
        colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    };
    push(m.primary, (c) => (c ? contact : travel));
    if (m.secondary) push(m.secondary, () => secondary);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    this.pathLines.geometry.dispose();
    this.pathLines.geometry = g;
    this.pathLines.visible = this.showPath;
  }

  private updateCameraGoal(step: TaskStep) {
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const set = (pos: Vec3, target: Vec3) => {
      this.camGoalPos.set(...pos);
      this.camGoalTarget.set(...target);
    };
    switch (step.primitive) {
      case "lay":
        return set([0.4, 1.85, 3.1], [0, 0.25, 0.45]);
      case "cutOnTable":
        return set([1.28, 1.18, TABLE.z1 + 0.42], [1.72, TABLE.y + 0.02, (TABLE.z0 + TABLE.z1) / 2]);
      case "stir":
        return set([PASTE_BUCKET[0] - 0.42, 0.72, PASTE_BUCKET[2] + 0.62], [PASTE_BUCKET[0], 0.22, PASTE_BUCKET[2]]);
      case "probe":
      case "unscrew":
      case "screw":
      case "reliefCut":
        return set([OUTLET.x + 0.14, OUTLET.y + 0.08, 0.56], [OUTLET.x, OUTLET.y, 0.01]);
      case "trim": {
        const r = dropRect(step.dropIndex ?? 0);
        const cx = (r.x0 + r.x1) / 2;
        return set([cx + 0.24, WALL.baseboard + 0.22, 0.68], [cx, WALL.baseboard + 0.02, 0.02]);
      }
      case "hangDrop": {
        const r = dropRect(step.dropIndex ?? 0);
        const cx = (r.x0 + r.x1) / 2;
        return set([cx + 0.55, 1.55, 1.95], [cx, 1.35, 0.05]);
      }
      default: {
        const r = step.region;
        const cx = (r.x0 + r.x1) / 2;
        const cy = (r.y0 + r.y1) / 2;
        const w = r.x1 - r.x0;
        const h = r.y1 - r.y0;
        const dist = Math.min(3.8, Math.max(0.85, Math.max(h / (2 * Math.tan(fov / 2)), w / (2 * Math.tan(fov / 2) * this.camera.aspect)) * 0.98 + 0.18));
        const fx = Math.max(WALL.x0 + 0.5, Math.min(WALL.x1 - 0.5, cx));
        return set([fx + 0.08 * dist, Math.min(WALL.height - 0.24, cy + 0.14 * dist), dist], [fx, cy - 0.04, 0]);
      }
    }
  }
}
