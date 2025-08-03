import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("1inch API function started - REAL API INTEGRATION")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint') || 'quote'
    const chainId = searchParams.get('chainId') || '1'
    const src = searchParams.get('src')
    const dst = searchParams.get('dst')
    const amount = searchParams.get('amount')
    const from = searchParams.get('from')
    const slippage = searchParams.get('slippage') || '1'

    // Get the 1inch API key from secrets
    const apiKey = Deno.env.get('ONEINCH_API_KEY')
    if (!apiKey) {
      throw new Error('1inch API key not configured')
    }
    
    console.log('✅ REAL 1inch API - Using API key:', `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`)

    let url: string
    let params: URLSearchParams

    switch (endpoint) {
      case 'health':
        // Health check endpoint
        url = `https://api.1inch.dev/swap/v6.0/1/healthcheck`
        params = new URLSearchParams()
        break

      case 'fusion-quote':
        // Fusion+ cross-chain quote
        const srcChainId = searchParams.get('srcChainId') || '1'
        const dstChainId = searchParams.get('dstChainId') || '137'
        const srcToken = searchParams.get('srcToken')
        const dstToken = searchParams.get('dstToken')
        
        if (!srcToken || !dstToken || !amount) {
          throw new Error('Missing required parameters: srcToken, dstToken, amount')
        }
        
        url = `https://api.1inch.dev/fusion-plus/quoter/v1.0/quote`
        params = new URLSearchParams({
          srcChainId,
          dstChainId,
          srcTokenAddress: srcToken,
          dstTokenAddress: dstToken,
          amount,
          enableEstimate: 'true',
          includeGas: 'true'
        })
        break

      case 'fusion-chains':
        // Get supported chains for Fusion+
        url = `https://api.1inch.dev/fusion-plus/quoter/v1.0/supported-chains`
        params = new URLSearchParams()
        break

      case 'quote':
        if (!src || !dst || !amount) {
          throw new Error('Missing required parameters: src, dst, amount')
        }
        url = `https://api.1inch.dev/swap/v6.0/${chainId}/quote`
        params = new URLSearchParams({
          src,
          dst,
          amount,
          includeTokensInfo: 'true',
          includeProtocols: 'true',
          includeGas: 'true'
        })
        break

      case 'swap':
        if (!src || !dst || !amount || !from) {
          throw new Error('Missing required parameters: src, dst, amount, from')
        }
        url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap`
        params = new URLSearchParams({
          src,
          dst,
          amount,
          from,
          slippage,
          disableEstimate: 'false',
          allowPartialFill: 'false'
        })
        break

      case 'tokens':
        url = `https://api.1inch.dev/swap/v6.0/${chainId}/tokens`
        params = new URLSearchParams()
        break

      case 'protocols':
        url = `https://api.1inch.dev/swap/v6.0/${chainId}/liquidity-sources`
        params = new URLSearchParams()
        break

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`)
    }

    console.log(`🚀 Making REAL API call to: ${url}`)

    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ 1inch API error: ${response.status} - ${errorText}`)
      throw new Error(`1inch API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ REAL 1inch API response received for ${endpoint}`)

    return new Response(
      JSON.stringify({
        success: true,
        data,
        api_key_used: `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`,
        endpoint_called: url,
        timestamp: Date.now(),
        note: "REAL 1inch API - Not Mock Data!"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Error in 1inch API function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: Date.now()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})