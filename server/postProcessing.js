/**
 * Post-processing logic for enriched architectural data
 * This module handles recalculations without calling the vision model
 */

/**
 * Apply overrides and recalculate derived values
 * @param {Object} enriched - Previously enriched object from /api/analyze-plans
 * @param {Object} overrides - User overrides for metrics, u_values, materials, and wiring
 * @returns {Object} Updated enriched object with recalculated values
 */
function processEnrichedData(enriched, overrides) {
  // Create a deep copy of enriched data to avoid mutation
  const result = JSON.parse(JSON.stringify(enriched));

  // Apply metric overrides
  if (overrides.metrics) {
    if (!result.metrics) result.metrics = {};
    
    if (overrides.metrics.floor_area_m2 !== undefined) {
      result.metrics.floor_area_m2 = overrides.metrics.floor_area_m2;
    }
    if (overrides.metrics.wall_area_m2 !== undefined) {
      result.metrics.wall_area_m2 = overrides.metrics.wall_area_m2;
    }
    if (overrides.metrics.roof_area_m2 !== undefined) {
      result.metrics.roof_area_m2 = overrides.metrics.roof_area_m2;
    }
    if (overrides.metrics.window_area_m2 !== undefined) {
      result.metrics.window_area_m2 = overrides.metrics.window_area_m2;
    }
    if (overrides.metrics.ceiling_height_m !== undefined) {
      result.metrics.ceiling_height_m = overrides.metrics.ceiling_height_m;
    }
    if (overrides.metrics.storeys !== undefined) {
      result.metrics.storeys = overrides.metrics.storeys;
    }
  }

  // Apply U-value overrides
  if (overrides.u_values) {
    if (!result.u_values) result.u_values = {};
    
    if (overrides.u_values.wall !== undefined) {
      result.u_values.wall = overrides.u_values.wall;
    }
    if (overrides.u_values.roof !== undefined) {
      result.u_values.roof = overrides.u_values.roof;
    }
    if (overrides.u_values.floor !== undefined) {
      result.u_values.floor = overrides.u_values.floor;
    }
    if (overrides.u_values.window !== undefined) {
      result.u_values.window = overrides.u_values.window;
    }
    if (overrides.u_values.door !== undefined) {
      result.u_values.door = overrides.u_values.door;
    }
  }

  // Apply materials overrides
  if (overrides.materials) {
    if (!result.materials) result.materials = [];
    
    // Replace or merge materials based on index
    overrides.materials.forEach(override => {
      if (override.index !== undefined && override.index >= 0) {
        // Update existing material at index
        if (result.materials[override.index]) {
          result.materials[override.index] = {
            ...result.materials[override.index],
            ...override
          };
        } else {
          // Add new material if index doesn't exist
          result.materials[override.index] = override;
        }
      } else {
        // Add as new material
        result.materials.push(override);
      }
    });
  }

  // Apply wiring overrides
  if (overrides.wiring) {
    if (!result.wiring) result.wiring = [];
    
    overrides.wiring.forEach(override => {
      // Find existing wiring for the room
      const existingIndex = result.wiring.findIndex(w => w.room === override.room);
      
      if (existingIndex >= 0) {
        // Update existing wiring
        result.wiring[existingIndex] = {
          ...result.wiring[existingIndex],
          ...override
        };
      } else {
        // Add new wiring entry
        result.wiring.push(override);
      }
    });
  }

  // Recalculate derived values based on updated metrics
  result.calculations = recalculateDerivedValues(result);

  // Add timestamp to track when recalculation was performed
  result.recalculated_at = new Date().toISOString();

  return result;
}

/**
 * Recalculate derived values such as energy performance, costs, etc.
 * @param {Object} data - Enriched data with updated metrics
 * @returns {Object} Calculated values
 */
function recalculateDerivedValues(data) {
  const calculations = {};

  // Extract metrics with defaults
  const metrics = data.metrics || {};
  const floorArea = metrics.floor_area_m2 || 0;
  const wallArea = metrics.wall_area_m2 || 0;
  const roofArea = metrics.roof_area_m2 || 0;
  const windowArea = metrics.window_area_m2 || 0;
  const ceilingHeight = metrics.ceiling_height_m || 2.4;
  const storeys = metrics.storeys || 1;

  // Extract U-values with defaults (W/m²K)
  const uValues = data.u_values || {};
  const uWall = uValues.wall || 0.3;
  const uRoof = uValues.roof || 0.2;
  const uFloor = uValues.floor || 0.25;
  const uWindow = uValues.window || 1.6;
  const uDoor = uValues.door || 1.8;

  // Calculate heat loss (simplified calculation)
  const wallHeatLoss = wallArea * uWall;
  const roofHeatLoss = roofArea * uRoof;
  const floorHeatLoss = floorArea * uFloor;
  const windowHeatLoss = windowArea * uWindow;
  
  calculations.total_heat_loss_w_per_k = wallHeatLoss + roofHeatLoss + floorHeatLoss + windowHeatLoss;

  // Calculate volume
  calculations.total_volume_m3 = floorArea * ceilingHeight * storeys;

  // Estimate heating demand (kWh/year) - simplified
  // Assuming degree days = 2000, efficiency = 0.85
  const degreeDays = 2000;
  const heatingEfficiency = 0.85;
  calculations.annual_heating_demand_kwh = 
    (calculations.total_heat_loss_w_per_k * degreeDays * 24) / (1000 * heatingEfficiency);

  // Calculate material costs (simplified estimates)
  const materials = data.materials || [];
  let totalMaterialCost = 0;
  
  materials.forEach(material => {
    if (material.quantity && material.unit) {
      // Basic cost estimation per unit (these are placeholder values)
      const unitCosts = {
        'm2': 50,  // £50 per m²
        'm3': 100, // £100 per m³
        'm': 25,   // £25 per m
        'no': 75   // £75 per item
      };
      
      const unitCost = unitCosts[material.unit] || 50;
      const cost = material.quantity * unitCost;
      totalMaterialCost += cost;
    }
  });
  
  calculations.estimated_material_cost_gbp = totalMaterialCost;

  // Calculate wiring costs
  const wiring = data.wiring || [];
  let totalWiringCost = 0;
  
  wiring.forEach(room => {
    const socketCost = (room.sockets || 0) * 75;  // £75 per socket
    const lightCost = (room.light_points || 0) * 120;  // £120 per light point
    totalWiringCost += socketCost + lightCost;
  });
  
  calculations.estimated_wiring_cost_gbp = totalWiringCost;

  // Calculate labour estimates
  // Based on floor area: approximately £100/m² for construction labour
  calculations.estimated_labour_cost_gbp = floorArea * 100;

  // Total estimated cost
  calculations.total_estimated_cost_gbp = 
    calculations.estimated_material_cost_gbp +
    calculations.estimated_wiring_cost_gbp +
    calculations.estimated_labour_cost_gbp;

  // Add profit margin (15%)
  calculations.profit_margin_gbp = calculations.total_estimated_cost_gbp * 0.15;
  calculations.grand_total_gbp = calculations.total_estimated_cost_gbp + calculations.profit_margin_gbp;

  // Energy performance rating (simplified SAP-like calculation)
  const energyPerM2 = calculations.annual_heating_demand_kwh / floorArea;
  
  if (energyPerM2 < 25) {
    calculations.energy_rating = 'A';
    calculations.energy_score = 92 + Math.floor(Math.random() * 8);
  } else if (energyPerM2 < 50) {
    calculations.energy_rating = 'B';
    calculations.energy_score = 81 + Math.floor(Math.random() * 10);
  } else if (energyPerM2 < 75) {
    calculations.energy_rating = 'C';
    calculations.energy_score = 69 + Math.floor(Math.random() * 11);
  } else if (energyPerM2 < 100) {
    calculations.energy_rating = 'D';
    calculations.energy_score = 55 + Math.floor(Math.random() * 13);
  } else if (energyPerM2 < 125) {
    calculations.energy_rating = 'E';
    calculations.energy_score = 39 + Math.floor(Math.random() * 15);
  } else if (energyPerM2 < 150) {
    calculations.energy_rating = 'F';
    calculations.energy_score = 21 + Math.floor(Math.random() * 17);
  } else {
    calculations.energy_rating = 'G';
    calculations.energy_score = 1 + Math.floor(Math.random() * 19);
  }

  return calculations;
}

module.exports = {
  processEnrichedData,
  recalculateDerivedValues
};
