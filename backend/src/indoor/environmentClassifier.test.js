const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { classifyEnvironment } = require("./environmentClassifier");

describe("environmentClassifier", () => {
  it("classifies as outdoor with good GPS", () => {
    const result = classifyEnvironment({
      gpsAvailable: true,
      gpsAccuracyMeters: 10,
      hasOutdoorYoloClasses: true
    });
    assert.equal(result.classification, "outdoor");
    assert.ok(result.confidence > 0.4);
  });

  it("classifies as indoor with QR marker", () => {
    const result = classifyEnvironment({
      hasStrongIndoorMarker: true
    });
    assert.equal(result.classification, "indoor");
    assert.ok(result.confidence > 0.8);
  });

  it("classifies as indoor with strong OCR match", () => {
    const result = classifyEnvironment({
      ocrIndoorMatch: { confidence: 0.8 }
    });
    assert.equal(result.classification, "indoor");
    assert.ok(result.confidence > 0.4);
  });

  it("classifies as uncertain with weak evidence", () => {
    const result = classifyEnvironment({
      gpsAvailable: false,
      gpsAccuracyMeters: 100
    });
    assert.equal(result.classification, "uncertain");
    assert.ok(result.confidence < 0.5);
  });

  it("respects user declaration", () => {
    const indoorResult = classifyEnvironment({
      userDeclared: "indoor"
    });
    assert.equal(indoorResult.classification, "indoor");
    assert.ok(indoorResult.confidence > 0.7);

    const outdoorResult = classifyEnvironment({
      userDeclared: "outdoor"
    });
    assert.equal(outdoorResult.classification, "outdoor");
    assert.ok(outdoorResult.confidence > 0.7);
  });

  it("detects transition zone near entrance", () => {
    const result = classifyEnvironment({
      nearMappedEntrance: true,
      hasStrongIndoorMarker: true,
      gpsAvailable: true,
      gpsAccuracyMeters: 20
    });
    assert.equal(result.classification, "transition");
  });

  it("does not treat poor GPS alone as indoor proof", () => {
    const result = classifyEnvironment({
      gpsAvailable: true,
      gpsAccuracyMeters: 100
    });
    assert.notEqual(result.classification, "indoor");
  });
});
