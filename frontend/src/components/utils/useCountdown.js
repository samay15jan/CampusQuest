import { useEffect, useState } from "react";

/** Returns [hh, mm, ss] strings counting down to endMs. */
export default function useCountdown(endMs) {
  const calc = () => Math.max(0, Math.floor((endMs - Date.now()) / 1000));
  const [s, setS] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setS(calc()), 1000);
    return () => clearInterval(id);
  }, [endMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = (n) => String(n).padStart(2, "0");
  return [p(Math.floor(s / 3600)), p(Math.floor((s % 3600) / 60)), p(s % 60)];
}