import { Panel, SectionTitle } from "../ui/Panel.jsx";
import Icon from "../ui/Icon.jsx";
import { OWNERS } from "../../theme.js";

const KIND_ICON = {
  RESONATOR_DEPLOYED: "crystal",
  RESONATOR_DESTROYED: "bolt",
  PORTAL_CAPTURED: "flag",
  PORTAL_LOST: "flag",
};

function timeAgo(value) {
  if (!value) return "just now";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "just now";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function describe(item) {
  const portal = item.portal_name ? ` at ${item.portal_name}` : "";
  switch (item.type) {
    case "RESONATOR_DEPLOYED": return `deployed a resonator${portal}`;
    case "RESONATOR_DESTROYED": return `destroyed a resonator${portal}`;
    case "PORTAL_CAPTURED": return `captured ${item.portal_name || "a portal"}`;
    case "PORTAL_LOST": return `lost control of ${item.portal_name || "a portal"}`;
    default: return "performed an action";
  }
}

export function ActivityRows({ items = [] }) {
  return items.map((a) => {
    const faction = a.faction || "neutral";
    const owner = OWNERS[faction] || OWNERS.neutral;
    return (
      <li key={a.id} className="flex items-center gap-3 rounded-lg bg-[#0b0d16] p-1.5 pr-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border" style={{ borderColor: owner.color, background: `${owner.color}22`, color: owner.color }}>
          <Icon name={KIND_ICON[a.type] || "flag"} size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-200">
            {a.username && <b className="font-semibold text-white">{a.username} </b>}{describe(a)}
          </p>
          <p className="text-xs text-mute">{timeAgo(a.created_at)}</p>
        </div>
      </li>
    );
  });
}

export default function ActivityList({ items = [], accent, limit }) {
  const rows = limit ? items.slice(0, limit) : items;
  return (
    <Panel className="mx-4 mt-3">
      <SectionTitle icon="bars" accent={accent}>Recent Activity</SectionTitle>
      {rows.length ? (
        <ul className="space-y-1.5"><ActivityRows items={rows} /></ul>
      ) : (
        <p className="py-8 text-center text-sm text-mute">No activity yet.</p>
      )}
    </Panel>
  );
}
