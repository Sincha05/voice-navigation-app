/**
 * Template for The National Institute of Engineering, Mysore campus maps.
 * NOT populated with real floor plans — add verified nodes, edges, and markers before use.
 */
const NIE_MYSORE_TEMPLATE = {
  id: "nie-mysore",
  name: "The National Institute of Engineering, Mysore (Template)",
  description:
    "Configuration template only. Replace empty arrays with verified floor-plan data and QR markers. Do not treat as accurate campus navigation.",
  isTemplate: true,
  populated: false,
  floors: [],
  nodes: [],
  edges: [],
  markers: {}
};

module.exports = { NIE_MYSORE_TEMPLATE };
