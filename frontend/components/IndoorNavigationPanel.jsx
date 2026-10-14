import React, { useCallback, useEffect, useRef, useState } from "react";
import { IndoorFloorMap } from "./IndoorFloorMap.jsx";
import { QrMarkerScanner } from "./QrMarkerScanner.jsx";
import { fetchBuildings, fetchBuildingMap, resolveMarker } from "../utils/indoor/indoorApi.js";
import { IndoorNavigationManager } from "../utils/indoor/indoorNavigationManager.js";

export function IndoorNavigationPanel({
  speakText,
  onStopOutdoorSpeech,
  sharedManagerRef,
  uiSync,
  onMarkerApplied,
  voiceOrchestratorRef
}) {
  const managerRef = useRef(null);
  const lastSpokenRef = useRef({ key: "", time: 0 });

  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState("");
  const [mapData, setMapData] = useState(null);
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [viewFloorId, setViewFloorId] = useState("");
  const [currentLocationId, setCurrentLocationId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [preferAccessible, setPreferAccessible] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [markerError, setMarkerError] = useState("");
  const [uiMessage, setUiMessage] = useState("");

  const [indoorState, setIndoorState] = useState({
    isNavigating: false,
    status: "IDLE",
    route: null,
    currentStepIndex: 0,
    currentStep: null,
    nextStep: null,
    errorMessage: ""
  });

  const safeSpeak = useCallback(
    (text, meta = {}) => {
      if (meta.cancel && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        return;
      }
      if (!text) return;
      const key = `${meta.stepIndex ?? "x"}:${text}:${meta.repeat ? "r" : ""}`;
      const now = Date.now();
      if (!meta.repeat && !meta.recalculated && key === lastSpokenRef.current.key && now - lastSpokenRef.current.time < 2000) {
        return;
      }
      lastSpokenRef.current = { key, time: now };
      if (!window.speechSynthesis) {
        setUiMessage("Voice guidance unavailable: speech synthesis not supported.");
        return;
      }
      speakText(text);
    },
    [speakText]
  );

  useEffect(() => {
    if (sharedManagerRef && sharedManagerRef.current) {
      managerRef.current = sharedManagerRef.current;
      return;
    }
    managerRef.current = new IndoorNavigationManager({
      onStateChange: (patch) => {
        setIndoorState((prev) => ({ ...prev, ...patch }));
        if (patch.viewFloorId) setViewFloorId(patch.viewFloorId);
      },
      onSpeak: safeSpeak,
      onError: (_code, message) => setUiMessage(message)
    });
  }, [safeSpeak, sharedManagerRef]);

  useEffect(() => {
    if (!uiSync) return;
    if (uiSync.buildingId) setBuildingId(uiSync.buildingId);
    if (uiSync.currentLocationId) setCurrentLocationId(uiSync.currentLocationId);
    if (uiSync.destinationLocationId) setDestinationLocationId(uiSync.destinationLocationId);
    if (uiSync.floorId) {
      setSelectedFloorId(uiSync.floorId);
      setViewFloorId(uiSync.floorId);
    }
  }, [uiSync]);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchBuildings();
        setBuildings(list);
        if (list.length > 0) {
          setBuildingId(list[0].id);
        }
      } catch (err) {
        setLoadError(err.message || "Could not load indoor buildings. Is the backend running?");
      }
    })();
  }, []);

  useEffect(() => {
    if (!buildingId) return;
    (async () => {
      try {
        setLoadError("");
        const map = await fetchBuildingMap(buildingId);
        setMapData(map);
        const firstFloor = map.floors?.[0]?.id || "";
        setSelectedFloorId(firstFloor);
        setViewFloorId(firstFloor);
        setCurrentLocationId("");
        setDestinationLocationId("");
        managerRef.current?.resetNavigationState();
      } catch (err) {
        setLoadError(err.message);
        setMapData(null);
      }
    })();
  }, [buildingId]);

  const currentBuilding = buildings.find((b) => b.id === buildingId);
  const viewFloor = mapData?.floors?.find((f) => f.id === (viewFloorId || selectedFloorId));

  const destinationLabel = mapData?.nodes?.find((n) => n.id === destinationLocationId)?.label;

  const handleCalculateRoute = async () => {
    setUiMessage("");
    await managerRef.current?.computeRoute({
      buildingId,
      startLocationId: currentLocationId,
      destinationLocationId,
      preferAccessible
    });
  };

  const handleStart = async () => {
    setUiMessage("");
    onStopOutdoorSpeech?.();
    await managerRef.current?.startNavigation({
      buildingId,
      startLocationId: currentLocationId,
      destinationLocationId,
      preferAccessible,
      destinationLabel
    });
  };

  const handleStop = () => {
    managerRef.current?.stopNavigation(true);
    setUiMessage("Indoor navigation stopped.");
  };

  const handleMarker = async (markerText) => {
    setMarkerError("");
    const result = await resolveMarker(markerText, buildingId);
    if (result.status !== "success") {
      setMarkerError(result.message || "Invalid marker.");
      return;
    }
    setCurrentLocationId(result.locationId);
    setSelectedFloorId(result.floorId);
    setViewFloorId(result.floorId);
    setUiMessage(`Current location set to ${result.label} (marker update — not continuous tracking).`);
    onMarkerApplied?.(markerText);

    // Notify voice orchestrator of marker scan
    if (voiceOrchestratorRef?.current) {
      await voiceOrchestratorRef.current.applyMarker(markerText);
    }

    if (indoorState.isNavigating && destinationLocationId) {
      await managerRef.current?.onCurrentLocationChanged({
        buildingId,
        newLocationId: result.locationId,
        destinationLocationId,
        preferAccessible
      });
    }
  };

  const routeNodeIds = indoorState.route?.nodeIds || [];
  const progressText =
    indoorState.route?.steps?.length > 0
      ? `Step ${Math.min(indoorState.currentStepIndex + 1, indoorState.route.steps.length)} of ${indoorState.route.steps.length}`
      : "";

  return (
    <div className="indoor-nav-panel" role="region" aria-label="Indoor floor navigation">
      <style>{`
        .indoor-mode-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(52, 211, 153, 0.15);
          color: #6ee7b7;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .indoor-nav-panel .indoor-select-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin: 12px 0;
        }
        .indoor-nav-panel label {
          display: block;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .indoor-nav-panel select {
          width: 100%;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .indoor-map-wrap {
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 12px;
          margin: 16px 0;
        }
        .indoor-map-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.95rem;
          opacity: 0.9;
        }
        .indoor-map-svg {
          width: 100%;
          height: auto;
          background: #111827;
          border-radius: 10px;
        }
        .indoor-edge { stroke: #475569; stroke-width: 4; }
        .indoor-edge-route { stroke: #22d3ee; stroke-width: 6; }
        .indoor-node-label { fill: #e2e8f0; font-size: 11px; font-family: sans-serif; }
        .indoor-node-current { stroke: #fbbf24; stroke-width: 4; }
        .indoor-node-dest { stroke: #f472b6; stroke-width: 4; }
        .indoor-node-route { stroke: #22d3ee; stroke-width: 2; }
        .indoor-map-legend {
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 8px 0 0;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.75);
        }
        .legend-dot, .legend-line { display: inline-block; margin-right: 6px; vertical-align: middle; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
        .legend-current { background: #fbbf24; }
        .legend-dest { background: #f472b6; }
        .legend-line { width: 18px; height: 0; border-top: 3px solid #22d3ee; }
        .legend-walk { border-top-color: #475569; }
        .indoor-instruction-panel {
          background: rgba(79, 172, 254, 0.12);
          border: 1px solid rgba(79, 172, 254, 0.35);
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
        }
        .indoor-hint { font-size: 0.92rem; color: rgba(255,255,255,0.7); line-height: 1.5; }
        .indoor-warning { color: #fcd34d; font-size: 0.9rem; margin: 8px 0; }
        .indoor-error { border-color: #f44336 !important; color: #fca5a5; }
        .indoor-btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .indoor-localization-note {
          font-size: 0.88rem;
          color: rgba(255,255,255,0.65);
          margin-top: 8px;
        }
        .qr-video {
          width: 100%;
          max-height: 240px;
          border-radius: 10px;
          background: #000;
          margin-top: 10px;
        }
        .indoor-status-live { min-height: 1.5em; }
      `}</style>

      <div className="indoor-mode-badge" role="status">
        🏢 Indoor Floors mode — map-based routes (not GPS)
      </div>

      <p className="indoor-hint">
        Select your building and floor, set your current location manually or with a QR marker, choose a
        destination, then start step-by-step guidance. Next Step is manual for demonstration; the app does
        not track your movement automatically indoors.
      </p>

      {loadError && (
        <div className="result-box indoor-error" role="alert">
          {loadError}
        </div>
      )}

      <div className="indoor-select-row">
        <div>
          <label htmlFor="indoor-building">Building</label>
          <select
            id="indoor-building"
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            aria-label="Select building"
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="indoor-floor">Floor</label>
          <select
            id="indoor-floor"
            value={selectedFloorId}
            onChange={(e) => setSelectedFloorId(e.target.value)}
            aria-label="Select floor for location pickers"
          >
            {(mapData?.floors || currentBuilding?.floors || []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="indoor-view-floor">Map view floor</label>
          <select
            id="indoor-view-floor"
            value={viewFloorId || selectedFloorId}
            onChange={(e) => setViewFloorId(e.target.value)}
            aria-label="Select floor to display on map"
          >
            {(mapData?.floors || []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="indoor-select-row">
        <div>
          <label htmlFor="indoor-current">Current location</label>
          <select
            id="indoor-current"
            value={currentLocationId}
            onChange={(e) => {
              const id = e.target.value;
              setCurrentLocationId(id);
              const node = mapData?.nodes?.find((n) => n.id === id);
              if (node) {
                setSelectedFloorId(node.floorId);
                setViewFloorId(node.floorId);
              }
            }}
            aria-label="Select current indoor location"
          >
            <option value="">— Select —</option>
            {(mapData?.nodes || []).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label} ({mapData?.floors?.find((f) => f.id === loc.floorId)?.name || loc.floorId})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="indoor-destination">Destination</label>
          <select
            id="indoor-destination"
            value={destinationLocationId}
            onChange={(e) => {
              setDestinationLocationId(e.target.value);
              if (indoorState.isNavigating) {
                setUiMessage("Destination changed — calculate route again or restart navigation.");
              }
            }}
            aria-label="Select destination"
          >
            <option value="">— Select —</option>
            {(mapData?.nodes || []).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label} ({mapData.floors.find((f) => f.id === loc.floorId)?.name || loc.floorId})
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="indoor-accessible-toggle">
        <input
          type="checkbox"
          checked={preferAccessible}
          onChange={(e) => setPreferAccessible(e.target.checked)}
        />{" "}
        Prefer accessible routes (elevator over stairs when possible)
      </label>

      <IndoorFloorMap
        buildingName={mapData?.name || currentBuilding?.name || "Building"}
        floor={viewFloor}
        nodes={mapData?.nodes || []}
        edges={mapData?.edges || []}
        routeNodeIds={routeNodeIds}
        currentLocationId={currentLocationId}
        destinationLocationId={destinationLocationId}
        selectedFloorId={viewFloorId || selectedFloorId}
      />

      <QrMarkerScanner
        onScan={handleMarker}
        onError={(msg) => setMarkerError(msg)}
        disabled={!buildingId}
      />
      {markerError && (
        <div className="result-box indoor-error" role="alert">
          {markerError}
        </div>
      )}

      <p className="indoor-localization-note">
        Localization is discrete: manual selection or QR markers update your known position only at that
        moment. Continuous indoor positioning is not implemented.
      </p>

      <div className="indoor-btn-row">
        <button type="button" className="primary-btn" onClick={handleCalculateRoute}>
          🗺 Preview Route
        </button>
        <button
          type="button"
          className="primary-btn success-btn"
          onClick={handleStart}
          disabled={indoorState.isNavigating}
          aria-label="Start indoor navigation"
        >
          ▶ Start Navigation
        </button>
        <button
          type="button"
          className="primary-btn danger-btn"
          onClick={handleStop}
          disabled={!indoorState.isNavigating}
        >
          ⏹ Stop Navigation
        </button>
        <button
          type="button"
          className="primary-btn accent-btn"
          onClick={() => managerRef.current?.repeatInstruction()}
          disabled={!indoorState.route}
        >
          🔁 Repeat Instruction
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={() => managerRef.current?.nextStep()}
          disabled={!indoorState.isNavigating}
          aria-label="Next navigation step (manual demo)"
        >
          ⏭ Next Step
        </button>
      </div>

      <div className="indoor-status-live" aria-live="polite">
        {uiMessage && <div className="result-box">{uiMessage}</div>}
        {indoorState.errorMessage && (
          <div className="result-box indoor-error" role="alert">
            {indoorState.errorMessage}
          </div>
        )}
      </div>

      {indoorState.route && (
        <div className="indoor-instruction-panel" aria-live="polite">
          <div className="result-title">
            {indoorState.isNavigating ? "🧭 Navigating indoors" : "📋 Route preview"}
            {destinationLabel ? ` → ${destinationLabel}` : ""}
          </div>
          {indoorState.route.totalCostMeters != null && (
            <div style={{ marginBottom: 8, opacity: 0.85 }}>
              Estimated path length: about {indoorState.route.totalCostMeters} meters
            </div>
          )}
          {progressText && <div style={{ marginBottom: 8 }}>{progressText}</div>}
          {indoorState.currentStep ? (
            <>
              <div style={{ fontSize: "0.9rem", color: "#a5b4fc" }}>Current instruction</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 600, marginTop: 4 }}>
                {indoorState.currentStep.instruction}
              </div>
              {indoorState.nextStep && indoorState.nextStep.type !== "arrival" && (
                <div style={{ marginTop: 10, opacity: 0.85 }}>
                  <strong>Next:</strong> {indoorState.nextStep.instruction}
                </div>
              )}
            </>
          ) : (
            <div>Select locations and preview or start a route.</div>
          )}
          {indoorState.status === "ARRIVED" && (
            <div style={{ marginTop: 10, color: "#6ee7b7" }}>Destination reached.</div>
          )}
        </div>
      )}

      <div className="result-box" style={{ marginTop: 12 }} role="note">
        <div className="result-title">Planned route vs. obstacle detection</div>
        <div className="result-content indoor-hint">
          The highlighted path follows sample map data only. Live YOLO obstacle detection (if enabled
          elsewhere on the dashboard) reports objects in the camera view and does not verify that the
          indoor path is clear or safe.
        </div>
      </div>
    </div>
  );
}

export default IndoorNavigationPanel;
