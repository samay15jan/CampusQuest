import Icon from "../ui/Icon.jsx";
import OwnerBadge from "../ui/OwnerBadge.jsx";
import { SectionTitle } from "../ui/Panel.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";
import PortalHeader from "../portal/PortalHeader.jsx";
import PortalHero from "../portal/PortalHero.jsx";
import PortalStats, { PointValue } from "../portal/PortalStats.jsx";
import { GREEN } from "../../theme.js";
import { ALLOWED_RANGE } from "./verify.js";

const REQUIREMENTS = [
  ["Be at the location", `Within ${ALLOWED_RANGE} meters`],
  ["Take a live photo", "Camera capture required"],
];

export default function PortalBrief({ portal, accent, onBack, onCapture }) {
  return (
    <div className="relative flex h-full flex-col">
      <PortalHeader portal={portal} accent={accent} onBack={onBack} showBadge />

      <div className="flex-1 overflow-y-auto pb-28">
        <PortalHero portal={portal} accent={accent} showDistance />

        <div className="-mt-3 rounded-t-2xl bg-[#0a0c14] px-4 pt-4">
          <div className="flex items-center gap-3">
            <OwnerBadge owner={portal.owner} size={40} />
            <h2 className="font-display text-xl font-bold">{portal.name}</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{portal.description}</p>

          <PortalStats portal={portal} className="mt-4" />
          <PointValue xp={portal.xp} />

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