/**
 * Evidence-based indoor/outdoor/uncertain classification.
 * Does not treat poor GPS alone as proof of being indoors.
 */

function classifyEnvironment(evidence = {}) {
  const reasons = [];
  let outdoorScore = 0;
  let indoorScore = 0;

  const {
    gpsAvailable,
    gpsAccuracyMeters,
    hasOutdoorYoloClasses,
    hasStrongIndoorMarker,
    ocrIndoorMatch,
    userDeclared,
    nearMappedEntrance
  } = evidence;

  if (userDeclared === "outdoor") {
    outdoorScore += 80;
    reasons.push("User declared outdoors.");
  } else if (userDeclared === "indoor") {
    indoorScore += 80;
    reasons.push("User declared indoors.");
  }

  if (hasStrongIndoorMarker) {
    indoorScore += 90;
    reasons.push("QR or marker resolved to an indoor location.");
  }

  if (ocrIndoorMatch?.confidence >= 0.7) {
    indoorScore += 45;
    reasons.push("OCR text matched a mapped indoor label.");
  } else if (ocrIndoorMatch?.confidence >= 0.45) {
    indoorScore += 20;
    reasons.push("Weak OCR match to indoor label (uncertain).");
  }

  if (nearMappedEntrance) {
    indoorScore += 25;
    outdoorScore += 15;
    reasons.push("Near a mapped building entrance (transition zone).");
  }

  if (hasOutdoorYoloClasses) {
    outdoorScore += 35;
    reasons.push("Camera detected outdoor vehicle or street furniture classes.");
  }

  if (gpsAvailable) {
    if (typeof gpsAccuracyMeters === "number" && gpsAccuracyMeters <= 25) {
      outdoorScore += 40;
      reasons.push("GPS available with reasonable accuracy.");
    } else if (typeof gpsAccuracyMeters === "number" && gpsAccuracyMeters > 25) {
      reasons.push("GPS accuracy is low (not treated as proof of being indoors).");
    }
  } else {
    reasons.push("GPS unavailable or denied.");
  }

  const maxScore = Math.max(outdoorScore, indoorScore);
  let classification = "uncertain";
  let confidence = 0.35;

  if (maxScore >= 70) {
    confidence = Math.min(0.95, maxScore / 100);
    classification = outdoorScore > indoorScore ? "outdoor" : "indoor";
  } else if (maxScore >= 45) {
    confidence = 0.55;
    classification = outdoorScore > indoorScore ? "outdoor" : "indoor";
  }

  if (Math.abs(outdoorScore - indoorScore) < 15 && maxScore < 70) {
    classification = "uncertain";
    confidence = 0.4;
  }

  if (nearMappedEntrance && classification === "indoor" && outdoorScore >= 30) {
    classification = "transition";
    confidence = 0.5;
    reasons.push("Entrance zone: indoor and outdoor evidence mixed.");
  }

  return {
    classification,
    confidence,
    outdoorScore,
    indoorScore,
    reasons
  };
}

module.exports = { classifyEnvironment };
