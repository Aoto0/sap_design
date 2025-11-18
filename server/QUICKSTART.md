# Quick Start Guide

Get the `/api/recalc` endpoint running in under 2 minutes!

## Prerequisites

- Node.js 14 or higher
- npm or yarn

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Custom Port
```bash
PORT=8080 npm start
```

The server will start and display:
```
Server running on port 3001
POST /api/recalc endpoint is ready
```

## Quick Test

### Using curl
```bash
curl -X POST http://localhost:3001/api/recalc \
  -H "Content-Type: application/json" \
  -d '{
    "enriched": {
      "metrics": {
        "floor_area_m2": 100,
        "wall_area_m2": 200,
        "roof_area_m2": 100,
        "window_area_m2": 20,
        "ceiling_height_m": 2.4,
        "storeys": 1
      }
    }
  }'
```

### Using the test suite
```bash
# Make sure the server is running on port 3001, then:
node test.js
```

Expected output:
```
Testing /api/recalc endpoint...

Test 1: Basic recalculation without overrides
✓ Response OK: true
✓ Has calculations: true
...

All tests completed!
```

## What You Get

The endpoint returns:
- ✅ Updated metrics based on your overrides
- ✅ Recalculated heat loss values
- ✅ Energy performance rating (A-G)
- ✅ Cost estimates (materials, labour, total)
- ✅ Volume calculations
- ✅ Timestamp of recalculation

## Next Steps

1. Read [README.md](./README.md) for full API documentation
2. Check [CLIENT_USAGE.md](./CLIENT_USAGE.md) for integration examples
3. Integrate the endpoint into your frontend application

## Troubleshooting

### Port already in use
If you see `EADDRINUSE`, another process is using port 3001:
```bash
# Use a different port
PORT=3002 npm start
```

### Module not found
Run `npm install` again:
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

### CORS issues
The server is configured with CORS enabled. If you still face issues, check your request headers:
```javascript
headers: {
  'Content-Type': 'application/json'
}
```

## Support

- API Documentation: [README.md](./README.md)
- Client Examples: [CLIENT_USAGE.md](./CLIENT_USAGE.md)
- Run tests: `node test.js`
