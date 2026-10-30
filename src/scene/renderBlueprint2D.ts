import { guideSliceAtTime, type Guide, type SceneAction } from "@contracts/guide";
import { formatCm, formatMm, type UnitSystem } from "@/lib/units";

export interface BlueprintRenderOptions {
  unitSystem?: UnitSystem;
  activeHotspot?: "plumb" | "joint" | "loupe" | "outlet" | null;
}

/**
 * High-precision 2D Orthographic Architectural Blueprint, Animated Hand/Tool Choreography,
 * Cross-Section A-A, and 3.0x Magnified Detail Loupe Renderer.
 */
export function renderBlueprint2DFrame(
  canvas: HTMLCanvasElement,
  guide: Guide,
  seconds: number,
  width: number,
  height: number,
  options?: BlueprintRenderOptions
): void {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const units: UnitSystem = options?.unitSystem ?? "metric";
  const hotspot = options?.activeHotspot ?? null;

  const slice = guideSliceAtTime(guide, seconds);
  const { step, stepIndex, stepProgress } = slice;
  const visual = step.visual;
  const profile = guide.product;

  // 1. Architectural Blueprint Background & CAD Grid
  ctx.fillStyle = "#101814";
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width / 1280, height / 720);
  const minorGrid = Math.max(14, Math.round(22 * scale));
  const majorGrid = minorGrid * 4;

  ctx.strokeStyle = "rgba(210, 253, 120, 0.04)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += minorGrid) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += minorGrid) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(210, 253, 120, 0.1)";
  ctx.beginPath();
  for (let x = 0; x <= width; x += majorGrid) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += majorGrid) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Outer CAD Title Block Border
  const pad = Math.round(20 * scale);
  ctx.strokeStyle = "rgba(249, 241, 228, 0.34)";
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

  // Header Technical Banner inside Blueprint
  const headerH = Math.round(44 * scale);
  ctx.fillStyle = "rgba(19, 26, 22, 0.94)";
  ctx.fillRect(pad + 1, pad + 1, width - pad * 2 - 2, headerH);
  ctx.strokeStyle = "rgba(249, 241, 228, 0.2)";
  ctx.beginPath();
  ctx.moveTo(pad, pad + headerH);
  ctx.lineTo(width - pad, pad + headerH);
  ctx.stroke();

  ctx.fillStyle = "#d2fd78";
  ctx.font = `700 ${Math.round(10.5 * scale)}px "IBM Plex Mono", monospace`;
  const unitSpec = profile
    ? `${formatCm(profile.widthCm, units)} × ${formatCm(profile.heightCm, units)} · ${formatMm(profile.thicknessMm, units)}`
    : `${formatCm(guide.pattern.rollWidthCm, units)} ROLL · ${formatCm(guide.pattern.repeatCm, units)} REPEAT`;
  const sheetCode = profile
    ? `2D CAD ELEVATION + LOUPE // UNITEC SKU ${profile.sku} (${unitSpec})`
    : `2D ORTHOGRAPHIC ELEVATION + LOUPE // ${guide.method.toUpperCase()} (${unitSpec})`;
  ctx.fillText(sheetCode, pad + Math.round(14 * scale), pad + Math.round(27 * scale));

  ctx.fillStyle = "#a5b0a7";
  ctx.textAlign = "right";
  ctx.fillText(
    `UNITS: ${units.toUpperCase()} · STEP ${String(stepIndex + 1).padStart(2, "0")}/${String(
      guide.steps.length
    ).padStart(2, "0")} · ${(stepProgress * 100).toFixed(0)}%`,
    width - pad - Math.round(14 * scale),
    pad + Math.round(27 * scale)
  );
  ctx.textAlign = "left";

  // Layout Split: Left 57% = Front Orthographic Wall Elevation + Live Animated Tool Choreography
  // Right 43% = Top: Section A-A + 3.0x Magnified Detail Loupe, Bottom: Step Telemetry & Checklist
  const contentTop = pad + headerH + Math.round(16 * scale);
  const contentBottom = height - pad - Math.round(52 * scale);
  const contentHeight = contentBottom - contentTop;

  const elevLeft = pad + Math.round(46 * scale);
  const elevWidth = Math.round((width - pad * 2) * 0.53);
  const elevHeight = Math.min(
    contentHeight - Math.round(34 * scale),
    Math.round(elevWidth * 0.64)
  );
  const elevTop = contentTop + Math.round((contentHeight - elevHeight) * 0.46);

  // 2. Draw Orthographic Wall Elevation Box
  ctx.fillStyle = "rgba(249, 241, 228, 0.038)";
  ctx.fillRect(elevLeft, elevTop, elevWidth, elevHeight);
  ctx.strokeStyle = "#f9f1e4";
  ctx.lineWidth = 2 * scale;
  ctx.strokeRect(elevLeft, elevTop, elevWidth, elevHeight);

  // Ceiling & Baseboard datum lines
  const baseboardH = Math.round(elevHeight * 0.055);
  const workHeight = elevHeight - baseboardH;
  ctx.fillStyle = "rgba(249, 241, 228, 0.12)";
  ctx.fillRect(elevLeft, elevTop + workHeight, elevWidth, baseboardH);
  ctx.strokeStyle = "rgba(249, 241, 228, 0.4)";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(elevLeft, elevTop + workHeight);
  ctx.lineTo(elevLeft + elevWidth, elevTop + workHeight);
  ctx.stroke();

  // Dimension Lines: Wall Width (Top) & Wall Height (Left)
  const wallWidthCm = profile
    ? profile.geometry === "fluted"
      ? 128
      : profile.geometry === "flat"
      ? 366
      : 120
    : 420;
  const wallHeightCm = profile ? profile.heightCm : 255;

  const wallWidthLabel = profile
    ? `${formatCm(wallWidthCm, units)} ARRAY (${
        profile.geometry === "fluted"
          ? "8 × " + formatCm(16, units)
          : profile.geometry === "flat"
          ? "3 × " + formatCm(122, units)
          : "6 × " + formatCm(20, units)
      })`
    : `${formatCm(wallWidthCm, units)} WALL WIDTH (${formatCm(guide.pattern.rollWidthCm, units)} DROPS)`;
  const wallHeightLabel = `${formatCm(wallHeightCm, units)} HEIGHT`;

  drawDimensionLine(
    ctx,
    elevLeft,
    elevTop - Math.round(16 * scale),
    elevLeft + elevWidth,
    elevTop - Math.round(16 * scale),
    wallWidthLabel,
    scale,
    false
  );
  drawDimensionLine(
    ctx,
    elevLeft - Math.round(20 * scale),
    elevTop,
    elevLeft - Math.round(20 * scale),
    elevTop + workHeight,
    wallHeightLabel,
    scale,
    true
  );

  // 3. Draw Substrate Adhesive / Primer Zone when active
  const totalSlots = profile
    ? profile.geometry === "fluted"
      ? 8
      : profile.geometry === "flat"
      ? 3
      : 6
    : 5;
  const startMargin = Math.round(elevWidth * 0.075);
  const usableWidth = elevWidth - startMargin * 2;
  const slotWidth = usableWidth / totalSlots;

  if (visual.paste) {
    const targetSlot = Math.min(totalSlots - 1, visual.activeStrip);
    const pasteX = elevLeft + startMargin + targetSlot * slotWidth - Math.round(4 * scale);
    const pasteW = slotWidth + Math.round(12 * scale);
    const fillRatio = visual.action === "paste" ? Math.max(0.18, stepProgress) : 1;
    const activePasteH = (workHeight - 8) * fillRatio;

    ctx.save();
    ctx.fillStyle = "rgba(210, 253, 120, 0.15)";
    ctx.fillRect(pasteX, elevTop + 4, pasteW, activePasteH);
    ctx.strokeStyle = "#d2fd78";
    ctx.setLineDash([5 * scale, 4 * scale]);
    ctx.strokeRect(pasteX, elevTop + 4, pasteW, workHeight - 8);
    ctx.restore();

    // Serpentine adhesive bead or roller cross-hatch
    ctx.save();
    ctx.strokeStyle = "rgba(210, 253, 120, 0.6)";
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    const waveTop = elevTop + Math.round(14 * scale);
    const waveBottom = elevTop + 4 + activePasteH - Math.round(10 * scale);
    const stepsY = Math.max(3, Math.round(14 * fillRatio));
    for (let i = 0; i <= stepsY; i++) {
      const y = waveTop + ((waveBottom - waveTop) * i) / Math.max(1, stepsY);
      const x = pasteX + pasteW * 0.5 + (i % 2 === 0 ? -pasteW * 0.28 : pasteW * 0.28);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 4. Draw Installed Drops / Panels in 2D Elevation
  const visibleCount = Math.min(totalSlots, visual.strips);
  for (let i = 0; i < visibleCount; i++) {
    const isCurrent = i === visual.activeStrip;
    const x = elevLeft + startMargin + i * slotWidth;
    const slideOffset =
      isCurrent && (visual.action === "place" || visual.action === "match" || visual.action === "peel")
        ? Math.round((1 - stepProgress) * -22 * scale)
        : 0;
    const drawX = x - slideOffset;
    const panelH =
      profile?.geometry === "upholstered" ? Math.round(workHeight * 0.56) : workHeight;
    const drawY =
      profile?.geometry === "upholstered"
        ? elevTop + workHeight - panelH - Math.round(workHeight * 0.14)
        : elevTop;

    ctx.save();
    ctx.fillStyle = isCurrent ? "rgba(210, 253, 120, 0.22)" : "rgba(249, 241, 228, 0.13)";
    ctx.strokeStyle = isCurrent ? "#d2fd78" : "#f9f1e4";
    ctx.lineWidth = (isCurrent ? 2.2 : 1.3) * scale;

    if (profile?.geometry === "upholstered") {
      const radius = slotWidth * 0.48;
      ctx.beginPath();
      ctx.moveTo(drawX, drawY + panelH);
      ctx.lineTo(drawX, drawY + radius);
      ctx.arc(drawX + slotWidth / 2, drawY + radius, radius, Math.PI, 0, false);
      ctx.lineTo(drawX + slotWidth, drawY + panelH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(drawX, drawY, slotWidth, panelH);
      ctx.strokeRect(drawX, drawY, slotWidth, panelH);
    }

    // Internal 2D hatching / rib lines / marble veins / wallpaper repeat marks
    if (profile?.geometry === "fluted") {
      ctx.strokeStyle = isCurrent ? "rgba(210, 253, 120, 0.55)" : "rgba(249, 241, 228, 0.28)";
      ctx.lineWidth = 1 * scale;
      for (let r = 1; r <= 3; r++) {
        const rx = drawX + (slotWidth * r) / 4;
        ctx.beginPath();
        ctx.moveTo(rx, drawY);
        ctx.lineTo(rx, drawY + panelH);
        ctx.stroke();
      }
      // Concealed clips (ref 14122902) on right tongue edge
      for (let c = 0; c < 4; c++) {
        const cy = drawY + panelH * (0.16 + c * 0.22);
        ctx.fillStyle = hotspot === "joint" ? "#ffffff" : "#d2fd78";
        ctx.fillRect(drawX + slotWidth - 3 * scale, cy - 4 * scale, 6 * scale, 8 * scale);
      }
    } else if (profile?.geometry === "flat") {
      ctx.strokeStyle = isCurrent ? "rgba(210, 253, 120, 0.65)" : "rgba(249, 241, 228, 0.35)";
      ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      ctx.moveTo(drawX + slotWidth * 0.15, drawY + panelH * 0.12);
      ctx.lineTo(drawX + slotWidth * 0.85, drawY + panelH * 0.64);
      ctx.moveTo(drawX + slotWidth * 0.72, drawY + panelH * 0.18);
      ctx.lineTo(drawX + slotWidth * 0.2, drawY + panelH * 0.86);
      ctx.stroke();
    } else if (!profile) {
      ctx.strokeStyle = isCurrent ? "rgba(210, 253, 120, 0.5)" : "rgba(249, 241, 228, 0.24)";
      ctx.lineWidth = 1 * scale;
      for (let m = 1; m <= 3; m++) {
        const my = drawY + (panelH * m) / 4;
        ctx.beginPath();
        ctx.moveTo(drawX, my);
        ctx.lineTo(drawX + slotWidth, my);
        ctx.stroke();
        if (visual.patternMatch && i > 0) {
          ctx.fillStyle = "#d2fd78";
          ctx.beginPath();
          ctx.arc(drawX, my, 3.8 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Backing liner peel indicator when visual.backing is true
    if (isCurrent && visual.backing) {
      const peelDepth = Math.round(panelH * (0.18 + stepProgress * 0.55));
      ctx.fillStyle = "rgba(249, 241, 228, 0.24)";
      ctx.strokeStyle = "#f9f1e4";
      ctx.setLineDash([3 * scale, 3 * scale]);
      ctx.fillRect(drawX + 2 * scale, drawY + peelDepth, slotWidth - 4 * scale, Math.round(14 * scale));
      ctx.strokeRect(drawX + 2 * scale, drawY + peelDepth, slotWidth - 4 * scale, Math.round(14 * scale));
      ctx.setLineDash([]);
    }

    ctx.fillStyle = isCurrent ? "#d2fd78" : "#f9f1e4";
    ctx.font = `700 ${Math.round(10 * scale)}px "IBM Plex Mono", monospace`;
    ctx.fillText(String(i + 1).padStart(2, "0"), drawX + Math.round(5 * scale), drawY + Math.round(15 * scale));
    ctx.restore();
  }

  // 5. Laser Plumb Line (True Vertical Reference)
  const plumbX = elevLeft + startMargin + slotWidth;
  if (visual.plumb || hotspot === "plumb") {
    const lineDrawRatio = visual.action === "mark" ? Math.max(0.15, stepProgress) : 1;
    ctx.save();
    ctx.strokeStyle = hotspot === "plumb" ? "#ffffff" : "#d2fd78";
    ctx.lineWidth = (hotspot === "plumb" ? 3 : 2) * scale;
    ctx.setLineDash([7 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(plumbX, elevTop - Math.round(8 * scale));
    ctx.lineTo(
      plumbX,
      elevTop + (workHeight + Math.round(16 * scale)) * lineDrawRatio
    );
    ctx.stroke();

    ctx.fillStyle = "#d2fd78";
    ctx.font = `700 ${Math.round(9.5 * scale)}px "IBM Plex Mono", monospace`;
    ctx.fillText("A: TRUE PLUMB 0.0°", plumbX + Math.round(6 * scale), elevTop + Math.round(28 * scale));
    ctx.restore();
  }

  // 6. Electrical Outlet / Obstacle Callout on Wall
  const outletX = elevLeft + startMargin + Math.min(2.35, totalSlots * 0.55) * slotWidth;
  const outletY = elevTop + workHeight * 0.68;
  const outletW = Math.round(28 * scale);
  const outletH = Math.round(36 * scale);
  ctx.save();
  const highlightOutlet = hotspot === "outlet" || visual.action === "cut" || visual.outletSafe;
  ctx.fillStyle = visual.outletSafe ? "rgba(210, 253, 120, 0.24)" : "rgba(240, 178, 152, 0.2)";
  ctx.strokeStyle = visual.outletSafe ? "#d2fd78" : "#f0b298";
  ctx.lineWidth = (highlightOutlet ? 2.4 : 1.5) * scale;
  ctx.fillRect(outletX, outletY, outletW, outletH);
  ctx.strokeRect(outletX, outletY, outletW, outletH);
  // Draw X relief cut lines when action === "cut"
  if (visual.action === "cut") {
    ctx.strokeStyle = "#d2fd78";
    ctx.beginPath();
    ctx.moveTo(outletX, outletY);
    ctx.lineTo(outletX + outletW, outletY + outletH);
    ctx.moveTo(outletX + outletW, outletY);
    ctx.lineTo(outletX, outletY + outletH);
    ctx.stroke();
  }
  ctx.fillStyle = visual.outletSafe ? "#d2fd78" : "#f0b298";
  ctx.font = `600 ${Math.round(8.5 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    visual.outletSafe ? "D: BREAKER OFF [SAFE]" : "D: OBSTACLE BOX",
    outletX - Math.round(14 * scale),
    outletY + outletH + Math.round(13 * scale)
  );
  ctx.restore();

  // 7. LIVE ANIMATED 2D TOOL & HAND CHOREOGRAPHY OVERLAY ON WALL ELEVATION
  const focalPoint = drawAnimated2DAction(
    ctx,
    visual.action,
    stepProgress,
    elevLeft,
    elevTop,
    elevWidth,
    workHeight,
    startMargin,
    slotWidth,
    visual.activeStrip,
    outletX + outletW / 2,
    outletY + outletH / 2,
    scale,
    units,
    wallWidthCm
  );

  // 8. Right Column Top Left: Section A-A Substrate & Joint Detail
  const rightColLeft = elevLeft + elevWidth + Math.round(28 * scale);
  const rightColWidth = width - pad - rightColLeft - Math.round(14 * scale);
  const topRowHeight = Math.round(elevHeight * 0.56);

  // Split top right into Section A-A (56% width) + 3.0x Magnified Detail Loupe (44% width)
  const secWidth = Math.round(rightColWidth * 0.55);
  const loupeBoxLeft = rightColLeft + secWidth + Math.round(12 * scale);
  const loupeBoxWidth = rightColWidth - secWidth - Math.round(12 * scale);

  ctx.fillStyle = "rgba(18, 25, 21, 0.92)";
  ctx.strokeStyle = hotspot === "joint" ? "#d2fd78" : "rgba(249, 241, 228, 0.35)";
  ctx.lineWidth = (hotspot === "joint" ? 2.2 : 1.4) * scale;
  ctx.fillRect(rightColLeft, elevTop, secWidth, topRowHeight);
  ctx.strokeRect(rightColLeft, elevTop, secWidth, topRowHeight);

  ctx.fillStyle = "#d2fd78";
  ctx.font = `700 ${Math.round(9.5 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    "B: SECTION A-A // JOINT PROFILE (1:2)",
    rightColLeft + Math.round(12 * scale),
    elevTop + Math.round(20 * scale)
  );

  // Draw Cross-Section Profile
  const cx = rightColLeft + Math.round(16 * scale);
  const cy = elevTop + Math.round(38 * scale);
  const cw = secWidth - Math.round(32 * scale);
  const ch = topRowHeight - Math.round(54 * scale);

  ctx.fillStyle = "rgba(249, 241, 228, 0.14)";
  ctx.strokeStyle = "#f9f1e4";
  ctx.lineWidth = 1.2 * scale;
  ctx.fillRect(cx, cy, cw, Math.round(20 * scale));
  ctx.strokeRect(cx, cy, cw, Math.round(20 * scale));
  ctx.fillStyle = "#c9d1c8";
  ctx.font = `600 ${Math.round(8.5 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    `SUBSTRATE (≤${formatMm(2, units)} FLATNESS)`,
    cx + Math.round(6 * scale),
    cy + Math.round(13 * scale)
  );

  const bondY = cy + Math.round(22 * scale);
  ctx.fillStyle = "rgba(210, 253, 120, 0.25)";
  ctx.fillRect(cx + Math.round(8 * scale), bondY, cw - Math.round(16 * scale), Math.round(10 * scale));

  const profY = bondY + Math.round(12 * scale);
  const profH = Math.max(Math.round(30 * scale), ch - Math.round(52 * scale));
  ctx.strokeStyle = "#d2fd78";
  ctx.fillStyle = "rgba(210, 253, 120, 0.15)";
  ctx.lineWidth = 1.8 * scale;

  if (profile?.geometry === "fluted") {
    const ribCount = 4;
    const moduleW = cw * 0.76;
    const ribStep = moduleW / ribCount;
    for (let r = 0; r < ribCount; r++) {
      const rx = cx + r * ribStep;
      ctx.fillRect(rx, profY, ribStep, Math.round(profH * 0.28));
      ctx.strokeRect(rx, profY, ribStep, Math.round(profH * 0.28));
      const rw = ribStep * 0.58;
      ctx.fillRect(
        rx + ribStep * 0.16,
        profY + Math.round(profH * 0.28),
        rw,
        Math.round(profH * 0.64)
      );
      ctx.strokeRect(
        rx + ribStep * 0.16,
        profY + Math.round(profH * 0.28),
        rw,
        Math.round(profH * 0.64)
      );
    }
    ctx.fillStyle = "#d2fd78";
    ctx.fillRect(cx + moduleW, profY, cw * 0.18, Math.round(profH * 0.22));
    ctx.fillText(
      `CLIP 14122902 · ${formatMm(25, units)} WPC`,
      cx,
      profY + profH + Math.round(12 * scale)
    );
  } else if (profile?.geometry === "flat") {
    const sheetH = Math.round(profH * 0.36);
    ctx.fillRect(cx, profY, cw * 0.47, sheetH);
    ctx.strokeRect(cx, profY, cw * 0.47, sheetH);
    ctx.fillRect(cx + cw * 0.51, profY, cw * 0.47, sheetH);
    ctx.strokeRect(cx + cw * 0.51, profY, cw * 0.47, sheetH);
    ctx.fillStyle = "#d2fd78";
    ctx.fillText(
      `${formatMm(3, units)} UV MARBLE + 1.5 MM JOINT`,
      cx,
      profY + sheetH + Math.round(20 * scale)
    );
  } else if (profile?.geometry === "upholstered") {
    const modW = cw * 0.46;
    for (let m = 0; m < 2; m++) {
      const mx = cx + m * (modW + cw * 0.04);
      ctx.fillRect(mx, profY, modW, Math.round(profH * 0.22));
      ctx.beginPath();
      ctx.moveTo(mx, profY + Math.round(profH * 0.22));
      ctx.quadraticCurveTo(
        mx + modW / 2,
        profY + profH * 1.1,
        mx + modW,
        profY + Math.round(profH * 0.22)
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#d2fd78";
    ctx.fillText(
      `${formatMm(25, units)} CUSHION · 20 MM BEAD INSET`,
      cx,
      profY + profH + Math.round(12 * scale)
    );
  } else {
    const sheetH = Math.round(profH * 0.32);
    ctx.fillRect(cx, profY, cw * 0.48, sheetH);
    ctx.strokeRect(cx, profY, cw * 0.48, sheetH);
    ctx.fillRect(cx + cw * 0.495, profY, cw * 0.48, sheetH);
    ctx.strokeRect(cx + cw * 0.495, profY, cw * 0.48, sheetH);
    ctx.fillStyle = "#d2fd78";
    ctx.fillText(
      guide.method === "paste-the-wall"
        ? "DRY NON-WOVEN DROP + FLUSH SEAM"
        : "PEEL LINER + SQUEEGEE JOIN",
      cx,
      profY + sheetH + Math.round(20 * scale)
    );
  }

  // 9. Right Column Top Right: C: 3.0x MAGNIFIED STEP DETAIL LOUPE
  ctx.fillStyle = "rgba(18, 25, 21, 0.94)";
  ctx.strokeStyle = hotspot === "loupe" ? "#d2fd78" : "rgba(210, 253, 120, 0.55)";
  ctx.lineWidth = (hotspot === "loupe" ? 2.4 : 1.5) * scale;
  ctx.fillRect(loupeBoxLeft, elevTop, loupeBoxWidth, topRowHeight);
  ctx.strokeRect(loupeBoxLeft, elevTop, loupeBoxWidth, topRowHeight);

  ctx.fillStyle = "#d2fd78";
  ctx.font = `700 ${Math.round(9.5 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    "C: 3.0× DETAIL LOUPE",
    loupeBoxLeft + Math.round(10 * scale),
    elevTop + Math.round(20 * scale)
  );

  // Circular Loupe Lens
  const loupeCenterX = loupeBoxLeft + loupeBoxWidth / 2;
  const loupeCenterY = elevTop + topRowHeight * 0.56;
  const loupeRadius = Math.min(loupeBoxWidth * 0.38, topRowHeight * 0.34);

  // Dashed CAD leader line from focalPoint on elevation to the 3x Loupe!
  ctx.save();
  ctx.strokeStyle = "rgba(210, 253, 120, 0.42)";
  ctx.lineWidth = 1.2 * scale;
  ctx.setLineDash([4 * scale, 4 * scale]);
  ctx.beginPath();
  ctx.moveTo(focalPoint.x, focalPoint.y);
  ctx.lineTo(loupeCenterX - loupeRadius, loupeCenterY);
  ctx.stroke();
  ctx.fillStyle = "#d2fd78";
  ctx.beginPath();
  ctx.arc(focalPoint.x, focalPoint.y, 4 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawMagnifiedLoupeContent(
    ctx,
    loupeCenterX,
    loupeCenterY,
    loupeRadius,
    visual.action,
    stepProgress,
    profile?.geometry,
    scale
  );

  // 10. Lower Right Box: Step Specification & Active Tool Telemetry
  const specTop = elevTop + topRowHeight + Math.round(14 * scale);
  const specHeight = elevTop + elevHeight - specTop;
  ctx.fillStyle = "rgba(18, 25, 21, 0.92)";
  ctx.strokeStyle = "rgba(249, 241, 228, 0.35)";
  ctx.lineWidth = 1.4 * scale;
  ctx.fillRect(rightColLeft, specTop, rightColWidth, specHeight);
  ctx.strokeRect(rightColLeft, specTop, rightColWidth, specHeight);

  ctx.fillStyle = "#d2fd78";
  ctx.font = `700 ${Math.round(9.5 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    `STEP ${String(stepIndex + 1).padStart(2, "0")} CHOREOGRAPHY // ACTION: ${visual.action.toUpperCase()} · TOOL: ${visual.tool.toUpperCase()}`,
    rightColLeft + Math.round(14 * scale),
    specTop + Math.round(20 * scale)
  );

  ctx.fillStyle = "#f9f1e4";
  ctx.font = `700 ${Math.round(14.5 * scale)}px "Space Grotesk", sans-serif`;
  ctx.fillText(step.title, rightColLeft + Math.round(14 * scale), specTop + Math.round(42 * scale));

  ctx.fillStyle = "#b8c2b9";
  ctx.font = `500 ${Math.round(11 * scale)}px "Space Grotesk", sans-serif`;
  wrapCanvasText(
    ctx,
    step.printCaption || step.instruction,
    rightColLeft + Math.round(14 * scale),
    specTop + Math.round(62 * scale),
    rightColWidth - Math.round(28 * scale),
    Math.round(15 * scale),
    3
  );

  // Callout Pill at Bottom of Blueprint
  ctx.fillStyle = "#d2fd78";
  ctx.fillRect(
    pad + Math.round(14 * scale),
    height - pad - Math.round(38 * scale),
    Math.round(84 * scale),
    Math.round(24 * scale)
  );
  ctx.fillStyle = "#151a17";
  ctx.font = `700 ${Math.round(10.5 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    `STEP ${String(stepIndex + 1).padStart(2, "0")}`,
    pad + Math.round(24 * scale),
    height - pad - Math.round(22 * scale)
  );

  ctx.fillStyle = "#f9f1e4";
  ctx.font = `600 ${Math.round(11.5 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    `${visual.callout.toUpperCase()}  —  ${
      step.tools.slice(0, 3).join(" · ") || "FIELD INSPECTION"
    }`,
    pad + Math.round(110 * scale),
    height - pad - Math.round(22 * scale)
  );
}

/**
 * Draws live animated 2D tool silhouettes & directional hand-motion vectors on the Wall Elevation
 * and returns the (x,y) focal point for the 3.0x Magnified Loupe leader line.
 */
function drawAnimated2DAction(
  ctx: CanvasRenderingContext2D,
  action: SceneAction,
  progress: number,
  elevLeft: number,
  elevTop: number,
  elevWidth: number,
  workHeight: number,
  startMargin: number,
  slotWidth: number,
  activeStrip: number,
  outletCenterX: number,
  outletCenterY: number,
  scale: number,
  units: UnitSystem,
  wallWidthCm: number
): { x: number; y: number } {
  const stripX = elevLeft + startMargin + activeStrip * slotWidth;
  const stripCenterX = stripX + slotWidth * 0.5;
  let focalX = stripCenterX;
  let focalY = elevTop + workHeight * 0.45;

  ctx.save();

  if (action === "measure") {
    // Animated horizontal tape measure extending across wall width
    const measureY = elevTop + workHeight * 0.35;
    const currentEnd = elevLeft + Math.max(0.18, progress) * elevWidth;
    focalX = currentEnd;
    focalY = measureY;

    ctx.strokeStyle = "#f7d154";
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(elevLeft, measureY);
    ctx.lineTo(currentEnd, measureY);
    ctx.stroke();

    // Tape case at currentEnd
    ctx.fillStyle = "#f7d154";
    ctx.fillRect(currentEnd - 8 * scale, measureY - 8 * scale, 16 * scale, 16 * scale);
    ctx.fillStyle = "#151a17";
    ctx.font = `700 ${Math.round(9 * scale)}px "IBM Plex Mono", monospace`;
    ctx.fillText(
      formatCm(Math.round(wallWidthCm * Math.max(0.18, progress)), units),
      Math.max(elevLeft + 10 * scale, currentEnd - 48 * scale),
      measureY - 12 * scale
    );
  } else if (action === "mark") {
    // Spirit level & laser plumb travelling down the first vertical datum
    const plumbX = elevLeft + startMargin + slotWidth;
    const toolY = elevTop + workHeight * (0.12 + progress * 0.72);
    focalX = plumbX;
    focalY = toolY;

    ctx.fillStyle = "#d2fd78";
    ctx.strokeStyle = "#151a17";
    ctx.lineWidth = 1.5 * scale;
    ctx.fillRect(plumbX - 6 * scale, toolY - 22 * scale, 12 * scale, 44 * scale);
    ctx.strokeRect(plumbX - 6 * scale, toolY - 22 * scale, 12 * scale, 44 * scale);
  } else if (action === "paste") {
    // Animated roller / adhesive gun sweeping down active band
    const toolY = elevTop + workHeight * (0.1 + progress * 0.76);
    focalX = stripCenterX;
    focalY = toolY;

    ctx.fillStyle = "#d2fd78";
    ctx.fillRect(stripCenterX - 18 * scale, toolY - 6 * scale, 36 * scale, 12 * scale);
    drawArrow2D(ctx, stripCenterX, toolY - 18 * scale, stripCenterX, toolY + 22 * scale, scale);
  } else if (action === "smooth") {
    // Sweeping smoother moving top-to-bottom with center-outward chevron arrows (<- | ->)
    const smoothY = elevTop + workHeight * (0.14 + progress * 0.72);
    focalX = stripCenterX;
    focalY = smoothY;

    ctx.fillStyle = "#d2fd78";
    ctx.fillRect(stripCenterX - slotWidth * 0.36, smoothY - 5 * scale, slotWidth * 0.72, 10 * scale);
    // Outward air-expulsion arrows
    drawArrow2D(
      ctx,
      stripCenterX - 4 * scale,
      smoothY,
      stripX - 8 * scale,
      smoothY,
      scale
    );
    drawArrow2D(
      ctx,
      stripCenterX + 4 * scale,
      smoothY,
      stripX + slotWidth + 8 * scale,
      smoothY,
      scale
    );
  } else if (action === "trim") {
    // Craft knife + straightedge slicing along top ceiling line first half, bottom baseboard second half
    const isTop = progress < 0.5;
    const localP = isTop ? progress * 2 : (progress - 0.5) * 2;
    const trimY = isTop ? elevTop : elevTop + workHeight;
    const knifeX = stripX + slotWidth * localP;
    focalX = knifeX;
    focalY = trimY;

    ctx.strokeStyle = "#f7d154";
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(stripX, trimY);
    ctx.lineTo(knifeX, trimY);
    ctx.stroke();

    // Knife blade triangle
    ctx.fillStyle = "#d2fd78";
    ctx.beginPath();
    ctx.moveTo(knifeX, trimY);
    ctx.lineTo(knifeX + 10 * scale, trimY - 12 * scale);
    ctx.lineTo(knifeX + 16 * scale, trimY - 6 * scale);
    ctx.closePath();
    ctx.fill();
  } else if (action === "cut") {
    // Relief cut around electrical outlet
    focalX = outletCenterX;
    focalY = outletCenterY;
    ctx.strokeStyle = "#d2fd78";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(outletCenterX, outletCenterY, 22 * scale, 0, Math.PI * 2 * Math.max(0.2, progress));
    ctx.stroke();
  } else if (action === "match" || action === "place" || action === "peel") {
    // Seam / joint lock focus
    focalX = stripX;
    focalY = elevTop + workHeight * 0.45;
    drawArrow2D(
      ctx,
      stripX + slotWidth * 0.65,
      focalY,
      stripX + 4 * scale,
      focalY,
      scale
    );
  } else {
    // inspect / prepare / tools / clean / check: scanning raking light bar across wall
    const scanX = elevLeft + elevWidth * (0.1 + 0.8 * Math.sin(progress * Math.PI));
    focalX = scanX;
    focalY = elevTop + workHeight * 0.5;
    ctx.strokeStyle = "rgba(210, 253, 120, 0.45)";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(scanX, elevTop + 6 * scale);
    ctx.lineTo(scanX, elevTop + workHeight - 6 * scale);
    ctx.stroke();
  }

  ctx.restore();
  return { x: focalX, y: focalY };
}

function drawMagnifiedLoupeContent(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  action: SceneAction,
  progress: number,
  geometry: "fluted" | "flat" | "upholstered" | undefined,
  scale: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // Dark CAD Loupe background + fine micro-grid
  ctx.fillStyle = "#0c130f";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.strokeStyle = "rgba(210, 253, 120, 0.08)";
  ctx.lineWidth = 1;
  const stepG = Math.max(8, Math.round(10 * scale));
  ctx.beginPath();
  for (let x = cx - r; x <= cx + r; x += stepG) {
    ctx.moveTo(x, cy - r);
    ctx.lineTo(x, cy + r);
  }
  for (let y = cy - r; y <= cy + r; y += stepG) {
    ctx.moveTo(cx - r, y);
    ctx.lineTo(cx + r, y);
  }
  ctx.stroke();

  if (geometry === "fluted") {
    // 3x Zoom of WPC Tongue + Concealed Clip 14122902 + Screw + Next Panel Groove engaging
    ctx.fillStyle = "rgba(249, 241, 228, 0.22)";
    ctx.fillRect(cx - r * 0.85, cy - r * 0.1, r * 1.7, r * 0.25);
    // WPC left panel rib + tongue
    ctx.fillStyle = "#a97142";
    ctx.strokeStyle = "#f9f1e4";
    ctx.lineWidth = 1.5 * scale;
    ctx.fillRect(cx - r * 0.75, cy - r * 0.65, r * 0.55, r * 0.55);
    ctx.strokeRect(cx - r * 0.75, cy - r * 0.65, r * 0.55, r * 0.55);
    // Tongue lip
    ctx.fillRect(cx - r * 0.2, cy - r * 0.32, r * 0.32, r * 0.22);
    // Stainless clip 14122902
    ctx.fillStyle = "#d2fd78";
    ctx.fillRect(cx - r * 0.12, cy - r * 0.4, r * 0.36, r * 0.1);
    // Next panel groove sliding in from right with progress
    const slide = (1 - progress) * r * 0.28;
    ctx.fillStyle = "#8c5830";
    ctx.fillRect(cx + r * 0.08 + slide, cy - r * 0.65, r * 0.6, r * 0.55);
    ctx.strokeRect(cx + r * 0.08 + slide, cy - r * 0.65, r * 0.6, r * 0.55);

    ctx.fillStyle = "#d2fd78";
    ctx.font = `700 ${Math.round(8.5 * scale)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = "center";
    ctx.fillText("CLIP 14122902 ENGAGED", cx, cy + r * 0.55);
  } else if (action === "trim" || action === "cut") {
    // 3x Zoom of Straightedge + 30-deg Snap Blade slicing cleanly along boundary crease
    ctx.strokeStyle = "#f9f1e4";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.8, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.8, cy + r * 0.1);
    ctx.stroke();

    const kx = cx - r * 0.45 + progress * r * 0.9;
    ctx.strokeStyle = "#d2fd78";
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(kx, cy + r * 0.1);
    ctx.lineTo(kx + r * 0.35, cy - r * 0.45);
    ctx.stroke();

    ctx.fillStyle = "#d2fd78";
    ctx.font = `700 ${Math.round(8.5 * scale)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = "center";
    ctx.fillText("30° BLADE + STRAIGHTEDGE", cx, cy + r * 0.55);
  } else {
    // 3x Zoom of Seam Alignment & Center-Outward Smoother Pressure
    ctx.strokeStyle = "#f9f1e4";
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.75);
    ctx.lineTo(cx, cy + r * 0.35);
    ctx.stroke();

    const offset = (1 - progress) * r * 0.22;
    ctx.strokeStyle = "#d2fd78";
    ctx.lineWidth = 2 * scale;
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.arc(cx + (i > 0 ? offset : 0), cy - r * 0.2, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#d2fd78";
    ctx.font = `700 ${Math.round(8.5 * scale)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      progress > 0.8 ? "SEAM LOCKED ±0.5 MM" : "ALIGNING SEAM...",
      cx,
      cy + r * 0.58
    );
  }

  ctx.restore();

  // Outer Loupe Ring + Crosshair Ticks
  ctx.save();
  ctx.strokeStyle = "#d2fd78";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawArrow2D(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  scale: number
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 6 * scale;
  ctx.save();
  ctx.strokeStyle = "#d2fd78";
  ctx.fillStyle = "#d2fd78";
  ctx.lineWidth = 1.8 * scale;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDimensionLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  scale: number,
  vertical: boolean
) {
  ctx.save();
  ctx.strokeStyle = "rgba(210, 253, 120, 0.72)";
  ctx.fillStyle = "#d2fd78";
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const tick = 5 * scale;
  ctx.beginPath();
  if (vertical) {
    ctx.moveTo(x1 - tick, y1);
    ctx.lineTo(x1 + tick, y1);
    ctx.moveTo(x2 - tick, y2);
    ctx.lineTo(x2 + tick, y2);
  } else {
    ctx.moveTo(x1, y1 - tick);
    ctx.lineTo(x1, y1 + tick);
    ctx.moveTo(x2, y2 - tick);
    ctx.lineTo(x2, y2 + tick);
  }
  ctx.stroke();

  ctx.font = `600 ${Math.round(9.2 * scale)}px "IBM Plex Mono", monospace`;
  ctx.textAlign = "center";
  if (vertical) {
    ctx.translate((x1 + x2) / 2 - Math.round(10 * scale), (y1 + y2) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label, 0, 0);
  } else {
    ctx.fillText(label, (x1 + x2) / 2, y1 - Math.round(6 * scale));
  }
  ctx.restore();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/);
  let line = "";
  let lineCount = 0;
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = words[i];
      lineCount += 1;
      if (lineCount >= maxLines - 1) {
        const remaining = words.slice(i).join(" ");
        ctx.fillText(
          remaining.slice(0, 64) + (remaining.length > 64 ? "…" : ""),
          x,
          y + lineCount * lineHeight
        );
        return;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
}
