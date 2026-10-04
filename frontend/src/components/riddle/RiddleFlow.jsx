import { useMemo, useState } from "react";
import RiddleBrief from "./RiddleBrief.jsx";
import RiddleQuestion from "./RiddleQuestion.jsx";
import RiddleSolved from "./RiddleSolved.jsx";
import CaptureFlow from "../capture/CaptureFlow.jsx";
import { buildQuestion, RIDDLE_XP } from "./riddleLogic.js";
import { toPortal } from "../../data/locations.js";

/**
 * Opens when a location is tapped on the map:
 * brief (locked) -> riddle -> correct -> brief (solved) -> camera / capture flow
 */
export default function RiddleFlow({ location, accent, solved, onSolved, onClose, onComplete }) {
  const portal = useMemo(() => toPortal(location), [location]);
  const [question] = useState(() => buildQuestion(location)); // fixed for this visit
  const [step, setStep] = useState("brief");

  return (
    <div className="fixed inset-0 z-40 bg-[#05060b] text-white">
      {step === "brief" && (
        <RiddleBrief
          portal={portal} accent={accent} solved={solved}
          onBack={onClose}
          onSolve={() => setStep("riddle")}
          onOpenCamera={() => setStep("capture")}
        />
      )}
      {step === "riddle" && (
        <RiddleQuestion
          question={question} icon={location.icon} accent={accent}
          onBack={() => setStep("brief")}
          onCorrect={() => { onSolved(location.id); setStep("solved"); }}
        />
      )}
      {step === "solved" && (
        <RiddleSolved accent={accent} xp={RIDDLE_XP} onBack={() => setStep("brief")} onContinue={() => setStep("brief")} />
      )}
      {step === "capture" && (
        <CaptureFlow portal={portal} accent={accent} startAt="camera" onClose={() => setStep("brief")} onComplete={onComplete} />
      )}
    </div>
  );
}