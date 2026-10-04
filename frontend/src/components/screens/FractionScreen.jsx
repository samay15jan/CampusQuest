import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HudBox, Label } from "../auth/Hud.jsx";
import { chooseFaction } from "../../api/account.js";
import { useAuth } from "../auth/AuthContext.jsx";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };

const FACTIONS = [
  {
    id: "red",
    name: "Red",
    motto: "Control through strength",
    perks: ["Bold moves", "Aggressive expansion", "Dominate territories"],
    text: "text-red",
    border: "#ff3b3b",
    inner: "bg-gradient-to-b from-[#1a0508] via-[#2a070b] to-[#5c0f14]",
    glow: "shadow-[0_0_28px_rgba(255,59,59,0.45)]",
    icon: <path d="M6 3 20 12 13 14l-3 7-2-9-2-9Z" fill="currentColor" stroke="none" />,
  },
  {
    id: "blue",
    name: "Blue",
    motto: "Knowledge creates power",
    perks: ["Strategic growth", "Coordinated play", "Build a stronger campus"],
    text: "text-blue",
    border: "#2f7bff",
    inner: "bg-gradient-to-b from-[#040b1a] via-[#071a3a] to-[#0c3a7a]",
    glow: "shadow-[0_0_28px_rgba(47,123,255,0.45)]",
    icon: <><circle cx="12" cy="12" r="8" strokeWidth="3" /><path d="M12 5v14M5 12h14" strokeWidth="2" /></>,
  },
];

const BENEFITS = [
  { label: "Exclusive challenges", icon: <path d="M12 3 4 7v6c0 4 3.5 6.5 8 8 4.5-1.5 8-4 8-8V7l-8-4Z" /> },
  { label: "Team leaderboards", icon: <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8L12 3Z" /> },
  { label: "Unique rewards", icon: <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /> },
];

export default function FactionScreen() {
  const navigate = useNavigate();
  const { updateAccount } = useAuth();
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <main className="flex min-h-dvh flex-col bg-ink px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <header className="flex items-start justify-between px-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="-ml-2 grid size-11 place-items-center text-blue focus-visible:outline-2 focus-visible:outline-white">
          <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <Label className="pt-2 text-right text-[10px] leading-5 text-mute">Two factions<br />One campus<br />Make your mark</Label>
      </header>

      <div className="mt-2 text-center">
        <HudBox cut={18} className="px-4 py-5">
          <h1 className="font-display text-base font-bold uppercase tracking-[0.24em]">Choose your faction</h1>
          <Label className="mt-2 text-[10px] tracking-[0.2em] text-mute">Once chosen, you fight for them</Label>
        </HudBox>
      </div>

      <div role="radiogroup" aria-label="Faction" className="mt-5 grid grid-cols-2 gap-3">
        {FACTIONS.map((f) => {
          const on = selected === f.id;
          return (
            <button
              key={f.id}
              role="radio"
              aria-checked={on}
              onClick={() => setSelected(f.id)}
              className={`text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${on ? f.glow : selected ? "opacity-50" : ""}`}
            >
              <HudBox border={f.border} cut={22} innerClass={f.inner} className="flex h-[400px] flex-col items-center px-3 pb-4 pt-8">
                <svg viewBox="0 0 24 24" width="76" height="76" {...stroke} className={f.text} aria-hidden="true">{f.icon}</svg>
                <h2 className={`mt-5 font-display text-xl font-bold tracking-[0.18em] ${f.text}`}>{f.name.toUpperCase()}</h2>
                <Label className="mt-2 text-center text-[10px] leading-4 tracking-[0.16em] text-slate-300">{f.motto}</Label>
                <ul className="mt-auto w-full space-y-2 text-[11px] uppercase tracking-[0.14em] text-slate-300">
                  {f.perks.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </HudBox>
            </button>
          );
        })}
      </div>

      <section className="mt-5" aria-label="Faction perks">
        <HudBox cut={16} className="px-3 py-4">
          <Label className="text-center text-[10px] tracking-[0.22em] text-slate-300">Faction perks</Label>
          <ul className="mt-4 grid grid-cols-3 divide-x divide-edge">
            {BENEFITS.map((b) => (
              <li key={b.label} className="flex flex-col items-center gap-2 px-1 text-center">
                <svg viewBox="0 0 24 24" width="28" height="28" {...stroke} className="text-slate-200" aria-hidden="true">{b.icon}</svg>
                <span className="text-[10px] uppercase tracking-[0.16em] text-mute">{b.label}</span>
              </li>
            ))}
          </ul>
        </HudBox>
      </section>

      {error && <p role="alert" className="mt-3 text-center text-sm text-red">{error}</p>}

      <button
        onClick={async () => {
          if (!selected || busy) return;
          setBusy(true);
          setError("");

          try {
            await chooseFaction(selected);
            updateAccount((current) => ({
              ...current,
              faction: selected,
              profile: { ...(current?.profile || {}), faction: selected },
              onboarding: { ...(current?.onboarding || {}), needs_faction: false, needs_profile: true, complete: false },
            }));
            navigate("/profile", { replace: true });
          } catch (err) {
            setError(err.status === 409 ? "Faction has already been chosen." : (err.message || "Couldn't choose faction."));
          } finally {
            setBusy(false);
          }
        }}
        disabled={!selected || busy}
        className="mt-auto block w-full pt-6 text-left disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <HudBox
          cut={16}
          border={selected === "red" ? "#ff3b3b" : selected === "blue" ? "#2f7bff" : "#1c2a44"}
          innerClass={selected === "red" ? "bg-[#4a0d12]" : selected === "blue" ? "bg-[#0c2b66]" : "bg-panel"}
        >
          <span className={`flex h-14 items-center justify-center gap-3 font-display text-xs font-bold uppercase tracking-[0.24em] ${selected ? "text-white" : "text-[#3a4a68]"}`}>
            {busy ? "Saving faction…" : "Confirm faction"}
            <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </span>
        </HudBox>
      </button>
    </main>
  );
}