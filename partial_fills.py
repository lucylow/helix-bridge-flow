import hashlib
import time
import json
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

# Partial fills blueprint
partial_fills_bp = Blueprint('partial_fills', __name__)

# In-memory storage for partial fill orders
partial_orders = {}

class PartialFillManager:
    def __init__(self):
        pass
    
    def create_partial_order(self, order_data):
        """Create a new partial fill order"""
        try:
            order_id = hashlib.sha256(f"{order_data['maker']}{time.time()}".encode()).hexdigest()
            
            # Generate Merkle root for 4 levels (25%, 50%, 75%, 100%)
            secrets = [hashlib.sha256(f"secret_{i}_{order_id}".encode()).digest() for i in range(4)]
            merkle_root = self.calculate_merkle_root(secrets)
            
            order = {
                'id': order_id,
                'maker': order_data['maker'],
                'total_amount': float(order_data['amount']),
                'filled_amount': 0.0,
                'merkle_root': merkle_root.hex(),
                'current_fill_level': 0,
                'status': 'open',
                'maker_denom': order_data['from_token'],
                'taker_denom': order_data['to_token'],
                'expiration': int(time.time()) + int(order_data.get('timelock', 3600)),
                'chain_references': [],
                'secrets': [s.hex() for s in secrets],  # Store for demo
                'fill_operations': []
            }
            
            partial_orders[order_id] = order
            return {'success': True, 'order': order}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def calculate_merkle_root(self, secrets):
        """Calculate Merkle root from secrets"""
        if len(secrets) != 4:
            raise ValueError("Exactly 4 secrets required")
        
        # Simple Merkle tree calculation
        level1 = [
            hashlib.sha256(secrets[0] + secrets[1]).digest(),
            hashlib.sha256(secrets[2] + secrets[3]).digest()
        ]
        root = hashlib.sha256(level1[0] + level1[1]).digest()
        return root
    
    def execute_partial_fill(self, order_id, resolver, secret_index):
        """Execute a partial fill operation"""
        try:
            if order_id not in partial_orders:
                return {'success': False, 'error': 'Order not found'}
            
            order = partial_orders[order_id]
            
            # Validate state
            if order['status'] in ['settled', 'expired']:
                return {'success': False, 'error': f'Order in terminal state: {order["status"]}'}
            
            if time.time() > order['expiration']:
                order['status'] = 'expired'
                return {'success': False, 'error': 'Order expired'}
            
            if order['current_fill_level'] >= 4:
                return {'success': False, 'error': 'Order already completed'}
            
            # Calculate fill amount based on level
            fill_amounts = [0.25, 0.25, 0.25, 0.25]  # 25% increments
            if order['current_fill_level'] == 3:  # Last fill
                fill_amount = order['total_amount'] - order['filled_amount']
            else:
                fill_amount = order['total_amount'] * fill_amounts[order['current_fill_level']]
            
            # Update order state
            order['filled_amount'] += fill_amount
            order['current_fill_level'] += 1
            
            # Update status
            if order['filled_amount'] < order['total_amount']:
                order['status'] = 'partially_filled'
            elif order['filled_amount'] >= order['total_amount']:
                order['status'] = 'filled'
            
            # Record operation
            operation = {
                'type': 'partial',
                'resolver': resolver,
                'amount': fill_amount,
                'secret_index': secret_index,
                'timestamp': int(time.time() * 1000),
                'block_height': 12345 + len(order['fill_operations'])  # Simulated
            }
            order['fill_operations'].append(operation)
            
            return {
                'success': True,
                'fill_amount': fill_amount,
                'order': order,
                'operation': operation
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def complete_order(self, order_id, resolver):
        """Complete a fully filled order"""
        try:
            if order_id not in partial_orders:
                return {'success': False, 'error': 'Order not found'}
            
            order = partial_orders[order_id]
            
            if order['status'] != 'filled':
                return {'success': False, 'error': 'Order must be fully filled before completion'}
            
            # Update to settled status
            order['status'] = 'settled'
            order['current_fill_level'] = 5  # Completion level
            
            # Record completion operation
            operation = {
                'type': 'completion',
                'resolver': resolver,
                'amount': 0,
                'timestamp': int(time.time() * 1000),
                'block_height': 12345 + len(order['fill_operations'])
            }
            order['fill_operations'].append(operation)
            
            return {
                'success': True,
                'message': 'Order completed successfully',
                'order': order
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

partial_manager = PartialFillManager()

@partial_fills_bp.route('/create', methods=['POST'])
@cross_origin()
def create_partial_order():
    """Create a new partial fill order"""
    try:
        data = request.get_json()
        
        required_fields = ['maker', 'amount', 'from_token', 'to_token']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        result = partial_manager.create_partial_order(data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@partial_fills_bp.route('/fill', methods=['POST'])
@cross_origin()
def execute_partial_fill():
    """Execute a partial fill operation"""
    try:
        data = request.get_json()
        
        if 'order_id' not in data or 'resolver' not in data:
            return jsonify({'error': 'Missing order_id or resolver'}), 400
        
        secret_index = data.get('secret_index', 0)
        
        result = partial_manager.execute_partial_fill(
            data['order_id'],
            data['resolver'],
            secret_index
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@partial_fills_bp.route('/complete', methods=['POST'])
@cross_origin()
def complete_order():
    """Complete a fully filled order"""
    try:
        data = request.get_json()
        
        if 'order_id' not in data or 'resolver' not in data:
            return jsonify({'error': 'Missing order_id or resolver'}), 400
        
        result = partial_manager.complete_order(
            data['order_id'],
            data['resolver']
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@partial_fills_bp.route('/orders', methods=['GET'])
@cross_origin()
def list_partial_orders():
    """List all partial fill orders"""
    try:
        return jsonify({
            'success': True,
            'orders': list(partial_orders.values()),
            'total': len(partial_orders)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@partial_fills_bp.route('/orders/<order_id>', methods=['GET'])
@cross_origin()
def get_order_details(order_id):
    """Get detailed information about a specific order"""
    try:
        if order_id not in partial_orders:
            return jsonify({'error': 'Order not found'}), 404
        
        order = partial_orders[order_id]
        
        # Calculate progress
        progress_percentage = (order['filled_amount'] / order['total_amount']) * 100
        time_remaining = max(0, order['expiration'] - int(time.time()))
        
        return jsonify({
            'success': True,
            'order': order,
            'progress_percentage': progress_percentage,
            'time_remaining': time_remaining,
            'next_fill_amount': calculate_next_fill_amount(order),
            'can_fill': can_execute_fill(order),
            'can_complete': can_complete_order(order)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

def calculate_next_fill_amount(order):
    """Calculate the amount for the next fill operation"""
    if order['current_fill_level'] >= 4:
        return 0
    
    if order['current_fill_level'] == 3:  # Last fill
        return order['total_amount'] - order['filled_amount']
    else:
        return order['total_amount'] * 0.25

def can_execute_fill(order):
    """Check if a fill operation can be executed"""
    return (
        order['status'] in ['open', 'partially_filled'] and
        order['current_fill_level'] < 4 and
        time.time() <= order['expiration']
    )

def can_complete_order(order):
    """Check if an order can be completed"""
    return (
        order['status'] == 'filled' and
        order['current_fill_level'] == 4 and
        time.time() <= order['expiration']
    )

