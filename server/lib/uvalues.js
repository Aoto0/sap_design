// U-value calculator using layer method (BS EN ISO 6946)
import { SURFACE_RESISTANCES } from './constants/regThresholds.js';

/**
 * Calculate U-value from material layers
 * @param {Array} layers - Array of {name, conductivity (W/mK), thickness (mm)}
 * @param {string} surfaceType - 'wall', 'roof', 'floor' determines surface resistances
 * @returns {number} U-value in W/m²K
 */
export function calcUValue(layers, surfaceType = 'wall') {
  // Sum thermal resistances: R = thickness / conductivity
  // thickness in mm, conductivity in W/mK, so convert to meters
  let totalResistance = 0;

  for (const layer of layers) {
    const thicknessM = layer.thickness / 1000;  // mm to m
    const resistance = thicknessM / layer.conductivity;
    totalResistance += resistance;
  }

  // Add surface resistances (internal and external)
  totalResistance += SURFACE_RESISTANCES.internal;
  totalResistance += SURFACE_RESISTANCES.external;

  // U-value = 1 / total resistance
  const uValue = 1.0 / totalResistance;
  
  return parseFloat(uValue.toFixed(3));
}

/**
 * Calculate U-value for a window (simplified)
 * Windows are usually given as whole-unit U-values from manufacturers
 * @param {number} glassU - Glazing U-value (W/m²K)
 * @param {number} frameU - Frame U-value (W/m²K)
 * @param {number} frameAreaFraction - Fraction of window that is frame (0-1)
 * @returns {number} Effective window U-value
 */
export function calcWindowUValue(glassU = 1.4, frameU = 1.8, frameAreaFraction = 0.3) {
  // Area-weighted average
  const effectiveU = (glassU * (1 - frameAreaFraction)) + (frameU * frameAreaFraction);
  return parseFloat(effectiveU.toFixed(2));
}
