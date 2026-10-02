export default function Crystal({ color, size = 56, dim = false }) {
  return (
    <svg viewBox="0 0 40 64" width={size * 0.62} height={size} aria-hidden="true" style={{ filter: dim ? "none" : `drop-shadow(0 0 8px ${color})` }}>
      <polygon points="20,2 36,20 20,62 4,20" fill={color} fillOpacity=".35" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 20h32M20 2 14 20l6 42 6-42-6-18" stroke={color} strokeOpacity=".7" fill="none" strokeLinejoin="round" />
    </svg>
  );
}