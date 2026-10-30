import { formatCm, type UnitSystem } from "@/lib/units";
import type { UnitecSku } from "@contracts/calculator";

interface CalculatorWallDiagramProps {
  mode: "wallpaper" | "unitec";
  wallWidthCm: number;
  wallHeightCm: number;
  moduleWidthCm: number;
  moduleHeightCm: number;
  openingsAreaSqM?: number;
  sku?: UnitecSku;
  unitSystem: UnitSystem;
}

export function CalculatorWallDiagram({
  mode,
  wallWidthCm,
  wallHeightCm,
  moduleWidthCm,
  moduleHeightCm,
  openingsAreaSqM = 0,
  sku,
  unitSystem,
}: CalculatorWallDiagramProps) {
  const safeW = Math.max(50, Math.min(2000, wallWidthCm));
  const safeH = Math.max(50, Math.min(800, wallHeightCm));
  const safeModW = Math.max(10, moduleWidthCm);

  const totalCols = Math.ceil(safeW / safeModW);
  const displayCols = Math.min(28, totalCols);
  const lastStripWidthCm = safeW - (totalCols - 1) * safeModW;
  const isNarrowSliver = lastStripWidthCm > 0 && lastStripWidthCm < Math.min(10, safeModW * 0.35);

  const svgW = 540;
  const svgH = 250;
  const padX = 48;
  const padY = 30;
  const availW = svgW - padX * 2;
  const availH = svgH - padY * 2 - 18;

  const aspect = safeW / safeH;
  let rectW = availW;
  let rectH = rectW / aspect;
  if (rectH > availH) {
    rectH = availH;
    rectW = rectH * aspect;
  }

  const originX = (svgW - rectW) / 2;
  const originY = padY + (availH - rectH) / 2;
  const colStepPx = rectW / displayCols;

  return (
    <div className="calc-wall-diagram" aria-label="2D wall layout diagram">
      <div className="calc-diagram-header">
        <span className="mono-kicker acid-text">LIVE 2D WALL ELEVATION & CUT-SHEET PREVIEW</span>
        <span>
          {totalCols} {mode === "wallpaper" ? "drops" : "columns"} × {formatCm(safeModW, unitSystem)}
          {lastStripWidthCm < safeModW
            ? ` (final cut: ${formatCm(lastStripWidthCm, unitSystem, 1)})`
            : " (exact fit)"}
        </span>
      </div>

      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="calc-wall-svg">
        {/* Background CAD Grid */}
        <defs>
          <pattern id="calcGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(210, 253, 120, 0.06)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect x="0" y="0" width={svgW} height={svgH} fill="#101713" />
        <rect x="0" y="0" width={svgW} height={svgH} fill="url(#calcGrid)" />

        {/* Wall Elevation Outer Frame */}
        <rect
          x={originX}
          y={originY}
          width={rectW}
          height={rectH}
          fill="rgba(249, 241, 228, 0.05)"
          stroke="#f9f1e4"
          strokeWidth="1.8"
        />

        {/* Vertical Strips / Panels */}
        {Array.from({ length: displayCols }).map((_, idx) => {
          const x = originX + idx * colStepPx;
          const isLast = idx === displayCols - 1;
          const w = isLast
            ? Math.max(3, (lastStripWidthCm / safeModW) * colStepPx)
            : colStepPx;
          const isArch = mode === "unitec" && sku === "14126406";
          const panelH = isArch ? Math.min(rectH, rectH * (moduleHeightCm / safeH)) : rectH;
          const panelY = isArch ? originY + rectH - panelH : originY;

          return (
            <g key={idx}>
              <rect
                x={x}
                y={panelY}
                width={w}
                height={panelH}
                fill={
                  isLast && isNarrowSliver
                    ? "rgba(240, 178, 152, 0.28)"
                    : idx === 0
                    ? "rgba(210, 253, 120, 0.18)"
                    : "rgba(249, 241, 228, 0.07)"
                }
                stroke={isLast && isNarrowSliver ? "#f0b298" : "rgba(210, 253, 120, 0.45)"}
                strokeWidth="1"
              />
              {/* Concealed clips indicator for WPC 14122019 */}
              {mode === "unitec" && sku === "14122019" && !isLast && (
                <>
                  {[0.2, 0.45, 0.7, 0.9].map((ratio) => (
                    <circle
                      key={ratio}
                      cx={x + w}
                      cy={originY + rectH * ratio}
                      r="2.2"
                      fill="#d2fd78"
                    />
                  ))}
                </>
              )}
              {colStepPx >= 18 && (
                <text
                  x={x + w / 2}
                  y={panelY + 13}
                  textAnchor="middle"
                  fill={idx === 0 ? "#d2fd78" : "#aeb8af"}
                  fontSize="8.5"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {String(idx + 1).padStart(2, "0")}
                </text>
              )}
            </g>
          );
        })}

        {/* True Plumb Line on First Drop */}
        <line
          x1={originX + colStepPx}
          y1={originY - 6}
          x2={originX + colStepPx}
          y2={originY + rectH + 6}
          stroke="#d2fd78"
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />

        {/* Proportional Opening Zone if openingsAreaSqM > 0 */}
        {openingsAreaSqM > 0 && (
          <g>
            <rect
              x={originX + rectW * 0.56}
              y={originY + rectH * 0.25}
              width={Math.min(rectW * 0.28, Math.max(28, rectW * 0.18))}
              height={rectH * 0.52}
              fill="rgba(16, 23, 19, 0.86)"
              stroke="#f0b298"
              strokeWidth="1.3"
              strokeDasharray="3 2"
            />
            <text
              x={originX + rectW * 0.56 + Math.min(rectW * 0.28, Math.max(28, rectW * 0.18)) / 2}
              y={originY + rectH * 0.52}
              textAnchor="middle"
              fill="#f0b298"
              fontSize="8"
              fontFamily="IBM Plex Mono, monospace"
            >
              OPENING
            </text>
          </g>
        )}

        {/* Top Width Dimension Label */}
        <text
          x={originX + rectW / 2}
          y={originY - 9}
          textAnchor="middle"
          fill="#d2fd78"
          fontSize="10"
          fontFamily="IBM Plex Mono, monospace"
          fontWeight="700"
        >
          ← {formatCm(safeW, unitSystem)} WALL WIDTH →
        </text>

        {/* Left Height Dimension Label */}
        <text
          x={originX - 10}
          y={originY + rectH / 2}
          textAnchor="middle"
          fill="#d2fd78"
          fontSize="9.5"
          fontFamily="IBM Plex Mono, monospace"
          fontWeight="700"
          transform={`rotate(-90 ${originX - 10} ${originY + rectH / 2})`}
        >
          {formatCm(safeH, unitSystem)}
        </text>
      </svg>

      {isNarrowSliver && (
        <p className="sliver-warning">
          Final strip at right corner is only <strong>{formatCm(lastStripWidthCm, unitSystem, 1)}</strong>{" "}
          wide. Shift your starting plumb line by{" "}
          <strong>{formatCm(safeModW / 2, unitSystem, 0)}</strong> to balance both corners symmetrically.
        </p>
      )}
    </div>
  );
}
