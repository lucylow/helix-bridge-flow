import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface SwapRequest {
  fromToken: string;
  toToken: string;
  amount: string;
  recipientAddress: string;
  timelockDuration: number;
  direction: 'eth-to-cosmos' | 'cosmos-to-eth';
  ethereumTxHash?: string;
  hashlock?: string;
  secret?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    if (req.method === 'POST') {
      const body: SwapRequest = await req.json()
      
      // Generate swap ID and timestamps
      const swapId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()
      
      // Create atomic swap record
      const { data, error } = await supabase
        .from('atomic_swaps')
        .insert({
          id: swapId,
          from_token: body.fromToken,
          to_token: body.toToken,
          amount: body.amount,
          recipient_address: body.recipientAddress,
          timelock_duration: body.timelockDuration,
          direction: body.direction,
          ethereum_tx_hash: body.ethereumTxHash,
          hashlock: body.hashlock,
          status: body.ethereumTxHash ? 'pending' : 'created',
          created_at: now,
          updated_at: now
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // For Ethereum swaps, the frontend handles the transaction
      // For Cosmos swaps, we'd need to integrate with CosmWasm here
      
      return new Response(
        JSON.stringify({
          success: true,
          swap: data,
          message: body.ethereumTxHash ? 'Ethereum transaction initiated' : 'Swap created, awaiting blockchain confirmation'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (req.method === 'GET') {
      // Get swap status
      const url = new URL(req.url)
      const swapId = url.searchParams.get('id')
      
      if (!swapId) {
        return new Response(
          JSON.stringify({ error: 'Swap ID required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('atomic_swaps')
        .select('*')
        .eq('id', swapId)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Swap not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, swap: data }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )

  } catch (error) {
    console.error('Atomic swap error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})