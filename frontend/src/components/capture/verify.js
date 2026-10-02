export const ALLOWED_RANGE = 20; // meters
export const MIN_SIMILARITY = 70; // percent

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function haversine(a, b) {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Real GPS check when the portal has `coords: { lat, lng }`.
 * Without coords it's simulated (12 m) so you can test the flow.
 */
export async function checkLocation(portal) {
  if (!portal.coords) {
    await sleep(1400);
    return { distance: 12, simulated: true };
  }
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
    );
    const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    return { distance: Math.round(haversine(here, portal.coords)) };
  } catch {
    return { distance: null, error: true };
  }
}

/**
 * SIMULATED. Comparing a photo to the reference image needs a backend
 * (e.g. a Cloud Function with an image-embedding model). Replace this with that call.
 */
export async function checkImage(photo, portal) { // eslint-disable-line no-unused-vars
  await sleep(2200);
  return { similarity: 72, simulated: true };
}