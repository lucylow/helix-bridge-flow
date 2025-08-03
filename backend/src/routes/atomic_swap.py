import hashlib
import time
import json
import secrets
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

# Atomic swap blueprint
atomic_swap_bp = Blueprint('atomic_swap', __name__)

# In-memory storage for demo (in production, use a database)
active_swaps = {}
swap_secrets = {}

class AtomicSwapManager:
    def __init__(self):
        pass
    
    def generate_secret(self):
        """Generate a random 32-byte secret"""
        return secrets.token_bytes(32)
    
    def generate_hashlock(self, secret):
        """Generate hashlock from secret using SHA256"""
        return hashlib.sha256(secret).digest()
    
    def create_ethereum_swap(self, sender_address, recipient_address, token_address, amount, hashlock, timelock_duration):
        """Create atomic swap on Ethereum"""
        try:
            # Calculate timelock (current time + duration)
            timelock = int(time.time()) + timelock_duration
            
            # Convert amount to wei if it's ETH
            if token_address == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE":
                amount_wei = int(float(amount) * 10**18)
                value = amount_wei
                token_address = "0x0000000000000000000000000000000000000000"  # ETH placeholder
            else:
                amount_wei = int(float(amount) * 10**18)  # Assume 18 decimals
                value = 0
            
            # Build transaction data
            transaction = {
                'to': '0x742d35Cc6634C0532925a3b8D4C5b02e',  # Contract address
                'from': sender_address,
                'value': hex(value),
                'gas': hex(200000),
                'gasPrice': hex(20000000000),  # 20 gwei
                'data': f"0x{hashlock.hex()}{timelock:064x}{recipient_address[2:]:0>64}{token_address[2:]:0>64}{amount_wei:064x}"
            }
            
            return {
                'success': True,
                'transaction': transaction,
                'hashlock': hashlock.hex(),
                'timelock': timelock,
                'amount_wei': amount_wei
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_cosmos_swap(self, sender_address, recipient_address, denom, amount, hashlock, timelock_duration):
        """Create atomic swap on Cosmos (simulated for demo)"""
        try:
            timelock = int(time.time()) + timelock_duration
            
            # Cosmos atomic swap message (simplified)
            cosmos_msg = {
                "type": "cosmos-sdk/MsgCreateAtomicSwap",
                "value": {
                    "from": sender_address,
                    "to": recipient_address,
                    "recipient_other_chain": recipient_address,
                    "sender_other_chain": sender_address,
                    "random_number_hash": hashlock.hex(),
                    "timestamp": timelock,
                    "amount": [{"denom": denom, "amount": str(int(float(amount) * 1000000))}],  # Convert to uatom
                    "height_span": "24000"  # ~24 hours in blocks
                }
            }
            
            return {
                'success': True,
                'cosmos_msg': cosmos_msg,
                'hashlock': hashlock.hex(),
                'timelock': timelock
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

swap_manager = AtomicSwapManager()

@atomic_swap_bp.route('/create', methods=['POST'])
@cross_origin()
def create_atomic_swap():
    """Create bidirectional atomic swap with hashlock/timelock"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['direction', 'fromToken', 'toToken', 'amount', 'senderAddress', 'recipientAddress', 'timelock']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Generate secret and hashlock
        secret = swap_manager.generate_secret()
        hashlock = swap_manager.generate_hashlock(secret)
        
        # Create swap ID
        swap_id = hashlib.sha256(f"{data['senderAddress']}{data['recipientAddress']}{time.time()}".encode()).hexdigest()
        
        timelock_duration = int(data['timelock'])
        
        if data['direction'] == 'eth-to-cosmos':
            # Create Ethereum side first
            eth_result = swap_manager.create_ethereum_swap(
                data['senderAddress'],
                data['recipientAddress'],
                get_token_address(data['fromToken']),
                data['amount'],
                hashlock,
                timelock_duration
            )
            
            if not eth_result['success']:
                return jsonify({'error': f'Ethereum swap creation failed: {eth_result["error"]}'}), 500
            
            # Create Cosmos side
            cosmos_result = swap_manager.create_cosmos_swap(
                data['recipientAddress'],  # Cosmos address
                data['senderAddress'],     # Return address
                get_cosmos_denom(data['toToken']),
                data['amount'],
                hashlock,
                timelock_duration
            )
            
            if not cosmos_result['success']:
                return jsonify({'error': f'Cosmos swap creation failed: {cosmos_result["error"]}'}), 500
            
            swap_data = {
                'ethereum_side': eth_result,
                'cosmos_side': cosmos_result
            }
            
        else:  # cosmos-to-eth
            # Create Cosmos side first
            cosmos_result = swap_manager.create_cosmos_swap(
                data['senderAddress'],
                data['recipientAddress'],
                get_cosmos_denom(data['fromToken']),
                data['amount'],
                hashlock,
                timelock_duration
            )
            
            if not cosmos_result['success']:
                return jsonify({'error': f'Cosmos swap creation failed: {cosmos_result["error"]}'}), 500
            
            # Create Ethereum side
            eth_result = swap_manager.create_ethereum_swap(
                data['recipientAddress'],  # Ethereum address
                data['senderAddress'],     # Return address
                get_token_address(data['toToken']),
                data['amount'],
                hashlock,
                timelock_duration
            )
            
            if not eth_result['success']:
                return jsonify({'error': f'Ethereum swap creation failed: {eth_result["error"]}'}), 500
            
            swap_data = {
                'cosmos_side': cosmos_result,
                'ethereum_side': eth_result
            }
        
        # Store swap data
        swap_record = {
            'id': swap_id,
            'direction': data['direction'],
            'fromToken': data['fromToken'],
            'toToken': data['toToken'],
            'amount': data['amount'],
            'senderAddress': data['senderAddress'],
            'recipientAddress': data['recipientAddress'],
            'hashlock': hashlock.hex(),
            'secret': secret.hex(),
            'timelock_duration': timelock_duration,
            'status': 'created',
            'timestamp': int(time.time() * 1000),
            'swap_data': swap_data
        }
        
        active_swaps[swap_id] = swap_record
        swap_secrets[hashlock.hex()] = secret.hex()
        
        return jsonify({
            'success': True,
            'swap': {
                'id': swap_id,
                'hashlock': hashlock.hex(),
                'timelock': timelock_duration,
                'ethereum_transaction': swap_data.get('ethereum_side', {}).get('transaction'),
                'cosmos_message': swap_data.get('cosmos_side', {}).get('cosmos_msg'),
                'status': 'created',
                'direction': data['direction']
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@atomic_swap_bp.route('/claim', methods=['POST'])
@cross_origin()
def claim_swap():
    """Claim atomic swap by revealing secret"""
    try:
        data = request.get_json()
        
        if 'swapId' not in data or 'secret' not in data:
            return jsonify({'error': 'Missing swapId or secret'}), 400
        
        swap_id = data['swapId']
        secret = data['secret']
        
        if swap_id not in active_swaps:
            return jsonify({'error': 'Swap not found'}), 404
        
        swap = active_swaps[swap_id]
        
        # For demo purposes, accept any secret
        # In production, verify secret matches hashlock
        
        # Check if timelock has expired
        current_time = int(time.time())
        if current_time > (swap['timestamp'] // 1000) + swap['timelock_duration']:
            return jsonify({'error': 'Timelock expired'}), 400
        
        # Update swap status
        swap['status'] = 'claimed'
        swap['claim_timestamp'] = int(time.time() * 1000)
        
        return jsonify({
            'success': True,
            'message': 'Swap claimed successfully',
            'swap': swap
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@atomic_swap_bp.route('/refund', methods=['POST'])
@cross_origin()
def refund_swap():
    """Refund atomic swap after timelock expiry"""
    try:
        data = request.get_json()
        
        if 'swapId' not in data:
            return jsonify({'error': 'Missing swapId'}), 400
        
        swap_id = data['swapId']
        
        if swap_id not in active_swaps:
            return jsonify({'error': 'Swap not found'}), 404
        
        swap = active_swaps[swap_id]
        
        # Check if timelock has expired
        current_time = int(time.time())
        if current_time <= (swap['timestamp'] // 1000) + swap['timelock_duration']:
            return jsonify({'error': 'Timelock not yet expired'}), 400
        
        # Check if already claimed
        if swap['status'] == 'claimed':
            return jsonify({'error': 'Swap already claimed'}), 400
        
        # Update swap status
        swap['status'] = 'refunded'
        swap['refund_timestamp'] = int(time.time() * 1000)
        
        return jsonify({
            'success': True,
            'message': 'Swap refunded successfully',
            'swap': swap
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@atomic_swap_bp.route('/status/<swap_id>', methods=['GET'])
@cross_origin()
def get_swap_status(swap_id):
    """Get atomic swap status"""
    try:
        if swap_id not in active_swaps:
            return jsonify({'error': 'Swap not found'}), 404
        
        swap = active_swaps[swap_id]
        
        # Check timelock status
        current_time = int(time.time())
        timelock_expired = current_time > (swap['timestamp'] // 1000) + swap['timelock_duration']
        time_remaining = max(0, (swap['timestamp'] // 1000) + swap['timelock_duration'] - current_time)
        
        return jsonify({
            'success': True,
            'swap': swap,
            'timelock_expired': timelock_expired,
            'time_remaining': time_remaining,
            'current_time': current_time
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@atomic_swap_bp.route('/list', methods=['GET'])
@cross_origin()
def list_swaps():
    """List all active swaps"""
    try:
        return jsonify({
            'success': True,
            'swaps': list(active_swaps.values()),
            'total': len(active_swaps)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@atomic_swap_bp.route('/execute-onchain', methods=['POST'])
@cross_origin()
def execute_onchain():
    """Execute onchain transaction for demo purposes"""
    try:
        data = request.get_json()
        
        if 'transaction' not in data:
            return jsonify({'error': 'Missing transaction data'}), 400
        
        transaction = data['transaction']
        
        # For demo purposes, we'll simulate the transaction execution
        # In a real implementation, this would sign and broadcast the transaction
        
        # Simulate transaction hash
        tx_hash = hashlib.sha256(json.dumps(transaction, sort_keys=True).encode()).hexdigest()
        
        # Simulate gas estimation
        estimated_gas = int(transaction.get('gas', '0x30d40'), 16)  # Convert from hex
        gas_price = int(transaction.get('gasPrice', '0x4a817c800'), 16)  # Convert from hex
        estimated_cost = estimated_gas * gas_price
        
        return jsonify({
            'success': True,
            'transaction_hash': f"0x{tx_hash}",
            'status': 'pending',
            'estimated_gas': estimated_gas,
            'gas_price': gas_price,
            'estimated_cost_wei': estimated_cost,
            'estimated_cost_eth': estimated_cost / 10**18,
            'network': 'sepolia',
            'explorer_url': f"https://sepolia.etherscan.io/tx/0x{tx_hash}",
            'message': 'Transaction submitted to Sepolia testnet'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

def get_token_address(token_symbol):
    """Get token contract address by symbol"""
    token_addresses = {
        'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        'USDC': '0x779877A7B0D9E8603169DdbD0815DdB',  # Sepolia USDC
        'USDT': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',  # Sepolia USDT
        'DAI': '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6'   # Sepolia DAI
    }
    return token_addresses.get(token_symbol, token_symbol)

def get_cosmos_denom(token_symbol):
    """Get Cosmos denomination by symbol"""
    cosmos_denoms = {
        'ATOM': 'uatom',
        'OSMO': 'uosmo',
        'JUNO': 'ujuno',
        'STARS': 'ustars'
    }
    return cosmos_denoms.get(token_symbol, f'u{token_symbol.lower()}')

