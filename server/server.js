// SAP Design Backend Server
// Provides API endpoint for architectural plan analysis with enriched building data

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { deriveFromExtraction } from './lib/postprocess.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads (images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/analyze-plans
 * Analyzes architectural plans and returns enriched building data
 * 
 * Expected request body:
 * {
 *   "extraction": {
 *     "dimensions": { "floorArea": 100, "wallArea": 200, ... },
 *     "rooms": [{ "name": "Kitchen", "area": 15 }, ...],
 *     "storeys": 2,
 *     "buildingType": "detached",
 *     ...
 *   }
 * }
 * 
 * Or with image upload (multipart/form-data):
 * - file: plan image
 * - extraction: JSON string of extraction data
 * 
 * Returns enriched analysis with:
 * - metrics (normalized dimensions)
 * - u_values (thermal performance)
 * - fabric (heat loss calculation)
 * - sap10 (SAP indicators)
 * - materials (quantity estimates)
 * - wiring (electrical allocation)
 * - compliance (Part L checks)
 * - confidence (data quality score)
 * - assumptions (list of assumptions made)
 * - source_raw (original extraction data)
 */
app.post('/api/analyze-plans', upload.single('file'), async (req, res) => {
  try {
    let rawExtraction;

    // Parse extraction data from request
    if (req.body.extraction) {
      // JSON payload or form data with extraction field
      if (typeof req.body.extraction === 'string') {
        rawExtraction = JSON.parse(req.body.extraction);
      } else {
        rawExtraction = req.body.extraction;
      }
    } else if (req.file) {
      // File uploaded but no extraction data provided
      // In real implementation, this would call Claude API or similar
      // For now, return error as we need extraction data
      return res.status(400).json({
        ok: false,
        error: 'Plan image uploaded but extraction data is required. In production, this would trigger model extraction.'
      });
    } else {
      return res.status(400).json({
        ok: false,
        error: 'Missing extraction data. Please provide extraction object in request body.'
      });
    }

    // Validate extraction has minimum required structure
    if (!rawExtraction || typeof rawExtraction !== 'object') {
      return res.status(400).json({
        ok: false,
        error: 'Invalid extraction data format. Must be a valid JSON object.'
      });
    }

    // Note: In a production system, here we would call Claude API or similar
    // to extract data from uploaded plan images. For this phase, we accept
    // pre-extracted data for testing and demonstration.

    // Process the extraction through our enrichment pipeline
    const enrichedResult = deriveFromExtraction(rawExtraction);

    // Return successful response
    res.json({
      ok: true,
      result: enrichedResult
    });

  } catch (error) {
    console.error('Error processing plan analysis:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Internal server error during plan analysis'
    });
  }
});

/**
 * Example endpoint to demonstrate expected input/output
 * GET /api/example
 */
app.get('/api/example', (req, res) => {
  const exampleInput = {
    dimensions: {
      floorArea: 85,
      wallArea: 180,
      roofArea: 90,
      ceilingHeight: 2.4
    },
    rooms: [
      { name: 'Kitchen', area: 15 },
      { name: 'Living Room', area: 25 },
      { name: 'Bedroom 1', area: 18 },
      { name: 'Bedroom 2', area: 12 },
      { name: 'Bathroom', area: 6 },
      { name: 'Hallway', area: 9 }
    ],
    storeys: 1,
    buildingType: 'detached',
    windows: [
      { location: 'Kitchen', area: 2.5 },
      { location: 'Living Room', area: 4.0 }
    ]
  };

  res.json({
    description: 'Example input for /api/analyze-plans endpoint',
    exampleInput,
    usage: 'POST to /api/analyze-plans with { "extraction": <data> }'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    ok: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`SAP Design Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoint: http://localhost:${PORT}/api/analyze-plans`);
  console.log(`Example: http://localhost:${PORT}/api/example`);
});

export default app;
