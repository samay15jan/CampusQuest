import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "campusquest-install-gate-dismissed-at";
// How long "Continue in browser" is remembered before the screen shows again.
const DISMISS_DAYS = 7;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

// iPadOS 13+ reports itself as "MacIntel" with touch support.
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const recentlyDismissed = () => {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(t) && Date.now() - t < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
};

/**
 * Tracks whether the full-screen install gate should be shown.
 * Must live above the gate so the Android install event isn't lost
 * if it fires before/after the gate mounts.
 */
export default function useInstall() {
  const [deferred, setDeferred] = useState(null);
  const [showGate, setShowGate] = useState(() => !isStandalone() && !recentlyDismissed());

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setDeferred(null);
      setShowGate(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode: ignore */
    }
    setShowGate(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setShowGate(false);
  }, [deferred]);

  return { showGate, canInstall: Boolean(deferred), install, dismiss };
}
