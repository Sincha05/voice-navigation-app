import { parseNavigationUtterance } from "./voiceCommandParser.js";
import {
  matchDestination,
  matchClarification,
  classifyEnvironment,
  localize
} from "./voiceNavApi.js";
import { analyzeDetectionsForEnvironment, pickNavigationObstacleWarning } from "./cameraAssistance.js";
import { calculateRoute } from "../indoor/indoorApi.js";

export const VOICE_NAV_STATES = {
  IDLE: "IDLE",
  AWAITING_PERMISSION: "AWAITING_PERMISSION",
  LISTENING: "LISTENING",
  PROCESSING: "PROCESSING",
  CONFIRMING_DESTINATION: "CONFIRMING_DESTINATION",
  DETERMINING_LOCATION: "DETERMINING_LOCATION",
  PLANNING_ROUTE: "PLANNING_ROUTE",
  NAVIGATING: "NAVIGATING",
  PAUSED: "PAUSED",
  ERROR: "ERROR"
};

export class VoiceNavigationOrchestrator {
  constructor(deps) {
    this.deps = deps;
    this.state = VOICE_NAV_STATES.IDLE;
    this.sessionActive = false;
    this.pendingCandidates = null;
    this.pendingDestination = null;
    this.activeMode = null; // indoor | outdoor
    this.environment = { classification: "uncertain", confidence: 0.35 };
    this.lastLocationEstimate = null;
    this.preferAccessible = true;
    this.indoorSnapshot = {
      buildingId: "demo-center",
      currentLocationId: "",
      destinationLocationId: "",
      route: null,
      isNavigating: false,
      isPaused: false,
      currentStepIndex: 0
    };
    this.obstacleRef = { current: { key: "", time: 0 } };
    this.lastSpokenKey = "";
    this.lastSpokenAt = 0;
    this.awaitingEnvironmentAnswer = false;
  }

  setState(next, patch = {}) {
    this.state = next;
    this.deps.onStateChange?.({ state: next, sessionActive: this.sessionActive, ...patch });
  }

  speak(text, meta = {}) {
    if (!text) return;
    const key = `${meta.kind || ""}:${text}`;
    const now = Date.now();
    if (!meta.force && key === this.lastSpokenKey && now - this.lastSpokenAt < 1800) return;
    this.lastSpokenKey = key;
    this.lastSpokenAt = now;
    this.deps.speak?.(text, meta);
  }

  async enableSession() {
    this.sessionActive = true;
    this.setState(VOICE_NAV_STATES.AWAITING_PERMISSION);
    const started = this.deps.startListening?.();
    if (!started) {
      this.setState(VOICE_NAV_STATES.ERROR, { error: "Microphone not available." });
      this.speak(
        "Voice navigation needs microphone permission. Use the Enable Voice Navigation button and allow the microphone when prompted.",
        { force: true, kind: "error" }
      );
      return false;
    }
    this.setState(VOICE_NAV_STATES.LISTENING);
    this.speak(
      "Welcome to Dhristi voice navigation. Say take me to a destination, ask where am I, or say help. You can also say stop navigation at any time.",
      { force: true, kind: "welcome" }
    );
    return true;
  }

  disableSession() {
    this.sessionActive = false;
    this.pendingCandidates = null;
    this.pendingDestination = null;
    this.stopActiveNavigation(true);
    this.deps.stopListening?.(true);
    this.setState(VOICE_NAV_STATES.IDLE);
  }

  stopActiveNavigation(cancelSpeech) {
    if (this.activeMode === "outdoor") {
      this.deps.outdoorNav?.stopNavigation?.(!!cancelSpeech);
    }
    if (this.activeMode === "indoor" || this.indoorSnapshot.isNavigating) {
      this.indoorSnapshot.isNavigating = false;
      this.indoorSnapshot.isPaused = false;
      this.deps.indoorNav?.stop?.(!!cancelSpeech);
    }
    this.activeMode = null;
    this.setState(VOICE_NAV_STATES.LISTENING);
  }

  async processTranscript(rawTranscript) {
    if (!this.sessionActive) return;
    if (this.deps.isSpeaking?.()) return;

    this.setState(VOICE_NAV_STATES.PROCESSING);

    if (this.pendingCandidates?.length) {
      const clarified = await matchClarification(rawTranscript, this.pendingCandidates);
      if (clarified.status === "success" && clarified.match) {
        this.pendingCandidates = null;
        await this.beginNavigationToMatch(clarified.match);
        return;
      }
      this.speak("Please say the full name of the destination you want, for example Laboratory 1.", {
        force: true
      });
      this.setState(VOICE_NAV_STATES.CONFIRMING_DESTINATION);
      return;
    }

    if (this.awaitingEnvironmentAnswer) {
      const lower = rawTranscript.toLowerCase();
      if (lower.includes("indoor") || lower.includes("inside")) {
        this.environment = { classification: "indoor", confidence: 0.85 };
        this.awaitingEnvironmentAnswer = false;
        this.deps.setNavigationMode?.("indoor");
        this.speak("Understood. I will use indoor mapped navigation.", { force: true });
      } else if (lower.includes("outdoor") || lower.includes("outside")) {
        this.environment = { classification: "outdoor", confidence: 0.85 };
        this.awaitingEnvironmentAnswer = false;
        this.deps.setNavigationMode?.("outdoor");
        this.speak("Understood. I will use outdoor GPS navigation.", { force: true });
      } else {
        this.speak("Please say indoors or outdoors.", { force: true });
      }
      this.setState(VOICE_NAV_STATES.LISTENING);
      return;
    }

    const cmd = parseNavigationUtterance(rawTranscript);
    await this.handleCommand(cmd, rawTranscript);
  }

  async handleCommand(cmd, rawTranscript) {
    switch (cmd.type) {
      case "HELP":
        this.speak(this.deps.getHelpText?.() || "Say take me to a destination, where am I, repeat the instruction, pause, resume, or stop navigation.", {
          force: true
        });
        this.setState(VOICE_NAV_STATES.LISTENING);
        return;

      case "STOP_NAVIGATION":
        this.stopActiveNavigation(true);
        this.speak("Navigation stopped.", { force: true });
        return;

      case "PAUSE_NAVIGATION":
        if (this.activeMode === "outdoor") this.deps.outdoorNav?.pause?.();
        if (this.activeMode === "indoor") {
          this.indoorSnapshot.isPaused = true;
          this.deps.indoorNav?.pause?.();
        }
        this.setState(VOICE_NAV_STATES.PAUSED);
        this.speak("Navigation paused.", { force: true });
        return;

      case "RESUME_NAVIGATION":
        if (this.activeMode === "outdoor") this.deps.outdoorNav?.resume?.();
        if (this.activeMode === "indoor") {
          this.indoorSnapshot.isPaused = false;
          this.deps.indoorNav?.resume?.();
        }
        this.setState(VOICE_NAV_STATES.NAVIGATING);
        this.speak("Navigation resumed.", { force: true });
        return;

      case "REPEAT_INSTRUCTION":
        if (this.activeMode === "outdoor") this.deps.outdoorNav?.repeatInstruction?.();
        else if (this.activeMode === "indoor") this.deps.indoorNav?.repeatInstruction?.();
        else this.speak("There is no active navigation route.", { force: true });
        this.setState(this.indoorSnapshot.isNavigating ? VOICE_NAV_STATES.NAVIGATING : VOICE_NAV_STATES.LISTENING);
        return;

      case "NEXT_STEP":
        if (this.activeMode === "indoor" && this.indoorSnapshot.isNavigating) {
          this.deps.indoorNav?.nextStep?.();
        } else {
          this.speak("Automatic step advance requires a reliable location update. For indoor demo, say you have reached the next landmark or scan a QR marker.", {
            force: true
          });
        }
        this.setState(VOICE_NAV_STATES.NAVIGATING);
        return;

      case "WHERE_AM_I":
        await this.answerWhereAmI();
        return;

      case "ENVIRONMENT_QUERY":
        await this.refreshEnvironmentClassification();
        this.speak(this.describeEnvironment(), { force: true });
        this.setState(VOICE_NAV_STATES.LISTENING);
        return;

      case "DECLARE_INDOOR":
        this.environment = { classification: "indoor", confidence: 0.9 };
        this.deps.setNavigationMode?.("indoor");
        this.speak("Indoor mode selected.", { force: true });
        this.setState(VOICE_NAV_STATES.LISTENING);
        return;

      case "DECLARE_OUTDOOR":
        this.environment = { classification: "outdoor", confidence: 0.9 };
        this.deps.setNavigationMode?.("outdoor");
        this.speak("Outdoor mode selected.", { force: true });
        this.setState(VOICE_NAV_STATES.LISTENING);
        return;

      case "NAVIGATE_TO":
      case "POSSIBLE_DESTINATION":
        await this.handleDestinationRequest(cmd.destination || rawTranscript);
        return;

      default:
        this.speak("I did not understand. Say help for available commands.", { force: true });
        this.setState(VOICE_NAV_STATES.LISTENING);
    }
  }

  describeEnvironment() {
    const c = this.environment.classification;
    if (c === "outdoor") return "Based on available evidence, you appear to be outdoors.";
    if (c === "indoor") return "Based on available evidence, you appear to be indoors in a mapped building.";
    if (c === "transition") return "You may be near a building entrance. GPS and indoor signals are mixed.";
    return "I cannot determine reliably whether you are indoors or outdoors.";
  }

  async refreshEnvironmentClassification(userDeclared = null) {
    const detections = this.deps.getLatestDetections?.() || [];
    const envHints = analyzeDetectionsForEnvironment(detections);
    let gps = null;
    try {
      gps = await this.deps.outdoorNav?.getCurrentLocation?.();
    } catch {
      gps = null;
    }

    const evidence = {
      gpsAvailable: !!gps,
      gpsAccuracyMeters: gps?.accuracy,
      hasOutdoorYoloClasses: envHints.hasOutdoorVehicle,
      hasStrongIndoorMarker: this.lastLocationEstimate?.source === "qr_marker",
      ocrIndoorMatch: this.lastLocationEstimate?.source === "ocr" ? { confidence: this.lastLocationEstimate.confidence } : null,
      userDeclared,
      nearMappedEntrance: this.lastLocationEstimate?.locationId === "main_entrance"
    };

    this.environment = await classifyEnvironment(evidence);
    return this.environment;
  }

  async answerWhereAmI() {
    await this.refreshEnvironmentClassification();
    if (this.lastLocationEstimate?.label) {
      this.speak(
        `Your last known location is ${this.lastLocationEstimate.label}, from ${this.lastLocationEstimate.source}. This is not continuous tracking.`,
        { force: true }
      );
    } else if (this.environment.classification === "outdoor") {
      this.speak("You appear to be outdoors. GPS outdoor navigation can be used when location permission is granted.", {
        force: true
      });
    } else {
      this.speak(
        "I do not have a reliable position yet. Scan a QR marker, allow GPS, or tell me take me to a destination after setting a location marker.",
        { force: true }
      );
    }
    this.setState(VOICE_NAV_STATES.LISTENING);
  }

  async handleDestinationRequest(query) {
    this.setState(VOICE_NAV_STATES.CONFIRMING_DESTINATION);
    const indoorMatch = await matchDestination(query);

    if (indoorMatch.status === "ambiguous") {
      this.pendingCandidates = indoorMatch.candidates;
      const names = indoorMatch.candidates.map((c) => c.label).join(" and ");
      this.speak(`I found ${names}. Which one do you mean?`, { force: true });
      this.setState(VOICE_NAV_STATES.CONFIRMING_DESTINATION);
      return;
    }

    if (indoorMatch.status === "success" && indoorMatch.match?.locationId) {
      await this.beginNavigationToMatch(indoorMatch.match);
      return;
    }

    await this.refreshEnvironmentClassification();
    if (this.environment.classification === "indoor" || this.deps.getNavigationMode?.() === "indoor") {
      this.speak(`I could not find "${query}" on the indoor map. Try another landmark or switch to outdoor mode.`, {
        force: true
      });
      this.setState(VOICE_NAV_STATES.LISTENING);
      return;
    }

    this.pendingDestination = { mode: "outdoor", query };
    this.speak(`Starting outdoor navigation to ${query}.`, { force: true });
    await this.startOutdoorNavigation(query);
  }

  async beginNavigationToMatch(match) {
    this.pendingDestination = { mode: "indoor", ...match };
    this.deps.setNavigationMode?.("indoor");
    this.indoorSnapshot.buildingId = match.buildingId;
    this.indoorSnapshot.destinationLocationId = match.locationId;
    this.deps.syncIndoorUi?.({
      buildingId: match.buildingId,
      destinationLocationId: match.locationId
    });

    this.setState(VOICE_NAV_STATES.DETERMINING_LOCATION);
    const located = await this.resolveCurrentLocation(match.buildingId);
    if (!located) return;

    await this.startIndoorNavigation(match);
  }

  async resolveCurrentLocation(buildingId) {
    let gps = null;
    try {
      gps = await this.deps.outdoorNav?.getCurrentLocation?.();
    } catch {
      gps = null;
    }

    const loc = await localize({
      buildingId,
      gps: gps
        ? { latitude: gps.latitude, longitude: gps.longitude, accuracyMeters: gps.accuracy }
        : null,
      ocrText: this.deps.getLastOcrText?.() || "",
      manualLocationId: this.indoorSnapshot.currentLocationId || null
    });

    if (loc.status === "error") {
      this.speak(loc.message, { force: true });
      this.setState(VOICE_NAV_STATES.ERROR);
      return false;
    }

    const assessment = loc.assessment || loc;
    const estimate = assessment.estimate || loc.estimate;

    if (estimate?.locationId) {
      this.lastLocationEstimate = estimate;
      this.indoorSnapshot.currentLocationId = estimate.locationId;
      this.deps.syncIndoorUi?.({
        buildingId,
        currentLocationId: estimate.locationId,
        floorId: estimate.floorId
      });
    }

    if (!assessment.reliableForRouting && !estimate?.locationId) {
      await this.refreshEnvironmentClassification();
      if (this.environment.classification === "uncertain") {
        this.awaitingEnvironmentAnswer = true;
        this.speak(
          "I cannot determine your location reliably. Are you inside a mapped building or outdoors? You can also scan a QR marker.",
          { force: true }
        );
        this.setState(VOICE_NAV_STATES.DETERMINING_LOCATION);
        return false;
      }
    }

    if (!this.indoorSnapshot.currentLocationId) {
      this.speak(
        "I need your starting location. Scan a QR marker at your position, or open the indoor map and confirm your location.",
        { force: true }
      );
      this.setState(VOICE_NAV_STATES.DETERMINING_LOCATION);
      return false;
    }

    return true;
  }

  async startIndoorNavigation(match) {
    this.setState(VOICE_NAV_STATES.PLANNING_ROUTE);
    const route = await calculateRoute({
      buildingId: match.buildingId,
      startLocationId: this.indoorSnapshot.currentLocationId,
      destinationLocationId: match.locationId,
      preferAccessible: this.preferAccessible
    });

    if (route.error || route.status === "error") {
      this.speak(route.error || route.message || "Could not plan a route.", { force: true });
      this.setState(VOICE_NAV_STATES.ERROR);
      return;
    }

    this.indoorSnapshot.route = route;
    this.indoorSnapshot.isNavigating = true;
    this.indoorSnapshot.isPaused = false;
    this.indoorSnapshot.currentStepIndex = 0;
    this.activeMode = "indoor";

    this.deps.indoorNav?.applyRoute?.(route, {
      buildingId: match.buildingId,
      startLocationId: this.indoorSnapshot.currentLocationId,
      destinationLocationId: match.locationId
    });

    const first = route.steps?.[0];
    this.speak(`Route to ${match.label} is ready. ${first?.instruction || ""}`, { force: true, kind: "route" });
    this.setState(VOICE_NAV_STATES.NAVIGATING);
  }

  async startOutdoorNavigation(query) {
    this.activeMode = "outdoor";
    this.deps.setNavigationMode?.("outdoor");
    this.setState(VOICE_NAV_STATES.NAVIGATING);
    await this.deps.outdoorNav?.startNavigation?.(query, this.deps.getLanguage?.());
  }

  onDetectionTick(detections) {
    if (!this.sessionActive || this.indoorSnapshot.isPaused) return;
    if (this.state !== VOICE_NAV_STATES.NAVIGATING) return;
    const warning = pickNavigationObstacleWarning(detections, this.obstacleRef);
    if (warning) this.speak(warning, { force: true, kind: "obstacle" });
  }

  async applyMarker(markerText) {
    const loc = await localize({ marker: markerText, buildingId: this.indoorSnapshot.buildingId });
    if (loc.status === "error" || !loc.estimate?.locationId) {
      this.speak(loc.message || "Invalid marker.", { force: true });
      return;
    }
    this.lastLocationEstimate = loc.estimate;
    this.indoorSnapshot.currentLocationId = loc.estimate.locationId;
    this.deps.syncIndoorUi?.({
      buildingId: loc.estimate.buildingId,
      currentLocationId: loc.estimate.locationId,
      floorId: loc.estimate.floorId
    });
    this.speak(`Location updated to ${loc.estimate.label} from QR marker.`, { force: true });

    if (this.indoorSnapshot.isNavigating && this.indoorSnapshot.destinationLocationId) {
      await this.startIndoorNavigation({
        buildingId: this.indoorSnapshot.buildingId,
        locationId: this.indoorSnapshot.destinationLocationId,
        label: this.pendingDestination?.label || "destination"
      });
    }
  }
}
