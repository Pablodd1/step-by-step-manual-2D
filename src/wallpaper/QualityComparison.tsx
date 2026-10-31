import { Check, X } from "lucide-react";
import type { Operation } from "./guide";

function QualityDiagram({ operation, good }: { operation: Operation; good: boolean }) {
  const ink = good ? "#16705a" : "#a43f35";
  const paper = "#e8e4d9";
  const id = `quality-pattern-${operation}-${good ? "accept" : "recheck"}`;
  return (
    <svg viewBox="0 0 170 112" role="img" aria-label={`${good ? "Accept" : "Stop and recheck"} reconstructed ${operation} example`}>
      <defs>
        <pattern id={id} width="24" height="30" patternUnits="userSpaceOnUse">
          <rect width="24" height="30" fill={paper} />
          <path d="M3 28 Q9 17 19 3 M10 16 l-6 -3 M13 12 l6 2" fill="none" stroke="#41675d" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="170" height="112" fill="#f5f3ed" />
      <path d="M20 96 H150 M28 12 H142 V96 H28 Z" fill="#deded8" stroke="#55646a" strokeWidth="1" />
      {operation === "verify" && <g><path d="M56 35 h48 v43 H56 Z" fill={`url(#${id})`} stroke={ink} /><ellipse cx="80" cy="35" rx="24" ry="7" fill="#f5f3ed" stroke={ink} /><rect x="111" y="32" width="24" height="39" fill="#fff" stroke={ink} /><path d="M116 41 h14 M116 47 h14 M116 53 h10" stroke={ink} />{!good && <path d="M51 78 l58 -48 M51 30 l58 48" stroke={ink} strokeWidth="3" />}</g>}
      {operation === "safety" && <g><rect x="67" y="29" width="38" height="51" rx="3" fill="#fff" stroke={ink} strokeWidth="2" /><path d="M77 42 v10 M94 42 v10 M77 60 v10 M94 60 v10" stroke={ink} strokeWidth="3" />{good ? <path d="M54 76 l15 12 l47 -65" fill="none" stroke={ink} strokeWidth="4" /> : <path d="M55 23 l60 64 M115 23 l-60 64" stroke={ink} strokeWidth="4" />}</g>}
      {operation === "prepare" && <g>{good ? <path d="M43 54 H127" stroke={ink} strokeWidth="3" /> : <><path d="M43 53 l18 -14 l13 19 l17 -25 l16 25 l20 -9" fill="none" stroke={ink} strokeWidth="3" /><path d="M56 77 l14 -12 l12 13 l17 -11" fill="none" stroke={ink} strokeWidth="2" /></>}</g>}
      {operation === "layout" && <g>{[0,1,2].map(i => <rect key={i} x={43+i*30} y="26" width="30" height="55" fill="none" stroke={good ? ink : "#7b8588"} strokeDasharray="4 3" />)}{good ? <path d="M48 88 h76" stroke={ink} strokeWidth="3" /> : <path d="M43 24 l91 61 M134 24 l-91 61" stroke={ink} strokeWidth="3" />}</g>}
      {operation === "plumb" && <g><path d={good ? "M83 21 V88" : "M62 21 L103 88"} stroke={ink} strokeWidth="2" strokeDasharray="5 3" /><path d="M36 87 H134" stroke="#7b8588" />{good && <path d="M76 55 l6 6 l13 -16" fill="none" stroke={ink} strokeWidth="3" />}</g>}
      {operation === "measure" && <g><rect x="58" y={good ? 19 : 32} width="47" height={good ? 70 : 50} fill={`url(#${id})`} stroke={ink} /><path d="M48 20 V89 M43 20 h10 M43 89 h10" stroke={ink} />{!good && <path d="M57 87 H106" stroke={ink} strokeWidth="3" strokeDasharray="4 2" />}</g>}
      {operation === "paste" && <g><rect x="47" y="20" width="70" height="68" fill="#80cbd3" opacity=".65" stroke={ink} />{!good && <><rect x="75" y="20" width="13" height="68" fill="#f5f3ed" /><rect x="47" y="20" width="70" height="8" fill="#f5f3ed" /></>}<path d="M124 30 V79" stroke={ink} strokeWidth="3" /></g>}
      {operation === "hang" && <g><path d="M73 19 V89" stroke="#168ca0" strokeDasharray="4 3" /><rect x={good ? 51 : 45} y="22" width="43" height="64" fill={`url(#${id})`} stroke={ink} transform={good ? undefined : "rotate(-5 67 54)"} />{!good && <path d="M70 20 V89" stroke={ink} strokeWidth="2" />}</g>}
      {operation === "smooth" && <g><rect x="50" y="20" width="64" height="68" fill={`url(#${id})`} stroke={ink} />{good ? <path d="M82 53 H60 M82 53 h22 M82 53 V34 M82 53 v19" stroke={ink} strokeWidth="2" /> : <><ellipse cx="80" cy="52" rx="17" ry="11" fill="#f5f3ed" stroke={ink} strokeWidth="2" /><ellipse cx="99" cy="72" rx="8" ry="6" fill="#f5f3ed" stroke={ink} /></>}</g>}
      {operation === "trim" && <g><rect x="51" y="24" width="61" height="60" fill={`url(#${id})`} stroke={ink} /><path d={good ? "M48 25 H115 M48 83 H115" : "M48 25 l10 -3 l8 6 l11 -5 l9 4 l12 -5 l17 3 M48 83 l12 5 l10 -7 l13 5 l11 -4 l21 2"} fill="none" stroke={ink} strokeWidth="2" /></g>}
      {operation === "match" && <g><rect x="40" y="20" width="43" height="68" fill={`url(#${id})`} stroke={ink} /><rect x={good ? 83 : 89} y={good ? 20 : 28} width="43" height="68" fill={`url(#${id})`} stroke={ink} />{!good && <path d="M84 22 V89" stroke={ink} strokeWidth="3" />}</g>}
      {operation === "outlet" && <g><rect x="45" y="20" width="76" height="68" fill={`url(#${id})`} stroke={ink} /><rect x="67" y="36" width="32" height="40" fill={good ? "#f5f3ed" : "#fff"} stroke={ink} strokeWidth="2" />{good ? <path d="M61 80 h45" stroke={ink} strokeWidth="3" /> : <path d="M61 30 l45 52 M106 30 l-45 52" stroke={ink} strokeWidth="3" />}</g>}
      {operation === "clean" && <g><rect x="43" y="20" width="80" height="68" fill={`url(#${id})`} stroke={ink} /><path d="M83 21 V88" stroke={good ? ink : "#ba792f"} strokeWidth={good ? 1 : 8} opacity={good ? 1 : .75} />{good && <path d="M113 30 l7 7 l14 -16" fill="none" stroke={ink} strokeWidth="3" />}</g>}
      {operation === "inspect" && <g>{[0,1,2].map(i => <rect key={i} x={38+i*32} y="20" width="32" height="68" fill={`url(#${id})`} stroke={ink} />)}{good ? <path d="M66 55 l12 12 l28 -34" fill="none" stroke={ink} strokeWidth="4" /> : <path d="M70 24 V86" stroke={ink} strokeWidth="4" strokeDasharray="5 3" />}</g>}
    </svg>
  );
}

export function QualityComparison({ operation, accept, recheck }: { operation: Operation; accept: string; recheck: string }) {
  return (
    <div className="quality-comparison">
      <figure className="quality-card accept">
        <figcaption><Check size={14} /><span>Accept when</span></figcaption>
        <QualityDiagram operation={operation} good />
        <p>{accept}</p>
      </figure>
      <figure className="quality-card recheck">
        <figcaption><X size={14} /><span>Stop + recheck</span></figcaption>
        <QualityDiagram operation={operation} good={false} />
        <p>{recheck}</p>
      </figure>
      <small>Reconstructed visual examples • not to scale</small>
    </div>
  );
}
