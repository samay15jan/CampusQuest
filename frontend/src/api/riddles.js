import { apiFetch } from "./client.js";

export function getTodayRiddles() {
  return apiFetch("/riddles/today");
}

export function answerRiddle(id, answer) {
  return apiFetch(`/riddles/${id}/answer`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}
