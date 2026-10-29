import { useMemo, useState } from "react";
import { RED, BLUE, NEUTRAL, ownerColor as teamColor } from "../../theme.js";
import { getRules, missionFor, relTime, VERB_PAST, windowLabel, plural, cap } from "./derive.js";
import { Stat, Chip, Pips } from "./ui.jsx";
import useNow from "./useNow.js";

const FILTERS = [
  ["all", "All", () => true],
  ["neutral", "Unclaimed", (p) => p.status === "neutral"],
  ["building", "Building", (p) => p.status === "partial"],
  ["attackable", "Attackable", (p) => p.status === "controlled" && !p.locked],
  ["locked", "Locked", (p) => p.status === "controlled" && p.locked],
  ["red", "Red", (p) => p.owner === "red"],
  ["blue", "Blue", (p) => p.owner === "blue"],
];

const KIND_STYLE = {
  neutral: { icon: "◌", tone: NEUTRAL },
  building: { icon: "◔", tone: "#f5c542" },
  contested: { icon: "⚔", tone: "#ff8a3d" },
  locked: { icon: "▣", tone: "#22c55e" },
};

function MissionCard({ p, rules, last, now }) {
  const m = missionFor(p, rules);
  const c = teamColor(p.owner);
  const k = KIND_STYLE[m.kind];
  const r = p.resonators ?? { red: 0, blue: 0, total: 0 };
  const need = rules.resonators_to_capture;
  const xp = rules.xp;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-panel/90" style={{ borderColor: `${c}66`, boxShadow: p.owner === "neutral" ? "none" : `0 0 22px ${c}1a` }}>
      <div className="relative h-32 bg-white/5" style={p.img ? undefined : { background: `linear-gradient(135deg, ${c}33, #0a0f1a 70%)` }}>
        {p.img && <img src={p.img} alt="" className="h-full w-full object-cover" loading="lazy" />}
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/20 to-transparent" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md border bg-ink/80 px-2 py-1 font-display text-[10px] font-bold tracking-widest backdrop-blur" style={{ borderColor: `${k.tone}88`, color: k.tone }}>
          <span aria-hidden="true">{k.icon}</span>{m.label}
        </span>
        <span className="absolute right-3 top-3 rounded-md border bg-ink/80 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-widest backdrop-blur" style={{ borderColor: `${c}88`, color: c }}>
          {p.owner === "neutral" ? "Neutral" : `${p.owner} team`}
        </span>
        <h3 className="absolute inset-x-3 bottom-2 truncate font-display text-lg font-black text-white">{p.name}</h3>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {p.description && <p className="line-clamp-2 text-sm text-slate-300">{p.description}</p>}

        <div className="flex items-center justify-between">
          <Pips red={r.red} blue={r.blue} total={need} size={16} />
          <span className="font-display text-sm font-bold text-white tabular-nums">{r.total}<span className="text-mute"> / {need}</span></span>
        </div>

        <div className="space-y-1.5">
          {["red", "blue"].map((t) => (
            <p key={t} className="flex gap-2 rounded-lg px-2.5 py-1.5 text-[13px] leading-snug text-slate-200" style={{ background: `${teamColor(t)}14`, borderLeft: `3px solid ${teamColor(t)}` }}>
              <b className="w-9 shrink-0 font-display text-[10px] uppercase tracking-wider" style={{ color: teamColor(t) }}>{t}</b>
              <span>{m.lines[t]}</span>
            </p>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="rounded bg-white/5 px-2 py-1 text-slate-300">+{xp.RESONATOR_DEPLOYED} XP deploy</span>
          <span className="rounded bg-white/5 px-2 py-1 text-slate-300">+{xp.RESONATOR_DESTROYED} XP destroy</span>
          <span className="rounded bg-white/5 px-2 py-1 text-slate-300">+{xp.PORTAL_CAPTURED} XP capture</span>
        </div>

        <p className="border-t border-white/5 pt-2 text-xs text-mute">
          {last ? (
            <>
              <b style={{ color: teamColor(last.faction) }}>{last.username || "A player"}</b> {VERB_PAST[last.type] || "was active"} · {relTime(last.created_at, now)}
            </>
          ) : (
            "No activity on this portal yet"
          )}
        </p>
      </div>
    </article>
  );
}

export default function MissionsView({ data }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("priority");
  const now = useNow();

  const portals = useMemo(() => data?.portals ?? [], [data]);
  const rules = useMemo(() => getRules(data), [data]);
  const activity = useMemo(() => data?.activity ?? [], [data]);

  // newest activity per portal (the feed is already newest-first)
  const lastByPortal = useMemo(() => {
    const map = new Map();
    for (const a of activity) if (a.portal_id != null && !map.has(String(a.portal_id))) map.set(String(a.portal_id), a);
    return map;
  }, [activity]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([id, , fn]) => [id, portals.filter(fn).length])), [portals]);
  const open = portals.some((p) => p.open);

  const list = useMemo(() => {
    const fn = FILTERS.find(([id]) => id === filter)?.[2] ?? (() => true);
    const out = portals.filter(fn);
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "progress") out.sort((a, b) => (b.resonators?.total ?? 0) - (a.resonators?.total ?? 0) || a.name.localeCompare(b.name));
    else out.sort((a, b) => missionFor(a, rules).priority - missionFor(b, rules).priority || a.name.localeCompare(b.name));
    return out;
  }, [portals, filter, sort, rules]);

  const red = portals.filter((p) => p.owner === "red" && p.status === "controlled").length;
  const blue = portals.filter((p) => p.owner === "blue" && p.status === "controlled").length;

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-edge bg-panel/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${open ? "animate-pulse bg-green-500" : "bg-mute"}`} />
          <div>
            <p className="font-display text-sm font-bold tracking-wide text-white">{open ? "Portals are open. Play now!" : "Portals are closed right now"}</p>
            <p className="text-sm text-mute">Play windows: {rules.portal_windows.map(windowLabel).join("  ·  ")}</p>
          </div>
        </div>
        <p className="max-w-md text-right text-sm text-slate-300">
          Every portal is a mission. Solve a riddle, go there, deploy <b className="text-white">{rules.resonators_to_capture}</b> resonators and hold it.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Stat label="Portals this week" value={portals.length} />
        <Stat label="Unclaimed" value={counts.neutral} color={NEUTRAL} sub="free to capture" />
        <Stat label="In progress" value={counts.building} color="#f5c542" sub="partly built" />
        <Stat label="Red controls" value={red} color={RED} />
        <Stat label="Blue controls" value={blue} color={BLUE} />
      </div>

      <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-edge bg-panel/70 p-1">
          {FILTERS.map(([id, label]) => (
            <Chip key={id} active={filter === id} count={counts[id]} color={id === "red" ? RED : id === "blue" ? BLUE : undefined} onClick={() => setFilter(id)}>{label}</Chip>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-mute">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-white focus:border-blue/70 focus:outline-none">
            <option value="priority">Priority</option>
            <option value="progress">Progress</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-edge bg-panel/60 py-16 text-center text-mute">
          {portals.length === 0 ? "No portals have been announced yet." : `No ${cap(filter)} portals right now.`}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-4 pb-4">
          {list.map((p) => <MissionCard key={p.id} p={p} rules={rules} last={lastByPortal.get(String(p.id))} now={now} />)}
        </div>
      )}
      <p className="pb-4 text-center text-xs text-mute">{plural(list.length, "mission")} shown</p>
    </div>
  );
}
