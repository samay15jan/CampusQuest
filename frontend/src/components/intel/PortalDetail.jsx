import { useState } from "react";
import Icon from "../ui/Icon.jsx";
import OwnerBadge from "../ui/OwnerBadge.jsx";
import ResonatorList from "./ResonatorList.jsx";
import ActivityList from "./ActivityList.jsx";
import { OWNERS } from "../../theme.js";

const TABS = [["overview", "Overview"], ["portal", "Portal"], ["activity", "Activity"]];

function Stat({ label, children }) {
  return (
    <div className="px-3 py-3">
      <p className="text-[11px] uppercase text-mute">{label}</p>
      <div className="mt-2 flex h-8 items-center">{children}</div>
    </div>
  );
}

/** Full-screen portal "Intel" page. */
export default function PortalDetail({ portal, accent, onBack, onNavigate }) {
  const [tab, setTab] = useState("overview");
  const o = OWNERS[portal.owner];
  const { done, total } = portal.capture;

  const stats = (
    <div className="mx-4 mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
      <Stat label="Current faction">
        <span className="flex items-center gap-2 text-sm" style={{ color: o.color }}>
          <Icon name="shield" size={22} />{o.team}
        </span>
      </Stat>
      <Stat label="Capture progress">
        <div className="w-full">
          <p className="font-display text-lg font-bold leading-none" style={{ color: o.color }}>{done} / {total}</p>
          <div className="mt-1.5 flex gap-1">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < done ? o.color : "rgba(255,255,255,.15)" }} />
            ))}
          </div>
        </div>
      </Stat>
      <Stat label="Point value">
        <span className="flex items-center gap-2 font-display text-sm font-bold" style={{ color: "#ffb020" }}>
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[#ff7a1a] text-[9px] font-black text-white">XP</span>
          +{portal.xp} XP
        </span>
      </Stat>
    </div>
  );

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[#05060b] text-white">
      {/* top bar */}
      <header className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} aria-label="Back"><Icon name="back" size={24} /></button>
          <h1 className="font-display text-lg font-bold uppercase tracking-wider">Intel</h1>
        </div>
        <div className="flex items-center gap-4">
          <button aria-label="Share"><Icon name="share" size={22} /></button>
          <button aria-label="More"><Icon name="dots" size={22} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* hero */}
        <div className="relative h-[210px] bg-gradient-to-br from-[#3a3f55] to-[#14161f]">
          {portal.img && <img src={portal.img} alt="" className="h-full w-full object-cover" />}
          <span className="absolute right-3 top-3 flex items-center gap-2 rounded-full border bg-[#0b0d16]/80 px-3 py-1.5 text-xs backdrop-blur" style={{ borderColor: o.color, color: o.color }}>
            <Icon name="tower" size={14} />{o.status}
          </span>
          <button aria-label="Locate on map" className="absolute -bottom-5 right-4 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-[#0b0d16]">
            <Icon name="navigate" size={20} />
          </button>
        </div>

        {/* identity */}
        <div className="-mt-1 flex items-center gap-3 px-4 pt-3">
          <OwnerBadge owner={portal.owner} size={56} />
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">{portal.name}</h2>
            <p className="text-sm text-mute">Lv {portal.lvl} <span className="mx-1" style={{ color: o.color }}>•</span><span style={{ color: o.color }}>{o.label}</span></p>
          </div>
          <span className="flex items-center gap-1 self-end pb-1 text-xs text-mute"><Icon name="clock" size={14} />{portal.dist}</span>
        </div>

        {/* tabs */}
        <div role="tablist" className="mx-4 mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-white/10">
          {TABS.map(([id, label]) => {
            const on = tab === id;
            return (
              <button key={id} role="tab" aria-selected={on} onClick={() => setTab(id)}
                className="border-b-2 py-3 font-display text-xs font-bold uppercase tracking-wider"
                style={{ borderColor: on ? accent : "transparent", background: on ? `${accent}26` : "transparent", color: on ? "#fff" : "#8a8fa0" }}>
                {label}
              </button>
            );
          })}
        </div>

        {tab === "overview" && (
          <>
            <p className="px-5 pt-4 text-sm leading-6 text-slate-300">{portal.description}</p>
            {stats}
            <ResonatorList resonators={portal.resonators} accent={accent} />
            <ActivityList items={portal.activity} accent={accent} limit={4} />
          </>
        )}
        {tab === "portal" && (<>{stats}<ResonatorList resonators={portal.resonators} accent={accent} /></>)}
        {tab === "activity" && <ActivityList items={portal.activity} accent={accent} />}
      </div>

      {/* sticky navigate button */}
      <div className="absolute inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => onNavigate?.(portal)}
          className="flex h-14 w-full items-center justify-between rounded-lg border border-white/20 px-6 font-display text-base font-bold shadow-[0_0_22px_rgba(255,59,59,.35)] active:brightness-125"
          style={{ background: `linear-gradient(90deg, ${accent}99, ${accent})` }}
        >
          <span className="flex flex-1 items-center justify-center gap-3"><Icon name="navigate" size={20} />Navigate</span>
          <span className="text-sm font-semibold">{portal.dist}</span>
        </button>
      </div>
    </div>
  );
}