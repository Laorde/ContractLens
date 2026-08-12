import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  // ── 1. Auth ────────────────────────────────────────────────
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'auth_required', message: 'Please sign in.' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'invalid_session' }, { status: 401 })

  // ── 2. Credits / plan ─────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, subscription_status, resume_credits')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan || 'free'
  const credits = profile?.resume_credits || 0
  const isPaid = plan === 'premium' || plan === 'pro'

  if (profile?.subscription_status === 'past_due') {
    return NextResponse.json({ error: 'payment_required', message: 'Your payment failed.' }, { status: 402 })
  }
  if (!isPaid && credits <= 0) {
    return NextResponse.json({ error: 'no_credits', message: 'No resume credits remaining. Buy a pack or upgrade.' }, { status: 402 })
  }

  // ── 3. Body ────────────────────────────────────────────────
  const body = await req.json()
  const { jobTitle, company, sector, tone, resume, jobDescription, candidateName } = body

  if (!jobTitle?.trim() || !company?.trim() || !resume?.trim()) {
    return NextResponse.json({ error: 'jobTitle, company, and resume are required.' }, { status: 400 })
  }

  // ── 4. Prompt ──────────────────────────────────────────────
  const systemPrompt = `You are an expert cover letter writer who crafts compelling, personalized cover letters that get interviews.

Rules:
- Match the tone: ${tone || 'professional'} — if "casual" is specified, be warm and conversational; if "formal", be polished and structured; if "confident", be assertive and direct
- Pull specific skills and achievements from the resume provided; never invent facts
- If a job description is provided, mirror its language and address key requirements directly
- Write in the first person
- Length: 3-4 tight paragraphs — no more
- No generic filler phrases like "I am writing to apply" or "I am a team player"
- End with a clear, confident call to action
- Return ONLY the cover letter text — no subject line, no commentary, no explanation before or after`

  const userContent = `Write a cover letter for this application.

POSITION: ${jobTitle} at ${company}
SECTOR: ${sector || 'not specified'}
CANDIDATE NAME: ${candidateName || 'the applicant'}
TONE: ${tone || 'professional'}

CANDIDATE'S RESUME:
${resume.slice(0, 5000)}

${jobDescription ? `JOB DESCRIPTION:\n${jobDescription.slice(0, 3000)}` : ''}`

  // ── 5. Claude ──────────────────────────────────────────────
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'Failed to generate cover letter. Please try again.' }, { status: 500 })
  }

  const data = await response.json()
  const coverLetter = data.content?.[0]?.text

  // ── 6. Decrement credits for free users ───────────────────
  if (!isPaid) {
    await supabase.from('profiles').update({ resume_credits: credits - 1 }).eq('id', user.id)
  }

  return NextResponse.json({ coverLetter, credits_remaining: isPaid ? null : credits - 1 })
}
