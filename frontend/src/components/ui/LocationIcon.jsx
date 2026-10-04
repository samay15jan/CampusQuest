import { ICONS } from "../../data/locations.js";

/** The same glyphs the map markers use, as a React component. */
export default function LocationIcon({ name, size = 24, strokeWidth = 2, className = "", style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? "" }}
    />
  );
}