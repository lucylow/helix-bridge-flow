import hashlib
import time
import json
import random
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

# Intent routing blueprint
intent_bp = Blueprint('intent', __name__)

# Simulated Cosmos DEX data
cosmos_dexes = {
    'osmosis': {
        'name': 'Osmosis',
        'pools': {
            'ATOM/OSMO': {'liquidity': 2000000, 'fee': 0.002, 'price': 0.5},
            'ATOM/JUNO': {'liquidity': 800000, 'fee': 0.003, 'price': 5.0},
            'OSMO/JUNO': {'liquidity': 1200000, 'fee': 0.0025, 'price': 10.0},
            'ATOM/USDC': {'liquidity': 5000000, 'fee': 0.001, 'price': 10.0}
        },
        'gas_cost': 150000,
        'success_rate': 0.98
    },
    'crescent': {
        'name': 'Crescent',
        'pools': {
            'ATOM/OSMO': {'liquidity': 1500000, 'fee': 0.0025, 'price': 0.51},
            'ATOM/JUNO': {'liquidity': 600000, 'fee': 0.003, 'price': 4.95},
            'ATOM/USDC': {'liquidity': 3000000, 'fee': 0.0015, 'price': 9.98}
        },
        'gas_cost': 120000,
        'success_rate': 0.96
    },
    'junoswap': {
        'name': 'JunoSwap',
        'pools': {
            'JUNO/OSMO': {'liquidity': 900000, 'fee': 0.003, 'price': 0.1},
            'JUNO/ATOM': {'liquidity': 700000, 'fee': 0.0035, 'price': 0.2},
            'JUNO/USDC': {'liquidity': 1800000, 'fee': 0.002, 'price': 2.0}
        },
        'gas_cost': 100000,
        'success_rate': 0.94
    }
}

# Intent routing network
routing_network = {
    'resolvers': [
        {'id': 'resolver_1', 'reputation': 0.95, 'avg_execution_time': 45},
        {'id': 'resolver_2', 'reputation': 0.92, 'avg_execution_time': 38},
        {'id': 'resolver_3', 'reputation': 0.98, 'avg_execution_time': 52}
    ],
    'active_intents': {},
    'execution_history': []
}

class IntentRoutingManager:
    def __init__(self):
        pass
    
    def create_swap_intent(self, intent_data):
        """Create a new swap intent for Cosmos liquidity routing"""
        try:
            intent_id = hashlib.sha256(f"{intent_data}{time.time()}".encode()).hexdigest()[:16]
            
            # Analyze the intent and find optimal routes
            routes = self.find_optimal_routes(
                intent_data['from_token'],
                intent_data['to_token'],
                float(intent_data['amount'])
            )
            
            intent = {
                'intent_id': intent_id,
                'from_token': intent_data['from_token'],
                'to_token': intent_data['to_token'],
                'amount': float(intent_data['amount']),
                'min_receive': float(intent_data.get('min_receive', 0)),
                'max_slippage': float(intent_data.get('max_slippage', 0.05)),
                'deadline': int(time.time()) + int(intent_data.get('deadline', 600)),  # 10 min default
                'status': 'pending',
                'created_at': int(time.time() * 1000),
                'optimal_routes': routes,
                'selected_route': None,
                'resolver_bids': []
            }
            
            routing_network['active_intents'][intent_id] = intent
            
            return {'success': True, 'intent': intent}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def find_optimal_routes(self, from_token, to_token, amount):
        """Find optimal routing paths across Cosmos DEXes"""
        routes = []
        
        # Direct routes (single hop)
        for dex_id, dex_data in cosmos_dexes.items():
            pair_key = f"{from_token}/{to_token}"
            reverse_pair = f"{to_token}/{from_token}"
            
            pool = dex_data['pools'].get(pair_key) or dex_data['pools'].get(reverse_pair)
            if pool:
                # Calculate output amount considering fees and slippage
                fee_amount = amount * pool['fee']
                price_impact = self.calculate_price_impact(amount, pool['liquidity'])
                output_amount = (amount - fee_amount) * pool['price'] * (1 - price_impact)
                
                route = {
                    'type': 'direct',
                    'dex': dex_id,
                    'dex_name': dex_data['name'],
                    'path': [from_token, to_token],
                    'estimated_output': round(output_amount, 6),
                    'fee_amount': round(fee_amount, 6),
                    'price_impact': round(price_impact * 100, 4),
                    'gas_cost': dex_data['gas_cost'],
                    'success_rate': dex_data['success_rate'],
                    'execution_time': random.randint(30, 90)  # seconds
                }
                routes.append(route)
        
        # Multi-hop routes (through intermediate tokens)
        intermediate_tokens = ['ATOM', 'OSMO', 'USDC']
        for intermediate in intermediate_tokens:
            if intermediate != from_token and intermediate != to_token:
                multi_hop_route = self.find_multi_hop_route(from_token, to_token, amount, intermediate)
                if multi_hop_route:
                    routes.append(multi_hop_route)
        
        # Sort routes by estimated output (descending)
        routes.sort(key=lambda x: x['estimated_output'], reverse=True)
        
        return routes[:5]  # Return top 5 routes
    
    def find_multi_hop_route(self, from_token, to_token, amount, intermediate):
        """Find multi-hop route through intermediate token"""
        try:
            best_route = None
            best_output = 0
            
            for dex1_id, dex1_data in cosmos_dexes.items():
                for dex2_id, dex2_data in cosmos_dexes.items():
                    # First hop: from_token -> intermediate
                    pair1 = f"{from_token}/{intermediate}"
                    reverse_pair1 = f"{intermediate}/{from_token}"
                    pool1 = dex1_data['pools'].get(pair1) or dex1_data['pools'].get(reverse_pair1)
                    
                    # Second hop: intermediate -> to_token
                    pair2 = f"{intermediate}/{to_token}"
                    reverse_pair2 = f"{to_token}/{intermediate}"
                    pool2 = dex2_data['pools'].get(pair2) or dex2_data['pools'].get(reverse_pair2)
                    
                    if pool1 and pool2:
                        # Calculate first hop
                        fee1 = amount * pool1['fee']
                        impact1 = self.calculate_price_impact(amount, pool1['liquidity'])
                        intermediate_amount = (amount - fee1) * pool1['price'] * (1 - impact1)
                        
                        # Calculate second hop
                        fee2 = intermediate_amount * pool2['fee']
                        impact2 = self.calculate_price_impact(intermediate_amount, pool2['liquidity'])
                        final_amount = (intermediate_amount - fee2) * pool2['price'] * (1 - impact2)
                        
                        if final_amount > best_output:
                            best_output = final_amount
                            best_route = {
                                'type': 'multi_hop',
                                'path': [from_token, intermediate, to_token],
                                'hops': [
                                    {'dex': dex1_id, 'dex_name': dex1_data['name'], 'pair': pair1},
                                    {'dex': dex2_id, 'dex_name': dex2_data['name'], 'pair': pair2}
                                ],
                                'estimated_output': round(final_amount, 6),
                                'total_fees': round(fee1 + fee2, 6),
                                'total_price_impact': round((impact1 + impact2) * 100, 4),
                                'gas_cost': dex1_data['gas_cost'] + dex2_data['gas_cost'],
                                'success_rate': dex1_data['success_rate'] * dex2_data['success_rate'],
                                'execution_time': random.randint(60, 150)
                            }
            
            return best_route
            
        except Exception as e:
            return None
    
    def calculate_price_impact(self, amount, liquidity):
        """Calculate price impact based on AMM model"""
        if liquidity <= 0:
            return 0.5  # High impact for low liquidity
        
        # Simplified constant product formula impact
        impact = amount / (liquidity * 2)  # Simplified calculation
        return min(impact, 0.3)  # Cap at 30% impact
    
    def submit_resolver_bid(self, intent_id, resolver_id, bid_data):
        """Submit a resolver bid for an intent"""
        try:
            if intent_id not in routing_network['active_intents']:
                return {'success': False, 'error': 'Intent not found'}
            
            intent = routing_network['active_intents'][intent_id]
            
            if intent['status'] != 'pending':
                return {'success': False, 'error': 'Intent no longer accepting bids'}
            
            # Find resolver
            resolver = next((r for r in routing_network['resolvers'] if r['id'] == resolver_id), None)
            if not resolver:
                return {'success': False, 'error': 'Resolver not found'}
            
            bid = {
                'resolver_id': resolver_id,
                'resolver_reputation': resolver['reputation'],
                'guaranteed_output': float(bid_data['guaranteed_output']),
                'execution_time': int(bid_data.get('execution_time', 60)),
                'gas_fee': float(bid_data.get('gas_fee', 0.01)),
                'selected_route': bid_data.get('selected_route'),
                'bid_timestamp': int(time.time() * 1000)
            }
            
            intent['resolver_bids'].append(bid)
            
            return {'success': True, 'bid': bid}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def select_best_resolver(self, intent_id):
        """Select the best resolver bid for an intent"""
        try:
            if intent_id not in routing_network['active_intents']:
                return {'success': False, 'error': 'Intent not found'}
            
            intent = routing_network['active_intents'][intent_id]
            
            if not intent['resolver_bids']:
                return {'success': False, 'error': 'No resolver bids available'}
            
            # Score bids based on multiple factors
            best_bid = None
            best_score = 0
            
            for bid in intent['resolver_bids']:
                # Scoring formula: output * reputation / (execution_time * gas_fee)
                score = (
                    bid['guaranteed_output'] * 0.4 +
                    bid['resolver_reputation'] * 100 * 0.3 +
                    (1 / max(bid['execution_time'], 1)) * 1000 * 0.2 +
                    (1 / max(bid['gas_fee'], 0.001)) * 0.1
                )
                
                if score > best_score:
                    best_score = score
                    best_bid = bid
            
            if best_bid:
                intent['selected_resolver'] = best_bid
                intent['status'] = 'resolver_selected'
                intent['selection_timestamp'] = int(time.time() * 1000)
            
            return {'success': True, 'selected_bid': best_bid, 'score': best_score}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def execute_intent(self, intent_id):
        """Execute the intent with selected resolver"""
        try:
            if intent_id not in routing_network['active_intents']:
                return {'success': False, 'error': 'Intent not found'}
            
            intent = routing_network['active_intents'][intent_id]
            
            if intent['status'] != 'resolver_selected':
                return {'success': False, 'error': 'No resolver selected for intent'}
            
            # Simulate execution
            selected_bid = intent['selected_resolver']
            
            # Update intent status
            intent['status'] = 'executing'
            intent['execution_start'] = int(time.time() * 1000)
            
            # Simulate execution result
            execution_success = random.random() < selected_bid['resolver_reputation']
            
            if execution_success:
                actual_output = selected_bid['guaranteed_output'] * (0.98 + random.random() * 0.04)  # ±2% variance
                intent['status'] = 'completed'
                intent['actual_output'] = round(actual_output, 6)
            else:
                intent['status'] = 'failed'
                intent['failure_reason'] = 'Execution failed due to market conditions'
            
            intent['execution_end'] = int(time.time() * 1000)
            
            # Add to execution history
            execution_record = {
                'intent_id': intent_id,
                'resolver_id': selected_bid['resolver_id'],
                'success': execution_success,
                'timestamp': intent['execution_end']
            }
            routing_network['execution_history'].append(execution_record)
            
            return {'success': True, 'intent': intent}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

intent_manager = IntentRoutingManager()

@intent_bp.route('/create-intent', methods=['POST'])
@cross_origin()
def create_swap_intent():
    """Create a new swap intent"""
    try:
        data = request.get_json()
        
        required_fields = ['from_token', 'to_token', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        result = intent_manager.create_swap_intent(data)
        
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

@intent_bp.route('/submit-bid', methods=['POST'])
@cross_origin()
def submit_resolver_bid():
    """Submit a resolver bid for an intent"""
    try:
        data = request.get_json()
        
        intent_id = data.get('intent_id')
        resolver_id = data.get('resolver_id')
        bid_data = data.get('bid_data', {})
        
        if not all([intent_id, resolver_id]):
            return jsonify({'error': 'Missing intent_id or resolver_id'}), 400
        
        result = intent_manager.submit_resolver_bid(intent_id, resolver_id, bid_data)
        
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

@intent_bp.route('/select-resolver/<intent_id>', methods=['POST'])
@cross_origin()
def select_best_resolver(intent_id):
    """Select the best resolver for an intent"""
    try:
        result = intent_manager.select_best_resolver(intent_id)
        
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

@intent_bp.route('/execute/<intent_id>', methods=['POST'])
@cross_origin()
def execute_intent(intent_id):
    """Execute an intent"""
    try:
        result = intent_manager.execute_intent(intent_id)
        
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

@intent_bp.route('/intents', methods=['GET'])
@cross_origin()
def list_intents():
    """List all active intents"""
    try:
        return jsonify({
            'success': True,
            'active_intents': list(routing_network['active_intents'].values()),
            'total_intents': len(routing_network['active_intents']),
            'resolvers': routing_network['resolvers']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@intent_bp.route('/dex-liquidity', methods=['GET'])
@cross_origin()
def get_dex_liquidity():
    """Get current DEX liquidity information"""
    try:
        return jsonify({
            'success': True,
            'dexes': cosmos_dexes,
            'total_pools': sum(len(dex['pools']) for dex in cosmos_dexes.values()),
            'last_updated': int(time.time() * 1000)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

