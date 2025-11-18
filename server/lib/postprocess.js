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
 * @param {Object} rawExtraction - Raw model extraction from Claude API
 * @returns {Object} Enriched analysis result
 */
export function deriveFromExtraction(rawExtraction) {
  // 1. Normalize basic metrics
  const metrics = normalizeMetrics(rawExtraction);

  // 2. Compute U-values for building elements
  const uValues = computeUValues();

  // 3. Build fabric elements list and calculate heat loss
  const fabricElements = buildFabricElements(metrics, uValues);
  const fabricLossWK = fabricHeatLoss(fabricElements);

  // 4. Calculate ventilation heat loss
  const ventLossWK = ventilationHeatLoss(metrics.volume);

  // 5. Calculate SAP 10 indicators
  const sap10 = calculateSAP10(fabricLossWK, ventLossWK, metrics.floorArea);

  // 6. Estimate materials quantities
  const materials = estimateMaterials(metrics);

  // 7. Generate wiring allocation
  const wiring = generateWiring(rawExtraction.rooms || []);

  // 8. Check compliance against Part L
  const compliance = checkCompliance(uValues);

  // 9. Compute confidence and assumptions
  const confidence = computeConfidence(rawExtraction);
  const assumptions = generateAssumptions(rawExtraction);

  // 10. Assemble enriched result
  return {
    metrics,
    u_values: uValues,
    fabric: {
      elements: fabricElements,
      totalHeatLoss_WK: fabricLossWK
    },
    sap10,
    materials,
    wiring,
    compliance,
    confidence,
    assumptions,
    source_raw: rawExtraction
  };
}

/**
 * Normalize and calculate basic dwelling metrics
 */
function normalizeMetrics(raw) {
  const dims = raw.dimensions || {};
  
  // Extract or default values
  const floorArea = dims.floorArea || 0;
  const wallArea = dims.wallArea || 0;
  const roofArea = dims.roofArea || 0;
  const ceilingHeight = dims.ceilingHeight || 2.4; // Default 2.4m
  const storeys = raw.storeys || 1; // Default to single storey if not specified

  // Calculate volume if not provided
  const volume = dims.volume || (floorArea * ceilingHeight * storeys);

  // Estimate window area if not provided (typical: 15% of wall area)
  let windowArea = dims.windowArea || 0;
  if (windowArea === 0 && wallArea > 0) {
    windowArea = wallArea * 0.15;
  }

  return {
    floorArea: parseFloat(floorArea.toFixed(2)),
    wallArea: parseFloat(wallArea.toFixed(2)),
    roofArea: parseFloat(roofArea.toFixed(2)),
    windowArea: parseFloat(windowArea.toFixed(2)),
    ceilingHeight: parseFloat(ceilingHeight.toFixed(2)),
    volume: parseFloat(volume.toFixed(2)),
    storeys
  };
}

/**
 * Compute U-values for standard building elements
 */
function computeUValues() {
  return {
    externalWall: calcUValue(MATERIAL_LAYERS.externalWallDefault, 'wall'),
    roof: calcUValue(MATERIAL_LAYERS.roofPitchedWarm, 'roof'),
    floor: calcUValue(MATERIAL_LAYERS.floorSlab, 'floor'),
    window: calcWindowUValue() // Double glazed default
  };
}

/**
 * Build fabric elements array for heat loss calculation
 */
function buildFabricElements(metrics, uValues) {
  const elements = [];

  if (metrics.wallArea > 0) {
    // Net wall area excludes windows
    const netWallArea = metrics.wallArea - metrics.windowArea;
    elements.push({
      type: 'External Wall',
      area: parseFloat(netWallArea.toFixed(2)),
      uValue: uValues.externalWall
    });
  }

  if (metrics.roofArea > 0) {
    elements.push({
      type: 'Roof',
      area: metrics.roofArea,
      uValue: uValues.roof
    });
  }

  if (metrics.floorArea > 0) {
    elements.push({
      type: 'Floor',
      area: metrics.floorArea,
      uValue: uValues.floor
    });
  }

  if (metrics.windowArea > 0) {
    elements.push({
      type: 'Windows',
      area: metrics.windowArea,
      uValue: uValues.window
    });
  }

  return elements;
}

/**
 * Calculate SAP 10 indicators
 */
function calculateSAP10(fabricLossWK, ventLossWK, floorArea) {
  const der = dwellingEmissionRate(fabricLossWK, ventLossWK, floorArea);
  const ter = targetEmissionRate(floorArea);
  const dfee = fabricEfficiency(fabricLossWK, floorArea);
  const tfee = targetFabricEfficiency(floorArea);
  const epcBand = epcBandFromDer(der);

  return {
    dwellingEmissionRate_kgCO2_m2_year: der,
    targetEmissionRate_kgCO2_m2_year: ter,
    dwellingFabricEfficiency_W_m2K: dfee,
    targetFabricEfficiency_W_m2K: tfee,
    epcBand,
    passes: {
      emissions: der <= ter,
      fabric: dfee <= tfee
    }
  };
}

/**
 * Estimate materials quantities
 */
function estimateMaterials(metrics) {
  const netWallArea = metrics.wallArea - metrics.windowArea;
  
  const bricks = estimateBrickCount(netWallArea);
  const blocks = estimateBlockCount(netWallArea);
  const insulationArea = estimateInsulationArea(netWallArea + metrics.roofArea);
  const plasterboard = plasterboardSheets(netWallArea + metrics.roofArea);
  const mortar = estimateMortarVolume(bricks);

  // Calculate sample labour for bricklaying
  const brickLayingHours = bricks / PRODUCTIVITY.bricksPerHour;
  const labourerHours = brickLayingHours; // 1:1 gang
  const brickLabourCost = (brickLayingHours * LABOUR_RATES_GBP.bricklayer) + 
                          (labourerHours * LABOUR_RATES_GBP.labourer);

  return {
    quantities: {
      bricks,
      blocks,
      insulationAreaM2: insulationArea,
      plasterboardSheets: plasterboard,
      mortarM3: mortar
    },
    labour: {
      bricklaying: {
        bricklayerHours: parseFloat(brickLayingHours.toFixed(1)),
        labourerHours: parseFloat(labourerHours.toFixed(1)),
        estimatedCostGBP: parseFloat(brickLabourCost.toFixed(2))
      }
    }
  };
}

/**
 * Generate wiring allocation for rooms
 */
function generateWiring(rooms) {
  // Ensure rooms have required structure
  const roomsWithArea = rooms.map(r => ({
    name: r.name || r.type || 'Unknown',
    area: r.area || 0
  }));

  const wiringList = generateWiringList(roomsWithArea);

  // Calculate totals
  const totalSockets = wiringList.reduce((sum, room) => sum + room.sockets, 0);
  const totalLightPoints = wiringList.reduce((sum, room) => sum + room.lightPoints, 0);

  return {
    byRoom: wiringList,
    totals: {
      sockets: totalSockets,
      lightPoints: totalLightPoints
    }
  };
}

/**
 * Check compliance with Part L U-value targets
 */
function checkCompliance(uValues) {
  return {
    externalWall: {
      actual: uValues.externalWall,
      target: PART_L_TARGET_U.externalWall,
      complies: uValues.externalWall <= PART_L_TARGET_U.externalWall
    },
    roof: {
      actual: uValues.roof,
      target: PART_L_TARGET_U.roof,
      complies: uValues.roof <= PART_L_TARGET_U.roof
    },
    floor: {
      actual: uValues.floor,
      target: PART_L_TARGET_U.floor,
      complies: uValues.floor <= PART_L_TARGET_U.floor
    },
    window: {
      actual: uValues.window,
      target: PART_L_TARGET_U.window,
      complies: uValues.window <= PART_L_TARGET_U.window
    }
  };
}
