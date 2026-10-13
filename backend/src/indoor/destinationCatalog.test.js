const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeText,
  tokenOverlapScore,
  buildDestinationCatalog,
  matchIndoorDestination,
  matchClarificationChoice
} = require("./destinationCatalog");
const { DEMO_CENTER } = require("./sampleBuilding");

describe("destinationCatalog", () => {
  it("normalizes text correctly", () => {
    assert.equal(normalizeText("Laboratory 1"), "laboratory 1");
    assert.equal(normalizeText("Restroom!"), "restroom");
    assert.equal(normalizeText("  Elevator  "), "elevator");
  });

  it("calculates token overlap score", () => {
    assert.equal(tokenOverlapScore("laboratory", "laboratory"), 100);
    // Token overlap scoring is more complex than simple substring matching
    const score = tokenOverlapScore("lab 1", "laboratory 1");
    assert.ok(score > 0 && score <= 100);
  });

  it("builds destination catalog from building data", () => {
    const catalog = buildDestinationCatalog([DEMO_CENTER]);
    assert.ok(catalog.length > 0);
    const lab1 = catalog.find((d) => d.locationId === "lab_1");
    assert.ok(lab1);
    assert.equal(lab1.label, "Laboratory 1");
    assert.ok(lab1.aliases.includes("computer lab"));
  });

  it("matches indoor destination by label", () => {
    const result = matchIndoorDestination("Laboratory 1");
    assert.equal(result.status, "success");
    assert.equal(result.match.label, "Laboratory 1");
    assert.equal(result.match.locationId, "lab_1");
  });

  it("matches indoor destination by alias", () => {
    const result = matchIndoorDestination("computer lab");
    assert.equal(result.status, "success");
    assert.equal(result.match.locationId, "lab_1");
  });

  it("returns ambiguous when multiple matches exist", () => {
    const result = matchIndoorDestination("lab");
    assert.equal(result.status, "ambiguous");
    assert.ok(result.candidates.length > 1);
  });

  it("returns not_found for unknown destination", () => {
    const result = matchIndoorDestination("xyz");
    assert.equal(result.status, "not_found");
  });

  it("matches clarification choice from candidates", () => {
    const candidates = [
      { label: "Laboratory 1", locationId: "lab_1" },
      { label: "Laboratory 2", locationId: "lab_2" }
    ];
    const picked = matchClarificationChoice("lab 1", candidates);
    assert.ok(picked);
    assert.equal(picked.locationId, "lab_1");
  });

  it("returns null for clarification with no good match", () => {
    const candidates = [
      { label: "Laboratory 1", locationId: "lab_1" },
      { label: "Laboratory 2", locationId: "lab_2" }
    ];
    const picked = matchClarificationChoice("random text", candidates);
    assert.equal(picked, null);
  });
});
