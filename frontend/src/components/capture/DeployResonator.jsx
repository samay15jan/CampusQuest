import { useState } from "react";
import Icon from "../ui/Icon.jsx";
import Crystal from "../ui/Crystal.jsx";
import ScreenHeader from "../ui/ScreenHeader.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";
import { RED } from "../../theme.js";
import { deployPortal } from "../../api/capture.js";

export default function DeployResonator({ portal, photo, accent, availableResonators = 0, verification, onBack, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const confirm = async () => {
    if (!verification?.verification_id || availableResonators < 1 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await deployPortal(portal.id, verification.verification_id);
      onConfirm(result);
    } catch (err) {
      setError(err?.message || "Deployment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <ScreenHeader title="Deploy Resonator" subtitle="Deploy one of your earned resonators at this portal." onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border" style={{ borderColor: accent, color: accent, boxShadow: `0 0 22px ${accent}55` }}>
            <Crystal color={accent || RED} size={70} />
          </div>
          <p className="mt-4 text-sm text-mute">Available resonators</p>
          <p className="mt-1 font-display text-3xl font-bold">{availableResonators}</p>
        </section>

        <section className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <p className="px-3 py-2.5 text-sm font-semibold">Resonator Preview</p>
          <div className="relative h-[300px] bg-[#0b0d16]">
            <img src={photo || portal.img} alt="Portal preview" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-6 grid place-items-center">
              <Crystal color={accent || RED} size={96} />
            </div>
          </div>
          <div className="px-3 py-3 text-[11px] leading-4 text-mute">One resonator will be consumed when deployment succeeds.</div>
        </section>

        {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-3 text-sm text-red-200">{error}</div>}
      </div>

      <BottomAction>
        <PrimaryButton icon="upload" accent={accent} disabled={!verification?.verification_id || availableResonators < 1 || submitting} onClick={confirm}>
          {submitting ? "Deploying..." : availableResonators > 0 ? "Confirm Deployment" : "No Resonators Available"}
        </PrimaryButton>
      </BottomAction>
    </div>
  );
}
