// UK Building Regulations Part L and thermal calculation constants

// Part L 2021 maximum U-values (W/m²K) for new dwellings
export const PART_L_TARGET_U = {
  externalWall: 0.26,
  roof: 0.16,
  floor: 0.18,
  window: 1.6,
  door: 1.4
};

// Surface resistances (m²K/W) for U-value calculation (BS EN ISO 6946)
export const SURFACE_RESISTANCES = {
  internal: 0.13,         // Internal surface resistance
  external: 0.04,         // External surface resistance
  unheatedSpace: 0.13     // Resistance to unheated space
};

// Default infiltration and ventilation values
export const DEFAULT_INFILTRATION_ACH = 0.5;  // Air changes per hour (typical for new builds)
export const DEFAULT_VENTILATION_ACH = 0.3;   // Additional mechanical ventilation

// Indoor/outdoor design temperature difference for heat loss (K)
export const DEFAULT_DELTA_T = 21;  // Typical: 20°C inside, -1°C outside (UK winter design)

// Specific heat capacity of air (J/kgK)
export const AIR_SPECIFIC_HEAT = 1005;

// Air density (kg/m³) at 20°C
export const AIR_DENSITY = 1.2;

// EPC band thresholds (SAP points or DER ranges - simplified for demonstration)
// Note: Actual EPC uses SAP rating (1-100+), but here we use DER in kgCO2/m²/year for illustration
export const EPC_BANDS = [
  { band: 'A', minDer: 0, maxDer: 25 },
  { band: 'B', minDer: 25, maxDer: 50 },
  { band: 'C', minDer: 50, maxDer: 75 },
  { band: 'D', minDer: 75, maxDer: 100 },
  { band: 'E', minDer: 100, maxDer: 130 },
  { band: 'F', minDer: 130, maxDer: 160 },
  { band: 'G', minDer: 160, maxDer: 999 }
];

// Emission factors (kgCO2/kWh) for common fuel types (UK 2024 indicative)
export const EMISSION_FACTORS = {
  gas: 0.210,             // Natural gas
  electric: 0.136,        // Grid electricity (declining with renewables)
  oil: 0.298,             // Heating oil
  lpg: 0.241,             // LPG
  biomass: 0.039          // Wood pellets
};

// Default fuel type for heating (used if not specified)
export const DEFAULT_FUEL_TYPE = 'gas';

// Target Emission Rate adjustment factor for dwelling type (simplified)
// TER = (TFA adjustment) * base factor; here we use a simple heuristic
export const TER_BASE_FACTOR = 0.85;  // Notional building beats actual by ~15% in emissions
