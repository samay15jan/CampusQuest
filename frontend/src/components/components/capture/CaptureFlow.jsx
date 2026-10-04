import { useState } from "react";
import PortalBrief from "./PortalBrief.jsx";
import CameraCapture from "./CameraCapture.jsx";
import Verifying from "./Verifying.jsx";
import VerificationResult from "./VerificationResult.jsx";
import DeployResonator from "./DeployResonator.jsx";

/**
 * Full-screen capture flow:
 * brief -> camera -> verifying -> result -> deploy
 * Each step is mounted only while active, so the camera stream is released as soon as you leave it.
 */
export default function CaptureFlow({ portal, accent, availableResonators = 0, startAt = "brief", onClose, onComplete }) {
  const [step, setStep] = useState(startAt);
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);

  return (
    <div className="fixed inset-0 z-40 bg-[#05060b] text-white">
      {step === "brief" && (
        <PortalBrief portal={portal} accent={accent} onBack={onClose} onCapture={() => setStep("camera")} />
      )}
      {step === "camera" && (
        <CameraCapture accent={accent} onClose={() => (startAt === "camera" ? onClose() : setStep("brief"))} onCapture={(p) => { setPhoto(p); setStep("verifying"); }} />
      )}
      {step === "verifying" && (
        <Verifying portal={portal} photo={photo} accent={accent} onBack={() => setStep("camera")} onDone={(r) => { setResult(r); setStep("result"); }} />
      )}
      {step === "result" && (
        <VerificationResult
          portal={portal} photo={photo} result={result} accent={accent}
          onBack={() => setStep("camera")} onRetake={() => setStep("camera")} onDeploy={() => setStep("deploy")}
        />
      )}
      {step === "deploy" && (
        <DeployResonator
          portal={portal} photo={photo} accent={accent} availableResonators={availableResonators}
          onBack={() => setStep("result")}
          onConfirm={(resonator) => onComplete({ portalId: portal.id, photo, resonator, verification: result })}
        />
      )}
    </div>
  );
}