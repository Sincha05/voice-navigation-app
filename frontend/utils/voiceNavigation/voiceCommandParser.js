export function normalizeTranscript(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNavigationUtterance(raw) {
  const text = normalizeTranscript(raw);
  const original = (raw || "").trim();
  if (!text) return { type: "UNKNOWN" };

  if (
    text === "help" ||
    text.includes("what can i say") ||
    text.includes("voice commands")
  ) {
    return { type: "HELP" };
  }

  if (text.includes("start navigation") || text === "start navigating") {
    return { type: "START_NAVIGATION" };
  }

  if (
    text.includes("stop navigation") ||
    text.includes("cancel navigation") ||
    text === "cancel"
  ) {
    return { type: "STOP_NAVIGATION" };
  }

  if (text.includes("pause navigation") || text === "pause") {
    return { type: "PAUSE_NAVIGATION" };
  }

  if (text.includes("resume navigation") || text === "resume") {
    return { type: "RESUME_NAVIGATION" };
  }

  if (text.includes("repeat") && (text.includes("instruction") || text.includes("direction"))) {
    return { type: "REPEAT_INSTRUCTION" };
  }

  if (
    text.includes("next direction") ||
    text.includes("next step") ||
    text.includes("what's next") ||
    text.includes("whats next")
  ) {
    return { type: "NEXT_STEP" };
  }

  if (text.includes("where am i") || text.includes("my location")) {
    return { type: "WHERE_AM_I" };
  }

  if (text.includes("indoors or outdoors") || text.includes("inside or outside")) {
    return { type: "ENVIRONMENT_QUERY" };
  }

  if (text.includes("i am indoors") || text.includes("i am inside")) {
    return { type: "DECLARE_INDOOR" };
  }
  if (text.includes("i am outdoors") || text.includes("i am outside")) {
    return { type: "DECLARE_OUTDOOR" };
  }

  const navPatterns = [
    /take me to (.+)/i,
    /navigate to (.+)/i,
    /directions to (.+)/i,
    /guide me to (.+)/i,
    /go to (.+)/i
  ];

  for (const pattern of navPatterns) {
    const match = original.match(pattern);
    if (match?.[1]) {
      const destination = match[1].replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").trim();
      if (destination.length > 0) {
        return { type: "NAVIGATE_TO", destination };
      }
    }
  }

  if (text.length > 2 && text.split(" ").length <= 6) {
    return { type: "POSSIBLE_DESTINATION", destination: original };
  }

  return { type: "UNKNOWN" };
}
