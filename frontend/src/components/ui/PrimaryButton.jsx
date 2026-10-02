import Icon from "./Icon.jsx";

export default function PrimaryButton({ icon, children, onClick, accent, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-white/20 font-display text-base font-bold transition active:brightness-125 disabled:opacity-40"
      style={{ background: `linear-gradient(90deg, ${accent}99, ${accent})`, boxShadow: `0 0 22px ${accent}55` }}
    >
      {icon && <Icon name={icon} size={22} />}
      {children}
    </button>
  );
}

/** Pins a button to the bottom of its (relative/fixed) parent, respecting the iPhone home bar. */
export function BottomAction({ children }) {
  return <div className="absolute inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>;
}