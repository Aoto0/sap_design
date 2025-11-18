/**
 * Example frontend integration for the /api/recalc endpoint.
 * 
 * This demonstrates how the frontend "Recalculate" button would call
 * the backend to apply manual tweaks without re-uploading images.
 */

// Example: Store the original extraction data from /api/analyze-plans
let sourceRawData = null;

/**
 * When user uploads plans and gets initial analysis from /api/analyze-plans
 */
async function analyzePlans(formData) {
  const response = await fetch('http://localhost:5000/api/analyze-plans', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  if (data.ok) {
    // Store the original extraction for later recalculation
    sourceRawData = data.result.source_raw;
    displayResults(data.result);
  }
}

/**
 * When user clicks "Recalculate" button after manually tweaking values
 */
async function recalculateWithOverrides() {
  // Gather user overrides from the form
  const overrides = {
    metrics: {
      floor_area_m2: parseFloat(document.getElementById('floor-area').value),
      wall_area_m2: parseFloat(document.getElementById('wall-area').value),
      ceiling_height_m: parseFloat(document.getElementById('ceiling-height').value)
    },
    u_values: {
      wall: parseFloat(document.getElementById('wall-uval').value),
      roof: parseFloat(document.getElementById('roof-uval').value),
      floor: parseFloat(document.getElementById('floor-uval').value)
    }
  };
  
  // Call /api/recalc with source data + overrides
  const response = await fetch('http://localhost:5000/api/recalc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source_raw: sourceRawData,
      overrides: overrides
    })
  });
  
  const data = await response.json();
  if (data.ok) {
    // Update UI with recalculated results
    displayResults(data.result);
    showNotification('Recalculation complete!');
  } else {
    showError('Recalculation failed: ' + data.error);
  }
}

/**
 * Display results in the UI
 */
function displayResults(result) {
  // Update metrics display
  document.getElementById('total-area-display').textContent = 
    result.total_area_m2 + ' m²';
  document.getElementById('avg-uvalue-display').textContent = 
    result.average_u_value?.toFixed(2) || 'N/A';
  
  // Update materials list
  const materialsList = document.getElementById('materials-list');
  materialsList.innerHTML = '';
  result.materials?.forEach(mat => {
    const li = document.createElement('li');
    li.textContent = `${mat.item}: ${mat.quantity} ${mat.unit || ''}`;
    materialsList.appendChild(li);
  });
  
  // Update wiring info
  const wiringList = document.getElementById('wiring-list');
  wiringList.innerHTML = '';
  result.wiring?.forEach(room => {
    const li = document.createElement('li');
    li.textContent = `${room.room}: ${room.sockets || 0} sockets, ${room.light_points || 0} lights`;
    wiringList.appendChild(li);
  });
}

function showNotification(message) {
  // Display success notification
  console.log('✓ ' + message);
}

function showError(message) {
  // Display error message
  console.error('✗ ' + message);
}

/**
 * Example HTML structure for the recalculate button:
 * 
 * <button onclick="recalculateWithOverrides()">
 *   Recalculate
 * </button>
 * 
 * The button would typically be placed near the input fields for
 * metrics, U-values, materials, and wiring configurations.
 */
