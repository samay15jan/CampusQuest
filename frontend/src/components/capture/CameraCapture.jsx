import useCamera from "../utils/useCamera.js";
import Icon from "../ui/Icon.jsx";

const Corner = ({ pos }) => (
  <span className={`absolute h-7 w-7 border-[#ff3b3b] ${pos}`} />
);

export default function CameraCapture({ accent, onClose, onCapture }) {
  const { videoRef, status, start, takePhoto, torchOn, torchSupported, toggleTorch } = useCamera();

  const shoot = () => {
    const photo = takePhoto();
    if (photo) onCapture(photo);
  };

  return (
    <div className="relative flex h-full flex-col bg-black">
      {/* live preview */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <button onClick={onClose} aria-label="Close camera" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/50 backdrop-blur">
            <Icon name="x" size={20} />
          </button>
          <button
            onClick={toggleTorch}
            disabled={!torchSupported}
            aria-label="Toggle flash"
            aria-pressed={torchOn}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/50 backdrop-blur disabled:opacity-40"
            style={{ color: torchOn ? "#ffd54a" : "#fff" }}
          >
            <Icon name="bolt" size={20} />
          </button>
        </div>

        {status === "ready" && (
          <>
            <div className="pointer-events-none absolute inset-x-6 top-24 bottom-6">
              <Corner pos="left-0 top-0 border-l-2 border-t-2" />
              <Corner pos="right-0 top-0 border-r-2 border-t-2" />
              <Corner pos="bottom-0 left-0 border-b-2 border-l-2" />
              <Corner pos="bottom-0 right-0 border-b-2 border-r-2" />
            </div>
            <div className="absolute inset-x-8 top-[88px] rounded-lg border border-red-400/40 bg-black/60 px-4 py-2 text-center backdrop-blur">
              <p className="text-sm font-semibold" style={{ color: accent }}>Align the <span className="text-white">portal</span> in frame</p>
              <p className="text-xs text-slate-300">Make sure the full structure is visible</p>
            </div>
          </>
        )}

        {status !== "ready" && (
          <div className="absolute inset-0 grid place-items-center bg-[#05060b] px-8 text-center">
            {status === "starting" ? (
              <p className="text-sm text-mute">Starting camera…</p>
            ) : (
              <div>
                <Icon name="camera" size={40} className="mx-auto text-mute" />
                <p className="mt-4 font-display text-base font-bold">
                  {status === "denied" ? "Camera access blocked" : status === "unsupported" ? "Camera not available" : "Couldn't start the camera"}
                </p>
                <p className="mt-2 text-sm text-mute">
                  {status === "denied" && "Allow camera access for this site in your browser settings, then try again."}
                  {status === "unsupported" && "Camera access needs HTTPS (or localhost) and a supported browser."}
                  {status === "error" && "Another app may be using the camera. Close it and try again."}
                </p>
                {status !== "unsupported" && (
                  <button onClick={start} className="mt-5 rounded-lg border px-5 py-2.5 text-sm font-semibold" style={{ borderColor: accent, color: accent }}>Try again</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* controls */}
      <div className="bg-[#05060b] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex justify-center gap-16 text-xs font-semibold uppercase tracking-wider">
          <span style={{ color: accent }}>Photo</span>
          <span className="text-mute/60" aria-disabled="true">Video</span>
        </div>
        <div className="mt-3 flex items-center justify-between px-4">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-mute/60" aria-hidden="true"><Icon name="image" size={22} /></span>
          <button
            onClick={shoot}
            disabled={status !== "ready"}
            aria-label="Take photo"
            className="grid h-[76px] w-[76px] place-items-center rounded-full border-4 transition active:scale-95 disabled:opacity-40"
            style={{ borderColor: accent, boxShadow: `0 0 18px ${accent}88` }}
          >
            <span className="h-[56px] w-[56px] rounded-full bg-white" />
          </button>
          <span className="w-12" />
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border bg-white/[0.03] p-3" style={{ borderColor: `${accent}66` }}>
          <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${accent}22`, color: accent }}><Icon name="camera" size={20} /></span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Live capture only</span>
            <span className="block text-xs text-mute">Gallery uploads are disabled to prevent fraud.</span>
          </span>
          <Icon name="ban" size={20} style={{ color: accent }} />
        </div>
      </div>
    </div>
  );
}