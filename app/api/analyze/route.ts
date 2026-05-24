import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const PLAN_LIMITS: Record<string, number> = { free: 2, premium: 30, pro: 100 } 
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'auth_required', message: 'Please sign in.' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'invalid_session' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase.from('profiles').select('plan,billing_cycle,scans_used,scans_reset_at,subscription_status').eq('id', user.id).single()
  if (profileError || !profile) return NextResponse.json({ error: 'profile_error' }, { status: 500 })

  let scansUsed = profile.scans_used || 0
  const resetAt = new Date(profile.scans_reset_at)
  const now = new Date()
  const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth())
  if (monthsSinceReset >= 1) {
    scansUsed = 0
    await supabase.from('profiles').update({ scans_used: 0, scans_reset_at: now.toISOString() }).eq('id', user.id)
  }

  const limit = PLAN_LIMITS[profile.plan] ?? PLAN_LIMITS.free
  if (profile.subscription_status === 'past_due') return NextResponse.json({ error: 'payment_required', message: 'Your payment failed.' }, { status: 402 })
  if (scansUsed >= limit) return NextResponse.json({ error: 'scan_limit_reached', plan: profile.plan, limit, scans_used: scansUsed, message: `You've reached your ${limit} scan limit.` }, { status: 429 })

  const { messages, system } = await req.json()
  if (!messages || !Array.isArray(messages)) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, system: system || '', messages })
  })
  if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: response.status })
  const data = await response.json()

  await supabase.from('profiles').update({ scans_used: scansUsed + 1 }).eq('id', user.id)
  return NextResponse.json({ ...data, _usage: { plan: profile.plan, scans_used: scansUsed + 1, scans_limit: limit, scans_remaining: limit - (scansUsed + 1) } })
}
