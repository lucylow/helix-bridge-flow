import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("1inch API function started")

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
    
    console.log('Using API key:', `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`)

    let url: string
    let params: URLSearchParams

    switch (endpoint) {
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

    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`1inch API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({
        success: true,
        data,
        api_key_used: `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in 1inch API function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})