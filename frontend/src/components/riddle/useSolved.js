import { useCallback, useState } from "react";

const KEY = "cq:solved-locations";

/**
 * Which location riddles the player has solved.
 * Stored in localStorage for now. TODO: move to Firestore under the signed-in user.
 */
export default function useSolved() {
  const [solvedIds, setIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) ?? []; } catch { return []; }
  });

  const markSolved = useCallback((id) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { solvedIds, markSolved };
}