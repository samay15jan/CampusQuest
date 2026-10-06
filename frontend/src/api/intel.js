import { apiFetch } from "./client.js";

export function getActivity(limit = 20) {
  return apiFetch(`/activity?limit=${limit}`);
}

export function getHeatmap(hours = 24) {
  return apiFetch(`/heatmap?hours=${hours}`);
}
