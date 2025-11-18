const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Import post-processing logic
const { processEnrichedData } = require('./postProcessing');

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
app.post('/api/recalc', (req, res) => {
  try {
    const { enriched, overrides } = req.body;

    // Validate request
    if (!enriched) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required field: enriched'
      });
    }

    // Apply overrides to enriched data and recalculate
    const result = processEnrichedData(enriched, overrides || {});

    res.json({
      ok: true,
      result
    });
  } catch (error) {
    console.error('Error in /api/recalc:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`POST /api/recalc endpoint is ready`);
});
