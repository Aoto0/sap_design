# sap_design

A Flutter application for architectural plan analysis with SAP (Standard Assessment Procedure) calculations.

## Project Structure

- **Flutter App**: Mobile/web application for architectural design
- **Server**: Node.js backend API for post-processing calculations

## Getting Started

### Flutter Application

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

### Backend Server

The `server/` directory contains a Node.js/Express backend that provides:

- **POST /api/recalc** - Lightweight recalculation endpoint for architectural data
  - Accepts enriched data with optional overrides
  - Recalculates energy ratings, costs, and SAP metrics
  - No vision model calls - pure post-processing

#### Quick Start

```bash
cd server
npm install
npm start
```

See [server/QUICKSTART.md](server/QUICKSTART.md) for detailed setup instructions.

#### Documentation

- [API Documentation](server/README.md) - Full endpoint documentation
- [Client Usage Examples](server/CLIENT_USAGE.md) - Integration examples
- [Quick Start Guide](server/QUICKSTART.md) - Get started in 2 minutes

## Features

- 🏗️ Architectural plan analysis
- ⚡ Real-time recalculation with user overrides
- 🌡️ SAP energy performance ratings
- 💰 Cost estimation (materials, labour, profit)
- 📊 Heat loss and thermal calculations
- 🔌 Electrical wiring calculations
