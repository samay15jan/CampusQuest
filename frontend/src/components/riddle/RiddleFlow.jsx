import { useEffect, useState } from "react";
import RiddleQuestion from "./RiddleQuestion.jsx";
import RiddleSolved from "./RiddleSolved.jsx";
import { answerRiddle, getTodayRiddles } from "../../api/riddles.js";

export default function RiddleFlow({ accent, onClose, onUpdated }) {
  const [riddles, setRiddles] = useState([]);
  const [availableResonators, setAvailableResonators] = useState(null);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState("loading");
  const [reward, setReward] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setError("");
      const data = await getTodayRiddles();
      const today = data?.riddles ?? [];
      setRiddles(today);
      setAvailableResonators(data?.available_resonators ?? null);
      const firstUnsolved = today.findIndex((r) => !r.solved);
      if (firstUnsolved === -1) setStep("complete");
      else {
        setIndex(firstUnsolved);
        setStep("question");
      }
    } catch (err) {
      setError(err.message || "Failed to load today's riddles.");
      setStep("error");
    }
  };

  useEffect(() => { load(); }, []);

  const current = riddles[index];

  const submit = async (answer) => {
    if (!current || submitting) return null;
    setSubmitting(true);
    try {
      const result = await answerRiddle(current.id, answer);
      if (!result.correct) return result;

      setRiddles((prev) => prev.map((r, i) => i === index ? { ...r, solved: true } : r));
      setAvailableResonators(result.available_resonators ?? availableResonators);
      setReward(result);
      setStep("solved");
      onUpdated?.(result);
      return result;
    } catch (err) {
      setError(err.message || "Unable to submit answer.");
      setStep("error");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const continueAfterSolve = () => {
    const next = riddles.findIndex((r, i) => i > index && !r.solved);
    if (next !== -1) {
      setIndex(next);
      setStep("question");
      setReward(null);
    } else {
      setStep("complete");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05060b] text-white">
      {step === "loading" && <div className="grid h-full place-items-center text-sm text-mute">Loading today's riddles…</div>}

      {step === "error" && (
        <div className="grid h-full place-items-center px-6 text-center">
          <div>
            <p className="font-display text-xl font-bold">Riddles unavailable</p>
            <p className="mt-2 text-sm text-mute">{error}</p>
            <button className="mt-5 rounded-lg border border-white/15 px-4 py-2 text-sm" onClick={load}>Try again</button>
          </div>
        </div>
      )}

      {step === "question" && current && (
        <RiddleQuestion
          question={current}
          accent={accent}
          index={index + 1}
          total={riddles.length || 2}
          onBack={onClose}
          onSubmit={submit}
          submitting={submitting}
        />
      )}

      {step === "solved" && (
        <RiddleSolved
          accent={accent}
          xp={reward?.xp?.awarded ?? 100}
          resonator={reward?.resonator_granted ?? 1}
          onBack={onClose}
          onContinue={continueAfterSolve}
        />
      )}

      {step === "complete" && (
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto px-6 pt-[max(2rem,env(safe-area-inset-top))] text-center">
            <div className="mx-auto mt-16 grid h-24 w-24 place-items-center rounded-full border border-white/15 bg-white/[0.04]">
              <span className="font-display text-3xl font-black">✓</span>
            </div>
            <h1 className="mt-6 font-display text-3xl font-bold">Daily riddles complete</h1>
            <p className="mt-2 text-sm leading-6 text-mute">You've solved all of today's riddles. Your earned resonators are ready for deployment.</p>
            {availableResonators != null && <p className="mt-6 font-display text-lg font-bold">{availableResonators} resonator{availableResonators === 1 ? "" : "s"} available</p>}
          </div>
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button onClick={onClose} className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-display font-bold">Back to game</button>
          </div>
        </div>
      )}
    </div>
  );
}
