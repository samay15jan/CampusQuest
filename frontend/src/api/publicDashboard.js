import { API_URL } from "./client.js";
import { localImageFor } from "../data/portalImages.js";

/** Public (no login) snapshot for the desktop big-screen dashboard. */
export async function getDashboardSnapshot(signal) {
  const res = await fetch(`${API_URL}/public/dashboard`, { signal });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || "Dashboard request failed");
    err.status = res.status;
    throw err;
  }
  return {
    ...data,
    portals: data.portals.map((p) => ({
      ...p,
      owner: p.owner_faction || "neutral",
      img: localImageFor(p) || (p.image_url ? `${API_URL}${p.image_url}` : null),
    })),
  };
}
