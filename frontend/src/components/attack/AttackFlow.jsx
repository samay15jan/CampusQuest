import { useEffect, useState } from "react";
import Icon from "../ui/Icon.jsx";
import ScreenHeader from "../ui/ScreenHeader.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";
import { GREEN, RED, BLUE } from "../../theme.js";
import { checkLocation, ALLOWED_RANGE } from "../capture/verify.js";
import { attackPortal } from "../../api/attack.js";

function StatusRow({ icon, color, title, sub, done, failed }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="grid h-11 w-11 place-items-center rounded-lg" style={{ background: `${color}22`, color }}>
        <Icon name={icon} size={22} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-mute">{sub}</span>
      </span>
      {failed ? <Icon name="x" size={22} style={{ color }} /> : done ? <Icon name="check" size={22} style={{ color: GREEN }} /> : <span className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: color, borderTopColor: "transparent" }} />}
    </div>
  );
}

export default function AttackFlow({ portal, playerFaction, accent, targetResonatorId = null, onClose, onComplete }) {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("locating");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const factionColor = playerFaction === "red" ? RED : BLUE;
  const color = accent || factionColor;
  const near = location?.distance != null && location.distance <= ALLOWED_RANGE;
  const ownPortal = portal?.owner_faction && playerFaction && portal.owner_faction === playerFaction;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus("locating");
        setError(null);
        const loc = await checkLocation(portal);
        if (cancelled) return;
        setLocation(loc);

        if (loc.error || loc.latitude == null || loc.longitude == null) {
          setStatus("failed");
          setError(loc.message || "Unable to read your location");
          return;
        }

        if (loc.distance > ALLOWED_RANGE) {
          setStatus("failed");
          setError(`You are ${loc.distance}m from the portal. Move within ${ALLOWED_RANGE}m to attack.`);
          return;
        }

        if (ownPortal) {
          setStatus("failed");
          setError("You cannot attack your own faction's portal.");
          return;
        }

        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setStatus("failed");
        setError(err?.message || "Unable to verify your location");
      }
    })();

    return () => { cancelled = true; };
  }, [portal, ownPortal]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const attack = async () => {
    if (status !== "ready" || !location || cooldown > 0) return;

    setStatus("attacking");
    setError(null);
    try {
      const response = await attackPortal(portal.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        targetResonatorId,
      });

      const cooldownSeconds = Number(response.cooldown_seconds || 0);
      setCooldown(cooldownSeconds);
      setResult(response);
      setStatus("success");
      onComplete?.(response);
    } catch (err) {
      const retryAfter = Number(err?.retryAfter || err?.details?.retryAfter || err?.data?.retryAfter || 0);
      if (retryAfter > 0) setCooldown(retryAfter);
      setStatus("failed");
      setError(err?.message || "Attack failed");
    }
  };

  const portalFaction = portal?.owner_faction;
  const hasEnemy = portalFaction && (!playerFaction || portalFaction !== playerFaction);

  return (
    <div className="relative flex h-full flex-col bg-[#05060b] text-white">
      <ScreenHeader title="Attack Portal" subtitle="Verify your position, then destroy one enemy resonator." onBack={onClose} />

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        <section className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="relative h-52 bg-[#0b0d16]">
            <img src={portal?.img || portal?.image_url} alt={portal?.name || "Portal"} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
              <p className="font-display text-xl font-bold">{portal?.name || "Enemy Portal"}</p>
              <p className="text-xs text-mute">{portalFaction ? `${portalFaction.toUpperCase()} controlled` : "Portal"}</p>
            </div>
          </div>
        </section>

        <div className="mt-4 space-y-2.5">
          <StatusRow
            icon="pin"
            color={color}
            title="GPS verification"
            sub={location?.accuracy ? `GPS accuracy ±${Math.round(location.accuracy)}m` : "Reading your current coordinates"}
            done={near}
            failed={status === "failed" && Boolean(location?.error || location?.distance > ALLOWED_RANGE)}
          />
          <StatusRow
            icon="swords"
            color={color}
            title="Attack"
            sub={status === "attacking" ? "Destroying one enemy resonator..." : status === "success" ? "Enemy resonator destroyed" : "Ready when you are in range"}
            done={status === "success"}
            failed={status === "failed" && Boolean(location?.distance <= ALLOWED_RANGE)}
          />
        </div>

        <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-mute">Your distance</span>
            <span className="font-display font-bold" style={{ color: near ? GREEN : RED }}>
              {location?.distance != null ? `${location.distance}m` : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-mute">Attack range</span>
            <span className="font-display font-bold">≤ {ALLOWED_RANGE}m</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-mute">Enemy resonators</span>
            <span className="font-display font-bold">{portal?.resonators?.[portalFaction] ?? portal?.resonators?.total ?? "—"}</span>
          </div>
        </section>

        {result && (
          <section className="mt-4 rounded-xl border border-green-400/30 bg-green-400/10 p-4">
            <p className="text-sm font-semibold text-green-200">Resonator destroyed.</p>
            <p className="mt-1 text-xs text-mute">
              {result.portal?.active_resonators ?? result.portal?.resonators?.total ?? 0} active resonator(s) remain.
              {result.xp?.amount != null ? ` +${result.xp.amount} XP` : ""}
            </p>
            {cooldown > 0 && <p className="mt-2 text-xs text-mute">Next attack available in {cooldown}s.</p>}
          </section>
        )}

        {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-3 text-sm text-red-200">{error}</div>}
      </div>

      <BottomAction>
        {status === "success" ? (
          <PrimaryButton icon="check" accent={color} onClick={onClose}>Return to Portal</PrimaryButton>
        ) : (
          <PrimaryButton
            icon="swords"
            accent={color}
            disabled={status !== "ready" || !hasEnemy || cooldown > 0}
            onClick={attack}
          >
            {status === "attacking" ? "Attacking..." : cooldown > 0 ? `Cooldown ${cooldown}s` : hasEnemy ? "Destroy Resonator" : "No Enemy Resonator"}
          </PrimaryButton>
        )}
      </BottomAction>
    </div>
  );
}
