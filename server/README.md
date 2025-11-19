# SAP Design Backend Server

Backend API server for architectural plan analysis with enriched building data including thermal performance, materials estimation, and SAP calculations.

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

```bash
npm start
```

The server will start on port 3000 (or PORT environment variable).

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
```json
{
  "ok": true,
  "result": {
    "metrics": { ... },
    "u_values": { ... },
    "fabric": { ... },
    "sap10": { ... },
    "materials": { ... },
    "wiring": { ... },
    "compliance": { ... },
    "confidence": 0.90,
    "assumptions": [ ... ],
    "source_raw": { ... }
  }
}
```

## Response Structure

- **metrics**: Normalized dwelling dimensions (floor area, wall area, roof area, volume, etc.)
- **u_values**: Calculated U-values for walls, roof, floor, windows
- **fabric**: Fabric heat loss elements and total heat loss coefficient (W/K)
- **sap10**: Simplified SAP 10 indicators
  - Dwelling Emission Rate (DER) in kgCO2/m²/year
  - Target Emission Rate (TER)
  - Dwelling Fabric Energy Efficiency (DFEE)
  - Target Fabric Energy Efficiency (TFEE)
  - EPC band (A-G)
  - Pass/fail flags
- **materials**: Quantity estimates
  - Bricks, blocks, insulation area, plasterboard sheets, mortar volume
  - Labour hours and cost for bricklaying
- **wiring**: Electrical allocation per room
  - Socket outlets
  - Light points
  - Totals
- **compliance**: Part L 2021 compliance checks for each element
- **confidence**: Data quality score (0.1 to 1.0)
- **assumptions**: List of assumptions made during analysis
- **source_raw**: Original extraction data for reference

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
