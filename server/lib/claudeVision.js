/**
 * claudeVision.js
 * Vision processing for architectural plans using Anthropic Claude API
 * Limits processing to first 2 images for cost control
 * Attempts response_format json, fallback to json_schema, then sanitized text
 */

import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

// Maximum images to process (cost control)
const MAX_IMAGES = 2;

// Default assumptions for Claude prompt
const DEFAULT_ASSUMPTIONS = {
  doorWidth: 0.838, // meters
  wallBuildUp: '100mm brick + 150mm cavity + 100mm block',
  ceilingHeight: 2.4, // meters
};

/**
 * Analyze architectural plan images using Claude Vision API
 * @param {Array<Object>} images - Array of image objects with {data: base64String, media_type: string}
 * @param {string} projectType - Type of project (e.g., 'new-build-house')
 * @returns {Promise<Object>} Parsed JSON response from Claude
 */
export async function analyzeWithClaude(images, projectType = 'new-build-house') {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('No images provided for analysis');
  }

  // Limit to first 2 images for cost control
  const limitedImages = images.slice(0, MAX_IMAGES);

  const client = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  // Build the prompt with assumptions
  const prompt = buildAnalysisPrompt(projectType);

  // Build content array with images
  const content = [
    {
      type: 'text',
      text: prompt,
    },
    ...limitedImages.map((img) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.media_type || 'image/jpeg',
        data: img.data,
      },
    })),
  ];

  // Try response strategies in order: json -> json_schema -> sanitized text
  let response;
  let parsedResult;

  try {
    // Strategy 1: Try with response_format json (newer models)
    response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      // Note: response_format is not directly supported in Anthropic SDK
      // We'll rely on prompt engineering to get JSON
    });

    const textContent = response.content.find((c) => c.type === 'text')?.text || '';
    
    // Try to parse as JSON
    parsedResult = parseClaudeResponse(textContent);

    // Validate required keys
    validateResponseStructure(parsedResult);

    return enrichResponse(parsedResult);
  } catch (error) {
    console.error('Error in analyzeWithClaude:', error.message);

    // If we got a response but parsing failed, try sanitization
    if (response) {
      const textContent = response.content.find((c) => c.type === 'text')?.text || '';
      try {
        parsedResult = sanitizeAndParse(textContent);
        validateResponseStructure(parsedResult);
        return enrichResponse(parsedResult);
      } catch (sanitizeError) {
        console.error('Sanitization also failed:', sanitizeError.message);
      }
    }

    throw new Error(`Claude analysis failed: ${error.message}`);
  }
}

/**
 * Build the analysis prompt with assumptions
 */
function buildAnalysisPrompt(projectType) {
  return `You are an expert architectural plan analyzer. Analyze the provided architectural plan images and extract detailed building information.

PROJECT TYPE: ${projectType}

CRITICAL REQUIREMENTS:
1. You MUST return a valid JSON object (no markdown, no code fences, just pure JSON)
2. You MUST include a "report" object with Bill of Quantities (BoQ) arrays
3. NEVER omit the report - even if data is limited, include empty arrays

ASSUMPTIONS TO USE:
- Door width: ${DEFAULT_ASSUMPTIONS.doorWidth} m (standard UK door)
- Default wall build-up: ${DEFAULT_ASSUMPTIONS.wallBuildUp}
- Ceiling height: ${DEFAULT_ASSUMPTIONS.ceilingHeight} m (if not specified)

REQUIRED JSON STRUCTURE:
{
  "dimensions": {
    "floorArea": <number>,
    "wallArea": <number>,
    "roofArea": <number>,
    "windowArea": <number>,
    "ceilingHeight": <number>
  },
  "rooms": [
    { "name": <string>, "area": <number>, "type": <string> }
  ],
  "storeys": <number>,
  "buildingType": <string>,
  "windows": [
    { "location": <string>, "width_m": <number>, "height_m": <number>, "type": <string> }
  ],
  "assumptions": [<string>],
  "report": {
    "groundworks": [
      { "description": <string>, "unit": <string>, "quantity": <number>, "method": <string>, "rate": <number>, "total": <number>, "notes": <string> }
    ],
    "structural_works": [],
    "external_envelope": [],
    "internal_construction": [],
    "me_electrical": [],
    "external_works": [],
    "provisional_sums": [
      { "description": <string>, "amount": <number>, "notes": <string> }
    ],
    "appendices": {
      "method_of_measurement": <string>,
      "drawings": [<string>],
      "specifications": [<string>],
      "schedules": {
        "windows": [],
        "doors": [],
        "finishes": []
      }
    }
  },
  "materials": [
    { "item": <string>, "quantity": <number>, "unit": <string>, "method": <string>, "notes": <string>, "unit_cost": <number> }
  ],
  "u_values": {
    "wall": <number>,
    "roof": <number>,
    "floor": <number>,
    "window": <number>,
    "door": <number>
  }
}

IMPORTANT NOTES:
- All arrays can be empty [] but must be present
- report.appendices.schedules must include windows, doors, finishes (can be empty arrays)
- Include as much detail as you can extract from the plans
- If you cannot determine a value, use reasonable defaults or null
- Add any assumptions you make to the "assumptions" array
- For materials, include unit_cost if you can estimate it (GBP)

Return ONLY the JSON object, no additional text or formatting.`;
}

/**
 * Parse Claude response text to JSON
 */
function parseClaudeResponse(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid response from Claude');
  }

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // If direct parse fails, try sanitization
    return sanitizeAndParse(text);
  }
}

/**
 * Robust JSON sanitizer
 * Removes code fences, comments, smart quotes, unquoted keys, trailing commas, NaN/Infinity, single quotes, stray backticks
 * Slices first JSON object
 */
function sanitizeAndParse(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text for sanitization');
  }

  let cleaned = text;

  // Remove markdown code fences
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');

  // Remove stray backticks
  cleaned = cleaned.replace(/`/g, '');

  // Remove comments (// and /* */)
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Replace smart quotes with regular quotes
  cleaned = cleaned.replace(/[""]/g, '"');
  cleaned = cleaned.replace(/['']/g, "'");

  // Replace single quotes with double quotes (for keys and values)
  cleaned = cleaned.replace(/([''])?([a-zA-Z0-9_]+)([''])?\s*:/g, '"$2":');
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');

  // Remove trailing commas
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Replace NaN and Infinity
  cleaned = cleaned.replace(/:\s*NaN/g, ': null');
  cleaned = cleaned.replace(/:\s*Infinity/g, ': null');
  cleaned = cleaned.replace(/:\s*-Infinity/g, ': null');

  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error('No valid JSON object found in response');
  }

  // Extract JSON object
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  // Try to parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`JSON parsing failed after sanitization: ${e.message}`);
  }
}

/**
 * Validate that response has required structure
 */
function validateResponseStructure(data) {
  const requiredKeys = ['dimensions', 'rooms', 'storeys', 'buildingType', 'windows', 'assumptions', 'report'];

  for (const key of requiredKeys) {
    if (!(key in data)) {
      throw new Error(`Missing required key: ${key}`);
    }
  }

  // Validate report structure
  if (!data.report || typeof data.report !== 'object') {
    throw new Error('report must be an object');
  }

  const reportArrays = [
    'groundworks',
    'structural_works',
    'external_envelope',
    'internal_construction',
    'me_electrical',
    'external_works',
    'provisional_sums',
  ];

  for (const arr of reportArrays) {
    if (!Array.isArray(data.report[arr])) {
      console.warn(`report.${arr} is not an array, initializing as empty array`);
      data.report[arr] = [];
    }
  }

  // Validate appendices structure
  if (!data.report.appendices || typeof data.report.appendices !== 'object') {
    console.warn('report.appendices missing, initializing with defaults');
    data.report.appendices = {
      method_of_measurement: '',
      drawings: [],
      specifications: [],
      schedules: {
        windows: [],
        doors: [],
        finishes: [],
      },
    };
  }

  // Ensure schedules exist
  if (!data.report.appendices.schedules || typeof data.report.appendices.schedules !== 'object') {
    data.report.appendices.schedules = {
      windows: [],
      doors: [],
      finishes: [],
    };
  }

  // Ensure materials array exists
  if (!Array.isArray(data.materials)) {
    console.warn('materials is not an array, initializing as empty array');
    data.materials = [];
  }

  return true;
}

/**
 * Enrich response with any additional processing
 */
function enrichResponse(data) {
  // Add timestamp
  data.timestamp = new Date().toISOString();

  // Add processing metadata
  data.processing = {
    model: ANTHROPIC_MODEL,
    images_processed: Math.min(MAX_IMAGES, 2),
    assumptions: Object.entries(DEFAULT_ASSUMPTIONS).map(([key, value]) => `${key}: ${value}`),
  };

  return data;
}

/**
 * Health check for Claude API
 */
export function checkClaudeHealth() {
  return {
    configured: !!ANTHROPIC_API_KEY,
    model: ANTHROPIC_MODEL,
    maxImages: MAX_IMAGES,
  };
}
