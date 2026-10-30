import { Link } from "react-router";
import { AlertTriangle, ArrowRight, Box, Check, ExternalLink, Layers3, ScanLine } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { unitecPanelGuides } from "@contracts/guides/unitec-panels";

export default function MaterialsPage() {
  const panels = unitecPanelGuides;

  return (
    <div className="site-shell materials-page">
      <SiteHeader />
      <main className="materials-main">
        <section className="materials-hero">
          <div>
            <p className="mono-kicker acid-text">UNITEC / THREE-MATERIAL FIDELITY PILOT</p>
            <h1>Real products.<br /><span>Different physics.</span></h1>
          </div>
          <div className="materials-hero-copy">
            <p>Three catalogue-backed lessons test the material pipeline where it matters: deep fluted relief, glossy large-format stone imagery, and soft upholstered geometry.</p>
            <div className="materials-proof"><span><ScanLine size={16} /> True published scale</span><span><Layers3 size={16} /> Shared 3D timeline</span><span><Box size={16} /> Print + 1080p export</span></div>
          </div>
        </section>

        <section className="approval-banner" aria-label="Pilot approval status">
          <AlertTriangle size={23} />
          <div><strong>Visual and layout training — installation approval still required.</strong><p>Official pages and reviewed sheets establish product identity, dimensions and selected components. They do not publish complete SKU-specific fixing, adhesive, curing or cleaning procedures. PLUMB keeps those steps gated instead of inventing them.</p></div>
        </section>

        <section className="material-grid" aria-label="UNITEC product pilots">
          {panels.map((guide, index) => {
            const product = guide.product!;
            return (
              <article className="material-card" key={guide.slug}>
                <Link to={`/guides/${guide.slug}`} className={`material-image material-image-${product.geometry}`} aria-label={`Open ${product.category} 3D pilot`}>
                  <img src={product.imageUrl} alt={`Official UNITEC catalogue view of ${product.category}`} />
                  <span className="material-index">0{index + 1}</span>
                  <span className="material-open"><Box size={16} /> Open 3D pilot <ArrowRight size={16} /></span>
                </Link>
                <div className="material-card-body">
                  <div className="material-brand"><span>{product.brand} / SKU {product.sku}</span><span>VISUAL PILOT</span></div>
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
                    <a className="icon-button" href={product.technicalSheetUrl} target="_blank" rel="noreferrer" aria-label={`Open related technical sheet for ${product.category}`} title="Related UNITEC technical sheet"><ExternalLink size={17} /></a>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="fidelity-ledger">
          <div className="fidelity-ledger-heading"><p className="mono-kicker">FIDELITY LEDGER</p><h2>What is source-backed.<br />What is reconstructed.</h2></div>
          <div className="fidelity-ledger-grid">
            <article><Check size={19} /><h3>Catalogue identity</h3><p>SKU, dimensions, packaging, application and base surface imagery come from UNITEC’s official product pages and related technical sheets.</p></article>
            <article><Check size={19} /><h3>Physical interpretation</h3><p>True-scale geometry and PBR lighting are reconstructed from the photographs. WPC uses a rectified catalogue wood face; Vainilla adds deterministic fine-fabric micro-detail.</p></article>
            <article><AlertTriangle size={19} /><h3>Not manufacturing CAD</h3><p>Flute spacing, radii and concealed details are visual interpretations. Obtain CAD or measured samples before fabrication-grade training.</p></article>
            <article><AlertTriangle size={19} /><h3>Not an approved method</h3><p>The seven-step sequence covers identification, layout, preparation gates, dry placement, alignment and inspection—not an authorised fixing recipe.</p></article>
          </div>
        </section>
      </main>
    </div>
  );
}
