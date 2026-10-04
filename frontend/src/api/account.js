import { apiFetch } from "./client.js";

export function getMe() {
  return apiFetch("/me");
}

export function chooseFaction(faction) {
  return apiFetch("/me/faction", {
    method: "POST",
    body: JSON.stringify({ faction }),
  });
}

export function updateProfile(profile) {
  return apiFetch("/me/profile", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}

export function checkUsername(username) {
  return apiFetch(`/usernames/${encodeURIComponent(username)}/available`);
}

export function getPublicUser(id) {
  return apiFetch(`/users/${encodeURIComponent(id)}`);
}

export function getResonators() {
  return apiFetch("/me/resonators");
}
