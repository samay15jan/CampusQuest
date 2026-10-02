import Icon from "../ui/Icon.jsx";
import { SectionTitle } from "../ui/Panel.jsx";
import { PROFILE_ACTIVITY } from "../../data/mock.js";

export default function ProfileActivity({ items = PROFILE_ACTIVITY }) {
  return (
    <section className="mt-6 px-4">
      <SectionTitle icon={null} action="View All">Recent Activity</SectionTitle>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border" style={{ borderColor: `${a.color}88`, background: `${a.color}1f`, color: a.color }}>
              <Icon name={a.icon} size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{a.text}</span>
              <span className="block text-xs text-mute">{a.ago}</span>
            </span>
            <span className="text-sm font-semibold" style={{ color: "#ffb020" }}>+{a.xp} XP</span>
          </li>
        ))}
      </ul>
    </section>
  );
}