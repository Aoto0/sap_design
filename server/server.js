// SAP Design Backend Server
// Provides API endpoint for architectural plan analysis with enriched building data

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { deriveFromExtraction } from './lib/postprocess.js';
import recalc from './lib/recalc.js';
import { analyzeWithClaude, checkClaudeHealth } from './lib/claudeVision.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from root directory (one level above /server)
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// Configure multer for file uploads (images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Health check endpoint
app.get('/health', (req, res) => {
  const claudeHealth = checkClaudeHealth();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    claude: claudeHealth
  });
});

/**
 * POST /api/analyze-plans
 * Analyzes architectural plans and returns enriched building data
 * 
 * Accepts three input formats:
 * 1. JSON with extraction data: { "extraction": {...} }
 * 2. JSON with images: { "images": [{data: base64, media_type: string}], "projectType": string }
 * 3. Multipart with file and extraction field
 * 
 * Returns enriched analysis with report and materials
 */
app.post('/api/analyze-plans', upload.single('file'), async (req, res) => {
  try {
    let rawExtraction;

    // Parse extraction data or images from request
    if (req.body.images && Array.isArray(req.body.images)) {
      // Format 2: JSON with images array - call Claude Vision API
      const { images, projectType = 'new-build-house' } = req.body;
      
      console.log(`Analyzing ${images.length} images with Claude Vision API...`);
      rawExtraction = await analyzeWithClaude(images, projectType);
      console.log('Claude analysis complete');
      
    } else if (req.body.extraction) {
      // Format 1: JSON payload or form data with extraction field
      if (typeof req.body.extraction === 'string') {
        rawExtraction = JSON.parse(req.body.extraction);
      } else {
        rawExtraction = req.body.extraction;
      }
    } else if (req.file) {
      // Format 3: File uploaded but no extraction data provided
      // Convert file to base64 and call Claude
      const base64 = req.file.buffer.toString('base64');
      const mediaType = req.file.mimetype || 'image/jpeg';
      const images = [{ data: base64, media_type: mediaType }];
      
      console.log(`Analyzing uploaded file with Claude Vision API...`);
      rawExtraction = await analyzeWithClaude(images, req.body.projectType || 'new-build-house');
      console.log('Claude analysis complete');
      
    } else {
      return res.status(400).json({
        ok: false,
        error: 'Missing data. Provide extraction object or images array in request body.'
      });
    }

    // Validate extraction has minimum required structure
    if (!rawExtraction || typeof rawExtraction !== 'object') {
      return res.status(400).json({
        ok: false,
        error: 'Invalid extraction data format. Must be a valid JSON object.'
      });
    }

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
 * POST /api/recalc
 * Re-runs post-processing using prior enriched data plus user overrides
 * Does not call vision model - only reuses existing post-processing logic
 * 
 * Request body:
 * {
 *   enriched: { ... },      // previously enriched object (latestAnalysis on the client)
 *   overrides?: {
 *     metrics?: { floor_area_m2?, wall_area_m2?, roof_area_m2?, window_area_m2?, ceiling_height_m?, storeys? },
 *     u_values?: { wall?, roof?, floor?, window?, door? },
 *     materials?: Array<{ index?: number, item?: string, quantity?: number, unit?: string }>,
 *     wiring?: Array<{ room: string, sockets?: number, light_points?: number }>
 *   }
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   result: { ... }  // updated enriched object with recalculated values
 * }
 */
app.post('/api/recalc', async (req, res) => {
  try {
    const { enriched, overrides } = req.body || {};

    // Validate request
    if (!enriched || typeof enriched !== 'object') {
      return res.status(400).json({
        ok: false,
        error: 'Missing required field: enriched'
      });
    }
    if (overrides && typeof overrides !== 'object') {
      return res.status(400).json({
        ok: false,
        error: 'Invalid overrides object'
      });
    }

    // Keep payloads small; basic guard
    const size = JSON.stringify(req.body || {}).length;
    if (size > 1_000_000) {
      return res.status(413).json({ ok: false, error: 'Payload too large' });
    }

    // Apply overrides to enriched data and recalculate
    const result = await recalc(enriched, overrides || {});

    res.json({ ok: true, result });
  } catch (error) {
    console.error('Error in /api/recalc:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Internal server error'
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

/**
 * Debug endpoint for static info (only available in non-production)
 * GET /debug/static-info
 */
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/static-info', (req, res) => {
    res.json({
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      port: PORT,
      claudeConfigured: !!process.env.ANTHROPIC_API_KEY,
      staticRoot: rootDir,
      timestamp: new Date().toISOString(),
    });
  });
}

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
  console.log(`Recalc endpoint: http://localhost:${PORT}/api/recalc`);
  console.log(`Example: http://localhost:${PORT}/api/example`);
});

export default app;
