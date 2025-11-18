// Copyright © 2025 Parallax Project Management LTD. All Rights Reserved.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SAP Design Server is running' });
});

// Main endpoint for analyzing building plans
app.post('/api/analyze-plans', async (req, res) => {
  try {
    const { images, projectType } = req.body;

    // Validate request
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'No images provided. Please upload at least one plan image.'
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: 'Server configuration error: ANTHROPIC_API_KEY not set'
      });
    }

    // Build content blocks for Claude API
    const contentBlocks = [];

    // Add text instructions
    contentBlocks.push({
      type: 'text',
      text: buildPrompt(projectType)
    });

    // Add each image
    images.forEach((img, idx) => {
      if (img.data && img.media_type) {
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.media_type,
            data: img.data
          }
        });
      }
    });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: contentBlocks
      }]
    });

    // Extract the response text
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Parse JSON from response
    const result = parseClaudeResponse(responseText);

    if (!result) {
      return res.status(500).json({
        ok: false,
        error: 'Failed to parse response from Claude. The AI returned invalid JSON.'
      });
    }

    // Return successful result
    res.json({
      ok: true,
      result: result
    });

  } catch (error) {
    console.error('Error analyzing plans:', error);
    
    // Handle specific error types
    if (error.status === 401) {
      return res.status(500).json({
        ok: false,
        error: 'Authentication error with Claude API. Please check server configuration.'
      });
    }

    res.status(500).json({
      ok: false,
      error: error.message || 'An error occurred while analyzing the plans.'
    });
  }
});

// Build the prompt for Claude
function buildPrompt(projectType) {
  const typeHint = projectType ? ` The project type is: ${projectType}.` : '';
  
  return `You are analyzing architectural building plans to extract measurements and structured data for a Standard Assessment Procedure (SAP) energy calculation.${typeHint}

INSTRUCTIONS:
1. Examine the uploaded architectural plan(s) carefully
2. Look for scale bars or scale notations (e.g., "1:100", "Scale 1:50")
3. Read any dimension annotations on the plans (lengths, widths, heights typically shown in millimeters)
4. Extract room information including names, dimensions, and levels
5. Identify windows and doors with their dimensions and locations
6. Calculate or extract floor area, wall area, roof area, and ceiling height

IMPORTANT RULES:
- If dimensions are in millimeters (mm), convert to meters (m) by dividing by 1000
- Prefer explicit dimension annotations over scale-based measurements
- If scale is unknown AND no dimensions are annotated, set confidence low and explain in assumptions
- All output numbers must be in meters (m) and square meters (m²)
- Return ONLY valid JSON - no markdown, no code blocks, no explanatory text

OUTPUT SCHEMA (strict JSON only):
{
  "scale": {
    "text": "1:100" or "Unknown",
    "confidence": 0.0 to 1.0
  },
  "metrics": {
    "floor_area_m2": number or null,
    "wall_area_m2": number or null,
    "roof_area_m2": number or null,
    "ceiling_height_m": number or null
  },
  "rooms": [
    {
      "name": "Kitchen",
      "level": "ground" | "first" | "second" | "unknown",
      "length_m": number or null,
      "width_m": number or null,
      "area_m2": number or null
    }
  ],
  "windows": [
    {
      "orientation": "Front" | "Back" | "Left" | "Right" | "Unknown",
      "width_m": number or null,
      "height_m": number or null,
      "type": "Double Glazed" | "Low E Double Glazed" | "Triple Glazed" | "Unknown"
    }
  ],
  "doors": [
    {
      "location": "Front entrance" | "Room name" | etc,
      "type": "External" | "Internal",
      "width_m": number or null,
      "height_m": number or null
    }
  ],
  "assumptions": [
    "List any assumptions made",
    "Note if scale was unclear",
    "Note if dimensions were estimated"
  ],
  "confidence": 0.0 to 1.0
}

CALCULATION GUIDELINES:
- Floor area: Sum of all room areas, or overall building footprint
- Wall area: Perimeter × ceiling height (or sum of all external walls)
- Roof area: May equal floor area for flat roofs, or use pitched roof dimensions if visible
- Ceiling height: Look for height dimensions, section views, or standard notation (typically 2.4m to 3.0m)
- If rooms span multiple plans, aggregate intelligently

Return ONLY the JSON object, nothing else.`;
}

// Parse Claude's response and extract JSON
function parseClaudeResponse(text) {
  try {
    // Try direct JSON parse first
    const parsed = JSON.parse(text);
    return parsed;
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {
        console.error('Failed to parse JSON from markdown block:', e2);
      }
    }

    // Try to find JSON object in the text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (e3) {
        console.error('Failed to parse extracted JSON object:', e3);
      }
    }

    console.error('Could not parse JSON from Claude response:', text);
    return null;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`SAP Design Server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY not set in environment variables!');
  }
});
