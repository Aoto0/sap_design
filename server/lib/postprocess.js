// Post-processing orchestrator: derives enriched data from raw model extraction
import { calcUValue, calcWindowUValue } from './uvalues.js';
import {
  estimateBrickCount,
  estimateBlockCount,
  estimateInsulationArea,
  plasterboardSheets,
  estimateMortarVolume
} from './materials.js';
import { generateWiringList } from './wiring.js';
import {
  fabricHeatLoss,
  ventilationHeatLoss,
  dwellingEmissionRate,
  targetEmissionRate,
  fabricEfficiency,
  targetFabricEfficiency,
  epcBandFromDer
} from './sap.js';
import { computeConfidence, generateAssumptions } from './confidence.js';
import { MATERIAL_LAYERS } from './constants/materials.js';
import { PART_L_TARGET_U } from './constants/regThresholds.js';
import { LABOUR_RATES_GBP, PRODUCTIVITY } from './constants/labourRates.js';

/**
 * Main post-processing function: enriches raw extraction with derived metrics
 * @param {Object} raw - Raw model extraction from Claude API
 * @returns {Object} Enriched analysis result (schema-aligned for the frontend)
 */
export function deriveFromExtraction(raw) {
  // 1) Normalize basic metrics (snake_case) with robust fallbacks
  const metrics = normalizeMetrics(raw);

  // 2) Compute U-values for building elements (aligned keys)
  const uValues = computeUValues();

  // 3) Build fabric elements and calculate heat losses
  const fabricElements = buildFabricElements(metrics, uValues); // [{ area, u }]
  const fabricLossWK = fabricHeatLoss(fabricElements);
  const ventLossWK = ventilationHeatLoss(metrics.volume_m3);

  // 4) SAP 10 indicators (provisional)
  const confidence = computeConfidence(raw);
  const sap10 = calculateSAP10(fabricLossWK, ventLossWK, metrics, confidence);

  // 5) Materials (convert internal quantities to an items array)
  const materials = buildMaterials(metrics);

  // 6) Wiring (list per room)
  const wiring = buildWiring(raw?.rooms || []);

  // 7) Part L compliance (boolean flags)
  const compliance = {
    wall: uValues.wall <= (PART_L_TARGET_U.externalWall ?? PART_L_TARGET_U.wall),
    roof: uValues.roof <= PART_L_TARGET_U.roof,
    floor: uValues.floor <= PART_L_TARGET_U.floor,
    window: uValues.window <= PART_L_TARGET_U.window,
    door: uValues.door <= (PART_L_TARGET_U.door ?? 1.4),
  };

  // 8) Assumptions
  const assumptions = generateAssumptions(raw);

  // 9) Assemble enriched result (frontend-aligned schema)
  return {
    metrics,              // { floor_area_m2, wall_area_m2, roof_area_m2, window_area_m2, ceiling_height_m, volume_m3, storeys }
    u_values: uValues,    // { wall, roof, floor, window, door }
    fabric: {
      elements: fabricElements, // [{ area, u }]
      fabric_heat_loss_wK: round2(fabricLossWK),
      ventilation_heat_loss_wK: round2(ventLossWK),
    },
    sap10,                // { der, ter, der_pass, dfee, tfee, dfee_pass, epc_band, confidence }
    materials,            // array of { item, quantity, unit, method, labour_hours?, labour_cost_gbp? }
    wiring,               // array of { room, sockets, light_points, area_m2? }
    compliance,           // { wall, roof, floor, window, door } booleans
    assumptions,
    confidence,           // top-level for convenience (also in sap10.confidence)
    source_raw: scrubSource(raw), // ensure no images or large blobs are echoed
  };
}

/**
 * Normalize and calculate basic dwelling metrics (snake_case)
 */
function normalizeMetrics(raw) {
  const m = raw?.metrics || {};
  const d = raw?.dimensions || {};

  // Prefer snake_case metrics; fall back to camelCase dimensions if needed
  const floorArea = num(m.floor_area_m2 ?? d.floorArea ?? 0);
  const wallArea = num(m.wall_area_m2 ?? d.wallArea ?? 0);
  const roofArea = num(m.roof_area_m2 ?? d.roofArea ?? 0);
  const ceilingHeight = num(m.ceiling_height_m ?? d.ceilingHeight ?? 2.4);
  const storeys = num(raw?.storeys ?? 1);

  // Window area derivation:
  // 1) Sum per-window areas if present, else
  // 2) use m.window_area_m2, else
  // 3) fall back to 15% of wall area when wall area known
  let windowArea = 0;
  if (Array.isArray(raw?.windows) && raw.windows.length) {
    for (const w of raw.windows) {
      const wW = num(w?.width_m ?? 0);
      const wH = num(w?.height_m ?? 0);
      windowArea += wW * wH;
    }
  } else {
    windowArea = num(m.window_area_m2 ?? d.windowArea ?? 0);
  }
  if (!windowArea && wallArea) {
    windowArea = wallArea * 0.15;
  }

  const volume = num(m.volume_m3 ?? d.volume ?? (floorArea * ceilingHeight * storeys));

  return {
    floor_area_m2: round2(floorArea),
    wall_area_m2: round2(wallArea),
    roof_area_m2: round2(roofArea),
    window_area_m2: round2(windowArea),
    ceiling_height_m: round2(ceilingHeight),
    volume_m3: round2(volume),
    storeys: storeys || 1,
  };
}

/**
 * Compute U-values for standard building elements (aligned keys)
 */
function computeUValues() {
  return {
    wall: calcUValue(MATERIAL_LAYERS.externalWallDefault, 'wall'),
    roof: calcUValue(MATERIAL_LAYERS.roofPitchedWarm, 'roof'),
    floor: calcUValue(MATERIAL_LAYERS.floorSlab, 'floor'),
    window: calcWindowUValue(), // Double glazed default
    door: 1.4,                  // Typical external door default
  };
}

/**
 * Build fabric elements array for heat loss calculation (expects [{ area, u }])
 */
function buildFabricElements(metrics, uValues) {
  const elements = [];

  // Net wall area excludes windows
  const netWallArea = Math.max(0, (metrics.wall_area_m2 || 0) - (metrics.window_area_m2 || 0));
  if (netWallArea > 0) elements.push({ area: round2(netWallArea), u: uValues.wall });

  if (metrics.roof_area_m2 > 0) elements.push({ area: metrics.roof_area_m2, u: uValues.roof });
  if (metrics.floor_area_m2 > 0) elements.push({ area: metrics.floor_area_m2, u: uValues.floor });
  if (metrics.window_area_m2 > 0) elements.push({ area: metrics.window_area_m2, u: uValues.window });

  return elements;
}

/**
 * Calculate SAP 10 indicators (provisional fields expected by UI)
 */
function calculateSAP10(fabricLossWK, ventLossWK, metrics, confidence) {
  // Heuristic placeholders; refine with proper SAP 10 in later phases
  const der = dwellingEmissionRate(fabricLossWK, ventLossWK, metrics.floor_area_m2);
  const ter = targetEmissionRate(metrics.floor_area_m2);
  const dfee = fabricEfficiency(fabricLossWK, metrics.floor_area_m2 + metrics.roof_area_m2 + metrics.wall_area_m2);
  const tfee = targetFabricEfficiency(metrics.floor_area_m2);

  return {
    der: round2(der),
    ter: round2(ter),
    der_pass: der <= ter,
    dfee: round2(dfee),
    tfee: round2(tfee),
    dfee_pass: dfee <= tfee,
    epc_band: epcBandFromDer(der),
    confidence: round2(confidence),
  };
}

/**
 * Convert internal quantity estimates to a flat materials array for UI tables
 */
function buildMaterials(metrics) {
  const netWallArea = Math.max(0, (metrics.wall_area_m2 || 0) - (metrics.window_area_m2 || 0));

  const bricks = estimateBrickCount(netWallArea);
  const blocks = estimateBlockCount(netWallArea);
  const insulationArea = estimateInsulationArea(netWallArea + (metrics.roof_area_m2 || 0));
  const plasterboard = plasterboardSheets(netWallArea + (metrics.roof_area_m2 || 0));
  const mortar = estimateMortarVolume(bricks);

  // Sample labour calc for bricks (uses PRODUCTIVITY + LABOUR_RATES_GBP present in this PR)
  const brickLayingHours = bricks / (PRODUCTIVITY?.bricksPerHour || 500); // fallback if constant missing
  const labourerHours = brickLayingHours;
  const brickLabourCost = (brickLayingHours * (LABOUR_RATES_GBP?.bricklayer || 35)) +
                          (labourerHours * (LABOUR_RATES_GBP?.labourer || 20));

  const items = [
    { item: 'Facing Bricks (outer leaf)', quantity: bricks, unit: 'pcs', method: 'netWallArea / brickFaceArea', labour_hours: round1(brickLayingHours), labour_cost_gbp: round2(brickLabourCost) },
    { item: 'Blocks (inner leaf)', quantity: blocks, unit: 'pcs', method: 'netWallArea / blockFaceArea' },
    { item: 'Insulation (wall+roof)', quantity: round2(insulationArea), unit: 'm2', method: 'netWallArea + roofArea' },
    { item: 'Plasterboard Sheets', quantity: plasterboard, unit: 'pcs', method: 'netWallArea + roofArea' },
    { item: 'Mortar', quantity: round2(mortar), unit: 'm3', method: 'brick count estimate' },
  ];

  return items;
}

/**
 * Generate wiring list per room with expected keys
 */
function buildWiring(rooms) {
  const roomsWithArea = (Array.isArray(rooms) ? rooms : []).map(r => ({
    name: r?.name || r?.type || 'Unknown',
    area_m2: num(r?.area_m2 ?? r?.area ?? 0),
  }));

  // Expect generateWiringList to return an array with sockets/lightPoints per room name
  const list = generateWiringList(
    roomsWithArea.map(r => ({ name: r.name, area: r.area_m2 }))
  );

  // Normalize keys for UI
  return list.map((r, i) => ({
    room: r?.name || roomsWithArea[i]?.name || `Room ${i + 1}`,
    area_m2: roomsWithArea[i]?.area_m2 ?? null,
    sockets: r?.sockets ?? 2,
    light_points: r?.lightPoints ?? 1,
  }));
}

/**
 * Avoid echoing large blobs (e.g., images) in source_raw
 */
function scrubSource(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const { images, ...rest } = raw;
  return rest;
}

/* ---------------- Utilities ---------------- */
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function round2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }
function round1(v) { return Math.round((v + Number.EPSILON) * 10) / 10; }