import Icon from "../ui/Icon.jsx";
import OwnerBadge from "../ui/OwnerBadge.jsx";
import { OWNERS } from "../../theme.js";

export default function LocationCard({ portal, onSelect }) {
  const o = OWNERS[portal.owner];
  return (
    <button
      onClick={() => onSelect(portal)}
      className="flex w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0d16] text-left active:brightness-125"
    >
      <div className="relative h-[92px] w-[150px] shrink-0 bg-gradient-to-br from-[#3a3f55] to-[#14161f]">
        {portal.img && <img src={portal.img} alt="" className="h-full w-full object-cover" />}
        <span className="absolute left-1.5 top-1.5"><OwnerBadge owner={portal.owner} size={30} /></span>
      </div>
      <div className="flex flex-1 items-stretch justify-between p-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-bold">{portal.name}</p>
          <p className="mt-0.5 text-sm text-slate-300">{portal.dist}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: o.color }}>
            <span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: o.color }} />
            {o.label}
          </p>
        </div>
        <div className="flex flex-col items-end justify-between text-mute">
          <Icon name="chevron" size={18} className="text-white" />
          <span className="text-xs">Lv {portal.lvl}</span>
        </div>
      </div>
    </button>
  );
}