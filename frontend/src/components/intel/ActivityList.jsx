import { Panel, SectionTitle } from "../ui/Panel.jsx";
import Icon from "../ui/Icon.jsx";
import { OWNERS } from "../../theme.js";

const KIND_ICON = { deploy: "crystal", capture: "flag", link: "link", status: "flag" };

export default function ActivityList({ items, accent, limit }) {
  const rows = limit ? items.slice(0, limit) : items;
  return (
    <Panel className="mx-4 mt-3">
      <SectionTitle icon="bars" action={limit ? "View All" : undefined} accent={accent}>Recent Activity</SectionTitle>
      <ul className="space-y-1.5">
        {rows.map((a) => {
          const color = OWNERS[a.team].color;
          return (
            <li key={a.id} className="flex items-center gap-3 rounded-lg bg-[#0b0d16] p-1.5 pr-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border" style={{ borderColor: color, background: `${color}22`, color }}>
                <Icon name={KIND_ICON[a.kind]} size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-200">
                  {a.who && <b className="font-semibold text-white">{a.who} </b>}{a.text}
                </p>
                <p className="text-xs text-mute">{a.ago}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}