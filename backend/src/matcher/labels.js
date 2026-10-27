// Map only labels whose identity is clear from the supplied gallery and portal list.
const aliases = new Map([
  ["gate 2a", "gate no. 2"],
  ["raras foodtruck", "rara's food truck"],
]);

export function normalizeTerritoryLabel(label) {
  const key = String(label ?? "").normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
  return aliases.get(key) ?? key;
}

export function territoryLabelsMatch(predicted, expected) {
  return Boolean(predicted && expected && normalizeTerritoryLabel(predicted) === normalizeTerritoryLabel(expected));
}
