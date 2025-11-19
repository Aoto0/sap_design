/**
 * Manual tests for the /api/recalc endpoint
 * Run with: node test.js
 */

const testRecalc = async () => {
  const BASE_URL = 'http://localhost:3001';

  console.log('Testing /api/recalc endpoint...\n');

  // Test 1: Basic recalculation without overrides
  console.log('Test 1: Basic recalculation without overrides');
  try {
    const response1 = await fetch(`${BASE_URL}/api/recalc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enriched: {
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
        }
      })
    });
    const data1 = await response1.json();
    console.log('✓ Response OK:', data1.ok);
    console.log('✓ Has calculations:', !!data1.result?.calculations);
    console.log('✓ Energy rating:', data1.result?.calculations?.energy_rating);
    console.log();
  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
  }

  // Test 2: Recalculation with metric overrides
  console.log('Test 2: Recalculation with metric overrides');
  try {
    const response2 = await fetch(`${BASE_URL}/api/recalc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enriched: {
          metrics: {
            floor_area_m2: 100,
            wall_area_m2: 200,
            roof_area_m2: 100,
            window_area_m2: 20,
            ceiling_height_m: 2.4,
            storeys: 1
          }
        },
        overrides: {
          metrics: {
            floor_area_m2: 150,
            storeys: 2
          }
        }
      })
    });
    const data2 = await response2.json();
    console.log('✓ Response OK:', data2.ok);
    console.log('✓ Floor area updated:', data2.result?.metrics?.floor_area_m2 === 150);
    console.log('✓ Storeys updated:', data2.result?.metrics?.storeys === 2);
    console.log();
  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
  }

  // Test 3: Recalculation with U-value overrides
  console.log('Test 3: Recalculation with U-value overrides');
  try {
    const response3 = await fetch(`${BASE_URL}/api/recalc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enriched: {
          metrics: { floor_area_m2: 100 },
          u_values: { wall: 0.3, roof: 0.2 }
        },
        overrides: {
          u_values: { wall: 0.15, roof: 0.12 }
        }
      })
    });
    const data3 = await response3.json();
    console.log('✓ Response OK:', data3.ok);
    console.log('✓ Wall U-value updated:', data3.result?.u_values?.wall === 0.15);
    console.log('✓ Roof U-value updated:', data3.result?.u_values?.roof === 0.12);
    console.log();
  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
  }

  // Test 4: Error handling - missing enriched field
  console.log('Test 4: Error handling - missing enriched field');
  try {
    const response4 = await fetch(`${BASE_URL}/api/recalc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data4 = await response4.json();
    console.log('✓ Error response:', !data4.ok);
    console.log('✓ Has error message:', !!data4.error);
    console.log('✓ Error message:', data4.error);
    console.log();
  } catch (error) {
    console.error('✗ Test 4 failed:', error.message);
  }

  // Test 5: Materials override
  console.log('Test 5: Materials override');
  try {
    const response5 = await fetch(`${BASE_URL}/api/recalc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enriched: {
          metrics: { floor_area_m2: 100 },
          materials: [
            { item: 'Bricks', quantity: 5000, unit: 'no' }
          ]
        },
        overrides: {
          materials: [
            { index: 0, item: 'Premium Bricks', quantity: 6000, unit: 'no' }
          ]
        }
      })
    });
    const data5 = await response5.json();
    console.log('✓ Response OK:', data5.ok);
    console.log('✓ Material updated:', data5.result?.materials?.[0]?.item === 'Premium Bricks');
    console.log('✓ Quantity updated:', data5.result?.materials?.[0]?.quantity === 6000);
    console.log();
  } catch (error) {
    console.error('✗ Test 5 failed:', error.message);
  }

  // Test 6: Wiring override
  console.log('Test 6: Wiring override');
  try {
    const response6 = await fetch(`${BASE_URL}/api/recalc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enriched: {
          metrics: { floor_area_m2: 100 },
          wiring: [
            { room: 'Living Room', sockets: 6, light_points: 3 }
          ]
        },
        overrides: {
          wiring: [
            { room: 'Kitchen', sockets: 8, light_points: 4 }
          ]
        }
      })
    });
    const data6 = await response6.json();
    console.log('✓ Response OK:', data6.ok);
    console.log('✓ Original room preserved:', data6.result?.wiring?.some(w => w.room === 'Living Room'));
    console.log('✓ New room added:', data6.result?.wiring?.some(w => w.room === 'Kitchen'));
    console.log();
  } catch (error) {
    console.error('✗ Test 6 failed:', error.message);
  }

  console.log('All tests completed!');
};

// Run tests if this is the main module
if (require.main === module) {
  testRecalc().catch(console.error);
}

module.exports = { testRecalc };
