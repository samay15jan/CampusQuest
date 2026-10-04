import PlayerCard from "./PlayerCard.jsx";
import StatTiles from "./StatTiles.jsx";
import { OWNERS } from "../../theme.js";

export default function PlayerProfile({ account, team, onOpenLeaderboard, onSettings }) {
  const accent = OWNERS[team].color;
  const profile = account?.profile || {};
  const stats = account?.stats || {};
  const player = {
    username: profile.username || account?.username || "Agent",
    level: account?.level ?? 1,
    xp: account?.xp ?? 0,
    nextXp: account?.xp_for_next_level ?? 100,
    stats: {
      portals: stats.portals ?? stats.portals_captured ?? 0,
      links: stats.links ?? 0,
      missions: stats.missions ?? 0,
    },
  };
  const rank = account?.stats?.global_rank ?? "–";

  return (
    <div
      className="fixed inset-0 z-[15] overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] text-white"
      style={{ background: `radial-gradient(90% 40% at 100% 0%, ${accent}33, transparent 60%), linear-gradient(180deg,#0a0c16,#05060b)` }}
    >
      <header className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      </header>

      <PlayerCard player={player} team={team} onEdit={() => console.log("TODO: edit profile")} />
      <StatTiles stats={player.stats} rank={rank} onOpenLeaderboard={onOpenLeaderboard} />
    </div>
  );
}