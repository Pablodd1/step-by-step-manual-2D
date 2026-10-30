import { guideSliceAtTime, type Guide } from "@contracts/guide";

/**
 * High-precision 2D Orthographic Architectural Blueprint & Cross-Section Renderer.
 * Renders both live interactive 2D schematics and deterministic 1080p30 / print frames.
 */
export function renderBlueprint2DFrame(
  canvas: HTMLCanvasElement,
  guide: Guide,
  seconds: number,
  width: number,
  height: number
): void {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const slice = guideSliceAtTime(guide, seconds);
  const { step, stepIndex, stepProgress } = slice;
  const visual = step.visual;
  const profile = guide.product;

  // 1. Architectural Blueprint Background & CAD Grid
  ctx.fillStyle = "#111915";
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width / 1280, height / 720);
  const minorGrid = Math.max(16, Math.round(24 * scale));
  const majorGrid = minorGrid * 4;

  ctx.strokeStyle = "rgba(210, 253, 120, 0.045)";
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

  ctx.strokeStyle = "rgba(210, 253, 120, 0.11)";
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
  const pad = Math.round(22 * scale);
  ctx.strokeStyle = "rgba(249, 241, 228, 0.32)";
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

  // Header Technical Banner inside Blueprint
  ctx.fillStyle = "rgba(21, 28, 24, 0.92)";
  ctx.fillRect(pad + 1, pad + 1, width - pad * 2 - 2, Math.round(48 * scale));
  ctx.strokeStyle = "rgba(249, 241, 228, 0.2)";
  ctx.beginPath();
  ctx.moveTo(pad, pad + Math.round(48 * scale));
  ctx.lineTo(width - pad, pad + Math.round(48 * scale));
  ctx.stroke();

  ctx.fillStyle = "#d2fd78";
  ctx.font = `700 ${Math.round(11 * scale)}px "IBM Plex Mono", monospace`;
  const sheetCode = profile
    ? `2D CAD ELEVATION & SECTION // UNITEC SKU ${profile.sku} (${profile.widthCm}×${profile.heightCm} CM · ${profile.thicknessMm} MM)`
    : `2D ORTHOGRAPHIC ELEVATION // ${guide.method.toUpperCase()} (${guide.pattern.rollWidthCm} CM ROLL · ${guide.pattern.repeatCm} CM REPEAT)`;
  ctx.fillText(sheetCode, pad + Math.round(16 * scale), pad + Math.round(29 * scale));

  ctx.fillStyle = "#a5b0a7";
  ctx.textAlign = "right";
  ctx.fillText(
    `SCALE 1:25 · STEP ${String(stepIndex + 1).padStart(2, "0")}/${String(guide.steps.length).padStart(2, "0")} · ${(stepProgress * 100).toFixed(0)}%`,
    width - pad - Math.round(16 * scale),
    pad + Math.round(29 * scale)
  );
  ctx.textAlign = "left";

  // Layout Split: Left 64% = Front Orthographic Wall Elevation, Right 36% = Cross-Section & Tool Schematic
  const contentTop = pad + Math.round(64 * scale);
  const contentBottom = height - pad - Math.round(64 * scale);
  const contentHeight = contentBottom - contentTop;

  const elevLeft = pad + Math.round(48 * scale);
  const elevWidth = Math.round((width - pad * 2) * 0.56);
  const elevHeight = Math.min(contentHeight - Math.round(40 * scale), Math.round(elevWidth * 0.62));
  const elevTop = contentTop + Math.round((contentHeight - elevHeight) * 0.48);

  // 2. Draw Orthographic Wall Elevation Box
  ctx.fillStyle = "rgba(249, 241, 228, 0.04)";
  ctx.fillRect(elevLeft, elevTop, elevWidth, elevHeight);
  ctx.strokeStyle = "#f9f1e4";
  ctx.lineWidth = 2 * scale;
  ctx.strokeRect(elevLeft, elevTop, elevWidth, elevHeight);

  // Ceiling & Baseboard datum lines
  ctx.fillStyle = "rgba(249, 241, 228, 0.12)";
  const baseboardH = Math.round(elevHeight * 0.055);
  ctx.fillRect(elevLeft, elevTop + elevHeight - baseboardH, elevWidth, baseboardH);
  ctx.strokeStyle = "rgba(249, 241, 228, 0.4)";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(elevLeft, elevTop + elevHeight - baseboardH);
  ctx.lineTo(elevLeft + elevWidth, elevTop + elevHeight - baseboardH);
  ctx.stroke();

  // Dimension Lines: Wall Width (Top) & Wall Height (Left)
  const wallWidthLabel = profile
    ? profile.geometry === "fluted"
      ? "128 CM DEMO BAY (8 × 16 CM MODULES)"
      : profile.geometry === "flat"
      ? "366 CM WALL SPAN (3 × 122 CM SHEETS)"
      : "120 CM HEADBOARD ARRAY (6 × 20 CM MODULES)"
    : `420 CM WALL WIDTH (${guide.pattern.rollWidthCm} CM DROPS)`;
  const wallHeightLabel = profile ? `${profile.heightCm} CM` : "255 CM HEIGHT";

  drawDimensionLine(
    ctx,
    elevLeft,
    elevTop - Math.round(18 * scale),
    elevLeft + elevWidth,
    elevTop - Math.round(18 * scale),
    wallWidthLabel,
    scale,
    false
  );
  drawDimensionLine(
    ctx,
    elevLeft - Math.round(22 * scale),
    elevTop,
    elevLeft - Math.round(22 * scale),
    elevTop + elevHeight - baseboardH,
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
  const startMargin = Math.round(elevWidth * 0.08);
  const usableWidth = elevWidth - startMargin * 2;
  const slotWidth = usableWidth / totalSlots;
  const workHeight = elevHeight - baseboardH;

  if (visual.paste) {
    const targetSlot = Math.min(totalSlots - 1, visual.activeStrip);
    const pasteX = elevLeft + startMargin + targetSlot * slotWidth - Math.round(4 * scale);
    const pasteW = slotWidth + Math.round(12 * scale);
    ctx.save();
    ctx.fillStyle = "rgba(210, 253, 120, 0.14)";
    ctx.fillRect(pasteX, elevTop + 4, pasteW, workHeight - 8);
    ctx.strokeStyle = "#d2fd78";
    ctx.setLineDash([5 * scale, 4 * scale]);
    ctx.strokeRect(pasteX, elevTop + 4, pasteW, workHeight - 8);
    ctx.restore();

    // Draw serpentine / bead adhesive pattern for panels or roller hatch for wallpaper
    ctx.save();
    ctx.strokeStyle = "rgba(210, 253, 120, 0.55)";
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    const waveTop = elevTop + Math.round(16 * scale);
    const waveBottom = elevTop + workHeight - Math.round(16 * scale);
    const stepsY = 14;
    for (let i = 0; i <= stepsY; i++) {
      const y = waveTop + ((waveBottom - waveTop) * i) / stepsY;
      const x = pasteX + pasteW * 0.5 + (i % 2 === 0 ? -pasteW * 0.26 : pasteW * 0.26);
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
        ? Math.round((1 - stepProgress) * -18 * scale)
        : 0;
    const drawX = x - slideOffset;
    const panelH =
      profile?.geometry === "upholstered" ? Math.round(workHeight * 0.56) : workHeight;
    const drawY =
      profile?.geometry === "upholstered"
        ? elevTop + workHeight - panelH - Math.round(workHeight * 0.14)
        : elevTop;

    ctx.save();
    ctx.fillStyle = isCurrent ? "rgba(210, 253, 120, 0.22)" : "rgba(249, 241, 228, 0.14)";
    ctx.strokeStyle = isCurrent ? "#d2fd78" : "#f9f1e4";
    ctx.lineWidth = (isCurrent ? 2.2 : 1.3) * scale;

    if (profile?.geometry === "upholstered") {
      // Arch-topped DuoSmall Vainilla module in 2D elevation
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
      // Draw concealed clips (ref 14122902) on right tongue edge
      for (let c = 0; c < 4; c++) {
        const cy = drawY + panelH * (0.16 + c * 0.22);
        ctx.fillStyle = "#d2fd78";
        ctx.fillRect(drawX + slotWidth - 3 * scale, cy - 4 * scale, 6 * scale, 8 * scale);
      }
    } else if (profile?.geometry === "flat") {
      // Diagonal architectural marble vein vectors
      ctx.strokeStyle = isCurrent ? "rgba(210, 253, 120, 0.65)" : "rgba(249, 241, 228, 0.35)";
      ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      ctx.moveTo(drawX + slotWidth * 0.15, drawY + panelH * 0.12);
      ctx.lineTo(drawX + slotWidth * 0.85, drawY + panelH * 0.64);
      ctx.moveTo(drawX + slotWidth * 0.72, drawY + panelH * 0.18);
      ctx.lineTo(drawX + slotWidth * 0.2, drawY + panelH * 0.86);
      ctx.stroke();
    } else if (!profile) {
      // Wallpaper horizontal repeat match ticks every 25% height
      ctx.strokeStyle = isCurrent ? "rgba(210, 253, 120, 0.5)" : "rgba(249, 241, 228, 0.24)";
      ctx.lineWidth = 1 * scale;
      for (let m = 1; m <= 3; m++) {
        const my = drawY + (panelH * m) / 4;
        ctx.beginPath();
        ctx.moveTo(drawX, my);
        ctx.lineTo(drawX + slotWidth, my);
        ctx.stroke();
        if (visual.patternMatch && i > 0) {
          // Pattern alignment diamond across seam
          ctx.fillStyle = "#d2fd78";
          ctx.beginPath();
          ctx.arc(drawX, my, 3.5 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Label index at top of each drop/panel
    ctx.fillStyle = isCurrent ? "#d2fd78" : "#f9f1e4";
    ctx.font = `700 ${Math.round(10 * scale)}px "IBM Plex Mono", monospace`;
    ctx.fillText(String(i + 1).padStart(2, "0"), drawX + Math.round(5 * scale), drawY + Math.round(15 * scale));
    ctx.restore();
  }

  // 5. Laser Plumb Line (True Vertical Reference)
  if (visual.plumb) {
    const plumbX = elevLeft + startMargin + slotWidth;
    ctx.save();
    ctx.strokeStyle = "#d2fd78";
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([7 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(plumbX, elevTop - Math.round(8 * scale));
    ctx.lineTo(plumbX, elevTop + workHeight + Math.round(8 * scale));
    ctx.stroke();

    ctx.fillStyle = "#d2fd78";
    ctx.font = `700 ${Math.round(10 * scale)}px "IBM Plex Mono", monospace`;
    ctx.fillText("TRUE PLUMB 0.0°", plumbX + Math.round(6 * scale), elevTop + Math.round(28 * scale));
    ctx.restore();
  }

  // 6. Electrical Outlet / Obstacle Callout on Wall
  const outletX = elevLeft + startMargin + Math.min(2.35, totalSlots * 0.55) * slotWidth;
  const outletY = elevTop + workHeight * 0.68;
  const outletW = Math.round(28 * scale);
  const outletH = Math.round(36 * scale);
  ctx.save();
  ctx.fillStyle = visual.outletSafe ? "rgba(210, 253, 120, 0.22)" : "rgba(240, 178, 152, 0.2)";
  ctx.strokeStyle = visual.outletSafe ? "#d2fd78" : "#f0b298";
  ctx.lineWidth = 1.6 * scale;
  ctx.fillRect(outletX, outletY, outletW, outletH);
  ctx.strokeRect(outletX, outletY, outletW, outletH);
  ctx.fillStyle = visual.outletSafe ? "#d2fd78" : "#f0b298";
  ctx.font = `600 ${Math.round(9 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    visual.outletSafe ? "BREAKER OFF [ISOLATED]" : "OBSTACLE / BOX",
    outletX - Math.round(12 * scale),
    outletY + outletH + Math.round(13 * scale)
  );
  ctx.restore();

  // 7. Right Column: 2D Cross-Section Detail & Active Tool Vector Box
  const secLeft = elevLeft + elevWidth + Math.round(34 * scale);
  const secWidth = width - pad - secLeft - Math.round(18 * scale);
  const secTop = elevTop;
  const secHeight = Math.round(elevHeight * 0.54);

  ctx.fillStyle = "rgba(21, 28, 24, 0.88)";
  ctx.strokeStyle = "rgba(249, 241, 228, 0.35)";
  ctx.lineWidth = 1.5 * scale;
  ctx.fillRect(secLeft, secTop, secWidth, secHeight);
  ctx.strokeRect(secLeft, secTop, secWidth, secHeight);

  ctx.fillStyle = "#d2fd78";
  ctx.font = `700 ${Math.round(10 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    "SECTION A-A // SUBSTRATE & JOINT DETAIL (SCALE 1:2)",
    secLeft + Math.round(14 * scale),
    secTop + Math.round(22 * scale)
  );

  // Draw Cross-Section Profile based on material type
  const cx = secLeft + Math.round(28 * scale);
  const cy = secTop + Math.round(48 * scale);
  const cw = secWidth - Math.round(56 * scale);
  const ch = secHeight - Math.round(68 * scale);

  // Substrate layer (top horizontal bar in plan section)
  ctx.fillStyle = "rgba(249, 241, 228, 0.14)";
  ctx.strokeStyle = "#f9f1e4";
  ctx.fillRect(cx, cy, cw, Math.round(22 * scale));
  ctx.strokeRect(cx, cy, cw, Math.round(22 * scale));
  ctx.fillStyle = "#c9d1c8";
  ctx.font = `600 ${Math.round(9 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText("SOUND, DRY SUBSTRATE (≤2 MM / 2 M TOLERANCE)", cx + Math.round(8 * scale), cy + Math.round(14 * scale));

  // Adhesive / clip bond zone
  const bondY = cy + Math.round(24 * scale);
  ctx.fillStyle = "rgba(210, 253, 120, 0.25)";
  ctx.fillRect(cx + Math.round(12 * scale), bondY, cw - Math.round(24 * scale), Math.round(12 * scale));

  // Profile cross-section below bond zone
  const profY = bondY + Math.round(14 * scale);
  const profH = Math.max(Math.round(34 * scale), ch - Math.round(54 * scale));
  ctx.strokeStyle = "#d2fd78";
  ctx.fillStyle = "rgba(210, 253, 120, 0.14)";
  ctx.lineWidth = 2 * scale;

  if (profile?.geometry === "fluted") {
    // Draw 4 raised WPC ribs + recessed channels + tongue/groove clip 14122902
    const ribCount = 4;
    const moduleW = cw * 0.78;
    const ribStep = moduleW / ribCount;
    for (let r = 0; r < ribCount; r++) {
      const rx = cx + r * ribStep;
      // Recessed base
      ctx.fillRect(rx, profY, ribStep, Math.round(profH * 0.28));
      ctx.strokeRect(rx, profY, ribStep, Math.round(profH * 0.28));
      // Raised hollow core rib (25 mm total depth)
      const rw = ribStep * 0.58;
      ctx.fillRect(rx + ribStep * 0.16, profY + Math.round(profH * 0.28), rw, Math.round(profH * 0.65));
      ctx.strokeRect(rx + ribStep * 0.16, profY + Math.round(profH * 0.28), rw, Math.round(profH * 0.65));
    }
    // Concealed Clip ref 14122902 callout on tongue
    ctx.fillStyle = "#d2fd78";
    ctx.fillRect(cx + moduleW, profY, cw * 0.16, Math.round(profH * 0.22));
    ctx.fillText(
      "CLIP REF. 14122902 + 25 MM WPC PROFILE",
      cx,
      profY + profH + Math.round(13 * scale)
    );
  } else if (profile?.geometry === "flat") {
    // 3 mm UV PVC sheet + clearcoat layer + 1.5 mm expansion/butt joint
    const sheetH = Math.round(profH * 0.36);
    ctx.fillRect(cx, profY, cw * 0.47, sheetH);
    ctx.strokeRect(cx, profY, cw * 0.47, sheetH);
    ctx.fillRect(cx + cw * 0.51, profY, cw * 0.47, sheetH);
    ctx.strokeRect(cx + cw * 0.51, profY, cw * 0.47, sheetH);
    ctx.fillStyle = "#d2fd78";
    ctx.fillText(
      "3.0 MM PVC CORE + UV HIGH-GLOSS CLEARCOAT",
      cx,
      profY + sheetH + Math.round(22 * scale)
    );
  } else if (profile?.geometry === "upholstered") {
    // Rigid backing board + 25 mm acoustic/foam cushion dome + textile wrap
    const modW = cw * 0.46;
    for (let m = 0; m < 2; m++) {
      const mx = cx + m * (modW + cw * 0.04);
      ctx.fillRect(mx, profY, modW, Math.round(profH * 0.22));
      ctx.beginPath();
      ctx.moveTo(mx, profY + Math.round(profH * 0.22));
      ctx.quadraticCurveTo(
        mx + modW / 2,
        profY + profH * 1.15,
        mx + modW,
        profY + Math.round(profH * 0.22)
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#d2fd78";
    ctx.fillText(
      "25 MM CUSHIONED TEXTILE WRAP · ZERO ADHESIVE AT SEAM",
      cx,
      profY + profH + Math.round(13 * scale)
    );
  } else {
    // Wallpaper butt-seam cross section
    const sheetH = Math.round(profH * 0.32);
    ctx.fillRect(cx, profY, cw * 0.48, sheetH);
    ctx.strokeRect(cx, profY, cw * 0.48, sheetH);
    ctx.fillRect(cx + cw * 0.495, profY, cw * 0.48, sheetH);
    ctx.strokeRect(cx + cw * 0.495, profY, cw * 0.48, sheetH);
    ctx.fillStyle = "#d2fd78";
    ctx.fillText(
      guide.method === "paste-the-wall"
        ? "NON-WOVEN DRY DROP + EVEN ADHESIVE BAND + FLUSH BUTT SEAM"
        : "PEEL-AND-STICK LINER RELEASE + SQUEEGEE SMOOTHED JOIN",
      cx,
      profY + sheetH + Math.round(22 * scale)
    );
  }

  // 8. Lower Right Box: Step Specification & Active Tool Telemetry
  const specTop = secTop + secHeight + Math.round(16 * scale);
  const specHeight = elevTop + elevHeight - specTop;
  ctx.fillStyle = "rgba(21, 28, 24, 0.88)";
  ctx.strokeStyle = "rgba(249, 241, 228, 0.35)";
  ctx.fillRect(secLeft, specTop, secWidth, specHeight);
  ctx.strokeRect(secLeft, specTop, secWidth, specHeight);

  ctx.fillStyle = "#d2fd78";
  ctx.font = `700 ${Math.round(10 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    `STEP ${String(stepIndex + 1).padStart(2, "0")} TELEMETRY // ACTION: ${visual.action.toUpperCase()} · TOOL: ${visual.tool.toUpperCase()}`,
    secLeft + Math.round(14 * scale),
    specTop + Math.round(22 * scale)
  );

  ctx.fillStyle = "#f9f1e4";
  ctx.font = `700 ${Math.round(15 * scale)}px "Space Grotesk", sans-serif`;
  ctx.fillText(step.title, secLeft + Math.round(14 * scale), specTop + Math.round(46 * scale));

  ctx.fillStyle = "#b8c2b9";
  ctx.font = `500 ${Math.round(11.5 * scale)}px "Space Grotesk", sans-serif`;
  wrapCanvasText(
    ctx,
    step.printCaption || step.instruction,
    secLeft + Math.round(14 * scale),
    specTop + Math.round(68 * scale),
    secWidth - Math.round(28 * scale),
    Math.round(16 * scale),
    3
  );

  // Callout Pill at Bottom of Blueprint
  ctx.fillStyle = "#d2fd78";
  ctx.fillRect(pad + Math.round(16 * scale), height - pad - Math.round(44 * scale), Math.round(88 * scale), Math.round(28 * scale));
  ctx.fillStyle = "#151a17";
  ctx.font = `700 ${Math.round(11 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(`STEP ${String(stepIndex + 1).padStart(2, "0")}`, pad + Math.round(28 * scale), height - pad - Math.round(26 * scale));

  ctx.fillStyle = "#f9f1e4";
  ctx.font = `600 ${Math.round(12 * scale)}px "IBM Plex Mono", monospace`;
  ctx.fillText(
    `${visual.callout.toUpperCase()}  —  ${step.tools.slice(0, 3).join(" · ") || "FIELD INSPECTION"}`,
    pad + Math.round(118 * scale),
    height - pad - Math.round(26 * scale)
  );
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
  ctx.strokeStyle = "rgba(210, 253, 120, 0.7)";
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

  ctx.font = `600 ${Math.round(9.5 * scale)}px "IBM Plex Mono", monospace`;
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
        ctx.fillText(remaining.slice(0, 64) + (remaining.length > 64 ? "…" : ""), x, y + lineCount * lineHeight);
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
