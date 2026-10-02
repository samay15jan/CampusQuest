import { Panel, SectionTitle } from "../ui/Panel.jsx";
import Icon from "../ui/Icon.jsx";
import { OWNERS } from "../../theme.js";

export default function ResonatorList({ resonators, accent }) {
  return (
    <Panel className="mx-4 mt-3">
      <SectionTitle icon="target" accent={accent}>Resonators</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {resonators.map((r, i) => {
          const color = r ? OWNERS[r.team].color : "#4a4e5c";
          return (
            <div key={i} className={`overflow-hidden rounded-lg border bg-[#0b0d16] ${r ? "border-white/10" : "border-dashed border-white/15"}`}>
              <div className="grid h-[84px] place-items-center" style={{ color, filter: r ? `drop-shadow(0 0 8px ${color})` : "none" }}>
                <Icon name="crystal" size={44} />
              </div>
              <div className="border-t border-white/10 py-2 text-center text-xs text-mute">
                {r ? <>Player<br /><span className="text-slate-200">{r.player}</span></> : <>Not Deployed<br />&nbsp;</>}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}