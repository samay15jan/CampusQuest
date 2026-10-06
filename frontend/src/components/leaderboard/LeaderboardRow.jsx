import Avatar from "../ui/Avatar.jsx";
import RankBadge from "./RankBadge.jsx";
import { OWNERS } from "../../theme.js";

const PODIUM_TINT = { 1: "#ffb020", 2: "#94a3b8", 3: "#ff7a1a" };

export default function LeaderboardRow({ player, isMe }) {
  const teamColor = OWNERS[player.faction]?.color || "#64748b";
  const tint = PODIUM_TINT[player.rank];

  let style = {};
  if (isMe) style = { background: `linear-gradient(90deg, ${teamColor}66, ${teamColor}26)`, borderColor: teamColor };
  else if (tint) style = { background: `${tint}1f`, borderColor: `${tint}55` };

  return (
    <li
      className={`grid grid-cols-[2.5rem_1fr_3rem_4.25rem] items-center rounded-lg border px-2 py-1.5 ${isMe || tint ? "" : "border-transparent"}`}
      style={style}
      aria-current={isMe ? "true" : undefined}
    >
      <span className="flex justify-center"><RankBadge rank={player.rank} /></span>
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={player.username} size={36} ring={teamColor} />
        <span className="min-w-0 truncate text-[15px] font-medium">{player.username}</span>
      </span>
      <span className="text-center text-sm text-slate-300">{player.level}</span>
      <span className="text-right text-sm font-semibold">{Number(player.points).toLocaleString()}</span>
    </li>
  );
}
