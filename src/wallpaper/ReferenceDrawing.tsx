import type { WallpaperStep } from "./guide";

export function ReferenceDrawing({ step, number }: { step: WallpaperStep; number: number }) {
  const filled = ["hang", "smooth", "trim", "match", "outlet", "clean", "inspect"].includes(step.operation);
  const second = ["outlet", "clean", "inspect"].includes(step.operation);
  const all = step.operation === "inspect";
  const paste = step.operation === "paste" || step.operation === "hang";
  const secondPaste = step.operation === "match";
  const x1 = 75;
  const x2 = 117;
  const dropWidth = 42;

  return (
    <svg className="reference-svg" viewBox="0 0 360 250" role="img" aria-label={`Reconstructed drawing for step ${number}: ${step.title}`}>
      <defs>
        <pattern id="paper-pattern" width="22" height="34" patternUnits="userSpaceOnUse">
          <rect width="22" height="34" fill="#e6e3da" />
          <path d="M2 33 Q9 22 18 2 M8 23 l-5 -4 M12 16 l7 -3" fill="none" stroke="#315d52" strokeWidth="1.2" />
          <circle cx="14" cy="12" r="1.3" fill="#b99658" />
        </pattern>
        <marker id="arrow-cyan" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6" fill="none" stroke="#087d8c" strokeWidth="1.2" />
        </marker>
        <marker id="arrow-ink" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6" fill="none" stroke="#26343a" strokeWidth="1.2" />
        </marker>
      </defs>
      <rect x="0" y="0" width="360" height="250" fill="#f7f6f1" />
      <path d="M44 215 H316 M50 28 H310 V215 H50 Z" fill="#deded8" stroke="#26343a" strokeWidth="1.4" />
      <path d="M50 215 L36 226 H302 L316 215" fill="#ecebe5" stroke="#26343a" strokeWidth="1.2" />
      <path d="M50 28 L36 18 H296 L310 28" fill="#ecebe5" stroke="#26343a" strokeWidth="1.2" />
      <path d="M50 206 H310 V215 H50 Z" fill="#f7f6f1" stroke="#26343a" strokeWidth="1" />

      {(filled || step.operation === "match") && <rect x={x1} y="29" width={dropWidth} height="177" fill="url(#paper-pattern)" stroke="#26343a" strokeWidth="0.8" />}
      {second && <rect x={x2} y="29" width={dropWidth} height="177" fill="url(#paper-pattern)" stroke="#26343a" strokeWidth="0.8" />}
      {all && [2, 3, 4, 5].map((i) => <rect key={i} x={x1 + i * dropWidth} y="29" width={dropWidth} height="177" fill="url(#paper-pattern)" stroke="#26343a" strokeWidth="0.8" />)}
      {paste && <rect x={x1 - 2} y="29" width={dropWidth + 4} height="177" fill="#75c9d5" opacity="0.48" stroke="#087d8c" strokeDasharray="4 3" />}
      {secondPaste && <rect x={x2 - 2} y="29" width={dropWidth + 4} height="177" fill="#75c9d5" opacity="0.48" stroke="#087d8c" strokeDasharray="4 3" />}

      {step.operation === "verify" && (
        <g>
          <ellipse cx="165" cy="94" rx="49" ry="18" fill="#f7f6f1" stroke="#26343a" strokeWidth="1.5" />
          <path d="M116 94 V153 C116 163 138 171 165 171 C192 171 214 163 214 153 V94" fill="url(#paper-pattern)" stroke="#26343a" strokeWidth="1.5" />
          <ellipse cx="165" cy="94" rx="20" ry="7" fill="#deded8" stroke="#26343a" />
          <path d="M224 72 H282 M224 84 H274 M224 112 H282 M224 124 H267" stroke="#26343a" strokeWidth="2" />
          <path d="M218 100 H205" stroke="#087d8c" markerEnd="url(#arrow-cyan)" />
          <text x="224" y="61" className="drawing-label">ROLL LABEL</text>
        </g>
      )}

      {step.operation === "safety" && (
        <g>
          <rect x="155" y="88" width="48" height="64" rx="3" fill="#f7f6f1" stroke="#26343a" strokeWidth="2" />
          <path d="M169 104 V116 M189 104 V116 M169 127 V139 M189 127 V139" stroke="#26343a" strokeWidth="4" />
          <circle cx="179" cy="120" r="54" fill="none" stroke="#b44435" strokeWidth="3" />
          <path d="M141 158 L217 82" stroke="#b44435" strokeWidth="3" />
          <text x="219" y="174" className="drawing-warning">ISOLATE + VERIFY</text>
        </g>
      )}

      {step.operation === "prepare" && (
        <g>
          <path d="M122 76 l24 -9 l19 13 l-8 27 l-29 3 Z" fill="#f7f6f1" stroke="#26343a" strokeDasharray="3 2" />
          <path d="M202 96 l35 20 l-12 25 l-35 -20 Z" fill="#c7b85a" stroke="#26343a" />
          <path d="M174 115 Q194 82 218 77" fill="none" stroke="#087d8c" strokeWidth="1.8" markerEnd="url(#arrow-cyan)" />
          <text x="85" y="63" className="drawing-label">FILL + SAND</text>
          <text x="195" y="159" className="drawing-label">CLEAN + DRY</text>
        </g>
      )}

      {step.operation === "layout" && (
        <g>
          {[0, 1, 2, 3].map((i) => <rect key={i} x={75 + i * 42} y="43" width="42" height="150" fill="none" stroke="#63747a" strokeDasharray="5 4" />)}
          <path d="M94 177 H223" stroke="#087d8c" strokeWidth="1.8" markerEnd="url(#arrow-cyan)" />
          <circle cx="138" cy="95" r="17" fill="none" stroke="#b99658" strokeWidth="2" />
          <text x="82" y="62" className="drawing-label">DRY-LAY THE FIRST TWO DROPS</text>
        </g>
      )}

      {step.operation === "plumb" && (
        <g>
          <path d="M126 36 V199" stroke="#087d8c" strokeWidth="2" strokeDasharray="6 3" />
          <rect x="118" y="76" width="16" height="74" rx="2" fill="#d7b820" stroke="#26343a" />
          <circle cx="126" cy="113" r="4" fill="#a5d9b3" stroke="#26343a" />
          <path d="M60 183 H126" stroke="#26343a" markerEnd="url(#arrow-ink)" />
          <text x="62" y="174" className="drawing-label">SET OUT FROM ACTUAL WIDTH</text>
          <text x="140" y="54" className="drawing-label">TRUE VERTICAL</text>
        </g>
      )}

      {step.operation === "measure" && (
        <g>
          <path d="M105 42 V194 M97 42 H113 M97 194 H113" stroke="#087d8c" strokeWidth="1.8" />
          <path d="M105 50 V186" stroke="#087d8c" markerEnd="url(#arrow-cyan)" />
          <text x="120" y="103" className="drawing-label">MEASURED HEIGHT</text>
          <text x="120" y="119" className="drawing-label">+ TRIM ALLOWANCE</text>
          <path d="M75 37 H294 M75 199 H294" stroke="#b44435" strokeDasharray="3 3" />
        </g>
      )}

      {step.operation === "paste" && (
        <g>
          <rect x="88" y="72" width="58" height="16" rx="8" fill="#dad7cf" stroke="#26343a" />
          <path d="M146 80 h18 v43" fill="none" stroke="#63747a" strokeWidth="3" />
          <path d="M116 98 V157" stroke="#087d8c" strokeWidth="2" markerEnd="url(#arrow-cyan)" />
          <text x="170" y="92" className="drawing-label">EVEN COAT</text>
          <text x="170" y="108" className="drawing-label">SLIGHTLY WIDER</text>
          <text x="170" y="124" className="drawing-label">THAN THE DROP</text>
        </g>
      )}

      {step.operation === "hang" && (
        <g>
          <path d="M75 29 H117 V206 H75 Z" fill="url(#paper-pattern)" stroke="#26343a" />
          <path d="M96 49 V166" stroke="#087d8c" strokeWidth="2" markerEnd="url(#arrow-cyan)" />
          <path d="M117 35 V199" stroke="#087d8c" strokeDasharray="5 3" />
          <text x="135" y="92" className="drawing-label">ALIGN DRY EDGE</text>
          <text x="135" y="108" className="drawing-label">TO PLUMB LINE</text>
        </g>
      )}

      {step.operation === "smooth" && (
        <g>
          <path d="M96 103 H72 M96 103 H121 M96 103 V74 M96 103 V132" stroke="#087d8c" strokeWidth="2" markerEnd="url(#arrow-cyan)" />
          <path d="M89 94 l24 -5 l6 22 l-24 5 Z" fill="#d3a83d" stroke="#26343a" />
          <text x="140" y="91" className="drawing-label">CENTRE OUT</text>
          <text x="140" y="107" className="drawing-label">LIGHT PRESSURE</text>
        </g>
      )}

      {step.operation === "trim" && (
        <g>
          <path d="M70 39 H123 M70 195 H123" stroke="#b44435" strokeWidth="2" strokeDasharray="4 2" />
          <path d="M135 35 l36 0 M135 199 l36 0" stroke="#26343a" markerEnd="url(#arrow-ink)" />
          <text x="183" y="40" className="drawing-label">SHARP GUIDED CUT</text>
          <text x="135" y="218" className="drawing-label">FOLLOW ACTUAL JUNCTION</text>
        </g>
      )}

      {step.operation === "match" && (
        <g>
          <path d="M117 31 V204" stroke="#087d8c" strokeWidth="1.5" />
          <path d="M136 76 Q154 63 172 76 M94 76 Q112 63 130 76" fill="none" stroke="#315d52" strokeWidth="2" />
          <path d="M178 105 H126" stroke="#087d8c" strokeWidth="2" markerEnd="url(#arrow-cyan)" />
          <text x="184" y="96" className="drawing-label">MATCH PATTERN</text>
          <text x="184" y="112" className="drawing-label">THEN SEAT SEAM</text>
        </g>
      )}

      {step.operation === "outlet" && (
        <g>
          <rect x="126" y="93" width="34" height="48" rx="2" fill="#f7f6f1" stroke="#b44435" strokeWidth="2" />
          <path d="M130 97 L156 137 M156 97 L130 137" stroke="#b44435" strokeDasharray="3 2" />
          <path d="M190 91 L163 108" stroke="#087d8c" markerEnd="url(#arrow-cyan)" />
          <text x="194" y="84" className="drawing-warning">POWER ISOLATED</text>
          <text x="178" y="157" className="drawing-label">TRIM BEHIND COVER</text>
        </g>
      )}

      {step.operation === "clean" && (
        <g>
          <path d="M117 34 V202" stroke="#087d8c" strokeDasharray="4 3" />
          <rect x="107" y="91" width="30" height="19" rx="3" fill="#c7b85a" stroke="#26343a" transform="rotate(-12 122 100)" />
          <path d="M141 121 V162" stroke="#087d8c" strokeWidth="2" markerEnd="url(#arrow-cyan)" />
          <text x="156" y="102" className="drawing-label">CLEAN DAMP CLOTH</text>
          <text x="156" y="118" className="drawing-label">BEFORE PASTE DRIES</text>
        </g>
      )}

      {step.operation === "inspect" && (
        <g>
          <circle cx="280" cy="59" r="18" fill="#165f49" />
          <path d="M271 59 l6 6 l12 -14" fill="none" stroke="#f7f6f1" strokeWidth="3" />
          <path d="M60 45 L40 30 M60 190 L40 207" stroke="#087d8c" markerEnd="url(#arrow-cyan)" />
          <text x="72" y="226" className="drawing-label">CHECK LIGHT, SEAMS, EDGES, OUTLET + CLEANLINESS</text>
        </g>
      )}

      <text x="18" y="18" className="drawing-figure">FIG. {String(number).padStart(2, "0")}</text>
      <text x="342" y="238" textAnchor="end" className="drawing-note">RECONSTRUCTED • NOT TO SCALE</text>
    </svg>
  );
}
