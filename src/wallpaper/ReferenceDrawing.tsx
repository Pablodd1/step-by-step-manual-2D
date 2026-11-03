import type { WallpaperStep } from "./guide";
import {
  CORNICE_BOTTOM,
  DROP_W,
  FIRST_X,
  OUTLET,
  PLUMB_X,
  SKIRTING_TOP,
  WALL_H,
  WALL_LEFT,
  WALL_W,
} from "./geometry";

/**
 * Front-elevation manual figure, drawn from the SAME wall geometry as the 3D scene (src/wallpaper/geometry.ts)
 * at one uniform scale. The previous figure used independent hand-placed coordinates (non-uniform 82 × 69 px/m),
 * which put the plumb line at 0.93 m and the outlet at 1.14–1.58 m from the corner while the 3D build had them at
 * 0.50 m and 0.85 m. A live work-point marker (`workPoint`, wall metres) mirrors the 3D tool contact point.
 */
const K = 72; // px per metre, both axes
const X0 = 66; // svg x of the left corner
const FLOOR = 222; // svg y of the floor line
const sx = (x: number) => X0 + (x - WALL_LEFT) * K;
const sy = (y: number) => FLOOR - y * K;
const WALL_R = sx(WALL_LEFT + WALL_W);
const TOP = sy(WALL_H);

function Drop({ index, trimmed, id }: { index: number; trimmed: boolean; id: string }) {
  const left = Math.max(X0, sx(FIRST_X - DROP_W / 2 + index * DROP_W));
  const right = sx(FIRST_X + DROP_W / 2 + index * DROP_W);
  const top = trimmed ? sy(CORNICE_BOTTOM) : sy(2.67);
  const bottom = trimmed ? sy(SKIRTING_TOP) : sy(0.03);
  return <rect x={left} y={top} width={right - left} height={bottom - top} fill={`url(#${id})`} stroke="#26343a" strokeWidth="0.8" />;
}

function Lane({ index }: { index: number }) {
  const left = Math.max(X0, sx(FIRST_X - DROP_W / 2 - 0.0175 + index * DROP_W));
  const right = sx(FIRST_X + DROP_W / 2 + 0.0175 + index * DROP_W);
  return <rect x={left} y={sy(2.67)} width={right - left} height={sy(0.03) - sy(2.67)} fill="#75c9d5" opacity="0.48" stroke="#087d8c" strokeDasharray="4 3" />;
}

export function ReferenceDrawing({
  step,
  number,
  workPoint,
}: {
  step: WallpaperStep;
  number: number;
  /** Current 3D work point in wall metres; drawn as a live marker so the figure tracks the build. */
  workPoint?: { x: number; y: number } | null;
}) {
  const op = step.operation;
  const order = ["verify", "safety", "prepare", "layout", "plumb", "measure", "paste", "hang", "smooth", "trim", "match", "outlet", "clean", "inspect"];
  const at = order.indexOf(op);
  const after = (o: string) => at > order.indexOf(o);
  const patternId = `paper-pattern-${number}`;
  const d0 = op === "hang" || op === "smooth" || op === "trim" || after("hang");
  const d1 = op === "match" || after("match");
  const outlet = { x: sx(OUTLET.x), y: sy(OUTLET.y), w: OUTLET.w * K, h: OUTLET.h * K };
  const plumb = sx(PLUMB_X);
  const mid = (sx(FIRST_X) + sx(FIRST_X + DROP_W)) / 2;
  const wp = workPoint && Number.isFinite(workPoint.x) && Number.isFinite(workPoint.y) ? { x: sx(workPoint.x), y: sy(workPoint.y) } : null;
  const showWp = wp && wp.x > X0 - 6 && wp.x < WALL_R + 6 && wp.y > TOP - 6 && wp.y < FLOOR + 6 && op !== "verify";

  return (
    <svg className="reference-svg" viewBox="0 0 360 250" role="img" aria-label={`Manual figure for step ${number}: ${step.title}`}>
      <defs>
        <pattern id={patternId} width="12" height="18" patternUnits="userSpaceOnUse">
          <rect width="12" height="18" fill="#e6e3da" />
          <path d="M1 17 Q5 11 10 1 M4 12 l-3 -2 M6 8 l4 -2" fill="none" stroke="#315d52" strokeWidth="0.8" />
          <circle cx="8" cy="6" r="0.8" fill="#b99658" />
        </pattern>
        <marker id="arrow-cyan" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6" fill="none" stroke="#087d8c" strokeWidth="1.2" />
        </marker>
        <marker id="arrow-ink" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6" fill="none" stroke="#26343a" strokeWidth="1.2" />
        </marker>
      </defs>
      <rect x="0" y="0" width="360" height="250" fill="#f7f6f1" />
      {/* Wall, return corner, ceiling and floor lines */}
      <rect x={X0} y={TOP} width={WALL_R - X0} height={FLOOR - TOP} fill="#ecebe5" stroke="#26343a" strokeWidth="1.4" />
      <path d={`M${X0 - 14} ${TOP - 10} L${X0} ${TOP} M${X0 - 14} ${FLOOR + 10} L${X0} ${FLOOR} M${X0 - 14} ${TOP - 10} V${FLOOR + 10}`} fill="none" stroke="#26343a" strokeWidth="1" />
      <path d={`M${X0 - 20} ${FLOOR + 10} H${WALL_R + 18}`} stroke="#26343a" strokeWidth="1" />
      {/* Cornice + skirting at true height */}
      <rect x={X0} y={TOP} width={WALL_R - X0} height={sy(CORNICE_BOTTOM) - TOP} fill="#f7f6f1" stroke="#26343a" strokeWidth="0.9" />
      <rect x={X0} y={sy(SKIRTING_TOP)} width={WALL_R - X0} height={FLOOR - sy(SKIRTING_TOP)} fill="#f7f6f1" stroke="#26343a" strokeWidth="0.9" />

      {(op === "paste" || op === "hang") && <Lane index={0} />}
      {op === "match" && <Lane index={1} />}
      {d0 && <Drop index={0} trimmed={after("trim")} id={patternId} />}
      {d1 && <Drop index={1} trimmed={after("match")} id={patternId} />}
      {op === "inspect" && [2, 3, 4, 5].map((i) => <Drop key={i} index={i} trimmed id={patternId} />)}

      {/* Outlet faceplate at its real position and size (hidden while the plate is off) */}
      {op !== "match" && op !== "outlet" && (
        <g>
          <rect x={outlet.x - outlet.w / 2} y={outlet.y - outlet.h / 2} width={outlet.w} height={outlet.h} rx="1" fill="#fbfaf6" stroke="#26343a" strokeWidth="0.9" />
          <path d={`M${outlet.x - 3} ${outlet.y - 1.5} v3 M${outlet.x + 3} ${outlet.y - 1.5} v3`} stroke="#26343a" strokeWidth="1" />
        </g>
      )}

      {op === "verify" && (
        <g>
          <ellipse cx="200" cy="120" rx="34" ry="12" fill="#f7f6f1" stroke="#26343a" strokeWidth="1.4" />
          <path d="M166 120 V160 C166 167 181 172 200 172 C219 172 234 167 234 160 V120" fill={`url(#${patternId})`} stroke="#26343a" strokeWidth="1.4" />
          <ellipse cx="200" cy="120" rx="13" ry="4.5" fill="#deded8" stroke="#26343a" />
          <path d="M246 92 H300 M246 103 H292 M246 128 H300 M246 139 H285" stroke="#26343a" strokeWidth="2" />
          <path d="M244 116 H232" stroke="#087d8c" markerEnd="url(#arrow-cyan)" />
          <text x="246" y="82" className="drawing-label">ROLL LABEL</text>
        </g>
      )}

      {op === "safety" && (
        <g>
          <circle cx={outlet.x} cy={outlet.y} r="22" fill="none" stroke="#b44435" strokeWidth="2.5" />
          <path d={`M${outlet.x - 15} ${outlet.y + 15} L${outlet.x + 15} ${outlet.y - 15}`} stroke="#b44435" strokeWidth="2.5" />
          <text x={outlet.x + 28} y={outlet.y + 4} className="drawing-warning">ISOLATE + VERIFY</text>
        </g>
      )}

      {op === "prepare" && (
        <g>
          <circle cx={sx(-0.25)} cy={sy(1.22)} r={0.045 * K} fill="#f7f6f1" stroke="#26343a" strokeDasharray="2 1.5" />
          <path d={`M${sx(-0.25) + 8} ${sy(1.22) - 8} Q${sx(-0.25) + 30} ${sy(1.22) - 30} ${sx(-0.25) + 52} ${sy(1.22) - 32}`} fill="none" stroke="#087d8c" strokeWidth="1.6" markerEnd="url(#arrow-cyan)" />
          <text x={sx(-0.25) + 56} y={sy(1.22) - 36} className="drawing-label">FILL FLUSH, SAND</text>
          <text x={sx(-0.25) + 56} y={sy(1.22) - 24} className="drawing-label">CLEAN + DRY</text>
        </g>
      )}

      {op === "layout" && (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={Math.max(X0, sx(FIRST_X - DROP_W / 2 + i * DROP_W))} y={sy(2.67)} width={DROP_W * K} height={sy(0.03) - sy(2.67)} fill="none" stroke="#63747a" strokeDasharray="5 4" />
          ))}
          <path d={`M${sx(FIRST_X)} ${sy(0.5)} H${sx(FIRST_X + 3 * DROP_W)}`} stroke="#087d8c" strokeWidth="1.6" markerEnd="url(#arrow-cyan)" />
          <text x={sx(FIRST_X + 4 * DROP_W) - 6} y={sy(2.2)} className="drawing-label">DRY-LAY THE</text>
          <text x={sx(FIRST_X + 4 * DROP_W) - 6} y={sy(2.2) + 11} className="drawing-label">FIRST TWO DROPS</text>
        </g>
      )}

      {(op === "plumb" || op === "measure" || op === "hang" || op === "smooth" || op === "paste") && (
        <path d={`M${plumb} ${sy(2.65)} V${sy(0.07)}`} stroke="#087d8c" strokeWidth="1.6" strokeDasharray="5 3" />
      )}
      {op === "plumb" && (
        <g>
          <path d={`M${X0} ${sy(0.5)} H${plumb}`} stroke="#26343a" markerEnd="url(#arrow-ink)" />
          <text x={X0 + 2} y={sy(0.5) - 5} className="drawing-label">500</text>
          <text x={plumb + 8} y={sy(2.3)} className="drawing-label">TRUE VERTICAL</text>
          <text x={plumb + 8} y={sy(2.3) + 11} className="drawing-label">FROM ACTUAL ROLL WIDTH</text>
        </g>
      )}

      {op === "measure" && (
        <g>
          <path d={`M${sx(FIRST_X - DROP_W / 2) + 4} ${sy(2.67)} V${sy(0.03)}`} stroke="#087d8c" strokeWidth="1.6" />
          <path d={`M${X0} ${sy(2.67)} H${mid + 30} M${X0} ${sy(0.03)} H${mid + 30}`} stroke="#b44435" strokeDasharray="3 3" />
          <text x={plumb + 8} y={sy(1.5)} className="drawing-label">MEASURED HEIGHT</text>
          <text x={plumb + 8} y={sy(1.5) + 11} className="drawing-label">+ TRIM ALLOWANCE</text>
        </g>
      )}

      {op === "paste" && (
        <g>
          <text x={plumb + 10} y={sy(1.8)} className="drawing-label">EVEN COAT</text>
          <text x={plumb + 10} y={sy(1.8) + 11} className="drawing-label">SLIGHTLY WIDER</text>
          <text x={plumb + 10} y={sy(1.8) + 22} className="drawing-label">THAN THE DROP</text>
        </g>
      )}

      {op === "hang" && (
        <g>
          <path d={`M${sx(FIRST_X)} ${sy(2.4)} V${sy(0.9)}`} stroke="#087d8c" strokeWidth="1.8" markerEnd="url(#arrow-cyan)" />
          <text x={plumb + 10} y={sy(1.8)} className="drawing-label">ALIGN DRY EDGE</text>
          <text x={plumb + 10} y={sy(1.8) + 11} className="drawing-label">TO PLUMB LINE</text>
        </g>
      )}

      {op === "smooth" && (
        <g>
          <path d={`M${sx(FIRST_X)} ${sy(1.6)} h-14 M${sx(FIRST_X)} ${sy(1.6)} h14`} stroke="#087d8c" strokeWidth="1.8" markerEnd="url(#arrow-cyan)" />
          <text x={plumb + 10} y={sy(1.8)} className="drawing-label">CENTRE OUT</text>
          <text x={plumb + 10} y={sy(1.8) + 11} className="drawing-label">LIGHT PRESSURE</text>
        </g>
      )}

      {op === "trim" && (
        <g>
          <path d={`M${X0} ${sy(CORNICE_BOTTOM)} H${sx(FIRST_X + DROP_W / 2) + 8} M${X0} ${sy(SKIRTING_TOP)} H${sx(FIRST_X + DROP_W / 2) + 8}`} stroke="#b44435" strokeWidth="1.6" strokeDasharray="4 2" />
          <text x={plumb + 12} y={sy(CORNICE_BOTTOM) + 4} className="drawing-label">CUT AT CORNICE</text>
          <text x={plumb + 12} y={sy(SKIRTING_TOP) + 4} className="drawing-label">CUT AT SKIRTING</text>
        </g>
      )}

      {op === "match" && (
        <g>
          <path d={`M${plumb} ${sy(2.62)} V${sy(0.12)}`} stroke="#087d8c" strokeWidth="1.2" />
          <path d={`M${plumb + 40} ${sy(1.9)} H${plumb + 6}`} stroke="#087d8c" strokeWidth="1.8" markerEnd="url(#arrow-cyan)" />
          <text x={plumb + 44} y={sy(1.9)} className="drawing-label">MATCH PATTERN</text>
          <text x={plumb + 44} y={sy(1.9) + 11} className="drawing-label">THEN BUTT THE SEAM</text>
        </g>
      )}

      {op === "outlet" && (
        <g>
          <rect x={outlet.x - outlet.w / 2} y={outlet.y - outlet.h / 2} width={outlet.w} height={outlet.h} fill="none" stroke="#b44435" strokeWidth="1.4" />
          <path d={`M${outlet.x - outlet.w / 2} ${outlet.y - outlet.h / 2} L${outlet.x + outlet.w / 2} ${outlet.y + outlet.h / 2} M${outlet.x + outlet.w / 2} ${outlet.y - outlet.h / 2} L${outlet.x - outlet.w / 2} ${outlet.y + outlet.h / 2}`} stroke="#b44435" strokeDasharray="2 1.5" />
          <path d={`M${outlet.x + 46} ${outlet.y - 22} L${outlet.x + 9} ${outlet.y - 6}`} stroke="#087d8c" markerEnd="url(#arrow-cyan)" />
          <text x={outlet.x + 48} y={outlet.y - 26} className="drawing-warning">POWER ISOLATED</text>
          <text x={outlet.x + 48} y={outlet.y - 14} className="drawing-label">X-CUT, TRIM BEHIND PLATE</text>
        </g>
      )}

      {op === "clean" && (
        <g>
          <path d={`M${plumb} ${sy(2.6)} V${sy(0.12)}`} stroke="#087d8c" strokeDasharray="4 3" />
          <text x={plumb + 12} y={sy(1.8)} className="drawing-label">CLEAN DAMP CLOTH</text>
          <text x={plumb + 12} y={sy(1.8) + 11} className="drawing-label">BEFORE PASTE DRIES</text>
        </g>
      )}

      {op === "inspect" && (
        <g>
          <path d={`M${WALL_R + 26} ${sy(1.5)} L${WALL_R + 4} ${sy(1.4)}`} stroke="#087d8c" markerEnd="url(#arrow-cyan)" />
          <text x="72" y="244" className="drawing-label">LOW-ANGLE LIGHT: SEAMS, EDGES, OUTLET, CLEANLINESS</text>
        </g>
      )}

      {/* Live work point from the 3D build */}
      {showWp && wp && (
        <g className="drawing-workpoint" aria-hidden="true">
          <circle cx={wp.x} cy={wp.y} r="6" fill="none" stroke="#d97706" strokeWidth="1.6" />
          <path d={`M${wp.x - 10} ${wp.y} h6 M${wp.x + 4} ${wp.y} h6 M${wp.x} ${wp.y - 10} v6 M${wp.x} ${wp.y + 4} v6`} stroke="#d97706" strokeWidth="1.2" />
        </g>
      )}

      <text x="18" y="18" className="drawing-figure">FIG. {String(number).padStart(2, "0")}</text>
      <text x="342" y="18" textAnchor="end" className="drawing-note">ELEVATION · UNIFORM SCALE · SAME GEOMETRY AS 3D</text>
    </svg>
  );
}
