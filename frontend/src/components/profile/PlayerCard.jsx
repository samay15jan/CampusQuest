import Avatar from "../ui/Avatar.jsx";
import Icon from "../ui/Icon.jsx";
import { BLUE, OWNERS } from "../../theme.js";
import { TAGLINES } from "../../data/mock.js";

export default function PlayerCard({ player, team, onEdit }) {
  const o = OWNERS[team];
  const pct = Math.min(100, (player.xp / player.nextXp) * 100);

  return (
    <section className="px-5 pt-4">
      <div className="flex items-center gap-5">
        <Avatar name={player.username} size={128} ring={o.color} glow />
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <span className="truncate">{player.username}</span>
            <button onClick={onEdit} aria-label="Edit profile" className="text-slate-300"><Icon name="edit" size={16} /></button>
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: o.color }}>
            <Icon name="shield" size={18} />{o.team}
          </p>
          <p className="mt-1 text-sm text-mute">Lv {player.level}</p>
          <div className="mt-1.5 h-2 rounded-full bg-white/10" role="progressbar" aria-valuenow={player.xp} aria-valuemax={player.nextXp}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: BLUE, boxShadow: `0 0 8px ${BLUE}` }} />
          </div>
          <p className="mt-1.5 text-right text-xs text-mute">{player.xp.toLocaleString()} / {player.nextXp.toLocaleString()} XP</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-mute">{TAGLINES[team]}</p>
    </section>
  );
}