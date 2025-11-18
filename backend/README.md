# SAP Design Backend API

Flask-based REST API for SAP Design application.

## Setup

### Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Run the Server

```bash
python server.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### POST /api/recalc

Recalculate enriched data with user overrides without re-uploading images.

**Request:**
```json
{
  "source_raw": {
    "metrics": {
      "floor_area_m2": 80,
      "wall_area_m2": 120,
      "roof_area_m2": 85,
      "window_area_m2": 15,
      "ceiling_height_m": 2.4,
      "storeys": 2
    },
    "u_values": {
      "wall": 0.18,
      "roof": 0.16,
      "floor": 0.16,
      "window": 1.6,
      "door": 1.8
    },
    "materials": [
      { "item": "Bricks", "quantity": 5000, "unit": "units" }
    ],
    "wiring": [
      { "room": "Kitchen", "sockets": 4, "light_points": 6 }
    ]
  },
  "overrides": {
    "metrics": {
      "floor_area_m2": 100
    },
    "u_values": {
      "wall": 0.15
    },
    "materials": [
      { "item": "Bricks", "quantity": 6000, "unit": "units" },
      { "item": "Concrete", "quantity": 50, "unit": "m3" }
    ],
    "wiring": [
      { "room": "Kitchen", "sockets": 6, "light_points": 8 },
      { "room": "Living Room", "sockets": 4, "light_points": 4 }
    ]
  }
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "metrics": {
      "floor_area_m2": 100,
      "wall_area_m2": 120,
      "roof_area_m2": 85,
      "window_area_m2": 15,
      "ceiling_height_m": 2.4,
      "storeys": 2
    },
    "u_values": {
      "wall": 0.15,
      "roof": 0.16,
      "floor": 0.16,
      "window": 1.6,
      "door": 1.8
    },
    "materials": [
      { "item": "Bricks", "quantity": 6000, "unit": "units" },
      { "item": "Concrete", "quantity": 50, "unit": "m3" }
    ],
    "wiring": [
      { "room": "Kitchen", "sockets": 6, "light_points": 8 },
      { "room": "Living Room", "sockets": 4, "light_points": 4 }
    ],
    "total_area_m2": 320,
    "average_u_value": 0.7739999999999999,
    "total_material_quantity": 6050,
    "total_sockets": 10,
    "total_light_points": 12,
    "processed_at": "2025-11-18T19:36:24.611Z"
  }
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "sap-design-api"
}
```

### POST /api/analyze-plans

Stub endpoint for reference (not implemented).

## Features

- **No Vision Model Calls**: The `/api/recalc` endpoint only processes existing data with overrides
- **Fast Recalculation**: Reuses prior extraction data without re-uploading images
- **Override Support**: Supports overriding metrics, U-values, materials, and wiring configurations
- **Post-Processing**: Automatically calculates derived metrics like total areas, average U-values, etc.
- **CORS Enabled**: Frontend can make requests from different origins

## Development

To run in debug mode:

```bash
python server.py
```

The server runs on port 5000 by default.
