import { HudBox, CityBackdrop, Label } from "../auth/Hud.jsx";
import { isIOS } from "./useInstall.js";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };

// Same 3-column strip as the login screen, describing what installing gives you.
const PERKS = [
  { title: "Fullscreen", sub: "No browser bars", icon: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /> },
  { title: "Faster", sub: "Instant launch", icon: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" /> },
  { title: "Field ready", sub: "Camera & map", icon: <><path d="M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10Z" /><circle cx="12" cy="11" r="2" /></> },
];

const IOS_STEPS = [
  { n: "01", text: <>Open this page in <b className="text-white">Safari</b></> },
  { n: "02", text: <>Tap the <b className="text-white">Share</b> button</> },
  { n: "03", text: <>Choose <b className="text-white">Add to Home Screen</b></> },
];

/** Full-screen "install the app" screen shown before the main UI. */
export default function InstallGate({ canInstall, onInstall, onContinue }) {
  const ios = isIOS();

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-white">
      <CityBackdrop />

      <header className="relative flex justify-end px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Label className="text-right text-[10px] leading-5 text-mute">
          Install<br />Launch<br />Conquer
        </Label>
      </header>

      <div className="relative flex flex-1 flex-col justify-end px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-32">
        <div className="text-center">
          <svg viewBox="0 0 64 56" width="76" height="66" className="mx-auto" aria-hidden="true">
            <path d="M22 4 2 52h14l6-14h12L22 4Z" fill="#c9cdf5" />
            <path d="M36 22 62 52H42L30 34l6-12Z" fill="#ff3b3b" />
          </svg>
          <h1 className="mt-4 font-display text-[26px] font-black tracking-[0.16em]">
            CAMPUS<span className="text-red">QUEST</span>
          </h1>
          <Label className="mt-5 text-xs leading-7 text-mute">Get the app<br />play full screen</Label>
        </div>

        <ul className="mt-10 grid grid-cols-3 divide-x divide-edge">
          {PERKS.map((f) => (
            <li key={f.title} className="flex flex-col items-center gap-2 px-1 text-center text-mute">
              <svg viewBox="0 0 24 24" width="30" height="30" {...stroke} className="text-slate-200" aria-hidden="true">{f.icon}</svg>
              <span className="font-display text-[10px] uppercase tracking-[0.2em]">{f.title}</span>
              <span className="text-[11px] uppercase tracking-[0.15em]">{f.sub}</span>
            </li>
          ))}
        </ul>

        {ios ? (
          <div className="mt-9">
            <HudBox cut={16} className="p-4">
              <Label className="mb-3 text-[10px] text-mute">Add to Home Screen</Label>
              <ol className="space-y-3">
                {IOS_STEPS.map((s) => (
                  <li key={s.n} className="flex items-center gap-4 text-[15px] leading-5 text-mute">
                    <span className="font-display text-xs font-bold tracking-widest text-blue">{s.n}</span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ol>
            </HudBox>
          </div>
        ) : canInstall ? (
          <button
            onClick={onInstall}
            className="mt-9 block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:brightness-125"
          >
            <HudBox border="linear-gradient(90deg,#2f7bff,#ff3b3b)" cut={16} innerClass="bg-gradient-to-r from-[#0b1a33] to-[#1a0d16]">
              <span className="flex h-14 items-center gap-4 px-5">
                <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} className="text-slate-200" aria-hidden="true">
                  <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" />
                </svg>
                <span className="flex-1 text-center font-display text-xs font-bold uppercase tracking-[0.22em]">Install app</span>
                <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} className="text-red" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
              </span>
            </HudBox>
          </button>
        ) : (
          <div className="mt-9">
            <HudBox cut={16} className="p-4">
              <Label className="mb-2 text-[10px] text-mute">Install manually</Label>
              <p className="text-[15px] leading-6 text-mute">
                Open your browser menu <b className="text-white">⋮</b> and tap{" "}
                <b className="text-white">Install app</b> or <b className="text-white">Add to Home screen</b>.
              </p>
            </HudBox>
          </div>
        )}

        <button
          onClick={onContinue}
          className="mt-5 block w-full py-3 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:text-white"
        >
          <Label className="text-[11px] text-mute underline underline-offset-4">Continue in browser</Label>
        </button>
      </div>
    </main>
  );
}
