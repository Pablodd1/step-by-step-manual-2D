import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  FolderOpen,
  Layers,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  calculateUnitecMaterial,
  calculateWallpaper,
  defaultCalculatorInput,
  type CalculatorInput,
  type PatternMatch,
  type UnitecPanelInput,
  type UnitecSku,
} from "@contracts/calculator";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";

export default function CalculatorPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "unitec" ? "unitec" : "wallpaper";
  const initialSkuParam = searchParams.get("sku");
  const initialSku: UnitecSku =
    initialSkuParam === "14121211" || initialSkuParam === "14126406"
      ? initialSkuParam
      : "14122019";

  const methodFromUrl =
    searchParams.get("method") === "peel-and-stick" ? "peel-and-stick" : "paste-the-wall";

  const [calcTab, setCalcTab] = useState<"wallpaper" | "unitec">(initialTab);

  const [input, setInput] = useState<CalculatorInput>(() => ({
    ...defaultCalculatorInput,
    method: methodFromUrl,
    rollWidthCm: methodFromUrl === "peel-and-stick" ? 61 : 52,
  }));

  const [unitecInput, setUnitecInput] = useState<UnitecPanelInput>(() => ({
    sku: initialSku,
    wallWidthCm: 360,
    wallHeightCm: 255,
    openingsAreaSqM: 0,
    wastePercent: 10,
  }));

  const [estimateName, setEstimateName] = useState("Main feature wall");
  const [saveFeedback, setSaveFeedback] = useState("");
  const { user, switchProfile } = useAuth();
  const utils = trpc.useUtils();
  const savedEstimates = trpc.calculator.listMine.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const saveMutation = trpc.calculator.saveEstimate.useMutation({
    onSuccess: (record) => {
      setSaveFeedback(`Saved "${record.name}" (${record.result.recommendedRolls} rolls).`);
      void utils.calculator.listMine.invalidate();
    },
  });

  const deleteMutation = trpc.calculator.deleteEstimate.useMutation({
    onSuccess: () => {
      void utils.calculator.listMine.invalidate();
    },
  });

  const outcome = useMemo(() => {
    try {
      return { result: calculateWallpaper(input), error: null };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Check the measurements and roll dimensions.",
      };
    }
  }, [input]);

  const unitecOutcome = useMemo(() => {
    try {
      return { result: calculateUnitecMaterial(unitecInput), error: null };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Check wall dimensions.",
      };
    }
  }, [unitecInput]);

  const updateNumber = (key: keyof CalculatorInput, raw: string) => {
    const parsed = raw === "" ? 0 : Number(raw);
    setSaveFeedback("");
    setInput((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const updateUnitecNumber = (key: keyof Omit<UnitecPanelInput, "sku">, raw: string) => {
    const parsed = raw === "" ? 0 : Number(raw);
    setUnitecInput((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const reset = () => {
    setSaveFeedback("");
    setInput({
      ...defaultCalculatorInput,
      method: input.method,
      rollWidthCm: input.method === "peel-and-stick" ? 61 : 52,
    });
  };

  const saveEstimate = (event: FormEvent) => {
    event.preventDefault();
    setSaveFeedback("");
    saveMutation.mutate({
      name: estimateName.trim() || "Untitled wall",
      input,
    });
  };

  const loadEstimate = (savedInput: CalculatorInput, name: string) => {
    setInput(savedInput);
    setEstimateName(name);
    setSaveFeedback(`Loaded "${name}".`);
  };

  return (
    <div className="site-shell calculator-page">
      <SiteHeader />

      <main className="calculator-main">
        <div className="calculator-intro">
          <div>
            <p className="mono-kicker acid-text">ROLL, REPEAT & UNITEC PANEL CALCULATOR</p>
            <h1>
              {calcTab === "unitec"
                ? "Count every panel, clip and cartridge."
                : "Count full drops, not wishful square metres."}
            </h1>
          </div>
          <p>
            {calcTab === "unitec"
              ? "Calculates exact UNITEC USA panel modules, concealed fastener clips (Ref. 14122902), neutral-cure adhesive cartridges, and factory packs from official catalog dimensions."
              : "Wallpaper is hung in vertical strips. This calculator converts wall width into drops, rounds each drop up to the pattern repeat, and tells you how many complete drops each roll can actually deliver."}
          </p>
        </div>

        <div className="calculator-mode-tabs" role="tablist" aria-label="Calculator type">
          <button
            type="button"
            role="tab"
            aria-selected={calcTab === "wallpaper"}
            className={calcTab === "wallpaper" ? "active" : ""}
            onClick={() => setCalcTab("wallpaper")}
          >
            Wallcovering Roll & Pattern Calculator
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={calcTab === "unitec"}
            className={calcTab === "unitec" ? "active" : ""}
            onClick={() => setCalcTab("unitec")}
          >
            <Layers size={15} /> UNITEC USA Panel & Sheet Estimator (3 SKUs)
          </button>
        </div>

        {calcTab === "unitec" ? (
          <div className="calculator-workspace">
            <form className="calculator-form" onSubmit={(e) => e.preventDefault()} noValidate>
              <div className="form-section">
                <div className="form-section-header">
                  <span>01 / UNITEC USA SKU</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setUnitecInput({
                        sku: unitecInput.sku,
                        wallWidthCm: 360,
                        wallHeightCm: 255,
                        openingsAreaSqM: 0,
                        wastePercent: 10,
                      })
                    }
                  >
                    <RotateCcw size={14} /> Reset defaults
                  </button>
                </div>

                <div className="method-cards" role="radiogroup" aria-label="UNITEC SKU">
                  <button
                    type="button"
                    className={unitecInput.sku === "14122019" ? "active" : ""}
                    onClick={() => setUnitecInput((c) => ({ ...c, sku: "14122019" }))}
                  >
                    <strong>SKU 14122019 · WPC Choco Mix</strong>
                    <span>16 × 295 cm · 25 mm fluted panel + Clip 14122902</span>
                  </button>
                  <button
                    type="button"
                    className={unitecInput.sku === "14121211" ? "active" : ""}
                    onClick={() => setUnitecInput((c) => ({ ...c, sku: "14121211" }))}
                  >
                    <strong>SKU 14121211 · Mármol Eclipse M-11</strong>
                    <span>122 × 244 cm · 3 mm UV high-gloss PVC sheet</span>
                  </button>
                  <button
                    type="button"
                    className={unitecInput.sku === "14126406" ? "active" : ""}
                    onClick={() => setUnitecInput((c) => ({ ...c, sku: "14126406" }))}
                  >
                    <strong>SKU 14126406 · DuoSmall Vainilla 820</strong>
                    <span>20 × 110 cm · 25 mm upholstered arch module</span>
                  </button>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span>02 / WALL DIMENSIONS & RESERVE</span>
                  <small>Measure the widest and tallest points of the installation zone</small>
                </div>
                <div className="field-grid">
                  <label>
                    <span>Wall width (cm)</span>
                    <input
                      type="number"
                      min={30}
                      max={5000}
                      value={unitecInput.wallWidthCm}
                      onChange={(e) => updateUnitecNumber("wallWidthCm", e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Wall height (cm)</span>
                    <input
                      type="number"
                      min={50}
                      max={1200}
                      value={unitecInput.wallHeightCm}
                      onChange={(e) => updateUnitecNumber("wallHeightCm", e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Reserve / offcut allowance (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={35}
                      value={unitecInput.wastePercent}
                      onChange={(e) => updateUnitecNumber("wastePercent", e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </form>

            <aside className="calculation-result" aria-live="polite">
              {unitecOutcome.result && (
                <>
                  <p className="mono-kicker">UNITEC USA MATERIAL TAKEOFF</p>
                  <div className="roll-callout">
                    <strong>{unitecOutcome.result.recommendedUnits}</strong>
                    <div>
                      <span>units recommended with {unitecInput.wastePercent}% reserve</span>
                      <small>
                        {unitecOutcome.result.unitsNeeded} net units · {unitecOutcome.result.packsRecommended}{" "}
                        factory pack(s) of {unitecOutcome.result.packSize}
                      </small>
                    </div>
                  </div>

                  <dl className="result-metrics">
                    <div>
                      <dt>Selected SKU</dt>
                      <dd>UNITEC {unitecOutcome.result.sku}</dd>
                    </div>
                    <div>
                      <dt>Module size</dt>
                      <dd>{unitecOutcome.result.dimensionsLabel}</dd>
                    </div>
                    <div>
                      <dt>Concealed clips (14122902)</dt>
                      <dd>
                        {unitecOutcome.result.clipsRecommended > 0
                          ? `${unitecOutcome.result.clipsRecommended} pcs`
                          : "N/A (Adhesive bond)"}
                      </dd>
                    </div>
                    <div>
                      <dt>Adhesive cartridges</dt>
                      <dd>{unitecOutcome.result.adhesiveTubesRecommended} tubes</dd>
                    </div>
                    <div>
                      <dt>Wall area</dt>
                      <dd>{unitecOutcome.result.grossWallAreaSqM} m²</dd>
                    </div>
                    <div>
                      <dt>Ref. catalog total</dt>
                      <dd>
                        ${unitecOutcome.result.estimatedCostCop.toLocaleString("en-US")} COP (~$
                        {unitecOutcome.result.estimatedCostUsd} USD)
                      </dd>
                    </div>
                  </dl>

                  <div className="formula-breakdown">
                    <h2>How PLUMB calculated this UNITEC takeoff</h2>
                    <ol>
                      {unitecOutcome.result.steps.map((step) => (
                        <li key={step.label}>
                          <div>
                            <strong>{step.label}</strong>
                            <span>{step.formula}</span>
                          </div>
                          <b>{step.value}</b>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="calculator-warnings">
                    {unitecOutcome.result.warnings.map((warning) => (
                      <p key={warning}>
                        <AlertTriangle size={15} />
                        <span>{warning}</span>
                      </p>
                    ))}
                  </div>

                  <div className="result-actions">
                    <Link
                      className="primary-button"
                      to={
                        unitecInput.sku === "14122019"
                          ? "/guides/unitec-wpc-choco-mix"
                          : unitecInput.sku === "14121211"
                          ? "/guides/unitec-marble-eclipse"
                          : "/guides/unitec-duosmall-vainilla"
                      }
                    >
                      Open 2D/3D SKU Guide <ArrowRight size={16} />
                    </Link>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => window.print()}
                    >
                      <Printer size={16} /> Print takeoff
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>
        ) : (
          <div className="calculator-workspace">
            <form className="calculator-form" onSubmit={(event) => event.preventDefault()} noValidate>
              <div className="form-section">
                <div className="form-section-header">
                  <span>01 / METHOD</span>
                  <button type="button" className="text-button" onClick={reset}>
                    <RotateCcw size={14} /> Reset defaults
                  </button>
                </div>

                <div className="method-cards" role="radiogroup" aria-label="Wallpaper type">
                  <button
                    type="button"
                    className={input.method === "paste-the-wall" ? "active" : ""}
                    onClick={() =>
                      setInput((current) => ({ ...current, method: "paste-the-wall", rollWidthCm: 52 }))
                    }
                  >
                    <strong>Paste-the-wall</strong>
                    <span>Dry non-woven drops into pasted wall bands</span>
                  </button>
                  <button
                    type="button"
                    className={input.method === "peel-and-stick" ? "active" : ""}
                    onClick={() =>
                      setInput((current) => ({ ...current, method: "peel-and-stick", rollWidthCm: 61 }))
                    }
                  >
                    <strong>Peel-and-stick</strong>
                    <span>Self-adhesive panels with backing liner</span>
                  </button>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span>02 / WALL MEASUREMENTS</span>
                  <small>Use the widest and tallest points</small>
                </div>

                <div className="field-grid">
                  <label>
                    <span>Wall width (cm)</span>
                    <input
                      type="number"
                      min={30}
                      max={5000}
                      value={input.wallWidthCm}
                      onChange={(event) => updateNumber("wallWidthCm", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Tallest wall height (cm)</span>
                    <input
                      type="number"
                      min={50}
                      max={1200}
                      value={input.wallHeightCm}
                      onChange={(event) => updateNumber("wallHeightCm", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Doors / windows area (m²)</span>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      step={0.1}
                      value={input.openingsAreaSqM}
                      onChange={(event) => updateNumber("openingsAreaSqM", event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span>03 / ROLL LABEL</span>
                  <small>Copy these values from your product label</small>
                </div>

                <div className="field-grid">
                  <label>
                    <span>Roll width (cm)</span>
                    <input
                      type="number"
                      min={20}
                      max={160}
                      value={input.rollWidthCm}
                      onChange={(event) => updateNumber("rollWidthCm", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Roll length (cm)</span>
                    <input
                      type="number"
                      min={200}
                      max={5000}
                      value={input.rollLengthCm}
                      onChange={(event) => updateNumber("rollLengthCm", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Pattern repeat (cm)</span>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={input.patternRepeatCm}
                      onChange={(event) => updateNumber("patternRepeatCm", event.target.value)}
                    />
                  </label>
                </div>

                <div className="field-grid">
                  <label>
                    <span>Pattern match</span>
                    <select
                      value={input.patternMatch}
                      onChange={(event) =>
                        setInput((current) => ({
                          ...current,
                          patternMatch: event.target.value as PatternMatch,
                        }))
                      }
                    >
                      <option value="free">Free match (0 repeat rounding)</option>
                      <option value="straight">Straight match</option>
                      <option value="offset">Offset / half-drop match</option>
                    </select>
                  </label>
                  <label>
                    <span>Top + bottom trim (cm)</span>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={input.trimAllowanceCm}
                      onChange={(event) => updateNumber("trimAllowanceCm", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Order reserve (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={35}
                      value={input.wastePercent}
                      onChange={(event) => updateNumber("wastePercent", event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </form>

            <aside className="calculation-result" aria-live="polite">
              {outcome.error && (
                <div className="calculation-error" role="alert">
                  <AlertTriangle size={22} />
                  <div>
                    <h2>Adjustment needed</h2>
                    <p>{outcome.error}</p>
                  </div>
                </div>
              )}

              {outcome.result && (
                <>
                  <p className="mono-kicker">ORDER SUMMARY</p>
                  <div className="roll-callout">
                    <strong>{outcome.result.recommendedRolls}</strong>
                    <div>
                      <span>rolls recommended with {input.wastePercent}% reserve</span>
                      <small>{outcome.result.baseRolls} minimum rolls before reserve</small>
                    </div>
                  </div>

                  <dl className="result-metrics">
                    <div>
                      <dt>Working drops</dt>
                      <dd>{outcome.result.effectiveDropsNeeded}</dd>
                    </div>
                    <div>
                      <dt>Cut length / drop</dt>
                      <dd>{outcome.result.cutLengthCm} cm</dd>
                    </div>
                    <div>
                      <dt>Drops / roll</dt>
                      <dd>{outcome.result.dropsPerRoll}</dd>
                    </div>
                    <div>
                      <dt>Total strip length</dt>
                      <dd>{outcome.result.linearMetersRequired} m</dd>
                    </div>
                    <div>
                      <dt>Net wall area</dt>
                      <dd>{outcome.result.netWallAreaSqM} m²</dd>
                    </div>
                    <div>
                      <dt>Expected offcut</dt>
                      <dd>{outcome.result.estimatedWastePercent}%</dd>
                    </div>
                  </dl>

                  <div className="formula-breakdown">
                    <h2>How PLUMB calculated this</h2>
                    <ol>
                      {outcome.result.steps.map((step) => (
                        <li key={step.label}>
                          <div>
                            <strong>{step.label}</strong>
                            <span>{step.formula}</span>
                          </div>
                          <b>{step.value}</b>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {outcome.result.warnings.length > 0 && (
                    <div className="calculator-warnings">
                      {outcome.result.warnings.map((warning) => (
                        <p key={warning}>
                          <AlertTriangle size={15} />
                          <span>{warning}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="result-actions">
                    <Link className="primary-button" to={`/guides/${input.method}`}>
                      Open {input.method} guide <ArrowRight size={16} />
                    </Link>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => window.print()}
                    >
                      <Printer size={16} /> Print estimate
                    </button>
                  </div>

                  <p className="result-check">
                    <CheckCircle2 size={14} /> Order all rolls from the same batch / dye lot and keep
                    one offcut for future repairs.
                  </p>
                </>
              )}
            </aside>
          </div>
        )}

        <section className="save-estimate" aria-labelledby="save-estimate-heading">
          <div>
            <p className="mono-kicker acid-text">SAVED ROOM ESTIMATES</p>
            <h2 id="save-estimate-heading">Keep this wall on your job sheet.</h2>
            <p>
              Save named room calculations so you can compare roll widths, repeats and reserve
              allowances before ordering.
            </p>
          </div>

          {user ? (
            <form className="save-estimate-form" onSubmit={saveEstimate}>
              <label>
                <span>Room or wall name</span>
                <input
                  value={estimateName}
                  maxLength={80}
                  onChange={(event) => setEstimateName(event.target.value)}
                  placeholder="North bedroom feature wall"
                />
              </label>
              <button
                className="primary-button"
                type="submit"
                disabled={!outcome.result || saveMutation.isPending}
              >
                <Bookmark size={16} />
                {saveMutation.isPending ? "Saving…" : "Save estimate"}
              </button>
              {saveMutation.error && (
                <p className="inline-error" role="alert">
                  <AlertCircle size={15} />
                  {saveMutation.error.message}
                </p>
              )}
              {saveFeedback && (
                <p className="success-message" role="status">
                  {saveFeedback}
                </p>
              )}
            </form>
          ) : (
            <div className="signin-callout">
              <p>Switch to a Demo User profile to store room estimates.</p>
              <button className="primary-button" onClick={() => switchProfile("admin")}>
                Activate Demo Profile <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>

        {user && (
          <section className="saved-estimates" aria-labelledby="saved-estimates-heading">
            <div className="section-heading compact">
              <div>
                <p className="mono-kicker">ACCOUNT ARCHIVE</p>
                <h2 id="saved-estimates-heading">Saved wall calculations</h2>
              </div>
            </div>

            {savedEstimates.data && savedEstimates.data.length === 0 && (
              <p className="muted-copy">No saved wall estimates yet. Save the current calculation above.</p>
            )}

            {savedEstimates.data && savedEstimates.data.length > 0 && (
              <div className="saved-estimate-grid">
                {savedEstimates.data.map((item) => (
                  <article key={item.id} className="saved-estimate-card">
                    <div>
                      <span className="mono-kicker">{item.method}</span>
                      <h3>{item.name}</h3>
                      <p>
                        {item.input.wallWidthCm} × {item.input.wallHeightCm} cm ·{" "}
                        <strong>{item.result.recommendedRolls} rolls</strong> ({item.result.cutLengthCm}{" "}
                        cm drops)
                      </p>
                    </div>
                    <div className="saved-estimate-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => loadEstimate(item.input, item.name)}
                      >
                        <FolderOpen size={15} /> Load
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Delete ${item.name}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate({ id: item.id })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="calculator-footnote">
          <p>
            This estimate is a planning tool. Unusual room shapes, murals, wide-width commercial goods,
            multiple walls and directional patterns can change the roll or panel count—verify against
            the manufacturer’s technical sheet before purchasing.
          </p>
        </footer>
      </main>
    </div>
  );
}
