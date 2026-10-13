import React, { useEffect, useRef, useState } from "react";
import {
  VoiceNavigationOrchestrator,
  VOICE_NAV_STATES
} from "../utils/voiceNavigation/VoiceNavigationOrchestrator.js";

export function VoiceNavigationExperience({
  speakText,
  speechSupported,
  onEnableListening,
  onDisableListening,
  isListening,
  isSpeakingRef,
  orchestratorDeps,
  onSessionChange,
  onOrchestratorReady
}) {
  const orchestratorRef = useRef(null);
  const [voiceNavState, setVoiceNavState] = useState(VOICE_NAV_STATES.IDLE);
  const [sessionActive, setSessionActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [textFallback, setTextFallback] = useState("");

  useEffect(() => {
    orchestratorRef.current = new VoiceNavigationOrchestrator({
      ...orchestratorDeps,
      speak: (text) => speakText(text),
      isSpeaking: () => isSpeakingRef?.current,
      onStateChange: ({ state, sessionActive: active, error }) => {
        setVoiceNavState(state);
        setSessionActive(!!active);
        onSessionChange?.({ state, sessionActive: !!active });
        if (error) setStatusMessage(error);
      },
      startListening: () => onEnableListening?.(),
      stopListening: (user) => onDisableListening?.(user)
    });
    onOrchestratorReady?.(orchestratorRef.current);
  }, [orchestratorDeps, speakText, onEnableListening, onDisableListening, isSpeakingRef, onSessionChange, onOrchestratorReady]);

  const enableVoiceNavigation = async () => {
    setStatusMessage("");
    if (!speechSupported) {
      setStatusMessage("Speech recognition is not supported in this browser. Use the text command box below.");
      return;
    }
    const ok = await orchestratorRef.current?.enableSession();
    if (ok) {
      setStatusMessage("Voice navigation is active. Microphone listening when not speaking.");
    }
  };

  const disableVoiceNavigation = () => {
    orchestratorRef.current?.disableSession();
    setStatusMessage("Voice navigation session ended.");
  };

  const submitTextFallback = async () => {
    const text = textFallback.trim();
    if (!text) return;
    if (!sessionActive) {
      await enableVoiceNavigation();
    }
    await orchestratorRef.current?.processTranscript(text);
    setTextFallback("");
  };

  const stateLabel = {
    [VOICE_NAV_STATES.IDLE]: "Idle",
    [VOICE_NAV_STATES.AWAITING_PERMISSION]: "Awaiting microphone permission",
    [VOICE_NAV_STATES.LISTENING]: "Listening",
    [VOICE_NAV_STATES.PROCESSING]: "Processing command",
    [VOICE_NAV_STATES.CONFIRMING_DESTINATION]: "Confirming destination",
    [VOICE_NAV_STATES.DETERMINING_LOCATION]: "Determining location",
    [VOICE_NAV_STATES.PLANNING_ROUTE]: "Planning route",
    [VOICE_NAV_STATES.NAVIGATING]: "Navigating",
    [VOICE_NAV_STATES.PAUSED]: "Paused",
    [VOICE_NAV_STATES.ERROR]: "Error — see message below"
  }[voiceNavState] || voiceNavState;

  return (
    <section className="feature-card voice-nav-entry" aria-label="Voice-first navigation">
      <div className="card-header">
        <div className="card-icon" aria-hidden="true">
          🎧
        </div>
        <div>
          <h2 className="card-title">Voice-First Navigation</h2>
          <p style={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "0.95rem", marginTop: 4 }}>
            Primary interface for spoken destinations and turn-by-turn guidance. Browsers require a button
            tap before microphone access and speech.
          </p>
        </div>
      </div>

      <p className="voice-nav-perms" role="note">
        Enable microphone permission when prompted. Optional camera access improves environment hints via
        existing obstacle detection but does not replace GPS or QR markers indoors.
      </p>

      <div className="indoor-btn-row">
        {!sessionActive ? (
          <button type="button" className="primary-btn success-btn" onClick={enableVoiceNavigation}>
            Enable Voice Navigation
          </button>
        ) : (
          <button type="button" className="primary-btn danger-btn" onClick={disableVoiceNavigation}>
            End Voice Session
          </button>
        )}
      </div>

      <div
        className="result-box"
        style={{ marginTop: 12, borderColor: "#667eea" }}
        aria-live="polite"
        role="status"
      >
        <div className="result-title">Voice session: {stateLabel}</div>
        <div className="result-content">
          Microphone: {isListening ? "listening" : sessionActive ? "waiting / speaking" : "off"}
          {statusMessage ? ` — ${statusMessage}` : ""}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label htmlFor="voice-text-fallback">Text command fallback</label>
        <div className="nav-input-row">
          <input
            id="voice-text-fallback"
            className="nav-input"
            placeholder='e.g. "Take me to the computer lab"'
            value={textFallback}
            onChange={(e) => setTextFallback(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitTextFallback()}
            aria-label="Type a navigation voice command"
          />
          <button type="button" className="primary-btn" onClick={submitTextFallback}>
            Send
          </button>
        </div>
      </div>
    </section>
  );
}

export default VoiceNavigationExperience;
