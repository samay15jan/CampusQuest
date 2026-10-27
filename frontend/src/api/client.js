import { auth } from "../components/utils/firebase.js";

// Set VITE_API_URL in frontend/.env.local to point at any backend (e.g. http://localhost:4000).
// Without it: localhost in `npm run dev`, the production API in a built app.
const DEFAULT_API = import.meta.env.DEV ? "http://localhost:3000" : "https://api.campusquest.samay15jan.com";
export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API).replace(/\/$/, "");

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