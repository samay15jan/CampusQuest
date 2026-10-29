import { RED, BLUE, NEUTRAL } from "../../theme.js";
import { getRules, windowLabel, daysLabel, time12, plural } from "./derive.js";
import { SectionTitle, Pips } from "./ui.jsx";

const ICONS = {
  riddle: <path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.1 1-1.1 1.8M12 17h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />,
  pin: <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21Zm0-8.500a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  hold: <path d="M12 3 4 6v5c0 5 3.400 8.500 8 10 4.600-1.500 8-5 8-10V6l-8-3Zm-3.500 9 2.500 2.500 4.500-5" />,
  fight: <path d="m14.500 4 5.500 5.500-9 9L5.500 13 14.500 4ZM4 20l3-3M3 11l3 3" />,
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Flow({ rules }) {
  const need = rules.resonators_to_capture;
  const steps = [
    ["riddle", "Solve a riddle", `Each riddle points to a campus place. You get ${plural(rules.riddles_per_day, "riddle")} a day, and every correct answer earns one resonator.`, "Answer in the app"],
    ["pin", "Go there and deploy", `Be at the portal in person. Take a live photo to verify the place, then place your resonator. A passed check stays valid for ${Math.round(rules.verification_ttl_seconds / 60)} minutes.`, "GPS + live photo"],
    ["hold", `Hold ${need} of ${need}`, `${need} resonators from your team turn a portal into controlled territory. It then locks until ${time12(rules.day_end)}, so nobody can attack it today.`, `${need} resonators = control`],
    ["fight", "Attack and defend", "Enemy resonators on an unlocked portal can be destroyed. Wipe them out, then rebuild the portal for your team.", "Destroy · reclaim"],
  ];
  return (
    <ol className="grid grid-cols-4 gap-3">
      {steps.map(([icon, title, body, tag], i) => (
        <li key={title} className="relative flex flex-col rounded-2xl border border-edge bg-panel/80 p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-red/50 bg-red/10 text-red"><Icon name={icon} /></span>
            <span className="font-display text-4xl font-black text-white/10">0{i + 1}</span>
          </div>
          <h4 className="mt-4 font-display text-base font-bold text-white">{title}</h4>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">{body}</p>
          <span className="mt-4 self-start rounded-md bg-white/5 px-2.5 py-1 font-display text-[10px] uppercase tracking-widest text-mute">{tag}</span>
          {i < steps.length - 1 && <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-xl text-mute xl:block" aria-hidden="true">›</span>}
        </li>
      ))}
    </ol>
  );
}

function States({ rules }) {
  const need = rules.resonators_to_capture;
  const nodes = [
    { name: "UNCLAIMED", tone: NEUTRAL, pips: [0, 0], sub: "0 resonators", note: "Anyone can start building here." },
    { name: "BUILDING", tone: "#f5c542", pips: [1, 0], sub: `1 to ${need - 1} resonators`, note: "The first team to deploy owns it." },
    { name: "LOCKED", tone: "#22c55e", pips: [need, 0], sub: `${need} resonators`, note: `Captured. Safe until ${time12(rules.day_end)}.` },
    { name: "ATTACKABLE", tone: "#ff8a3d", pips: [need, 0], sub: "Lock expired", note: "Enemies can destroy its resonators." },
  ];
  return (
    <div className="rounded-2xl border border-edge bg-panel/80 p-5">
      <ol className="grid grid-cols-4 items-stretch gap-2">
        {nodes.map((n, i) => (
          <li key={n.name} className="relative rounded-xl border p-3 text-center" style={{ borderColor: `${n.tone}77`, background: `${n.tone}10` }}>
            <p className="font-display text-xs font-black tracking-widest" style={{ color: n.tone }}>{n.name}</p>
            <div className="my-3 flex justify-center">
              <Pips red={n.pips[0]} blue={n.pips[1]} total={need} size={14} />
            </div>
            <p className="text-xs text-slate-200">{n.sub}</p>
            <p className="mt-1 text-[11px] leading-snug text-mute">{n.note}</p>
            {i < nodes.length - 1 && <span className="absolute -right-2.5 top-1/2 z-10 -translate-y-1/2 text-lg text-mute" aria-hidden="true">›</span>}
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-lg bg-white/[0.04] px-4 py-2.5 text-center text-sm text-slate-300">
        Destroy resonators on any <b className="text-white">unlocked</b> portal and it drops back a stage, all the way down to unclaimed. Then it is open to everyone again.
      </p>
    </div>
  );
}

function Points({ rules }) {
  const xp = rules.xp;
  const rows = [
    ["Deploy a resonator", xp.RESONATOR_DEPLOYED],
    ["Destroy an enemy resonator", xp.RESONATOR_DESTROYED],
    ["Place the final resonator (capture bonus)", xp.PORTAL_CAPTURED],
    ["Winning team, every player", xp.WEEKLY_WIN],
  ].filter(([, v]) => v > 0);
  const max = Math.max(...rows.map(([, v]) => v));
  return (
    <div className="rounded-2xl border border-edge bg-panel/80 p-5">
      <ul className="space-y-3">
        {rows.map(([label, v]) => (
          <li key={label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-slate-200">{label}</span>
              <span className="font-display font-black text-white tabular-nums">+{v} <span className="text-[10px] font-bold text-mute">XP</span></span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-red to-blue" style={{ width: `${Math.max(8, (v / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-mute">
        XP is your score. Your points add up to your team's total, and the team with more points at the end of the week wins. Solving a riddle gives you a resonator rather than XP.
      </p>
    </div>
  );
}

function Schedule({ rules }) {
  return (
    <div className="rounded-2xl border border-edge bg-panel/80 p-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-mute">Game days</p>
          <p className="mt-1 font-display text-lg font-black text-white">{daysLabel(rules.play_days)}</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-mute">Campus hours</p>
          <p className="mt-1 font-display text-lg font-black text-white">{time12(rules.day_start)} – {time12(rules.day_end)}</p>
        </div>
      </div>
      <p className="mb-2 mt-4 font-display text-[10px] uppercase tracking-[0.2em] text-mute">Portals open during</p>
      <ul className="space-y-2">
        {rules.portal_windows.map((w) => (
          <li key={w} className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-white">
            <span className="h-2 w-2 rounded-full bg-green-500" />{windowLabel(w)}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-mute">Outside these windows the portals are closed. Nothing can be deployed or attacked, so plan your day around them.</p>
    </div>
  );
}

function Rules({ rules }) {
  const items = [
    ["Be there in person", "Every deploy and attack checks your GPS position against the portal."],
    ["Prove it with a photo", "A live photo is matched against the portal's reference image before your resonator can be placed."],
    ["Fight the other team", "You can only attack portals that hold enemy resonators, never your own team's."],
    ["Pace your attacks", `After an attack there is a ${rules.attack_cooldown_seconds}-second cooldown before your next one.`],
    ["Locked means safe", `A captured portal can't be attacked until ${time12(rules.day_end)}. Capture it, then defend what you've built.`],
    ["One team, three players", `${rules.resonators_to_capture} resonators are needed to take control, so team up with your faction mates.`],
  ];
  return (
    <ul className="grid grid-cols-3 gap-3">
      {items.map(([t, d]) => (
        <li key={t} className="rounded-xl border border-edge bg-panel/80 p-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-white"><span className="h-1.5 w-1.5 rounded-full bg-red" />{t}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{d}</p>
        </li>
      ))}
    </ul>
  );
}

export default function HowToPlayView({ data }) {
  const rules = getRules(data);
  return (
    <div className="mx-auto max-w-[1280px] space-y-8 pb-4">
      <section className="relative overflow-hidden rounded-2xl border border-edge bg-panel/80 px-8 py-7">
        <div className="pointer-events-none absolute -left-12 -top-10 h-44 w-44 rounded-full blur-3xl" style={{ background: `${RED}33` }} />
        <div className="pointer-events-none absolute -right-12 -top-10 h-44 w-44 rounded-full blur-3xl" style={{ background: `${BLUE}33` }} />
        <p className="relative font-display text-[10px] uppercase tracking-[0.4em] text-mute">Red vs Blue · Whole campus</p>
        <h3 className="relative mt-2 font-display text-3xl font-black italic text-white">TAKE OVER THE CAMPUS, ONE PORTAL AT A TIME</h3>
        <p className="relative mt-2 max-w-3xl text-slate-300">
          Join <b style={{ color: RED }}>Red</b> or <b style={{ color: BLUE }}>Blue</b>, solve riddles to earn resonators, and walk to real campus places to claim them. Your team wins by holding more territory and earning more points than the other side.
        </p>
      </section>

      <section><SectionTitle>The 4-step loop</SectionTitle><Flow rules={rules} /></section>

      <section><SectionTitle>How a portal changes hands</SectionTitle><States rules={rules} /></section>

      <section className="grid grid-cols-2 gap-6">
        <div><SectionTitle>Earn points</SectionTitle><Points rules={rules} /></div>
        <div><SectionTitle>When you can play</SectionTitle><Schedule rules={rules} /></div>
      </section>

      <section><SectionTitle>Ground rules</SectionTitle><Rules rules={rules} /></section>

      <p className="text-center text-sm text-mute">Ready? Scan the QR code on the right and join a team.</p>
    </div>
  );
}
