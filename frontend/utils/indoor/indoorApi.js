const API_BASE = "/api/indoor";

export async function fetchBuildings() {
  const res = await fetch(`${API_BASE}/buildings`);
  if (!res.ok) throw new Error("Failed to load buildings.");
  const data = await res.json();
  return data.buildings || [];
}

export async function fetchBuildingMap(buildingId) {
  const res = await fetch(`${API_BASE}/buildings/${encodeURIComponent(buildingId)}/map`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load building map.");
  }
  const data = await res.json();
  return data.map;
}

export async function calculateRoute(payload) {
  const res = await fetch(`${API_BASE}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.status === "success") return data.route;
  return { error: data.message || data.code || "Route calculation failed.", ...data };
}

export async function resolveMarker(marker, buildingId) {
  const res = await fetch(`${API_BASE}/marker/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marker, buildingId })
  });
  return res.json();
}
