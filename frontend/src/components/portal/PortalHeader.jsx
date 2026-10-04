import Icon from "../ui/Icon.jsx";
import OwnerBadge from "../ui/OwnerBadge.jsx";
import { OWNERS } from "../../theme.js";

export default function PortalHeader({ portal, accent, onBack, onNavigate, showBadge = false }) {
  const o = OWNERS[portal.owner];
  return (
    <header className="flex items-center gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
      <button onClick={onBack} aria-label="Back"><Icon name="back" size={24} /></button>
      {showBadge && <OwnerBadge owner={portal.owner} size={40} />}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-bold">{portal.name}</h1>
        <p className="text-xs text-mute">Lv {portal.lvl} <span style={{ color: o.color }}>• {o.label}</span></p>
      </div>
      <button
        onClick={() => onNavigate?.(portal)}
        aria-label="Navigate"
        className="grid h-10 w-10 place-items-center rounded-full border"
        style={{ borderColor: accent, color: accent }}
      >
        <Icon name="navigate" size={18} />
      </button>
    </header>
  );
}