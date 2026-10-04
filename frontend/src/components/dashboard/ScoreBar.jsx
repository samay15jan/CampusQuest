import useCountdown from "../utils/useCountdown.js";
import { RED, BLUE } from "../../theme.js";

const Unit = ({ v, l }) => (
  <div className="text-center">
    <div className="font-display text-xl font-bold leading-none">{v}</div>
    <div className="mt-1 text-[9px] uppercase text-mute">{l}</div>
  </div>
);

export default function ScoreBar({ event }) {
  if (!event) return null;

  const active = event.event?.status === "active";
  const seconds = active ? event.seconds_remaining : event.seconds_until_start;
  const endMs = event.server_time
    ? new Date(event.server_time).getTime() + Math.max(0, seconds ?? 0) * 1000
    : Date.now() + Math.max(0, seconds ?? 0) * 1000;
  const [h, m, s] = useCountdown(endMs);
  const red = event.scores?.red ?? 0;
  const blue = event.scores?.blue ?? 0;
  const total = red + blue;
  const rp = total > 0 ? Math.round((red / total) * 100) : 50;

  return (
    <div className="absolute inset-x-2 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-xl border border-white/10 bg-gradient-to-r from-[#2a0a10] via-[#0b0d16] to-[#0a1a3a] p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[11px] font-bold tracking-wider" style={{ color: RED }}>RED</p>
          <p className="font-display text-2xl font-black">{red.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase text-mute">{active ? "Event ends in" : "Event starts in"}</p>
          <div className="mt-1 flex items-start gap-1.5">
            <Unit v={h} l="Hrs" /><span className="font-display text-xl">:</span>
            <Unit v={m} l="Mins" /><span className="font-display text-xl">:</span>
            <Unit v={s} l="Secs" />
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-[11px] font-bold tracking-wider" style={{ color: BLUE }}>BLUE</p>
          <p className="font-display text-2xl font-black">{blue.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-mute">
        <span>{event.game_open ? "Game open" : "Game closed"}</span>
        <span>{event.portals_open ? "Portals open" : "Portals closed"}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span style={{ color: RED }}>{rp}%</span>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div style={{ width: `${rp}%`, background: RED }} />
          <div className="flex-1" style={{ background: BLUE }} />
        </div>
        <span style={{ color: BLUE }}>{100 - rp}%</span>
      </div>
    </div>
  );
}