# Backend Smoke Test Guide

This document provides step-by-step instructions for manually testing the SAP Design backend server after deployment.

## Prerequisites

- Node.js 18+ installed
- curl or similar HTTP client
- Optional: jq for JSON formatting

## Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

Expected output:
```
SAP Design Server running on port 3000
Health check: http://localhost:3000/health
API endpoint: http://localhost:3000/api/analyze-plans
Example: http://localhost:3000/api/example
```

## Test Cases

### Test 1: Health Check

Verify the server is running.

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T16:00:00.000Z"
}
```

**Pass Criteria:** HTTP 200, status is "ok"

---

### Test 2: Example Endpoint

Verify example documentation is accessible.

```bash
curl http://localhost:3000/api/example
```

**Expected Response:** JSON object with `exampleInput` containing sample extraction data.

**Pass Criteria:** HTTP 200, response contains `exampleInput` field

---

### Test 3: Basic Plan Analysis

Test the main analysis endpoint with complete data.

```bash
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{
    "extraction": {
      "dimensions": {
        "floorArea": 85,
        "wallArea": 180,
        "roofArea": 90,
        "ceilingHeight": 2.4
      },
      "rooms": [
        { "name": "Kitchen", "area": 15 },
        { "name": "Living Room", "area": 25 },
        { "name": "Bedroom 1", "area": 18 }
      ],
      "storeys": 1,
      "buildingType": "detached"
    }
  }' | jq '.'
```

**Expected Response Structure:**
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
    "confidence": 0.9,
    "assumptions": [ ... ],
    "source_raw": { ... }
  }
}
```

**Pass Criteria:**
- HTTP 200
- `ok` is true
- All 10 top-level fields present in `result`
- `confidence` is between 0.1 and 1.0
- U-values are reasonable numbers (0.1-2.0 range)

---

### Test 4: Verify U-values Meet Part L Targets

Extract and verify compliance from the response of Test 3.

```bash
# Run the same request as Test 3, then check compliance
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{
    "extraction": {
      "dimensions": {"floorArea": 85, "wallArea": 180, "roofArea": 90, "ceilingHeight": 2.4},
      "rooms": [{"name": "Kitchen", "area": 15}],
      "storeys": 1
    }
  }' | jq '.result.compliance'
```

**Expected Output:**
```json
{
  "externalWall": {
    "actual": 0.185,
    "target": 0.26,
    "complies": true
  },
  "roof": {
    "actual": 0.146,
    "target": 0.16,
    "complies": true
  },
  "floor": {
    "actual": 0.178,
    "target": 0.18,
    "complies": true
  },
  "window": {
    "actual": 1.52,
    "target": 1.6,
    "complies": true
  }
}
```

**Pass Criteria:** All `complies` fields are `true`

---

### Test 5: SAP Calculations Present

Verify SAP 10 indicators are calculated.

```bash
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{
    "extraction": {
      "dimensions": {"floorArea": 100, "wallArea": 200, "roofArea": 100, "ceilingHeight": 2.4},
      "storeys": 1
    }
  }' | jq '.result.sap10'
```

**Expected Output:**
```json
{
  "dwellingEmissionRate_kgCO2_m2_year": 25.5,
  "targetEmissionRate_kgCO2_m2_year": 34.0,
  "dwellingFabricEfficiency_W_m2K": 1.2,
  "targetFabricEfficiency_W_m2K": 0.9,
  "epcBand": "A",
  "passes": {
    "emissions": true,
    "fabric": false
  }
}
```

**Pass Criteria:**
- All fields present
- DER and TER are positive numbers
- EPC band is A-G
- `passes` object has `emissions` and `fabric` booleans

---

### Test 6: Materials Estimation

Verify materials quantities are calculated.

```bash
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{
    "extraction": {
      "dimensions": {"floorArea": 85, "wallArea": 180, "roofArea": 90},
      "storeys": 1
    }
  }' | jq '.result.materials'
```

**Expected Output:**
```json
{
  "quantities": {
    "bricks": 10098,
    "blocks": 1653,
    "insulationAreaM2": 279.45,
    "plasterboardSheets": 95,
    "mortarM3": 0.318
  },
  "labour": {
    "bricklaying": {
      "bricklayerHours": 168.3,
      "labourerHours": 168.3,
      "estimatedCostGBP": 7236.9
    }
  }
}
```

**Pass Criteria:**
- All quantity values are positive numbers
- Labour hours and cost are reasonable
- Bricks count is in reasonable range (thousands for typical dwelling)

---

### Test 7: Wiring Allocation

Verify electrical wiring is calculated per room.

```bash
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{
    "extraction": {
      "dimensions": {"floorArea": 85},
      "rooms": [
        {"name": "Kitchen", "area": 15},
        {"name": "Bedroom", "area": 18},
        {"name": "Bathroom", "area": 6}
      ],
      "storeys": 1
    }
  }' | jq '.result.wiring'
```

**Expected Output:**
```json
{
  "byRoom": [
    {
      "room": "Kitchen",
      "areaM2": 15,
      "sockets": 6,
      "lightPoints": 1
    },
    {
      "room": "Bedroom",
      "areaM2": 18,
      "sockets": 4,
      "lightPoints": 1
    },
    {
      "room": "Bathroom",
      "areaM2": 6,
      "sockets": 1,
      "lightPoints": 1
    }
  ],
  "totals": {
    "sockets": 11,
    "lightPoints": 3
  }
}
```

**Pass Criteria:**
- Kitchen has more sockets than other rooms (6+)
- Each room has at least 1 light point
- Totals match sum of individual rooms

---

### Test 8: Confidence Scoring

Test with incomplete data to verify low confidence score.

```bash
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{
    "extraction": {
      "dimensions": {
        "floorArea": 0,
        "wallArea": 0
      },
      "rooms": []
    }
  }' | jq '.result.confidence'
```

**Expected Output:** A number between 0.1 and 0.3 (low confidence)

**Pass Criteria:** Confidence is less than 0.5 for incomplete data

---

### Test 9: Error Handling - Missing Data

Test error handling when extraction data is missing.

```bash
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "ok": false,
  "error": "Missing extraction data. Please provide extraction object in request body."
}
```

**Pass Criteria:** HTTP 400, `ok` is false, error message present

---

### Test 10: Response Size Check

Verify response size is reasonable (< 200KB).

```bash
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{
    "extraction": {
      "dimensions": {"floorArea": 100, "wallArea": 200, "roofArea": 100, "ceilingHeight": 2.4},
      "rooms": [
        {"name": "Kitchen", "area": 15},
        {"name": "Living Room", "area": 25},
        {"name": "Bedroom 1", "area": 18},
        {"name": "Bedroom 2", "area": 12},
        {"name": "Bathroom", "area": 6},
        {"name": "Hallway", "area": 9}
      ],
      "storeys": 2,
      "buildingType": "detached"
    }
  }' -o /tmp/response.json && wc -c /tmp/response.json
```

**Expected Output:** Size should be < 10KB (typically 2-5KB)

**Pass Criteria:** Response size is well under 200KB limit

---

## Summary Checklist

After running all tests, verify:

- [ ] Server starts without errors
- [ ] Health check responds
- [ ] API accepts valid extraction data
- [ ] All 10 required fields present in response
- [ ] U-values meet Part L 2021 targets
- [ ] SAP calculations included
- [ ] Materials quantities reasonable
- [ ] Wiring allocation works
- [ ] Confidence scoring responsive to data quality
- [ ] Error handling works
- [ ] Response size reasonable

## Troubleshooting

**Server won't start:**
- Check Node.js version (need 18+)
- Verify all dependencies installed (`npm install`)
- Check port 3000 is not already in use

**Tests fail:**
- Verify server is running on port 3000
- Check request syntax (JSON must be valid)
- Review server logs for error messages

**Unexpected results:**
- Check input data format matches expected structure
- Verify dimensions are positive numbers
- Review assumptions list in response for any issues

## Notes for Production

- This is Phase 0 implementation with simplified SAP calculations
- Full SAP 10 worksheet required for official compliance
- Material quantities use standard waste factors
- Labour rates based on 2024 UK averages
- Future phases will add Claude API integration for automatic extraction
