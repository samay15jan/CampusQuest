import { useEffect, useState } from "react";

/** Wall clock that re-renders every `ms` (default 15s), so relative times stay fresh without calling Date.now() during render. */
export default function useNow(ms = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
