import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, googleProvider } from "../utils/firebase.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { HudBox, CityBackdrop, Label } from "../auth/Hud.jsx";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };

const FEATURES = [
  { title: "Explore", sub: "Real locations", icon: <path d="M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /> },
  { title: "Capture", sub: "Territories", icon: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></> },
  { title: "Compete", sub: "As a team", icon: <path d="M12 3 4 7v6c0 4 3.5 6.5 8 8 4.5-1.5 8-4 8-8V7l-8-4Z" /> },
];

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5Z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.9-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1Z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48Z" />
    </svg>
  );
}

export default function LoginScreen() {
  const navigate = useNavigate();
  const { user, loading, account, accountLoading, accountError } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Firebase auth is only the first step. Wait for the backend account
  // bootstrap before deciding which onboarding screen to show.
  useEffect(() => {
    if (loading || accountLoading || !user || !account) return;

    const { needs_faction, needs_profile } = account.onboarding || {};

    if (needs_faction) {
      navigate("/faction", { replace: true });
    } else if (needs_profile) {
      navigate("/profile", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, account, accountLoading, navigate]);

  const signInWithGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // Navigation happens in the effect above once auth state updates.
    } catch (err) {
      if (err.code === "auth/popup-blocked") {
        // Some mobile browsers block popups; fall back to a full-page redirect.
        return signInWithRedirect(auth, googleProvider);
      }
      if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        setError(
          err.code === "auth/network-request-failed"
            ? "Network error. Check your connection and try again."
            : "Couldn't sign in with Google. Try again."
        );
      }
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-white">
      <CityBackdrop />

      <header className="relative flex justify-end px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Label className="text-right text-[10px] leading-5 text-mute">
          Explore<br />Capture<br />Strategize
        </Label>
      </header>

      <div className="relative flex flex-1 flex-col justify-end px-6 pb-8 pt-40">
        <div className="text-center">
          <svg viewBox="0 0 64 56" width="76" height="66" className="mx-auto" aria-hidden="true">
            <path d="M22 4 2 52h14l6-14h12L22 4Z" fill="#c9cdf5" />
            <path d="M36 22 62 52H42L30 34l6-12Z" fill="#ff3b3b" />
          </svg>
          <h1 className="mt-4 font-display text-[26px] font-black tracking-[0.16em]">
            CAMPUS<span className="text-red">QUEST</span>
          </h1>
          <Label className="mt-5 text-xs leading-7 text-mute">Your campus<br />a larger game</Label>
        </div>

        <ul className="mt-10 grid grid-cols-3 divide-x divide-edge">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex flex-col items-center gap-2 px-1 text-center text-mute">
              <svg viewBox="0 0 24 24" width="30" height="30" {...stroke} className="text-slate-200" aria-hidden="true">{f.icon}</svg>
              <span className="font-display text-[10px] uppercase tracking-[0.2em]">{f.title}</span>
              <span className="text-[11px] uppercase tracking-[0.15em]">{f.sub}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={signInWithGoogle}
          disabled={busy || loading}
          aria-busy={busy}
          className="mt-9 block w-full text-left disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:brightness-125"
        >
          <HudBox border="linear-gradient(90deg,#2f7bff,#ff3b3b)" cut={16} innerClass="bg-gradient-to-r from-[#0b1a33] to-[#1a0d16]">
            <span className="flex h-14 items-center gap-4 px-5">
              <GoogleG />
              <span className="flex-1 text-center font-display text-xs font-bold uppercase tracking-[0.22em]">{busy ? "Signing in…" : "Sign in with Google"}</span>
              <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} className="text-red" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </span>
          </HudBox>
        </button>

        {(error || accountError) && (
          <p role="alert" className="mt-4 text-center text-[13px] leading-5 text-red">
            {error || "Signed in, but the CampusQuest server could not create your account. Check the API and try again."}
          </p>
        )}

        <p className="mt-6 text-center text-[13px] leading-5 text-mute">
          By continuing, you agree to the<br />
          <a href="#terms" className="underline">CampusQuest Terms &amp; Privacy Policy.</a>
        </p>
      </div>
    </main>
  );
}