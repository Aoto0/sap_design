"""
Flask API server for SAP Design application.
Provides endpoints for plan analysis and recalculation.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def merge_overrides(source_raw, overrides):
    """
    Merge user overrides with the source extraction data.
    
    Args:
        source_raw: Original extraction payload from /api/analyze-plans
        overrides: User-provided overrides for metrics, u_values, materials, wiring
        
    Returns:
        Enriched result with applied overrides
    """
    # Create a deep copy of source_raw to avoid modifying the original
    import copy
    result = copy.deepcopy(source_raw)
    
    if not overrides:
        return result
    
    # Apply metrics overrides
    if 'metrics' in overrides:
        if 'metrics' not in result:
            result['metrics'] = {}
        for key, value in overrides['metrics'].items():
            if value is not None:
                result['metrics'][key] = value
    
    # Apply u_values overrides
    if 'u_values' in overrides:
        if 'u_values' not in result:
            result['u_values'] = {}
        for key, value in overrides['u_values'].items():
            if value is not None:
                result['u_values'][key] = value
    
    # Apply materials overrides (replace entire array)
    if 'materials' in overrides:
        result['materials'] = overrides['materials']
    
    # Apply wiring overrides (replace entire array)
    if 'wiring' in overrides:
        result['wiring'] = overrides['wiring']
    
    return result


def postprocess_enriched_data(data):
    """
    Apply post-processing to enriched data.
    Calculates derived metrics, validates data, and adds computed fields.
    
    Args:
        data: Enriched data with applied overrides
        
    Returns:
        Fully processed result with all calculations applied
    """
    result = data.copy()
    
    # Calculate total areas if metrics exist
    if 'metrics' in result:
        metrics = result['metrics']
        total_area = 0
        for key in ['floor_area_m2', 'wall_area_m2', 'roof_area_m2', 'window_area_m2']:
            if key in metrics and metrics[key] is not None:
                total_area += metrics[key]
        result['total_area_m2'] = total_area
    
    # Calculate average U-value if u_values exist
    if 'u_values' in result:
        u_values = result['u_values']
        valid_u_values = [v for v in u_values.values() if v is not None]
        if valid_u_values:
            result['average_u_value'] = sum(valid_u_values) / len(valid_u_values)
    
    # Calculate total material quantity if materials exist
    if 'materials' in result:
        total_qty = 0
        for material in result['materials']:
            if 'quantity' in material and material['quantity'] is not None:
                total_qty += material['quantity']
        result['total_material_quantity'] = total_qty
    
    # Calculate total electrical points if wiring exists
    if 'wiring' in result:
        total_sockets = 0
        total_lights = 0
        for room in result['wiring']:
            if 'sockets' in room and room['sockets'] is not None:
                total_sockets += room['sockets']
            if 'light_points' in room and room['light_points'] is not None:
                total_lights += room['light_points']
        result['total_sockets'] = total_sockets
        result['total_light_points'] = total_lights
    
    # Add processing timestamp
    from datetime import datetime, timezone
    result['processed_at'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    
    return result


@app.route('/api/recalc', methods=['POST'])
def recalculate():
    """
    POST /api/recalc - Recalculate enriched data with user overrides.
    
    Does not re-upload images or call vision model.
    Only reprocesses using the postprocess pipeline with overrides.
    
    Request JSON:
        {
            "source_raw": { ... },  # Original extraction from /api/analyze-plans
            "overrides": {
                "metrics": { "floor_area_m2": 100, ... },
                "u_values": { "wall": 0.18, ... },
                "materials": [{ "item": "Brick", "quantity": 1000, "unit": "units" }],
                "wiring": [{ "room": "Kitchen", "sockets": 4, "light_points": 6 }]
            }
        }
    
    Response JSON:
        {
            "ok": true,
            "result": { ... }  # Enriched result with overrides applied
        }
    """
    try:
        # Parse request JSON
        data = request.get_json()
        
        if not data:
            return jsonify({
                'ok': False,
                'error': 'Request body must be JSON'
            }), 400
    except Exception as e:
        return jsonify({
            'ok': False,
            'error': 'Invalid JSON in request body'
        }), 400
        
    try:
        # Validate required field
        if 'source_raw' not in data:
            return jsonify({
                'ok': False,
                'error': 'Missing required field: source_raw'
            }), 400
        
        source_raw = data['source_raw']
        overrides = data.get('overrides', {})
        
        logger.info(f"Recalculating with overrides: {list(overrides.keys())}")
        
        # Step 1: Merge overrides with source data
        enriched = merge_overrides(source_raw, overrides)
        
        # Step 2: Apply post-processing
        result = postprocess_enriched_data(enriched)
        
        logger.info("Recalculation completed successfully")
        
        return jsonify({
            'ok': True,
            'result': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error in recalculate endpoint: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'sap-design-api'
    }), 200


@app.route('/api/analyze-plans', methods=['POST'])
def analyze_plans():
    """
    POST /api/analyze-plans - Analyze uploaded plans (stub for reference).
    
    This endpoint would normally process uploaded images with a vision model.
    Included as a stub to show the expected workflow.
    """
    return jsonify({
        'ok': False,
        'error': 'Not implemented - use for reference only'
    }), 501


if __name__ == '__main__':
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
