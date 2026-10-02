import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Live rear-camera stream. Needs HTTPS (or localhost) and user permission.
 * status: "starting" | "ready" | "denied" | "unsupported" | "error"
 */
export default function useCamera({ facingMode = "environment" } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mounted = useRef(true);
  const [status, setStatus] = useState("starting");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setStatus("unsupported");
    setStatus("starting");
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (!mounted.current) return stream.getTracks().forEach((t) => t.stop()); // unmounted while prompting
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      setTorchSupported(Boolean(track.getCapabilities?.().torch));
      setStatus("ready");
    } catch (e) {
      if (!mounted.current) return;
      setStatus(e.name === "NotAllowedError" || e.name === "SecurityError" ? "denied" : "error");
    }
  }, [facingMode, stop]);

  useEffect(() => {
    mounted.current = true;
    start();
    return () => {
      mounted.current = false;
      stop();
    };
  }, [start, stop]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((t) => !t);
    } catch { /* torch not available */ }
  };

  /** Grabs the current frame as a JPEG data URL (null if the video isn't ready). */
  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    return c.toDataURL("image/jpeg", 0.85);
  };

  return { videoRef, status, start, takePhoto, torchOn, torchSupported, toggleTorch };
}