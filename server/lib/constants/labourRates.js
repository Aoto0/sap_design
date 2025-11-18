// Labour rates and productivity for UK construction (indicative 2024 values)
// Rates in GBP per hour; productivity in units per hour

export const LABOUR_RATES_GBP = {
  bricklayer: 25.0,
  labourer: 18.0,
  electrician: 28.0,
  plumber: 27.0,
  carpenter: 26.0,
  plasterer: 24.0,
  roofer: 26.0
};

// Productivity rates (approximate UK standards)
export const PRODUCTIVITY = {
  bricksPerHour: 60,              // Bricks laid per bricklayer-hour
  blocksPerHour: 15,              // Blocks laid per hour
  plasterboardM2PerHour: 8,       // m² of plasterboard per hour
  insulationM2PerHour: 12,        // m² of insulation per hour
  roofTilesM2PerHour: 6,          // m² of roof tiling per hour
  socketInstallMinutes: 45,       // Minutes per socket outlet
  lightPointInstallMinutes: 30    // Minutes per light point
};

// Gang compositions (typical trade mix for productivity)
export const GANG_COMPOSITION = {
  bricklaying: {
    bricklayer: 1,
    labourer: 1                   // 1:1 ratio typical
  },
  blockwork: {
    bricklayer: 1,
    labourer: 0.5
  }
};
