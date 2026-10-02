import { useEffect, useState } from "react";
import Icon from "../ui/Icon.jsx";
import ScreenHeader from "../ui/ScreenHeader.jsx";
import { GREEN } from "../../theme.js";
import { ALLOWED_RANGE, MIN_SIMILARITY, checkImage, checkLocation } from "./verify.js";

function StatusRow({ icon, color, title, sub, done }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="grid h-11 w-11 place-items-center rounded-lg" style={{ background: `${color}22`, color }}><Icon name={icon} size={22} /></span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-mute">{sub}</span>
      </span>
      {done ? (
        <Icon name="check" size={22} style={{ color: GREEN }} />
      ) : (
        <span className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: color, borderTopColor: "transparent" }} aria-label="In progress" />
      )}
    </div>
  );
}

function Radar({ distance, accent }) {
  const r = 52;
  const you = 70 + Math.min((distance ?? ALLOWED_RANGE) / ALLOWED_RANGE, 1.5) * r;
  return (
    <svg viewBox="0 0 320 190" className="h-auto w-full" role="img" aria-label="Distance diagram">
      <rect width="320" height="190" fill="#0a0e18" />
      {[r * 1.6, r, r * 0.55].map((rad, i) => (
        <circle key={i} cx="160" cy="70" r={rad} fill={i === 1 ? `${accent}18` : "none"} stroke={accent} strokeOpacity={i === 1 ? 0.7 : 0.25} strokeDasharray={i === 1 ? "0" : "3 4"} />
      ))}
      <line x1="160" y1="86" x2="160" y2={you - 6} stroke={accent} strokeOpacity=".8" />
      <circle cx="160" cy="70" r="14" fill="#1a0d12" stroke={accent} strokeWidth="2" />
      <path d="m160 62 5 14h-10Z" fill={accent} />
      <circle cx="160" cy={you} r="6" fill="#2f7bff" stroke="#fff" strokeWidth="1.5" />
      <text x="160" y={you + 20} textAnchor="middle" fill="#cbd5e1" fontSize="11">You</text>
      {distance != null && <text x="172" y={(86 + you) / 2} fill="#fff" fontSize="12">{distance} m</text>}
    </svg>
  );
}

export default function Verifying({ portal, photo, accent, onBack, onDone }) {
  const [loc, setLoc] = useState(null);
  const [img, setImg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [l, i] = await Promise.all([
        checkLocation(portal).then((r) => { if (!cancelled) setLoc(r); return r; }),
        checkImage(photo, portal).then((r) => { if (!cancelled) setImg(r); return r; }),
      ]);
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 700));
      if (cancelled) return;
      const locationOk = l.distance != null && l.distance <= ALLOWED_RANGE;
      const imageOk = i.similarity >= MIN_SIMILARITY;
      onDone({ distance: l.distance, similarity: i.similarity, locationOk, imageOk, locationError: Boolean(l.error), ok: locationOk && imageOk });
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const near = loc?.distance != null && loc.distance <= ALLOWED_RANGE;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Verifying Portal" subtitle="Our systems are analyzing your submission..." onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto mt-3 h-[190px] w-[160px] overflow-hidden rounded-lg border-2" style={{ borderColor: accent, boxShadow: `0 0 22px ${accent}66` }}>
          <img src={photo} alt="Your captured photo" className="h-full w-full object-cover" />
        </div>

        <div className="mt-6 space-y-2.5">
          <StatusRow icon="pin" color={GREEN} title="Checking location..." sub="Verifying your current coordinates" done={Boolean(loc)} />
          <StatusRow icon="image" color={accent} title="Analyzing image..." sub="Comparing with portal data" done={Boolean(img)} />
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <Radar distance={loc?.distance} accent={accent} />
          <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 text-center">
            <div className="py-3">
              <p className="text-[11px] text-mute">Distance to portal</p>
              <p className="mt-1 font-display text-lg font-bold" style={{ color: loc ? (near ? GREEN : accent) : "#8a8fa0" }}>
                {loc ? (loc.distance != null ? `${loc.distance} meters` : "Unavailable") : "…"}
              </p>
            </div>
            <div className="py-3">
              <p className="text-[11px] text-mute">Allowed range</p>
              <p className="mt-1 font-display text-lg font-bold">≤ {ALLOWED_RANGE} meters</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}