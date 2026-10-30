import { Link } from "react-router";
import { ArrowRight, Box, Check, ExternalLink, FileText, Layers3, ScanLine } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { unitecPanelGuides } from "@contracts/guides/unitec-panels";

const OFFICIAL_FICHAS = [
  { code: "FT_03", title: "PVC Marble Sheet", href: "/docs/unitec-fichas/03_FT_PVC_Marble_Sheet.pdf" },
  { code: "FT_13", title: "Marble Adhesive Roll", href: "/docs/unitec-fichas/13_FT_Marble_Adhesive_Roll.pdf" },
  { code: "FT_15", title: "Interior WPC Panel", href: "/docs/unitec-fichas/15_FT_Interior_WPC_Panel.pdf" },
  { code: "FT_17", title: "Upholstered DuoBig & DuoSmall", href: "/docs/unitec-fichas/17_FT_Upholstered_Panel_DuoBig_y_DuoSmall.pdf" },
  { code: "FT_21", title: "Interior PVC Molding", href: "/docs/unitec-fichas/21_FT_Interior_PVC_Molding.pdf" },
  { code: "FT_24", title: "SPC Baseboard", href: "/docs/unitec-fichas/24_FT_SPC_Baseboard.pdf" },
  { code: "FT_27", title: "PEGATEC Mounting Adhesive", href: "/docs/unitec-fichas/27_FT_PEGATEC_Mounting_Adhesive.pdf" },
];

export default function MaterialsPage() {
  const panels = unitecPanelGuides;

  return (
    <div className="site-shell materials-page">
      <SiteHeader />
      <main className="materials-main">
        <section className="materials-hero">
          <div>
            <p className="mono-kicker acid-text">UNITEC USA DESIGN / OFFICIAL FICHAS TÉCNICAS INTEGRATED</p>
            <h1>Real products.<br /><span>Official installation specs.</span></h1>
          </div>
          <div className="materials-hero-copy">
            <p>Three catalogue-backed 3D training guides built directly from UNITEC USA DESIGN Technical Data Sheets (FT_03, FT_13, FT_15, FT_17, FT_27): deep fluted WPC with 2 clips/m, glossy PVC marble sheets with 6 mm expansion gaps, and DuoSmall upholstered panels with S-pattern PEGATEC bonding.</p>
            <div className="materials-proof"><span><ScanLine size={16} /> True published scale</span><span><Layers3 size={16} /> Official FT_03 / 15 / 17 / 27 rules</span><span><Box size={16} /> 3D Simulator + PDF export</span></div>
          </div>
        </section>

        <section className="approval-banner" aria-label="Official Technical Data Sheet status">
          <Check size={23} />
          <div>
            <strong>Verified against Official UNITEC USA DESIGN Technical Data Sheets (Fichas Técnicas 03, 13, 15, 17, 21, 24 & 27).</strong>
            <p>Surface preparation, cutting tools (utility knife + metal straightedge, circular saw / jigsaw), clip spacing (2 clips per linear meter), 6 mm expansion gaps, and PEGATEC Polyurethane Mounting Adhesive (45° nozzle cut, S-pattern / bead bonding, 30s press) are now synchronized with the official PDF sheets below.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
              {OFFICIAL_FICHAS.map((f) => (
                <a
                  key={f.code}
                  href={f.href}
                  target="_blank"
                  rel="noreferrer"
                  className="ghost-button"
                  style={{ fontSize: "12px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FileText size={13} />
                  <span><strong>{f.code}</strong> · {f.title}</span>
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="material-grid" aria-label="UNITEC product pilots">
          {panels.map((guide, index) => {
            const product = guide.product!;
            return (
              <article className="material-card" key={guide.slug}>
                <Link to={`/guides/${guide.slug}`} className={`material-image material-image-${product.geometry}`} aria-label={`Open ${product.category} 3D guide`}>
                  <img src={product.imageUrl} alt={`Official UNITEC catalogue view of ${product.category}`} />
                  <span className="material-index">0{index + 1}</span>
                  <span className="material-open"><Box size={16} /> Open 3D guide <ArrowRight size={16} /></span>
                </Link>
                <div className="material-card-body">
                  <div className="material-brand"><span>{product.brand} / SKU {product.sku}</span><span>FICHA TÉCNICA VERIFIED</span></div>
                  <h2>{product.category}</h2>
                  <p>{guide.subtitle}</p>
                  <dl className="material-specs">
                    <div><dt>Module</dt><dd>{product.widthCm} × {product.heightCm} cm</dd></div>
                    <div><dt>Thickness</dt><dd>{product.thicknessMm} mm</dd></div>
                    <div><dt>Unit coverage</dt><dd>{product.coveragePerUnitM2} m²</dd></div>
                    <div><dt>Package</dt><dd>{product.unitsPerPack} units · {product.packCoverageM2} m²</dd></div>
                  </dl>
                  <div className="material-card-actions">
                    <Link className="primary-button" to={`/guides/${guide.slug}`}>Train in 3D <ArrowRight size={16} /></Link>
                    <a className="icon-button" href={product.technicalSheetUrl} target="_blank" rel="noreferrer" aria-label={`Open official UNITEC technical sheet for ${product.category}`} title="Open official UNITEC Ficha Técnica PDF"><ExternalLink size={17} /></a>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="fidelity-ledger">
          <div className="fidelity-ledger-heading"><p className="mono-kicker">FIDELITY LEDGER</p><h2>Official UNITEC specs.<br />True-scale 3D physics.</h2></div>
          <div className="fidelity-ledger-grid">
            <article><Check size={19} /><h3>Official Ficha Técnica rules</h3><p>Surface cleaning, isopropyl alcohol / mild soap rules, cutting tools, 2 clips/m spacing (FT_15), and 6 mm expansion gaps (FT_03) come directly from UNITEC’s Technical Data Sheets.</p></article>
            <article><Check size={19} /><h3>PEGATEC Mounting Adhesive (FT_27)</h3><p>Polyurethane adhesive setup (Pegatec White 395 ml / Clear 300 ml, 45° nozzle cut, continuous beads, S-pattern or evenly spaced dots, 30-second press) is integrated across all panel guides.</p></article>
            <article><Check size={19} /><h3>Physical surface interpretation</h3><p>True-scale geometry and PBR lighting use official catalogue imagery: rectified Choco Mix wood flutes, UV clear-coat Eclipse marble veining, and Vainilla synthetic leather upholstery.</p></article>
            <article><Check size={19} /><h3>3D Human + Robot Simulator</h3><p>Open the 3D Simulator (/simulator) to watch a full articulated human worker execute every cleaning, priming, gluing, hanging, and precision knife-plus-straightedge cutting motion.</p></article>
          </div>
        </section>
      </main>
    </div>
  );
}
