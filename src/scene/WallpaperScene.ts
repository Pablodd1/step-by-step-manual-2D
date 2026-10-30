import { renderBlueprint2DFrame } from "./renderBlueprint2D";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CameraPose, Guide, GuideStep, ToolKind, VisualState } from "@contracts/guide";
import { guideTimeAtStep } from "@contracts/guide";

export type SceneStyle = "2d" | "drawing" | "realistic";

const PALETTE = {
  forest: 0x151a17,
  forestSoft: 0x253029,
  paper: 0xf9f1e4,
  paperShade: 0xe2d8c7,
  acid: 0xd2fd78,
  wall: 0xddd6c8,
  metal: 0x7f8984,
  ink: 0x202a24,
  paste: 0xe9e4bf,
};

const WALL = { width: 4.4, height: 2.8, depth: 0.12 };
const DROP = { width: 0.53, height: 2.66, untrimmedHeight: 2.82, top: 2.73 };
const STATION = new THREE.Vector3(1.9, 0.87, 1.18);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function patternTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 768;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f9f1e4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#35473c";
  ctx.fillStyle = "#d7dec1";
  ctx.lineWidth = 3;
  for (let row = -1; row < 7; row += 1) {
    for (let column = -1; column < 4; column += 1) {
      const x = column * 150 + (row % 2) * 75 + 45;
      const y = row * 132 + 38;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(((row + column) % 3 - 1) * 0.17);
      ctx.beginPath();
      ctx.moveTo(0, 96);
      ctx.bezierCurveTo(-8, 60, 12, 25, 0, -18);
      ctx.stroke();
      for (let leaf = 0; leaf < 5; leaf += 1) {
        const ly = 74 - leaf * 20;
        const direction = leaf % 2 === 0 ? -1 : 1;
        ctx.save();
        ctx.translate(direction * 2, ly);
        ctx.rotate(direction * -0.58);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(direction * 28, -20, direction * 50, -8, direction * 58, 0);
        ctx.bezierCurveTo(direction * 38, 15, direction * 15, 13, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(direction * 48, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function standard(color: number, roughness = 0.78, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function outlinedMesh(geometry: THREE.BufferGeometry, material: THREE.Material, outline = true): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (outline) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 28),
      new THREE.LineBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.58 }),
    );
    edges.userData.outline = true;
    mesh.add(edges);
  }
  return mesh;
}

function box(size: [number, number, number], color: number, outline = true): THREE.Mesh {
  return outlinedMesh(new THREE.BoxGeometry(...size), standard(color), outline);
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, color: number, segments = 20): THREE.Mesh {
  return outlinedMesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), standard(color));
}

function makeTool(kind: ToolKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `tool-${kind}`;
  const add = (mesh: THREE.Object3D, position: [number, number, number], rotation?: [number, number, number]) => {
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    group.add(mesh);
    return mesh;
  };
  if (kind === "tape") {
    add(box([0.18, 0.15, 0.08], PALETTE.acid), [0, 0, 0]);
    add(box([0.7, 0.018, 0.012], PALETTE.paperShade, false), [-0.38, 0.03, 0]);
    for (let tick = 0; tick < 14; tick += 1) {
      add(box([0.008, tick % 5 === 0 ? 0.025 : 0.014, 0.014], PALETTE.ink, false), [-0.08 - tick * 0.047, 0.044, 0]);
    }
  } else if (kind === "level") {
    add(box([0.82, 0.085, 0.07], PALETTE.acid), [0, 0, 0]);
    for (const x of [-0.24, 0, 0.24]) {
      add(cylinder(0.027, 0.027, 0.075, PALETTE.forestSoft, 16), [x, 0, 0.04], [Math.PI / 2, 0, 0]);
      add(box([0.006, 0.052, 0.01], PALETTE.paper, false), [x, 0, 0.082]);
    }
  } else if (kind === "knife") {
    add(box([0.3, 0.075, 0.055], PALETTE.forestSoft), [0.09, 0, 0]);
    add(box([0.24, 0.045, 0.012], PALETTE.metal), [-0.18, 0, 0]);
    for (let groove = 0; groove < 5; groove += 1) add(box([0.012, 0.08, 0.06], PALETTE.acid, false), [groove * 0.045, 0, 0]);
  } else if (kind === "roller") {
    add(cylinder(0.09, 0.09, 0.48, PALETTE.paperShade), [0, 0.25, 0], [0, 0, Math.PI / 2]);
    add(box([0.035, 0.38, 0.035], PALETTE.metal), [0.22, -0.02, 0], [0, 0, -0.35]);
    add(cylinder(0.045, 0.045, 0.3, PALETTE.forestSoft), [0.3, -0.31, 0]);
  } else if (kind === "brush") {
    add(box([0.12, 0.34, 0.055], PALETTE.forestSoft), [0, -0.12, 0]);
    add(box([0.38, 0.18, 0.09], PALETTE.paperShade), [0, 0.16, 0]);
    add(box([0.4, 0.055, 0.075], PALETTE.metal), [0, 0.04, 0]);
  } else if (kind === "smoother" || kind === "squeegee") {
    const shape = new THREE.Shape();
    shape.moveTo(-0.28, -0.13);
    shape.lineTo(0.28, -0.13);
    shape.lineTo(0.2, 0.16);
    shape.lineTo(-0.2, 0.16);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false });
    add(outlinedMesh(geometry, standard(kind === "squeegee" ? PALETTE.forestSoft : PALETTE.acid)), [0, 0, 0]);
    add(box([0.28, 0.045, 0.05], PALETTE.ink), [0, 0.12, 0.02]);
  } else if (kind === "sponge") {
    add(box([0.28, 0.12, 0.16], 0xd9c97a), [0, 0, 0]);
    for (let pore = 0; pore < 9; pore += 1) {
      add(cylinder(0.012, 0.012, 0.005, 0xb9a85f, 8), [-0.1 + (pore % 3) * 0.1, 0.063, -0.05 + Math.floor(pore / 3) * 0.05]);
    }
  } else if (kind === "bucket") {
    add(cylinder(0.22, 0.17, 0.34, PALETTE.paperShade), [0, 0, 0]);
    add(cylinder(0.18, 0.18, 0.015, PALETTE.paste), [0, 0.17, 0]);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 24, Math.PI), standard(PALETTE.metal, 0.4, 0.5));
    add(handle, [0, 0.13, 0], [0, 0, 0]);
  } else if (kind === "scissors") {
    for (const x of [-0.08, 0.08]) {
      add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 20), standard(PALETTE.forestSoft)), [x, -0.11, 0]);
      add(box([0.035, 0.36, 0.012], PALETTE.metal), [x * 0.4, 0.12, 0], [0, 0, x > 0 ? -0.18 : 0.18]);
    }
  } else if (kind === "stepladder") {
    for (const x of [-0.26, 0.26]) {
      add(box([0.055, 1.25, 0.06], PALETTE.metal), [x, 0, 0], [0, 0, x > 0 ? -0.1 : 0.1]);
      add(box([0.055, 1.25, 0.06], PALETTE.metal), [x, 0, 0.52], [0.16, 0, x > 0 ? -0.1 : 0.1]);
    }
    for (let rung = 0; rung < 4; rung += 1) add(box([0.52, 0.045, 0.18], PALETTE.paperShade), [0, -0.46 + rung * 0.31, 0.06]);
  }
  group.scale.setScalar(0.72);
  return group;
}

export class WallpaperScene {
  private canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.05, 120);
  readonly controls: OrbitControls;
  private guide: Guide;
  private frameId = 0;
  private currentStep = -1;
  private currentTime = 0;
  private suspended = false;
  private currentVisual: VisualState;
  private strips: THREE.Group[] = [];
  private paperMaterials: THREE.MeshStandardMaterial[] = [];
  private backing: THREE.Mesh;
  private pasteLayer: THREE.Mesh;
  private plumbLine: THREE.Mesh;
  private seamLine: THREE.Mesh;
  private outletPlate!: THREE.Group;
  private activeTool: THREE.Group | null = null;
  private toolCache = new Map<ToolKind, THREE.Group>();
  private exportRenderer: THREE.WebGLRenderer | null = null;
  private exportSceneCanvas: HTMLCanvasElement | null = null;
  private keyLight: THREE.DirectionalLight;
  private disposed = false;
  private onReady?: () => void;

  constructor(canvas: HTMLCanvasElement, guide: Guide, onReady?: () => void) {
    this.canvas = canvas;
    this.guide = guide;
    this.onReady = onReady;
    this.currentVisual = guide.steps[0].visual;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 13;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.enablePan = true;

    this.scene.background = new THREE.Color(PALETTE.paper);
    this.scene.fog = new THREE.Fog(PALETTE.paper, 15, 45);
    const ambient = new THREE.HemisphereLight(PALETTE.paper, PALETTE.forestSoft, 2.3);
    this.scene.add(ambient);
    this.keyLight = new THREE.DirectionalLight(0xfff4df, 3.1);
    this.keyLight.position.set(4, 7, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 6;
    this.keyLight.shadow.camera.bottom = -6;
    this.scene.add(this.keyLight);
    const fill = new THREE.DirectionalLight(PALETTE.acid, 0.38);
    fill.position.set(-4, 3, 3);
    this.scene.add(fill);

    this.buildRoom();
    this.buildDrops();
    this.buildStation();
    this.backing = new THREE.Mesh(new THREE.PlaneGeometry(DROP.width * 0.96, DROP.height), standard(PALETTE.paperShade));
    this.backing.visible = false;
    this.scene.add(this.backing);
    this.pasteLayer = new THREE.Mesh(new THREE.PlaneGeometry(DROP.width + 0.055, DROP.height), new THREE.MeshStandardMaterial({ color: PALETTE.paste, transparent: true, opacity: 0.72, roughness: 1 }));
    this.pasteLayer.visible = false;
    this.scene.add(this.pasteLayer);
    this.plumbLine = new THREE.Mesh(new THREE.BoxGeometry(0.012, WALL.height - 0.1, 0.008), new THREE.MeshBasicMaterial({ color: PALETTE.acid }));
    this.plumbLine.position.set(-1.46, WALL.height / 2, 0.084);
    this.scene.add(this.plumbLine);
    this.seamLine = new THREE.Mesh(new THREE.BoxGeometry(0.014, DROP.height, 0.01), new THREE.MeshBasicMaterial({ color: PALETTE.acid }));
    this.seamLine.visible = false;
    this.scene.add(this.seamLine);
    this.setCamera(guide.steps[0].visual.camera);
    this.seekGlobal(0);
    this.resize();
    this.animate();
  }

  private buildRoom() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), standard(0xb9b3a7, 0.96));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const wall = box([WALL.width, WALL.height, WALL.depth], PALETTE.wall);
    wall.position.set(0, WALL.height / 2, 0);
    this.scene.add(wall);
    const side = box([0.12, WALL.height, 3.4], 0xcac3b7);
    side.position.set(-WALL.width / 2 - 0.04, WALL.height / 2, 1.65);
    this.scene.add(side);
    const baseboard = box([WALL.width + 0.06, 0.12, 0.12], PALETTE.paper);
    baseboard.position.set(0, 0.06, 0.08);
    this.scene.add(baseboard);
    const ceiling = box([WALL.width + 0.06, 0.08, 0.14], PALETTE.paper);
    ceiling.position.set(0, WALL.height - 0.02, 0.07);
    this.scene.add(ceiling);
    for (let board = 0; board < 9; board += 1) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.002, 7), new THREE.MeshBasicMaterial({ color: 0x9c978d, transparent: true, opacity: 0.45 }));
      seam.position.set(-4 + board, 0.003, 3.1);
      this.scene.add(seam);
    }
    const outlet = new THREE.Group();
    const recess = box([0.18, 0.25, 0.035], PALETTE.forestSoft);
    outlet.add(recess);
    for (const y of [-0.055, 0.055]) {
      const socket = box([0.095, 0.07, 0.012], PALETTE.ink, false);
      socket.position.set(0, y, 0.025);
      outlet.add(socket);
    }
    outlet.position.set(1.72, 1.05, 0.085);
    this.scene.add(outlet);
    this.outletPlate = new THREE.Group();
    const plate = box([0.22, 0.29, 0.025], PALETTE.paper);
    this.outletPlate.add(plate);
    for (const y of [-0.055, 0.055]) {
      const opening = box([0.095, 0.065, 0.012], PALETTE.forestSoft, false);
      opening.position.set(0, y, 0.018);
      this.outletPlate.add(opening);
    }
    this.outletPlate.position.copy(outlet.position).add(new THREE.Vector3(0, 0, 0.035));
    this.scene.add(this.outletPlate);
  }

  private buildDrops() {
    const texture = patternTexture();
    for (let index = 0; index < 5; index += 1) {
      const group = new THREE.Group();
      group.name = `wallpaper-drop-${index + 1}`;
      const map = texture.clone();
      map.needsUpdate = true;
      map.offset.set(index * 0.13, 0);
      const material = new THREE.MeshStandardMaterial({ map, roughness: 0.88, side: THREE.DoubleSide });
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(DROP.width, DROP.untrimmedHeight, 1, 16), material);
      paper.castShadow = true;
      paper.receiveShadow = true;
      group.add(paper);
      const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(0.006, DROP.untrimmedHeight, 0.004), new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.35 }));
      leftEdge.position.x = -DROP.width / 2;
      group.add(leftEdge);
      this.paperMaterials.push(material);
      this.strips.push(group);
      this.scene.add(group);
    }
  }

  private buildStation() {
    const table = new THREE.Group();
    const top = box([1.6, 0.08, 0.82], 0x8b7760);
    top.position.y = 0.62;
    table.add(top);
    for (const x of [-0.68, 0.68]) {
      for (const z of [-0.3, 0.3]) {
        const leg = box([0.065, 0.64, 0.065], PALETTE.forestSoft);
        leg.position.set(x, 0.3, z);
        table.add(leg);
      }
    }
    table.position.set(1.65, 0, 1.65);
    this.scene.add(table);
    const kinds: ToolKind[] = ["level", "knife", "roller", "smoother", "sponge", "bucket"];
    kinds.forEach((kind, index) => {
      const tool = makeTool(kind);
      tool.position.set(1.15 + (index % 3) * 0.48, index === 5 ? 0.94 : 0.75, 1.4 + Math.floor(index / 3) * 0.42);
      tool.rotation.set(-Math.PI / 2, 0, index * 0.24);
      this.scene.add(tool);
      this.toolCache.set(kind, tool);
    });
    const ladder = makeTool("stepladder");
    ladder.position.set(-2.25, 0.67, 0.75);
    ladder.rotation.y = 0.25;
    this.scene.add(ladder);
    this.toolCache.set("stepladder", ladder);
  }

  private setCamera(pose: CameraPose) {
    this.camera.position.set(...pose.position);
    this.controls.target.set(...pose.target);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  resetCamera() {
    this.setCamera(this.currentVisual.camera);
  }

  setCameraPreset(preset: "step" | "front" | "macro" | "iso") {
    if (preset === "step") {
      this.resetCamera();
    } else if (preset === "front") {
      this.setCamera({ position: [0, 1.55, 5.4], target: [0, 1.5, 0] });
    } else if (preset === "macro") {
      this.setCamera({ position: [0.22, 1.72, 1.85], target: [0.05, 1.65, 0] });
    } else if (preset === "iso") {
      this.setCamera({ position: [4.2, 2.85, 5.1], target: [0, 1.4, 0.2] });
    }
  }

  private currentStyle: SceneStyle = "drawing";
  getStyle(): SceneStyle { return this.currentStyle; }
  setStyle(style: SceneStyle) {
    this.currentStyle = style;
    const effective3DStyle = style === "2d" ? "drawing" : style;
    const drawing = style === "drawing";
    this.scene.background = new THREE.Color(drawing ? PALETTE.paper : PALETTE.forestSoft);
    this.scene.fog = new THREE.Fog(drawing ? PALETTE.paper : PALETTE.forestSoft, 15, 45);
    this.keyLight.intensity = drawing ? 3.1 : 2.25;
    this.scene.traverse((object) => {
      if (object.userData.outline) object.visible = drawing;
    });
    this.paperMaterials.forEach((material) => {
      material.roughness = drawing ? 0.95 : 0.64;
    });
  }

  setGuide(guide: Guide) {
    this.guide = guide;
    this.currentStep = -1;
    this.seekGlobal(0);
  }

  private selectTool(kind: ToolKind) {
    if (this.activeTool) {
      this.scene.remove(this.activeTool);
      this.activeTool = null;
    }
    if (kind === "none") return;
    const tool = makeTool(kind);
    tool.scale.setScalar(0.86);
    this.activeTool = tool;
    this.scene.add(tool);
  }

  private applyVisual(step: GuideStep, localProgress: number) {
    const visual = step.visual;
    this.currentVisual = visual;
    const progress = smooth(localProgress);
    const activeIndex = Math.min(visual.strips - 1, visual.activeStrip);
    this.strips.forEach((group, index) => {
      const isActive = index === activeIndex && visual.strips > 0;
      const completed = index < visual.strips - 1 || (visual.strips > 0 && !isActive && index < visual.strips);
      group.visible = completed || isActive;
      if (!group.visible) return;
      const reveal = isActive ? Math.max(0.04, progress) : 1;
      const height = visual.trim ? DROP.height : DROP.untrimmedHeight;
      group.scale.set(1, reveal * (height / DROP.untrimmedHeight), 1);
      const x = -1.46 + DROP.width / 2 + index * DROP.width;
      const offset = isActive && (visual.action === "place" || visual.action === "match") ? (1 - progress) * 0.24 : 0;
      group.position.set(x + offset, DROP.top - (DROP.untrimmedHeight * group.scale.y) / 2, 0.074 + index * 0.0015);
      if (isActive && visual.action === "peel") group.rotation.y = (1 - progress) * -0.18;
      else group.rotation.y = 0;
      const material = this.paperMaterials[index];
      if (material.map) material.map.offset.y = isActive && visual.patternMatch ? (1 - progress) * 0.18 : 0;
    });

    const activeX = -1.46 + DROP.width / 2 + Math.max(0, activeIndex) * DROP.width;
    this.pasteLayer.visible = visual.paste;
    if (visual.paste) {
      this.pasteLayer.position.set(activeX, DROP.top - DROP.height / 2, 0.068);
      const material = this.pasteLayer.material as THREE.MeshStandardMaterial;
      material.opacity = 0.24 + (1 - progress) * 0.4;
    }
    this.plumbLine.visible = visual.plumb;
    this.seamLine.visible = visual.patternMatch && visual.strips > 1;
    this.seamLine.position.set(activeX + DROP.width / 2, DROP.top - DROP.height / 2, 0.094);
    this.outletPlate.position.set(1.72 + (visual.outletSafe ? 0.32 * progress : 0), 1.05 - (visual.outletSafe ? 0.28 * progress : 0), 0.12 + (visual.outletSafe ? 0.22 * progress : 0));
    this.outletPlate.rotation.y = visual.outletSafe ? progress * 0.8 : 0;

    this.backing.visible = visual.backing && visual.strips > 0;
    if (this.backing.visible) {
      this.backing.position.set(activeX + progress * 0.24, DROP.top - DROP.height / 2 - progress * 1.45, 0.12 + progress * 0.35);
      this.backing.rotation.set(progress * 0.55, 0, -progress * 0.22);
    }

    if (this.activeTool?.name !== `tool-${visual.tool}`) this.selectTool(visual.tool);
    if (this.activeTool) {
      const tool = this.activeTool;
      const travel = Math.sin(progress * Math.PI * 4) * 0.15;
      tool.rotation.set(0, 0, 0);
      if (visual.action === "measure") {
        tool.position.set(-1.45 + progress * 2.9, 1.55, 0.19);
      } else if (visual.action === "mark") {
        tool.position.set(-1.46, 2.55 - progress * 2.25, 0.17);
        tool.rotation.z = Math.PI / 2;
      } else if (visual.action === "paste") {
        tool.position.set(activeX + travel, 2.52 - progress * 2.15, 0.24);
        tool.rotation.z = travel > 0 ? 0.16 : -0.16;
      } else if (visual.action === "smooth" || visual.action === "match") {
        tool.position.set(activeX + travel, 2.47 - progress * 2.08, 0.19);
        tool.rotation.z = travel > 0 ? -0.35 : 0.35;
      } else if (visual.action === "trim") {
        tool.position.set(-1.35 + progress * 2.7, visual.callout.includes("corner") ? 1.3 : 2.68, 0.2);
        tool.rotation.z = -0.1;
      } else if (visual.action === "clean" || visual.action === "check" || visual.action === "prepare") {
        tool.position.set(-0.9 + progress * 1.8, 1.5 + Math.sin(progress * Math.PI * 2) * 0.45, 0.18);
      } else {
        tool.position.copy(STATION);
        tool.rotation.x = -Math.PI / 2;
      }
    }
  }

  seekGlobal(seconds: number) {
    const duration = Math.max(1, this.guide.steps.reduce((sum, step) => sum + step.duration, 0));
    const time = Math.min(duration - 0.0001, Math.max(0, seconds));
    this.currentTime = time;
    let index = this.guide.steps.length - 1;
    for (let step = 0; step < this.guide.steps.length; step += 1) {
      const start = guideTimeAtStep(this.guide, step);
      if (time < start + this.guide.steps[step].duration) {
        index = step;
        break;
      }
    }
    const local = clamp01((time - guideTimeAtStep(this.guide, index)) / this.guide.steps[index].duration);
    if (index !== this.currentStep) {
      this.currentStep = index;
      this.setCamera(this.guide.steps[index].visual.camera);
    }
    this.applyVisual(this.guide.steps[index], local);
  }

  seekStep(stepIndex: number, progress = 1) {
    const index = Math.max(0, Math.min(this.guide.steps.length - 1, stepIndex));
    this.seekGlobal(guideTimeAtStep(this.guide, index) + this.guide.steps[index].duration * clamp01(progress));
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate = () => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);
    if (!this.suspended) {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
    if (!document.documentElement.dataset.plumbSceneReady) {
      document.documentElement.dataset.plumbSceneReady = "true";
      this.onReady?.();
    }
  };

  captureStep(stepIndex: number): string {
    const previousTime = this.currentTime;
    const previousPosition = this.camera.position.clone();
    const previousTarget = this.controls.target.clone();
    this.seekStep(stepIndex, 0.98);
    this.renderer.render(this.scene, this.camera);
    const image = this.canvas.toDataURL("image/jpeg", 0.9);
    this.seekGlobal(previousTime);
    this.camera.position.copy(previousPosition);
    this.controls.target.copy(previousTarget);
    this.controls.update();
    return image;
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getCurrentStepIndex() {
    return Math.max(0, this.currentStep);
  }

  setSuspended(suspended: boolean) {
    this.suspended = suspended;
  }

  renderExportFrame(output: HTMLCanvasElement, seconds: number, width = 1920, height = 1080) {
    if (!this.exportRenderer) {
      this.exportSceneCanvas = document.createElement("canvas");
      this.exportRenderer = new THREE.WebGLRenderer({ canvas: this.exportSceneCanvas, antialias: true, preserveDrawingBuffer: true });
      this.exportRenderer.setPixelRatio(1);
      this.exportRenderer.shadowMap.enabled = true;
      this.exportRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.exportRenderer.outputColorSpace = THREE.SRGBColorSpace;
      this.exportRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.exportRenderer.toneMappingExposure = 1.08;
    }
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    if (this.exportSceneCanvas!.width !== width || this.exportSceneCanvas!.height !== height) {
      this.exportSceneCanvas!.width = width;
      this.exportSceneCanvas!.height = height;
      this.exportRenderer.setSize(width, height, false);
    }
    const interactiveAspect = this.camera.aspect;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.seekGlobal(seconds);
    this.exportRenderer.render(this.scene, this.camera);
    const ctx = output.getContext("2d")!;
    ctx.fillStyle = "#151a17";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(this.exportSceneCanvas!, 0, 0, width, height);
    const stepIndex = this.currentStep;
    const step = this.guide.steps[stepIndex];
    const total = this.guide.steps.reduce((sum, item) => sum + item.duration, 0);
    const gradient = ctx.createLinearGradient(0, height * 0.55, 0, height);
    gradient.addColorStop(0, "rgba(21,26,23,0)");
    gradient.addColorStop(1, "rgba(21,26,23,0.97)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.48, width, height * 0.52);
    ctx.fillStyle = "#d2fd78";
    ctx.font = "600 24px 'IBM Plex Mono', monospace";
    ctx.fillText("PLUMB / 3D FIELD GUIDE", 72, 70);
    ctx.fillStyle = "#f9f1e4";
    ctx.font = "500 26px 'IBM Plex Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${String(stepIndex + 1).padStart(2, "0")} / ${String(this.guide.steps.length).padStart(2, "0")}`, width - 72, 70);
    ctx.textAlign = "left";
    ctx.font = "600 54px 'Space Grotesk', sans-serif";
    ctx.fillText(step.title, 72, height - 198, width - 144);
    ctx.font = "400 28px 'Space Grotesk', sans-serif";
    const words = step.instruction.split(" ");
    let line = "";
    let lineIndex = 0;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > width * 0.72 && line) {
        ctx.fillText(line, 72, height - 136 + lineIndex * 38);
        line = word;
        lineIndex += 1;
      } else line = candidate;
    }
    ctx.fillText(line, 72, height - 136 + lineIndex * 38);
    ctx.fillStyle = "rgba(249,241,228,0.2)";
    ctx.fillRect(72, height - 46, width - 144, 4);
    ctx.fillStyle = "#d2fd78";
    ctx.fillRect(72, height - 46, (width - 144) * clamp01(seconds / total), 4);
    this.camera.aspect = interactiveAspect;
    this.camera.updateProjectionMatrix();
  }

  getPerformanceInfo() {
    return { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.controls.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.renderer.dispose();
    this.exportRenderer?.dispose();
    delete document.documentElement.dataset.plumbSceneReady;
  }
}
