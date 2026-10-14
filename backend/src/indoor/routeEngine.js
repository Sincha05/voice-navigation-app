/**
 * Weighted shortest-path routing on indoor walk graphs (Dijkstra).
 * Supports floor transitions and optional preference for accessible edges.
 */

function buildAdjacency(building, preferAccessible) {
  const adj = new Map();
  const addEdge = (from, to, edge, reversed) => {
    if (!adj.has(from)) adj.set(from, []);
    let weight = edge.distanceMeters ?? 1;
    if (preferAccessible && edge.accessible === false) {
      weight += 1000;
    }
    adj.get(from).push({
      to,
      weight,
      edge,
      reversed
    });
  };

  for (const edge of building.edges) {
    addEdge(edge.from, edge.to, edge, false);
    addEdge(edge.to, edge.from, edge, true);
  }
  return adj;
}

function dijkstra(building, startId, endId, preferAccessible) {
  if (startId === endId) {
    return { status: "error", code: "SAME_LOCATION", message: "Starting point and destination are the same." };
  }

  const startNode = building.nodes.find((n) => n.id === startId);
  const endNode = building.nodes.find((n) => n.id === endId);
  if (!startNode) {
    return { status: "error", code: "INVALID_START", message: "Unknown starting location." };
  }
  if (!endNode) {
    return { status: "error", code: "INVALID_DESTINATION", message: "Unknown destination." };
  }

  const adj = buildAdjacency(building, preferAccessible);
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  for (const node of building.nodes) {
    dist.set(node.id, Infinity);
  }
  dist.set(startId, 0);

  while (true) {
    let u = null;
    let best = Infinity;
    for (const [id, d] of dist.entries()) {
      if (!visited.has(id) && d < best) {
        best = d;
        u = id;
      }
    }
    if (u === null || best === Infinity) break;
    if (u === endId) break;
    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const { to, weight, edge, reversed } of neighbors) {
      const alt = dist.get(u) + weight;
      if (alt < dist.get(to)) {
        dist.set(to, alt);
        prev.set(to, { from: u, edge, reversed });
      }
    }
  }

  if (!prev.has(endId) && startId !== endId) {
    return {
      status: "error",
      code: "NO_ROUTE",
      message: "No walkable route exists between the selected locations."
    };
  }

  const pathNodeIds = [];
  const pathEdges = [];
  let cur = endId;
  while (cur !== startId) {
    pathNodeIds.unshift(cur);
    const step = prev.get(cur);
    if (!step) {
      return {
        status: "error",
        code: "NO_ROUTE",
        message: "No walkable route exists between the selected locations."
      };
    }
    pathEdges.unshift({ ...step.edge, reversed: step.reversed, from: step.from, to: cur });
    cur = step.from;
  }
  pathNodeIds.unshift(startId);

  const nodes = pathNodeIds.map((id) => building.nodes.find((n) => n.id === id));
  const totalCost = dist.get(endId);

  return {
    status: "success",
    startId,
    endId,
    totalCostMeters: Math.round(totalCost),
    nodeIds: pathNodeIds,
    nodes,
    edges: pathEdges
  };
}

function describeTransition(edge, reversed) {
  const t = edge.floorTransition;
  if (!t) return null;
  const fromFloor = reversed ? t.toFloor : t.fromFloor;
  const toFloor = reversed ? t.fromFloor : t.toFloor;
  const fromLevel = parseInt(fromFloor, 10);
  const toLevel = parseInt(toFloor, 10);
  const goingUp = toLevel > fromLevel;

  if (t.mode === "elevator") {
    return `Take the elevator to ${toFloor === "0" ? "Ground Floor" : `Floor ${toFloor}`}.`;
  }
  if (t.mode === "stairs") {
    return goingUp
      ? `Take the stairs up to ${toFloor === "1" ? "First Floor" : `Floor ${toFloor}`}.`
      : `Take the stairs down to ${toFloor === "0" ? "Ground Floor" : `Floor ${toFloor}`}.`;
  }
  return `Change to floor ${toFloor}.`;
}

function buildInstructions(routeResult, building) {
  if (routeResult.status !== "success") return [];

  const steps = [];
  const { nodes, edges } = routeResult;

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const fromNode = nodes[i];
    const toNode = nodes[i + 1];
    const transitionText = describeTransition(edge, edge.reversed);

    if (transitionText) {
      steps.push({
        stepIndex: steps.length,
        type: "floor_transition",
        instruction: transitionText,
        floorId: toNode.floorId,
        fromLocationId: fromNode.id,
        toLocationId: toNode.id,
        distanceMeters: edge.distanceMeters || 0
      });
      continue;
    }

    const dist = edge.distanceMeters || 0;
    steps.push({
      stepIndex: steps.length,
      type: "walk",
      instruction: `From ${fromNode.label}, walk to ${toNode.label}${dist ? ` (about ${dist} meters)` : ""}.`,
      floorId: toNode.floorId,
      fromLocationId: fromNode.id,
      toLocationId: toNode.id,
      distanceMeters: dist
    });
  }

  const dest = nodes[nodes.length - 1];
  steps.push({
    stepIndex: steps.length,
    type: "arrival",
    instruction: `You have arrived at ${dest.label}.`,
    floorId: dest.floorId,
    fromLocationId: dest.id,
    toLocationId: dest.id,
    distanceMeters: 0
  });

  return steps;
}

function calculateIndoorRoute(building, startId, endId, options = {}) {
  const preferAccessible = options.preferAccessible === true;
  const path = dijkstra(building, startId, endId, preferAccessible);
  if (path.status !== "success") {
    return path;
  }
  const steps = buildInstructions(path, building);
  return {
    ...path,
    steps,
    buildingId: building.id,
    buildingName: building.name
  };
}

module.exports = {
  calculateIndoorRoute,
  dijkstra,
  buildInstructions
};
