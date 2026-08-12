import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const PLAN_LIMITS: Record<string, number> = { free: 2, premium: 30, pro: 100 }

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'auth_required', message: 'Please sign in.' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'invalid_session' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, billing_cycle, scans_used, scans_reset_at, subscription_status')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'profile_error' }, { status: 500 })

  let scansUsed = profile.scans_used || 0
  const resetAt = new Date(profile.scans_reset_at)
  const now = new Date()
  const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth())
  if (monthsSinceReset >= 1) {
    scansUsed = 0
    await supabase.from('profiles').update({ scans_used: 0, scans_reset_at: now.toISOString() }).eq('id', user.id)
  }

  const limit = PLAN_LIMITS[profile.plan] ?? PLAN_LIMITS.free
  if (profile.subscription_status === 'past_due') {
    return NextResponse.json({ error: 'payment_required', message: 'Your payment failed.' }, { status: 402 })
  }
  if (scansUsed >= limit) {
    return NextResponse.json({ error: 'scan_limit_reached', plan: profile.plan, limit, message: `You've reached your ${limit} scan limit.` }, { status: 429 })
  }

  const body = await req.json()
  const { contractA, contractB, labelA, labelB } = body

  if (!contractA?.trim() || !contractB?.trim()) {
    return NextResponse.json({ error: 'Both contracts are required.' }, { status: 400 })
  }

  const systemPrompt = `You are an expert contract attorney. Compare two contracts and return ONLY valid JSON.

Return this exact JSON structure:
{
  "summary": "2-3 sentence overview of what these contracts are and how they differ",
  "recommendation": "CHOOSE_A | CHOOSE_B | NEGOTIATE | NEITHER",
  "recommendationReason": "1-2 sentences explaining your recommendation",
  "keyDifferences": [
    {
      "topic": "topic name (e.g. Payment Terms, Termination, Liability)",
      "contractA": "what contract A says",
      "contractB": "what contract B says",
      "winner": "A | B | TIE",
      "winnerReason": "brief explanation"
    }
  ],
  "contractARedFlags": [{"title": "issue", "severity": "LOW | MEDIUM | HIGH | CRITICAL", "description": "why it matters"}],
  "contractBRedFlags": [{"title": "issue", "severity": "LOW | MEDIUM | HIGH | CRITICAL", "description": "why it matters"}],
  "contractAStrengths": ["strength"],
  "contractBStrengths": ["strength"]
}`

  const userContent = `Compare these two contracts.

CONTRACT A (${labelA || 'Contract A'}):
${contractA.slice(0, 8000)}

CONTRACT B (${labelB || 'Contract B'}):
${contractB.slice(0, 8000)}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'Comparison failed. Please try again.' }, { status: 500 })
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text || '{}'

  let parsed: any
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    console.error('Failed to parse Claude response:', raw.slice(0, 200))
    return NextResponse.json({ error: 'Comparison returned unexpected output. Please try again.' }, { status: 500 })
  }

  await supabase.from('profiles').update({ scans_used: scansUsed + 1 }).eq('id', user.id)

  return NextResponse.json({ result: parsed, _usage: { plan: profile.plan, scans_used: scansUsed + 1, scans_limit: limit } })
}
