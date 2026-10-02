import Icon from "./Icon.jsx";

export default function ScreenHeader({ title, subtitle, onBack }) {
  return (
    <header className="px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-4">
        <button onClick={onBack} aria-label="Back"><Icon name="back" size={24} /></button>
        <h1 className="flex-1 text-center font-display text-lg font-bold tracking-wide pr-6">{title}</h1>
      </div>
      {subtitle && <p className="mt-3 text-center text-sm text-mute">{subtitle}</p>}
    </header>
  );
}