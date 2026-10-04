import Icon from "../ui/Icon.jsx";
import LocationIcon from "../ui/LocationIcon.jsx";

/** Portal photo, or a glowing icon placeholder when the location has no photo yet. */
export default function PortalHero({ portal, accent, showDistance = false, className = "h-[250px]" }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#2a2f45] to-[#0c0e16] ${className}`}>
      {portal.img ? (
        <img src={portal.img} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center" style={{ background: `radial-gradient(circle at 50% 45%, ${accent}44, transparent 62%)` }}>
          <svg viewBox="0 0 200 200" className="absolute h-[85%] opacity-60" aria-hidden="true" style={{ color: accent }}>
            {[88, 64, 40].map((r, i) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeOpacity={0.5 - i * 0.12} strokeDasharray={i ? "3 5" : "0"} />)}
          </svg>
          <LocationIcon name={portal.icon} size={104} strokeWidth={1.3} className="relative" style={{ color: accent, filter: `drop-shadow(0 0 14px ${accent})` }} />
        </div>
      )}
      {showDistance && portal.dist && (
        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0b0d16]/80 px-3 py-1 text-xs backdrop-blur">
          <Icon name="pin" size={14} style={{ color: accent }} />{portal.dist}
        </span>
      )}
    </div>
  );
}