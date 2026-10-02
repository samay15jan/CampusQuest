import Icon from "../ui/Icon.jsx";
import OwnerBadge from "../ui/OwnerBadge.jsx";
import { SectionTitle } from "../ui/Panel.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";
import { GREEN, OWNERS } from "../../theme.js";
import { ALLOWED_RANGE } from "./verify.js";

const REQUIREMENTS = [
  ["Be at the location", `Within ${ALLOWED_RANGE} meters`],
  ["Take a live photo", "Camera capture required"],
];

export default function PortalBrief({ portal, accent, onBack, onCapture }) {
  const o = OWNERS[portal.owner];
  const deployed = portal.resonators.filter(Boolean).length;
  const slots = portal.resonators.length;

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <button onClick={onBack} aria-label="Back"><Icon name="back" size={24} /></button>
        <OwnerBadge owner={portal.owner} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold">{portal.name}</h1>
          <p className="text-xs text-mute">Lv {portal.lvl} <span style={{ color: o.color }}>• {o.label}</span></p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: accent, color: accent }}>
          <Icon name="navigate" size={18} />
        </span>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="relative h-[250px] bg-gradient-to-br from-[#3a3f55] to-[#14161f]">
          {portal.img && <img src={portal.img} alt="" className="h-full w-full object-cover" />}
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0b0d16]/80 px-3 py-1 text-xs backdrop-blur" style={{ color: accent }}>
            <Icon name="clock" size={13} /><span className="text-white">{portal.dist}</span>
          </span>
        </div>

        <div className="-mt-3 rounded-t-2xl bg-[#0a0c14] px-4 pt-4">
          <div className="flex items-center gap-3">
            <OwnerBadge owner={portal.owner} size={40} />
            <h2 className="font-display text-xl font-bold">{portal.name}</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{portal.description}</p>

          <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
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
              <p className="mt-1.5 font-display text-lg font-bold" style={{ color: o.color }}>{deployed} / {slots}</p>
              <div className="mt-1 flex gap-1">
                {portal.resonators.map((r, i) => <span key={i} className="h-1 flex-1 rounded-full" style={{ background: r ? o.color : "rgba(255,255,255,.15)" }} />)}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] uppercase text-mute">Point value</p>
            <p className="mt-2 flex items-center gap-2 font-display text-base font-bold" style={{ color: "#ffb020" }}>
              <span className="grid h-7 w-7 place-items-center rounded-md bg-[#ff7a1a] text-[10px] font-black text-white">XP</span>+{portal.xp} XP
            </p>
          </div>

          <div className="mt-5">
            <SectionTitle icon="shield" accent={accent}>Requirements</SectionTitle>
            <ul className="space-y-3">
              {REQUIREMENTS.map(([t, s]) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full text-black" style={{ background: GREEN }}><Icon name="check" size={18} /></span>
                  <span><span className="block text-sm font-semibold">{t}</span><span className="block text-xs text-mute">{s}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <BottomAction><PrimaryButton icon="camera" accent={accent} onClick={onCapture}>Capture Portal</PrimaryButton></BottomAction>
    </div>
  );
}