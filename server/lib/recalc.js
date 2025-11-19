/**
 * recalc.js
 * Re-runs post-processing using prior enriched data plus user overrides
 * Does not call vision model - only reuses existing post-processing logic
 */

import { deriveFromExtraction } from './postprocess.js';

/**
 * Recalculate enriched data with user overrides
 * @param {Object} enriched - Previously enriched object (latestAnalysis on the client)
 * @param {Object} overrides - User overrides for metrics, u_values, materials, wiring
 * @returns {Object} Updated enriched object with recalculated values
 */
export default async function recalc(enriched, overrides = {}) {
  // Start with the original source_raw or reconstruct it from enriched data
  let rawExtraction = enriched.source_raw || reconstructRawFromEnriched(enriched);

  // Apply overrides to raw extraction
  if (overrides.metrics) {
    if (!rawExtraction.dimensions) rawExtraction.dimensions = {};
    if (overrides.metrics.floor_area_m2 !== undefined) {
      rawExtraction.dimensions.floorArea = overrides.metrics.floor_area_m2;
    }
    if (overrides.metrics.wall_area_m2 !== undefined) {
      rawExtraction.dimensions.wallArea = overrides.metrics.wall_area_m2;
    }
    if (overrides.metrics.roof_area_m2 !== undefined) {
      rawExtraction.dimensions.roofArea = overrides.metrics.roof_area_m2;
    }
    if (overrides.metrics.window_area_m2 !== undefined) {
      rawExtraction.dimensions.windowArea = overrides.metrics.window_area_m2;
    }
    if (overrides.metrics.ceiling_height_m !== undefined) {
      rawExtraction.dimensions.ceilingHeight = overrides.metrics.ceiling_height_m;
    }
    if (overrides.metrics.storeys !== undefined) {
      rawExtraction.storeys = overrides.metrics.storeys;
    }
  }

  // Apply u_values overrides (will be picked up in next processing)
  if (overrides.u_values) {
    if (!rawExtraction.u_values) rawExtraction.u_values = {};
    Object.assign(rawExtraction.u_values, overrides.u_values);
  }

  // Apply materials overrides
  if (overrides.materials && Array.isArray(overrides.materials)) {
    if (!rawExtraction.materials) rawExtraction.materials = [];
    overrides.materials.forEach((override) => {
      if (override.index !== undefined && rawExtraction.materials[override.index]) {
        // Update existing material
        Object.assign(rawExtraction.materials[override.index], override);
      } else if (override.item) {
        // Add new material
        rawExtraction.materials.push(override);
      }
    });
  }

  // Apply wiring overrides
  if (overrides.wiring && Array.isArray(overrides.wiring)) {
    if (!rawExtraction.rooms) rawExtraction.rooms = [];
    // Update room-based wiring (simplified)
    overrides.wiring.forEach((override) => {
      const room = rawExtraction.rooms.find((r) => r.name === override.room);
      if (room) {
        room.sockets = override.sockets;
        room.light_points = override.light_points;
      }
    });
  }

  // Re-run post-processing
  const recalculated = deriveFromExtraction(rawExtraction);

  return recalculated;
}

/**
 * Reconstruct raw extraction from enriched data
 * (in case source_raw is not available)
 */
function reconstructRawFromEnriched(enriched) {
  const raw = {
    dimensions: {
      floorArea: enriched.metrics?.floor_area_m2 || 0,
      wallArea: enriched.metrics?.wall_area_m2 || 0,
      roofArea: enriched.metrics?.roof_area_m2 || 0,
      windowArea: enriched.metrics?.window_area_m2 || 0,
      ceilingHeight: enriched.metrics?.ceiling_height_m || 2.4,
    },
    rooms: [],
    storeys: enriched.metrics?.storeys || 1,
    buildingType: 'unknown',
    windows: [],
    assumptions: enriched.assumptions || [],
    materials: enriched.materials || [],
    u_values: enriched.u_values || {},
    report: enriched.report || {
      groundworks: [],
      structural_works: [],
      external_envelope: [],
      internal_construction: [],
      me_electrical: [],
      external_works: [],
      provisional_sums: [],
      appendices: {
        method_of_measurement: '',
        drawings: [],
        specifications: [],
        schedules: {
          windows: [],
          doors: [],
          finishes: [],
        },
      },
    },
  };

  // Reconstruct rooms from wiring if available
  if (enriched.wiring && Array.isArray(enriched.wiring)) {
    raw.rooms = enriched.wiring.map((w) => ({
      name: w.room || 'Unknown',
      area: w.area_m2 || 0,
      sockets: w.sockets,
      light_points: w.light_points,
    }));
  }

  return raw;
}
