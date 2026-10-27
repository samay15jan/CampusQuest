import { useEffect, useState } from "react";

// Big-screen layout only: wide viewport AND a hover-capable primary pointer (mouse/trackpad).
// Phones and tablets keep the mobile login/game app.
const QUERY = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

export default function useIsDesktop() {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return match;
}
