// Material layer definitions for U-value calculations
// Typical UK construction assemblies with thermal conductivity (W/mK) and thickness (mm)

export const MATERIAL_LAYERS = {
  // External wall: Brick/cavity/insulation/block/plaster
  externalWallDefault: [
    { name: 'Brick outer leaf', conductivity: 0.77, thickness: 102 },
    { name: 'Air cavity', conductivity: 0.18, thickness: 50 }, // Ventilated cavity resistance
    { name: 'PIR insulation', conductivity: 0.022, thickness: 100 },
    { name: 'Concrete block inner leaf', conductivity: 0.51, thickness: 100 },
    { name: 'Lightweight plaster', conductivity: 0.16, thickness: 13 }
  ],

  // Pitched warm roof: Tiles/felt/insulation between rafters/plasterboard
  roofPitchedWarm: [
    { name: 'Clay tiles', conductivity: 1.0, thickness: 20 },
    { name: 'Roofing felt', conductivity: 0.19, thickness: 5 },
    { name: 'Mineral wool (between rafters)', conductivity: 0.038, thickness: 250 }, // Increased to meet 0.16 target
    { name: 'Plasterboard', conductivity: 0.25, thickness: 12.5 }
  ],

  // Ground floor: Screed/insulation/concrete slab
  floorSlab: [
    { name: 'Screed', conductivity: 0.41, thickness: 65 },
    { name: 'EPS insulation', conductivity: 0.035, thickness: 180 }, // Increased to meet 0.18 target
    { name: 'Concrete slab', conductivity: 1.13, thickness: 150 }
  ],

  // Double glazed window (U-value typically provided as whole unit)
  // Note: For windows, usually a single effective U-value is used rather than layers
  windowDouble: [
    { name: 'Double glazing unit', conductivity: 0.8, thickness: 24 } // Effective; actual U ~2.0 W/m²K
  ]
};

// Waste factors for material estimation (percentage over net area)
export const WASTE_FACTORS = {
  bricks: 0.10,           // 10% waste
  blocks: 0.08,           // 8% waste
  insulation: 0.15,       // 15% waste for cutting
  plasterboard: 0.12,     // 12% waste
  roofTiles: 0.10,        // 10% waste
  mortar: 0.05            // 5% waste
};

// Typical unit dimensions for quantity calculations
export const UNIT_DIMENSIONS = {
  brick: {
    length: 215,          // mm
    height: 65,           // mm
    depth: 102.5          // mm
  },
  block: {
    length: 440,          // mm
    height: 215,          // mm
    depth: 100            // mm
  },
  plasterboardSheet: {
    width: 1200,          // mm
    height: 2400          // mm
  }
};

// Face areas in m² per unit (accounting for mortar joints)
export const UNIT_FACE_AREAS = {
  brickPerM2: 60,         // Standard bricks per m² (including 10mm joints)
  blockPerM2: 10          // Blocks per m² (including 10mm joints)
};
