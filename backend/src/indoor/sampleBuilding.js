/**
 * Sample indoor map for demonstration.
 * Nodes: walkable locations with floor coordinates for SVG rendering.
 * Edges: connections with distance (meters) and accessibility hints.
 */

const DEMO_CENTER = {
  id: "demo-center",
  name: "Dhristi Demo Center",
  description: "Sample building for indoor navigation demonstration.",
  floors: [
    { id: "0", name: "Ground Floor", level: 0 },
    { id: "1", name: "First Floor", level: 1 }
  ],
  nodes: [
    {
      id: "main_entrance",
      floorId: "0",
      label: "Main Entrance",
      type: "entrance",
      x: 80,
      y: 300
    },
    {
      id: "reception",
      floorId: "0",
      label: "Reception",
      type: "reception",
      x: 200,
      y: 300
    },
    {
      id: "corridor_a_g",
      floorId: "0",
      label: "Corridor A",
      type: "corridor",
      x: 340,
      y: 300
    },
    {
      id: "corridor_b_g",
      floorId: "0",
      label: "Corridor B",
      type: "corridor",
      x: 480,
      y: 300
    },
    {
      id: "restroom_g",
      floorId: "0",
      label: "Restroom",
      type: "restroom",
      x: 340,
      y: 180
    },
    {
      id: "staircase_g",
      floorId: "0",
      label: "Staircase",
      type: "stairs",
      x: 620,
      y: 260
    },
    {
      id: "elevator_g",
      floorId: "0",
      label: "Elevator",
      type: "elevator",
      x: 620,
      y: 340
    },
    {
      id: "staircase_1",
      floorId: "1",
      label: "Staircase",
      type: "stairs",
      x: 620,
      y: 260
    },
    {
      id: "elevator_1",
      floorId: "1",
      label: "Elevator",
      type: "elevator",
      x: 620,
      y: 340
    },
    {
      id: "corridor_a_1",
      floorId: "1",
      label: "Corridor A",
      type: "corridor",
      x: 480,
      y: 300
    },
    {
      id: "lab_1",
      floorId: "1",
      label: "Laboratory 1",
      type: "room",
      x: 340,
      y: 300,
      aliases: ["computer lab", "lab 1", "laboratory one", "the lab"]
    },
    {
      id: "lab_2",
      floorId: "1",
      label: "Laboratory 2",
      type: "room",
      x: 400,
      y: 240,
      aliases: ["lab 2", "laboratory two"]
    },
    {
      id: "room_101",
      floorId: "1",
      label: "Room 101",
      type: "room",
      x: 340,
      y: 180
    },
    {
      id: "room_102",
      floorId: "1",
      label: "Room 102",
      type: "room",
      x: 480,
      y: 180
    }
  ],
  edges: [
    { from: "main_entrance", to: "reception", distanceMeters: 12, accessible: true },
    { from: "reception", to: "corridor_a_g", distanceMeters: 14, accessible: true },
    { from: "corridor_a_g", to: "corridor_b_g", distanceMeters: 16, accessible: true },
    { from: "corridor_a_g", to: "restroom_g", distanceMeters: 10, accessible: true },
    { from: "corridor_b_g", to: "staircase_g", distanceMeters: 12, accessible: false },
    { from: "corridor_b_g", to: "elevator_g", distanceMeters: 12, accessible: true },
    {
      from: "staircase_g",
      to: "staircase_1",
      distanceMeters: 0,
      accessible: false,
      floorTransition: { fromFloor: "0", toFloor: "1", mode: "stairs" }
    },
    {
      from: "elevator_g",
      to: "elevator_1",
      distanceMeters: 0,
      accessible: true,
      floorTransition: { fromFloor: "0", toFloor: "1", mode: "elevator" }
    },
    { from: "staircase_1", to: "corridor_a_1", distanceMeters: 10, accessible: false },
    { from: "elevator_1", to: "corridor_a_1", distanceMeters: 10, accessible: true },
    { from: "corridor_a_1", to: "lab_1", distanceMeters: 14, accessible: true },
    { from: "corridor_a_1", to: "lab_2", distanceMeters: 12, accessible: true },
    { from: "lab_2", to: "room_102", distanceMeters: 10, accessible: true },
    { from: "corridor_a_1", to: "room_102", distanceMeters: 10, accessible: true },
    { from: "lab_1", to: "room_101", distanceMeters: 12, accessible: true }
  ],
  markers: {
    "INDOOR:demo-center:0:main_entrance": "main_entrance",
    "INDOOR:demo-center:0:reception": "reception",
    "INDOOR:demo-center:0:RECEPTION": "reception",
    "INDOOR:demo-center:0:corridor_a": "corridor_a_g",
    "INDOOR:demo-center:0:corridor_b": "corridor_b_g",
    "INDOOR:demo-center:0:restroom": "restroom_g",
    "INDOOR:demo-center:0:staircase": "staircase_g",
    "INDOOR:demo-center:0:elevator": "elevator_g",
    "INDOOR:demo-center:1:staircase": "staircase_1",
    "INDOOR:demo-center:1:elevator": "elevator_1",
    "INDOOR:demo-center:1:corridor_a": "corridor_a_1",
    "INDOOR:demo-center:1:lab_1": "lab_1",
    "INDOOR:demo-center:1:lab_2": "lab_2",
    "INDOOR:demo-center:1:room_101": "room_101",
    "INDOOR:demo-center:1:room_102": "room_102"
  }
};

/** Active buildings used for routing (demo fixture only until verified campus data is added). */
const BUILDINGS = [DEMO_CENTER];

function getBuilding(buildingId) {
  return BUILDINGS.find((b) => b.id === buildingId) || null;
}

function listBuildings() {
  return BUILDINGS.map(({ id, name, description, floors, isTemplate }) => ({
    id,
    name,
    description,
    floors,
    isTemplate: !!isTemplate
  }));
}

function getBuildingMap(buildingId) {
  const building = getBuilding(buildingId);
  if (!building) return null;
  return {
    id: building.id,
    name: building.name,
    floors: building.floors,
    nodes: building.nodes,
    edges: building.edges
  };
}

function resolveMarker(markerText, buildingId = null) {
  const trimmed = (markerText || "").trim();
  if (!trimmed) {
    return { status: "error", message: "Marker text is empty." };
  }

  const upper = trimmed.toUpperCase();
  if (!upper.startsWith("INDOOR:")) {
    return {
      status: "error",
      message: 'Invalid marker format. Expected INDOOR:buildingId:floorId:locationKey'
    };
  }

  const parts = trimmed.split(":");
  if (parts.length !== 4) {
    return {
      status: "error",
      message: "Invalid marker format. Use INDOOR:buildingId:floorId:locationKey"
    };
  }

  const [, bId, floorId] = parts;
  if (buildingId && buildingId !== bId) {
    return {
      status: "error",
      message: "This marker belongs to a different building than the one selected."
    };
  }

  const building = getBuilding(bId);
  if (!building) {
    return { status: "error", message: `Unknown building "${bId}".` };
  }

  const floor = building.floors.find((f) => f.id === floorId);
  if (!floor) {
    return { status: "error", message: `Unknown floor "${floorId}" in building ${building.name}.` };
  }

  const locationId = building.markers[upper] || building.markers[trimmed];
  if (!locationId) {
    return { status: "error", message: "Unknown location marker for this building and floor." };
  }

  const node = building.nodes.find((n) => n.id === locationId);
  if (!node) {
    return { status: "error", message: "Marker maps to a missing location in the building data." };
  }

  return {
    status: "success",
    buildingId: bId,
    buildingName: building.name,
    floorId: node.floorId,
    locationId: node.id,
    label: node.label
  };
}

module.exports = {
  BUILDINGS,
  DEMO_CENTER,
  getBuilding,
  listBuildings,
  getBuildingMap,
  resolveMarker
};
