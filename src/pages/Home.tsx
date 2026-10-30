import { useState } from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Layers,
  Ruler,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { guideTotalDuration } from "@contracts/guide";
import { unitecPanelGuides } from "@contracts/guides/unitec-panels";
import { SiteHeader } from "@/components/SiteHeader";
import { trpc } from "@/lib/trpc";

type LibraryFilter = "all" | "wallpaper" | "unitec";

export default function Home() {
  const { data: approvedGuides, isLoading, error, refetch } = trpc.guides.listApproved.useQuery();
  const [filter, setFilter] = useState<LibraryFilter>("all");

  const showWallpaper = filter === "all" || filter === "wallpaper";
  const showUnitec = filter === "all" || filter === "unitec";

  return (
    <div className="site-shell">
      <SiteHeader />

      <main>
        <section className="home-hero">
          <div className="hero-copy">
            <p className="mono-kicker acid-text">
              2D BLUEPRINT & 3D FIELD MANUAL / UNITEC USA EDITION
            </p>
            <h1>
              Hang straight.
              <span> Read the label first.</span>
            </h1>
            <p className="hero-lead">
              PLUMB turns wallcovering and UNITEC architectural panel installation into a calm,
              verifiable sequence: inspect the wall, establish true plumb, calculate real drops and
              panel modules, and rehearse every step in synchronized <strong>2D CAD Blueprint</strong>,{" "}
              <strong>3D Drawing</strong>, and <strong>3D Realistic</strong> modes before adhesive or
              clips touch the surface.
            </p>

            <div className="hero-actions">
              <Link className="primary-button" to="/simulator">
                3D Task Simulator (36 steps) <ArrowRight size={17} />
              </Link>
              <Link className="secondary-button" to="/guides/paste-the-wall">
                2D/3D Field Guide
              </Link>
              <Link className="secondary-button" to="/materials">
                UNITEC 3-Material Pilot
              </Link>
              <Link className="secondary-button" to="/calculator">
                <Calculator size={17} /> Roll & Panel Calculator
              </Link>
            </div>

            <dl className="hero-stats" aria-label="Guide overview">
              <div>
                <dt>05</dt>
                <dd>Interactive 2D/3D manuals</dd>
              </div>
              <div>
                <dt>03</dt>
                <dd>View modes: 2D CAD · Drawing · PBR</dd>
              </div>
              <div>
                <dt>100%</dt>
                <dd>Label-priority notices</dd>
              </div>
            </dl>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="blueprint-card">
              <div className="blueprint-label">
                <span>WALL ELEVATION / 2D CAD + 3D ORBIT</span>
                <span>SCALE 1:25 · TRUE PLUMB</span>
              </div>
              <div className="blueprint-room">
                <div className="blueprint-plumb">
                  <span>PLUMB</span>
                </div>
                <div className="blueprint-drop drop-one">
                  <span>01</span>
                  <small>52 CM</small>
                </div>
                <div className="blueprint-drop drop-two">
                  <span>02</span>
                  <small>MATCH</small>
                </div>
                <div className="blueprint-drop drop-three">
                  <span>03</span>
                  <small>CUT</small>
                </div>
                <div className="blueprint-outlet">
                  <span>OFF</span>
                </div>
              </div>
              <div className="blueprint-footer">
                <span>1.SURFACE</span>
                <span>2.PLUMB</span>
                <span>3.BOND</span>
                <span>4.SMOOTH</span>
                <span>5.TRIM</span>
              </div>
            </div>
          </div>
        </section>

        <section className="guide-library" aria-labelledby="library-heading">
          <div className="section-heading">
            <div>
              <p className="mono-kicker">VERIFIED 2D + 3D INSTALLATION GUIDES</p>
              <h2 id="library-heading">Choose the material on your work table.</h2>
            </div>
            <div className="library-filter-pills" role="group" aria-label="Filter installation guides">
              <button
                type="button"
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
              >
                All Systems ({(approvedGuides?.length ?? 2) + unitecPanelGuides.length})
              </button>
              <button
                type="button"
                className={filter === "wallpaper" ? "active" : ""}
                onClick={() => setFilter("wallpaper")}
              >
                Wallcoverings ({approvedGuides?.length ?? 2})
              </button>
              <button
                type="button"
                className={filter === "unitec" ? "active" : ""}
                onClick={() => setFilter("unitec")}
              >
                UNITEC USA Panels ({unitecPanelGuides.length})
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="library-state" role="status" aria-live="polite">
              <span className="skeleton-line" />
              <p>Loading approved guides from the field library…</p>
            </div>
          )}

          {error && (
            <div className="library-state error" role="alert">
              <AlertCircle size={20} />
              <div>
                <strong>Approved guides could not be loaded.</strong>
                <p>{error.message}</p>
              </div>
              <button className="secondary-button" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}

          <div className="guide-grid">
            {showWallpaper &&
              approvedGuides?.map((record, index) => {
                const guide = record.data;
                const duration = Math.round(guideTotalDuration(guide));
                return (
                  <article key={guide.slug} className="guide-card">
                    <div className="guide-card-top">
                      <span className="guide-index">
                        0{index + 1} / APPROVED V{record.version}
                      </span>
                      <span className="method-pill">
                        {guide.method === "paste-the-wall" ? "NON-WOVEN DRY HANG" : "SELF-ADHESIVE"}
                      </span>
                    </div>

                    <h3>{guide.title}</h3>
                    <p>{guide.description}</p>

                    <div className="guide-metrics">
                      <span>
                        <Clock size={14} /> ~{guide.estimatedMinutes} min room time
                      </span>
                      <span>
                        <Users size={14} /> {guide.people} {guide.people === 1 ? "person" : "people"}
                      </span>
                      <span>
                        <Ruler size={14} /> {guide.steps.length} steps · {duration}s 2D/3D sequence
                      </span>
                    </div>

                    <ol className="mini-steps" aria-label={`${guide.title} sample steps`}>
                      {guide.steps.slice(0, 4).map((step, stepIndex) => (
                        <li key={step.id}>
                          <span>{String(stepIndex + 1).padStart(2, "0")}</span>
                          <strong>{step.shortTitle}</strong>
                        </li>
                      ))}
                    </ol>

                    <div className="guide-card-actions">
                      <Link className="primary-button" to={`/guides/${guide.slug}`}>
                        Launch 2D/3D Guide <ArrowRight size={16} />
                      </Link>
                      <Link
                        className="text-button"
                        to={`/calculator?method=${guide.method}`}
                      >
                        Calculate rolls
                      </Link>
                    </div>
                  </article>
                );
              })}

            {showUnitec &&
              unitecPanelGuides.map((guide, index) => {
                const profile = guide.product!;
                const duration = Math.round(guideTotalDuration(guide));
                return (
                  <article key={guide.slug} className="guide-card unitec-guide-card">
                    <div className="guide-card-top">
                      <span className="guide-index">
                        U0{index + 1} / UNITEC SKU {profile.sku}
                      </span>
                      <span className="method-pill">
                        {profile.widthCm}×{profile.heightCm} CM · {profile.thicknessMm} MM
                      </span>
                    </div>

                    <div className="unitec-card-preview">
                      <img src={profile.imageUrl} alt={guide.title} loading="lazy" />
                      <div>
                        <span className="mono-kicker">{profile.category}</span>
                        <h3>{guide.title}</h3>
                      </div>
                    </div>

                    <p>{guide.description}</p>

                    <div className="guide-metrics">
                      <span>
                        <Clock size={14} /> ~{guide.estimatedMinutes} min room time
                      </span>
                      <span>
                        <Layers size={14} /> 2D Blueprint + 3D PBR
                      </span>
                      <span>
                        <Sparkles size={14} /> {guide.steps.length} steps · {duration}s sequence
                      </span>
                    </div>

                    <div className="guide-card-actions">
                      <Link className="primary-button" to={`/guides/${guide.slug}`}>
                        Launch 2D/3D Guide <ArrowRight size={16} />
                      </Link>
                      <Link
                        className="text-button"
                        to={`/calculator?tab=unitec&sku=${profile.sku}`}
                      >
                        Estimate panels
                      </Link>
                      <a
                        className="text-button"
                        href={profile.technicalSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        SKU <ExternalLink size={12} />
                      </a>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>

        <section className="discipline-strip" aria-labelledby="discipline-heading">
          <div className="discipline-intro">
            <p className="mono-kicker acid-text">SAFETY AND ACCURACY BOUNDARIES</p>
            <h2 id="discipline-heading">Built to guide hands, not to overrule the product sheet.</h2>
          </div>

          <div className="discipline-grid">
            <div>
              <ShieldCheck size={20} className="acid-icon" />
              <h3>Safety gates</h3>
              <p>
                Steps involving surface readiness, compatibility and electrical plates pause for an
                explicit checklist before the timeline advances.
              </p>
            </div>
            <div>
              <FileCheck2 size={20} className="acid-icon" />
              <h3>Source-backed steps</h3>
              <p>
                Every step links back to Graham & Brown, Spoonflower, Wallcoverings Association,
                York Wallcoverings, and official UNITEC USA SKU catalog pages.
              </p>
            </div>
            <div>
              <CheckCircle2 size={20} className="acid-icon" />
              <h3>Transparent math</h3>
              <p>
                The calculator shows every formula for wallpaper drops, repeats, WPC panels,
                concealed clips (Ref. 14122902), UV marble sheets, and upholstered modules.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
