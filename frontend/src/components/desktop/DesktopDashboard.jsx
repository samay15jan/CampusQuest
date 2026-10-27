import { useState } from "react";
import DashMap from "./DashMap.jsx";
import useDashboard from "./useDashboard.js";
import useCountdownTo from "./useCountdownTo.js";
import { Logo, Wordmark, TeamScore, ScoreBar, LiveActivity, Legend, PortalCard, TeamBoard, QRPanel } from "./parts.jsx";
import { BLUE, ownerColor as teamColor } from "../../theme.js";

const APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
const TABS = [["map", "Live Map"], ["leaderboard", "Leaderboard"], ["missions", "Missions"], ["how", "How to Play"]];

function Header({ view, setView, data, error, receivedAt }) {
  const ev = data?.event;
  const live = ev?.status === "active";
  const upcoming = ev?.status === "scheduled";
  const seconds = live ? data.seconds_remaining : upcoming ? data.seconds_until_start : null;
  const t = useCountdownTo(seconds, receivedAt);

  return (
    <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-edge px-6">
      <div className="flex items-center gap-3">
        <Logo size={46} />
        <Wordmark className="text-3xl" />
      </div>

      <nav className="flex gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setView(id)}
            className={`rounded-lg border px-4 py-2 font-display text-sm tracking-wide ${view === id ? "border-red/70 bg-red/10 text-white" : "border-transparent text-mute hover:text-white"}`}>
            {label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-5">
        <span className="flex items-center gap-2 rounded-lg border border-edge bg-panel px-4 py-2 text-sm text-white">
          <span className={`h-2.5 w-2.5 rounded-full ${error ? "bg-amber-400" : live ? "animate-pulse bg-green-500" : "bg-mute"}`} />
          {error && !data ? "Offline" : error ? "Reconnecting…" : live ? "Event Live" : upcoming ? "Starting Soon" : ev ? "Event Ended" : "No Event"}
        </span>
        {t && (
          <div className="text-right">
            <p className="font-display text-[10px] uppercase tracking-[0.2em] text-mute">{live ? "Ends in" : "Starts in"}</p>
            <p className="font-display text-3xl font-black leading-none text-red tabular-nums">{t.h} : {t.m} : {t.s}</p>
            <p className="flex justify-between font-display text-[9px] tracking-widest text-mute"><span>HRS</span><span>MINS</span><span>SECS</span></p>
          </div>
        )}
      </div>
    </header>
  );
}

function Overlay({ title, children }) {
  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-ink/95 p-8 backdrop-blur">
      <h2 className="mb-6 font-display text-2xl font-black italic text-white">{title}</h2>
      {children}
    </div>
  );
}

const HOW = [
  ["Solve a riddle", "Each riddle points to a campus place. A correct answer earns a resonator."],
  ["Go there and deploy", "Be at the portal, take a live photo and place your resonator."],
  ["Hold 3 of 3", "Three resonators from your team make the territory controlled, then locked."],
  ["Attack and defend", "Enemy resonators can be destroyed on unlocked portals. Reclaim them."],
];

function Missions({ portals }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {portals.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-panel p-3" style={{ borderColor: `${teamColor(p.owner)}66` }}>
          {p.img ? <img src={p.img} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <span className="h-14 w-14 rounded-lg bg-white/10" />}
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{p.name}</p>
            <p className="text-sm text-mute">
              <span style={{ color: teamColor(p.owner) }}>{p.owner === "neutral" ? "Neutral" : `${p.owner} controlled`}</span> · {p.resonators.total}/3
              {p.locked ? " · locked" : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DesktopDashboard() {
  const { data, error, receivedAt } = useDashboard();
  const [view, setView] = useState("map");
  const [selected, setSelected] = useState(null);

  const portals = data?.portals ?? [];
  const scores = data?.scores ?? { red: 0, blue: 0, red_pct: 50, blue_pct: 50 };
  const lb = data?.leaderboard ?? { red: [], blue: [] };
  const picked = selected ? portals.find((p) => p.id === selected) : null;

  return (
    <main className="flex h-dvh min-h-[720px] flex-col overflow-hidden bg-ink text-white">
      <Header view={view} setView={setView} data={data} error={error} receivedAt={receivedAt} />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_480px] gap-4 p-4">
        {/* MAP */}
        <section className="relative min-h-0 overflow-hidden rounded-2xl border border-edge">
          <DashMap portals={portals} onSelectPortal={(p) => setSelected(p.id)} />

          <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-start gap-2">
            <div className="pointer-events-auto"><TeamScore team="red" points={scores.red} /></div>
            <div className="pointer-events-auto flex-1 self-center"><ScoreBar redPct={scores.red_pct} bluePct={scores.blue_pct} /></div>
            <div className="pointer-events-auto"><TeamScore team="blue" points={scores.blue} align="right" /></div>
          </div>

          {picked && (
            <div className="absolute right-4 top-[118px] z-10"><PortalCard portal={picked} onClose={() => setSelected(null)} /></div>
          )}
          <div className="absolute bottom-4 left-4 z-10"><Legend /></div>
          <div className="absolute bottom-9 right-4 z-10"><LiveActivity items={(data?.activity ?? []).map((a) => ({ ...a }))} /></div>

          {!data && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-ink/80 text-center">
              <p className="font-display text-sm uppercase tracking-[0.28em] text-mute">
                {error ? (error.status === 404 ? "No event scheduled yet" : "Can't reach the game server. Retrying…") : "Loading live data…"}
              </p>
            </div>
          )}

          {view === "leaderboard" && (
            <Overlay title="LEADERBOARD">
              <div className="grid grid-cols-2 gap-4"><TeamBoard team="red" rows={lb.red} points={scores.red} limit={5} /><TeamBoard team="blue" rows={lb.blue} points={scores.blue} limit={5} /></div>
            </Overlay>
          )}
          {view === "missions" && <Overlay title="MISSIONS · THIS WEEK'S PORTALS"><Missions portals={portals} /></Overlay>}
          {view === "how" && (
            <Overlay title="HOW TO PLAY">
              <ol className="grid max-w-3xl gap-4">
                {HOW.map(([t, d], i) => (
                  <li key={t} className="flex gap-4 rounded-xl border border-edge bg-panel p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-red/60 font-display font-bold">{i + 1}</span>
                    <span><b className="block text-lg">{t}</b><span className="text-mute">{d}</span></span>
                  </li>
                ))}
              </ol>
            </Overlay>
          )}
        </section>

        {/* SIDE */}
        <aside className="flex min-h-0 flex-col gap-4 overflow-auto">
          <section className="relative overflow-hidden rounded-2xl border border-edge bg-panel px-6 py-7 text-center">
            <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-red/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-blue/25 blur-3xl" />
            <p className="relative font-display text-[10px] uppercase tracking-[0.4em] text-mute">CampusQuest</p>
            <h1 className="relative mt-2 font-display text-4xl font-black italic leading-[1.05]">REAL PLACES.<br />REAL PLAYERS.</h1>
            <p className="relative mt-3 font-display text-[11px] uppercase tracking-[0.3em] text-slate-300">Explore · Capture · Compete</p>
          </section>

          <QRPanel url={APP_URL} />

          <section className="rounded-2xl border border-edge bg-panel/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold tracking-widest">LEADERBOARD</h2>
              <button type="button" onClick={() => setView("leaderboard")} className="text-sm" style={{ color: BLUE }}>View Full Leaderboard →</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TeamBoard team="red" rows={lb.red} points={scores.red} />
              <TeamBoard team="blue" rows={lb.blue} points={scores.blue} />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
