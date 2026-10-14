const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  observationFromGps,
  observationFromMarker,
  observationFromOcrLabel,
  assessLocalization,
  localize,
  matchOcrToNodes
} = require("./localizationService");
const { DEMO_CENTER } = require("./sampleBuilding");

describe("localizationService", () => {
  it("creates GPS observation with good accuracy", () => {
    const obs = observationFromGps({
      latitude: 12.3,
      longitude: 77.5,
      accuracyMeters: 15
    });
    assert.equal(obs.source, "gps");
    assert.ok(obs.reliableForRouting);
    assert.ok(obs.confidence > 0.7);
  });

  it("creates GPS observation with poor accuracy", () => {
    const obs = observationFromGps({
      latitude: 12.3,
      longitude: 77.5,
      accuracyMeters: 50
    });
    assert.equal(obs.source, "gps");
    assert.equal(obs.reliableForRouting, false);
    assert.ok(obs.confidence < 0.5);
  });

  it("returns null for missing GPS", () => {
    const obs = observationFromGps(null);
    assert.equal(obs, null);
  });

  it("creates marker observation for valid marker", () => {
    const obs = observationFromMarker("INDOOR:demo-center:0:reception", "demo-center");
    assert.ok(!obs.error);
    assert.equal(obs.source, "qr_marker");
    assert.ok(obs.reliableForRouting);
    assert.equal(obs.locationId, "reception");
    assert.equal(obs.confidence, 0.95);
  });

  it("returns error for invalid marker", () => {
    const obs = observationFromMarker("invalid-marker", "demo-center");
    assert.ok(obs.error);
  });

  it("matches OCR text to node labels", () => {
    const match = matchOcrToNodes("Laboratory 1", "demo-center");
    assert.ok(match);
    assert.equal(match.locationId, "lab_1");
    assert.equal(match.source, "ocr");
  });

  it("creates OCR observation for matched text", () => {
    const obs = observationFromOcrLabel("Laboratory 1", "demo-center");
    assert.equal(obs.source, "ocr");
    assert.equal(obs.locationId, "lab_1");
    assert.ok(obs.confidence > 0.5);
  });

  it("returns null for OCR with no match", () => {
    const obs = observationFromOcrLabel("unknown text", "demo-center");
    assert.equal(obs, null);
  });

  it("assesses localization as success with reliable observation", () => {
    const obs = observationFromMarker("INDOOR:demo-center:0:reception", "demo-center");
    const observations = [obs];
    const assessment = assessLocalization(observations);
    assert.equal(assessment.status, "success");
    assert.ok(assessment.reliableForRouting);
    assert.ok(assessment.estimate);
  });

  it("assesses localization as uncertain with weak evidence", () => {
    const observations = [
      observationFromGps({ latitude: 12.3, longitude: 77.5, accuracyMeters: 100 })
    ];
    const assessment = assessLocalization(observations);
    assert.equal(assessment.status, "uncertain");
    assert.equal(assessment.reliableForRouting, false);
  });

  it("assesses localization as unknown with no observations", () => {
    const assessment = assessLocalization([]);
    assert.equal(assessment.status, "unknown");
    assert.equal(assessment.reliableForRouting, false);
  });

  it("localizes using marker", () => {
    const result = localize({
      marker: "INDOOR:demo-center:0:reception",
      buildingId: "demo-center"
    });
    assert.equal(result.status, "success");
    assert.ok(result.assessment.reliableForRouting);
    assert.equal(result.estimate.locationId, "reception");
  });

  it("localizes using GPS", () => {
    const result = localize({
      gps: { latitude: 12.3, longitude: 77.5, accuracyMeters: 15 }
    });
    // GPS with good accuracy is considered reliable for routing
    assert.equal(result.status, "success");
    assert.equal(result.estimate.source, "gps");
    assert.ok(result.assessment.reliableForRouting);
  });

  it("localizes using manual location", () => {
    const result = localize({
      buildingId: "demo-center",
      manualLocationId: "reception"
    });
    assert.equal(result.status, "success");
    // Manual location should be reliable for routing
    assert.ok(result.assessment.reliableForRouting);
    assert.equal(result.estimate.locationId, "reception");
    assert.equal(result.estimate.source, "manual");
  });

  it("returns error for invalid marker", () => {
    const result = localize({
      marker: "invalid",
      buildingId: "demo-center"
    });
    assert.equal(result.status, "error");
  });
});
