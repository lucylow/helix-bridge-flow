import hashlib
import time
import json
import random
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

# Demo endpoints blueprint
demo_bp = Blueprint('demo', __name__)

# Demo transaction data
demo_transactions = {
    'ethereum': [
        {
            'hash': '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
            'block': 4567890,
            'from': '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
            'to': '0x1234567890123456789012345678901234567890',
            'value': '0.5 ETH',
            'gas_used': 85000,
            'status': 'success',
            'timestamp': int(time.time()) - 300
        },
        {
            'hash': '0xb2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a',
            'block': 4567891,
            'from': '0x1234567890123456789012345678901234567890',
            'to': '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
            'value': '50.0 ATOM',
            'gas_used': 45000,
            'status': 'success',
            'timestamp': int(time.time()) - 180
        }
    ],
    'cosmos': [
        {
            'hash': 'cosmos1a2b3c4d5e6f7890123456789012345678901234567890123456789012345',
            'height': 9876543,
            'from': 'cosmos1abc123def456ghi789jkl012mno345pqr678stu',
            'to': 'cosmos1def456ghi789jkl012mno345pqr678stu901vwx',
            'amount': '50.0 ATOM',
            'gas_used': 150000,
            'status': 'success',
            'timestamp': int(time.time()) - 240
        },
        {
            'hash': 'cosmos2b3c4d5e6f7890123456789012345678901234567890123456789012345a',
            'height': 9876544,
            'from': 'cosmos1def456ghi789jkl012mno345pqr678stu901vwx',
            'to': 'cosmos1abc123def456ghi789jkl012mno345pqr678stu',
            'amount': '0.5 ETH',
            'gas_used': 100000,
            'status': 'success',
            'timestamp': int(time.time()) - 120
        }
    ]
}

# Demo swap scenarios
demo_scenarios = [
    {
        'id': 'scenario_1',
        'name': 'ETH to ATOM Swap',
        'description': 'Demonstrate atomic swap from Ethereum to Cosmos',
        'from_chain': 'ethereum',
        'to_chain': 'cosmos',
        'from_token': 'ETH',
        'to_token': 'ATOM',
        'amount': 0.5,
        'estimated_output': 50.0,
        'timelock': 3600,
        'status': 'ready'
    },
    {
        'id': 'scenario_2',
        'name': 'ATOM to ETH Swap',
        'description': 'Demonstrate atomic swap from Cosmos to Ethereum',
        'from_chain': 'cosmos',
        'to_chain': 'ethereum',
        'from_token': 'ATOM',
        'to_token': 'ETH',
        'amount': 100.0,
        'estimated_output': 1.0,
        'timelock': 3600,
        'status': 'ready'
    },
    {
        'id': 'scenario_3',
        'name': 'Partial Fill Demo',
        'description': 'Demonstrate partial fill functionality',
        'from_chain': 'ethereum',
        'to_chain': 'cosmos',
        'from_token': 'USDC',
        'to_token': 'OSMO',
        'amount': 1000.0,
        'estimated_output': 2000.0,
        'timelock': 7200,
        'status': 'ready',
        'partial_fills': True
    },
    {
        'id': 'scenario_4',
        'name': 'Timelock Expiry Demo',
        'description': 'Demonstrate timelock expiry and refund',
        'from_chain': 'ethereum',
        'to_chain': 'cosmos',
        'from_token': 'DAI',
        'to_token': 'JUNO',
        'amount': 500.0,
        'estimated_output': 250.0,
        'timelock': 60,  # Short timelock for demo
        'status': 'ready',
        'demo_refund': True
    }
]

# Performance metrics
performance_metrics = {
    'total_swaps': 1247,
    'successful_swaps': 1225,
    'failed_swaps': 22,
    'total_volume_usd': 2456789.50,
    'average_swap_time': 287,  # seconds
    'gas_efficiency': 0.85,
    'uptime': 0.999,
    'cross_chain_success_rate': 0.985
}

class DemoManager:
    def __init__(self):
        self.active_demos = {}
    
    def execute_demo_scenario(self, scenario_id):
        """Execute a predefined demo scenario"""
        try:
            scenario = next((s for s in demo_scenarios if s['id'] == scenario_id), None)
            if not scenario:
                return {'success': False, 'error': 'Scenario not found'}
            
            # Generate demo execution data
            execution_id = hashlib.sha256(f"{scenario_id}_{time.time()}".encode()).hexdigest()[:16]
            
            # Simulate swap creation
            swap_data = {
                'execution_id': execution_id,
                'scenario': scenario,
                'steps': [
                    {
                        'step': 'wallet_connection',
                        'status': 'completed',
                        'timestamp': int(time.time() * 1000),
                        'details': 'MetaMask and Keplr wallets connected'
                    },
                    {
                        'step': 'swap_creation',
                        'status': 'completed',
                        'timestamp': int(time.time() * 1000) + 2000,
                        'details': f'Atomic swap created for {scenario["amount"]} {scenario["from_token"]}'
                    },
                    {
                        'step': 'hashlock_generation',
                        'status': 'completed',
                        'timestamp': int(time.time() * 1000) + 3000,
                        'details': 'SHA256 hashlock generated and verified'
                    },
                    {
                        'step': 'ethereum_escrow',
                        'status': 'in_progress',
                        'timestamp': int(time.time() * 1000) + 5000,
                        'details': 'Creating escrow on Ethereum Sepolia testnet'
                    },
                    {
                        'step': 'cosmos_escrow',
                        'status': 'pending',
                        'timestamp': None,
                        'details': 'Waiting for Ethereum confirmation'
                    },
                    {
                        'step': 'secret_reveal',
                        'status': 'pending',
                        'timestamp': None,
                        'details': 'Awaiting secret revelation'
                    },
                    {
                        'step': 'completion',
                        'status': 'pending',
                        'timestamp': None,
                        'details': 'Final settlement pending'
                    }
                ],
                'estimated_completion': int(time.time() * 1000) + 300000,  # 5 minutes
                'transaction_links': {
                    'ethereum': f"https://sepolia.etherscan.io/tx/{demo_transactions['ethereum'][0]['hash']}",
                    'cosmos': f"https://www.mintscan.io/cosmos/txs/{demo_transactions['cosmos'][0]['hash']}"
                }
            }
            
            # Store active demo
            self.active_demos[execution_id] = swap_data
            
            return {'success': True, 'execution': swap_data}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def update_demo_progress(self, execution_id, step_index):
        """Update demo progress to next step"""
        try:
            if execution_id not in self.active_demos:
                return {'success': False, 'error': 'Demo execution not found'}
            
            demo = self.active_demos[execution_id]
            steps = demo['steps']
            
            if step_index >= len(steps):
                return {'success': False, 'error': 'Invalid step index'}
            
            # Update current step to completed
            if step_index > 0:
                steps[step_index - 1]['status'] = 'completed'
            
            # Update target step to in_progress
            steps[step_index]['status'] = 'in_progress'
            steps[step_index]['timestamp'] = int(time.time() * 1000)
            
            # If this is the last step, mark as completed
            if step_index == len(steps) - 1:
                steps[step_index]['status'] = 'completed'
                demo['status'] = 'completed'
            
            return {'success': True, 'demo': demo}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_demo_metrics(self):
        """Get comprehensive demo metrics"""
        try:
            # Calculate additional metrics
            success_rate = (performance_metrics['successful_swaps'] / performance_metrics['total_swaps']) * 100
            average_volume = performance_metrics['total_volume_usd'] / performance_metrics['total_swaps']
            
            metrics = {
                **performance_metrics,
                'success_rate_percent': round(success_rate, 2),
                'average_volume_per_swap': round(average_volume, 2),
                'gas_savings_percent': round((1 - performance_metrics['gas_efficiency']) * 100, 1),
                'uptime_percent': round(performance_metrics['uptime'] * 100, 3),
                'cross_chain_reliability': round(performance_metrics['cross_chain_success_rate'] * 100, 1),
                'last_updated': int(time.time() * 1000)
            }
            
            return {'success': True, 'metrics': metrics}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

demo_manager = DemoManager()

@demo_bp.route('/scenarios', methods=['GET'])
@cross_origin()
def get_demo_scenarios():
    """Get all available demo scenarios"""
    try:
        return jsonify({
            'success': True,
            'scenarios': demo_scenarios,
            'total_scenarios': len(demo_scenarios)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@demo_bp.route('/execute/<scenario_id>', methods=['POST'])
@cross_origin()
def execute_demo_scenario(scenario_id):
    """Execute a specific demo scenario"""
    try:
        result = demo_manager.execute_demo_scenario(scenario_id)
        
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

@demo_bp.route('/progress/<execution_id>/<int:step_index>', methods=['POST'])
@cross_origin()
def update_demo_progress(execution_id, step_index):
    """Update demo progress to next step"""
    try:
        result = demo_manager.update_demo_progress(execution_id, step_index)
        
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

@demo_bp.route('/status/<execution_id>', methods=['GET'])
@cross_origin()
def get_demo_status(execution_id):
    """Get current status of demo execution"""
    try:
        if execution_id not in demo_manager.active_demos:
            return jsonify({'error': 'Demo execution not found'}), 404
        
        demo = demo_manager.active_demos[execution_id]
        
        # Calculate progress percentage
        completed_steps = sum(1 for step in demo['steps'] if step['status'] == 'completed')
        total_steps = len(demo['steps'])
        progress = (completed_steps / total_steps) * 100
        
        return jsonify({
            'success': True,
            'demo': demo,
            'progress_percent': round(progress, 1),
            'estimated_time_remaining': max(0, demo['estimated_completion'] - int(time.time() * 1000))
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@demo_bp.route('/transactions', methods=['GET'])
@cross_origin()
def get_demo_transactions():
    """Get demo transaction data"""
    try:
        return jsonify({
            'success': True,
            'transactions': demo_transactions,
            'explorer_links': {
                'ethereum': 'https://sepolia.etherscan.io',
                'cosmos': 'https://www.mintscan.io/cosmos'
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@demo_bp.route('/metrics', methods=['GET'])
@cross_origin()
def get_demo_metrics():
    """Get comprehensive demo metrics"""
    try:
        result = demo_manager.get_demo_metrics()
        
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

@demo_bp.route('/reset', methods=['POST'])
@cross_origin()
def reset_demo_state():
    """Reset all demo state for fresh presentation"""
    try:
        demo_manager.active_demos.clear()
        
        # Reset scenario statuses
        for scenario in demo_scenarios:
            scenario['status'] = 'ready'
        
        return jsonify({
            'success': True,
            'message': 'Demo state reset successfully',
            'timestamp': int(time.time() * 1000)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

