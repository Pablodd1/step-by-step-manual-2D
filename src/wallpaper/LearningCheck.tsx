import { Check, CircleHelp, RotateCcw, X } from "lucide-react";
import type { WallpaperStep } from "./guide";
import { QualityComparison } from "./QualityComparison";

export function LearningCheck({ step, selected, onAnswer }: { step: WallpaperStep; selected?: number; onAnswer: (answer: number) => void }) {
  const answered = selected !== undefined;
  const correct = selected === step.checkpoint.answer;
  return (
    <section className="instruction-section learning-check" aria-labelledby={`checkpoint-${step.id}`}>
      <h3 id={`checkpoint-${step.id}`}>See the difference</h3>
      <QualityComparison operation={step.operation} accept={step.quality.accept} recheck={step.quality.recheck} />
      <div className="checkpoint-heading"><CircleHelp size={16} /><h3>Scenario check</h3><span>Not a site sign-off</span></div>
      <p className="checkpoint-prompt">{step.checkpoint.prompt}</p>
      <div className="checkpoint-options" role="group" aria-label={`Answers for ${step.title}`}>
        {step.checkpoint.options.map((option, index) => {
          const chosen = selected === index;
          const showCorrect = answered && index === step.checkpoint.answer;
          return <button key={option} className={`${chosen ? "chosen" : ""} ${showCorrect ? "correct" : ""} ${chosen && !correct ? "incorrect" : ""}`} onClick={() => onAnswer(index)} aria-pressed={chosen}>
            <span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{showCorrect && <Check size={15} />}{chosen && !correct && <X size={15} />}
          </button>;
        })}
      </div>
      {answered && <div className={`checkpoint-feedback ${correct ? "correct" : "incorrect"}`} role="status">
        {correct ? <Check size={17} /> : <RotateCcw size={17} />}
        <div><strong>{correct ? "Correct decision" : "Recheck the step"}</strong><p>{step.checkpoint.feedback}</p>{!correct && <small>You can choose another answer.</small>}</div>
      </div>}
    </section>
  );
}
