import { useEffect, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import type { GuideStep } from "@contracts/guide";

interface SafetyGateProps {
  step: GuideStep;
  stepNumber: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SafetyGate({ step, stepNumber, onCancel, onConfirm }: SafetyGateProps) {
  const [checked, setChecked] = useState<boolean[]>(() => step.gate?.checks.map(() => false) ?? []);
  const dialogRef = useRef<HTMLDivElement>(null);
  const allChecked = checked.length > 0 && checked.every(Boolean);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if (event.key === "Tab" && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>("button, input, [tabindex='0']");
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onCancel]);

  if (!step.gate) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="safety-dialog" role="dialog" aria-modal="true" aria-labelledby="safety-title" tabIndex={-1} ref={dialogRef}>
        <button className="icon-button dialog-close" onClick={onCancel} aria-label="Close safety check"><X size={20} /></button>
        <ShieldCheck size={32} className="acid-icon" aria-hidden="true" />
        <p className="mono-kicker">STEP {String(stepNumber).padStart(2, "0")} / SAFETY GATE</p>
        <h2 id="safety-title">{step.gate.title}</h2>
        <p>{step.gate.body}</p>
        <div className="safety-checks">
          {step.gate.checks.map((label, index) => (
            <label key={label} className="check-row">
              <input
                type="checkbox"
                checked={checked[index] ?? false}
                onChange={() => setChecked((current) => current.map((value, item) => item === index ? !value : value))}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button className="primary-button full-width" disabled={!allChecked} onClick={onConfirm}>
          Confirm and continue <ShieldCheck size={18} />
        </button>
        <p className="dialog-footnote">Confirmation records your acknowledgement in this session only. It does not certify the wall or replace professional assessment.</p>
      </div>
    </div>
  );
}
