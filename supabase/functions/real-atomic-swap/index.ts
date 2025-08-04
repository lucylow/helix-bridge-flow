import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.13.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Ethereum HTLC Contract ABI - for the deployed CrossChainSwap contract
const HTLC_ABI = [
  "function initiateCrossChainSwap(address participant, address token, uint256 amount, bytes32 hashlock, uint256 timelock, string calldata cosmosRecipient) external payable returns (bytes32)",
  "function claim(bytes32 swapId, bytes32 secret) external",
  "function refund(bytes32 swapId) external",
  "function getSwap(bytes32 swapId) external view returns (tuple(address initiator, address participant, address token, uint256 amount, bytes32 hashlock, uint256 timelock, bool claimed, bool refunded, string cosmosRecipient))",
  "function isClaimable(bytes32 swapId, bytes32 secret) external view returns (bool)",
  "function isRefundable(bytes32 swapId) external view returns (bool)",
  "event SwapInitiated(bytes32 indexed swapId, address indexed initiator, address indexed participant, address token, uint256 amount, bytes32 hashlock, uint256 timelock, string cosmosRecipient)",
  "event SwapClaimed(bytes32 indexed swapId, bytes32 secret)",
  "event SwapRefunded(bytes32 indexed swapId)"
]

interface SwapRequest {
  direction: string
  fromToken: string
  toToken: string
  amount: string
  senderAddress: string
  recipientAddress: string
  timelock: number
}

serve(async (req) => {
  console.log('🚀 Function called with method:', req.method)
  console.log('🚀 Function URL:', req.url)
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Edge function invoked with method:', req.method)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    if (req.method === 'POST') {
      console.log('📝 Processing POST request...')
      
      let requestBody;
      try {
        requestBody = await req.json()
        console.log('📋 Request body parsed:', JSON.stringify(requestBody, null, 2))
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError)
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      const { action, ...data }: { action: string } & any = requestBody

      if (action === 'create') {
        console.log('🚀 Creating REAL blockchain swap...')
        
        // Generate real cryptographic values
        const secret = crypto.getRandomValues(new Uint8Array(32))
        const secretHex = Array.from(secret, byte => byte.toString(16).padStart(2, '0')).join('')
        
        // Create hashlock using Web Crypto API
        const encoder = new TextEncoder()
        const data_to_hash = encoder.encode(secretHex)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data_to_hash)
        const hashArray = new Uint8Array(hashBuffer)
        const hashlock = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('')

        // Create real Ethereum transaction
        const ethResult = await createEthereumHTLC(data, hashlock)
        console.log('Ethereum HTLC result:', ethResult)

        // Generate swap ID
        const swapId = crypto.randomUUID()

        // Store in Supabase
        const { data: swapData, error } = await supabase
          .from('atomic_swaps')
          .insert({
            id: swapId,
            from_token: data.fromToken,
            to_token: data.toToken,
            amount: parseFloat(data.amount),
            recipient_address: data.recipientAddress,
            timelock_duration: data.timelock,
            hashlock: hashlock,
            status: ethResult.success ? 'created' : 'failed',
            eth_tx_hash: ethResult.tx_hash || null,
            completion_proof: {
              secret: secretHex,
              ethereum_result: ethResult,
              is_real_blockchain: true,
              created_at: new Date().toISOString()
            }
          })
          .select()
          .single()

        if (error) {
          console.error('Database error:', error)
          throw error
        }

        return new Response(JSON.stringify({
          success: true,
          swap: {
            id: swapId,
            hashlock: hashlock,
            secret: secretHex,
            ethereum_tx_hash: ethResult.tx_hash,
            ethereum_explorer_url: ethResult.explorer_url,
            status: swapData.status,
            is_real_blockchain: true,
            message: ethResult.success ? 'REAL blockchain transaction executed!' : 'Transaction failed'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (action === 'claim') {
        const { swapId, secret } = data
        console.log('🚀 Claiming REAL blockchain swap...')

        // Get swap from database
        const { data: swap, error } = await supabase
          .from('atomic_swaps')
          .select('*')
          .eq('id', swapId)
          .single()

        if (error || !swap) {
          throw new Error('Swap not found')
        }

        // Verify secret matches hashlock
        const encoder = new TextEncoder()
        const data_to_hash = encoder.encode(secret)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data_to_hash)
        const hashArray = new Uint8Array(hashBuffer)
        const computedHash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('')

        if (computedHash !== swap.hashlock) {
          throw new Error('Invalid secret')
        }

        // Execute claim on Ethereum
        const claimResult = await claimEthereumHTLC(swap.eth_tx_hash, secret)
        console.log('Ethereum claim result:', claimResult)

        // Update swap status
        const { data: updatedSwap, error: updateError } = await supabase
          .from('atomic_swaps')
          .update({
            status: claimResult.success ? 'claimed' : 'claim_failed',
            completed_at: new Date().toISOString(),
            completion_proof: {
              ...swap.completion_proof,
              claim_result: claimResult,
              claimed_at: new Date().toISOString()
            }
          })
          .eq('id', swapId)
          .select()
          .single()

        if (updateError) {
          console.error('Update error:', updateError)
          throw updateError
        }

        return new Response(JSON.stringify({
          success: claimResult.success,
          message: claimResult.success ? 'REAL blockchain claim successful!' : 'Claim failed',
          tx_hash: claimResult.tx_hash,
          explorer_url: claimResult.explorer_url,
          swap: updatedSwap
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const swapId = url.searchParams.get('swapId')

      if (swapId) {
        const { data: swap, error } = await supabase
          .from('atomic_swaps')
          .select('*')
          .eq('id', swapId)
          .single()

        if (error) {
          throw error
        }

        // Check blockchain status if it's a real transaction
        let blockchainStatus = null
        if (swap.eth_tx_hash) {
          blockchainStatus = await checkEthereumTxStatus(swap.eth_tx_hash)
        }

        return new Response(JSON.stringify({
          success: true,
          swap: swap,
          blockchain_status: blockchainStatus,
          is_real_blockchain: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // List all swaps
      const { data: swaps, error } = await supabase
        .from('atomic_swaps')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        throw error
      }

      return new Response(JSON.stringify({
        success: true,
        swaps: swaps,
        is_real_blockchain: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    
    console.log('❌ Method not allowed:', req.method)
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Method not allowed',
      allowed_methods: ['GET', 'POST', 'OPTIONS']
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Edge function error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      details: 'Check edge function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function createEthereumHTLC(swapData: SwapRequest, hashlock: string) {
  try {
    const infuraProjectId = Deno.env.get('INFURA_PROJECT_ID')
    const privateKey = Deno.env.get('ETHEREUM_PRIVATE_KEY')
    const contractAddress = Deno.env.get('ETHEREUM_HTLC_CONTRACT_ADDRESS')

    // Validate required environment variables
    if (!infuraProjectId) {
      throw new Error('INFURA_PROJECT_ID not configured')
    }
    if (!privateKey) {
      throw new Error('ETHEREUM_PRIVATE_KEY not configured')
    }
    if (!contractAddress) {
      throw new Error('ETHEREUM_HTLC_CONTRACT_ADDRESS not configured')
    }

    console.log('🔧 Creating REAL Ethereum HTLC with:', {
      recipient: swapData.recipientAddress,
      amount: swapData.amount,
      timelock: swapData.timelock,
      contract: contractAddress,
      infuraProjectId: infuraProjectId.substring(0, 8) + '...'
    })

    // Initialize ethers provider and wallet
    const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${infuraProjectId}`)
    const wallet = new ethers.Wallet(privateKey, provider)
    const contract = new ethers.Contract(contractAddress, HTLC_ABI, wallet)

    // Convert amount to Wei (assuming ETH)
    const amountWei = ethers.parseEther(swapData.amount)
    
    // Calculate timelock (current timestamp + duration)
    const currentTime = Math.floor(Date.now() / 1000)
    const timelock = currentTime + swapData.timelock

    // Convert hashlock to bytes32
    const hashlockBytes32 = '0x' + hashlock

    console.log('📝 Transaction parameters:', {
      participant: swapData.recipientAddress,
      token: ethers.ZeroAddress, // ETH
      amount: amountWei.toString(),
      hashlock: hashlockBytes32,
      timelock: timelock,
      cosmosRecipient: swapData.recipientAddress
    })

    // **EXECUTE REAL BLOCKCHAIN TRANSACTION**
    console.log('🚀 Sending REAL transaction to Ethereum Sepolia...')
    
    const tx = await contract.initiateCrossChainSwap(
      swapData.recipientAddress, // participant
      ethers.ZeroAddress, // token (0x0 for ETH)
      amountWei, // amount in wei
      hashlockBytes32, // hashlock
      timelock, // timelock timestamp
      swapData.recipientAddress, // cosmos recipient
      { 
        value: amountWei, // send ETH
        gasLimit: 500000 // sufficient gas
      }
    )

    console.log('⏳ Transaction sent, waiting for confirmation...')
    console.log('TX Hash:', tx.hash)

    // Wait for transaction confirmation
    const receipt = await tx.wait()
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber)

    // Extract swap ID from transaction logs
    let swapId = null
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log)
        if (parsedLog?.name === 'SwapInitiated') {
          swapId = parsedLog.args.swapId
          console.log('🆔 Swap ID from event:', swapId)
          break
        }
      } catch (e) {
        // Not our event, continue
      }
    }

    return {
      success: true,
      tx_hash: tx.hash,
      swap_id: swapId,
      block_number: receipt.blockNumber,
      gas_used: receipt.gasUsed.toString(),
      explorer_url: `https://sepolia.etherscan.io/tx/${tx.hash}`,
      hashlock: hashlockBytes32,
      timelock: timelock,
      amount_wei: amountWei.toString(),
      network: 'sepolia',
      message: '🎉 REAL Ethereum transaction executed successfully!'
    }

  } catch (error) {
    console.error('❌ REAL Ethereum HTLC creation failed:', error)
    return {
      success: false,
      error: error.message,
      network: 'sepolia',
      details: 'This was a real blockchain call that failed - check your wallet balance and network connectivity'
    }
  }
}

async function claimEthereumHTLC(swapId: string, secret: string) {
  try {
    const infuraProjectId = Deno.env.get('INFURA_PROJECT_ID')
    const privateKey = Deno.env.get('ETHEREUM_PRIVATE_KEY')
    const contractAddress = Deno.env.get('ETHEREUM_HTLC_CONTRACT_ADDRESS')

    if (!infuraProjectId || !privateKey || !contractAddress) {
      throw new Error('Missing required environment variables')
    }

    console.log('🔧 Claiming REAL Ethereum HTLC:', { swapId, secret: secret.substring(0, 10) + '...' })

    // Initialize ethers provider and wallet
    const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${infuraProjectId}`)
    const wallet = new ethers.Wallet(privateKey, provider)
    const contract = new ethers.Contract(contractAddress, HTLC_ABI, wallet)

    // Convert secret to bytes32
    const secretBytes32 = '0x' + secret

    console.log('🚀 Sending REAL claim transaction...')

    // **EXECUTE REAL BLOCKCHAIN CLAIM**
    const tx = await contract.claim(swapId, secretBytes32, {
      gasLimit: 300000
    })

    console.log('⏳ Claim transaction sent:', tx.hash)

    // Wait for confirmation
    const receipt = await tx.wait()
    console.log('✅ Claim transaction confirmed in block:', receipt.blockNumber)

    return {
      success: true,
      tx_hash: tx.hash,
      block_number: receipt.blockNumber,
      gas_used: receipt.gasUsed.toString(),
      explorer_url: `https://sepolia.etherscan.io/tx/${tx.hash}`,
      message: '🎉 REAL blockchain claim successful!'
    }
  } catch (error) {
    console.error('❌ REAL Ethereum claim failed:', error)
    return {
      success: false,
      error: error.message,
      details: 'This was a real blockchain claim that failed'
    }
  }
}

async function checkEthereumTxStatus(txHash: string) {
  try {
    const infuraProjectId = Deno.env.get('INFURA_PROJECT_ID')
    if (!infuraProjectId) {
      throw new Error('INFURA_PROJECT_ID not configured')
    }
    
    console.log('🔍 Checking REAL transaction status:', txHash)
    
    const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${infuraProjectId}`)
    
    // Get transaction receipt from real blockchain
    const receipt = await provider.getTransactionReceipt(txHash)
    
    if (receipt) {
      const currentBlock = await provider.getBlockNumber()
      const confirmations = currentBlock - receipt.blockNumber
      
      return {
        exists: true,
        status: receipt.status, // 1 = success, 0 = failed
        block_number: receipt.blockNumber,
        confirmations: confirmations,
        gas_used: receipt.gasUsed.toString(),
        verified: true,
        explorer_url: `https://sepolia.etherscan.io/tx/${txHash}`
      }
    } else {
      return {
        exists: false,
        status: null,
        verified: false,
        message: 'Transaction not found on blockchain'
      }
    }
  } catch (error) {
    console.error('❌ Error checking transaction status:', error)
    return {
      exists: false,
      error: error.message,
      verified: false
    }
  }
}