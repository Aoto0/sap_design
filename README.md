# SAP Design App

A comprehensive SAP (Standard Assessment Procedure) design application for building energy calculations with AI-powered plan analysis using Claude Vision.

## Features

- Project management for building energy assessments
- SAP score and EPC rating calculations
- Materials and labour cost estimation
- Architectural plans builder
- **NEW: AI-powered building plan analysis with Claude Vision**
  - Automatically extract measurements from PDF/image plans
  - Auto-fill floor area, wall area, roof area, ceiling height
  - Detect rooms, windows, and doors from architectural drawings
  - Support for multiple plan types (civils, ground floor, first floor, specifications)

## Getting Started

### Frontend Setup

The frontend is a single HTML file (`index.html`) that runs entirely in the browser.

1. Open `index.html` in a web browser
2. Login (any credentials work for demo)
3. Create a project and upload building plans
4. Use the "Analyze Plans with Claude (beta)" button to extract measurements

### Backend Setup (Required for Claude Vision)

The backend server provides secure API access to Anthropic's Claude Vision API.

#### Local Development

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Anthropic API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key:
   # ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

4. Get your API key from [Anthropic Console](https://console.anthropic.com/)

5. Start the server:
   ```bash
   npm start
   ```

6. The server will run on `http://localhost:3000`

7. Update `BACKEND_BASE` in `index.html`:
   ```javascript
   const BACKEND_BASE = 'http://localhost:3000';
   ```

#### Production Deployment

The backend can be deployed to various platforms:

##### Option 1: Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set the following:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variable: `ANTHROPIC_API_KEY` with your API key
5. Deploy
6. Update `BACKEND_BASE` in `index.html` with your Render URL

##### Option 2: Heroku

1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Create a new app:
   ```bash
   heroku create your-app-name
   ```
3. Set the API key:
   ```bash
   heroku config:set ANTHROPIC_API_KEY=your_api_key_here
   ```
4. Deploy:
   ```bash
   git subtree push --prefix server heroku main
   ```
5. Update `BACKEND_BASE` in `index.html` with your Heroku URL

##### Option 3: Fly.io

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
2. Navigate to server directory and initialize:
   ```bash
   cd server
   fly launch
   ```
3. Set the API key:
   ```bash
   fly secrets set ANTHROPIC_API_KEY=your_api_key_here
   ```
4. Deploy:
   ```bash
   fly deploy
   ```
5. Update `BACKEND_BASE` in `index.html` with your Fly.io URL

##### Option 4: Vercel Serverless

1. Install [Vercel CLI](https://vercel.com/docs/cli)
2. Create `api/analyze-plans.js` serverless function (convert Express endpoint)
3. Deploy:
   ```bash
   vercel
   ```
4. Set environment variable in Vercel dashboard
5. Update `BACKEND_BASE` in `index.html` with your Vercel URL

### Important Security Notes

- **NEVER** commit your `.env` file or expose your `ANTHROPIC_API_KEY`
- The API key must remain server-side only
- The backend uses CORS to allow requests from your frontend
- Always use HTTPS in production for secure API communication

## Usage

### Analyzing Building Plans

1. Create or open a project
2. Upload one or more plan files (PDF, JPG, PNG):
   - Ground Works/Civils Plans
   - Ground Floor Plans
   - First Floor Plans
   - Project Specification
3. Click "Analyze Plans with Claude (beta)"
4. Wait for analysis (typically 10-30 seconds)
5. Review auto-filled fields and confidence score
6. Adjust any values as needed

### Supported Plan Formats

- **PDF**: First 1-2 pages will be analyzed
- **Images**: JPG, JPEG, PNG formats supported
- Plans are automatically downscaled to 1920px width for efficiency

### What Claude Can Extract

- Floor area (m²)
- Wall area (m²)
- Roof area (m²)
- Ceiling height (m)
- Room count and details
- Window dimensions, orientations, and types
- Door locations and sizes
- Scale information from plans

## Development

This is a Flutter project with an HTML-based web frontend and Node.js backend.

### Flutter Resources

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)
- [Online documentation](https://docs.flutter.dev/)

### Backend API

The backend provides a single endpoint:

**POST** `/api/analyze-plans`

Request body:
```json
{
  "images": [
    {
      "data": "base64_image_data",
      "media_type": "image/png",
      "label": "ground"
    }
  ],
  "projectType": "new-build-house"
}
```

Response:
```json
{
  "ok": true,
  "result": {
    "scale": { "text": "1:100", "confidence": 0.9 },
    "metrics": {
      "floor_area_m2": 120.5,
      "wall_area_m2": 180.0,
      "roof_area_m2": 125.0,
      "ceiling_height_m": 2.4
    },
    "rooms": [...],
    "windows": [...],
    "doors": [...],
    "assumptions": [],
    "confidence": 0.85
  }
}
```

## License

Copyright © 2025 Parallax Project Management LTD. All Rights Reserved.

