export const ALLOWED_RANGE = 20; // meters
export const MIN_SIMILARITY = 70; // percent

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function haversine(a, b) {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function portalCoordinates(portal) {
  if (portal?.coords?.lat != null && portal?.coords?.lng != null) return portal.coords;
  if (portal?.latitude != null && portal?.longitude != null) {
    return { lat: Number(portal.latitude), lng: Number(portal.longitude) };
  }
  return null;
}

/** Reads the device GPS and returns the coordinates plus local distance estimate. */
export async function checkLocation(portal) {
  const target = portalCoordinates(portal);
  if (!target) return { distance: null, error: true, message: "Portal coordinates are unavailable" };
  if (!navigator.geolocation) return { distance: null, error: true, message: "Geolocation is not supported" };

  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      })
    );

    const coords = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };

    return {
      ...coords,
      distance: Math.round(haversine(
        { lat: coords.latitude, lng: coords.longitude },
        target,
      )),
    };
  } catch (error) {
    return {
      distance: null,
      error: true,
      message: error?.message || "Unable to read device location",
    };
  }
}

/** Kept for compatibility with the existing verification UI. AI matching is handled by the backend. */
export async function checkImage() {
  await sleep(300);
  return { pending: true };
}
