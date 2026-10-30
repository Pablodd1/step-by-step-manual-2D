import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Operation } from "./guide";

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
  metalness = 0
): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness, metalness })
  );
}

function makeLevel(): THREE.Group {
  const group = new THREE.Group();
  const body = meshBox([0.075, 0.72, 0.045], "#d7b820", 0.4);
  group.add(body);
  for (const y of [-0.22, 0, 0.22]) {
    const vial = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.014, 0.07, 4, 10),
      new THREE.MeshStandardMaterial({ color: "#a5d9b3", roughness: 0.18 })
    );
    vial.position.set(0, y, 0.029);
    group.add(vial);
  }
  return group;
}

function makeRoller(): THREE.Group {
  const group = new THREE.Group();
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.24, 28),
    new THREE.MeshStandardMaterial({ color: "#dad7cf", roughness: 0.95 })
  );
  sleeve.rotation.z = Math.PI / 2;
  group.add(sleeve);
  const metal = new THREE.MeshStandardMaterial({ color: "#8d969b", metalness: 0.75, roughness: 0.3 });
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.28, 10), metal);
  arm.position.set(0.12, -0.14, 0);
  group.add(arm);
  const handle = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.022, 0.12, 5, 12),
    new THREE.MeshStandardMaterial({ color: "#1d4640", roughness: 0.5 })
  );
  handle.position.set(0.12, -0.34, 0);
  group.add(handle);
  return group;
}

function makeSmoother(): THREE.Group {
  const group = new THREE.Group();
  const blade = meshBox([0.19, 0.115, 0.012], "#d3a83d", 0.45);
  group.add(blade);
  const grip = meshBox([0.09, 0.05, 0.035], "#293e3a", 0.5);
  grip.position.set(0, 0.025, 0.025);
  group.add(grip);
  return group;
}

function makeKnife(): THREE.Group {
  const group = new THREE.Group();
  const handle = meshBox([0.035, 0.16, 0.025], "#d0a928", 0.45);
  group.add(handle);
  const blade = meshBox([0.018, 0.09, 0.006], "#b8c1c4", 0.22, 0.85);
  blade.position.y = 0.12;
  group.add(blade);
  return group;
}

function makeFillingKnife(): THREE.Group {
  const group = new THREE.Group();
  const blade = meshBox([0.14, 0.105, 0.006], "#b8c1c4", 0.25, 0.8);
  blade.position.y = 0.055;
  group.add(blade);
  const handle = meshBox([0.045, 0.13, 0.035], "#315d52", 0.55);
  handle.position.y = -0.065;
  group.add(handle);
  return group;
}

function makePasteBrush(): THREE.Group {
  const group = new THREE.Group();
  const head = meshBox([0.14, 0.055, 0.035], "#8a6b3f", 0.65);
  group.add(head);
  const bristles = meshBox([0.14, 0.055, 0.025], "#d7d0b8", 0.95);
  bristles.position.y = -0.052;
  group.add(bristles);
  const handle = meshBox([0.04, 0.15, 0.025], "#315d52", 0.55);
  handle.position.y = 0.1;
  group.add(handle);
  return group;
}

function makeSponge(): THREE.Mesh {
  return meshBox([0.14, 0.075, 0.045], "#c7b85a", 0.98);
}

function makePencil(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.18, 6),
    new THREE.MeshStandardMaterial({ color: "#b9873c", roughness: 0.65 })
  );
  group.add(body);
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.007, 0.035, 8),
    new THREE.MeshStandardMaterial({ color: "#282c2e", roughness: 0.7 })
  );
  tip.position.y = 0.107;
  group.add(tip);
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
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88, side: THREE.DoubleSide })
  );
}

function makeTape(): THREE.Group {
  const group = new THREE.Group();
  const strip = meshBox([0.018, 2.48, 0.006], "#dbc64d", 0.55);
  strip.position.y = 1.24;
  group.add(strip);
  const body = meshBox([0.09, 0.075, 0.055], "#2f5450", 0.4);
  body.position.set(0, 0.02, 0.02);
  group.add(body);
  return group;
}

export class WallpaperScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  readonly controls: OrbitControls;
  private readonly host: HTMLElement;
  private readonly drops: DropMesh[] = [];
  private readonly rolls: THREE.Mesh[] = [];
  private readonly paste: THREE.Mesh[] = [];
  private readonly ghostLines = new THREE.Group();
  private readonly plumbLine: THREE.Mesh;
  private readonly outlet: THREE.Group;
  private readonly outletRing: THREE.Mesh;
  private readonly level = makeLevel();
  private readonly roller = makeRoller();
  private readonly smoother = makeSmoother();
  private readonly knife = makeKnife();
  private readonly fillingKnife = makeFillingKnife();
  private readonly pasteBrush = makePasteBrush();
  private readonly sponge = makeSponge();
  private readonly pencil = makePencil();
  private readonly tape = makeTape();
  private readonly displayRoll: THREE.Mesh;
  private readonly productLabel = makeProductLabel();
  private readonly outletCuts: THREE.LineSegments;
  private readonly floor: THREE.Mesh;
  private currentStep = -1;
  private currentOperation: Operation = "verify";
  private view: "room" | "drawing" = "room";
  private frame = 0;
  private disposed = false;

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Interactive reconstructed wallpaper installation demonstration");
    this.renderer.domElement.setAttribute("role", "img");
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color("#0c1220");
    this.scene.fog = new THREE.Fog("#0c1220", 8, 16);
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
    this.scene.add(wall);
    const side = meshBox([0.12, WALL_H, 0.72], "#aaa79f", 0.94);
    side.position.set(LEFT - 0.06, WALL_H / 2, -0.36);
    this.scene.add(side);
    const skirting = meshBox([WALL_W + 0.08, 0.09, 0.055], "#e0ded6", 0.72);
    skirting.position.set(0, 0.045, 0.025);
    this.scene.add(skirting);
    const ceiling = meshBox([WALL_W + 0.15, 0.07, 0.3], "#d7d5cd", 0.85);
    ceiling.position.set(0, WALL_H + 0.035, -0.08);
    this.scene.add(ceiling);
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      new THREE.MeshStandardMaterial({ color: "#25312f", roughness: 0.88 })
    );
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
        side: THREE.DoubleSide
      });
      const geometry = new THREE.PlaneGeometry(DROP_W, DROP_H, 12, 48);
      const drop = new THREE.Mesh(geometry, material) as DropMesh;
      drop.userData = { original: new Float32Array(geometry.attributes.position.array) };
      drop.position.set(FIRST_X + i * DROP_W, WALL_H / 2, 0.018 + i * 0.0002);
      drop.castShadow = true;
      drop.receiveShadow = true;
      this.drops.push(drop);
      this.scene.add(drop);
      const roll = new THREE.Mesh(
        new THREE.CylinderGeometry(0.043, 0.043, DROP_W, 32),
        material
      );
      roll.rotation.z = Math.PI / 2;
      roll.position.x = drop.position.x;
      roll.position.z = 0.065;
      roll.castShadow = true;
      this.rolls.push(roll);
      this.scene.add(roll);
      if (i < 2) {
        const lane = new THREE.Mesh(
          new THREE.PlaneGeometry(DROP_W + 0.035, DROP_H),
          new THREE.MeshBasicMaterial({ color: "#75c9d5", transparent: true, opacity: 0.24, depthWrite: false })
        );
        lane.position.set(drop.position.x, WALL_H / 2, 0.009);
        this.paste.push(lane);
        this.scene.add(lane);
        const points = [
          new THREE.Vector3(drop.position.x - DROP_W / 2, 0.03, 0.027),
          new THREE.Vector3(drop.position.x + DROP_W / 2, 0.03, 0.027),
          new THREE.Vector3(drop.position.x + DROP_W / 2, 2.67, 0.027),
          new THREE.Vector3(drop.position.x - DROP_W / 2, 2.67, 0.027),
          new THREE.Vector3(drop.position.x - DROP_W / 2, 0.03, 0.027)
        ];
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineDashedMaterial({ color: "#80a8b0", dashSize: 0.05, gapSize: 0.035 })
        );
        line.computeLineDistances();
        this.ghostLines.add(line);
      }
    }
    this.scene.add(this.ghostLines);

    this.plumbLine = meshBox([0.006, 2.58, 0.005], "#22d3ee", 0.35);
    this.plumbLine.position.set(LEFT + 0.5, 1.36, 0.035);
    this.scene.add(this.plumbLine);

    this.outlet = new THREE.Group();
    const plate = meshBox([0.17, 0.115, 0.022], "#e2e0d8", 0.32);
    this.outlet.add(plate);
    for (const x of [-0.042, 0.042]) {
      for (const y of [-0.022, 0.022]) {
        const slot = meshBox([0.009, 0.026, 0.006], "#30383a", 0.5);
        slot.position.set(x, y, 0.014);
        this.outlet.add(slot);
      }
    }
    this.outlet.position.copy(OUTLET);
    this.scene.add(this.outlet);
    this.outletRing = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.132, 48),
      new THREE.MeshBasicMaterial({ color: "#fbbf24", transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    this.outletRing.position.set(OUTLET.x, OUTLET.y, 0.085);
    this.scene.add(this.outletRing);

    this.displayRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, DROP_W, 48),
      this.drops[0].material
    );
    this.displayRoll.rotation.z = Math.PI / 2;
    this.displayRoll.position.set(-0.72, 0.1, 0.58);
    this.displayRoll.castShadow = true;
    this.scene.add(this.displayRoll);
    this.productLabel.position.set(-0.72, 0.32, 0.36);
    this.productLabel.rotation.x = -0.14;
    this.scene.add(this.productLabel);
    const cutPoints = [
      OUTLET.x - 0.075, OUTLET.y + 0.052, 0.09, OUTLET.x + 0.075, OUTLET.y - 0.052, 0.09,
      OUTLET.x + 0.075, OUTLET.y + 0.052, 0.09, OUTLET.x - 0.075, OUTLET.y - 0.052, 0.09
    ];
    this.outletCuts = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(cutPoints, 3)),
      new THREE.LineBasicMaterial({ color: "#7b3128", linewidth: 2 })
    );
    this.scene.add(this.outletCuts);

    for (const tool of [this.level, this.roller, this.smoother, this.knife, this.fillingKnife, this.pasteBrush, this.sponge, this.pencil, this.tape]) {
      tool.traverse((child) => {
        if (child instanceof THREE.Mesh) child.castShadow = true;
      });
      this.scene.add(tool);
    }
    this.resize();
    this.seek(0, 0, "verify");
    this.animate();
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
    for (const tool of [this.level, this.roller, this.smoother, this.knife, this.fillingKnife, this.pasteBrush, this.sponge, this.pencil, this.tape]) {
      tool.visible = false;
    }
  }

  seek(stepIndex: number, progress: number, operation: Operation) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    this.currentOperation = operation;
    if (stepIndex !== this.currentStep) {
      this.currentStep = stepIndex;
      this.resetCamera(operation);
    }
    this.hideTools();
    this.displayRoll.visible = operation === "verify";
    this.productLabel.visible = operation === "verify";
    this.outlet.visible = !(operation === "match" || (operation === "outlet" && p < 0.82));
    this.outletCuts.visible = operation === "outlet" && p > 0.16 && p < 0.88;
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
      case "verify":
      case "safety":
        break;
      case "prepare": {
        const tool = p < 0.48 ? this.fillingKnife : this.sponge;
        tool.visible = true;
        tool.position.set(-0.25 + Math.sin(p * 12) * 0.45, 1.55 - p * 1.25, 0.12);
        tool.rotation.z = p < 0.48 ? -0.65 : Math.sin(p * 15) * 0.25;
        break;
      }
      case "layout":
        this.pencil.visible = true;
        this.pencil.position.set(FIRST_X + DROP_W + p * DROP_W, 2.2 - p * 1.4, 0.1);
        break;
      case "plumb":
        this.level.visible = true;
        this.level.position.set(LEFT + 0.5, 2.25 - p * 1.75, 0.09);
        this.pencil.visible = true;
        this.pencil.position.set(LEFT + 0.54, 2.3 - p * 1.8, 0.09);
        break;
      case "measure":
        this.tape.visible = true;
        this.tape.position.set(FIRST_X - 0.1, 0.1, 0.08);
        this.tape.scale.y = 0.15 + p * 0.85;
        break;
      case "paste": {
        const coverage = Math.min(1, p / 0.72);
        this.paste[0].visible = true;
        this.paste[0].scale.y = Math.max(0.001, coverage);
        this.paste[0].position.y = 2.67 - (DROP_H * coverage) / 2;
        if (p < 0.72) {
          this.roller.visible = true;
          const rollerProgress = p / 0.72;
          const pass = (rollerProgress * 3) % 1;
          this.roller.position.set(FIRST_X + (Math.floor(rollerProgress * 3) % 2 ? 0.1 : -0.08), 0.28 + pass * 2.15, 0.13);
          this.roller.rotation.z = Math.sin(rollerProgress * 18) * 0.12;
        } else {
          this.pasteBrush.visible = true;
          const brushProgress = (p - 0.72) / 0.28;
          this.pasteBrush.position.set(FIRST_X - DROP_W / 2 + brushProgress * DROP_W, 2.58, 0.12);
          this.pasteBrush.rotation.z = Math.PI / 2;
        }
        break;
      }
      case "hang":
        this.paste[0].visible = true;
        this.setDrop(0, p, true);
        break;
      case "smooth": {
        this.smoother.visible = true;
        const stroke = Math.min(3, Math.floor(p * 4));
        const local = (p * 4) % 1;
        const direction = stroke % 2 ? -1 : 1;
        this.smoother.position.set(FIRST_X + direction * (local - 0.5) * 0.4, 2.35 - stroke * 0.52, 0.09);
        this.smoother.rotation.z = direction * -0.18;
        break;
      }
      case "trim": {
        this.knife.visible = true;
        const top = p < 0.5;
        const local = (p % 0.5) * 2;
        this.knife.position.set(FIRST_X - DROP_W / 2 + local * DROP_W, top ? 2.65 : 0.11, 0.1);
        this.knife.rotation.z = Math.PI / 2;
        break;
      }
      case "match": {
        this.paste[1].visible = true;
        if (p < 0.24) {
          const coverage = p / 0.24;
          this.paste[1].scale.y = Math.max(0.001, coverage);
          this.paste[1].position.y = 2.67 - (DROP_H * coverage) / 2;
          this.roller.visible = true;
          this.roller.position.set(FIRST_X + DROP_W, 0.35 + coverage * 2.05, 0.13);
        } else if (p < 0.8) {
          this.setDrop(1, (p - 0.24) / 0.56, true);
        } else {
          this.setDrop(1, 1, true);
          this.smoother.visible = true;
          const smoothing = (p - 0.8) / 0.2;
          this.smoother.position.set(FIRST_X + DROP_W * 1.5 + Math.sin(smoothing * 10) * 0.06, 2.35 - smoothing * 1.85, 0.09);
        }
        break;
      }
      case "outlet":
        this.knife.visible = true;
        this.knife.scale.setScalar(0.75);
        this.knife.position.set(OUTLET.x - 0.08 + p * 0.16, OUTLET.y + 0.07 - p * 0.14, 0.105);
        this.knife.rotation.z = -0.75 + p * 1.5;
        break;
      case "clean":
        this.sponge.visible = true;
        this.sponge.position.set(FIRST_X + DROP_W / 2 + Math.sin(p * 16) * 0.025, 2.4 - p * 2.05, 0.105);
        this.sponge.rotation.z = Math.sin(p * 12) * 0.22;
        break;
      case "inspect":
        break;
    }
    if (operation !== "outlet") this.knife.scale.setScalar(1);
  }

  private cameraPreset(operation?: Operation) {
    const closeOperations: Operation[] = ["plumb", "measure", "paste", "hang", "smooth", "trim"];
    if (this.view === "drawing") {
      this.camera.position.set(0, 1.35, 5.7);
      this.controls.target.set(0, 1.35, 0);
    } else if (operation === "verify") {
      this.camera.position.set(0.55, 1.0, 2.5);
      this.controls.target.set(-0.72, 0.22, 0.4);
    } else if (operation === "safety" || operation === "outlet") {
      this.camera.position.set(OUTLET.x + 0.45, 1.45, 1.75);
      this.controls.target.set(OUTLET.x, OUTLET.y, 0);
    } else if (operation && closeOperations.includes(operation)) {
      this.camera.position.set(FIRST_X + 0.75, 1.65, 3.15);
      this.controls.target.set(FIRST_X, 1.38, 0);
    } else if (operation === "clean") {
      this.camera.position.set(FIRST_X + 1.1, 1.55, 2.4);
      this.controls.target.set(FIRST_X + DROP_W / 2, 1.35, 0);
    } else {
      this.camera.position.set(3.75, 2.55, 5.25);
      this.controls.target.set(0, 1.3, 0);
    }
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  resetCamera(operation: Operation = this.currentOperation) {
    this.cameraPreset(operation);
  }

  setView(view: "room" | "drawing") {
    this.view = view;
    this.floor.visible = view === "room";
    this.scene.background = new THREE.Color(view === "room" ? "#0c1220" : "#182334");
    this.resetCamera();
  }

  resize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  getPerformanceInfo() {
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries
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
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
