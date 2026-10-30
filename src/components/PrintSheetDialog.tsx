import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, Printer, X } from "lucide-react";
import type { Guide } from "@contracts/guide";
import type { GuideEngine } from "@/scene/GuideEngine";

interface PrintSheetDialogProps {
  guide: Guide;
  engine: GuideEngine;
  onClose: () => void;
}

export function PrintSheetDialog({ guide, engine, onClose }: PrintSheetDialogProps) {
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setImages([]);
    setError("");
    const capture = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 30));
        for (let index = 0; index < guide.steps.length; index += 1) {
          if (cancelled) return;
          const image = engine.captureStep(index);
          if (cancelled) return;
          setImages((current) => [...current, image]);
          await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "The scene frames could not be captured.");
      }
    };
    void capture();
    return () => { cancelled = true; };
  }, [engine, guide]);

  const ready = images.length === guide.steps.length && !error;
  return (
    <div className="modal-backdrop print-dialog-backdrop">
      <div className="print-dialog" role="dialog" aria-modal="true" aria-labelledby="print-title" tabIndex={-1} ref={dialogRef}>
        <header className="export-dialog-header">
          <div><p className="mono-kicker">SCENE-MATCHED FIELD SHEETS</p><h2 id="print-title">Print the {guide.product ? "product training" : "installation"} sequence.</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close print sheets"><X size={20} /></button>
        </header>
        <div className="print-dialog-toolbar">
          <p>{ready ? `${guide.steps.length} frames captured from this guide's live scene.` : error || `Capturing frame ${Math.min(images.length + 1, guide.steps.length)} of ${guide.steps.length}…`}</p>
          <button className="primary-button" disabled={!ready} onClick={() => window.print()}>{ready ? <Printer size={18} /> : <LoaderCircle size={18} className="spin" />} Print {guide.steps.length} steps</button>
        </div>
        {error && <div className="warning-note"><AlertTriangle size={18} /><p>{error}</p></div>}
        <div className="print-sheet" data-testid="print-sheet">
          <section className="print-cover">
            <div className="print-cover-brand">PLUMB</div>
            <p className="mono-kicker">{guide.product ? `${guide.product.brand} VISUAL TRAINING PILOT / SKU ${guide.product.sku}` : "WALLCOVERING FIELD MANUAL"}</p>
            <h1>{guide.title}</h1>
            <p>{guide.subtitle}</p>
            <dl><div><dt>Method</dt><dd>{guide.method}</dd></div><div><dt>Steps</dt><dd>{guide.steps.length}</dd></div><div><dt>People</dt><dd>{guide.people}</dd></div><div><dt>Estimate</dt><dd>≈{guide.estimatedMinutes} min</dd></div></dl>
            <div className="print-notice"><strong>Manufacturer instructions take priority.</strong><p>{guide.manufacturerNotice}</p></div>
          </section>
          <div className="print-step-grid">
            {guide.steps.map((step, index) => (
              <article className="print-step-card" key={step.id}>
                <div className="print-step-image">
                  {images[index] ? <img src={images[index]} alt={`3D instruction frame for step ${index + 1}: ${step.title}`} /> : <div className="print-image-placeholder"><LoaderCircle className="spin" size={22} /></div>}
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="print-step-copy">
                  <p className="mono-kicker">STEP {String(index + 1).padStart(2, "0")} / {String(guide.steps.length).padStart(2, "0")}</p>
                  <h2>{step.title}</h2>
                  <p>{step.printCaption}</p>
                  {step.warning && <div className="print-warning"><strong>Check:</strong> {step.warning}</div>}
                  <div className="print-resources">
                    {step.tools.length > 0 && <p><strong>Tools</strong>{step.tools.join(" · ")}</p>}
                    {step.materials.length > 0 && <p><strong>Materials</strong>{step.materials.join(" · ")}</p>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <section className="print-sources"><h2>Sources & product scope</h2><p>{guide.manufacturerNotice}</p><ul>{guide.sources.map((source) => <li key={source.id}><strong>{source.publisher}</strong> — {source.title}<br /><span>{source.url}</span></li>)}</ul></section>
        </div>
      </div>
    </div>
  );
}
