import { useEffect, useState } from "react";

const DISMISS_KEY = "campusquest-install-dismissed-at";
const DISMISS_DAYS = 7;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

// iPadOS 13+ reports itself as "MacIntel" with touch support.
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const recentlyDismissed = () => {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return t && Date.now() - t < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null); // Android/Chrome install event
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Android / Chrome / Edge / Samsung Internet
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari has no install event: show manual instructions instead.
    let timer;
    if (isIOS()) {
      timer = setTimeout(() => {
        setIosMode(true);
        setVisible(true);
      }, 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode: ignore */
    }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-4 z-[9999]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      role="dialog"
      aria-label="Install CampusQuest"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-panel p-3 shadow-2xl">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Install CampusQuest</p>
          {iosMode ? (
            <p className="mt-0.5 text-xs leading-snug text-mute">
              Tap the <b className="text-white">Share</b> button in Safari, then{" "}
              <b className="text-white">Add to Home Screen</b>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-mute">Add it to your home screen for quick access.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={dismiss} className="px-2 py-2 text-xs font-medium text-mute">
            {iosMode ? "Got it" : "Later"}
          </button>
          {!iosMode && (
            <button
              onClick={install}
              className="rounded-lg bg-blue px-3 py-2 text-xs font-semibold text-white"
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
