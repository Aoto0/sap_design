# Bill of Quantities (BoQ) Implementation

## Overview

This implementation provides a complete Bill of Quantities (BoQ) and analysis workflow for the SAP Design application, integrating Claude Vision API for plan analysis with comprehensive reporting capabilities.

## Architecture

### Backend Components

#### 1. Claude Vision API Integration (`server/lib/claudeVision.js`)
- Processes architectural plan images using Anthropic's Claude API
- Limits to first 2 images for cost control
- Multi-strategy response parsing:
  1. Direct JSON parsing
  2. Sanitized text parsing (removes code fences, comments, smart quotes, etc.)
  3. Fallback error handling
- Validates response structure against required schema
- Enriches responses with metadata and timestamps

#### 2. Post-Processing (`server/lib/postprocess.js`)
- Passes through Claude's `report` and `materials` arrays unchanged
- Computes metrics with fallback assumptions
- Calculates U-values, heat loss, SAP indicators
- Generates wiring allowances based on room types
- Ensures compliance checking against Part L regulations

#### 3. Recalculation Support (`server/lib/recalc.js`)
- Allows client-side recalculation without calling Claude again
- Supports overrides for metrics, U-values, materials, and wiring
- Reconstructs raw extraction from enriched data if needed

#### 4. Server (`server/server.js`)
- Serves static files from repository root
- Handles three input formats for `/api/analyze-plans`:
  1. JSON with extraction data
  2. JSON with base64 images array
  3. Multipart file upload with optional extraction
- `/health` endpoint returns status and API configuration
- `/debug/static-info` endpoint (development only)
- `/api/recalc` endpoint for client-side recalculations

### Frontend Components

#### 1. BoQ Modal (`index.html`)
- Modal overlay with grouped report sections:
  - a. Groundworks
  - b. Structural Works
  - c. External Envelope
  - d. Internal Construction
  - e. Mechanical & Electrical (M&E)
  - f. External Works
  - Provisional Sums
  - Appendices (method of measurement, drawings, specifications, schedules)
- Responsive design with print-friendly CSS
- Close on outside click or close button

#### 2. Materials Reporting
- **Pill Buttons**:
  - "Open Claude BoQ Report": Opens grouped BoQ modal
  - "Open Flat Materials Report": Opens printable flat list in new window
- **Badge**: Indicates presence of grouped BoQ ("Grouped BoQ Loaded" or "No grouped BoQ")
- **Synthetic Fallback**: Auto-categorizes flat materials into BoQ sections when Claude doesn't provide report

#### 3. Global API Exposure
- `window.latestAnalysis`: Globally accessible analysis results
- Enables external integrations and debugging

#### 4. Print Functionality
- Print button in BoQ modal
- Optimized print CSS (hides buttons, adjusts layout)
- Flat materials report opens in new window for easy printing

## Data Schema

### Required Keys in Claude Response
```json
{
  "dimensions": { "floorArea": number, "wallArea": number, ... },
  "rooms": [{ "name": string, "area": number, "type": string }],
  "storeys": number,
  "buildingType": string,
  "windows": [{ "location": string, "width_m": number, "height_m": number }],
  "assumptions": [string],
  "report": {
    "groundworks": [{ "description", "unit", "quantity", "method", "rate?", "total?", "notes?" }],
    "structural_works": [],
    "external_envelope": [],
    "internal_construction": [],
    "me_electrical": [],
    "external_works": [],
    "provisional_sums": [{ "description", "amount", "notes" }],
    "appendices": {
      "method_of_measurement": string,
      "drawings": [string],
      "specifications": [string],
      "schedules": {
        "windows": [{ "id", "type", "size", "quantity" }],
        "doors": [],
        "finishes": []
      }
    }
  },
  "materials": [{ "item", "quantity", "unit", "method", "notes?", "unit_cost?" }],
  "u_values": { "wall", "roof", "floor", "window", "door" }
}
```

### Enriched Output Schema
```json
{
  "metrics": { "floor_area_m2", "wall_area_m2", "roof_area_m2", ... },
  "u_values": { "wall", "roof", "floor", "window", "door" },
  "fabric": { "elements", "fabric_heat_loss_wK", "ventilation_heat_loss_wK" },
  "sap10": { "der", "ter", "der_pass", "dfee", "tfee", "dfee_pass", "epc_band", "confidence" },
  "materials": [...],
  "report": {...},
  "wiring": [{ "room", "sockets", "light_points" }],
  "compliance": { "wall", "roof", "floor", "window", "door" },
  "assumptions": [...],
  "confidence": number,
  "source_raw": {...}
}
```

## Configuration

### Environment Variables

Create `server/.env` file:

```env
# Required
ANTHROPIC_API_KEY=your_api_key_here

# Optional
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
PORT=3000
NODE_ENV=development
```

Get your API key from: https://console.anthropic.com/

## Usage

### Starting the Server

```bash
cd server
npm install
npm start
```

Server runs on port 3000 (or `PORT` environment variable).

### Testing Endpoints

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Analyze Plans (with extraction data):**
```bash
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{"extraction": {...}}'
```

**Analyze Plans (with images):**
```bash
curl -X POST http://localhost:3000/api/analyze-plans \
  -H "Content-Type: application/json" \
  -d '{"images": [{"data": "base64...", "media_type": "image/jpeg"}], "projectType": "new-build-house"}'
```

**Recalculate:**
```bash
curl -X POST http://localhost:3000/api/recalc \
  -H "Content-Type: application/json" \
  -d '{"enriched": {...}, "overrides": {...}}'
```

### Frontend Usage

1. Navigate to `http://localhost:3000/index.html`
2. Login (mock login)
3. Create new project
4. Upload plan images or PDFs
5. Click "Generate BoQ & SAP"
6. View Analysis Report tabs
7. Click "Open Claude BoQ Report" to see grouped BoQ
8. Click "Open Flat Materials Report" for printable list

## Assumptions

Default assumptions used by Claude:
- Door width: 0.838 m (standard UK door)
- Wall build-up: 100mm brick + 150mm cavity + 100mm block
- Ceiling height: 2.4 m (if not specified)
- Window areas: 15% of wall area (if not measured)

## Cost Control

- Vision API calls limited to first 2 images per request
- No automatic re-analysis on every page load
- Manual trigger required for Claude API calls
- Recalculation endpoint uses cached data (no API calls)

## Synthetic Fallback Grouping

When Claude doesn't provide a grouped report, materials are auto-categorized:
- **Groundworks**: concrete, foundation, excavation, slab
- **Structural Works**: brick, block, beam, column, stair
- **External Envelope**: window, door, roof, gutter, fascia, soffit, cladding
- **Internal Construction**: plaster, ceiling, skirting, paint, partition
- **M&E**: electric, plumbing, socket, light, radiator, boiler, heating
- **External Works**: paving, landscape, fence, drain

## Security Considerations

- API keys stored in `.env` file (never committed to git)
- `/debug/static-info` endpoint disabled in production
- No API keys exposed to frontend
- File upload limits: 10MB per file
- JSON payload limits: 50MB

## Browser Compatibility

- Modern browsers with ES6+ support
- PDF.js for client-side PDF to PNG conversion
- No IE11 support

## Limitations

- Maximum 2 images processed per analysis (cost control)
- PDF.js requires CDN access or local hosting
- Claude API key required for vision processing
- No persistent storage (uses localStorage for mock projects)

## Future Enhancements

1. Persistent database for projects
2. Multi-page PDF support (beyond 2 pages)
3. Real user authentication
4. PDF generation for reports (server-side)
5. Cost estimation with regional pricing
6. Integration with supplier APIs
7. Version control for analyses
8. Collaborative project sharing

## Troubleshooting

**"ANTHROPIC_API_KEY environment variable is not set"**
- Create `.env` file in `server/` directory
- Add `ANTHROPIC_API_KEY=your_key_here`
- Restart server

**"No grouped BoQ" badge shows**
- Normal if Claude didn't provide detailed report
- Synthetic fallback will categorize materials
- Check API response for report structure

**"Failed to load resource: net::ERR_BLOCKED_BY_CLIENT"**
- PDF.js CDN blocked by ad blocker
- Disable ad blocker or host PDF.js locally

**Port 3000 already in use**
- Set different port: `PORT=3001 npm start`
- Or kill existing process: `pkill -f "node server.js"`

## License

Copyright © 2025 Parallax Project Management LTD. All Rights Reserved.
