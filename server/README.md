# SAP Design Server

Backend server for automated architectural plan analysis using Anthropic Claude 3.5 Sonnet (vision).

## Features

- **POST /api/analyze-plans**: Analyzes architectural plan images (PDF pages rendered to PNG/JPEG) and extracts:
  - Scale information
  - Floor area, wall area, roof area, ceiling height
  - Room layouts and dimensions
  - Window and door locations
  - Confidence level and assumptions

## Prerequisites

- Node.js v16+ and npm
- Anthropic API key (get from https://console.anthropic.com/)

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   PORT=8787
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

The server will start on http://localhost:8787

## API Endpoints

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "service": "SAP Design Server"
}
```

### Analyze Plans
```
POST /api/analyze-plans
Content-Type: application/json
```

Request body:
```json
{
  "images": [
    {
      "data": "base64_encoded_image_data",
      "mimeType": "image/png"
    }
  ]
}
```

Response (success):
```json
{
  "ok": true,
  "data": {
    "scale": "1:100",
    "metrics": {
      "floor_area_m2": 120.5,
      "wall_area_m2": 250.0,
      "roof_area_m2": 130.0,
      "ceiling_height_m": 2.4
    },
    "rooms": [
      {
        "name": "Living Room",
        "floor": "ground",
        "area_m2": 25.0
      }
    ],
    "windows": [
      {
        "location": "front",
        "width_m": 1.2,
        "height_m": 1.2,
        "type": "Double Glazed"
      }
    ],
    "doors": [
      {
        "type": "front door",
        "location": "front"
      }
    ],
    "assumptions": [
      "Ceiling height assumed to be standard 2.4m",
      "Window dimensions estimated from scale"
    ],
    "confidence": "high"
  }
}
```

Response (error):
```json
{
  "ok": false,
  "error": "Error message"
}
```

## Security Notes

- The API key is stored server-side only (in .env file)
- Never commit .env files to version control
- The server uses CORS to accept requests from any origin (adjust in production)
- Image uploads are limited to 50MB total
- Maximum 4 images are processed per request to control API costs

## Cost Management

- Each API call to Claude consumes tokens based on image size and response length
- Limit images to first 1-2 pages of PDFs in the frontend
- Consider implementing caching by file hash for repeated analyses
- Monitor usage in the Anthropic console

## Troubleshooting

**"ANTHROPIC_API_KEY not set" warning:**
- Make sure .env file exists in the server directory
- Verify the API key is correctly set in .env
- Restart the server after changing .env

**"Failed to parse analysis results":**
- The AI response may not be valid JSON
- Check server logs for the actual response
- Try with clearer, higher quality plan images

**"API authentication failed":**
- Verify your API key is valid
- Check your Anthropic account has credits available

## Development

For local development:
```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

## License

Copyright © 2025 Parallax Project Management LTD. All Rights Reserved.
