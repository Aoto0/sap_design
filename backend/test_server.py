"""
Unit tests for the SAP Design API server.
"""

import unittest
import json
from server import app, merge_overrides, postprocess_enriched_data


class TestRecalcEndpoint(unittest.TestCase):
    """Test cases for /api/recalc endpoint."""
    
    def setUp(self):
        """Set up test client."""
        self.app = app.test_client()
        self.app.testing = True
    
    def test_recalc_with_metrics_override(self):
        """Test recalculation with metrics overrides."""
        payload = {
            'source_raw': {
                'metrics': {
                    'floor_area_m2': 80,
                    'wall_area_m2': 120,
                    'roof_area_m2': 85
                }
            },
            'overrides': {
                'metrics': {
                    'floor_area_m2': 100
                }
            }
        }
        
        response = self.app.post(
            '/api/recalc',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['ok'])
        self.assertEqual(data['result']['metrics']['floor_area_m2'], 100)
        self.assertEqual(data['result']['metrics']['wall_area_m2'], 120)
    
    def test_recalc_with_u_values_override(self):
        """Test recalculation with U-values overrides."""
        payload = {
            'source_raw': {
                'u_values': {
                    'wall': 0.18,
                    'roof': 0.16,
                    'floor': 0.16
                }
            },
            'overrides': {
                'u_values': {
                    'wall': 0.15,
                    'roof': 0.14
                }
            }
        }
        
        response = self.app.post(
            '/api/recalc',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['ok'])
        self.assertEqual(data['result']['u_values']['wall'], 0.15)
        self.assertEqual(data['result']['u_values']['roof'], 0.14)
        self.assertEqual(data['result']['u_values']['floor'], 0.16)
    
    def test_recalc_with_materials_override(self):
        """Test recalculation with materials overrides."""
        payload = {
            'source_raw': {
                'materials': [
                    {'item': 'Bricks', 'quantity': 5000, 'unit': 'units'}
                ]
            },
            'overrides': {
                'materials': [
                    {'item': 'Bricks', 'quantity': 6000, 'unit': 'units'},
                    {'item': 'Concrete', 'quantity': 50, 'unit': 'm3'}
                ]
            }
        }
        
        response = self.app.post(
            '/api/recalc',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['ok'])
        self.assertEqual(len(data['result']['materials']), 2)
        self.assertEqual(data['result']['materials'][0]['quantity'], 6000)
    
    def test_recalc_with_wiring_override(self):
        """Test recalculation with wiring overrides."""
        payload = {
            'source_raw': {
                'wiring': [
                    {'room': 'Kitchen', 'sockets': 4, 'light_points': 6}
                ]
            },
            'overrides': {
                'wiring': [
                    {'room': 'Kitchen', 'sockets': 6, 'light_points': 8},
                    {'room': 'Living Room', 'sockets': 4, 'light_points': 4}
                ]
            }
        }
        
        response = self.app.post(
            '/api/recalc',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['ok'])
        self.assertEqual(len(data['result']['wiring']), 2)
        self.assertEqual(data['result']['wiring'][0]['sockets'], 6)
    
    def test_recalc_without_overrides(self):
        """Test recalculation without overrides."""
        payload = {
            'source_raw': {
                'metrics': {
                    'floor_area_m2': 80
                }
            }
        }
        
        response = self.app.post(
            '/api/recalc',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['ok'])
        self.assertEqual(data['result']['metrics']['floor_area_m2'], 80)
    
    def test_recalc_missing_source_raw(self):
        """Test recalculation with missing source_raw."""
        payload = {
            'overrides': {
                'metrics': {
                    'floor_area_m2': 100
                }
            }
        }
        
        response = self.app.post(
            '/api/recalc',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data['ok'])
        self.assertIn('source_raw', data['error'])
    
    def test_recalc_invalid_json(self):
        """Test recalculation with invalid JSON."""
        response = self.app.post(
            '/api/recalc',
            data='invalid json',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data['ok'])


class TestMergeOverrides(unittest.TestCase):
    """Test cases for merge_overrides function."""
    
    def test_merge_metrics(self):
        """Test merging metrics overrides."""
        source = {
            'metrics': {
                'floor_area_m2': 80,
                'wall_area_m2': 120
            }
        }
        overrides = {
            'metrics': {
                'floor_area_m2': 100
            }
        }
        
        result = merge_overrides(source, overrides)
        
        self.assertEqual(result['metrics']['floor_area_m2'], 100)
        self.assertEqual(result['metrics']['wall_area_m2'], 120)
    
    def test_merge_new_metrics(self):
        """Test merging metrics when source has no metrics."""
        source = {}
        overrides = {
            'metrics': {
                'floor_area_m2': 100
            }
        }
        
        result = merge_overrides(source, overrides)
        
        self.assertEqual(result['metrics']['floor_area_m2'], 100)
    
    def test_merge_materials_replaces_array(self):
        """Test that materials override replaces entire array."""
        source = {
            'materials': [
                {'item': 'Bricks', 'quantity': 5000}
            ]
        }
        overrides = {
            'materials': [
                {'item': 'Concrete', 'quantity': 50}
            ]
        }
        
        result = merge_overrides(source, overrides)
        
        self.assertEqual(len(result['materials']), 1)
        self.assertEqual(result['materials'][0]['item'], 'Concrete')
    
    def test_merge_no_overrides(self):
        """Test merging with no overrides."""
        source = {
            'metrics': {
                'floor_area_m2': 80
            }
        }
        
        result = merge_overrides(source, {})
        
        self.assertEqual(result['metrics']['floor_area_m2'], 80)


class TestPostprocessEnrichedData(unittest.TestCase):
    """Test cases for postprocess_enriched_data function."""
    
    def test_calculate_total_area(self):
        """Test calculation of total area."""
        data = {
            'metrics': {
                'floor_area_m2': 80,
                'wall_area_m2': 120,
                'roof_area_m2': 85,
                'window_area_m2': 15
            }
        }
        
        result = postprocess_enriched_data(data)
        
        self.assertEqual(result['total_area_m2'], 300)
    
    def test_calculate_average_u_value(self):
        """Test calculation of average U-value."""
        data = {
            'u_values': {
                'wall': 0.18,
                'roof': 0.16,
                'floor': 0.16
            }
        }
        
        result = postprocess_enriched_data(data)
        
        self.assertAlmostEqual(result['average_u_value'], 0.1667, places=4)
    
    def test_calculate_total_material_quantity(self):
        """Test calculation of total material quantity."""
        data = {
            'materials': [
                {'item': 'Bricks', 'quantity': 5000},
                {'item': 'Concrete', 'quantity': 50}
            ]
        }
        
        result = postprocess_enriched_data(data)
        
        self.assertEqual(result['total_material_quantity'], 5050)
    
    def test_calculate_total_electrical_points(self):
        """Test calculation of total electrical points."""
        data = {
            'wiring': [
                {'room': 'Kitchen', 'sockets': 6, 'light_points': 8},
                {'room': 'Living Room', 'sockets': 4, 'light_points': 4}
            ]
        }
        
        result = postprocess_enriched_data(data)
        
        self.assertEqual(result['total_sockets'], 10)
        self.assertEqual(result['total_light_points'], 12)
    
    def test_adds_timestamp(self):
        """Test that processing adds a timestamp."""
        data = {}
        
        result = postprocess_enriched_data(data)
        
        self.assertIn('processed_at', result)
        self.assertTrue(result['processed_at'].endswith('Z'))


class TestHealthEndpoint(unittest.TestCase):
    """Test cases for /api/health endpoint."""
    
    def setUp(self):
        """Set up test client."""
        self.app = app.test_client()
        self.app.testing = True
    
    def test_health_check(self):
        """Test health check endpoint."""
        response = self.app.get('/api/health')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['service'], 'sap-design-api')


if __name__ == '__main__':
    unittest.main()
