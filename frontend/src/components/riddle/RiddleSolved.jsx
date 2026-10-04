import Icon from "../ui/Icon.jsx";
import ScreenHeader from "../ui/ScreenHeader.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";

function Diamond({ color }) {
  return (
    <svg viewBox="0 0 220 220" className="mx-auto h-[220px] w-[220px]" aria-hidden="true" style={{ color }}>
      <g stroke="currentColor" strokeOpacity=".35" strokeWidth="1">
        <path d="M110 4v36M110 180v36M4 110h36M180 110h36" />
      </g>
      <circle cx="110" cy="110" r="78" fill="none" stroke="currentColor" strokeOpacity=".15" />
      <polygon points="110,38 182,110 110,182 38,110" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 14px ${color})` }} />
      <path d="m82 110 20 20 38-40" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RiddleSolved({ accent, xp, resonator = 1, onBack, onContinue }) {
  return (
    <div className="relative flex h-full flex-col" style={{ background: `radial-gradient(70% 40% at 50% 28%, ${accent}33, transparent 70%)` }}>
      <ScreenHeader title="Riddle Unlocked" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        <div className="mt-6"><Diamond color={accent} /></div>
        <h2 className="mt-2 text-center font-display text-3xl font-bold">Correct!</h2>
        <p className="mt-2 text-center text-sm text-mute">You earned a resonator from today's riddle.</p>

        <section className="mt-8 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border" style={{ borderColor: accent, background: `${accent}22`, color: accent }}><Icon name="unlock" size={26} /></span>
          <div>
            <p className="text-sm font-semibold">Resonator Earned</p>
            <p className="mt-0.5 text-xs leading-5 text-mute">The resonator is ready for deployment.</p>
          </div>
        </section>

        <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-sm font-semibold">Rewards</p>
          <div className="mt-3 space-y-3">
            <p className="flex items-center gap-3 font-display text-xl font-bold" style={{ color: "#ffb020" }}>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#ff7a1a]/25 text-xs font-black text-[#ff7a1a]">XP</span>+{xp} XP
            </p>
            <p className="flex items-center gap-3 text-sm font-semibold">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/5">×{resonator}</span>
              Resonator added to inventory
            </p>
          </div>
        </section>
      </div>
      <BottomAction>
        <PrimaryButton accent={accent} onClick={onContinue}>Continue <Icon name="chevron" size={18} /></PrimaryButton>
      </BottomAction>
    </div>
  );
}