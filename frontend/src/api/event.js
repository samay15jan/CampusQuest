import { apiFetch } from "./client.js";

export function getCurrentEvent() {
  return apiFetch("/event/current");
}
