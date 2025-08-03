import requests
import json
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

# 1inch API key (hardcoded as requested)
ONEINCH_API_KEY = "h6VoEtvRieMSQZiK0INL4g93Tv2UpaXr"
ONEINCH_BASE_URL = "https://api.1inch.dev"

oneinch_bp = Blueprint('oneinch', __name__)

@oneinch_bp.route('/quote', methods=['GET'])
@cross_origin()
def get_quote():
    """Get swap quote from 1inch API"""
    try:
        # Get parameters from request
        chain_id = request.args.get('chainId', '1')  # Default to Ethereum mainnet
        src = request.args.get('src')  # Source token address
        dst = request.args.get('dst')  # Destination token address
        amount = request.args.get('amount')  # Amount in wei
        
        if not all([src, dst, amount]):
            return jsonify({'error': 'Missing required parameters: src, dst, amount'}), 400
        
        # Prepare 1inch API request
        url = f"{ONEINCH_BASE_URL}/swap/v6.0/{chain_id}/quote"
        headers = {
            'Authorization': f'Bearer {ONEINCH_API_KEY}',
            'accept': 'application/json'
        }
        
        params = {
            'src': src,
            'dst': dst,
            'amount': amount,
            'includeTokensInfo': 'true',
            'includeProtocols': 'true',
            'includeGas': 'true'
        }
        
        # Make request to 1inch API
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                'success': True,
                'data': data,
                'api_key_used': f"{ONEINCH_API_KEY[:8]}...{ONEINCH_API_KEY[-4:]}"
            })
        else:
            return jsonify({
                'success': False,
                'error': f'1inch API error: {response.status_code}',
                'message': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@oneinch_bp.route('/swap', methods=['GET'])
@cross_origin()
def get_swap():
    """Get swap transaction data from 1inch API"""
    try:
        # Get parameters from request
        chain_id = request.args.get('chainId', '1')
        src = request.args.get('src')
        dst = request.args.get('dst')
        amount = request.args.get('amount')
        from_address = request.args.get('from')
        slippage = request.args.get('slippage', '1')  # Default 1% slippage
        
        if not all([src, dst, amount, from_address]):
            return jsonify({'error': 'Missing required parameters: src, dst, amount, from'}), 400
        
        # Prepare 1inch API request
        url = f"{ONEINCH_BASE_URL}/swap/v6.0/{chain_id}/swap"
        headers = {
            'Authorization': f'Bearer {ONEINCH_API_KEY}',
            'accept': 'application/json'
        }
        
        params = {
            'src': src,
            'dst': dst,
            'amount': amount,
            'from': from_address,
            'slippage': slippage,
            'disableEstimate': 'false',
            'allowPartialFill': 'false'
        }
        
        # Make request to 1inch API
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                'success': True,
                'data': data,
                'api_key_used': f"{ONEINCH_API_KEY[:8]}...{ONEINCH_API_KEY[-4:]}"
            })
        else:
            return jsonify({
                'success': False,
                'error': f'1inch API error: {response.status_code}',
                'message': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@oneinch_bp.route('/tokens', methods=['GET'])
@cross_origin()
def get_tokens():
    """Get supported tokens from 1inch API"""
    try:
        chain_id = request.args.get('chainId', '1')
        
        url = f"{ONEINCH_BASE_URL}/swap/v6.0/{chain_id}/tokens"
        headers = {
            'Authorization': f'Bearer {ONEINCH_API_KEY}',
            'accept': 'application/json'
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                'success': True,
                'data': data,
                'api_key_used': f"{ONEINCH_API_KEY[:8]}...{ONEINCH_API_KEY[-4:]}"
            })
        else:
            return jsonify({
                'success': False,
                'error': f'1inch API error: {response.status_code}',
                'message': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@oneinch_bp.route('/protocols', methods=['GET'])
@cross_origin()
def get_protocols():
    """Get supported protocols from 1inch API"""
    try:
        chain_id = request.args.get('chainId', '1')
        
        url = f"{ONEINCH_BASE_URL}/swap/v6.0/{chain_id}/liquidity-sources"
        headers = {
            'Authorization': f'Bearer {ONEINCH_API_KEY}',
            'accept': 'application/json'
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                'success': True,
                'data': data,
                'api_key_used': f"{ONEINCH_API_KEY[:8]}...{ONEINCH_API_KEY[-4:]}"
            })
        else:
            return jsonify({
                'success': False,
                'error': f'1inch API error: {response.status_code}',
                'message': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@oneinch_bp.route('/atomic-swap', methods=['POST'])
@cross_origin()
def create_atomic_swap():
    """Create atomic swap with 1inch integration"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['fromToken', 'toToken', 'amount', 'recipient', 'hashlock', 'timelock', 'direction']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Get 1inch quote first
        if data['direction'] == 'eth-to-cosmos':
            # Get Ethereum quote
            quote_params = {
                'chainId': '1',  # Ethereum mainnet
                'src': get_token_address(data['fromToken']),
                'dst': get_token_address('USDC'),  # Bridge token
                'amount': str(int(float(data['amount']) * 10**18))  # Convert to wei
            }
        else:
            # For cosmos-to-eth, we'll simulate the quote
            quote_params = None
        
        # Create atomic swap record
        swap_record = {
            'id': generate_swap_id(),
            'direction': data['direction'],
            'fromToken': data['fromToken'],
            'toToken': data['toToken'],
            'amount': data['amount'],
            'recipient': data['recipient'],
            'hashlock': data['hashlock'],
            'timelock': data['timelock'],
            'status': 'pending',
            'timestamp': int(time.time() * 1000),
            'oneinch_quote': quote_params,
            'api_key_used': f"{ONEINCH_API_KEY[:8]}...{ONEINCH_API_KEY[-4:]}"
        }
        
        # In a real implementation, you would:
        # 1. Store the swap in a database
        # 2. Create the smart contract transaction
        # 3. Monitor for completion
        
        return jsonify({
            'success': True,
            'swap': swap_record,
            'message': 'Atomic swap created successfully'
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
        'USDC': '0xA0b86a33E6441b8e5e8e8e8e8e8e8e8e8e8e8e8e',
        'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        'ATOM': 'cosmos_native_token',  # Placeholder for Cosmos
        'OSMO': 'osmosis_native_token',
        'JUNO': 'juno_native_token',
        'STARS': 'stargaze_native_token'
    }
    return token_addresses.get(token_symbol, token_symbol)

def generate_swap_id():
    """Generate unique swap ID"""
    import time
    import random
    return f"swap_{int(time.time())}_{random.randint(1000, 9999)}"

import time

