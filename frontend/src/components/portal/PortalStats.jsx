import Icon from "../ui/Icon.jsx";
import { OWNERS } from "../../theme.js";

/** Faction | Level | Resonators row. */
export default function PortalStats({ portal, className = "mt-3" }) {
  const o = OWNERS[portal.owner];
  const deployed = portal.resonators.filter(Boolean).length;
  const slots = portal.resonators.length;
  const mute = deployed === 0;

  return (
    <div className={`grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.03] ${className}`}>
      <div className="p-3">
        <p className="text-[11px] text-mute">Faction</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: o.color }}><Icon name="shield" size={18} />{o.team}</p>
      </div>
      <div className="p-3">
        <p className="text-[11px] text-mute">Level</p>
        <p className="mt-1.5 font-display text-2xl font-bold">{portal.lvl}</p>
      </div>
      <div className="p-3">
        <p className="text-[11px] text-mute">Resonators</p>
        <p className="mt-1.5 font-display text-lg font-bold" style={{ color: mute ? "#fff" : o.color }}>{deployed} / {slots}</p>
        <div className="mt-1 flex gap-1">
          {portal.resonators.map((r, i) => <span key={i} className="h-1 flex-1 rounded-full" style={{ background: r ? o.color : "rgba(255,255,255,.15)" }} />)}
        </div>
      </div>
    </div>
  );
}

export function PointValue({ xp, className = "mt-3" }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 ${className}`}>
      <p className="text-[11px] uppercase text-mute">Point value</p>
      <p className="mt-2 flex items-center gap-2 font-display text-base font-bold" style={{ color: "#ffb020" }}>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-[#ff7a1a] text-[10px] font-black text-white">XP</span>+{xp} XP
      </p>
    </div>
  );
}