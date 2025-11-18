// Copyright © 2025 Parallax Project Management LTD. All Rights Reserved.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 8787;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large base64 images

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SAP Design Server' });
});

// Analyze architectural plans endpoint
app.post('/api/analyze-plans', async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'No images provided. Please upload at least one plan image.' 
      });
    }

    // Limit to max 4 images to control costs
    const imagesToAnalyze = images.slice(0, 4);

    // Prepare image content for Claude
    const imageContent = imagesToAnalyze.map(img => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mimeType || 'image/png',
        data: img.data
      }
    }));

    // Construct prompt for Claude with strict JSON schema
    const systemPrompt = `You are an expert architectural plan analyzer. Your task is to extract measurements and design information from architectural drawings and floor plans.

Analyze the provided architectural plan images and extract the following information in strict JSON format:

{
  "scale": "detected scale (e.g., '1:100', '1:50') or 'not detected'",
  "metrics": {
    "floor_area_m2": number (total floor area in square meters, sum all floors if multiple),
    "wall_area_m2": number (estimated total wall area in square meters),
    "roof_area_m2": number (estimated roof area in square meters),
    "ceiling_height_m": number (ceiling height in meters, typically 2.4-3.0)
  },
  "rooms": [
    {
      "name": "room name",
      "floor": "ground/first/etc",
      "area_m2": number
    }
  ],
  "windows": [
    {
      "location": "front/back/left/right",
      "width_m": number,
      "height_m": number,
      "type": "Double Glazed" (or best guess)
    }
  ],
  "doors": [
    {
      "type": "front door/internal/etc",
      "location": "front/back/side"
    }
  ],
  "assumptions": ["list of assumptions made during analysis"],
  "confidence": "high/medium/low"
}

Rules:
- Extract actual measurements when visible on plans
- Use standard dimensions when measurements are not visible (e.g., ceiling height 2.4m)
- For floor area, measure the internal dimensions and calculate area
- For wall area, estimate based on perimeter × ceiling height × number of floors
- For roof area, use floor area as approximation if pitched roof details not visible
- List all identifiable rooms with their approximate areas
- Identify window positions and estimate standard sizes (typically 1.2m × 1.2m if not specified)
- Be conservative with estimates and note assumptions
- Return confidence level based on clarity of plans`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze these architectural plans and provide the requested JSON output with all measurements and details you can extract.'
            },
            ...imageContent
          ]
        }
      ]
    });

    // Extract the text response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    let analysisText = textContent.text;

    // Try to extract JSON from the response (Claude might wrap it in markdown)
    let jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      analysisText = jsonMatch[1];
    } else if (!analysisText.trim().startsWith('{')) {
      // If no JSON block found and doesn't start with {, try to find JSON in the text
      jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisText = jsonMatch[0];
      }
    }

    // Parse the JSON response
    const analysis = JSON.parse(analysisText);

    // Return successful response
    res.json({
      ok: true,
      data: analysis
    });

  } catch (error) {
    console.error('Error analyzing plans:', error);
    
    // Handle specific error cases
    if (error instanceof SyntaxError) {
      return res.status(500).json({
        ok: false,
        error: 'Failed to parse analysis results. Please try again.'
      });
    }

    if (error.status === 401) {
      return res.status(500).json({
        ok: false,
        error: 'API authentication failed. Please check server configuration.'
      });
    }

    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to analyze plans. Please try again.'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`SAP Design Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  WARNING: ANTHROPIC_API_KEY not set. Please configure .env file.');
  }
});
