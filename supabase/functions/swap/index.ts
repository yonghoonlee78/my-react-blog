// supabase/functions/swap/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "npm:ethers@6"

const BITUSDT_ADDRESS = "0x29a895dcFCf23cfA660265983a03c0E9fCf665C5"
// Alchemy 사용
const SEPOLIA_RPC = "https://eth-sepolia.g.alchemy.com/v2/H0Mq_yUAPE0XXEc5Ub5OR"

const TOKEN_ABI = [
  "function mint(address to, uint256 amount) external"
]

serve(async (req) => {
  try {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { userId, points, walletAddress } = await req.json()
    
    const OWNER_PRIVATE_KEY = Deno.env.get('OWNER_PRIVATE_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // 포인트 확인 및 차감
    const { data: userData } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single()
    
    if (userData.points < points) {
      throw new Error('Insufficient points')
    }
    
    await supabase
      .from('users')
      .update({ points: userData.points - points })
      .eq('id', userId)
    
    // 민팅
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
    const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider)
    const contract = new ethers.Contract(BITUSDT_ADDRESS, TOKEN_ABI, ownerWallet)
    
    const tokenAmount = ethers.parseEther((points / 100).toString())
    const tx = await contract.mint(walletAddress, tokenAmount)
    await tx.wait()
    
    // 스왑 기록
    await supabase.from('swap_history').insert({
      user_id: userId,
      wallet_address: walletAddress,
      points: points,
      usdt: points / 100,
      tx_hash: tx.hash,
      network: 'sepolia',
      status: 'completed',
      created_at: new Date().toISOString()
    })
    
    return new Response(
      JSON.stringify({ success: true, txHash: tx.hash }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})