import Icon from "../ui/Icon.jsx";
import PlayerCard from "./PlayerCard.jsx";
import StatTiles from "./StatTiles.jsx";
import ProfileActivity from "./ProfileActivity.jsx";
import Achievements from "./Achievements.jsx";
import { OWNERS } from "../../theme.js";
import { PLAYER, ME, rankPlayers } from "../../data/mock.js";

/** Profile tab page. Sits above the map, below the bottom nav. */
export default function PlayerProfile({ team, onOpenLeaderboard, onSettings }) {
  const accent = OWNERS[team].color;
  const rank = rankPlayers("global").find((p) => p.name === ME)?.rank ?? "–";

  return (
    <div
      className="fixed inset-0 z-[15] overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] text-white"
      style={{ background: `radial-gradient(90% 40% at 100% 0%, ${accent}33, transparent 60%), linear-gradient(180deg,#0a0c16,#05060b)` }}
    >
      <header className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      </header>

      <PlayerCard player={PLAYER} team={team} onEdit={() => console.log("TODO: edit profile")} />
      <StatTiles stats={PLAYER.stats} rank={rank} onOpenLeaderboard={onOpenLeaderboard} />
      <ProfileActivity />
      <Achievements />
    </div>
  );
}