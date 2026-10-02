import Icon from "./Icon.jsx";
import { BLUE, RED } from "../../theme.js";

export function Panel({ children, className = "" }) {
  return <section className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 ${className}`}>{children}</section>;
}

export function SectionTitle({ icon, children, action, onAction, accent = RED }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-wide">
        {icon && <Icon name={icon} size={18} style={{ color: accent }} />}
        {children}
      </h3>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-xs" style={{ color: BLUE }}>
          {action} <Icon name="chevron" size={12} />
        </button>
      )}
    </div>
  );
}