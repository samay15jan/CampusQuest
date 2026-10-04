import { useState } from "react";
import Icon from "../ui/Icon.jsx";
import LocationIcon from "../ui/LocationIcon.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";
import AnswerOption from "./AnswerOption.jsx";

export default function RiddleQuestion({ question, icon, accent, onBack, onCorrect }) {
  const { riddle, options } = question;
  const [selected, setSelected] = useState(null);
  const [wrong, setWrong] = useState([]);
  const [hinted, setHinted] = useState(null); // option removed by the hint
  const [message, setMessage] = useState("");

  const isOut = (id) => wrong.includes(id) || hinted === id;
  const hintPool = options.filter((o) => !o.correct && !isOut(o.id));
  const canHint = !hinted && hintPool.length > 1;

  const revealHint = () => {
    if (!canHint) return;
    const pick = hintPool[Math.floor(Math.random() * hintPool.length)];
    setHinted(pick.id);
    if (selected === pick.id) setSelected(null);
    setMessage("Hint used: one wrong answer removed.");
  };

  const submit = () => {
    const opt = options.find((o) => o.id === selected);
    if (!opt) return;
    if (opt.correct) return onCorrect();
    setWrong((w) => [...w, opt.id]);
    setSelected(null);
    setMessage("Not quite. Try another answer.");
  };

  return (
    <div className="relative flex h-full flex-col">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} aria-label="Back"><Icon name="back" size={24} /></button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold">Portal Riddle</h1>
            <p className="text-xs text-mute">1 / 1</p>
          </div>
          <button
            onClick={revealHint}
            disabled={!canHint}
            aria-label="Use hint"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 disabled:opacity-40"
            style={{ color: canHint ? "#ffd54a" : undefined }}
          >
            <Icon name="bulb" size={22} />
          </button>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full w-full rounded-full" style={{ background: accent }} /></div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-5">
        <section className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#1b2030] to-[#0b0d16] px-6 py-10 text-center">
          <LocationIcon name={icon} size={150} strokeWidth={0.8} className="absolute left-1/2 top-4 -translate-x-1/2 opacity-[0.08]" style={{ color: accent }} />
          <p className="relative text-xl leading-8">{riddle}</p>
          <p className="relative mt-5 font-display text-lg font-semibold">What place am I?</p>
        </section>

        <div role="radiogroup" aria-label="Answers" className="mt-4 space-y-2.5">
          {options.map((o) => (
            <AnswerOption
              key={o.id}
              letter={o.id}
              label={o.label}
              accent={accent}
              state={isOut(o.id) ? "out" : selected === o.id ? "selected" : "idle"}
              onClick={() => { setSelected(o.id); setMessage(""); }}
            />
          ))}
        </div>

        {message && <p role="status" className="mt-3 text-center text-sm" style={{ color: hinted && !wrong.length ? "#ffd54a" : accent }}>{message}</p>}
      </div>

      <BottomAction><PrimaryButton accent={accent} disabled={!selected} onClick={submit}>Submit Answer</PrimaryButton></BottomAction>
    </div>
  );
}