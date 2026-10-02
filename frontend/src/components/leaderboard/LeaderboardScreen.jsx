import { useMemo, useState } from "react";
import Icon from "../ui/Icon.jsx";
import LeaderboardRow from "./LeaderboardRow.jsx";
import { BLUE, RED } from "../../theme.js";
import { ME, rankPlayers } from "../../data/mock.js";

const TABS = [["global", "Global"], ["red", "Red Team"], ["blue", "Blue Team"]];

export default function LeaderboardScreen({ accent, onBack }) {
  const [tab, setTab] = useState("global");
  const rows = useMemo(() => rankPlayers(tab), [tab]);
  const tabColor = { global: accent, red: RED, blue: BLUE };

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col text-white"
      style={{ background: `radial-gradient(80% 30% at 100% 100%, ${accent}22, transparent 60%), #05060b` }}
    >
      <header className="flex items-center px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button onClick={onBack} aria-label="Back"><Icon name="back" size={24} /></button>
        <h1 className="flex-1 pr-6 text-center font-display text-xl font-bold">Leaderboard</h1>
      </header>

      <div role="tablist" className="mx-4 grid grid-cols-3 gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1">
        {TABS.map(([id, label]) => {
          const on = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(id)}
              className="rounded-md border py-2.5 text-sm font-medium transition"
              style={{
                borderColor: on ? tabColor[id] : "transparent",
                background: on ? `${tabColor[id]}33` : "transparent",
                boxShadow: on ? `0 0 12px ${tabColor[id]}66` : "none",
                color: on ? "#fff" : "#cbd5e1",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-[2.5rem_1fr_3rem_4.25rem] px-4 text-xs text-mute">
        <span className="text-center">#</span>
        <span>Player</span>
        <span className="text-center">Lv</span>
        <span className="text-right">Points</span>
      </div>

      <ol className="mt-2 flex-1 space-y-1 overflow-y-auto px-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {rows.map((p) => <LeaderboardRow key={p.name} player={p} isMe={p.name === ME} />)}
      </ol>
    </div>
  );
}