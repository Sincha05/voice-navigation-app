const { BUILDINGS } = require("./sampleBuilding");
const { NIE_MYSORE_TEMPLATE } = require("./nieCollegeTemplate");

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEFAULT_ALIASES_BY_TYPE = {
  restroom: ["restroom", "toilet", "washroom"],
  stairs: ["stairs", "staircase", "steps"],
  elevator: ["elevator", "lift"],
  entrance: ["entrance", "main entrance", "entry"]
};

function aliasesForNode(node) {
  const list = new Set();
  const labelNorm = normalizeText(node.label);
  if (labelNorm) list.add(labelNorm);
  if (node.aliases && Array.isArray(node.aliases)) {
    node.aliases.forEach((a) => list.add(normalizeText(a)));
  }
  const typeAliases = DEFAULT_ALIASES_BY_TYPE[node.type] || [];
  typeAliases.forEach((a) => list.add(normalizeText(a)));
  return [...list];
}

function getRegisteredBuildings() {
  return [...BUILDINGS, NIE_MYSORE_TEMPLATE].filter((b) => b.nodes && b.nodes.length > 0);
}

function buildDestinationCatalog(buildings = getRegisteredBuildings()) {
  const destinations = [];
  for (const building of buildings) {
    if (building.isTemplate && !building.populated) continue;
    for (const node of building.nodes || []) {
      destinations.push({
        buildingId: building.id,
        buildingName: building.name,
        locationId: node.id,
        floorId: node.floorId,
        label: node.label,
        type: node.type,
        aliases: aliasesForNode(node),
        searchText: [node.label, ...(node.aliases || [])].join(" ")
      });
    }
  }
  return destinations;
}

function tokenOverlapScore(queryNorm, aliasNorm) {
  if (!queryNorm || !aliasNorm) return 0;
  if (aliasNorm === queryNorm) return 100;
  if (aliasNorm.includes(queryNorm) || queryNorm.includes(aliasNorm)) return 80;
  const qTokens = queryNorm.split(" ");
  const aTokens = aliasNorm.split(" ");
  let hits = 0;
  for (const t of qTokens) {
    if (t.length < 2) continue;
    if (aTokens.some((a) => a.includes(t) || t.includes(a))) hits += 1;
  }
  return hits > 0 ? 40 + hits * 10 : 0;
}

function scoreDestination(queryNorm, dest) {
  let best = 0;
  for (const alias of dest.aliases) {
    best = Math.max(best, tokenOverlapScore(queryNorm, alias));
  }
  return best;
}

function matchIndoorDestination(query, options = {}) {
  const queryNorm = normalizeText(query);
  if (!queryNorm) {
    return { status: "error", message: "Empty destination." };
  }

  const catalog = options.catalog || buildDestinationCatalog();
  const scored = catalog
    .map((dest) => ({ dest, score: scoreDestination(queryNorm, dest) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { status: "not_found", message: `No mapped indoor destination matched "${query}".` };
  }

  const topScore = scored[0].score;
  const top = scored.filter((s) => s.score >= topScore - 5);

  if (top.length > 1) {
    const labels = top.map((t) => t.dest.label);
    const uniqueLabels = [...new Set(labels)];
    if (uniqueLabels.length > 1) {
      return {
        status: "ambiguous",
        message: "Multiple destinations match your request.",
        candidates: top.map((t) => ({
          buildingId: t.dest.buildingId,
          locationId: t.dest.locationId,
          label: t.dest.label,
          floorId: t.dest.floorId,
          score: t.score
        }))
      };
    }
  }

  const winner = top[0].dest;
  return {
    status: "success",
    match: {
      buildingId: winner.buildingId,
      buildingName: winner.buildingName,
      locationId: winner.locationId,
      floorId: winner.floorId,
      label: winner.label,
      score: top[0].score
    }
  };
}

function matchClarificationChoice(query, candidates) {
  const queryNorm = normalizeText(query);
  if (!queryNorm || !candidates?.length) return null;
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = Math.max(
      tokenOverlapScore(queryNorm, normalizeText(c.label)),
      tokenOverlapScore(queryNorm, normalizeText(String(c.locationId)))
    );
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 40 ? best : null;
}

module.exports = {
  normalizeText,
  tokenOverlapScore,
  buildDestinationCatalog,
  matchIndoorDestination,
  matchClarificationChoice,
  getRegisteredBuildings
};
