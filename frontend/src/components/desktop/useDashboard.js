import { useEffect, useRef, useState } from "react";
import { getDashboardSnapshot } from "../../api/publicDashboard.js";

const POLL_MS = 5000;

/** Polls the public snapshot. Keeps the last good data on screen if a poll fails. */
export default function useDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    const ctl = new AbortController();
    let stopped = false;

    const tick = async () => {
      try {
        const snap = await getDashboardSnapshot(ctl.signal);
        if (stopped) return;
        setData(snap);
        setReceivedAt(Date.now());
        setError(null);
      } catch (e) {
        if (stopped || e.name === "AbortError") return;
        setError(e);
      } finally {
        if (!stopped) timer.current = setTimeout(tick, POLL_MS);
      }
    };

    tick();
    return () => {
      stopped = true;
      ctl.abort();
      clearTimeout(timer.current);
    };
  }, []);

  return { data, error, receivedAt };
}
