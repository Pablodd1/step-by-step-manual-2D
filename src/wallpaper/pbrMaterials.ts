import * as THREE from "three";

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/**
 * Converts a 2D scalar heightfield (0..1 floats, width x height) into a tangent-space normal map CanvasTexture.
 */
export function heightFieldToNormalMap(
  heights: Float32Array,
  width: number,
  height: number,
  strength = 2.5,
  wrap = true,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  const sample = (x: number, y: number) => {
    const wx = wrap ? ((x % width) + width) % width : Math.max(0, Math.min(width - 1, x));
    const wy = wrap ? ((y % height) + height) % height : Math.max(0, Math.min(height - 1, y));
    return heights[wy * width + wx];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Sobel filter for smooth tangent-space derivatives
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dz = 1.0;
      const invLen = 1.0 / Math.sqrt(dx * dx + dy * dy + dz * dz);

      const nx = -dx * invLen;
      const ny = -dy * invLen;
      const nz = dz * invLen;

      const idx = (y * width + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  if (wrap) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  texture.anisotropy = 8;
  return texture;
}

export interface WallPbrMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * Generates realistic primed gypsum plaster wall maps with subtle trowel texture and baked architectural AO.
 */
export function createWallPbrMaps(): WallPbrMaps {
  const w = 512;
  const h = 512;
  const heights = new Float32Array(w * h);
  const random = seeded(109);

  // Multi-scale plaster grain + subtle trowel sweeps
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const trowel =
        Math.sin(u * Math.PI * 6 + Math.cos(v * Math.PI * 4) * 1.5) * 0.18 +
        Math.cos(v * Math.PI * 8 + Math.sin(u * Math.PI * 5) * 1.2) * 0.14;
      const grain = (random() - 0.5) * 0.42;
      heights[y * w + x] = 0.5 + trowel + grain;
    }
  }

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = w;
  colorCanvas.height = h;
  const cctx = colorCanvas.getContext("2d")!;
  const cimg = cctx.createImageData(w, h);

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rctx = roughCanvas.getContext("2d")!;
  const rimg = rctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    // Baked vertical ambient occlusion near cornice (top) and skirting (bottom)
    const topAo = v < 0.08 ? 0.86 + (v / 0.08) * 0.14 : 1.0;
    const botAo = v > 0.92 ? 0.84 + ((1 - v) / 0.08) * 0.16 : 1.0;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const leftAo = u < 0.06 ? 0.85 + (u / 0.06) * 0.15 : 1.0;
      const ao = topAo * botAo * leftAo;
      const hVal = heights[y * w + x];
      const delta = (hVal - 0.5) * 12;

      const r = Math.min(255, Math.max(0, Math.round((192 + delta) * ao)));
      const g = Math.min(255, Math.max(0, Math.round((189 + delta) * ao)));
      const b = Math.min(255, Math.max(0, Math.round((180 + delta) * ao)));

      const idx = (y * w + x) * 4;
      cimg.data[idx] = r;
      cimg.data[idx + 1] = g;
      cimg.data[idx + 2] = b;
      cimg.data[idx + 3] = 255;

      const rough = Math.min(255, Math.max(180, Math.round(224 + (0.5 - hVal) * 35)));
      rimg.data[idx] = rough;
      rimg.data[idx + 1] = rough;
      rimg.data[idx + 2] = rough;
      rimg.data[idx + 3] = 255;
    }
  }

  cctx.putImageData(cimg, 0, 0);
  rctx.putImageData(rimg, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;

  const normalMap = heightFieldToNormalMap(heights, w, h, 1.35, false);

  return { map, normalMap, roughnessMap };
}

export interface PaperPbrMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * High-DPI embossed non-woven botanical wallpaper texture with woven fiber normal relief and metallic berry accents.
 */
export function createPaperPbrMaps(): PaperPbrMaps {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Warm non-woven linen-cream substrate
  ctx.fillStyle = "#eae6dc";
  ctx.fillRect(0, 0, w, h);

  const random = seeded(41);
  // Subtle non-woven textile cross-fibers
  ctx.strokeStyle = "rgba(120, 114, 100, 0.045)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 900; i++) {
    const x = random() * w;
    const y = random() * h;
    const len = 8 + random() * 18;
    const ang = (random() - 0.5) * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  for (let i = 0; i < 24000; i++) {
    const tone = random() > 0.5 ? 255 : 75;
    ctx.fillStyle = `rgba(${tone},${tone},${tone},${0.016 + random() * 0.022})`;
    ctx.fillRect(random() * w, random() * h, 1, 1);
  }

  // Relief height canvas for normal & roughness generation
  const reliefCanvas = document.createElement("canvas");
  reliefCanvas.width = w;
  reliefCanvas.height = h;
  const rctx = reliefCanvas.getContext("2d")!;
  rctx.fillStyle = "rgb(110,110,110)";
  rctx.fillRect(0, 0, w, h);

  // Botanical repeat pattern (530 mm width x 256 px vertical repeat)
  ctx.lineCap = "round";
  rctx.lineCap = "round";
  for (let row = -1; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const ox = col * 256 + (row % 2 ? 128 : 0);
      const oy = row * 256;

      // Soft botanical shadow under-layer for depth
      ctx.strokeStyle = "rgba(28, 54, 48, 0.22)";
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(ox + 26, oy + 252);
      ctx.bezierCurveTo(ox + 90, oy + 190, ox + 128, oy + 102, ox + 208, oy + 10);
      ctx.stroke();

      // Main botanical stem
      ctx.strokeStyle = "#2b544a";
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(ox + 24, oy + 250);
      ctx.bezierCurveTo(ox + 88, oy + 188, ox + 126, oy + 100, ox + 206, oy + 8);
      ctx.stroke();

      rctx.strokeStyle = "rgb(195,195,195)";
      rctx.lineWidth = 5;
      rctx.beginPath();
      rctx.moveTo(ox + 24, oy + 250);
      rctx.bezierCurveTo(ox + 88, oy + 188, ox + 126, oy + 100, ox + 206, oy + 8);
      rctx.stroke();

      // Layered sage & deep emerald leaves with central midrib veins
      for (let k = 0; k < 5; k++) {
        const x = ox + 66 + k * 27;
        const y = oy + 202 - k * 39;
        const side = k % 2 ? -1 : 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * 0.72 - 0.42);

        // Leaf base
        ctx.fillStyle = k % 2 === 0 ? "#2f5c51" : "#3d6e61";
        ctx.beginPath();
        ctx.ellipse(side * 17, 0, 23, 8.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Leaf highlight edge
        ctx.strokeStyle = "#56887a";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(side * 2, 0);
        ctx.lineTo(side * 33, 0);
        ctx.stroke();
        ctx.restore();

        rctx.save();
        rctx.translate(x, y);
        rctx.rotate(side * 0.72 - 0.42);
        rctx.fillStyle = "rgb(185,185,185)";
        rctx.beginPath();
        rctx.ellipse(side * 17, 0, 23, 8.2, 0, 0, Math.PI * 2);
        rctx.fill();
        rctx.restore();
      }

      // Warm metallic gold berries
      for (let k = 0; k < 3; k++) {
        const bx = ox + 124 + k * 22;
        const by = oy + 122 - k * 31;
        ctx.fillStyle = "#c49e54";
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#e8cf92";
        ctx.beginPath();
        ctx.arc(bx - 1.4, by - 1.4, 2, 0, Math.PI * 2);
        ctx.fill();

        rctx.fillStyle = "rgb(245,245,245)";
        rctx.beginPath();
        rctx.arc(bx, by, 5.2, 0, Math.PI * 2);
        rctx.fill();
      }
    }
  }

  const rData = rctx.getImageData(0, 0, w, h).data;
  const heights = new Float32Array(w * h);
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = w;
  roughCanvas.height = h;
  const roughCtx = roughCanvas.getContext("2d")!;
  const roughImg = roughCtx.createImageData(w, h);

  const fiberRng = seeded(77);
  for (let i = 0; i < w * h; i++) {
    const ink = rData[i * 4] / 255;
    const fiber = (fiberRng() - 0.5) * 0.14;
    heights[i] = Math.min(1, Math.max(0, ink + fiber));
    // Printed ink & metallic berries are smoother (lower roughness) than matte paper substrate
    const roughVal = ink > 0.85 ? 85 : ink > 0.6 ? 155 : 218;
    const p = i * 4;
    roughImg.data[p] = roughVal;
    roughImg.data[p + 1] = roughVal;
    roughImg.data[p + 2] = roughVal;
    roughImg.data[p + 3] = 255;
  }
  roughCtx.putImageData(roughImg, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const normalMap = heightFieldToNormalMap(heights, w, h, 1.85, true);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.anisotropy = 8;

  return { map, normalMap, roughnessMap };
}

export interface FloorPbrMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * Generates European oak plank flooring with bevelled V-grooves, wood pores, and satin finish roughness.
 */
export function createFloorPbrMaps(): FloorPbrMaps {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const heights = new Float32Array(size * size);
  heights.fill(0.75);

  const random = seeded(23);
  const planks = 8;
  const plankH = size / planks;

  for (let row = 0; row < planks; row++) {
    const shade = 0.84 + random() * 0.26;
    const baseR = Math.round(154 * shade);
    const baseG = Math.round(112 * shade);
    const baseB = Math.round(74 * shade);
    ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
    ctx.fillRect(0, row * plankH, size, plankH);

    // Subtle longitudinal wood grain & cathedral rings
    for (let g = 0; g < 95; g++) {
      const dark = random() > 0.35;
      ctx.strokeStyle = dark
        ? `rgba(54,32,14,${0.045 + random() * 0.065})`
        : `rgba(210,168,120,${0.035 + random() * 0.045})`;
      ctx.lineWidth = 1 + random() * 1.8;
      const y = row * plankH + random() * plankH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        size * 0.3,
        y + (random() - 0.5) * 8,
        size * 0.65,
        y + (random() - 0.5) * 8,
        size,
        y + (random() - 0.5) * 4,
      );
      ctx.stroke();
    }

    // Staggered end joint
    const jointX = Math.floor((0.18 + ((row * 0.37) % 0.68)) * size);
    ctx.fillStyle = "rgba(26,15,6,0.68)";
    ctx.fillRect(jointX, row * plankH, 3, plankH);

    // Plank horizontal V-groove seam
    ctx.fillStyle = "rgba(24,14,6,0.65)";
    ctx.fillRect(0, row * plankH, size, 3);
    ctx.fillStyle = "rgba(215,175,130,0.18)";
    ctx.fillRect(0, row * plankH + 3, size, 1.5);

    const yStart = Math.floor(row * plankH);
    const yEnd = Math.floor((row + 1) * plankH);
    for (let y = yStart; y < yEnd; y++) {
      const dySeam = Math.min(y - yStart, yEnd - 1 - y);
      const seamDepth = dySeam < 4 ? dySeam / 4 : 1.0;
      for (let x = 0; x < size; x++) {
        const dxJoint = Math.abs(x - jointX);
        const jointDepth = dxJoint < 3 ? dxJoint / 3 : 1.0;
        const grainWave = Math.sin((y - yStart) * 0.45 + Math.sin(x * 0.02) * 2.5) * 0.06;
        heights[y * size + x] = (0.72 + grainWave) * Math.min(seamDepth, jointDepth);
      }
    }
  }

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext("2d")!;
  const rimg = rctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const hVal = heights[i];
    // Grooves are rougher, polished plank faces have satin sheen
    const r = Math.min(255, Math.max(75, Math.round(115 + (0.75 - hVal) * 160)));
    const p = i * 4;
    rimg.data[p] = r;
    rimg.data[p + 1] = r;
    rimg.data[p + 2] = r;
    rimg.data[p + 3] = 255;
  }
  rctx.putImageData(rimg, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 4);
  map.anisotropy = 8;

  const normalMap = heightFieldToNormalMap(heights, size, size, 2.2, true);
  normalMap.repeat.set(4, 4);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(4, 4);

  return { map, normalMap, roughnessMap };
}

/**
 * Creates a glistening wet-adhesive physical material with roller stipple normal map and feathered edges.
 */
export function createWetPasteMaterial(): THREE.MeshPhysicalMaterial {
  const w = 256;
  const h = 512;
  const heights = new Float32Array(w * h);
  const random = seeded(303);

  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = w;
  alphaCanvas.height = h;
  const actx = alphaCanvas.getContext("2d")!;
  const aimg = actx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    const edgeY = Math.min(1, Math.min(v / 0.04, (1 - v) / 0.04));
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const edgeX = Math.min(1, Math.min(u / 0.08, (1 - u) / 0.08));
      const stipple = Math.sin(u * 65) * Math.cos(v * 140) * 0.22 + (random() - 0.5) * 0.35;
      heights[y * w + x] = 0.5 + stipple * 0.5;

      const alpha = Math.round(edgeX * edgeY * (215 + stipple * 30));
      const idx = (y * w + x) * 4;
      aimg.data[idx] = alpha;
      aimg.data[idx + 1] = alpha;
      aimg.data[idx + 2] = alpha;
      aimg.data[idx + 3] = 255;
    }
  }
  actx.putImageData(aimg, 0, 0);

  const normalMap = heightFieldToNormalMap(heights, w, h, 1.9, true);
  const alphaMap = new THREE.CanvasTexture(alphaCanvas);
  alphaMap.colorSpace = THREE.NoColorSpace;

  return new THREE.MeshPhysicalMaterial({
    color: "#6cd4e4",
    emissive: "#0c4a56",
    emissiveIntensity: 0.18,
    normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    alphaMap,
    transparent: true,
    opacity: 0.42,
    roughness: 0.16,
    metalness: 0.0,
    clearcoat: 0.95,
    clearcoatRoughness: 0.1,
    depthWrite: false,
  });
}

/**
 * Extrudes a carpenter's ogee skirting baseboard molding profile along the wall width.
 */
export function createProfiledSkirting(length: number, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  const h = 0.105;
  const d = 0.022;
  shape.moveTo(0, 0);
  shape.lineTo(d, 0);
  shape.lineTo(d, h * 0.62);
  // Ogee S-curve molding profile at top of skirting
  shape.bezierCurveTo(d, h * 0.76, d * 0.42, h * 0.82, d * 0.42, h * 0.92);
  shape.quadraticCurveTo(d * 0.42, h, 0, h);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: 12,
  });
  // Rotate so length runs along X axis, profile sits on Y (height) and +Z (projection from wall)
  geo.rotateY(Math.PI / 2);
  geo.translate(-length / 2, 0, 0);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Extrudes a classic stepped cove cornice molding along the wall-ceiling junction.
 */
export function createProfiledCornice(length: number, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  const h = 0.075;
  const d = 0.065;
  shape.moveTo(0, 0);
  shape.lineTo(0.012, 0);
  shape.lineTo(0.012, h * 0.18);
  // Concave cove curve
  shape.quadraticCurveTo(0.016, h * 0.78, d * 0.82, h * 0.82);
  shape.lineTo(d, h * 0.82);
  shape.lineTo(d, h);
  shape.lineTo(0, h);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-length / 2, 0, 0);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
