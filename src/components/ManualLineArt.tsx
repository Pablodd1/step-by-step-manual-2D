/**
 * 2D Vector Line-Art Tool Icons & Expressive Builder Figure
 *
 * Adapted from MIT-licensed open-source reference:
 * - Nutlope/bygga (https://github.com/Nutlope/bygga, MIT License) — `src/components/art/Tools.tsx`, `Figure.tsx`
 * Extended with architectural wallcovering & UNITEC panel tools.
 */

import React from "react";

const INK = "#141414";
const FILL = "#ffffff";
const SHADE = "#ecebe6";
const ACCENT = "#fff3c4";

const baseStroke = {
  stroke: INK,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export type ManualToolIconKind =
  | "voltageTester"
  | "screwdriver"
  | "fillerKnife"
  | "sandingBlock"
  | "sprayBottle"
  | "sponge"
  | "moistureMeter"
  | "pasteRoller"
  | "plumbLevel"
  | "tapeMeasure"
  | "utilityKnife"
  | "straightedge"
  | "smoother"
  | "seamRoller"
  | "caulkGun"
  | "fineToothSaw"
  | "rollDrop";

/**
 * Resolves any blueprint tool label or ID to a crisp 2D vector line-art icon kind.
 */
export function resolveManualToolKind(labelOrId: string): ManualToolIconKind {
  const s = labelOrId.toLowerCase();
  if (s.includes("voltage") || s.includes("ncvt") || s.includes("breaker") || s.includes("tester")) return "voltageTester";
  if (s.includes("screw") || s.includes("plate")) return "screwdriver";
  if (s.includes("putty") || s.includes("filler") || s.includes("spackle") || s.includes("broadknife")) return "fillerKnife";
  if (s.includes("sand") || s.includes("grit")) return "sandingBlock";
  if (s.includes("spray") || s.includes("cleaner")) return "sprayBottle";
  if (s.includes("sponge") || s.includes("cloth") || s.includes("water")) return "sponge";
  if (s.includes("moisture") || s.includes("thermometer") || s.includes("rh") || s.includes("meter")) return "moistureMeter";
  if (s.includes("paste") || s.includes("primer") || s.includes("paint roller") || s.includes("brush")) return "pasteRoller";
  if (s.includes("laser") || s.includes("level") || s.includes("plumb")) return "plumbLevel";
  if (s.includes("tape") || s.includes("measure") || s.includes("pencil")) return "tapeMeasure";
  if (s.includes("knife") || s.includes("blade") || s.includes("snap") || s.includes("shear")) return "utilityKnife";
  if (s.includes("straightedge") || s.includes("triangle") || s.includes("guide") || s.includes("ruler")) return "straightedge";
  if (s.includes("smoother") || s.includes("felt") || s.includes("sweep")) return "smoother";
  if (s.includes("seam")) return "seamRoller";
  if (s.includes("caulk") || s.includes("adhesive")) return "caulkGun";
  if (s.includes("saw")) return "fineToothSaw";
  return "rollDrop";
}

export function ManualToolArt({
  kind,
  size = 56,
  highlight = true,
}: {
  kind: ManualToolIconKind;
  size?: number;
  highlight?: boolean;
}) {
  const handleFill = highlight ? ACCENT : SHADE;

  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox="0 0 84 60"
      fill="none"
      className="line-art select-none"
      aria-hidden="true"
    >
      {kind === "utilityKnife" && (
        <g transform="rotate(-16 42 30)">
          {/* Snap-off blade with score segments */}
          <polygon points="10,33 34,24 34,34 14,35" fill={FILL} {...baseStroke} />
          <line x1="18" y1="34" x2="21" y2="29" stroke={INK} strokeWidth={1.1} />
          <line x1="25" y1="34" x2="28" y2="27" stroke={INK} strokeWidth={1.1} />
          {/* Ergonomic handle body */}
          <rect x="32" y="21" width="42" height="16" rx="5" fill={handleFill} {...baseStroke} />
          <rect x="38" y="26" width="22" height="6" rx="2.5" fill={FILL} {...baseStroke} />
          <rect x="46" y="25" width="7" height="8" rx="1.5" fill={INK} />
        </g>
      )}

      {kind === "straightedge" && (
        <g>
          {/* Steel trimming triangle / straightedge */}
          <polygon points="12,48 72,48 72,12" fill={SHADE} {...baseStroke} />
          <polygon points="28,42 64,42 64,23" fill={FILL} {...baseStroke} />
          {/* Millimeter ticks along bottom edge */}
          {[18, 24, 30, 36, 42, 48, 54, 60, 66].map((x) => (
            <line
              key={x}
              x1={x}
              y1={48}
              x2={x}
              y2={x % 12 === 0 ? 43 : 45}
              stroke={INK}
              strokeWidth={1.2}
            />
          ))}
        </g>
      )}

      {kind === "smoother" && (
        <g>
          {/* Plastic trapezoidal smoother paddle + dark felt edge */}
          <polygon points="18,16 66,16 74,38 10,38" fill={handleFill} {...baseStroke} />
          <rect x="10" y="38" width="64" height="8" rx="2" fill={SHADE} {...baseStroke} />
          <line x1="28" y1="24" x2="56" y2="24" {...baseStroke} />
          <circle cx="42" cy="20" r="2.2" fill={FILL} {...baseStroke} />
        </g>
      )}

      {kind === "pasteRoller" && (
        <g>
          {/* Fluffy roller sleeve */}
          <rect x="14" y="10" width="44" height="16" rx="7" fill={handleFill} {...baseStroke} />
          <line x1="22" y1="14" x2="26" y2="14" stroke={INK} strokeWidth={1.2} />
          <line x1="36" y1="21" x2="42" y2="21" stroke={INK} strokeWidth={1.2} />
          {/* Metal wire frame */}
          <path d="M58 18 H66 V30 H42 V36" fill="none" {...baseStroke} />
          {/* Handle */}
          <rect x="37" y="36" width="10" height="19" rx="4" fill={SHADE} {...baseStroke} />
        </g>
      )}

      {kind === "seamRoller" && (
        <g>
          {/* Dual-arm barrel roller + handle */}
          <ellipse cx="26" cy="24" rx="11" ry="9" fill={handleFill} {...baseStroke} />
          <circle cx="26" cy="24" r="3" fill={FILL} {...baseStroke} />
          <path d="M26 15 H42 L48 28 H72" fill="none" {...baseStroke} />
          <rect x="48" y="23" width="26" height="10" rx="5" fill={SHADE} {...baseStroke} />
        </g>
      )}

      {kind === "voltageTester" && (
        <g transform="rotate(-18 42 30)">
          {/* NCVT Sensor tip */}
          <polygon points="10,27 22,25 22,35 10,33" fill={FILL} {...baseStroke} />
          {/* LED indicator glow ring */}
          <rect x="22" y="23" width="9" height="14" rx="2" fill={ACCENT} {...baseStroke} />
          {/* Insulated pen body */}
          <rect x="31" y="22" width="42" height="16" rx="5" fill={SHADE} {...baseStroke} />
          <path d="M46 22 V18 H64" fill="none" {...baseStroke} />
          {/* Lightning bolt icon */}
          <path d="M44 26 L40 31 H45 L42 35" fill="none" stroke={INK} strokeWidth={1.5} />
        </g>
      )}

      {kind === "screwdriver" && (
        <g>
          <rect x="8" y="24" width="32" height="12" rx="6" fill={handleFill} {...baseStroke} />
          <line x1="15" y1="26" x2="15" y2="34" {...baseStroke} />
          <line x1="22" y1="26" x2="22" y2="34" {...baseStroke} />
          <line x1="29" y1="26" x2="29" y2="34" {...baseStroke} />
          <rect x="40" y="26.5" width="4" height="7" fill={SHADE} {...baseStroke} />
          <line x1="44" y1="30" x2="72" y2="30" {...baseStroke} />
          <polygon points="70,27 77,29 77,31 70,33" fill={FILL} {...baseStroke} />
        </g>
      )}

      {kind === "fillerKnife" && (
        <g transform="rotate(-12 42 30)">
          {/* Flexible broadknife steel blade */}
          <polygon points="12,16 42,23 42,37 12,44" fill={FILL} {...baseStroke} />
          <rect x="42" y="24" width="6" height="12" fill={SHADE} {...baseStroke} />
          <rect x="48" y="22" width="26" height="16" rx="6" fill={handleFill} {...baseStroke} />
          <circle cx="67" cy="30" r="2.5" fill={FILL} {...baseStroke} />
        </g>
      )}

      {kind === "sandingBlock" && (
        <g>
          {/* Isometric bevelled sanding sponge block */}
          <polygon points="16,24 54,14 70,24 32,34" fill={handleFill} {...baseStroke} />
          <polygon points="16,24 32,34 32,46 16,36" fill={SHADE} {...baseStroke} />
          <polygon points="32,34 70,24 70,36 32,46" fill={FILL} {...baseStroke} />
          {/* Grit stipple dots */}
          <circle cx="40" cy="24" r="1.1" fill={INK} />
          <circle cx="48" cy="21" r="1.1" fill={INK} />
          <circle cx="34" cy="27" r="1.1" fill={INK} />
          <circle cx="54" cy="24" r="1.1" fill={INK} />
        </g>
      )}

      {kind === "sprayBottle" && (
        <g>
          {/* Trigger head */}
          <path d="M30 14 H52 L56 20 H34 Z" fill={handleFill} {...baseStroke} />
          <path d="M32 20 L26 28" {...baseStroke} />
          <rect x="37" y="20" width="12" height="6" fill={SHADE} {...baseStroke} />
          {/* Bottle body */}
          <path d="M33 26 H53 L58 50 H28 Z" fill={FILL} {...baseStroke} />
          {/* Spray mist lines */}
          <line x1="14" y1="14" x2="22" y2="16" {...baseStroke} />
          <line x1="12" y1="20" x2="21" y2="20" {...baseStroke} />
          <line x1="14" y1="26" x2="22" y2="24" {...baseStroke} />
        </g>
      )}

      {kind === "sponge" && (
        <g>
          <rect x="16" y="18" width="52" height="26" rx="8" fill={handleFill} {...baseStroke} />
          <path d="M16 32 H68" stroke={INK} strokeWidth={1.3} strokeDasharray="4 3" />
          <circle cx="28" cy="25" r="2" fill={FILL} {...baseStroke} />
          <circle cx="44" cy="24" r="1.6" fill={FILL} {...baseStroke} />
          <circle cx="56" cy="26" r="2.2" fill={FILL} {...baseStroke} />
        </g>
      )}

      {kind === "moistureMeter" && (
        <g>
          {/* Two contact sensor pins */}
          <line x1="35" y1="8" x2="35" y2="16" {...baseStroke} />
          <line x1="49" y1="8" x2="49" y2="16" {...baseStroke} />
          {/* Digital meter housing */}
          <rect x="25" y="16" width="34" height="36" rx="6" fill={SHADE} {...baseStroke} />
          <rect x="30" y="21" width="24" height="14" rx="2" fill={handleFill} {...baseStroke} />
          <text x="42" y="31" textAnchor="middle" fontSize="8.5" fontWeight="800" fill={INK} fontFamily="monospace">
            1.4%
          </text>
          <circle cx="42" cy="43" r="3.5" fill={FILL} {...baseStroke} />
        </g>
      )}

      {kind === "plumbLevel" && (
        <g>
          <rect x="8" y="21" width="68" height="18" rx="3" fill={SHADE} {...baseStroke} />
          <rect x="33" y="24" width="18" height="12" rx="2" fill={handleFill} {...baseStroke} />
          <ellipse cx="42" cy="30" rx="3.8" ry="2.4" fill={FILL} {...baseStroke} />
          <line x1="38" y1="24" x2="38" y2="36" stroke={INK} strokeWidth={1.2} />
          <line x1="46" y1="24" x2="46" y2="36" stroke={INK} strokeWidth={1.2} />
          <rect x="13" y="25" width="8" height="10" rx="2" fill={FILL} {...baseStroke} />
          <rect x="63" y="25" width="8" height="10" rx="2" fill={FILL} {...baseStroke} />
        </g>
      )}

      {kind === "tapeMeasure" && (
        <g>
          {/* Tape strip extending left */}
          <rect x="8" y="34" width="30" height="8" fill={handleFill} {...baseStroke} />
          <path d="M8 31 V44" stroke={INK} strokeWidth={2.4} />
          {[14, 20, 26, 32].map((x) => (
            <line key={x} x1={x} y1={34} x2={x} y2={38} stroke={INK} strokeWidth={1.2} />
          ))}
          {/* Rounded case */}
          <path d="M36 42 V24 A14 14 0 0 1 50 12 H62 A10 10 0 0 1 72 22 V42 Z" fill={SHADE} {...baseStroke} />
          <circle cx="54" cy="28" r="7" fill={FILL} {...baseStroke} />
        </g>
      )}

      {kind === "caulkGun" && (
        <g>
          <polygon points="10,27 22,24 22,30" fill={FILL} {...baseStroke} />
          <rect x="22" y="20" width="38" height="14" rx="2" fill={handleFill} {...baseStroke} />
          <path d="M60 18 V46 M60 27 H74" fill="none" {...baseStroke} />
          <path d="M56 34 L50 48" {...baseStroke} />
          <path d="M63 34 L61 50" {...baseStroke} />
        </g>
      )}

      {kind === "fineToothSaw" && (
        <g>
          <polygon points="10,26 56,22 56,36 10,34" fill={FILL} {...baseStroke} />
          <path d="M12 34 L16 37 L20 34 L24 37 L28 34 L32 37 L36 34 L40 37 L44 34 L48 37 L52 34" fill="none" stroke={INK} strokeWidth={1.3} />
          <rect x="56" y="18" width="18" height="24" rx="5" fill={handleFill} {...baseStroke} />
          <rect x="61" y="23" width="8" height="14" rx="2.5" fill={FILL} {...baseStroke} />
        </g>
      )}

      {kind === "rollDrop" && (
        <g>
          <ellipse cx="28" cy="22" rx="10" ry="6" fill={FILL} {...baseStroke} />
          <path d="M18 22 V42 A10 6 0 0 0 38 42 V22" fill={handleFill} {...baseStroke} />
          <ellipse cx="28" cy="22" rx="4" ry="2.2" fill={SHADE} {...baseStroke} />
          <path d="M38 24 L66 18 V44 L38 42 Z" fill={FILL} {...baseStroke} />
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// Expressive Vector Manual Builder Figure (Adapted from Nutlope/bygga MIT)
// ============================================================================

export type BuilderFigurePose = "stand" | "cheer" | "think" | "point" | "wave" | "read" | "lift";

export function BuilderFigure({
  pose = "point",
  size = 110,
}: {
  pose?: BuilderFigurePose;
  size?: number;
}) {
  const s = {
    stroke: INK,
    strokeWidth: 2.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 120 148"
      fill="none"
      className="line-art select-none"
      aria-hidden="true"
    >
      {/* Subtle ground shadow */}
      <ellipse cx="60" cy="138" rx="28" ry="4.5" fill="#eae8e1" />

      {/* Head */}
      <circle cx="60" cy="30" r="17" fill={FILL} {...s} />
      {/* Eyes */}
      <circle cx="54" cy="28" r="1.9" fill={INK} />
      <circle cx="66" cy="28" r="1.9" fill={INK} />
      {/* Mouth */}
      {pose === "think" ? (
        <path d="M55 36 Q60 35 65 37" {...s} />
      ) : pose === "cheer" ? (
        <path d="M52 34 Q60 43 68 34" {...s} />
      ) : (
        <path d="M54 35 Q60 40 66 35" {...s} />
      )}

      {/* Torso */}
      <path d="M42 50 Q42 46 47 46 L73 46 Q78 46 78 50 L80 90 Q80 94 75 94 L45 94 Q40 94 40 90 Z" fill={FILL} {...s} />

      {/* Arms */}
      {pose === "cheer" && (
        <>
          <path d="M42 54 Q24 38 22 20" {...s} />
          <circle cx="22" cy="18" r="5" fill={FILL} {...s} />
          <path d="M78 54 Q96 38 98 20" {...s} />
          <circle cx="98" cy="18" r="5" fill={FILL} {...s} />
        </>
      )}
      {pose === "wave" && (
        <>
          <path d="M42 54 Q28 68 30 84" {...s} />
          <circle cx="30" cy="86" r="5" fill={FILL} {...s} />
          <path d="M78 52 Q98 38 96 20" {...s} />
          <circle cx="96" cy="18" r="5" fill={FILL} {...s} />
          <path d="M106 14 Q111 20 106 26" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
      {pose === "think" && (
        <>
          <path d="M42 54 Q26 70 40 82" {...s} />
          <path d="M78 54 Q92 50 74 38" {...s} />
          <circle cx="72" cy="38" r="4.5" fill={FILL} {...s} />
          <text x="90" y="20" fontFamily=" system-ui, sans-serif" fontWeight="800" fontSize="20" fill={INK}>
            ?
          </text>
        </>
      )}
      {pose === "point" && (
        <>
          <path d="M42 54 Q28 68 30 84" {...s} />
          <circle cx="30" cy="86" r="5" fill={FILL} {...s} />
          <path d="M78 54 Q96 52 108 46" {...s} />
          <circle cx="110" cy="45" r="5" fill={ACCENT} {...s} />
        </>
      )}
      {pose === "read" && (
        <>
          <path d="M42 54 Q30 68 44 74" {...s} />
          <path d="M78 54 Q90 68 76 74" {...s} />
          <rect x="40" y="64" width="40" height="26" rx="2" fill={ACCENT} {...s} />
          <line x1="60" y1="64" x2="60" y2="90" {...s} />
        </>
      )}
      {pose === "lift" && (
        <>
          <path d="M42 54 Q26 62 28 74" {...s} />
          <path d="M78 54 Q94 62 92 74" {...s} />
          <rect x="22" y="70" width="76" height="12" rx="2" fill={ACCENT} {...s} />
        </>
      )}
      {pose === "stand" && (
        <>
          <path d="M42 54 Q28 68 32 86" {...s} />
          <circle cx="32" cy="88" r="5" fill={FILL} {...s} />
          <path d="M78 54 Q92 68 88 86" {...s} />
          <circle cx="88" cy="88" r="5" fill={FILL} {...s} />
        </>
      )}

      {/* Legs */}
      <path d="M49 94 L46 130" {...s} />
      <path d="M71 94 L74 130" {...s} />
      <path d="M38 132 L52 132" {...s} />
      <path d="M68 132 L82 132" {...s} />
    </svg>
  );
}
