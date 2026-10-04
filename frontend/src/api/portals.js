import { apiFetch, API_URL } from "./client.js";

function relativeTime(value) {
  if (!value) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function normalizeActivity(item, index) {
  const kindMap = {
    RESONATOR_DEPLOYED: "deploy",
    RESONATOR_DESTROYED: "deploy",
    PORTAL_CAPTURED: "capture",
    PORTAL_LOST: "status",
  };

  return {
    id: `${item.type}-${item.created_at}-${index}`,
    kind: kindMap[item.type] || "status",
    team: item.faction || "neutral",
    who: item.username || "",
    text: {
      RESONATOR_DEPLOYED: "deployed a resonator",
      RESONATOR_DESTROYED: "destroyed a resonator",
      PORTAL_CAPTURED: "captured this portal",
      PORTAL_LOST: "lost control of this portal",
    }[item.type] || item.type,
    ago: relativeTime(item.created_at),
  };
}

function normalizePortal(portal) {
  const owner = portal.owner_faction || "neutral";
  const total = portal.resonators?.total ?? 0;

  return {
    ...portal,
    owner,
    lvl: total,
    dist: "Nearby",
    img: portal.image_url ? `${API_URL}${portal.image_url}` : null,
    xp: 0,
    capture: { done: total, total: 3 },
    resonators: portal.resonator_slots
      ? portal.resonator_slots.map((slot) => slot.filled ? {
          player: slot.player?.username || "Unknown",
          team: slot.faction,
          id: slot.resonator_id,
        } : null)
      : [
          ...Array.from({ length: total }, (_, i) => ({
            player: `${owner} resonator ${i + 1}`,
            team: owner,
          })),
          ...Array.from({ length: Math.max(0, 3 - total) }, () => null),
        ],
    activity: (portal.activity || []).map(normalizeActivity),
  };
}

export async function getPortals(owner) {
  const query = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  const data = await apiFetch(`/portals${query}`);
  return data.map(normalizePortal);
}

export async function getPortal(id) {
  const data = await apiFetch(`/portals/${id}`);
  return normalizePortal(data);
}
