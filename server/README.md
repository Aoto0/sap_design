# Plan Analysis Backend (Claude 3.5 Sonnet)

This backend receives architectural plan images from the frontend (PNG/JPEG rendered from PDFs) and uses Anthropic Claude 3.5 Sonnet (vision) to extract structured measurements.

## Features
- Accepts up to 6 images per request (client currently caps at 4).
- Prompts Claude to output strict JSON (schema documented in server.js).
- Converts plan annotations and scale information into metric values (meters).
- Returns JSON result without exposing the API key.

## Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
npm start
```

Server will start on `http://localhost:8787`.

## Environment Variables
- `ANTHROPIC_API_KEY` (required)
- `PORT` (optional, defaults to 8787)

## Endpoint

`POST /api/analyze-plans`

Request body:
```json
{
  "images": [
    {
      "data": "BASE64_IMAGE_STRING_NO_PREFIX",
      "media_type": "image/png"
    }
  ],
  "projectType": "New Build House"
}
```

Response:
```json
{ "ok": true, "result": { /* strict JSON per schema */ } }
```
OR
```json
{ "ok": false, "error": "reason" }
```

## Frontend Integration
Set the constant `BACKEND_BASE = "http://localhost:8787";` in `index.html`. The frontend:
1. Converts PDFs to PNG (first 1–2 pages) via PDF.js.
2. Downscales images to a max width (1920px).
3. Sends base64 image data to this backend.
4. Receives structured JSON and auto-fills form fields.

## Deploying
You can deploy this on:
- Render, Fly.io, Railway, Heroku (standard Node/Express)
- Docker container or server VM

Set `ANTHROPIC_API_KEY` as a protected environment variable.

## Security Notes
- Never expose your API key client-side.
- Rate limit or add auth if deploying publicly.
- Consider logging minimal metadata (avoid storing raw plan imagery unless needed).

## Future Enhancements
- Add caching keyed by file hash.
- Validate image resolution and reject overly large payloads.
- Add a confidence threshold to decide whether to auto-fill or prompt user confirmation.
