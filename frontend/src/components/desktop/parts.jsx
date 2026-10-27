import { useEffect, useState } from "react";
import { QRCodeSVG } from "./qr.jsx";
import { RED, BLUE, ownerColor } from "../../theme.js";

const teamColor = ownerColor;

export function Logo({ size = 44 }) {
  return (
    <svg viewBox="0 0 64 56" width={size} height={(size * 56) / 64} aria-hidden="true">
      <path d="M22 4 2 52h14l6-14h12L22 4Z" fill="#c9cdf5" />
      <path d="M36 22 62 52H42L30 34l6-12Z" fill="#ff3b3b" />
    </svg>
  );
}

export function Wordmark({ className = "" }) {
  return (
    <span className={`font-display font-black italic tracking-[0.08em] ${className}`}>
      CAMPUS<span className="text-red">QUEST</span>
    </span>
  );
}

function relTime(iso, now) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

const VERB = {
  RESONATOR_DEPLOYED: "deployed a resonator at",
  RESONATOR_DESTROYED: "destroyed a resonator at",
  PORTAL_CAPTURED: "captured",
  PORTAL_LOST: "lost",
};

export function TeamScore({ team, points, align }) {
  const c = teamColor(team);
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border bg-panel/90 px-5 py-3 backdrop-blur ${align === "right" ? "flex-row-reverse text-right" : ""}`}
      style={{ borderColor: `${c}88`, boxShadow: `0 0 24px ${c}33, inset 0 0 24px ${c}14` }}
    >
      <span className="grid h-14 w-14 place-items-center rounded-full font-display text-xl font-black" style={{ background: `${c}22`, color: c, boxShadow: `0 0 18px ${c}66` }}>
        {team === "red" ? "R" : "B"}
      </span>
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em]" style={{ color: c }}>{team} team</p>
        <p className="font-display text-4xl font-black leading-none text-white">{Number(points).toLocaleString()}</p>
        <p className="text-sm text-mute">Total Points</p>
      </div>
    </div>
  );
}

export function ScoreBar({ redPct, bluePct }) {
  return (
    <div className="min-w-0 flex-1 px-4">
      <div className="mb-1 flex justify-between font-display text-sm font-bold">
        <span style={{ color: RED }}>{redPct}%</span>
        <span style={{ color: BLUE }}>{bluePct}%</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-0 transition-all duration-700" style={{ width: `${redPct}%`, background: `linear-gradient(90deg, ${RED}, #ff6a6a)`, boxShadow: `0 0 12px ${RED}` }} />
        <div className="absolute inset-y-0 right-0 transition-all duration-700" style={{ width: `${bluePct}%`, background: `linear-gradient(270deg, ${BLUE}, #5fa0ff)`, boxShadow: `0 0 12px ${BLUE}` }} />
        <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${redPct}%` }} />
      </div>
    </div>
  );
}

export function LiveActivity({ items }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-[340px] rounded-xl border border-edge bg-ink/85 p-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red" /> Live Activity
        </p>
      </div>
      {items.length === 0 ? (
        <p className="py-3 text-sm text-mute">No activity yet. Be the first to capture a portal.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 4).map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-[13px]">
              <span className="w-8 shrink-0 text-mute">{relTime(a.created_at, now)}</span>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: teamColor(a.faction) }} />
              <span className="min-w-0 flex-1 truncate text-slate-200">
                <b className="font-semibold" style={{ color: teamColor(a.faction) }}>{a.username || "A player"}</b>{" "}
                {VERB[a.type] || a.type} {a.portal_name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const Dot = ({ c }) => <span className="inline-block h-3.5 w-3.5 rounded-full border-2" style={{ borderColor: c, background: `${c}33` }} />;

export function Legend() {
  return (
    <div className="rounded-xl border border-edge bg-ink/85 px-4 py-3 text-sm text-slate-300 backdrop-blur">
      <p className="mb-2 font-display text-[11px] uppercase tracking-[0.2em] text-mute">Legend</p>
      <ul className="space-y-1.5">
        <li className="flex items-center gap-2"><Dot c={RED} /> Red Controlled</li>
        <li className="flex items-center gap-2"><Dot c={BLUE} /> Blue Controlled</li>
        <li className="flex items-center gap-2"><Dot c="#a5afc2" /> Neutral</li>
        <li className="flex items-center gap-2 text-mute"><span className="rounded-full border border-white/40 px-1 text-[9px] text-white">2/3</span> Resonators placed</li>
      </ul>
    </div>
  );
}

export function PortalCard({ portal, onClose }) {
  const c = teamColor(portal.owner);
  return (
    <div className="flex w-[300px] items-center gap-3 rounded-xl border bg-ink/90 p-2.5 backdrop-blur" style={{ borderColor: `${c}88` }}>
      {portal.img ? <img src={portal.img} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <span className="h-14 w-14 rounded-lg bg-white/10" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{portal.name}</p>
        <p className="flex items-center gap-1.5 text-xs" style={{ color: c }}>
          <span className="h-2 w-2 rounded-full" style={{ background: c }} />
          {portal.owner === "neutral" ? "Neutral" : `${portal.owner[0].toUpperCase()}${portal.owner.slice(1)} Team`}
          <span className="text-mute">· {portal.resonators?.total ?? 0}/3 resonators{portal.locked ? " · locked" : ""}</span>
        </p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="px-1 text-mute hover:text-white">×</button>
    </div>
  );
}

const avatarSrc = (a) => (/^(red|blue)\d$/.test(a || "") ? `/avatars/${a}.jpg` : null);

export function TeamBoard({ team, rows, points, limit = 5 }) {
  const c = teamColor(team);
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-panel/80" style={{ borderColor: `${c}66` }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: `${c}1f` }}>
        <span className="font-display text-sm font-bold uppercase tracking-widest" style={{ color: c }}>{team} team</span>
        <span className="text-sm text-slate-200">{Number(points).toLocaleString()} <span className="text-mute">pts</span></span>
      </div>
      <ol>
        {rows.slice(0, limit).map((r) => (
          <li key={r.user_id} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-2 border-t border-white/5 px-3 py-1.5 text-sm">
            <span className="text-mute">{r.rank}</span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 font-display text-[11px] font-bold uppercase" style={{ boxShadow: `0 0 0 1.5px ${c}` }}>
                {avatarSrc(r.avatar) ? <img src={avatarSrc(r.avatar)} alt="" className="h-full w-full object-cover" /> : r.username[0]}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-white">{r.username}</span>
                <span className="block text-[10px] text-mute">LV {r.level}</span>
              </span>
            </span>
            <span className="text-right font-semibold text-white">{Number(r.points).toLocaleString()}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="border-t border-white/5 px-3 py-4 text-center text-sm text-mute">No players yet</li>}
      </ol>
    </div>
  );
}

export function QRPanel({ url }) {
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const steps = [
    ["Scan QR Code", "Open the game on your phone"],
    ["Sign in with Google", "Join Red or Blue team"],
    ["Start Playing", "Explore the campus and capture portals"],
  ];
  return (
    <section className="rounded-2xl border border-edge bg-panel/80 p-5">
      <h2 className="text-center font-display text-2xl font-black italic text-white">
        <span className="text-red">SCAN</span> TO START PLAYING
      </h2>
      <p className="mt-1 text-center text-sm text-mute">Open CampusQuest on your mobile device, join a team and start capturing.</p>
      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-5">
        <div className="rounded-xl border-2 border-red/70 bg-white p-2.5 shadow-[0_0_24px_rgba(255,59,59,0.35)]">
          <QRCodeSVG value={url} size={176} />
        </div>
        <ol className="space-y-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-red/60 font-display text-sm font-bold text-white">{i + 1}</span>
              <span><b className="block text-[15px] text-white">{t}</b><span className="text-sm text-mute">{d}</span></span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-3 text-center text-sm text-mute">Or visit <b className="text-slate-200">{host}</b> on your mobile device</p>
    </section>
  );
}
