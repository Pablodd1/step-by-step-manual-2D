/**
 * Open-Source 3D Technical Illustration & CAD Line-Art Shader Pipeline
 *
 * Adapted from MIT-licensed open-source reference:
 * - Nutlope/bygga (https://github.com/Nutlope/bygga, MIT License) — `src/engine/materials.ts`, `src/engine/drawable.ts`, `src/engine/stage.ts`
 * - Three.js Official Fat Lines (`three/examples/jsm/lines/LineSegments2.js`, `LineMaterial.js`, MIT License)
 *
 * IMPORTANT: Never store Three.js Material or Object3D instances inside `mesh.userData`
 * because `THREE.Object3D.prototype.clone()` executes `JSON.parse(JSON.stringify(source.userData))`,
 * which invokes `Object3D.toJSON()` without a `meta` object and throws `Cannot convert undefined or null to object`.
 * All CAD metadata is stored in `cadMeshRegistry` (`WeakMap`) and `cadAuxiliarySet` (`WeakSet`).
 */

import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

export const CAD_INK = 0x141414;
export const CAD_INK_OLD = 0x8a867e;
export const CAD_PAPER = 0xffffff;
export const CAD_TINT_NEW = 0xfff3c4;
export const CAD_TINT_ACCENT = 0xffd21f;

export type Pt2 = { x: number; y: number };

interface CadMeshMeta {
  pbrMat: THREE.Material | THREE.Material[];
  celMat: THREE.ShaderMaterial;
  /** Per-group authored line weight; applyGroupViewMode scales it instead of overwriting it. */
  baseWidth: number;
  edgeLines?: LineSegments2;
  lineMat?: LineMaterial;
  hullMesh?: THREE.Mesh;
  hullMat?: THREE.ShaderMaterial;
}

const sharedRes = new THREE.Vector2(1280, 800);
const trackedHullMaterials = new Set<THREE.ShaderMaterial>();
const trackedLineMaterials = new Set<LineMaterial>();
const cadMeshRegistry = new WeakMap<THREE.Mesh, CadMeshMeta>();
const cadAuxiliarySet = new WeakSet<THREE.Object3D>();

export function markCadAuxiliary(obj: THREE.Object3D): void {
  cadAuxiliarySet.add(obj);
}

/**
 * Sync screen-space shader resolution across all active `LineMaterial` and `hullMaterial` instances.
 */
export function setLineArtResolution(width: number, height: number): void {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  sharedRes.set(w, h);
  for (const mat of trackedHullMaterials) {
    mat.uniforms.uRes.value.set(w, h);
  }
  for (const mat of trackedLineMaterials) {
    mat.resolution.set(w, h);
  }
}

/**
 * Discrete 4-band cel/toon face material for CAD manual mode.
 * Keeps faces near-white with subtle warm-grey depth steps so ink outlines read with maximum contrast.
 */
export function createFaceMaterial(
  baseHex = 0xfaf9f5,
  tintHex = CAD_TINT_NEW,
  tintAmt = 0.0,
  opacity = 1.0,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 2.0,
    transparent: opacity < 1,
    depthWrite: opacity >= 0.95,
    uniforms: {
      uBase: { value: new THREE.Color(baseHex) },
      uTint: { value: new THREE.Color(tintHex) },
      uTintAmt: { value: tintAmt },
      uOpacity: { value: opacity },
      uLightDir: { value: new THREE.Vector3(0.48, 0.78, 0.42).normalize() },
      // 0 = flat paper-white faces (context architecture), 1 = full 4-band cel steps (hero parts)
      uBands: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uTint;
      uniform float uTintAmt;
      uniform float uOpacity;
      uniform vec3 uLightDir;
      uniform float uBands;
      varying vec3 vNormal;
      void main() {
        float d = dot(normalize(vNormal), uLightDir) * 0.5 + 0.5;
        float band = d > 0.76 ? 1.0 : (d > 0.50 ? 0.955 : (d > 0.28 ? 0.90 : 0.845));
        band = mix(1.0, band, uBands);
        vec3 col = mix(uBase * band, uTint * band, uTintAmt);
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  });
}

/**
 * Inverted-hull (`THREE.BackSide`) screen-space silhouette material.
 * Extrudes vertices outward in clip space along `hullDir` so curved cylinders, rollers,
 * bottles, and bevelled boxes always render a crisp outer ink contour.
 */
export function createHullMaterial(width = 1.85, color = CAD_INK, opacity = 1.0): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: opacity < 1,
    depthWrite: opacity >= 0.95,
    uniforms: {
      uWidth: { value: width },
      uColor: { value: new THREE.Color(color) },
      uRes: { value: sharedRes.clone() },
      uOpacity: { value: opacity },
    },
    vertexShader: /* glsl */ `
      attribute vec3 hullDir;
      uniform float uWidth;
      uniform vec2 uRes;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * hullDir);
        // Faces pointing straight at/away from the camera have n.xy ~ 0. normalize(n.xy + eps) used to push
        // them diagonally (+x,+y), which drew a one-sided "drop shadow" ink edge on tools held parallel to
        // the wall. Only extrude where the normal actually has a screen-space direction.
        float nl = length(n.xy);
        vec2 dir = nl > 1e-3 ? n.xy / nl : vec2(0.0);
        clip.xy += dir * uWidth * 2.0 / uRes * clip.w;
        clip.z += 0.00025 * clip.w;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        gl_FragColor = vec4(uColor, uOpacity);
      }
    `,
  });
  trackedHullMaterials.add(mat);
  return mat;
}

/**
 * Fat screen-space `LineMaterial` (`three/examples/jsm/lines/LineMaterial.js`).
 */
export function createFatLineMaterial(width = 1.9, color = CAD_INK, opacity = 1.0, dashed = false): LineMaterial {
  const mat = new LineMaterial({
    color,
    linewidth: width,
    worldUnits: false,
    dashed,
    dashSize: 0.08,
    gapSize: 0.05,
    transparent: opacity < 1,
    opacity,
    resolution: sharedRes.clone(),
  });
  trackedLineMaterials.add(mat);
  return mat;
}

/**
 * Compute averaged outward `hullDir` per vertex position so hard-edge split vertices
 * extrude coherently without cracking at corners.
 */
export function ensureHullDirAttribute(geo: THREE.BufferGeometry, isCylinderLike = false): void {
  if (geo.getAttribute("hullDir")) return;
  const pos = geo.getAttribute("position");
  if (!pos) return;

  const out = new Float32Array(pos.count * 3);

  if (isCylinderLike) {
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const rl = Math.hypot(x, z) || 1;
      const rx = x / rl;
      const rz = z / rl;
      const sy = y >= 0 ? 1 : -1;
      const l = Math.hypot(rx, sy * 0.45, rz) || 1;
      out[i * 3] = rx / l;
      out[i * 3 + 1] = (sy * 0.45) / l;
      out[i * 3 + 2] = rz / l;
    }
    geo.setAttribute("hullDir", new THREE.BufferAttribute(out, 3));
    return;
  }

  const nrm = geo.getAttribute("normal");
  const accum = new Map<string, [number, number, number]>();
  const keyOf = (i: number) =>
    `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;

  for (let i = 0; i < pos.count; i += 1) {
    const k = keyOf(i);
    const nx = nrm ? nrm.getX(i) : pos.getX(i);
    const ny = nrm ? nrm.getY(i) : pos.getY(i);
    const nz = nrm ? nrm.getZ(i) : pos.getZ(i);
    const prev = accum.get(k);
    if (prev) {
      prev[0] += nx;
      prev[1] += ny;
      prev[2] += nz;
    } else {
      accum.set(k, [nx, ny, nz]);
    }
  }

  for (let i = 0; i < pos.count; i += 1) {
    const sum = accum.get(keyOf(i)) ?? [0, 1, 0];
    const len = Math.hypot(sum[0], sum[1], sum[2]) || 1;
    out[i * 3] = sum[0] / len;
    out[i * 3 + 1] = sum[1] / len;
    out[i * 3 + 2] = sum[2] / len;
  }

  geo.setAttribute("hullDir", new THREE.BufferAttribute(out, 3));
}

export interface LineArtUpgradeOptions {
  /** Crease threshold angle in degrees (default 24) */
  thresholdAngle?: number;
  /** Whether to add the BackSide silhouette hull (default true) */
  includeHull?: boolean;
  /** Default cel base color in Drawing mode */
  celBaseHex?: number;
  /** Default active tint amount in Drawing mode (0..0.45) */
  tintAmt?: number;
  /** Line width in screen pixels in Drawing mode (default 1.95) */
  drawingLineWidth?: number;
}

/**
 * Upgrades all meshes inside `root` with:
 * - Fat `LineSegments2` crease lines
 * - `THREE.BackSide` extruded silhouette hull
 * - Cached PBR material + 4-band cel shader material in `cadMeshRegistry` (`WeakMap`)
 */
export function upgradeGroupToLineArt(root: THREE.Object3D, opts: LineArtUpgradeOptions = {}): void {
  const threshold = opts.thresholdAngle ?? 24;
  const includeHull = opts.includeHull ?? true;
  const drawingLineWidth = opts.drawingLineWidth ?? 1.95;

  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    const asMesh = obj as THREE.Mesh;
    if (
      asMesh.isMesh &&
      !cadAuxiliarySet.has(obj) &&
      !(obj as LineSegments2).isLineSegments2 &&
      asMesh.geometry?.type !== "LineSegmentsGeometry"
    ) {
      meshes.push(asMesh);
    }
  });

  for (const mesh of meshes) {
    if (cadMeshRegistry.has(mesh)) continue;
    const geo = mesh.geometry as THREE.BufferGeometry | undefined;
    if (!geo || !geo.getAttribute("position")) continue;

    const isPlane = geo.type === "PlaneGeometry";
    const isCyl = geo.type === "CylinderGeometry";
    // Faceted curved primitives (capsule fingers, cylinders, spheres, rounded-box bevels) have 20–36° between
    // neighbouring facets, so a 22–24° crease threshold inks every facet and produces hatched "spaghetti"
    // on gloves and handles. Curved bodies get their outline from the silhouette hull; only real creases
    // (cylinder caps, box corners) should survive here.
    const isCurved = isCyl || geo.type === "CapsuleGeometry" || geo.type === "SphereGeometry" || geo.type === "ConeGeometry";
    const isRoundedBox = geo.type === "RoundedBoxGeometry" || (geo.type === "BoxGeometry" && (geo.getAttribute("position")?.count ?? 0) > 24);
    const creaseAngle = isCurved ? Math.max(threshold, 70) : isRoundedBox ? Math.max(threshold, 50) : threshold;

    let baseHex = opts.celBaseHex ?? 0xfaf9f5;
    const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (origMat && (origMat as THREE.MeshStandardMaterial).color) {
      const c = (origMat as THREE.MeshStandardMaterial).color;
      const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
      baseHex = lum < 0.25 ? 0xe5e3dc : lum < 0.6 ? 0xf2f0ea : 0xfcfbf8;
    }

    const celMat = createFaceMaterial(baseHex, CAD_TINT_NEW, opts.tintAmt ?? 0.18, 1.0);
    const meta: CadMeshMeta = {
      pbrMat: mesh.material,
      celMat,
      baseWidth: drawingLineWidth,
    };

    // 1. Fat screen-space crease edges via LineSegments2
    const edgesGeo = new THREE.EdgesGeometry(geo, creaseAngle);
    const posAttr = edgesGeo.getAttribute("position");
    if (posAttr && posAttr.count >= 2) {
      const lsGeo = new LineSegmentsGeometry();
      lsGeo.setPositions(posAttr.array as Float32Array);
      const lineMat = createFatLineMaterial(drawingLineWidth, CAD_INK, 0.95);
      const edgeLines = new LineSegments2(lsGeo, lineMat);
      cadAuxiliarySet.add(edgeLines);
      edgeLines.renderOrder = 2;
      mesh.add(edgeLines);
      meta.edgeLines = edgeLines;
      meta.lineMat = lineMat;
    }
    edgesGeo.dispose();

    // 2. BackSide silhouette hull for curved cylinders and 3D bodies
    if (includeHull && !isPlane) {
      ensureHullDirAttribute(geo, isCyl);
      const hullMat = createHullMaterial(drawingLineWidth * 0.95, CAD_INK, 0.96);
      const hullMesh = new THREE.Mesh(geo, hullMat);
      cadAuxiliarySet.add(hullMesh);
      hullMesh.castShadow = false;
      hullMesh.receiveShadow = false;
      hullMesh.renderOrder = 1;
      mesh.add(hullMesh);
      meta.hullMesh = hullMesh;
      meta.hullMat = hullMat;
    }

    cadMeshRegistry.set(mesh, meta);
  }
}

export interface GroupStyleState {
  /** 'drawing' = CAD Cel + Fat Ink Outlines; 'room' = Studio PBR + subtle edges */
  viewMode: "drawing" | "room";
  /** 'active' = bold `#141414` ink + warm `#fff3c4` highlight; 'context' = muted `#8a867e` ink */
  emphasis?: "active" | "context" | "accent";
}

/**
 * Switches a Three.js object hierarchy between `Drawing (CAD)` mode and `Realistic 3D (Room)` mode.
 */
export function applyGroupViewMode(root: THREE.Object3D, state: GroupStyleState): void {
  const isDrawing = state.viewMode === "drawing";
  const emphasis = state.emphasis ?? "active";
  const inkColor = emphasis === "context" ? CAD_INK_OLD : CAD_INK;
  // Technical-illustration hierarchy: the part/tool being worked is the heaviest line, the paper being hung is
  // medium, and the room is a thin grey context line. (Previously "accent" tools fell through to the thin
  // context weight, so the hero tool was drawn lighter than the wallpaper.)
  const weight = emphasis === "accent" ? 1.25 : emphasis === "active" ? 1.0 : 0.6;
  const lineOpacity = isDrawing ? (emphasis === "context" ? 0.75 : 1.0) : emphasis === "context" ? 0 : 0.16;
  const tintAmt = emphasis === "active" ? 0.12 : emphasis === "accent" ? 0.3 : 0.0;
  const bands = emphasis === "context" ? 0.0 : emphasis === "active" ? 0.5 : 1.0;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || cadAuxiliarySet.has(mesh)) return;
    const meta = cadMeshRegistry.get(mesh);
    if (!meta) return;

    if (isDrawing) {
      meta.celMat.uniforms.uTintAmt.value = tintAmt;
      meta.celMat.uniforms.uBands.value = bands;
      mesh.material = meta.celMat;
    } else {
      mesh.material = meta.pbrMat;
    }

    if (meta.lineMat && meta.edgeLines) {
      meta.lineMat.color.setHex(inkColor);
      meta.lineMat.linewidth = isDrawing ? meta.baseWidth * weight : 0.8;
      meta.lineMat.opacity = lineOpacity;
      meta.lineMat.transparent = lineOpacity < 1;
      // Room view is a photographic view: no wireframe-like context edges on the plaster and trim.
      meta.edgeLines.visible = lineOpacity > 0;
    }

    if (meta.hullMesh && meta.hullMat) {
      meta.hullMesh.visible = isDrawing;
      meta.hullMat.uniforms.uColor.value.setHex(inkColor);
      meta.hullMat.uniforms.uWidth.value = meta.baseWidth * weight * 1.15;
      meta.hullMat.uniforms.uOpacity.value = emphasis === "context" ? 0.75 : 1.0;
    }
  });
}

// ============================================================================
// Screen-Space Vector SVG Arrow & Dimension Generators (from Nutlope/bygga MIT)
// ============================================================================

export function arrowPath(a: Pt2, b: Pt2, s = 1): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 12) return "";
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const hw = 2.8 * s;
  const headL = Math.min(14 * s, len * 0.45);
  const headW = 7.8 * s;
  const bx = b.x - ux * headL;
  const by = b.y - uy * headL;
  return (
    `M${(a.x + nx * hw).toFixed(1)},${(a.y + ny * hw).toFixed(1)} ` +
    `L${(bx + nx * hw).toFixed(1)},${(by + ny * hw).toFixed(1)} ` +
    `L${(bx + nx * headW).toFixed(1)},${(by + ny * headW).toFixed(1)} ` +
    `L${b.x.toFixed(1)},${b.y.toFixed(1)} ` +
    `L${(bx - nx * headW).toFixed(1)},${(by - ny * headW).toFixed(1)} ` +
    `L${(bx - nx * hw).toFixed(1)},${(by - ny * hw).toFixed(1)} ` +
    `L${(a.x - nx * hw).toFixed(1)},${(a.y - ny * hw).toFixed(1)} Z`
  );
}

export function arcArrow(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const n = 20;
  const hw = 2.4;
  const da = (a1 - a0) / n;
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i <= n - 3; i += 1) {
    const a = a0 + da * i;
    outer.push(`${(cx + Math.cos(a) * (r + hw)).toFixed(1)},${(cy + Math.sin(a) * (r + hw)).toFixed(1)}`);
    inner.unshift(`${(cx + Math.cos(a) * (r - hw)).toFixed(1)},${(cy + Math.sin(a) * (r - hw)).toFixed(1)}`);
  }
  const ah = a1 - da * 3;
  const tipX = cx + Math.cos(a1) * r;
  const tipY = cy + Math.sin(a1) * r;
  const w1x = cx + Math.cos(ah) * (r + 7.5);
  const w1y = cy + Math.sin(ah) * (r + 7.5);
  const w2x = cx + Math.cos(ah) * (r - 7.5);
  const w2y = cy + Math.sin(ah) * (r - 7.5);
  return `M${outer.join(" L")} L${w1x.toFixed(1)},${w1y.toFixed(1)} L${tipX.toFixed(1)},${tipY.toFixed(1)} L${w2x.toFixed(1)},${w2y.toFixed(1)} L${inner.join(" L")} Z`;
}

export function dimensionLineSvg(a: Pt2, b: Pt2, offsetPx: number, label: string): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 36) return "";
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const s = Math.sign(offsetPx) || 1;
  const a0x = a.x + nx * s * 6;
  const a0y = a.y + ny * s * 6;
  const b0x = b.x + nx * s * 6;
  const b0y = b.y + ny * s * 6;
  const a1x = a.x + nx * offsetPx;
  const a1y = a.y + ny * offsetPx;
  const b1x = b.x + nx * offsetPx;
  const b1y = b.y + ny * offsetPx;
  const a2x = a1x + nx * s * 6;
  const a2y = a1y + ny * s * 6;
  const b2x = b1x + nx * s * 6;
  const b2y = b1y + ny * s * 6;
  const mx = (a1x + b1x) * 0.5 + nx * s * 13;
  const my = (a1y + b1y) * 0.5 + ny * s * 13;
  const tk = 5;
  const tw = 2.8;

  return (
    `<path d="M${a0x.toFixed(1)},${a0y.toFixed(1)}L${a2x.toFixed(1)},${a2y.toFixed(1)}M${b0x.toFixed(1)},${b0y.toFixed(1)}L${b2x.toFixed(1)},${b2y.toFixed(1)}" stroke="#8a877f" stroke-width="1" fill="none" />` +
    `<path d="M${a1x.toFixed(1)},${a1y.toFixed(1)}L${b1x.toFixed(1)},${b1y.toFixed(1)}` +
    `M${(a1x + ux * tk + nx * tw).toFixed(1)},${(a1y + uy * tk + ny * tw).toFixed(1)}L${a1x.toFixed(1)},${a1y.toFixed(1)}L${(a1x + ux * tk - nx * tw).toFixed(1)},${(a1y + uy * tk - ny * tw).toFixed(1)}` +
    `M${(b1x - ux * tk + nx * tw).toFixed(1)},${(b1y - uy * tk + ny * tw).toFixed(1)}L${b1x.toFixed(1)},${b1y.toFixed(1)}L${(b1x - ux * tk - nx * tw).toFixed(1)},${(b1y - uy * tk - ny * tw).toFixed(1)}" stroke="#141414" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" fill="none" />` +
    `<rect x="${(mx - label.length * 3.6 - 6).toFixed(1)}" y="${(my - 9).toFixed(1)}" width="${(label.length * 7.2 + 12).toFixed(1)}" height="18" rx="9" fill="#ffffff" stroke="#141414" stroke-width="1" />` +
    `<text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="11.5" font-weight="700" fill="#141414" text-anchor="middle">${label}</text>`
  );
}
