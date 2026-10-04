import { useState } from "react";
import Icon from "../ui/Icon.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";
import AnswerOption from "./AnswerOption.jsx";

export default function RiddleQuestion({ question, accent, index, total, onBack, onSubmit, submitting }) {
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!selected || submitting) return;
    setMessage("");
    const result = await onSubmit(selected);
    if (result?.correct === false) {
      setMessage("Not quite. Try another answer.");
      setSelected(null);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} aria-label="Back"><Icon name="back" size={24} /></button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold">Daily Riddle</h1>
            <p className="text-xs text-mute">{index} / {total}</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${(index / total) * 100}%`, background: accent }} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-5">
        <section className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#1b2030] to-[#0b0d16] px-6 py-10 text-center">
          <p className="relative text-xl leading-8">{question.question}</p>
          <p className="relative mt-5 font-display text-lg font-semibold">Which portal is this?</p>
          <p className="mt-2 text-xs uppercase tracking-wider text-mute">{question.difficulty}</p>
        </section>

        <div role="radiogroup" aria-label="Answers" className="mt-4 space-y-2.5">
          {question.options.map((option, i) => (
            <AnswerOption
              key={option}
              letter={"ABCD"[i]}
              label={option}
              accent={accent}
              state={selected === option ? "selected" : "idle"}
              onClick={() => { setSelected(option); setMessage(""); }}
            />
          ))}
        </div>

        {message && <p role="status" className="mt-3 text-center text-sm" style={{ color: "#ff6b6b" }}>{message}</p>}
      </div>

      <BottomAction>
        <PrimaryButton accent={accent} disabled={!selected || submitting} onClick={submit}>
          {submitting ? "Checking…" : "Submit Answer"}
        </PrimaryButton>
      </BottomAction>
    </div>
  );
}
