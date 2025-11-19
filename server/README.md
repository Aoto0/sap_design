# SAP Design Backend Server

Backend API server for the SAP Design application providing architectural plan analysis and lightweight recalculation endpoints, returning enriched building data including thermal performance, materials estimation, and SAP calculations.

## Features

- **U-value calculations** using UK building material layers (BS EN ISO 6946)
- **Part L compliance checking** against 2021 Building Regulations
- **SAP 10 indicators** (simplified heuristics for DER, TER, DFEE, TFEE)
- **Materials quantity estimation** with waste factors
- **Labour cost estimation** (bricklaying example)
- **Electrical wiring allocation** based on room types
- **Confidence scoring** for data quality assessment
- **Fabric and ventilation heat loss** calculations

## Installation

```bash
cd server
npm install
```

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```
```bash
npm start
```

The server runs on port 3000 by default (or the value of the `PORT` environment variable).

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T16:00:00.000Z"
}
```

### GET /api/example
Returns example input format for the analyze-plans endpoint.

### POST /api/analyze-plans
Analyzes architectural plans and returns enriched building data.

**Request Body:**
```json
{
  "extraction": {
    "dimensions": {
      "floorArea": 85,
      "wallArea": 180,
      "roofArea": 90,
      "ceilingHeight": 2.4
    },
    "rooms": [
      { "name": "Kitchen", "area": 15 },
      { "name": "Living Room", "area": 25 }
    ],
    "storeys": 1,
    "buildingType": "detached",
    "windows": [
      { "location": "Kitchen", "area": 2.5 }
    ]
  }
}
```

**Response:**
Returns enriched analysis results for the provided plans and extraction.

### POST /api/recalc
Re-runs post-processing using prior enriched data plus user overrides, without re-uploading images or re-calling the vision model.

**Purpose**: Allow the client to send the latest enriched object (from /api/analyze-plans) and a set of overrides to get an updated enriched response quickly.

**Request Body**:
```json
{
  "enriched": {
    "metrics": {
      "floor_area_m2": 100,
      "wall_area_m2": 200,
      "roof_area_m2": 100,
      "window_area_m2": 20,
      "ceiling_height_m": 2.4,
      "storeys": 2
    },
    "u_values": {
      "wall": 0.3,
      "roof": 0.2,
      "floor": 0.25,
      "window": 1.6,
      "door": 1.8
    },
    "materials": [
      {
        "item": "Bricks",
        "quantity": 5000,
        "unit": "no"
      }
    ],
    "wiring": [
      {
        "room": "Living Room",
        "sockets": 6,
        "light_points": 3
      }
    ]
  },
  "overrides": {
    "metrics": {
      "floor_area_m2": 120,
      "storeys": 2
    },
    "u_values": {
      "wall": 0.28,
      "roof": 0.18
    },
    "materials": [
      {
        "index": 0,
        "item": "Bricks",
        "quantity": 6000,
        "unit": "no"
      }
    ],
    "wiring": [
      {
        "room": "Kitchen",
        "sockets": 8,
        "light_points": 4
      }
    ]
  }
}
```

**Response**:
Returns `{ "ok": true, "result": { ...updated enriched object... } }` using the same schema as `/api/analyze-plans`.
```json
{
  "ok": true,
  "result": {
**Response**:
```json
{
  "ok": true,
  "result": {
    "metrics": {
      "floor_area_m2": 120,
      "wall_area_m2": 200,
      "roof_area_m2": 100,
      "window_area_m2": 20,
      "ceiling_height_m": 2.4,
      "storeys": 2
    },
    "u_values": {
      "wall": 0.28,
      "roof": 0.18,
      "floor": 0.25,
      "window": 1.6,
      "door": 1.8
    },
    "materials": [
      {
        "item": "Bricks",
        "quantity": 6000,
        "unit": "no"
      }
    ],
    "wiring": [
      {
        "room": "Living Room",
        "sockets": 6,
        "light_points": 3
      },
      {
        "room": "Kitchen",
        "sockets": 8,
        "light_points": 4
      }
    ],
    "calculations": {
      "total_heat_loss_w_per_k": 136,
      "total_volume_m3": 576,
      "annual_heating_demand_kwh": 7651.76,
      "estimated_material_cost_gbp": 450000,
      "estimated_wiring_cost_gbp": 1530,
      "estimated_labour_cost_gbp": 12000,
      "total_estimated_cost_gbp": 463530,
      "profit_margin_gbp": 69529.5,
      "grand_total_gbp": 533059.5,
      "energy_rating": "C",
      "energy_score": 72
    },
    "recalculated_at": "2025-11-18T19:45:00.000Z"
  }
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "Missing required field: enriched"
}
```

### GET /health

Health check endpoint to verify the server is running.

**Response**:
```json
{
  "status": "ok"
}
```

## Features

- Lightweight recalculation: Only processes data, no vision model calls
- Flexible overrides: Override any combination of metrics, U-values, materials, or wiring
- Automatic recalculation: Derived values like heat loss, energy ratings, and costs are automatically updated
- Deep merging: Overrides are intelligently merged with existing data

## Post-Processing Logic

The server recalculates the following derived values:

1. Heat Loss Calculations: Based on surface areas and U-values
2. Volume Calculations: Based on floor area, ceiling height, and storeys
3. Heating Demand: Annual heating demand in kWh
4. Cost Estimates: Materials, wiring, and labour costs
5. Energy Performance: SAP-like energy rating (A-G) and score

## Override Behavior

- Metrics: Individual metric values can be overridden
- U-values: Individual U-values can be updated
- Materials:
  - If `index` is provided, updates the material at that index
  - If no `index`, adds as a new material
- Wiring:
  - If `room` matches existing entry, updates that entry
  - If `room` is new, adds a new wiring entry

## Development

The server uses:
- Express.js for the web framework
- CORS for cross-origin requests
- JSON body parsing with 50MB limit for large enriched objects

## Environment Variables

- `PORT`: Server port (default: 3000)

## Response Structure

- metrics: Normalized dwelling dimensions (floor area, wall area, roof area, volume, etc.)
- u_values: Calculated U-values for walls, roof, floor, windows
- fabric: Fabric heat loss elements and total heat loss coefficient (W/K)
- sap10: Simplified SAP 10 indicators
  - Dwelling Emission Rate (DER) in kgCO2/m²/year
  - Target Emission Rate (TER)
  - Dwelling Fabric Energy Efficiency (DFEE)
  - Target Fabric Energy Efficiency (TFEE)
  - EPC band (A-G)
  - Pass/fail flags
- materials: Quantity estimates
  - Bricks, blocks, insulation area, plasterboard sheets, mortar volume
  - Labour hours and cost for bricklaying
- wiring: Electrical allocation per room
  - Socket outlets
  - Light points
  - Totals
- compliance: Part L 2021 compliance checks for each element
- confidence: Data quality score (0.1 to 1.0)
- assumptions: List of assumptions made during analysis
- source_raw: Original extraction data for reference

## Testing

```bash
# Start the server
npm start

# In another terminal, test the endpoint
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{
    "extraction": {
      "dimensions": {"floorArea": 85, "wallArea": 180, "roofArea": 90, "ceilingHeight": 2.4},
      "rooms": [{"name": "Kitchen", "area": 15}],
      "storeys": 1
    }
  }'
```

## Architecture

```
server/
├── server.js                 # Express server with API endpoints
├── lib/
│   ├── postprocess.js       # Main orchestrator for enrichment
│   ├── uvalues.js           # U-value calculator
│   ├── materials.js         # Materials quantity estimator
│   ├── wiring.js            # Electrical wiring allocator
│   ├── sap.js               # SAP 10 calculations
│   ├── confidence.js        # Confidence scoring
│   └── constants/
│       ├── materials.js     # Material layers and properties
│       ├── labourRates.js   # Labour rates and productivity
│       ├── regThresholds.js # Part L targets and thermal constants
│       └── wiring.js        # Electrical installation rules
└── package.json
```

## Notes

- U-values are calculated using typical UK construction assemblies
- SAP calculations are simplified heuristics; full SAP worksheet required for official compliance
- Material quantities include standard waste factors (8-15%)
- Labour rates based on 2024 UK averages
- All U-values meet Part L 2021 targets with default material layers
- Response size typically ~2-3KB, well under 200KB limit

## Future Enhancements (Planned)

- Integration with Claude API for automatic plan extraction from images
- More sophisticated SAP calculation (full worksheet)
- Cost estimation for all trades
- Support for different construction types (timber frame, etc.)
- Database integration for storing analyses
- TypeScript migration
