import hashlib
import time
import json
import secrets
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

# Resolver blueprint
resolver_bp = Blueprint('resolver', __name__)

# In-memory storage for resolver operations
resolver_inventory = {
    'ethereum': {'ETH': 10.0, 'USDC': 50000.0, 'DAI': 25000.0},
    'cosmos': {'ATOM': 1000.0, 'OSMO': 5000.0, 'JUNO': 2000.0}
}

resolver_stats = {
    'total_resolved': 0,
    'successful_resolutions': 0,
    'failed_resolutions': 0,
    'total_profit': 0.0,
    'active_swaps': 0,
    'risk_exposure': 0.0
}

active_swaps = {}
secret_cache = {}

class ResolverManager:
    def __init__(self):
        self.min_profit_margin = 0.02  # 2% minimum profit
        self.max_risk_exposure = 0.7   # 70% max risk
        self.fee_rate = 0.003          # 0.3% resolver fee
    
    def evaluate_opportunity(self, order_data):
        """Evaluate swap opportunity for profitability and risk"""
        try:
            order_id = order_data['order_id']
            from_chain = order_data['from_chain']
            to_chain = order_data['to_chain']
            from_token = order_data['from_token']
            to_token = order_data['to_token']
            amount = float(order_data['amount'])
            
            # Calculate profit score
            profit_score = self.calculate_profit_score(order_data)
            
            # Calculate risk score
            risk_score = self.calculate_risk_score(order_data)
            
            # Check inventory availability
            inventory_check = self.check_inventory_availability(from_chain, from_token, amount)
            
            # Decision logic
            can_resolve = (
                profit_score > 1.0 and 
                risk_score < self.max_risk_exposure and
                inventory_check
            )
            
            evaluation = {
                'order_id': order_id,
                'can_resolve': can_resolve,
                'profit_score': profit_score,
                'risk_score': risk_score,
                'inventory_available': inventory_check,
                'estimated_profit': amount * self.fee_rate,
                'execution_time': 300,  # 5 minutes estimated
                'gas_cost': 0.01,       # Estimated gas cost
                'recommendation': 'execute' if can_resolve else 'skip'
            }
            
            return {'success': True, 'evaluation': evaluation}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def calculate_profit_score(self, order_data):
        """Calculate profitability score for the order"""
        amount = float(order_data['amount'])
        
        # Base profit from resolver fee
        base_profit = amount * self.fee_rate
        
        # Market spread analysis (simulated)
        market_spread = 0.005  # 0.5% typical spread
        spread_profit = amount * market_spread
        
        # Gas costs (estimated)
        gas_cost = 0.01
        
        # Net profit
        net_profit = base_profit + spread_profit - gas_cost
        
        # Profit score (1.0 = break-even, >1.0 = profitable)
        profit_score = (net_profit / gas_cost) if gas_cost > 0 else 0
        
        return max(0, profit_score)
    
    def calculate_risk_score(self, order_data):
        """Calculate risk score for the order"""
        amount = float(order_data['amount'])
        
        # Inventory risk (percentage of total inventory)
        from_chain = order_data['from_chain']
        from_token = order_data['from_token']
        
        if from_chain in resolver_inventory and from_token in resolver_inventory[from_chain]:
            inventory_amount = resolver_inventory[from_chain][from_token]
            inventory_risk = amount / inventory_amount if inventory_amount > 0 else 1.0
        else:
            inventory_risk = 1.0
        
        # Time risk (closer to expiration = higher risk)
        expiration = order_data.get('expiration', int(time.time()) + 3600)
        time_remaining = expiration - int(time.time())
        time_risk = 1.0 - (time_remaining / 3600)  # Normalize to 1 hour
        
        # Market volatility risk (simulated)
        volatility_risk = 0.1  # 10% base volatility
        
        # Combined risk score
        total_risk = min(1.0, inventory_risk * 0.5 + time_risk * 0.3 + volatility_risk * 0.2)
        
        return total_risk
    
    def check_inventory_availability(self, chain, token, amount):
        """Check if resolver has sufficient inventory"""
        if chain not in resolver_inventory:
            return False
        
        if token not in resolver_inventory[chain]:
            return False
        
        available = resolver_inventory[chain][token]
        return available >= amount
    
    def execute_resolution(self, order_data):
        """Execute swap resolution"""
        try:
            order_id = order_data['order_id']
            
            # Generate secret for atomic swap
            secret = secrets.token_bytes(32)
            secret_hash = hashlib.sha256(secret).digest()
            
            # Create resolution record
            resolution = {
                'id': hashlib.sha256(f"resolution_{order_id}_{time.time()}".encode()).hexdigest(),
                'order_id': order_id,
                'resolver_address': 'resolver1abc123def456',
                'secret': secret.hex(),
                'secret_hash': secret_hash.hex(),
                'status': 'executing',
                'created_at': int(time.time() * 1000),
                'estimated_completion': int(time.time() * 1000) + 300000,  # 5 minutes
                'profit_estimate': float(order_data['amount']) * self.fee_rate,
                'gas_cost': 0.01,
                'steps': [
                    {'step': 'create_ethereum_escrow', 'status': 'pending'},
                    {'step': 'create_cosmos_escrow', 'status': 'pending'},
                    {'step': 'reveal_secret', 'status': 'pending'},
                    {'step': 'claim_funds', 'status': 'pending'}
                ]
            }
            
            # Store in active swaps
            active_swaps[order_id] = resolution
            secret_cache[secret_hash.hex()] = secret.hex()
            
            # Update stats
            resolver_stats['active_swaps'] += 1
            resolver_stats['total_resolved'] += 1
            
            # Update inventory (reserve funds)
            from_chain = order_data['from_chain']
            from_token = order_data['from_token']
            amount = float(order_data['amount'])
            
            if from_chain in resolver_inventory and from_token in resolver_inventory[from_chain]:
                resolver_inventory[from_chain][from_token] -= amount
            
            return {'success': True, 'resolution': resolution}
            
        except Exception as e:
            resolver_stats['failed_resolutions'] += 1
            return {'success': False, 'error': str(e)}
    
    def complete_resolution(self, order_id):
        """Complete a resolution and claim profits"""
        try:
            if order_id not in active_swaps:
                return {'success': False, 'error': 'Resolution not found'}
            
            resolution = active_swaps[order_id]
            
            if resolution['status'] != 'executing':
                return {'success': False, 'error': f'Resolution not in executing state: {resolution["status"]}'}
            
            # Update resolution status
            resolution['status'] = 'completed'
            resolution['completed_at'] = int(time.time() * 1000)
            
            # Update all steps to completed
            for step in resolution['steps']:
                step['status'] = 'completed'
            
            # Calculate actual profit
            actual_profit = resolution['profit_estimate'] - resolution['gas_cost']
            resolution['actual_profit'] = actual_profit
            
            # Update stats
            resolver_stats['successful_resolutions'] += 1
            resolver_stats['total_profit'] += actual_profit
            resolver_stats['active_swaps'] -= 1
            
            # Clean up
            del active_swaps[order_id]
            
            return {'success': True, 'resolution': resolution}
            
        except Exception as e:
            resolver_stats['failed_resolutions'] += 1
            return {'success': False, 'error': str(e)}

resolver_manager = ResolverManager()

@resolver_bp.route('/evaluate', methods=['POST'])
@cross_origin()
def evaluate_opportunity():
    """Evaluate a swap opportunity"""
    try:
        data = request.get_json()
        
        required_fields = ['order_id', 'from_chain', 'to_chain', 'from_token', 'to_token', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        result = resolver_manager.evaluate_opportunity(data)
        
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

@resolver_bp.route('/execute', methods=['POST'])
@cross_origin()
def execute_resolution():
    """Execute a swap resolution"""
    try:
        data = request.get_json()
        
        required_fields = ['order_id', 'from_chain', 'to_chain', 'from_token', 'to_token', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # First evaluate the opportunity
        evaluation = resolver_manager.evaluate_opportunity(data)
        if not evaluation['success'] or not evaluation['evaluation']['can_resolve']:
            return jsonify({
                'success': False,
                'error': 'Opportunity not profitable or too risky',
                'evaluation': evaluation.get('evaluation')
            }), 400
        
        # Execute the resolution
        result = resolver_manager.execute_resolution(data)
        
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

@resolver_bp.route('/complete/<order_id>', methods=['POST'])
@cross_origin()
def complete_resolution(order_id):
    """Complete a resolution"""
    try:
        result = resolver_manager.complete_resolution(order_id)
        
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

@resolver_bp.route('/resolutions', methods=['GET'])
@cross_origin()
def list_resolutions():
    """List all active resolutions"""
    try:
        return jsonify({
            'success': True,
            'active_resolutions': list(active_swaps.values()),
            'total_active': len(active_swaps),
            'stats': resolver_stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@resolver_bp.route('/resolutions/<order_id>', methods=['GET'])
@cross_origin()
def get_resolution_details(order_id):
    """Get details of a specific resolution"""
    try:
        if order_id not in active_swaps:
            return jsonify({'error': 'Resolution not found'}), 404
        
        resolution = active_swaps[order_id]
        
        # Calculate progress
        completed_steps = sum(1 for step in resolution['steps'] if step['status'] == 'completed')
        total_steps = len(resolution['steps'])
        progress = (completed_steps / total_steps) * 100
        
        return jsonify({
            'success': True,
            'resolution': resolution,
            'progress': progress,
            'estimated_time_remaining': max(0, resolution['estimated_completion'] - int(time.time() * 1000))
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@resolver_bp.route('/inventory', methods=['GET'])
@cross_origin()
def get_inventory():
    """Get current resolver inventory"""
    try:
        # Calculate total value (simplified)
        total_value = 0
        for chain, tokens in resolver_inventory.items():
            for token, amount in tokens.items():
                # Simplified price calculation
                price = {'ETH': 2000, 'USDC': 1, 'DAI': 1, 'ATOM': 10, 'OSMO': 0.5, 'JUNO': 2}.get(token, 1)
                total_value += amount * price
        
        return jsonify({
            'success': True,
            'inventory': resolver_inventory,
            'total_value_usd': total_value,
            'utilization': resolver_stats['risk_exposure'],
            'last_updated': int(time.time() * 1000)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@resolver_bp.route('/stats', methods=['GET'])
@cross_origin()
def get_resolver_stats():
    """Get resolver performance statistics"""
    try:
        success_rate = 0
        if resolver_stats['total_resolved'] > 0:
            success_rate = (resolver_stats['successful_resolutions'] / resolver_stats['total_resolved']) * 100
        
        avg_profit = 0
        if resolver_stats['successful_resolutions'] > 0:
            avg_profit = resolver_stats['total_profit'] / resolver_stats['successful_resolutions']
        
        return jsonify({
            'success': True,
            'stats': {
                **resolver_stats,
                'success_rate': round(success_rate, 2),
                'average_profit': round(avg_profit, 6),
                'profit_margin': resolver_manager.fee_rate * 100,
                'max_risk_exposure': resolver_manager.max_risk_exposure * 100
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

