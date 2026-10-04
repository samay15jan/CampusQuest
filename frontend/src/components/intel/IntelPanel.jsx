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

export default function IntelPanel({ portals, onSelect, accent }) {
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
      <div role="tablist" className="grid grid-cols-1 border-b border-white/10">
        {tabBtn("locations", "Locations", "pin")}
      </div>

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
    </section>
  );
}