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

const SKIN = 0xd8a27c;
const GLOVE = 0x2f6fd6;
const SLEEVE = 0x253029;
const VEST = 0x1d2621;
const PANTS = 0x2b333a;
const BOOT = 0x3b2a1e;
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

/** Plane anchored at its left/right/top/bottom edge. */
function anchoredPlane(w: number, h: number, mat: THREE.Material, anchor: "left" | "right" | "top" | "bottom") {
  const g = new THREE.PlaneGeometry(w, h);
  if (anchor === "left") g.translate(w / 2, 0, 0);
  if (anchor === "right") g.translate(-w / 2, 0, 0);
  if (anchor === "top") g.translate(0, -h / 2, 0);
  if (anchor === "bottom") g.translate(0, h / 2, 0);
  return new THREE.Mesh(g, mat);
}

/** Analytical 2-bone IK solver returning the world-space joint (elbow or knee) position. */
function solveTwoBoneIK(
  root: THREE.Vector3,
  target: THREE.Vector3,
  len1: number,
  len2: number,
  poleDir: THREE.Vector3,
): THREE.Vector3 {
  const diff = new THREE.Vector3().subVectors(target, root);
  const dist = Math.max(0.05, Math.min(len1 + len2 - 0.005, diff.length()));
  const forward = diff.clone().normalize();
  const cosAngle = THREE.MathUtils.clamp(
    (len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist),
    -1,
    1,
  );
  const sinAngle = Math.sqrt(Math.max(0, 1 - cosAngle * cosAngle));
  let bendAxis = poleDir.clone().addScaledVector(forward, -poleDir.dot(forward));
  if (bendAxis.lengthSq() < 1e-5) {
    bendAxis.set(0, -1, 0.5).normalize();
  } else {
    bendAxis.normalize();
  }
  return root
    .clone()
    .addScaledVector(forward, len1 * cosAngle)
    .addScaledVector(bendAxis, len1 * sinAngle);
}

/** Orient and scale a unit-height Y-axis cylinder/mesh between point A and point B. */
function placeSegmentBetween(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(0.001, dir.length());
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.scale.set(1, len, 1);
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
    // UNITEC FT_13 Marble Adhesive Roll (White/Gray Carrara Marble Vinyl)
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
    // UNITEC FT_03 Lámina Mármol Eclipse M-11 (High-gloss Obsidian & Gold/White Veining)
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
    // UNITEC FT_15 Interior WPC Panel Choco Mix (Vertical Fluted Slats)
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
    // Botanical Non-Woven Paste-the-Wall Wallpaper
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
// Articulated Hand + Full 3D Human Installer Rig (with Two-Bone IK Arms & Legs)
// ---------------------------------------------------------------------------

class HandRig {
  readonly group = new THREE.Group();
  readonly wristLocal = new THREE.Vector3(0, -0.072, 0.004);
  private fingerPivots: THREE.Group[] = [];
  private distalPivots: THREE.Group[] = [];
  private thumbPivot = new THREE.Group();
  private skinMat = std(SKIN, { roughness: 0.52 });
  private gloveMat = std(GLOVE, { roughness: 0.35 });
  private parts: THREE.Mesh[] = [];

  constructor(private side: 1 | -1, scene: THREE.Scene) {
    const palm = box(0.084, 0.092, 0.028, this.skinMat);
    const knuckles = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.082, 12), this.skinMat);
    knuckles.rotation.z = Math.PI / 2;
    knuckles.position.set(0, 0.044, 0);
    this.parts.push(palm, knuckles);
    this.group.add(palm, knuckles);

    const fingerX = [-0.03, -0.01, 0.01, 0.03];
    const proxLen = [0.034, 0.04, 0.038, 0.03];
    const distLen = [0.026, 0.03, 0.028, 0.024];
    fingerX.forEach((x, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(x * side, 0.046, 0);
      const prox = new THREE.Mesh(new THREE.CapsuleGeometry(0.0082, proxLen[i], 4, 8), this.skinMat);
      prox.position.y = proxLen[i] / 2 + 0.004;
      prox.castShadow = true;
      this.parts.push(prox);
      pivot.add(prox);

      const distal = new THREE.Group();
      distal.position.set(0, proxLen[i] + 0.006, 0);
      const tipMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, distLen[i], 4, 8), this.skinMat);
      tipMesh.position.y = distLen[i] / 2 + 0.002;
      tipMesh.castShadow = true;
      this.parts.push(tipMesh);
      distal.add(tipMesh);
      pivot.add(distal);

      this.group.add(pivot);
      this.fingerPivots.push(pivot);
      this.distalPivots.push(distal);
    });

    this.thumbPivot.position.set(0.044 * side, -0.008, -0.004);
    this.thumbPivot.rotation.z = -0.68 * side;
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.046, 4, 8), this.skinMat);
    thumb.position.y = 0.028;
    thumb.castShadow = true;
    this.parts.push(thumb);
    this.thumbPivot.add(thumb);
    this.group.add(this.thumbPivot);

    const cuff = cyl(0.034, 0.036, 0.028, std(SLEEVE, { roughness: 0.85 }));
    cuff.position.set(0, -0.06, 0.003);
    this.group.add(cuff);

    scene.add(this.group);
  }

  setCurl(curl: number, splay = 0) {
    this.fingerPivots.forEach((p, i) => {
      p.rotation.x = -curl * (1.05 + i * 0.06);
      p.rotation.z = (i - 1.5) * splay * -0.18 * this.side;
    });
    this.distalPivots.forEach((d, i) => {
      d.rotation.x = -curl * (0.85 + i * 0.04);
    });
    this.thumbPivot.rotation.x = -curl * 0.65;
  }

  setGlove(on: boolean) {
    const mat = on ? this.gloveMat : this.skinMat;
    this.parts.forEach((p) => {
      p.material = mat;
    });
  }

  place(pos: THREE.Vector3, quat: THREE.Quaternion): THREE.Vector3 {
    this.group.position.copy(pos);
    this.group.quaternion.copy(quat);
    this.group.updateMatrixWorld(true);
    return this.wristLocal.clone().applyMatrix4(this.group.matrixWorld);
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }
}

class HumanInstallerRig {
  readonly root = new THREE.Group();
  private torsoGroup = new THREE.Group();
  private headGroup = new THREE.Group();
  private glassesMesh: THREE.Mesh;
  private maskMesh: THREE.Mesh;
  private shoulderL = new THREE.Object3D();
  private shoulderR = new THREE.Object3D();
  private hipL = new THREE.Object3D();
  private hipR = new THREE.Object3D();

  private upperArmL: THREE.Mesh;
  private forearmL: THREE.Mesh;
  private elbowL: THREE.Mesh;
  private upperArmR: THREE.Mesh;
  private forearmR: THREE.Mesh;
  private elbowR: THREE.Mesh;

  private thighL: THREE.Mesh;
  private shinL: THREE.Mesh;
  private kneeL: THREE.Mesh;
  private bootL: THREE.Group;
  private thighR: THREE.Mesh;
  private shinR: THREE.Mesh;
  private kneeR: THREE.Mesh;
  private bootR: THREE.Group;

  private stepBench: THREE.Group;

  constructor(scene: THREE.Scene) {
    const skinMat = std(SKIN, { roughness: 0.55 });
    const sleeveMat = std(SLEEVE, { roughness: 0.85 });
    const vestMat = std(VEST, { roughness: 0.7 });
    const acidMat = std(ACID, { roughness: 0.4, emissive: 0x3a4d14, emissiveIntensity: 0.25 });
    const pantsMat = std(PANTS, { roughness: 0.85 });
    const bootMat = std(BOOT, { roughness: 0.75 });

    // Pelvis / hips + tool belt
    const pelvis = box(0.31, 0.14, 0.19, pantsMat);
    pelvis.position.set(0, 0.02, 0);
    const belt = box(0.325, 0.045, 0.205, std(0x181a18, { roughness: 0.5 }));
    belt.position.set(0, 0.075, 0);
    const buckle = box(0.045, 0.048, 0.015, acidMat);
    buckle.position.set(0, 0.075, 0.1);
    const holster = box(0.05, 0.12, 0.06, std(0x222622));
    holster.position.set(0.18, 0.02, 0.02);
    this.torsoGroup.add(pelvis, belt, buckle, holster);

    // Chest + UNITEC/PLUMB utility vest with high-vis trim
    const chest = box(0.34, 0.44, 0.21, vestMat);
    chest.position.set(0, 0.31, 0);
    const stripeL = box(0.032, 0.42, 0.216, acidMat);
    stripeL.position.set(-0.1, 0.31, 0);
    const stripeR = box(0.032, 0.42, 0.216, acidMat);
    stripeR.position.set(0.1, 0.31, 0);
    const collar = cyl(0.068, 0.078, 0.06, skinMat, 16);
    collar.position.set(0, 0.555, 0.01);
    this.torsoGroup.add(chest, stripeL, stripeR, collar);

    // Shoulder & Hip sockets in torsoGroup local coords (+Z is chest/face forward, so anatomical Left is +X and Right is -X)
    this.shoulderL.position.set(0.205, 0.48, 0.01);
    this.shoulderR.position.set(-0.205, 0.48, 0.01);
    this.hipL.position.set(0.095, -0.03, 0);
    this.hipR.position.set(-0.095, -0.03, 0);
    this.torsoGroup.add(this.shoulderL, this.shoulderR, this.hipL, this.hipR);

    // Head + Cap + Safety Glasses + Dust Mask
    this.headGroup.position.set(0, 0.65, 0.015);
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 16), skinMat);
    cranium.scale.set(0.92, 1.08, 0.98);
    cranium.castShadow = true;
    const nose = box(0.024, 0.036, 0.028, skinMat);
    nose.position.set(0, -0.005, 0.1);
    const capCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      vestMat,
    );
    capCrown.position.y = 0.02;
    const capVisor = box(0.15, 0.01, 0.09, vestMat);
    capVisor.position.set(0, 0.035, 0.11);
    capVisor.rotation.x = 0.12;
    const capBand = box(0.09, 0.018, 0.006, acidMat);
    capBand.position.set(0, 0.055, 0.106);

    this.glassesMesh = box(0.145, 0.036, 0.03, new THREE.MeshPhysicalMaterial({
      color: 0xa8dcff,
      transmission: 0.72,
      opacity: 1,
      transparent: true,
      roughness: 0.15,
    }));
    this.glassesMesh.position.set(0, 0.01, 0.096);

    this.maskMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 14, 12),
      std(0xf2f4f7, { roughness: 0.8 }),
    );
    this.maskMesh.scale.set(1.1, 0.85, 0.85);
    this.maskMesh.position.set(0, -0.042, 0.072);

    this.headGroup.add(cranium, nose, capCrown, capVisor, capBand, this.glassesMesh, this.maskMesh);
    this.torsoGroup.add(this.headGroup);
    this.root.add(this.torsoGroup);

    // Arms (world-space segments updated via 2-bone IK)
    this.upperArmL = cyl(0.044, 0.038, 1, sleeveMat, 14);
    this.forearmL = cyl(0.037, 0.031, 1, sleeveMat, 14);
    this.elbowL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), sleeveMat);
    this.upperArmR = cyl(0.044, 0.038, 1, sleeveMat, 14);
    this.forearmR = cyl(0.037, 0.031, 1, sleeveMat, 14);
    this.elbowR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), sleeveMat);

    // Legs & Boots
    this.thighL = cyl(0.064, 0.052, 1, pantsMat, 14);
    this.shinL = cyl(0.05, 0.042, 1, pantsMat, 14);
    this.kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), pantsMat);
    this.thighR = cyl(0.064, 0.052, 1, pantsMat, 14);
    this.shinR = cyl(0.05, 0.042, 1, pantsMat, 14);
    this.kneeR = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), pantsMat);

    const makeBoot = () => {
      const g = new THREE.Group();
      const sole = box(0.095, 0.025, 0.22, std(0x161616, { roughness: 0.9 }));
      sole.position.set(0, 0.0125, 0.03);
      const upper = box(0.088, 0.065, 0.18, bootMat);
      upper.position.set(0, 0.05, 0.02);
      g.add(sole, upper);
      return g;
    };
    this.bootL = makeBoot();
    this.bootR = makeBoot();

    // Mobile work platform / step bench for high reach (y > 1.85 m)
    const aluMat = std(0xc0c6cc, { metalness: 0.7, roughness: 0.3 });
    this.stepBench = new THREE.Group();
    const deck = box(0.62, 0.03, 0.36, aluMat);
    deck.position.y = 0.435;
    this.stepBench.add(deck);
    [
      [-0.28, -0.15],
      [0.28, -0.15],
      [-0.28, 0.15],
      [0.28, 0.15],
    ].forEach(([lx, lz]) => {
      const leg = box(0.028, 0.435, 0.028, aluMat);
      leg.position.set(lx, 0.2175, lz);
      this.stepBench.add(leg);
    });
    this.stepBench.visible = false;

    scene.add(
      this.root,
      this.upperArmL,
      this.forearmL,
      this.elbowL,
      this.upperArmR,
      this.forearmR,
      this.elbowR,
      this.thighL,
      this.shinL,
      this.kneeL,
      this.bootL,
      this.thighR,
      this.shinR,
      this.kneeR,
      this.bootR,
      this.stepBench,
    );
  }

  update(
    tip: THREE.Vector3,
    wristR: THREE.Vector3,
    wristL: THREE.Vector3,
    step: TaskStep,
  ) {
    this.glassesMesh.visible = step.ppe.includes("safety glasses") || step.primitive === "trim" || step.primitive === "cutOnTable" || step.primitive === "reliefCut";
    this.maskMesh.visible = step.ppe.includes("dust mask");

    // Position the installer's body so it never occludes the camera's line of sight to the active tool tip
    let bodyX = tip.x - 0.32;
    let bodyZ = Math.max(0.62, tip.z + 0.54);
    let bodyYaw = Math.PI - 0.36; // Facing -Z (the wall), angled slightly toward the right hand

    if (step.primitive === "cutOnTable") {
      bodyX = 1.98;
      bodyZ = (TABLE.z0 + TABLE.z1) / 2;
      bodyYaw = -Math.PI / 2;
    } else if (step.primitive === "stir") {
      bodyX = PASTE_BUCKET[0] - 0.34;
      bodyZ = PASTE_BUCKET[2] + 0.38;
      bodyYaw = Math.PI - 0.55;
    } else {
      bodyX = THREE.MathUtils.clamp(tip.x - 0.32, WALL.x0 - 0.12, WALL.x1 - 0.15);
    }

    // Determine floor / platform elevation and crouch height
    const onBench = step.primitive !== "cutOnTable" && step.primitive !== "stir" && tip.y > 1.88;
    const floorY = onBench ? 0.45 : 0;
    this.stepBench.visible = onBench;
    if (onBench) {
      this.stepBench.position.set(bodyX, 0, bodyZ);
    }

    // Natural hip height: crouch down when working near baseboard, floor, or low outlet
    const targetReachY = tip.y - floorY;
    const hipY = floorY + THREE.MathUtils.clamp(targetReachY - 0.28, 0.56, 0.94);
    const crouchAmount = THREE.MathUtils.clamp((0.94 - (hipY - floorY)) / 0.38, 0, 1);

    this.root.position.set(bodyX, hipY, bodyZ);
    this.root.rotation.set(0, bodyYaw, 0);
    // Lean torso slightly toward the work when crouching or cutting on table
    const torsoLean = step.primitive === "cutOnTable" ? 0.26 : 0.12 + crouchAmount * 0.3;
    this.torsoGroup.rotation.set(torsoLean, 0, 0);
    this.root.updateMatrixWorld(true);

    // Orient head to look toward the active tool tip
    const headWorld = new THREE.Vector3();
    this.headGroup.getWorldPosition(headWorld);
    const lookDir = new THREE.Vector3().subVectors(tip, headWorld);
    const pitch = THREE.MathUtils.clamp(-Math.atan2(lookDir.y, Math.hypot(lookDir.x, lookDir.z)), -0.55, 0.55);
    this.headGroup.rotation.set(pitch - torsoLean * 0.6, 0.12, 0);
    this.root.updateMatrixWorld(true);

    // Two-Bone IK for Left & Right Arms
    const sL = new THREE.Vector3();
    const sR = new THREE.Vector3();
    this.shoulderL.getWorldPosition(sL);
    this.shoulderR.getWorldPosition(sR);

    const poleL = new THREE.Vector3(-0.45, -0.75, 0.45).normalize();
    const poleR = new THREE.Vector3(0.45, -0.75, 0.45).normalize();
    const eL = solveTwoBoneIK(sL, wristL, 0.31, 0.29, poleL);
    const eR = solveTwoBoneIK(sR, wristR, 0.31, 0.29, poleR);

    placeSegmentBetween(this.upperArmL, sL, eL);
    placeSegmentBetween(this.forearmL, eL, wristL);
    this.elbowL.position.copy(eL);

    placeSegmentBetween(this.upperArmR, sR, eR);
    placeSegmentBetween(this.forearmR, eR, wristR);
    this.elbowR.position.copy(eR);

    // Two-Bone IK for Left & Right Legs + Boots (planted directly beneath hip sockets)
    const hL = new THREE.Vector3();
    const hR = new THREE.Vector3();
    this.hipL.getWorldPosition(hL);
    this.hipR.getWorldPosition(hR);

    const footL = new THREE.Vector3(hL.x, floorY, hL.z - 0.02);
    const footR = new THREE.Vector3(hR.x, floorY, hR.z + 0.03);
    const ankleL = footL.clone().add(new THREE.Vector3(0, 0.065, 0));
    const ankleR = footR.clone().add(new THREE.Vector3(0, 0.065, 0));

    // Forward knee pole vector (pointing in the character's forward +Z direction)
    const kneePole = new THREE.Vector3(Math.sin(bodyYaw), 0.15, Math.cos(bodyYaw)).normalize();
    const kL = solveTwoBoneIK(hL, ankleL, 0.44, 0.43, kneePole);
    const kR = solveTwoBoneIK(hR, ankleR, 0.44, 0.43, kneePole);

    placeSegmentBetween(this.thighL, hL, kL);
    placeSegmentBetween(this.shinL, kL, ankleL);
    this.kneeL.position.copy(kL);
    this.bootL.position.copy(footL);
    this.bootL.rotation.set(0, bodyYaw, 0);

    placeSegmentBetween(this.thighR, hR, kR);
    placeSegmentBetween(this.shinR, kR, ankleR);
    this.kneeR.position.copy(kR);
    this.bootR.position.copy(footR);
    this.bootR.rotation.set(0, bodyYaw, 0);
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
  const steel = std(0xd8dde2, { metalness: 0.9, roughness: 0.18 });
  const yellow = std(0xf2c230, { roughness: 0.4 });

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
      // Pro 30° Snap-Off Precision Utility Knife with segmented steel blade
      const bladeGroup = new THREE.Group();
      const bladeStrip = box(0.0016, 0.014, 0.048, steel);
      bladeStrip.position.set(0, 0.002, 0.024);
      bladeGroup.add(bladeStrip);
      // 30° bevelled razor tip at [0,0,0]
      const bevelTip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.018, 4), steel);
      bevelTip.rotation.x = -Math.PI / 2;
      bevelTip.rotation.z = Math.PI / 4;
      bevelTip.scale.set(0.2, 1, 1);
      bevelTip.position.set(0, 0, 0.006);
      bladeGroup.add(bevelTip);
      // Snap-off segment lines
      for (let s = 1; s <= 4; s += 1) {
        const segLine = box(0.002, 0.0145, 0.0008, black);
        segLine.position.set(0, 0.002, s * 0.009);
        bladeGroup.add(segLine);
      }
      const guideChannel = box(0.008, 0.019, 0.05, steel);
      guideChannel.position.set(0, 0.002, 0.062);
      const body = box(0.022, 0.032, 0.145, yellow);
      body.position.set(0, 0, 0.115);
      const overmold = box(0.024, 0.026, 0.095, black);
      overmold.position.set(0, -0.003, 0.125);
      const sliderLock = box(0.026, 0.014, 0.022, std(0xe03a2a));
      sliderLock.position.set(0, 0.014, 0.088);
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
  private surfaceMode: SimulatorSurfaceMode = "botanical";

  private right: HandRig;
  private left: HandRig;
  private human: HumanInstallerRig;
  private toolCache = new Map<ToolId, THREE.Group>();
  private activeTool: THREE.Group | null = null;
  private straightedge: THREE.Group;
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
  private outletFlaps: THREE.Group[] = [];
  private sheetOnTable: THREE.Mesh;
  private tableCutKerf: THREE.Mesh;
  private tableOffcutStrip: THREE.Mesh;
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
    this.human = new HumanInstallerRig(this.scene);

    // Secondary props: Pro 600mm Graduated Stainless-Steel Straightedge with Finger-Guard Rib
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

    // Drops + Real Human Cut Flaps & Kerf Lines ------------------------------
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

      const flapMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, transparent: true, side: THREE.DoubleSide });
      // Top ceiling excess flaps (uncut right side + peeling cut left side)
      const topFlapUncut = anchoredPlane(width, 0.048, flapMat, "right");
      const topFlapCut = anchoredPlane(width, 0.048, flapMat, "left");
      // Bottom baseboard excess flaps (uncut right side + peeling cut left side)
      const botFlapUncut = anchoredPlane(width, 0.065, flapMat, "right");
      const botFlapCut = anchoredPlane(width, 0.065, flapMat, "left");
      // Severed offcut strip lying on the drop cloth after cut completes
      const floorOffcut = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.92, 0.055), flapMat);
      floorOffcut.rotation.x = -Math.PI / 2 + 0.08;
      floorOffcut.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.06;
      floorOffcut.position.set((r.x0 + r.x1) / 2, 0.008, 0.16 + (i % 3) * 0.05);

      const topKerfLine = anchoredPlane(width, 0.0035, kerfMat, "left");
      topKerfLine.position.set(r.x0, WALL.height - 0.003, 0.0082);
      const botKerfLine = anchoredPlane(width, 0.0035, kerfMat, "left");
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

    // 4 Triangular flaps hinged along the top, bottom, left, right edges of the outlet box
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

    this.tableCutKerf = anchoredPlane(DROP_WIDTH, 0.0035, kerfMat, "left");
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
    this.renderer.render(this.scene, this.camera);
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
    const progressJump = Math.abs(progress - this.progress) > 0.2;
    this.stepIdx = stepIdx;
    this.progress = progress;
    if (stepChanged) {
      this.buildPathOverlay(step);
      this.updateCameraGoal(step);
    }
    this.applyWallState();
    this.placeActors(step, progress);
    if (this.autoCam && (this.snapNext || stepChanged || progressJump)) {
      const far = this.camera.position.distanceTo(this.camGoalPos) > 0.6;
      if (this.snapNext || far) {
        this.camera.position.copy(this.camGoalPos);
        this.controls.target.copy(this.camGoalTarget);
        this.controls.update();
      }
    }
    this.snapNext = false;
    this.lastStepIdx = stepIdx;
    this.renderer.render(this.scene, this.camera);
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

    // Drops + Progressive Real Human Cut Flaps (Ceiling + Baseboard + Floor Offcuts)
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
      // Top ceiling cut runs during ph.trim ∈ [0.05, 0.45]
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

      // Bottom baseboard cut runs during ph.trim ∈ [0.52, 0.92]
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
      // Once trimmed, show the severed paper strip resting on the drop cloth!
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
        // Angled 30° utility knife slicing along the straightedge on the worktable
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
        // Low 30° slicing angle drawing left-to-right along the stainless straightedge
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
    let wristR = tip.clone();
    if (step.tool === "hands") {
      const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, 0, 0));
      wristR = this.right.place(tip.clone().add(new THREE.Vector3(0, 0, 0.016)), flat);
      this.right.setCurl(0.12, 0.4);
    } else if (step.tool === "clock") {
      wristR = this.right.place(new THREE.Vector3(0.55, 1.0, 0.85), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0, -0.3)));
      this.right.setCurl(0.4);
    } else if (this.activeTool) {
      const grip = (this.activeTool.userData.grip as THREE.Vector3).clone().applyMatrix4(this.activeTool.matrixWorld);
      wristR = this.right.place(grip, q);
      this.right.setCurl(step.tool === "sponge" || step.tool === "microfiber" || step.tool === "sandingBlock" ? 0.55 : 0.92);
    }

    // Left hand / secondary prop
    this.straightedge.visible = false;
    let wristL = tip.clone().add(new THREE.Vector3(-0.35, -0.2, 0.3));
    if (s.secondary) {
      const sp = new THREE.Vector3(...s.secondary.p);
      if (step.secondaryTool === "straightedge") {
        this.straightedge.visible = true;
        this.straightedge.position.copy(sp);
        if (step.primitive === "cutOnTable") {
          this.straightedge.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
          wristL = this.left.place(
            sp.clone().add(new THREE.Vector3(-0.02, 0.024, -0.08)),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.15, 0, Math.PI / 2 - 0.2)),
          );
        } else {
          this.straightedge.rotation.set(0, 0, 0);
          // Pin the straightedge firmly against the wall with splayed fingers well clear of the blade edge
          const isTop = sp.y > 1.2;
          wristL = this.left.place(
            sp.clone().add(new THREE.Vector3(-0.11, isTop ? -0.048 : 0.048, 0.024)),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, -0.15)),
          );
        }
        // Splay fingers flat across the straightedge guard rail!
        this.left.setCurl(0.14, 0.85);
      } else {
        wristL = this.left.place(
          sp.clone().add(new THREE.Vector3(0, 0, 0.016)),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(step.primitive === "lay" ? -1.2 : 0.05, 0, 0)),
        );
        this.left.setCurl(step.secondaryTool === "plate" ? 0.3 : 0.12);
      }
      this.left.setVisible(true);
    } else if (step.primitive === "reliefCut") {
      // During outlet X-cut, left hand steadies the wallpaper just to the left of the outlet box
      wristL = this.left.place(
        new THREE.Vector3(OUTLET.x - 0.13, OUTLET.y + 0.01, 0.022),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, 0, -0.2)),
      );
      this.left.setCurl(0.12, 0.7);
      this.left.setVisible(true);
    } else {
      // Support hand resting naturally on the wall or at waist level
      const idle = new THREE.Vector3(
        Math.max(WALL.x0 - 0.05, tip.x - 0.34),
        Math.max(0.65, Math.min(1.45, tip.y - 0.18)),
        Math.max(0.28, tip.z + 0.25),
      );
      wristL = this.left.place(idle, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.65, 0.25, 0.3)));
      this.left.setCurl(0.45);
      this.left.setVisible(true);
    }

    // Update the full articulated 3D human worker (head, torso, IK arms, IK legs, boots, platform)
    this.human.update(tip, wristR, wristL, step);

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
      if (step.primitive === "trim") {
        // Close-up framing of the human installer's hands, straightedge, utility knife & peeling flap
        const isCeiling = tip.y > 1.25;
        const tx = Math.max(WALL.x0 + 0.32, Math.min(WALL.x1 - 0.32, tip.x));
        if (isCeiling) {
          this.camGoalTarget.set(tx - 0.08, WALL.height - 0.14, 0.06);
          this.camGoalPos.set(tx + 0.56, WALL.height - 0.38, 1.38);
        } else {
          this.camGoalTarget.set(tx - 0.08, 0.24, 0.06);
          this.camGoalPos.set(tx + 0.58, 0.58, 1.38);
        }
      } else {
        const ty = Math.max(0.7, Math.min(WALL.height - 0.45, tip.y));
        const tx = Math.max(WALL.x0 + 0.55, Math.min(WALL.x1 - 0.55, tip.x));
        this.camGoalTarget.set(tx, ty, 0.05);
        this.camGoalPos.set(tx + 0.42, Math.min(WALL.height - 0.25, ty + 0.2), 2.15);
      }
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
        return set([1.02, 1.48, TABLE.z1 + 0.58], [1.72, TABLE.y + 0.06, (TABLE.z0 + TABLE.z1) / 2]);
      case "stir":
        return set([0.75, 1.15, 1.75], [PASTE_BUCKET[0], 0.2, PASTE_BUCKET[2]]);
      case "probe":
      case "unscrew":
      case "screw":
      case "reliefCut":
        return set([OUTLET.x + 0.42, OUTLET.y + 0.32, 0.92], [OUTLET.x - 0.04, OUTLET.y + 0.04, 0.02]);
      case "trim": {
        const r = dropRect(step.dropIndex ?? 0);
        const cx = (r.x0 + r.x1) / 2;
        return set([cx + 0.52, 0.42, 1.18], [cx - 0.05, 0.16, 0.04]);
      }
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
