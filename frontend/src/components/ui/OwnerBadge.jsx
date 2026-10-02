import Icon from "./Icon.jsx";
import { OWNERS } from "../../theme.js";

/** Round portal icon tinted by owning faction. */
export default function OwnerBadge({ owner, size = 28 }) {
  const { color } = OWNERS[owner];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border-2 bg-[#0b0d16]"
      style={{ width: size, height: size, borderColor: color, color, boxShadow: `0 0 10px ${color}66` }}
    >
      <Icon name="tower" size={size * 0.5} />
    </span>
  );
}