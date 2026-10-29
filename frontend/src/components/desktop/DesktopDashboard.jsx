import { useEffect, useState } from "react";
import DashMap from "./DashMap.jsx";
import useDashboard from "./useDashboard.js";
import useCountdownTo from "./useCountdownTo.js";
import LeaderboardView from "./LeaderboardView.jsx";
import MissionsView from "./MissionsView.jsx";
import HowToPlayView from "./HowToPlayView.jsx";
import { Logo, Wordmark, TeamScore, ScoreBar, LiveActivity, Legend, PortalCard, TeamBoard, QRPanel } from "./parts.jsx";
import { BLUE } from "../../theme.js";

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

function Overlay({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-ink/95 p-8 backdrop-blur">
      <div className="mx-auto mb-6 flex max-w-[1280px] items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black italic text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} className="shrink-0 rounded-lg border border-edge bg-panel px-4 py-2 font-display text-xs tracking-wide text-slate-200 hover:text-white">
          ← Back to map <span className="ml-1 text-mute">Esc</span>
        </button>
      </div>
      {children}
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
            <Overlay title="LEADERBOARD" subtitle="Every ranked player, live. Points are XP earned this week." onClose={() => setView("map")}>
              <LeaderboardView data={data} />
            </Overlay>
          )}
          {view === "missions" && (
            <Overlay title="MISSIONS · THIS WEEK'S PORTALS" subtitle="What each team can do at every portal right now." onClose={() => setView("map")}>
              <MissionsView data={data} />
            </Overlay>
          )}
          {view === "how" && (
            <Overlay title="HOW TO PLAY" subtitle="Everything you need to know to join the battle." onClose={() => setView("map")}>
              <HowToPlayView data={data} />
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
