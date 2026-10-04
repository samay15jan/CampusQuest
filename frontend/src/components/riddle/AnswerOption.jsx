import Icon from "../ui/Icon.jsx";

/** state: "idle" | "selected" | "out" (wrong guess or eliminated by the hint) */
export default function AnswerOption({ letter, label, state, accent, onClick }) {
  const selected = state === "selected";
  const out = state === "out";
  return (
    <button
      role="radio"
      aria-checked={selected}
      disabled={out}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border px-3 py-3.5 text-left transition disabled:cursor-not-allowed"
      style={{
        borderColor: selected ? accent : "rgba(255,255,255,.1)",
        background: selected ? `linear-gradient(90deg, ${accent}55, ${accent}22)` : "rgba(255,255,255,.03)",
        boxShadow: selected ? `0 0 14px ${accent}55` : "none",
        opacity: out ? 0.4 : 1,
      }}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/25 text-sm text-slate-300">{letter}</span>
      <span className={`flex-1 text-[15px] ${out ? "line-through" : ""}`}>{label}</span>
      {selected && <span className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ background: accent }}><Icon name="check" size={16} /></span>}
      {out && <Icon name="x" size={18} className="text-mute" />}
    </button>
  );
}