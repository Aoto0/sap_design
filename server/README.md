# SAP Design Server

Backend server for the SAP Design application providing API endpoints for architectural plan analysis and recalculation.

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

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

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

- **Lightweight recalculation**: Only processes data, no vision model calls
- **Flexible overrides**: Override any combination of metrics, U-values, materials, or wiring
- **Automatic recalculation**: Derived values like heat loss, energy ratings, and costs are automatically updated
- **Deep merging**: Overrides are intelligently merged with existing data

## Post-Processing Logic

The server recalculates the following derived values:

1. **Heat Loss Calculations**: Based on surface areas and U-values
2. **Volume Calculations**: Based on floor area, ceiling height, and storeys
3. **Heating Demand**: Annual heating demand in kWh
4. **Cost Estimates**: Materials, wiring, and labour costs
5. **Energy Performance**: SAP-like energy rating (A-G) and score

## Override Behavior

- **Metrics**: Individual metric values can be overridden
- **U-values**: Individual U-values can be updated
- **Materials**: 
  - If `index` is provided, updates the material at that index
  - If no `index`, adds as a new material
- **Wiring**: 
  - If `room` matches existing entry, updates that entry
  - If `room` is new, adds a new wiring entry

## Development

The server uses:
- Express.js for the web framework
- CORS for cross-origin requests
- JSON body parsing with 50MB limit for large enriched objects

## Environment Variables

- `PORT`: Server port (default: 3000)
