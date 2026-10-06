import { auth } from "../components/utils/firebase.js";

export const API_URL = ("https://api.campusquest.samay15jan.com" || "http://localhost:3000").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error || "API request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
