import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Check, Save } from "lucide-react";
import { guideSchema, type Guide, type GuideStep } from "@contracts/guide";

type GuideEditorProps = {
  guide: Guide;
  version: number;
  onSave: (guide: Guide) => void;
  isSaving: boolean;
  saveError?: string;
  saveMessage?: string;
};

export function GuideEditor({ guide, version, onSave, isSaving, saveError, saveMessage }: GuideEditorProps) {
  const [draft, setDraft] = useState<Guide>(() => structuredClone(guide));
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setDraft(structuredClone(guide));
    setValidationError("");
  }, [guide, version]);

  function update<K extends keyof Guide>(key: K, value: Guide[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setValidationError("");
  }

  function updateStep<K extends keyof GuideStep>(index: number, key: K, value: GuideStep[K]) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, [key]: value } : step),
    }));
    setValidationError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = guideSchema.safeParse(draft);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setValidationError(`${issue?.path.join(".") || "Guide"}: ${issue?.message ?? "Check this field."}`);
      return;
    }
    onSave(parsed.data);
  }

  return (
    <form className="guide-editor" onSubmit={submit}>
      <div className="editor-heading">
        <div><p className="mono-kicker acid-text">AUTHORITATIVE GUIDE DATA / V{version}</p><h2>Edit the field sequence.</h2><p>Text, timing and callouts saved here become the interactive player, print sheet and fixed-frame video after approval.</p></div>
        <button className="primary-button" type="submit" disabled={isSaving}><Save size={17} />{isSaving ? "Saving…" : "Save draft"}</button>
      </div>
      {(validationError || saveError) && <p className="inline-error" role="alert"><AlertCircle size={16} />{validationError || saveError}</p>}
      {saveMessage && <p className="success-message" role="status"><Check size={16} />{saveMessage}</p>}

      <fieldset>
        <legend>Guide overview</legend>
        <div className="editor-field-grid">
          <label className="wide-field"><span>Title</span><input value={draft.title} maxLength={140} onChange={(event) => update("title", event.target.value)} /></label>
          <label className="wide-field"><span>Short subtitle</span><input value={draft.subtitle} maxLength={220} onChange={(event) => update("subtitle", event.target.value)} /></label>
          <label><span>Estimated minutes</span><input type="number" min={10} max={600} value={draft.estimatedMinutes} onChange={(event) => update("estimatedMinutes", Number(event.target.value))} /></label>
          <label><span>People</span><input type="number" min={1} max={4} value={draft.people} onChange={(event) => update("people", Number(event.target.value))} /></label>
          <label className="wide-field"><span>Description</span><textarea rows={4} value={draft.description} maxLength={1400} onChange={(event) => update("description", event.target.value)} /></label>
          <label className="wide-field"><span>Manufacturer-priority notice</span><textarea rows={3} value={draft.manufacturerNotice} maxLength={1000} onChange={(event) => update("manufacturerNotice", event.target.value)} /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Product assumptions</legend>
        <div className="editor-field-grid product-fields">
          <label className="wide-field"><span>Product / pattern name</span><input value={draft.pattern.name} onChange={(event) => update("pattern", { ...draft.pattern, name: event.target.value })} /></label>
          <label><span>Roll width (cm)</span><input type="number" min={1} value={draft.pattern.rollWidthCm} onChange={(event) => update("pattern", { ...draft.pattern, rollWidthCm: Number(event.target.value) })} /></label>
          <label><span>Roll length (cm)</span><input type="number" min={1} value={draft.pattern.rollLengthCm} onChange={(event) => update("pattern", { ...draft.pattern, rollLengthCm: Number(event.target.value) })} /></label>
          <label><span>Repeat (cm)</span><input type="number" min={0} value={draft.pattern.repeatCm} onChange={(event) => update("pattern", { ...draft.pattern, repeatCm: Number(event.target.value) })} /></label>
          <label><span>Match</span><select value={draft.pattern.match} onChange={(event) => update("pattern", { ...draft.pattern, match: event.target.value as Guide["pattern"]["match"] })}><option value="free">Free</option><option value="straight">Straight</option><option value="offset">Offset</option></select></label>
        </div>
      </fieldset>

      <div className="editor-steps-heading"><h2>Steps & scene directions</h2><span>{draft.steps.length} steps · {draft.steps.reduce((sum, step) => sum + step.duration, 0)} seconds</span></div>
      <div className="editor-step-list">
        {draft.steps.map((step, index) => (
          <details key={step.id} className="editor-step">
            <summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.title}</strong><small>{step.duration}s · {step.visual.action}</small></summary>
            <div className="editor-step-body">
              <div className="editor-field-grid">
                <label><span>Step title</span><input value={step.title} maxLength={120} onChange={(event) => updateStep(index, "title", event.target.value)} /></label>
                <label><span>Rail title</span><input value={step.shortTitle} maxLength={42} onChange={(event) => updateStep(index, "shortTitle", event.target.value)} /></label>
                <label><span>Duration (seconds)</span><input type="number" min={3} max={30} value={step.duration} onChange={(event) => updateStep(index, "duration", Number(event.target.value))} /></label>
                <label><span>Scene callout</span><input value={step.visual.callout} maxLength={90} onChange={(event) => updateStep(index, "visual", { ...step.visual, callout: event.target.value })} /></label>
                <label className="wide-field"><span>Primary instruction</span><textarea rows={3} value={step.instruction} maxLength={600} onChange={(event) => updateStep(index, "instruction", event.target.value)} /></label>
                <label className="wide-field"><span>Professional detail</span><textarea rows={4} value={step.detail} maxLength={1200} onChange={(event) => updateStep(index, "detail", event.target.value)} /></label>
                <label className="wide-field"><span>Narration</span><textarea rows={3} value={step.narration} maxLength={1000} onChange={(event) => updateStep(index, "narration", event.target.value)} /></label>
                <label className="wide-field"><span>Print caption</span><textarea rows={2} value={step.printCaption} maxLength={500} onChange={(event) => updateStep(index, "printCaption", event.target.value)} /></label>
                <label><span>Tools (comma separated)</span><input value={step.tools.join(", ")} onChange={(event) => updateStep(index, "tools", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
                <label><span>Materials (comma separated)</span><input value={step.materials.join(", ")} onChange={(event) => updateStep(index, "materials", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
                <label className="wide-field"><span>Warning (optional)</span><textarea rows={2} value={step.warning ?? ""} maxLength={500} onChange={(event) => updateStep(index, "warning", event.target.value || undefined)} /></label>
              </div>
              <p className="scene-inheritance">Scene action <strong>{step.visual.action}</strong> · tool <strong>{step.visual.tool}</strong> · camera <strong>{step.visual.camera.position.join(" / ")}</strong>. The validated visual timeline is preserved with this draft.</p>
            </div>
          </details>
        ))}
      </div>
      <div className="editor-footer"><p>{draft.sources.length} source records remain attached. Product-specific manufacturer instructions always take priority.</p><button className="primary-button" type="submit" disabled={isSaving}><Save size={17} />{isSaving ? "Saving…" : "Save all changes"}</button></div>
    </form>
  );
}
