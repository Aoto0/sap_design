// Confidence scoring for extracted data quality
// Computes a confidence score (0.1 to 1.0) based on data completeness and consistency

/**
 * Compute confidence score for raw extraction
 * @param {Object} rawExtraction - The raw model extraction object
 * @returns {number} Confidence score (0.1 to 1.0), rounded to 2 decimals
 */
export function computeConfidence(rawExtraction) {
  let score = 1.0; // Start at full confidence
  const penalties = [];

  // Check for presence of key fields
  if (!rawExtraction.dimensions) {
    penalties.push({ reason: 'Missing dimensions', penalty: 0.3 });
  } else {
    // Check dimension completeness
    const dims = rawExtraction.dimensions;
    if (!dims.floorArea || dims.floorArea <= 0) {
      penalties.push({ reason: 'Missing or invalid floor area', penalty: 0.2 });
    }
    if (!dims.wallArea || dims.wallArea <= 0) {
      penalties.push({ reason: 'Missing or invalid wall area', penalty: 0.15 });
    }
    if (!dims.roofArea || dims.roofArea <= 0) {
      penalties.push({ reason: 'Missing or invalid roof area', penalty: 0.15 });
    }
    if (!dims.ceilingHeight || dims.ceilingHeight <= 0) {
      penalties.push({ reason: 'Missing or invalid ceiling height', penalty: 0.1 });
    }
  }

  // Check for rooms data
  if (!rawExtraction.rooms || rawExtraction.rooms.length === 0) {
    penalties.push({ reason: 'No rooms identified', penalty: 0.2 });
  } else {
    // Check room data quality
    const roomsWithArea = rawExtraction.rooms.filter(r => r.area && r.area > 0);
    if (roomsWithArea.length < rawExtraction.rooms.length) {
      const missingRatio = 1 - (roomsWithArea.length / rawExtraction.rooms.length);
      penalties.push({ 
        reason: `${Math.round(missingRatio * 100)}% of rooms missing area`, 
        penalty: missingRatio * 0.15 
      });
    }
  }

  // Check for window data (if windows array exists)
  if (rawExtraction.windows && rawExtraction.windows.length > 0) {
    const windowsWithArea = rawExtraction.windows.filter(w => w.area && w.area > 0);
    if (windowsWithArea.length < rawExtraction.windows.length * 0.5) {
      penalties.push({ reason: 'Many windows missing area data', penalty: 0.1 });
    }
  } else {
    // No window data at all - assume placeholder
    penalties.push({ reason: 'No window data extracted', penalty: 0.1 });
  }

  // Check for storey information
  if (!rawExtraction.storeys || rawExtraction.storeys <= 0) {
    penalties.push({ reason: 'Missing storey count', penalty: 0.05 });
  }

  // Check for building type
  if (!rawExtraction.buildingType) {
    penalties.push({ reason: 'Missing building type', penalty: 0.05 });
  }

  // Apply penalties
  for (const p of penalties) {
    score -= p.penalty;
  }

  // Ensure score stays within bounds [0.1, 1.0]
  score = Math.max(0.1, Math.min(1.0, score));

  return parseFloat(score.toFixed(2));
}

/**
 * Generate list of assumptions made during analysis
 * @param {Object} rawExtraction - The raw model extraction object
 * @returns {Array<string>} List of assumption statements
 */
export function generateAssumptions(rawExtraction) {
  const assumptions = [];

  // Always present assumptions
  assumptions.push('U-values calculated using typical UK construction layers');
  assumptions.push('Window area assumed as 15% of external wall area if not specified');
  assumptions.push('Default infiltration rate of 0.5 ACH for new build');
  assumptions.push('Heating system efficiency assumed at 90% (gas boiler)');
  assumptions.push('Internal temperature 20°C, external design temperature -1°C');

  // Conditional assumptions
  if (!rawExtraction.storeys || rawExtraction.storeys <= 0) {
    assumptions.push('Storey count estimated from plan analysis (placeholder: 1 storey)');
  }

  if (!rawExtraction.windows || rawExtraction.windows.length === 0) {
    assumptions.push('Window locations and sizes estimated from typical dwelling ratios');
  }

  if (!rawExtraction.dimensions?.volume) {
    assumptions.push('Dwelling volume calculated from floor area × ceiling height');
  }

  assumptions.push('SAP calculations are simplified heuristics; full SAP worksheet required for compliance');
  assumptions.push('Material quantities include standard waste factors');
  assumptions.push('Labour rates based on 2024 UK averages');

  return assumptions;
}
