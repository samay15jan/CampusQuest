import { useState } from "react";
import Icon from "../ui/Icon.jsx";
import Crystal from "../ui/Crystal.jsx";
import ScreenHeader from "../ui/ScreenHeader.jsx";
import PrimaryButton, { BottomAction } from "../ui/PrimaryButton.jsx";
import { RESONATOR_TYPES } from "../../data/mock.js";

export default function DeployResonator({ portal, photo, accent, onBack, onConfirm }) {
  const firstAvailable = RESONATOR_TYPES.find((r) => r.owned > 0);
  const [selected, setSelected] = useState(firstAvailable?.id);
  const current = RESONATOR_TYPES.find((r) => r.id === selected);

  return (
    <div className="relative flex h-full flex-col">
      <ScreenHeader title="Deploy Resonator" subtitle="Select a resonator to deploy at this portal." onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        <div role="radiogroup" aria-label="Resonator type" className="grid grid-cols-3 gap-2.5">
          {RESONATOR_TYPES.map((r) => {
            const on = r.id === selected;
            const empty = r.owned === 0;
            return (
              <button
                key={r.id}
                role="radio"
                aria-checked={on}
                disabled={empty}
                onClick={() => setSelected(r.id)}
                className="relative flex flex-col items-center rounded-xl border-2 bg-[#0b0d16] px-2 pb-3 pt-4 transition disabled:opacity-40"
                style={{ borderColor: on ? accent : "rgba(255,255,255,.1)", boxShadow: on ? `0 0 16px ${accent}66` : "none" }}
              >
                {on && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: accent }}>
                    <Icon name="check" size={14} />
                  </span>
                )}
                <div className="grid h-[88px] place-items-center"><Crystal color={r.color} size={78} /></div>
                <p className="mt-2 text-sm font-semibold" style={{ color: r.id === "standard" ? "#fff" : r.color }}>{r.name}</p>
                <p className="text-[11px] text-mute">Owned: {r.owned}</p>
              </button>
            );
          })}
        </div>

        <section className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <p className="px-3 py-2.5 text-sm font-semibold">Resonator Preview</p>
          <div className="relative h-[300px] bg-[#0b0d16]">
            <img src={photo || portal.img} alt="Portal preview" className="h-full w-full object-cover" />
            {current && (
              <div className="absolute inset-x-0 bottom-6 grid place-items-center">
                <Crystal color={current.color} size={96} />
              </div>
            )}
          </div>
          <div className="px-3 py-3 text-[11px] leading-4 text-mute">
            Deploy a resonator to contribute to your faction's control.<br />This will be visible to all players.
          </div>
        </section>
      </div>

      <BottomAction>
        <PrimaryButton icon="upload" accent={accent} disabled={!current} onClick={() => onConfirm(current)}>Confirm Deployment</PrimaryButton>
      </BottomAction>
    </div>
  );
}