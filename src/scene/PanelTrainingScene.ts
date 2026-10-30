import { renderBlueprint2DFrame } from "./renderBlueprint2D";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { guideTimeAtStep, type CameraPose, type Guide, type ProductProfile } from "@contracts/guide";
import type { GuideEngine } from "./GuideEngine";
import type { SceneStyle } from "./WallpaperScene";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function textSprite(text: string, options: { width?: number; color?: string; background?: string; size?: number } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = options.background ?? "rgba(20,24,22,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(210,253,120,0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = options.color ?? "#f9f1e4";
  ctx.font = `600 ${options.size ?? 46}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(options.width ?? 2.1, (options.width ?? 2.1) * 0.1875, 1);
  return sprite;
}

function line(points: THREE.Vector3[], color = 0xd2fd78, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.045, gapSize: 0.025, transparent: true, opacity: 0.9 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const object = new THREE.Line(geometry, material);
  if (dashed) object.computeLineDistances();
  return object;
}

function addOutline(mesh: THREE.Mesh, threshold = 32) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, threshold),
    new THREE.LineBasicMaterial({ color: 0x202a24, transparent: true, opacity: 0.62 }),
  );
  edges.userData.outline = true;
  mesh.add(edges);
}

function fabricBumpTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(512, 512);
  const random = mulberry32(820);
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 512; x += 1) {
      const index = (y * 512 + x) * 4;
      const weave = Math.sin(x * Math.PI / 2.7) * 10 + Math.sin(y * Math.PI / 3.1) * 10;
      const value = Math.max(0, Math.min(255, 128 + weave + (random() - 0.5) * 22));
      image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 14);
  return texture;
}

function floorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const random = mulberry32(1412);
  ctx.fillStyle = "#77766e";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 15000; i += 1) {
    const shade = Math.floor(95 + random() * 55);
    ctx.fillStyle = `rgba(${shade},${shade},${shade - 5},${0.04 + random() * 0.08})`;
    const radius = 0.3 + random() * 1.5;
    ctx.fillRect(random() * 512, random() * 512, radius, radius);
  }
  ctx.strokeStyle = "rgba(35,38,35,0.32)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 510, 510);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

function roundedPanelGeometry(width: number, height: number, depth: number) {
  const radius = Math.min(0.035, width * 0.16);
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const bevel = Math.min(0.003, depth * 0.12);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 10,
    steps: 1,
  });
  const positions = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < positions.count; index += 1) {
    uv.setXY(index, (positions.getX(index) + width / 2) / width, (positions.getY(index) + height / 2) / height);
  }
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export class PanelTrainingScene implements GuideEngine {
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.025, 80);
  readonly controls: OrbitControls;
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly canvas: HTMLCanvasElement;
  private guide: Guide;
  private product: ProductProfile;
  private currentTime = 0;
  private currentStep = -1;
  private suspended = false;
  private disposed = false;
  private frameId = 0;
  private panelGroups: THREE.Group[] = [];
  private readonly productRoot = new THREE.Group();
  private readonly dimensionRoot = new THREE.Group();
  private readonly plumbRoot = new THREE.Group();
  private clipRoot = new THREE.Group();
  private approvalSprite: THREE.Sprite;
  private exportRenderer?: THREE.WebGLRenderer;
  private exportSceneCanvas?: HTMLCanvasElement;
  private textures: THREE.Texture[] = [];
  private environmentTexture?: THREE.Texture;

  constructor(canvas: HTMLCanvasElement, guide: Guide) {
    if (!guide.product) throw new Error("PanelTrainingScene requires a product profile.");
    this.canvas = canvas;
    this.guide = guide;
    this.product = guide.product;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.86;
    this.scene.background = new THREE.Color(0x181c1a);
    this.scene.fog = new THREE.Fog(0x181c1a, 9, 22);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentTexture = pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this.environmentTexture;
    this.scene.environmentIntensity = 0.58;
    room.dispose();
    pmrem.dispose();

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.minDistance = 0.65;
    this.controls.maxDistance = 11;
    this.controls.maxPolarAngle = Math.PI * 0.51;
    this.controls.enablePan = true;

    this.buildRoom();
    this.scene.add(this.productRoot, this.dimensionRoot, this.plumbRoot);
    this.buildProduct();
    this.buildDimensions();
    this.buildPlumbLine();
    this.approvalSprite = textSprite("VISUAL PILOT  /  INSTALLATION APPROVAL REQUIRED", {
      width: 2.75, color: "#d2fd78", background: "rgba(24,28,26,0.94)", size: 38,
    });
    this.approvalSprite.position.set(0, this.product.geometry === "upholstered" ? 2.62 : 2.96, 0.16);
    this.scene.add(this.approvalSprite);
    this.setCamera(guide.steps[0].visual.camera);
    this.resize();
    this.seekGlobal(0);
    this.animate();
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, outline = true) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (outline) addOutline(mesh);
    return mesh;
  }

  private buildRoom() {
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xb9b5aa, roughness: 0.92 });
    const wall = this.mesh(new THREE.BoxGeometry(5.2, 3.3, 0.12), wallMaterial, false);
    wall.position.set(0, 1.6, -0.065);
    wall.receiveShadow = true;
    wall.castShadow = false;
    this.scene.add(wall);

    const floor = this.mesh(
      new THREE.PlaneGeometry(14, 12),
      new THREE.MeshStandardMaterial({ map: floorTexture(), color: 0xa5a299, roughness: 0.74, metalness: 0.02 }),
      false,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 2.5);
    floor.receiveShadow = true;
    floor.castShadow = false;
    this.scene.add(floor);

    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.6 });
    const base = this.mesh(new THREE.BoxGeometry(5.2, 0.09, 0.025), baseMaterial, false);
    base.position.set(0, 0.045, 0.013);
    this.scene.add(base);

    const side = this.mesh(new THREE.BoxGeometry(0.12, 3.3, 3.2), wallMaterial.clone(), false);
    side.position.set(-2.65, 1.6, 1.48);
    side.receiveShadow = true;
    this.scene.add(side);

    const key = new THREE.DirectionalLight(0xfff2dc, 2.15);
    key.position.set(-3.6, 5.4, 5.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -3;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 16;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.015;
    this.scene.add(key);

    const fill = new THREE.HemisphereLight(0xdde7ef, 0x4c463c, 0.9);
    this.scene.add(fill);
    const rim = new THREE.SpotLight(0xd9e5ff, 24, 12, Math.PI * 0.2, 0.7, 1.5);
    rim.position.set(3.2, 3.9, 3.3);
    rim.target.position.set(0, 1.35, 0);
    this.scene.add(rim, rim.target);
    const wash = new THREE.SpotLight(0xffe4bf, 16, 10, Math.PI * 0.25, 0.85, 1.8);
    wash.position.set(-1.8, 3.05, 1.7);
    wash.target.position.set(0.4, 1.1, 0);
    this.scene.add(wash, wash.target);
  }

  private loadTexture(url: string, color = true) {
    const texture = new THREE.TextureLoader().load(url, () => {
      texture.needsUpdate = true;
    });
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures.push(texture);
    return texture;
  }

  private buildProduct() {
    this.productRoot.clear();
    this.panelGroups = [];
    const product = this.product;
    const width = product.widthCm / 100;
    const height = product.heightCm / 100;
    const depth = product.thicknessMm / 1000;
    const map = this.loadTexture(product.textureUrl);
    const productLabel = textSprite(`${product.brand}  /  SKU ${product.sku}`, { width: 1.65, size: 43 });
    productLabel.position.set(1.1, product.geometry === "upholstered" ? 2.62 : 2.96, 0.1);
    this.productRoot.add(productLabel);

    if (product.geometry === "fluted") {
      const columns = 12;
      const baseDepth = Math.max(0.006, depth - 0.013);
      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x343a38, roughness: 0.72, metalness: 0.02 });
      const woodMaterial = new THREE.MeshStandardMaterial({
        map, color: 0xa58b73, roughness: 0.5, metalness: 0.01,
        bumpMap: map, bumpScale: 0.00055, envMapIntensity: 0.72,
      });
      for (let column = 0; column < columns; column += 1) {
        const group = new THREE.Group();
        const base = this.mesh(new THREE.BoxGeometry(width, height, baseDepth), baseMaterial);
        base.position.z = baseDepth / 2;
        group.add(base);
        const fluteCount = 4;
        const fluteWidth = width * 0.1625;
        const gap = (width - fluteCount * fluteWidth) / (fluteCount - 1);
        for (let flute = 0; flute < fluteCount; flute += 1) {
          const raised = this.mesh(new THREE.BoxGeometry(fluteWidth, height, depth - baseDepth), woodMaterial);
          raised.position.set(-width / 2 + fluteWidth / 2 + flute * (fluteWidth + gap), 0, baseDepth + (depth - baseDepth) / 2);
          group.add(raised);
        }
        const home = new THREE.Vector3((column - (columns - 1) / 2) * width, 0.08 + height / 2, 0);
        group.position.copy(home);
        group.userData.home = home;
        this.panelGroups.push(group);
        this.productRoot.add(group);
      }
      this.buildClip(width, height);
    } else if (product.geometry === "flat") {
      const material = new THREE.MeshPhysicalMaterial({
        map, color: 0xffffff, roughness: 0.16, metalness: 0.02,
        clearcoat: 1, clearcoatRoughness: 0.075, envMapIntensity: 1.2,
      });
      for (let column = 0; column < 2; column += 1) {
        const group = new THREE.Group();
        const sheet = this.mesh(new THREE.BoxGeometry(width, height, depth), material);
        sheet.position.z = depth / 2;
        group.add(sheet);
        const home = new THREE.Vector3((column - 0.5) * width, 0.18 + height / 2, 0);
        group.position.copy(home);
        group.userData.home = home;
        this.panelGroups.push(group);
        this.productRoot.add(group);
      }
    } else {
      const bump = fabricBumpTexture();
      this.textures.push(bump);
      const material = new THREE.MeshPhysicalMaterial({
        map, color: 0xfffdf7, roughness: 0.88, metalness: 0,
        bumpMap: bump, bumpScale: 0.00065,
        sheen: 1, sheenColor: new THREE.Color(0xf5ead2), sheenRoughness: 0.78,
        envMapIntensity: 0.42,
      });
      const columns = 8;
      for (let row = 0; row < 2; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const group = new THREE.Group();
          const panel = this.mesh(roundedPanelGeometry(width, height, depth), material);
          group.add(panel);
          const home = new THREE.Vector3((column - (columns - 1) / 2) * width, 0.25 + height / 2 + row * height, 0);
          group.position.copy(home);
          group.userData.home = home;
          this.panelGroups.push(group);
          this.productRoot.add(group);
        }
      }
    }
  }

  private buildClip(width: number, height: number) {
    this.clipRoot = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xb9c1c3, metalness: 0.92, roughness: 0.24 });
    const plate = this.mesh(new THREE.BoxGeometry(0.052, 0.028, 0.0015), metal);
    plate.position.z = 0.012;
    this.clipRoot.add(plate);
    const tab = this.mesh(new THREE.BoxGeometry(0.026, 0.018, 0.0015), metal);
    tab.rotation.x = Math.PI / 2;
    tab.position.set(0.013, 0, 0.021);
    this.clipRoot.add(tab);
    const screw = this.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.002, 24), metal);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(-0.012, 0, 0.014);
    this.clipRoot.add(screw);
    const slot = line([new THREE.Vector3(-0.016, 0, 0.0152), new THREE.Vector3(-0.008, 0, 0.0152)], 0x394043);
    this.clipRoot.add(slot);
    const clipLabel = textSprite("CONCEALED CLIP / REF 14122902", { width: 0.98, size: 38 });
    clipLabel.position.set(0.47, 0.14, 0.035);
    this.clipRoot.add(clipLabel);
    this.clipRoot.add(line([new THREE.Vector3(0.025, 0.02, 0.03), new THREE.Vector3(0.25, 0.11, 0.03)], 0xd2fd78));
    this.clipRoot.position.set(width * 0.65, 0.08 + height * 0.58, 0.28);
    this.clipRoot.visible = false;
    this.productRoot.add(this.clipRoot);
  }

  private buildDimensions() {
    const width = this.product.widthCm / 100;
    const height = this.product.heightCm / 100;
    const centerY = this.product.geometry === "flat" ? 0.18 + height / 2 : this.product.geometry === "fluted" ? 0.08 + height / 2 : 0.25 + height / 2;
    const x = -width / 2;
    const z = 0.13;
    this.dimensionRoot.add(line([new THREE.Vector3(x, centerY - height / 2, z), new THREE.Vector3(x + width, centerY - height / 2, z)]));
    this.dimensionRoot.add(line([new THREE.Vector3(x - 0.035, centerY - height / 2, z), new THREE.Vector3(x - 0.035, centerY + height / 2, z)]));
    const widthLabel = textSprite(`${this.product.widthCm} CM`, { width: 0.52, size: 58 });
    widthLabel.position.set(0, centerY - height / 2 - 0.09, z + 0.02);
    this.dimensionRoot.add(widthLabel);
    const heightLabel = textSprite(`${this.product.heightCm} CM`, { width: 0.62, size: 58 });
    heightLabel.position.set(x - 0.26, centerY, z + 0.02);
    this.dimensionRoot.add(heightLabel);
  }

  private buildPlumbLine() {
    const height = this.product.heightCm / 100;
    const plumb = line([new THREE.Vector3(0, 0.09, 0.1), new THREE.Vector3(0, Math.min(3.08, height + 0.16), 0.1)], 0xd2fd78, true);
    this.plumbRoot.add(plumb);
    const label = textSprite("APPROVED REFERENCE", { width: 0.92, size: 44 });
    label.position.set(0.48, Math.min(2.85, height + 0.06), 0.12);
    this.plumbRoot.add(label);
  }

  private setCamera(pose: CameraPose) {
    this.camera.position.set(...pose.position);
    this.controls.target.set(...pose.target);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  resetCamera() {
    this.setCamera(this.guide.steps[Math.max(0, this.currentStep)].visual.camera);
  }

  setCameraPreset(preset: "step" | "front" | "macro" | "iso") {
    if (preset === "step") {
      this.resetCamera();
    } else if (preset === "front") {
      this.setCamera({ position: [0, 1.48, 3.65], target: [0, 1.42, 0] });
    } else if (preset === "macro") {
      this.setCamera({ position: [0.16, 1.52, 1.18], target: [0.02, 1.46, 0] });
    } else if (preset === "iso") {
      this.setCamera({ position: [2.85, 2.15, 3.45], target: [0, 1.38, 0] });
    }
  }

  private currentStyle: SceneStyle = "drawing";
  getStyle(): SceneStyle { return this.currentStyle; }
  setStyle(style: SceneStyle) {
    this.currentStyle = style;
    const drawing = style === "drawing";
    this.scene.background = new THREE.Color(drawing ? 0xefe7d8 : 0xd8d5cb);
    this.panelGroups.forEach((group) => {
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh && !obj.userData.hasGeneratedEdges) {
          const mesh = obj as THREE.Mesh;
          mesh.userData.hasGeneratedEdges = true;
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(mesh.geometry, 22),
            new THREE.LineBasicMaterial({ color: 0x1e2822 })
          );
          edges.userData.outline = true;
          edges.visible = drawing;
          mesh.add(edges);
        }
      });
    });
    this.scene.traverse((object) => {
      if (object.userData.outline) object.visible = drawing;
    });
  }

  setGuide(guide: Guide) {
    if (!guide.product) return;
    if (guide.product.sku !== this.product.sku) {
      this.guide = guide;
      this.product = guide.product;
      this.buildProduct();
      this.dimensionRoot.clear();
      this.plumbRoot.clear();
      this.buildDimensions();
      this.buildPlumbLine();
    } else {
      this.guide = guide;
    }
    this.currentStep = -1;
    this.seekGlobal(0);
  }

  private updateProduct(action: string, progress: number) {
    const eased = smooth(progress);
    const showAll = action === "inspect" || action === "measure" || action === "check";
    const activeIndex = action === "match" ? 1 : 0;
    this.panelGroups.forEach((group, index) => {
      const home = group.userData.home as THREE.Vector3;
      group.position.copy(home);
      group.rotation.set(0, 0, 0);
      group.visible = showAll || ((action === "tools" || action === "place") && index === 0) || (action === "match" && index <= 1);
      if (action === "inspect" && index === 0) {
        group.position.z += Math.sin(progress * Math.PI) * 0.055;
      }
      if (action === "tools" && index === 0) {
        group.position.z += 0.42;
        group.position.x = 0;
        group.rotation.y = -0.12;
      }
      if (action === "place" && index === 0) {
        group.position.x += (1 - eased) * 0.85;
        group.position.z += (1 - eased) * 1.05;
        group.rotation.y = -(1 - eased) * 0.24;
      }
      if (action === "match" && index === activeIndex) {
        group.position.x += (1 - eased) * 0.5;
        group.position.z += (1 - eased) * 0.65;
        group.rotation.y = -(1 - eased) * 0.16;
      }
    });
    this.dimensionRoot.visible = action === "measure";
    this.plumbRoot.visible = action === "measure" || action === "place" || action === "match";
    this.approvalSprite.visible = action === "prepare" || action === "tools" || action === "check";
    this.clipRoot.visible = this.product.geometry === "fluted" && action === "tools";
  }

  seekGlobal(seconds: number) {
    const total = this.guide.steps.reduce((sum, step) => sum + step.duration, 0);
    this.currentTime = Math.max(0, Math.min(total, seconds));
    let index = this.guide.steps.length - 1;
    for (let candidate = 0; candidate < this.guide.steps.length; candidate += 1) {
      const start = guideTimeAtStep(this.guide, candidate);
      const end = start + this.guide.steps[candidate].duration;
      if (this.currentTime >= start && this.currentTime < end) {
        index = candidate;
        break;
      }
    }
    if (index !== this.currentStep) {
      this.currentStep = index;
      this.setCamera(this.guide.steps[index].visual.camera);
    }
    const step = this.guide.steps[index];
    const start = guideTimeAtStep(this.guide, index);
    const progress = clamp01((this.currentTime - start) / step.duration);
    this.updateProduct(step.visual.action, progress);
  }

  seekStep(stepIndex: number, progress = 1) {
    const index = Math.max(0, Math.min(this.guide.steps.length - 1, stepIndex));
    this.currentStep = index;
    this.setCamera(this.guide.steps[index].visual.camera);
    this.seekGlobal(guideTimeAtStep(this.guide, index) + this.guide.steps[index].duration * clamp01(progress));
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
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
    }
  };

  captureStep(stepIndex: number): string {
    const previousTime = this.currentTime;
    const previousPosition = this.camera.position.clone();
    const previousTarget = this.controls.target.clone();
    this.seekStep(stepIndex, 0.98);
    this.renderer.render(this.scene, this.camera);
    const image = this.canvas.toDataURL("image/jpeg", 0.92);
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
      this.exportRenderer.toneMappingExposure = 1.06;
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
    const gradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
    gradient.addColorStop(0, "rgba(21,26,23,0)");
    gradient.addColorStop(1, "rgba(21,26,23,0.97)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.45, width, height * 0.55);
    ctx.fillStyle = "#d2fd78";
    ctx.font = "600 24px 'IBM Plex Mono', monospace";
    ctx.fillText(`PLUMB / ${this.product.brand} MATERIAL PILOT / SKU ${this.product.sku}`, 72, 70);
    ctx.fillStyle = "#f9f1e4";
    ctx.textAlign = "right";
    ctx.fillText(`${String(stepIndex + 1).padStart(2, "0")} / ${String(this.guide.steps.length).padStart(2, "0")}`, width - 72, 70);
    ctx.textAlign = "left";
    ctx.font = "600 54px 'Space Grotesk', sans-serif";
    ctx.fillText(step.title, 72, height - 198, width - 144);
    ctx.font = "400 28px 'Space Grotesk', sans-serif";
    const words = step.instruction.split(" ");
    let textLine = "";
    let lineIndex = 0;
    for (const word of words) {
      const candidate = textLine ? `${textLine} ${word}` : word;
      if (ctx.measureText(candidate).width > width * 0.72 && textLine) {
        ctx.fillText(textLine, 72, height - 136 + lineIndex * 38);
        textLine = word;
        lineIndex += 1;
      } else textLine = candidate;
    }
    ctx.fillText(textLine, 72, height - 136 + lineIndex * 38);
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
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
        if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.textures.forEach((texture) => texture.dispose());
    this.environmentTexture?.dispose();
    this.renderer.dispose();
    this.exportRenderer?.dispose();
    delete document.documentElement.dataset.plumbSceneReady;
  }
}
