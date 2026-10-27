import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTerritoryLabel, territoryLabelsMatch } from "../src/matcher/labels.js";

test("only explicit aliases normalize to the backend portal labels", () => {
  assert.equal(territoryLabelsMatch("Gate 2A", "Gate No. 2"), true);
  assert.equal(territoryLabelsMatch("Raras Foodtruck", "Rara's Food Truck"), true);
  assert.equal(territoryLabelsMatch("Bank", "The Bank"), false);
  assert.equal(normalizeTerritoryLabel("Helipad"), "helipad");
});

test("empty and missing labels never match", () => {
  assert.equal(territoryLabelsMatch("", "Library"), false);
  assert.equal(territoryLabelsMatch(null, "Library"), false);
});
