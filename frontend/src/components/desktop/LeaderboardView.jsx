import { useMemo, useState } from "react";
import { RED, BLUE, ownerColor as teamColor } from "../../theme.js";
import { buildTeamStats, mergeRankings, fmt, cap } from "./derive.js";
import { PlayerAvatar, Medal, Stat, Chip, SectionTitle } from "./ui.jsx";

const TEAMS = ["red", "blue"];

/* ---------- banner: who is winning and by how much ---------- */
function TeamBanner({ s, other, lead }) {
  const c = teamColor(s.team);
  const winning = lead > 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-panel/90 p-5" style={{ borderColor: `${c}77`, boxShadow: `0 0 32px ${c}22, inset 0 0 40px ${c}10` }}>
      <div className="pointer-events-none absolute -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: `${c}33`, [s.team === "red" ? "left" : "right"]: -40 }} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.25em]" style={{ color: c }}>{s.team} team</p>
          <p className="mt-1 font-display text-5xl font-black leading-none text-white tabular-nums">{fmt(s.points)}</p>
          <p className="mt-1 text-sm text-mute">team points this week</p>
        </div>
        <span
          className="rounded-lg border px-3 py-1.5 font-display text-[11px] font-bold tracking-widest"
          style={winning
            ? { borderColor: `${c}aa`, color: c, background: `${c}1a` }
            : { borderColor: "#1c2a44", color: "#7d8aa5" }}
        >
          {winning ? `LEADING +${fmt(lead)}` : lead === 0 && s.points === other.points ? "TIED" : `TRAILING ${fmt(Math.abs(lead))}`}
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-4 gap-2 text-center">
        {[
          ["Players", fmt(s.players)],
          ["Avg pts", fmt(s.avg)],
          ["Portals", `${s.controlled}`],
          ["Resonators", `${s.resonators}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/[0.04] px-2 py-2">
            <p className="font-display text-lg font-black text-white tabular-nums">{v}</p>
            <p className="text-[11px] uppercase tracking-wider text-mute">{k}</p>
          </div>
        ))}
      </div>

      {s.leader && (
        <div className="relative mt-4 flex items-center gap-3 rounded-lg border border-white/5 bg-ink/50 px-3 py-2">
          <PlayerAvatar name={s.leader.username} avatar={s.leader.avatar} color={c} size={34} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[10px] uppercase tracking-[0.2em] text-mute">Team MVP</p>
            <p className="truncate font-semibold text-white">{s.leader.username}</p>
          </div>
          <p className="font-display font-bold text-white tabular-nums">{fmt(s.leader.points)}<span className="ml-1 text-xs text-mute">pts</span></p>
        </div>
      )}
    </div>
  );
}

function BattleBar({ red, blue }) {
  const total = red.points + blue.points;
  const rp = total ? Math.round((red.points / total) * 100) : 50;
  return (
    <div className="mt-3 rounded-xl border border-edge bg-panel/70 px-5 py-3">
      <div className="mb-1.5 flex justify-between font-display text-xs font-bold tracking-widest">
        <span style={{ color: RED }}>RED {rp}%</span>
        <span className="text-mute">SHARE OF TOTAL POINTS</span>
        <span style={{ color: BLUE }}>{100 - rp}% BLUE</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-0 transition-all duration-700" style={{ width: `${rp}%`, background: `linear-gradient(90deg, ${RED}, #ff6a6a)`, boxShadow: `0 0 12px ${RED}` }} />
        <div className="absolute inset-y-0 right-0 transition-all duration-700" style={{ width: `${100 - rp}%`, background: `linear-gradient(270deg, ${BLUE}, #5fa0ff)`, boxShadow: `0 0 12px ${BLUE}` }} />
        <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${rp}%` }} />
      </div>
    </div>
  );
}

/* ---------- podium: overall top 3 across both teams ---------- */
function Podium({ top }) {
  if (top.length === 0) return null;
  // visual order 2 · 1 · 3
  const order = [top[1], top[0], top[2]];
  const height = { 1: 150, 2: 116, 3: 96 };
  return (
    <section>
      <SectionTitle>Top Players · Both Teams</SectionTitle>
      <div className="grid grid-cols-3 items-end gap-4">
        {order.map((p, i) => {
          if (!p) return <div key={i} />;
          const c = teamColor(p.team);
          return (
            <div key={p.user_id} className="flex flex-col items-center">
              <PlayerAvatar name={p.username} avatar={p.avatar} color={c} size={p.overall === 1 ? 72 : 58} />
              <p className="mt-2 max-w-full truncate font-semibold text-white">{p.username}</p>
              <p className="text-xs text-mute">LV {p.level} · <span style={{ color: c }}>{cap(p.team)}</span></p>
              <div
                className="mt-2 flex w-full flex-col items-center justify-center rounded-t-xl border border-b-0"
                style={{ height: height[p.overall], borderColor: `${c}88`, background: `linear-gradient(180deg, ${c}33, ${c}08)` }}
              >
                <Medal rank={p.overall} size={34} />
                <p className="mt-2 font-display text-2xl font-black text-white tabular-nums">{fmt(p.points)}</p>
                <p className="text-[10px] uppercase tracking-widest text-mute">points</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- rows ---------- */
function PlayerRow({ r, team, rank, max, showTeam }) {
  const c = teamColor(team);
  const pct = max ? Math.max(3, Math.round((r.points / max) * 100)) : 0;
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-white/5 px-4 py-2.5 hover:bg-white/[0.03]">
      <span className="grid place-items-center"><Medal rank={rank} /></span>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar name={r.username} avatar={r.avatar} color={c} size={36} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-white">{r.username}</span>
            {showTeam && <span className="rounded px-1.5 py-px font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: c, background: `${c}22` }}>{team}</span>}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="text-[11px] text-mute">LV {r.level}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
            </span>
          </span>
        </span>
      </span>
      <span className="text-right font-display text-lg font-bold text-white tabular-nums">{fmt(r.points)}</span>
    </li>
  );
}

function TeamColumn({ s, rows, query }) {
  const c = teamColor(s.team);
  const max = rows[0]?.points ?? 0;
  const shown = query ? rows.filter((r) => r.username.toLowerCase().includes(query)) : rows;
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border bg-panel/80" style={{ borderColor: `${c}66` }}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 backdrop-blur" style={{ background: `${c}26` }}>
        <span className="font-display text-sm font-bold uppercase tracking-widest" style={{ color: c }}>{s.team} team</span>
        <span className="text-sm text-slate-200">{fmt(rows.length)} ranked <span className="text-mute">· {fmt(s.points)} pts</span></span>
      </div>
      <ol>
        {shown.map((r) => <PlayerRow key={r.user_id} r={r} team={s.team} rank={r.rank} max={max} />)}
        {shown.length === 0 && (
          <li className="border-t border-white/5 px-4 py-8 text-center text-sm text-mute">{query ? "No players match your search" : "No players yet"}</li>
        )}
      </ol>
    </div>
  );
}

function CombinedTable({ rows, query, max }) {
  const shown = query ? rows.filter((r) => r.username.toLowerCase().includes(query)) : rows;
  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-panel/80">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/5 px-4 py-3 backdrop-blur">
        <span className="font-display text-sm font-bold uppercase tracking-widest text-white">Overall ranking</span>
        <span className="text-sm text-mute">{fmt(rows.length)} players</span>
      </div>
      <ol>
        {shown.map((r) => <PlayerRow key={r.user_id} r={r} team={r.team} rank={r.overall} max={max} showTeam />)}
        {shown.length === 0 && (
          <li className="border-t border-white/5 px-4 py-8 text-center text-sm text-mute">{query ? "No players match your search" : "No players yet"}</li>
        )}
      </ol>
    </div>
  );
}

/* ---------- view ---------- */
export default function LeaderboardView({ data }) {
  const [team, setTeam] = useState("all");
  const [layout, setLayout] = useState("split");
  const [query, setQuery] = useState("");

  const portals = useMemo(() => data?.portals ?? [], [data]);
  const lb = useMemo(() => data?.leaderboard ?? { red: [], blue: [] }, [data]);
  const players = data?.players;

  const stats = useMemo(() => {
    const scores = data?.scores ?? { red: 0, blue: 0 };
    const ctx = { portals, leaderboard: lb, players, scores };
    return { red: buildTeamStats("red", ctx), blue: buildTeamStats("blue", ctx) };
  }, [data, portals, lb, players]);
  const merged = useMemo(() => mergeRankings(lb), [lb]);

  const q = query.trim().toLowerCase();
  const visibleTeams = team === "all" ? TEAMS : [team];
  const combined = team === "all" ? merged : merged.filter((r) => r.team === team);
  const lead = stats.red.points - stats.blue.points;
  const topPoints = merged[0]?.points ?? 0;

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="grid grid-cols-2 gap-4">
        <TeamBanner s={stats.red} other={stats.blue} lead={lead} />
        <TeamBanner s={stats.blue} other={stats.red} lead={-lead} />
      </div>
      <BattleBar red={stats.red} blue={stats.blue} />

      <div className="mt-3 grid grid-cols-4 gap-3">
        <Stat label="Total players" value={fmt(stats.red.players + stats.blue.players)} sub="registered this week" />
        <Stat label="Total points" value={fmt(stats.red.points + stats.blue.points)} sub="both teams combined" />
        <Stat label="Portals held" value={`${stats.red.controlled + stats.blue.controlled} / ${portals.length}`} sub={`${stats.red.controlled} red · ${stats.blue.controlled} blue`} />
        <Stat label="Top score" value={fmt(topPoints)} sub={merged[0] ? `${merged[0].username} (${cap(merged[0].team)})` : "No players yet"} color={merged[0] ? teamColor(merged[0].team) : undefined} />
      </div>

      <div className="mt-8"><Podium top={merged.slice(0, 3)} /></div>

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-edge bg-panel/70 p-1">
          <Chip active={team === "all"} onClick={() => setTeam("all")}>All teams</Chip>
          <Chip active={team === "red"} color={RED} onClick={() => setTeam("red")}>Red</Chip>
          <Chip active={team === "blue"} color={BLUE} onClick={() => setTeam("blue")}>Blue</Chip>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative">
            <span className="sr-only">Search players</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players…"
              className="w-60 rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-white placeholder:text-mute focus:border-blue/70 focus:outline-none"
            />
          </label>
          <div className="flex items-center gap-1 rounded-xl border border-edge bg-panel/70 p-1">
            <Chip active={layout === "split"} onClick={() => setLayout("split")}>By team</Chip>
            <Chip active={layout === "combined"} onClick={() => setLayout("combined")}>Overall</Chip>
          </div>
        </div>
      </div>

      {layout === "combined" ? (
        <CombinedTable rows={combined} query={q} max={topPoints} />
      ) : (
        <div className={`grid gap-4 ${visibleTeams.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {visibleTeams.map((t) => <TeamColumn key={t} s={stats[t]} rows={lb[t] ?? []} query={q} />)}
        </div>
      )}

      <p className="mt-4 pb-4 text-center text-xs text-mute">
        Points are XP earned this week · refreshes live every few seconds · the top 100 players of each team are listed
      </p>
    </div>
  );
}
