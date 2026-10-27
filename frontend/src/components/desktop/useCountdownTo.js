import { useEffect, useState } from "react";

/** Counts down from `seconds` (as of `since`, a ms timestamp) once per second. */
export default function useCountdownTo(seconds, since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (seconds == null || !since) return null;
  const left = Math.max(0, seconds - Math.floor((now - since) / 1000));
  return {
    h: String(Math.floor(left / 3600)).padStart(2, "0"),
    m: String(Math.floor((left % 3600) / 60)).padStart(2, "0"),
    s: String(left % 60).padStart(2, "0"),
  };
}
