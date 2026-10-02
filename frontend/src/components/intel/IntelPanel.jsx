import { useState } from "react";
import Icon from "../ui/Icon.jsx";
import LocationCard from "./LocationCard.jsx";
import { BLUE, RED, NEUTRAL } from "../../theme.js";

const FILTERS = [
  { id: "all", label: "All", color: RED },
  { id: "red", label: "Red", color: RED },
  { id: "blue", label: "Blue", color: BLUE },
  { id: "neutral", label: "Neutral", color: NEUTRAL },
];

const LAYERS = [
  { id: "portals", label: "Portals" },
  { id: "links", label: "Links" },
  { id: "territories", label: "Territories" },
];

function Toggle({ on, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`h-6 w-11 rounded-full p-0.5 transition ${on ? "bg-[#2f7bff]" : "bg-white/15"}`}
    >
      <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

/** Bottom sheet over the map: Locations list + Map Layers toggles. */
export default function IntelPanel({ portals, onSelect, accent, layers, onLayersChange }) {
  const [tab, setTab] = useState("locations");
  const [filter, setFilter] = useState("all");

  const list = filter === "all" ? portals : portals.filter((p) => p.owner === filter);

  const tabBtn = (id, label, icon) => {
    const on = tab === id;
    return (
      <button
        role="tab"
        aria-selected={on}
        onClick={() => setTab(id)}
        className="flex items-center justify-center gap-2.5 border-b-2 py-3 font-display text-sm font-bold uppercase tracking-wide"
        style={{ borderColor: on ? accent : "transparent", color: on ? "#fff" : "#8a8fa0", background: on ? `${accent}14` : "transparent" }}
      >
        <Icon name={icon} size={20} style={{ color: on ? accent : undefined }} />
        {label}
      </button>
    );
  };

  return (
    <section className="fixed inset-x-0 bottom-0 z-10 flex h-[58dvh] flex-col rounded-t-2xl border-t border-white/10 bg-[#07080d]/95 pb-[calc(4.5rem+env(safe-area-inset-bottom))] backdrop-blur">
      <div role="tablist" className="grid grid-cols-2 border-b border-white/10">
        {tabBtn("locations", "Locations", "pin")}
        {tabBtn("layers", "Map Layers", "layers")}
      </div>

      {tab === "locations" ? (
        <>
          <div className="grid grid-cols-4 gap-2 px-3 py-3">
            {FILTERS.map((f) => {
              const on = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={on}
                  className="rounded-lg border py-2 text-sm"
                  style={{ borderColor: on ? f.color : "rgba(255,255,255,.12)", background: on ? `${f.color}22` : "transparent", color: on ? "#fff" : f.id === "all" ? "#fff" : f.color }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">
            {list.map((p) => <LocationCard key={p.id} portal={p} onSelect={onSelect} />)}
            {list.length === 0 && <p className="py-8 text-center text-sm text-mute">No locations here yet.</p>}
          </div>
        </>
      ) : (
        <ul className="divide-y divide-white/10 px-4">
          {LAYERS.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-4 text-sm">
              {l.label}
              <Toggle label={l.label} on={layers[l.id]} onChange={(v) => onLayersChange({ ...layers, [l.id]: v })} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}