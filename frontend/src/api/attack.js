import { apiFetch } from "./client.js";

/** Attack an enemy portal using the player's current GPS coordinates. */
export async function attackPortal(portalId, { latitude, longitude, targetResonatorId } = {}) {
  const body = { latitude, longitude };
  if (targetResonatorId != null) body.target_resonator_id = Number(targetResonatorId);

  return apiFetch(`/portals/${portalId}/attack`, {
    method: "POST",
    body,
  });
}
