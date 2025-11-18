// Wiring and electrical installation rules for UK dwellings (BS 7671 guidance)

// Socket outlet rules per room type
export const SOCKET_RULES = {
  kitchen: { minSockets: 6, socketsPerM2: 0.3 },      // High demand
  livingRoom: { minSockets: 4, socketsPerM2: 0.15 },
  bedroom: { minSockets: 4, socketsPerM2: 0.15 },
  diningRoom: { minSockets: 2, socketsPerM2: 0.1 },
  bathroom: { minSockets: 1, socketsPerM2: 0 },       // Shavers only, special rules
  hallway: { minSockets: 1, socketsPerM2: 0.05 },
  study: { minSockets: 4, socketsPerM2: 0.2 },
  utility: { minSockets: 3, socketsPerM2: 0.2 },
  default: { minSockets: 2, socketsPerM2: 0.1 }       // Fallback for unrecognized rooms
};

// Light point rules
export const LIGHT_POINT_RULE = {
  minPerRoom: 1,
  perM2: 0.05,                // One light point per ~20m² typical
  maxPerRoom: 8               // Cap for very large rooms
};

// Cable and conduit sizing rules (simplified placeholders)
export const CABLE_SPECS = {
  lightingCircuit: '1.5mm² T&E',
  socketRingMain: '2.5mm² T&E',
  cookerCircuit: '6.0mm² T&E',
  showerCircuit: '10.0mm² T&E'
};

// Consumer unit / distribution board requirements
export const CONSUMER_UNIT = {
  minCircuits: 6,
  rcboProtection: true,       // Modern installs require RCBO per circuit
  surgeProtection: true        // Required in new builds (18th edition)
};
