import Icon from "../ui/Icon.jsx";
import { SectionTitle } from "../ui/Panel.jsx";
import { ACHIEVEMENTS } from "../../data/mock.js";

export default function Achievements({ items = ACHIEVEMENTS }) {
  return (
    <section className="mt-6 px-4">
      <SectionTitle icon={null} action="View All">Achievements</SectionTitle>
      <ul className="grid grid-cols-4 gap-2">
        {items.map((a) => {
          const c = a.locked ? "#4a4e5c" : a.color;
          return (
            <li key={a.id} className="flex flex-col items-center gap-2">
              <span
                className="grid h-[72px] w-[72px] place-items-center rounded-full border-2"
                style={{ borderColor: c, background: `${c}1f`, color: c, boxShadow: a.locked ? "none" : `0 0 16px ${c}66` }}
              >
                <Icon name={a.icon} size={32} />
              </span>
              <span className="text-center text-[11px] text-slate-300">{a.locked ? "? ? ?" : a.name}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}