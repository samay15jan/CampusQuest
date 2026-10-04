import Icon from "../ui/Icon.jsx";
import { OWNERS } from "../../theme.js";

/** Floating card for the portal you're standing at. Only shown on the plain map view. */
export default function CurrentPortal({ portal, onClick }) {
  const o = OWNERS[portal.owner];
  return (
    <button
      onClick={onClick}
      className="absolute inset-x-2 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-10 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b0d16]/90 p-2 text-left backdrop-blur"
    >
      <img src={portal.img} alt="" className="h-12 w-14 rounded-md bg-[#14161f] object-cover" />
      <span className="flex-1">
        <span className="block text-sm font-semibold">{portal.name}</span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: o.color }}>
          <span className="h-2 w-2 rounded-full" style={{ background: o.color }} /> {o.label}
          <span className="text-mute">{portal.resonators?.total ?? 0}/3 resonators</span>
        </span>
      </span>
      <Icon name="chevron" size={16} className="text-mute" />
    </button>
  );
}