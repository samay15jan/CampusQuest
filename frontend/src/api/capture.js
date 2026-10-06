import { apiFetch } from "./client.js";

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function verifyPortal(portalId, { photo, latitude, longitude }) {
  const form = new FormData();
  const image = await dataUrlToBlob(photo);

  form.append("photo", image, "portal-capture.jpg");
  form.append("latitude", String(latitude));
  form.append("longitude", String(longitude));

  return apiFetch(`/portals/${portalId}/verify`, {
    method: "POST",
    body: form,
  });
}

export async function deployPortal(portalId, verificationId) {
  return apiFetch(`/portals/${portalId}/deploy`, {
    method: "POST",
    body: { verification_id: verificationId },
  });
}
