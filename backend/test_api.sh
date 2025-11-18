#!/bin/bash

# Example curl commands to test the SAP Design API

echo "=== Testing Health Endpoint ==="
curl -s http://localhost:5000/api/health | python3 -m json.tool
echo ""
echo ""

echo "=== Testing Recalc Endpoint with Metrics Override ==="
curl -s -X POST http://localhost:5000/api/recalc \
  -H "Content-Type: application/json" \
  -d '{
    "source_raw": {
      "metrics": {
        "floor_area_m2": 80,
        "wall_area_m2": 120
      }
    },
    "overrides": {
      "metrics": {
        "floor_area_m2": 100
      }
    }
  }' | python3 -m json.tool
echo ""
echo ""

echo "=== Testing Recalc Endpoint with Full Example ==="
curl -s -X POST http://localhost:5000/api/recalc \
  -H "Content-Type: application/json" \
  -d '{
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
  }' | python3 -m json.tool
