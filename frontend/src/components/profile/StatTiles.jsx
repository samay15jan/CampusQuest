import Icon from "../ui/Icon.jsx";
import { RED, BLUE } from "../../theme.js";

function Tile({ icon, color, value, label, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.03] px-1 py-3 active:brightness-125">
      <Icon name={icon} size={24} style={{ color }} />
      <p className="mt-2 font-display text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-mute">{label}</p>
    </Tag>
  );
}

export default function StatTiles({ stats, rank, onOpenLeaderboard }) {
  return (
    <div className="mt-5 grid grid-cols-4 gap-2.5 px-4">
      <Tile icon="crystal" color={RED} value={stats.portals} label="Portals" />
      <Tile icon="link" color={BLUE} value={stats.links} label="Links" />
      <Tile icon="clip" color="#cbd5e1" value={stats.missions} label="Missions" />
      <Tile icon="bars" color={RED} value={`#${rank}`} label="Global Rank" onClick={onOpenLeaderboard} />
    </div>
  );
}