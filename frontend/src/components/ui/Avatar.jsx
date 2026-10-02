/** Initial-letter avatar. Pass `src` to show a real picture. */
export default function Avatar({ name, src, size = 36, ring, glow = false }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-b from-[#3a3f55] to-[#14161f] font-display font-bold uppercase"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        boxShadow: `${ring ? `0 0 0 ${size > 80 ? 3 : 2}px ${ring}` : "0 0 0 1px rgba(255,255,255,.15)"}${glow && ring ? `, 0 0 24px ${ring}88` : ""}`,
      }}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : name[0]}
    </span>
  );
}