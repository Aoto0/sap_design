// Materials quantity estimation
import { UNIT_FACE_AREAS, WASTE_FACTORS, UNIT_DIMENSIONS } from './constants/materials.js';

/**
 * Estimate number of bricks required for a wall area
 * @param {number} areaM2 - Wall area in m²
 * @returns {number} Number of bricks (including waste)
 */
export function estimateBrickCount(areaM2) {
  const netBricks = areaM2 * UNIT_FACE_AREAS.brickPerM2;
  const bricksWithWaste = netBricks * (1 + WASTE_FACTORS.bricks);
  return Math.ceil(bricksWithWaste);
}

/**
 * Estimate number of concrete blocks required
 * @param {number} areaM2 - Wall area in m²
 * @returns {number} Number of blocks (including waste)
 */
export function estimateBlockCount(areaM2) {
  const netBlocks = areaM2 * UNIT_FACE_AREAS.blockPerM2;
  const blocksWithWaste = netBlocks * (1 + WASTE_FACTORS.blocks);
  return Math.ceil(blocksWithWaste);
}

/**
 * Estimate insulation area required
 * @param {number} areaM2 - Element area in m²
 * @returns {number} Insulation area in m² (including waste)
 */
export function estimateInsulationArea(areaM2) {
  const areaWithWaste = areaM2 * (1 + WASTE_FACTORS.insulation);
  return parseFloat(areaWithWaste.toFixed(2));
}

/**
 * Estimate plasterboard sheets required
 * @param {number} areaM2 - Wall/ceiling area in m²
 * @returns {number} Number of standard plasterboard sheets (1200x2400mm)
 */
export function plasterboardSheets(areaM2) {
  const sheetAreaM2 = (UNIT_DIMENSIONS.plasterboardSheet.width / 1000) * 
                       (UNIT_DIMENSIONS.plasterboardSheet.height / 1000);
  const netSheets = areaM2 / sheetAreaM2;
  const sheetsWithWaste = netSheets * (1 + WASTE_FACTORS.plasterboard);
  return Math.ceil(sheetsWithWaste);
}

/**
 * Estimate mortar volume (m³) for brickwork
 * @param {number} brickCount - Number of bricks
 * @returns {number} Mortar volume in m³
 */
export function estimateMortarVolume(brickCount) {
  // Rough heuristic: ~0.03 m³ mortar per 1000 bricks (10mm joints)
  const mortarM3 = (brickCount / 1000) * 0.03;
  const mortarWithWaste = mortarM3 * (1 + WASTE_FACTORS.mortar);
  return parseFloat(mortarWithWaste.toFixed(3));
}
