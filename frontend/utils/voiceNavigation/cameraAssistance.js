/**
 * Maps YOLO COCO detections to weak environmental hints only.
 * Standard yolov8n does NOT detect doors, stairs, or room labels natively.
 */

const OUTDOOR_CLASSES = new Set([
  "car",
  "truck",
  "bus",
  "motorcycle",
  "bicycle",
  "traffic light",
  "stop sign"
]);

const OBSTACLE_NAV_CLASSES = new Set(["person", "bicycle", "car", "motorcycle", "bus", "truck"]);

export function analyzeDetectionsForEnvironment(detections = []) {
  const classNames = detections.map((d) => d.class_name).filter(Boolean);
  return {
    yoloClassNames: classNames,
    hasOutdoorVehicle: classNames.some((c) => OUTDOOR_CLASSES.has(c))
  };
}

export function pickNavigationObstacleWarning(detections = [], lastSpokenKeyRef) {
  if (!detections?.length) return null;
  const relevant = detections.filter(
    (d) => OBSTACLE_NAV_CLASSES.has(d.class_name) && (d.confidence ?? 1) >= 0.45
  );
  if (relevant.length === 0) return null;

  const primary = relevant[0];
  const key = `${primary.class_name}:${primary.direction || "unknown"}`;
  const now = Date.now();
  if (lastSpokenKeyRef?.current?.key === key && now - (lastSpokenKeyRef.current.time || 0) < 12000) {
    return null;
  }
  if (lastSpokenKeyRef) {
    lastSpokenKeyRef.current = { key, time: now };
  }

  const label = primary.class_name;
  const distPart = primary.distance ? ` about ${primary.distance} meters ahead` : "";
  const dirPart = primary.direction ? ` to your ${primary.direction}` : "";
  return `Caution: ${label} detected${dirPart}${distPart}. This is a camera observation, not a guarantee the path is clear.`;
}
