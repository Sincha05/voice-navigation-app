# Indoor Navigation Module

This document describes the indoor navigation feature integrated into the Dhristi voice navigation app.

## Entering indoor mode

1. Open the app and go to **Dashboard**.
2. In the **Voice Navigation** card, select **Indoor Floors** (the alternative is **Outdoor GPS**, which keeps the original Google Maps walking flow).
3. Select building, floor, current location, and destination, then **Preview Route** or **Start Navigation**.

## Sample building data

The demonstration building **Dhristi Demo Center** (`demo-center`) is defined in:

- `backend/src/indoor/sampleBuilding.js`

It includes two floors (Ground and First) with landmarks such as Main Entrance, Reception, corridors, Laboratory 1, Room 101/102, staircase, elevator, and restroom. Nodes have SVG coordinates; edges define walkable connections with distances and accessibility flags.

To add buildings, extend the `BUILDINGS` array in that file with the same shape (`nodes`, `edges`, `markers`).

## Route calculation

Routes are computed on the backend with **Dijkstra's algorithm** on a weighted graph (`backend/src/indoor/routeEngine.js`):

- Edge weight defaults to `distanceMeters`.
- With **Prefer accessible routes**, non-accessible edges (e.g. stairs) receive a large penalty so elevators are preferred when available.

The API returns ordered nodes, edges, and spoken **steps** (walk segments, floor transitions, arrival).

### API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/indoor/buildings` | List buildings and floors |
| GET | `/api/indoor/buildings/:id/map` | Floor map graph for UI |
| POST | `/api/indoor/route` | Calculate route (`buildingId`, `startLocationId`, `destinationLocationId`, optional `preferAccessible`) |
| POST | `/api/indoor/marker/resolve` | Resolve QR/marker string to a location |

## Localization (honest behavior)

- **Manual:** Pick your current location from the dropdown (per selected floor).
- **QR / marker:** Scan or type a marker such as `INDOOR:demo-center:0:reception`.
- Updates are **discrete** — there is no continuous indoor positioning (no beacons/Wi‑Fi/camera SLAM).

During active navigation, a successful marker or location change **recalculates** the remaining route from the new position.

## QR markers

Format: `INDOOR:<buildingId>:<floorId>:<locationKey>`

Examples:

- `INDOOR:demo-center:0:reception`
- `INDOOR:demo-center:1:lab_1`

Camera scanning uses the browser **Barcode Detector** API when available; otherwise use manual entry.

## Voice guidance

Indoor instructions use the same browser **speech synthesis** helper as the rest of the dashboard (`speakText` in `App.jsx`). **Repeat Instruction** re-speaks the current step; duplicate announcements are throttled on rapid re-renders.

Stopping indoor navigation cancels active speech synthesis.

## Step-by-step demo controls

- **Next Step** advances manually for demonstrations (the app does not detect movement indoors).
- **Stop Navigation** ends guidance and cancels speech.

## Obstacle detection

Live YOLO detection remains available in its own dashboard card and is unchanged. Indoor routes are **map-planned paths only** and are not validated against camera detections.

## Running and testing

From the repository root, in three terminals:

```bash
# AI service (port 8000)
cd ai-service && pip install -r requirements.txt && uvicorn app:app --reload --port 8000

# Backend (port 5000)
cd backend && npm install && npm run dev

# Frontend (Vite, proxies /api to backend)
cd frontend && npm install && npm run dev
```

Backend unit tests for routing:

```bash
cd backend && npm test
```

Frontend production build:

```bash
cd frontend && npm run build
```

## Simulated vs. real hardware

| Capability | Status |
|------------|--------|
| Sample indoor map & graph routing | Implemented |
| Manual + QR marker localization | Implemented (discrete updates) |
| Automatic indoor position tracking | Not implemented |
| Outdoor GPS navigation | Existing feature (Google APIs) |
| YOLO obstacle detection | Existing feature (unchanged) |
