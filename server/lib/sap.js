// SAP 10 calculation approximations (simplified heuristics)
// NOTE: This is a simplified placeholder. Full SAP requires detailed inputs and worksheet.
import { 
  DEFAULT_DELTA_T, 
  AIR_SPECIFIC_HEAT, 
  AIR_DENSITY,
  DEFAULT_INFILTRATION_ACH,
  DEFAULT_VENTILATION_ACH,
  EMISSION_FACTORS,
  DEFAULT_FUEL_TYPE,
  TER_BASE_FACTOR,
  EPC_BANDS
} from './constants/regThresholds.js';

/**
 * Calculate fabric heat loss (W/K)
 * @param {Array} fabricElements - Array of {type, area, uValue}
 * @returns {number} Fabric heat loss coefficient (W/K)
 */
export function fabricHeatLoss(fabricElements) {
  let totalLoss = 0;
  for (const elem of fabricElements) {
    totalLoss += elem.area * elem.uValue;
  }
  return parseFloat(totalLoss.toFixed(2));
}

/**
 * Calculate ventilation heat loss (W/K)
 * @param {number} volumeM3 - Dwelling volume in m³
 * @param {number} achInfiltration - Infiltration air changes per hour
 * @param {number} achVentilation - Mechanical ventilation air changes per hour
 * @returns {number} Ventilation heat loss coefficient (W/K)
 */
export function ventilationHeatLoss(volumeM3, achInfiltration = DEFAULT_INFILTRATION_ACH, achVentilation = DEFAULT_VENTILATION_ACH) {
  const totalACH = achInfiltration + achVentilation;
  // Heat loss = volume * air density * specific heat * ACH / 3600
  const heatLoss = volumeM3 * AIR_DENSITY * AIR_SPECIFIC_HEAT * totalACH / 3600;
  return parseFloat(heatLoss.toFixed(2));
}

/**
 * Simplified Dwelling Emission Rate (DER) heuristic (kgCO2/m²/year)
 * NOTE: Real SAP uses detailed heating system efficiency, solar gains, etc.
 * This is a placeholder based on heat loss and assumed heating hours.
 * @param {number} fabricLossWK - Fabric heat loss (W/K)
 * @param {number} ventLossWK - Ventilation heat loss (W/K)
 * @param {number} floorAreaM2 - Total floor area (m²)
 * @param {string} fuelType - Fuel type for heating ('gas', 'electric', etc.)
 * @returns {number} Estimated DER (kgCO2/m²/year)
 */
export function dwellingEmissionRate(fabricLossWK, ventLossWK, floorAreaM2, fuelType = DEFAULT_FUEL_TYPE) {
  // Simplified: Annual heat demand = (fabric + vent loss) * delta T * heating hours / efficiency
  const totalLossWK = fabricLossWK + ventLossWK;
  const heatingHoursPerYear = 2500; // Typical UK heating season
  const annualHeatDemandKWh = (totalLossWK * DEFAULT_DELTA_T * heatingHoursPerYear) / 1000;
  
  // Assume typical boiler efficiency 0.9 for gas, 1.0 for electric
  const efficiency = (fuelType === 'electric') ? 1.0 : 0.9;
  const primaryEnergyKWh = annualHeatDemandKWh / efficiency;
  
  const emissionFactor = EMISSION_FACTORS[fuelType] || EMISSION_FACTORS[DEFAULT_FUEL_TYPE];
  const annualEmissionsKgCO2 = primaryEnergyKWh * emissionFactor;
  
  const der = annualEmissionsKgCO2 / floorAreaM2;
  return parseFloat(der.toFixed(2));
}

/**
 * Calculate Target Emission Rate (TER) - notional building benchmark
 * @param {number} floorAreaM2 - Total floor area (m²)
 * @returns {number} TER (kgCO2/m²/year)
 */
export function targetEmissionRate(floorAreaM2) {
  // Simplified heuristic: TER is typically 15-20% better than a baseline
  // Real calculation uses notional building specification
  // For placeholder, assume ~40 kgCO2/m²/year for average dwelling, scaled
  const baselineEmissions = 40;
  const ter = baselineEmissions * TER_BASE_FACTOR;
  return parseFloat(ter.toFixed(2));
}

/**
 * Calculate Dwelling Fabric Energy Efficiency (DFEE)
 * Simplified as fabric heat loss per m²
 * @param {number} fabricLossWK - Fabric heat loss (W/K)
 * @param {number} floorAreaM2 - Total floor area (m²)
 * @returns {number} DFEE (W/m²K) - lower is better
 */
export function fabricEfficiency(fabricLossWK, floorAreaM2) {
  const dfee = fabricLossWK / floorAreaM2;
  return parseFloat(dfee.toFixed(2));
}

/**
 * Calculate Target Fabric Energy Efficiency (TFEE) - notional building
 * @param {number} floorAreaM2 - Total floor area (m²)
 * @returns {number} TFEE (W/m²K)
 */
export function targetFabricEfficiency(floorAreaM2) {
  // Typical notional building has TFEE around 0.8-1.0 W/m²K
  // Simplified placeholder
  return 0.9;
}

/**
 * Determine EPC band from DER
 * @param {number} der - Dwelling Emission Rate (kgCO2/m²/year)
 * @returns {string} EPC band (A-G)
 */
export function epcBandFromDer(der) {
  for (const band of EPC_BANDS) {
    if (der >= band.minDer && der < band.maxDer) {
      return band.band;
    }
  }
  return 'G'; // Worst case
}
