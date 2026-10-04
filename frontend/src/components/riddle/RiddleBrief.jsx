import Icon from "../ui/Icon.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";
import PortalHeader from "../portal/PortalHeader.jsx";
import PortalHero from "../portal/PortalHero.jsx";
import PortalStats, { PointValue } from "../portal/PortalStats.jsx";
import { GREEN } from "../../theme.js";

/** First screen when a location is opened on the map. Locked until its riddle is solved. */
export default function RiddleBrief({ portal, accent, solved, onBack, onSolve, onOpenCamera }) {
  const c = solved ? GREEN : accent;

  return (
    <div className="relative flex h-full flex-col">
      <PortalHeader portal={portal} accent={accent} onBack={onBack} />

      <div className="flex-1 overflow-y-auto pb-28">
        <PortalHero portal={portal} accent={accent} showDistance={solved} className="h-[260px]" />

        <div className="relative z-10 mx-3 -mt-8 flex items-center gap-3 rounded-xl border bg-[#0a0c14] p-3" style={{ borderColor: `${c}66`, boxShadow: `inset 0 0 0 100vmax ${c}14` }}>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border" style={{ borderColor: c, background: `${c}22`, color: c }}>
            <Icon name={solved ? "check" : "lock"} size={26} />
          </span>
          <div>
            <p className="text-xs text-mute">Portal Status</p>
            <p className="font-display text-lg font-bold">{solved ? "Riddle Solved" : "Riddle Locked"}</p>
            <p className="text-xs text-mute">{solved ? "You can now capture this portal." : "Solve the riddle to unlock this portal."}</p>
          </div>
        </div>

        <div className="px-3">
          <PortalStats portal={portal} />
          <PointValue xp={portal.xp} />

          {solved ? (
            <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <h3 className="font-display text-sm font-bold">Next Step</h3>
              <div className="mt-3 flex items-start gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-blue-400/60 bg-blue-500/15 text-blue-300"><Icon name="camera" size={26} /></span>
                <div>
                  <p className="text-sm font-semibold">Verify Location &amp; Capture</p>
                  <p className="mt-1 text-xs leading-5 text-mute">Take a live photo at the portal to verify your location and unlock resonator deployment.</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <h3 className="font-display text-sm font-bold">About This Portal</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{portal.description}</p>
            </section>
          )}
        </div>
      </div>

      <BottomAction>
        {solved
          ? <PrimaryButton icon="camera" accent={accent} onClick={onOpenCamera}>Open Camera</PrimaryButton>
          : <PrimaryButton icon="puzzle" accent={accent} onClick={onSolve}>Solve Riddle</PrimaryButton>}
      </BottomAction>
    </div>
  );
}