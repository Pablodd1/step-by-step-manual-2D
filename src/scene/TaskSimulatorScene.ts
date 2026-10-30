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
  type TaskStep,
  type ToolId,
  type Vec3,
} from "@contracts/tasks/wallpaperTask";

const SKIN = 0xd8a27c;
const GLOVE = 0x2f6fd6;
const SLEEVE = 0x2c3b33;
const ACID = 0xd2fd78;

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

/** Plane anchored at its left edge (scale.x reveals left→right). */
function anchoredPlane(w: number, h: number, mat: THREE.Material, anchor: "left" | "right" | "top" | "bottom") {
  const g = new THREE.PlaneGeometry(w, h);
  if (anchor === "left") g.translate(w / 2, 0, 0);
  if (anchor === "right") g.translate(-w / 2, 0, 0);
  if (anchor === "top") g.translate(0, -h / 2, 0);
  if (anchor === "bottom") g.translate(0, h / 2, 0);
  return new THREE.Mesh(g, mat);
}

function wallpaperTexture(): THREE.CanvasTexture {
  // 52 cm × 64 cm repeat tile @ 5 px/cm, straight match.
  const c = document.createElement("canvas");
  c.width = 260;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ece6d5";
  g.fillRect(0, 0, 260, 320);
  const rand = rng(7);
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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
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
// Hand rig
// ---------------------------------------------------------------------------

class HandRig {
  readonly group = new THREE.Group();
  readonly forearm: THREE.Mesh;
  private fingerPivots: THREE.Group[] = [];
  private thumbPivot = new THREE.Group();
  private skinMat = std(SKIN, { roughness: 0.55 });
  private gloveMat = std(GLOVE, { roughness: 0.35 });
  private parts: THREE.Mesh[] = [];

  constructor(private side: 1 | -1, scene: THREE.Scene) {
    const palm = box(0.085, 0.095, 0.03, this.skinMat);
    this.parts.push(palm);
    this.group.add(palm);
    const fingerX = [-0.03, -0.01, 0.01, 0.03];
    const fingerLen = [0.058, 0.068, 0.064, 0.05];
    fingerX.forEach((x, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(x * side, 0.048, 0);
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, fingerLen[i], 4, 8), this.skinMat);
      f.position.y = fingerLen[i] / 2 + 0.006;
      f.castShadow = true;
      this.parts.push(f);
      pivot.add(f);
      this.group.add(pivot);
      this.fingerPivots.push(pivot);
    });
    this.thumbPivot.position.set(0.045 * side, -0.01, -0.004);
    this.thumbPivot.rotation.z = -0.75 * side;
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.045, 4, 8), this.skinMat);
    thumb.position.y = 0.03;
    thumb.castShadow = true;
    this.parts.push(thumb);
    this.thumbPivot.add(thumb);
    this.group.add(this.thumbPivot);

    const cuff = cyl(0.034, 0.034, 0.03, std(SLEEVE, { roughness: 0.9 }));
    cuff.position.set(0, -0.065, 0.004);
    this.group.add(cuff);

    this.forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 1, 16), std(SLEEVE, { roughness: 0.9 }));
    this.forearm.castShadow = true;
    scene.add(this.group, this.forearm);
  }

  setCurl(curl: number) {
    this.fingerPivots.forEach((p, i) => {
      p.rotation.x = -curl * (1.25 + i * 0.05);
    });
    this.thumbPivot.rotation.x = -curl * 0.7;
  }

  setGlove(on: boolean) {
    const mat = on ? this.gloveMat : this.skinMat;
    this.parts.forEach((p) => {
      p.material = mat;
    });
  }

  place(pos: THREE.Vector3, quat: THREE.Quaternion) {
    this.group.position.copy(pos);
    this.group.quaternion.copy(quat);
    this.group.updateMatrixWorld(true);
    const wrist = new THREE.Vector3(0, -0.075, 0.006).applyMatrix4(this.group.matrixWorld);
    const elbow = wrist.clone().add(new THREE.Vector3(0.14 * this.side, -0.3, 0.34));
    const dir = new THREE.Vector3().subVectors(elbow, wrist);
    const len = dir.length();
    this.forearm.position.copy(wrist).addScaledVector(dir, 0.5);
    this.forearm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    this.forearm.scale.set(1, len, 1);
  }

  setVisible(v: boolean) {
    this.group.visible = v;
    this.forearm.visible = v;
  }
}

// ---------------------------------------------------------------------------
// Tools — each built with its working tip at the origin, handle toward +z.
// userData.grip = where the hand holds it (local coords).
// ---------------------------------------------------------------------------

function makeTool(id: ToolId): THREE.Group {
  const g = new THREE.Group();
  const grip = new THREE.Vector3(0, 0, 0.1);
  const black = std(0x1f2420, { roughness: 0.5 });
  const steel = std(0xc9ced2, { metalness: 0.85, roughness: 0.25 });
  const yellow = std(0xf2c230, { roughness: 0.45 });

  switch (id) {
    case "voltageTester": {
      g.add(zCyl(0.009, 0.02, 0.17, yellow));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.022, 16), black);
      tip.rotation.x = -Math.PI / 2;
      tip.position.z = 0.011;
      g.add(tip);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshStandardMaterial({ color: 0x45ff7a, emissive: 0x23ff5a, emissiveIntensity: 1.5 }));
      led.position.set(0, 0.009, 0.03);
      g.add(led);
      grip.set(0, 0, 0.12);
      break;
    }
    case "screwdriver":
      g.add(zCyl(0.003, 0, 0.1, steel));
      g.add(zCyl(0.015, 0.1, 0.2, std(0xe0402a, { roughness: 0.4 })));
      grip.set(0, 0, 0.16);
      break;
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
      const blade = box(0.06, 0.002, 0.07, steel);
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
      const blade = box(0.003, 0.018, 0.03, steel);
      blade.position.z = 0.015;
      blade.rotation.x = 0.5;
      const body = box(0.022, 0.03, 0.13, yellow);
      body.position.z = 0.095;
      const grip2 = box(0.024, 0.032, 0.06, black);
      grip2.position.z = 0.12;
      g.add(blade, body, grip2);
      grip.set(0, 0, 0.12);
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
    case "hands":
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
// Drop rig
// ---------------------------------------------------------------------------

interface DropRig {
  group: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  clip: THREE.Plane;
  flap: THREE.Mesh;
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
  readonly controls: OrbitControls;
  onUserCamera?: () => void;

  private container: HTMLElement;
  private raf = 0;
  private resizeObserver: ResizeObserver;
  private autoCam = true;
  private camGoalPos = new THREE.Vector3(0.6, 1.5, 4.2);
  private camGoalTarget = new THREE.Vector3(0, 1.3, 0);
  private stepIdx = -1;
  private progress = 0;
  private showPath = true;
  private snapNext = true;
  private lastStepIdx: number | null = null;

  private right: HandRig;
  private left: HandRig;
  private toolCache = new Map<ToolId, THREE.Group>();
  private activeTool: THREE.Group | null = null;
  private straightedge: THREE.Mesh;
  private plate: THREE.Group;
  private dropCloth: THREE.Mesh;

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
  private sheetOnTable: THREE.Mesh;
  private stack: THREE.Mesh;
  private mist: THREE.Points;
  private pathLines: THREE.LineSegments;
  private axes: THREE.AxesHelper;
  private marker: THREE.Mesh;

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
    this.scene.background = new THREE.Color(0x1a201c);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.03, 40);
    this.camera.position.copy(this.camGoalPos);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.camGoalTarget);
    this.controls.enableDamping = true;
    this.controls.maxDistance = 7;
    this.controls.minDistance = 0.25;
    this.controls.addEventListener("start", () => {
      if (this.autoCam) {
        this.autoCam = false;
        this.onUserCamera?.();
      }
    });

    this.buildLights();
    this.buildRoom();

    this.right = new HandRig(1, this.scene);
    this.left = new HandRig(-1, this.scene);

    // Secondary props
    this.straightedge = box(0.7, 0.06, 0.004, std(0xc9ced2, { metalness: 0.85, roughness: 0.25 }));
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

    // Drops ---------------------------------------------------------------------
    const tex = wallpaperTexture();
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

      const flapMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, transparent: true, side: THREE.DoubleSide });
      const flap = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.06), flapMat);
      this.scene.add(flap);

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
      this.drops.push({ group, mat, clip, flap, flapMat, bubbles, smears, paste, pasteMat });
    }

    this.opening = new THREE.Mesh(new THREE.PlaneGeometry(OUTLET.w, OUTLET.h), new THREE.MeshStandardMaterial({ color: 0x3b3a36, roughness: 0.9 }));
    this.opening.position.set(OUTLET.x, OUTLET.y, 0.0078);
    this.scene.add(this.opening);
    const diag = Math.hypot(OUTLET.w, OUTLET.h);
    const ang = Math.atan2(OUTLET.h, OUTLET.w);
    [ang, -ang].forEach((a) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(diag, 0.0018), new THREE.MeshBasicMaterial({ color: 0x2a2a2a }));
      line.position.set(OUTLET.x, OUTLET.y, 0.0079);
      line.rotation.z = a;
      this.xCuts.push(line);
      this.scene.add(line);
    });

    // Table items
    this.sheetOnTable = new THREE.Mesh(new THREE.PlaneGeometry(0.95, DROP_WIDTH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
    this.sheetOnTable.rotation.x = -Math.PI / 2;
    this.sheetOnTable.rotation.z = Math.PI / 2;
    this.sheetOnTable.position.set(1.45, TABLE.y + 0.002, (TABLE.z0 + TABLE.z1) / 2);
    this.stack = box(0.52, 1, 0.5, std(0xe5dfcd, { roughness: 0.9 }));
    this.scene.add(this.sheetOnTable, this.stack);

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

    // Robot toolpath overlay
    this.pathLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthTest: false }));
    this.pathLines.renderOrder = 10;
    this.pathLines.frustumCulled = false;
    this.marker = new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 10), new THREE.MeshBasicMaterial({ color: ACID, depthTest: false }));
    this.marker.renderOrder = 11;
    this.axes = new THREE.AxesHelper(0.35);
    this.axes.position.set(0, 0.005, 0.005);
    this.scene.add(this.pathLines, this.marker, this.axes);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.setFrame(0, 0);
    this.loop();
  }

  // -------------------------------------------------------------------------

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x3a3328, 0.55));
    const key = new THREE.DirectionalLight(0xfff1dd, 2.1);
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
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 2.6);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMat = std(0xb6a892, { roughness: 0.92 });
    const wall = box(WALL.widthM + 0.4, WALL.height, 0.1, wallMat);
    wall.position.set(0, WALL.height / 2, -0.05);
    this.scene.add(wall);

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
    this.scene.add(baseboard);

    // Outlet recess (box) — plate is a separate movable group
    const recess = new THREE.Mesh(new THREE.PlaneGeometry(OUTLET.w, OUTLET.h), std(0x3d3c38));
    recess.position.set(OUTLET.x, OUTLET.y, 0.0008);
    this.scene.add(recess);

    // Table
    const woodMat = std(0x8c6a4a, { roughness: 0.6 });
    const top = box(TABLE.x1 - TABLE.x0, 0.035, TABLE.z1 - TABLE.z0, woodMat);
    top.position.set((TABLE.x0 + TABLE.x1) / 2, TABLE.y - 0.018, (TABLE.z0 + TABLE.z1) / 2);
    this.scene.add(top);
    [[TABLE.x0 + 0.05, TABLE.z0 + 0.05], [TABLE.x1 - 0.05, TABLE.z0 + 0.05], [TABLE.x0 + 0.05, TABLE.z1 - 0.05], [TABLE.x1 - 0.05, TABLE.z1 - 0.05]].forEach(([x, z]) => {
      const leg = box(0.04, TABLE.y - 0.035, 0.04, woodMat);
      leg.position.set(x, (TABLE.y - 0.035) / 2, z);
      this.scene.add(leg);
    });
    [0.85, 0.97, 1.09].forEach((x, i) => {
      const roll = cyl(0.05, 0.05, DROP_WIDTH, std(i === 0 ? 0xe9e2cf : 0xe3dcc8, { roughness: 0.85 }));
      roll.rotation.x = Math.PI / 2;
      roll.position.set(x, TABLE.y + 0.05, (TABLE.z0 + TABLE.z1) / 2);
      if (i > 0) roll.position.z += 0.0;
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

    // Stepladder (decor)
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
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    if (this.autoCam) {
      this.camera.position.lerp(this.camGoalPos, 0.08);
      this.controls.target.lerp(this.camGoalTarget, 0.08);
    }
    this.controls.update();
    this.updateMist(performance.now() / 1000);
    this.renderer.render(this.scene, this.camera);
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

  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
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
    this.stepIdx = stepIdx;
    this.progress = progress;
    if (stepChanged) {
      this.buildPathOverlay(step);
      this.updateCameraGoal(step);
      const far = this.camera.position.distanceTo(this.camGoalPos) > 1.2;
      if (this.autoCam && (this.snapNext || (far && Math.abs(stepIdx - (this.lastStepIdx ?? stepIdx)) > 1))) {
        this.camera.position.copy(this.camGoalPos);
        this.controls.target.copy(this.camGoalTarget);
        this.controls.update();
      }
      this.snapNext = false;
      this.lastStepIdx = stepIdx;
    }
    this.applyWallState();
    this.placeActors(step, progress);
  }

  // -------------------------------------------------------------------------

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

    // Layout
    const plumb = d("layout-plumb");
    const laserOn = plumb > 0 && d("trim-drop-1") < 1;
    this.laserLine.visible = laserOn;
    this.laserDevice.visible = laserOn;
    this.pencilLine.visible = plumb > 0;
    this.pencilLine.scale.y = Math.max(0.001, plumb);

    const cut = d("layout-cut");
    this.sheetOnTable.visible = cut > 0 && cut < 1;
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

    // Drops
    this.drops.forEach((rig, i) => {
      const ph = this.dropPhases(i);
      rig.paste.visible = ph.paste > 0.001 && ph.hang < 1;
      rig.paste.scale.x = Math.max(0.001, ph.paste);
      rig.pasteMat.opacity = 0.62;

      const visible = ph.hang > 0;
      rig.group.visible = visible;
      if (!visible) {
        rig.flap.visible = false;
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

      // Bottom trim flap (excess over the baseboard)
      const r = dropRect(i);
      const fall = clamp01((ph.trim - 0.55) / 0.45);
      rig.flap.visible = settled && ph.trim < 1;
      rig.flap.position.set((r.x0 + r.x1) / 2, 0.07 - fall * 0.07, 0.02 + fall * 0.12);
      rig.flap.rotation.x = fall * 1.3;
      rig.flapMat.opacity = 1 - fall;
    });

    // Outlet + relief cut
    const relief = this.dropPhases(2).relief;
    const dropOverOutlet = this.dropPhases(2).hang >= 0.999;
    this.xCuts.forEach((l, k) => {
      const seg = clamp01(relief * 2.2 - k * 0.45);
      l.visible = dropOverOutlet && seg > 0 && relief < 0.85;
      l.scale.x = Math.max(0.001, seg);
    });
    this.opening.visible = dropOverOutlet && relief >= 0.85;

    this.placePlate();

    // Tape measure
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

    // Tool
    if (this.activeTool && this.activeTool.userData.id !== step.tool) {
      this.scene.remove(this.activeTool);
      this.activeTool = null;
    }
    if (!this.activeTool && step.tool !== "hands" && step.tool !== "clock") {
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
        e.set(-Math.PI / 2 + 0.35, 0, 0);
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
      case "reliefCut":
        e.set(0.25, -0.6, 0);
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
        // Lens faces local −z, so build a basis whose +z points away from the target.
        const m = new THREE.Matrix4().lookAt(tip, target, new THREE.Vector3(0, 1, 0));
        q.setFromRotationMatrix(m);
        break;
      }
      default:
        e.set(0.28, 0, 0);
    }
    if (step.primitive !== "inspect") q.setFromEuler(e);

    if (this.activeTool) {
      this.activeTool.position.copy(tip);
      this.activeTool.quaternion.copy(q);
      this.activeTool.updateMatrixWorld(true);
    }

    // Right hand
    const gloves = step.ppe.includes("nitrile gloves");
    this.right.setGlove(gloves);
    this.left.setGlove(gloves);
    this.right.setVisible(true);
    if (step.tool === "hands") {
      const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, 0, 0));
      this.right.place(tip.clone().add(new THREE.Vector3(0, 0, 0.016)), flat);
      this.right.setCurl(0.12);
    } else if (step.tool === "clock") {
      this.right.place(new THREE.Vector3(0.55, 1.0, 0.85), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0, -0.3)));
      this.right.setCurl(0.4);
    } else if (this.activeTool) {
      const grip = (this.activeTool.userData.grip as THREE.Vector3).clone().applyMatrix4(this.activeTool.matrixWorld);
      this.right.place(grip, q);
      this.right.setCurl(step.tool === "sponge" || step.tool === "microfiber" || step.tool === "sandingBlock" ? 0.55 : 0.95);
    }

    // Left hand / secondary prop
    this.straightedge.visible = false;
    if (s.secondary) {
      const sp = new THREE.Vector3(...s.secondary.p);
      if (step.secondaryTool === "straightedge") {
        this.straightedge.visible = true;
        this.straightedge.position.copy(sp);
        if (step.primitive === "cutOnTable") {
          this.straightedge.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
          this.left.place(sp.clone().add(new THREE.Vector3(0, 0.02, -0.15)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
        } else {
          this.straightedge.rotation.set(0, 0, 0);
          this.left.place(sp.clone().add(new THREE.Vector3(-0.12, 0.0, 0.02)), new THREE.Quaternion());
        }
        this.left.setCurl(0.15);
      } else {
        this.left.place(sp.clone().add(new THREE.Vector3(0, 0, 0.016)), new THREE.Quaternion().setFromEuler(new THREE.Euler(step.primitive === "lay" ? -1.2 : 0.05, 0, 0)));
        this.left.setCurl(step.secondaryTool === "plate" ? 0.3 : 0.12);
      }
      this.left.setVisible(true);
    } else {
      // Idle support hand, resting low and to the left of the work
      const idle = new THREE.Vector3(Math.max(-1.9, tip.x - 0.42), Math.max(0.75, Math.min(1.25, tip.y - 0.25)), Math.max(0.35, tip.z + 0.35));
      this.left.place(idle, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, 0.3, 0.4)));
      this.left.setCurl(0.55);
      this.left.setVisible(true);
    }

    // Tape blade
    if (step.primitive === "measure") {
      const base = new THREE.Vector3(tip.x, WALL.baseboard + 0.04, 0.03);
      this.tapeCase.position.copy(base);
      const len = Math.max(0.01, tip.y - base.y);
      this.tapeBlade.position.set(tip.x, base.y + len / 2, 0.013);
      this.tapeBlade.scale.set(1, len, 1);
    }

    const follow = ["hangDrop", "trim", "smooth", "markLine", "measure", "pasteEdge", "seamRoll", "wipeSeam", "pasteBand", "cutIn"];
    if (this.autoCam && follow.includes(step.primitive)) {
      const ty = Math.max(0.7, Math.min(WALL.height - 0.45, tip.y));
      const tx = Math.max(WALL.x0 + 0.55, Math.min(WALL.x1 - 0.55, tip.x));
      this.camGoalTarget.set(tx, ty, 0.05);
      this.camGoalPos.set(tx + 0.35, ty + 0.2, 2.1);
    }

    this.marker.position.copy(tip);
    (this.marker.material as THREE.MeshBasicMaterial).color.setHex(s.primary.contact ? ACID : 0x8e9a92);
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
        return set([0.4, 2.1, 3.6], [0, 0.3, 0.5]);
      case "cutOnTable":
        return set([0.7, 1.75, TABLE.z1 + 1.1], [1.45, 0.8, (TABLE.z0 + TABLE.z1) / 2]);
      case "stir":
        return set([0.75, 1.15, 1.75], [PASTE_BUCKET[0], 0.2, PASTE_BUCKET[2]]);
      case "probe":
      case "unscrew":
      case "screw":
      case "reliefCut":
        return set([OUTLET.x + 0.35, OUTLET.y + 0.45, 1.05], [OUTLET.x, OUTLET.y + 0.05, 0]);
      case "hangDrop": {
        const r = dropRect(step.dropIndex ?? 0);
        const cx = (r.x0 + r.x1) / 2;
        return set([cx + 1.0, 2.05, 2.75], [cx + 0.25, 1.3, 0.3]);
      }
      default: {
        const r = step.region;
        const cx = (r.x0 + r.x1) / 2;
        const cy = (r.y0 + r.y1) / 2;
        const w = r.x1 - r.x0;
        const h = r.y1 - r.y0;
        const dist = Math.min(4.6, Math.max(1.0, Math.max(h / (2 * Math.tan(fov / 2)), w / (2 * Math.tan(fov / 2) * this.camera.aspect)) * 1.12 + 0.25));
        const fx = Math.max(WALL.x0 + 0.6, Math.min(WALL.x1 - 0.6, cx));
        return set([fx + 0.1 * dist, cy + 0.2 * dist, dist], [fx, cy - 0.05, 0]);
      }
    }
  }
}
