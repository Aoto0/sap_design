# Client-Side Usage Example

This document shows how to use the `/api/recalc` endpoint from a client application.

## Basic Usage

```javascript
// Assuming you have enriched data from a previous /api/analyze-plans call
const latestAnalysis = {
  metrics: {
    floor_area_m2: 100,
    wall_area_m2: 200,
    roof_area_m2: 100,
    window_area_m2: 20,
    ceiling_height_m: 2.4,
    storeys: 1
  },
  u_values: {
    wall: 0.3,
    roof: 0.2,
    floor: 0.25,
    window: 1.6,
    door: 1.8
  },
  materials: [
    { item: "Bricks", quantity: 5000, unit: "no" }
  ],
  wiring: [
    { room: "Living Room", sockets: 6, light_points: 3 }
  ]
};

// Call the recalc endpoint without overrides
async function recalculate() {
  const response = await fetch('http://localhost:3001/api/recalc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      enriched: latestAnalysis
    })
  });
  
  const data = await response.json();
  
  if (data.ok) {
    console.log('Recalculated data:', data.result);
    console.log('Energy rating:', data.result.calculations.energy_rating);
    console.log('Total cost:', data.result.calculations.grand_total_gbp);
  } else {
    console.error('Error:', data.error);
  }
}
```

## Usage with Overrides

```javascript
// User adjusts some values in the UI
const userOverrides = {
  metrics: {
    floor_area_m2: 120,  // User increased floor area
    storeys: 2           // User added a second storey
  },
  u_values: {
    wall: 0.28,          // User selected better insulation
    roof: 0.18
  }
};

async function recalculateWithOverrides() {
  const response = await fetch('http://localhost:3001/api/recalc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      enriched: latestAnalysis,
      overrides: userOverrides
    })
  });
  
  const data = await response.json();
  
  if (data.ok) {
    // Update the UI with new calculations
    updateEnergyRating(data.result.calculations.energy_rating);
    updateCostEstimate(data.result.calculations.grand_total_gbp);
    updateHeatLoss(data.result.calculations.total_heat_loss_w_per_k);
    
    // Store the updated enriched data
    latestAnalysis = data.result;
  }
}
```

## React Example

```javascript
import { useState, useEffect } from 'react';

function ArchitecturalCalculator() {
  const [enrichedData, setEnrichedData] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [calculations, setCalculations] = useState(null);

  const recalculate = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/recalc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enriched: enrichedData,
          overrides: overrides
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setEnrichedData(data.result);
        setCalculations(data.result.calculations);
      }
    } catch (error) {
      console.error('Recalculation failed:', error);
    }
  };

  const handleFloorAreaChange = (newArea) => {
    setOverrides({
      ...overrides,
      metrics: {
        ...overrides.metrics,
        floor_area_m2: newArea
      }
    });
  };

  useEffect(() => {
    if (enrichedData && Object.keys(overrides).length > 0) {
      // Debounce recalculation
      const timer = setTimeout(() => {
        recalculate();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [overrides]);

  return (
    <div>
      <h2>Adjust Parameters</h2>
      <input
        type="number"
        placeholder="Floor Area (m²)"
        onChange={(e) => handleFloorAreaChange(parseFloat(e.target.value))}
      />
      
      {calculations && (
        <div>
          <h3>Results</h3>
          <p>Energy Rating: {calculations.energy_rating}</p>
          <p>Total Cost: £{calculations.grand_total_gbp.toFixed(2)}</p>
          <p>Heat Loss: {calculations.total_heat_loss_w_per_k.toFixed(2)} W/K</p>
        </div>
      )}
    </div>
  );
}
```

## HTML/Vanilla JS Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>SAP Design Calculator</title>
</head>
<body>
  <h1>Architectural Calculator</h1>
  
  <div>
    <label>Floor Area (m²):</label>
    <input type="number" id="floorArea" value="100">
  </div>
  
  <div>
    <label>Wall U-value (W/m²K):</label>
    <input type="number" step="0.01" id="wallUValue" value="0.3">
  </div>
  
  <button onclick="recalculate()">Recalculate</button>
  
  <div id="results"></div>

  <script>
    let enrichedData = {
      metrics: {
        floor_area_m2: 100,
        wall_area_m2: 200,
        roof_area_m2: 100,
        window_area_m2: 20,
        ceiling_height_m: 2.4,
        storeys: 1
      },
      u_values: {
        wall: 0.3,
        roof: 0.2,
        floor: 0.25,
        window: 1.6,
        door: 1.8
      }
    };

    async function recalculate() {
      const floorArea = parseFloat(document.getElementById('floorArea').value);
      const wallUValue = parseFloat(document.getElementById('wallUValue').value);
      
      const overrides = {
        metrics: { floor_area_m2: floorArea },
        u_values: { wall: wallUValue }
      };
      
      try {
        const response = await fetch('http://localhost:3001/api/recalc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enriched: enrichedData,
            overrides: overrides
          })
        });
        
        const data = await response.json();
        
        if (data.ok) {
          enrichedData = data.result;
          displayResults(data.result.calculations);
        } else {
          alert('Error: ' + data.error);
        }
      } catch (error) {
        alert('Failed to recalculate: ' + error.message);
      }
    }
    
    function displayResults(calc) {
      const html = `
        <h2>Results</h2>
        <p><strong>Energy Rating:</strong> ${calc.energy_rating} (Score: ${calc.energy_score})</p>
        <p><strong>Heat Loss:</strong> ${calc.total_heat_loss_w_per_k.toFixed(2)} W/K</p>
        <p><strong>Annual Heating Demand:</strong> ${calc.annual_heating_demand_kwh.toFixed(0)} kWh</p>
        <p><strong>Material Cost:</strong> £${calc.estimated_material_cost_gbp.toFixed(2)}</p>
        <p><strong>Labour Cost:</strong> £${calc.estimated_labour_cost_gbp.toFixed(2)}</p>
        <p><strong>Grand Total:</strong> £${calc.grand_total_gbp.toFixed(2)}</p>
      `;
      document.getElementById('results').innerHTML = html;
    }
  </script>
</body>
</html>
```

## Error Handling

```javascript
async function safeRecalculate(enriched, overrides) {
  try {
    const response = await fetch('http://localhost:3001/api/recalc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enriched, overrides })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Recalculation failed');
    }
    
    return data.result;
  } catch (error) {
    console.error('Recalculation error:', error);
    // Show user-friendly error message
    alert('Unable to recalculate. Please check your inputs and try again.');
    return null;
  }
}
```

## Performance Tips

1. **Debounce user inputs**: Don't call the API on every keystroke. Wait for the user to finish typing.

```javascript
let debounceTimer;
function debouncedRecalculate(enriched, overrides) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    recalculate(enriched, overrides);
  }, 500); // Wait 500ms after last input
}
```

2. **Cache results**: Store the last recalculation result to avoid unnecessary API calls.

3. **Show loading state**: Display a loading indicator while waiting for the API response.

```javascript
async function recalculateWithLoading(enriched, overrides) {
  showLoadingSpinner();
  try {
    const result = await recalculate(enriched, overrides);
    updateUI(result);
  } finally {
    hideLoadingSpinner();
  }
}
```

## Integration with /api/analyze-plans

When you get a response from `/api/analyze-plans`, store it as your initial enriched data:

```javascript
// After uploading plans to /api/analyze-plans
async function analyzePlans(formData) {
  const response = await fetch('http://localhost:3001/api/analyze-plans', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  
  if (data.ok) {
    // Store this as the base enriched data
    latestAnalysis = data.result;
    
    // Display initial results
    displayResults(latestAnalysis.calculations);
  }
}

// Later, when user adjusts parameters, use /api/recalc
async function userAdjustedParameter(overrides) {
  const response = await fetch('http://localhost:3001/api/recalc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enriched: latestAnalysis,
      overrides: overrides
    })
  });
  
  const data = await response.json();
  
  if (data.ok) {
    latestAnalysis = data.result;
    displayResults(latestAnalysis.calculations);
  }
}
```
