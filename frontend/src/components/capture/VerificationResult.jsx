import Icon from "../ui/Icon.jsx";
import ScreenHeader from "../ui/ScreenHeader.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";
import { GREEN } from "../../theme.js";
import { ALLOWED_RANGE, MIN_SIMILARITY } from "./verify.js";

function failReason(r) {
  if (r.locationError) return "We couldn't read your location. Enable location access and try again.";
  if (!r.locationOk) return `You're ${r.distance} m away. Get within ${ALLOWED_RANGE} m of the portal.`;
  return `Photo similarity was ${r.similarity}% (needs ≥ ${MIN_SIMILARITY}%). Retake it with the full structure in frame.`;
}

const Dot = ({ ok, accent }) => (
  <span className="grid h-7 w-7 place-items-center rounded-full text-black" style={{ background: ok ? GREEN : accent }}>
    <Icon name={ok ? "check" : "x"} size={16} />
  </span>
);

function Metric({ icon, title, value, ok, accent }) {
  const c = ok ? GREEN : accent;
  return (
    <div className="relative flex flex-col items-center rounded-xl border p-3 text-center" style={{ borderColor: `${c}88`, background: `${c}14` }}>
      <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: `${c}22`, color: c }}><Icon name={icon} size={20} /></span>
      <p className="mt-2 text-xs font-semibold">{title}</p>
      <p className="mt-0.5 text-sm" style={{ color: c }}>{value}</p>
      <span className="mt-2 self-end"><Dot ok={ok} accent={accent} /></span>
    </div>
  );
}

export default function VerificationResult({ portal, photo, result, accent, onBack, onDeploy, onRetake }) {
  const { ok, locationOk, imageOk, distance, similarity } = result;
  const c = ok ? GREEN : accent;

  const checks = [
    ["pin", "Location Match", `Within ${ALLOWED_RANGE} meters`, locationOk],
    ["image", "Visual Similarity", `${similarity}% (≥ ${MIN_SIMILARITY}%)`, imageOk],
    ["camera", "Portal Status", ok ? "Ready for resonator" : "Not verified", ok],
  ];

  return (
    <div className="relative flex h-full flex-col">
      <ScreenHeader title="Verification Result" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        <div className="rounded-xl border px-4 py-6 text-center" style={{ borderColor: `${c}88`, background: `${c}12` }}>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4" style={{ borderColor: c, color: c, boxShadow: `0 0 28px ${c}88` }}>
            <Icon name={ok ? "check" : "x"} size={42} />
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold">{ok ? "Portal Verified" : "Verification Failed"}</h2>
          <p className="mt-1 text-sm text-mute">{ok ? "Your location and photo match this portal." : failReason(result)}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Metric icon="pin" title={locationOk ? "Location Confirmed" : "Location Mismatch"} value={distance != null ? `${distance} m away` : "Unavailable"} ok={locationOk} accent={accent} />
          <Metric icon="image" title={imageOk ? "Visual Match" : "Visual Mismatch"} value={`${similarity}% similarity`} ok={imageOk} accent={accent} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {[[photo, "Your Photo"], [portal.img, "Reference Image"]].map(([src, label], i) => (
            <div key={label} className="contents">
              {i === 1 && <Icon name="frame" size={22} className="shrink-0 text-mute" />}
              <figure className="flex-1 text-center">
                {src
                  ? <img src={src} alt={label} className="h-24 w-full rounded-lg border border-white/10 object-cover" />
                  : <div className="grid h-24 w-full place-items-center rounded-lg border border-white/10 bg-white/5 text-xs text-mute">No reference</div>}
                <figcaption className="mt-2 text-xs text-mute">{label}</figcaption>
              </figure>
            </div>
          ))}
        </div>

        <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
          {checks.map(([icon, t, s, pass]) => (
            <li key={t} className="flex items-center gap-3 px-3 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-slate-300"><Icon name={icon} size={20} /></span>
              <span className="flex-1"><span className="block text-sm font-semibold">{t}</span><span className="block text-xs text-mute">{s}</span></span>
              <Dot ok={pass} accent={accent} />
            </li>
          ))}
        </ul>
      </div>

      <BottomAction>
        {ok
          ? <PrimaryButton icon="upload" accent={accent} onClick={onDeploy}>Deploy Resonator</PrimaryButton>
          : <PrimaryButton icon="camera" accent={accent} onClick={onRetake}>Retake Photo</PrimaryButton>}
      </BottomAction>
    </div>
  );
}