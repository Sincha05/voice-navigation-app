const { resolveMarker, BUILDINGS, getBuilding } = require("./sampleBuilding");
const { normalizeText } = require("./destinationCatalog");

const ROUTE_READY_CONFIDENCE = 0.72;

function matchOcrToNodes(ocrText, buildingId = null) {
  const text = normalizeText(ocrText);
  if (!text) return null;

  const buildings = buildingId ? [getBuilding(buildingId)].filter(Boolean) : BUILDINGS;
  let best = null;

  for (const building of buildings) {
    for (const node of building.nodes) {
      const phrases = [node.label, ...(node.aliases || [])].map(normalizeText);
      for (const phrase of phrases) {
        if (!phrase || phrase.length < 3) continue;
        if (text.includes(phrase)) {
          const confidence = phrase.length >= 8 ? 0.75 : 0.55;
          if (!best || confidence > best.confidence) {
            best = {
              buildingId: building.id,
              buildingName: building.name,
              locationId: node.id,
              label: node.label,
              floorId: node.floorId,
              confidence,
              source: "ocr"
            };
          }
        }
      }
    }
  }
  return best;
}

function observationFromGps(gps) {
  if (!gps || gps.latitude == null || gps.longitude == null) return null;
  const acc = gps.accuracyMeters ?? gps.accuracy;
  const reliable = typeof acc === "number" && acc <= 30;
  return {
    source: "gps",
    confidence: reliable ? 0.85 : 0.45,
    reliableForRouting: reliable,
    latitude: gps.latitude,
    longitude: gps.longitude,
    accuracyMeters: acc,
    timestamp: Date.now()
  };
}

function observationFromMarker(marker, buildingId = null) {
  const result = resolveMarker(marker, buildingId);
  if (result.status !== "success") {
    return { error: result.message };
  }
  return {
    source: "qr_marker",
    confidence: 0.95,
    reliableForRouting: true,
    buildingId: result.buildingId,
    floorId: result.floorId,
    locationId: result.locationId,
    label: result.label,
    timestamp: Date.now()
  };
}

function observationFromOcrLabel(ocrText, buildingId = null) {
  const match = matchOcrToNodes(ocrText, buildingId);
  if (!match) return null;
  return {
    source: "ocr",
    confidence: match.confidence,
    reliableForRouting: match.confidence >= ROUTE_READY_CONFIDENCE,
    buildingId: match.buildingId,
    floorId: match.floorId,
    locationId: match.locationId,
    label: match.label,
    timestamp: Date.now()
  };
}

function assessLocalization(observations = []) {
  if (!observations.length) {
    return {
      status: "unknown",
      message: "No localization evidence available.",
      estimate: null,
      reliableForRouting: false
    };
  }

  const sorted = [...observations].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const best = sorted[0];
  const estimate = {
    buildingId: best.buildingId || null,
    floorId: best.floorId || null,
    locationId: best.locationId || null,
    label: best.label || null,
    latitude: best.latitude,
    longitude: best.longitude,
    accuracyMeters: best.accuracyMeters,
    confidence: best.confidence,
    source: best.source,
    timestamp: best.timestamp
  };

  const reliableForRouting = sorted.some((o) => o.reliableForRouting);
  return {
    status: reliableForRouting ? "success" : "uncertain",
    message: reliableForRouting
      ? "Location estimate is sufficient for route planning."
      : "Location estimate is uncertain; more evidence or confirmation is needed.",
    estimate,
    reliableForRouting
  };
}

function localize(payload = {}) {
  const observations = [];
  if (payload.marker) {
    const m = observationFromMarker(payload.marker, payload.buildingId || null);
    if (m.error) {
      return { status: "error", message: m.error, observations: [], estimate: null };
    }
    observations.push(m);
  }
  const gpsObs = observationFromGps(payload.gps);
  if (gpsObs) observations.push(gpsObs);
  const ocrObs = observationFromOcrLabel(payload.ocrText, payload.buildingId || null);
  if (ocrObs) observations.push(ocrObs);

  if (payload.manualLocationId && payload.buildingId) {
    const building = getBuilding(payload.buildingId);
    const node = building?.nodes.find((n) => n.id === payload.manualLocationId);
    if (node) {
      observations.push({
        source: "manual",
        confidence: 0.9,
        reliableForRouting: true,
        buildingId: payload.buildingId,
        floorId: node.floorId,
        locationId: node.id,
        label: node.label,
        timestamp: Date.now()
      });
    }
  }

  const assessment = assessLocalization(observations);
  return {
    status: assessment.status,
    message: assessment.message,
    observations,
    estimate: assessment.estimate,
    assessment
  };
}

module.exports = {
  localize,
  matchOcrToNodes,
  observationFromGps,
  observationFromMarker,
  observationFromOcrLabel,
  assessLocalization,
  ROUTE_READY_CONFIDENCE
};
