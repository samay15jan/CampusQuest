import Icon from "../ui/Icon.jsx";

export const NAV_ITEMS = [
  { id: "map", label: "Map", icon: "map" },
  { id: "intel", label: "Intel", icon: "intel" },
  { id: "profile", label: "Profile", icon: "user" },
];

export default function BottomNav({ view, onChange, accent, items = NAV_ITEMS, onScan }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#07080d]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="grid grid-cols-4 items-end">
        <div className="col-span-3 grid grid-flow-col items-end">
          {items.map(({ id, label, icon }) => {
            const on = view === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                aria-current={on ? "page" : undefined}
                className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px]"
                style={{ color: on ? accent : "#8a8fa0" }}
              >
                <Icon name={icon} size={24} />
                {label}
              </button>
            );
          })}
        </div>
        <div className="relative flex flex-1 justify-center">
          <button
            aria-label="Scan"
            onClick={onScan}
            className="-mr-5 -mt-12 grid h-20 w-20 place-items-center rounded-l-full rounded-tr-full border-2 bg-[#0b0d16]"
            style={{ borderColor: accent, color: accent, boxShadow: `0 0 18px ${accent}88` }}
          >
            <Icon name="scan" size={30} />
          </button>
        </div>
      </div>
    </nav>
  );
}