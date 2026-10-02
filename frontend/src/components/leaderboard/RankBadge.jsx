import Icon from "../ui/Icon.jsx";

const PODIUM = { 1: "#ffb020", 2: "#cbd5e1", 3: "#ff7a1a" };

export default function RankBadge({ rank }) {
  const c = PODIUM[rank];
  if (!c) return <span className="w-8 text-center text-sm">{rank}</span>;
  return (
    <span className="relative grid h-8 w-8 place-items-center" style={{ color: c }} aria-label={`Rank ${rank}`}>
      <Icon name={rank === 1 ? "crown" : "shield"} size={28} />
      {rank !== 1 && <span className="absolute text-[10px] font-bold">{rank}</span>}
    </span>
  );
}