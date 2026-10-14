import { calculateRoute } from "./indoorApi.js";

export class IndoorNavigationManager {
  constructor({ onStateChange, onSpeak, onError }) {
    this.onStateChange = onStateChange || (() => {});
    this.onSpeak = onSpeak || (() => {});
    this.onError = onError || (() => {});

    this.isNavigating = false;
    this.route = null;
    this.currentStepIndex = 0;
    this.lastSpokenStepIndex = -1;
    this.isPaused = false;
  }

  resetNavigationState(partial = {}) {
    this.isNavigating = false;
    this.route = null;
    this.currentStepIndex = 0;
    this.lastSpokenStepIndex = -1;
    this.onStateChange({
      isNavigating: false,
      status: "IDLE",
      currentStepIndex: 0,
      currentStep: null,
      nextStep: null,
      route: null,
      ...partial
    });
  }

  async computeRoute({ buildingId, startLocationId, destinationLocationId, preferAccessible }) {
    if (!buildingId) {
      this.onError("SELECT_BUILDING", "Please select a building.");
      return null;
    }
    if (!startLocationId) {
      this.onError("SELECT_START", "Please select your current location.");
      return null;
    }
    if (!destinationLocationId) {
      this.onError("SELECT_DESTINATION", "Please select a destination.");
      return null;
    }
    if (startLocationId === destinationLocationId) {
      this.onError("SAME_LOCATION", "Starting point and destination cannot be the same.");
      return null;
    }

    this.onStateChange({ status: "CALCULATING", errorMessage: "" });

    try {
      const result = await calculateRoute({
        buildingId,
        startLocationId,
        destinationLocationId,
        preferAccessible
      });

      if (result.error || result.status === "error") {
        const msg = result.error || result.message || "Could not calculate route.";
        this.onStateChange({ status: "ROUTE_ERROR", errorMessage: msg, route: null });
        this.onError("ROUTE_ERROR", msg);
        return null;
      }

      this.route = result;
      this.currentStepIndex = 0;
      this.lastSpokenStepIndex = -1;
      this.onStateChange({
        status: "ROUTE_READY",
        route: result,
        currentStepIndex: 0,
        currentStep: result.steps?.[0] || null,
        nextStep: result.steps?.[1] || null,
        errorMessage: ""
      });
      return result;
    } catch (err) {
      const msg = err.message || "Backend request failed.";
      this.onStateChange({ status: "ROUTE_ERROR", errorMessage: msg, route: null });
      this.onError("NETWORK", msg);
      return null;
    }
  }

  async startNavigation({ buildingId, startLocationId, destinationLocationId, preferAccessible, destinationLabel }) {
    const route =
      this.route && this.route.endId === destinationLocationId && this.route.startId === startLocationId
        ? this.route
        : await this.computeRoute({
            buildingId,
            startLocationId,
            destinationLocationId,
            preferAccessible
          });

    if (!route || !route.steps?.length) return false;

    this.isNavigating = true;
    this.isPaused = false;
    this.currentStepIndex = 0;
    this.lastSpokenStepIndex = 0;

    const first = route.steps[0];
    this.onStateChange({
      isNavigating: true,
      status: "ACTIVE",
      route,
      currentStepIndex: 0,
      currentStep: first,
      nextStep: route.steps[1] || null,
      viewFloorId: first.floorId
    });

    const intro = `Indoor navigation started. Destination: ${destinationLabel || "selected location"}. ${first.instruction}`;
    this.onSpeak(intro, { stepIndex: 0, isInitial: true });
    return true;
  }

  pauseNavigation() {
    this.isPaused = true;
    this.onStateChange({ isPaused: true, status: "PAUSED" });
  }

  resumeNavigation() {
    this.isPaused = false;
    this.onStateChange({ isPaused: false, status: "ACTIVE" });
  }

  applyRoute(route, { buildingId, startLocationId, destinationLocationId }) {
    this.route = route;
    this.isNavigating = true;
    this.isPaused = false;
    this.currentStepIndex = 0;
    this.onStateChange({
      isNavigating: true,
      status: "ACTIVE",
      route,
      buildingId,
      startLocationId,
      destinationLocationId,
      currentStepIndex: 0,
      currentStep: route.steps?.[0] || null,
      nextStep: route.steps?.[1] || null,
      viewFloorId: route.steps?.[0]?.floorId
    });
  }

  stopNavigation(cancelSpeech = true) {
    this.isNavigating = false;
    this.isPaused = false;
    this.onStateChange({
      isNavigating: false,
      status: "STOPPED"
    });
    if (cancelSpeech) {
      this.onSpeak(null, { cancel: true });
    }
  }

  repeatInstruction() {
    if (this.isPaused) {
      this.onError("PAUSED", "Navigation is paused. Say resume navigation to continue.");
      return;
    }
    if (!this.route?.steps?.length) {
      this.onError("NO_ROUTE", "No active route to repeat.");
      return;
    }
    const step = this.route.steps[this.currentStepIndex];
    if (step) {
      this.onSpeak(step.instruction, { stepIndex: this.currentStepIndex, repeat: true });
    }
  }

  nextStep() {
    if (this.isPaused) return;
    if (!this.isNavigating || !this.route?.steps) return;

    const steps = this.route.steps;
    if (this.currentStepIndex >= steps.length - 1) {
      this.handleArrival();
      return;
    }

    this.currentStepIndex += 1;
    this.lastSpokenStepIndex = this.currentStepIndex;
    const current = steps[this.currentStepIndex];
    const next = steps[this.currentStepIndex + 1] || null;

    if (current.type === "arrival") {
      this.handleArrival();
      return;
    }

    this.onStateChange({
      currentStepIndex: this.currentStepIndex,
      currentStep: current,
      nextStep: next,
      viewFloorId: current.floorId
    });
    this.onSpeak(current.instruction, { stepIndex: this.currentStepIndex });
  }

  handleArrival() {
    const arrivalStep = this.route?.steps?.find((s) => s.type === "arrival");
    this.isNavigating = false;
    this.onStateChange({
      isNavigating: false,
      status: "ARRIVED",
      currentStep: arrivalStep || null,
      nextStep: null
    });
    if (arrivalStep) {
      this.onSpeak(arrivalStep.instruction, { stepIndex: arrivalStep.stepIndex, arrival: true });
    }
  }

  async onCurrentLocationChanged({
    buildingId,
    newLocationId,
    destinationLocationId,
    preferAccessible
  }) {
    if (!this.isNavigating || !destinationLocationId) return;

    if (newLocationId === destinationLocationId) {
      this.handleArrival();
      return;
    }

    const route = await this.computeRoute({
      buildingId,
      startLocationId: newLocationId,
      destinationLocationId,
      preferAccessible
    });

    if (!route) {
      this.stopNavigation(false);
      return;
    }

    this.isNavigating = true;
    this.currentStepIndex = 0;
    this.lastSpokenStepIndex = 0;
    const first = route.steps[0];
    this.onStateChange({
      isNavigating: true,
      status: "ACTIVE",
      route,
      currentStepIndex: 0,
      currentStep: first,
      nextStep: route.steps[1] || null,
      viewFloorId: first.floorId
    });
    this.onSpeak(`Location updated. ${first.instruction}`, { stepIndex: 0, recalculated: true });
  }
}
