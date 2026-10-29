import { ownerColor } from "../../theme.js";

const avatarSrc = (a) => (/^(red|blue)\d$/.test(a || "") ? `/avatars/${a}.jpg` : null);

export function PlayerAvatar({ name = "?", avatar, color, size = 32 }) {
  const src = avatarSrc(avatar);
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 font-display font-bold uppercase text-white"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38), boxShadow: `0 0 0 2px ${color}` }}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : name[0]}
    </span>
  );
}

const MEDALS = { 1: ["#f5c542", "#3a2a00"], 2: ["#c8d0dc", "#1d2430"], 3: ["#cd8a4b", "#2e1a08"] };

/** Round rank badge: gold / silver / bronze for the top 3, plain number after that. */
export function Medal({ rank, size = 28 }) {
  const m = MEDALS[rank];
  if (!m) return <span className="text-center font-display text-sm text-mute tabular-nums" style={{ width: size }}>{rank}</span>;
  return (
    <span
      className="grid place-items-center rounded-full font-display text-sm font-black"
      style={{ width: size, height: size, background: m[0], color: m[1], boxShadow: `0 0 12px ${m[0]}66` }}
    >
      {rank}
    </span>
  );
}

export function Stat({ label, value, sub, color = "#fff", className = "" }) {
  return (
    <div className={`rounded-xl border border-edge bg-panel/80 px-4 py-3 ${className}`}>
      <p className="font-display text-[10px] uppercase tracking-[0.2em] text-mute">{label}</p>
      <p className="mt-1 font-display text-2xl font-black leading-none tabular-nums" style={{ color }}>{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </div>
  );
}

export function Chip({ active, color, onClick, children, count }) {
  const c = color || "#ffffff";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-2 rounded-lg border px-3 py-1.5 font-display text-xs tracking-wide"
      style={active
        ? { borderColor: `${c}99`, background: `${c}1f`, color: "#fff" }
        : { borderColor: "transparent", color: "#7d8aa5" }}
    >
      {children}
      {count != null && <span className="rounded bg-white/10 px-1.5 text-[10px] text-slate-300 tabular-nums">{count}</span>}
    </button>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h3 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-slate-300">{children}</h3>
      {right}
    </div>
  );
}

/** Resonator slots: filled pips use the team that owns them, hollow pips are still free. */
export function Pips({ red = 0, blue = 0, total = 3, size = 14 }) {
  const slots = Array.from({ length: Math.max(total, red + blue) }, (_, i) => (i < red ? "red" : i < red + blue ? "blue" : null));
  return (
    <span className="inline-flex gap-1.5" role="img" aria-label={`${red + blue} of ${total} resonators`}>
      {slots.map((t, i) => (
        <span
          key={i}
          className="rounded-full border-2"
          style={{
            width: size, height: size,
            borderColor: t ? ownerColor(t) : "#3b475f",
            background: t ? ownerColor(t) : "transparent",
            boxShadow: t ? `0 0 8px ${ownerColor(t)}88` : "none",
          }}
        />
      ))}
    </span>
  );
}
