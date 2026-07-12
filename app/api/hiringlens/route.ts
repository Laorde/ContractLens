import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  // ── 1. Verify JWT ──────────────────────────────────────────
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) {
    return NextResponse.json({ error: 'auth_required', message: 'Please sign in.' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'invalid_session', message: 'Session expired. Please sign in again.' }, { status: 401 })
  }

  // ── 2. Check plan or credits ───────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, subscription_status, resume_credits')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan || 'free'
  const credits = profile?.resume_credits || 0
  const isPaid = plan === 'premium' || plan === 'pro'

  if (profile?.subscription_status === 'past_due') {
    return NextResponse.json(
      { error: 'payment_required', message: 'Your payment failed. Please update your billing details.' },
      { status: 402 }
    )
  }

  if (!isPaid && credits <= 0) {
    return NextResponse.json(
      { error: 'no_credits', message: 'You have no resume credits. Buy a pack or upgrade to Premium.' },
      { status: 402 }
    )
  }

  // ── 3. Parse body ──────────────────────────────────────────
  const body = await req.json()
  const { mode, sector, jobTitle, existingResume, formData } = body

  if (!mode || !sector || !jobTitle) {
    return NextResponse.json({ error: 'Missing required fields: mode, sector, jobTitle' }, { status: 400 })
  }

  // ── 4. Build prompt ────────────────────────────────────────
  let userContent: string

  if (mode === 'optimize') {
    if (!existingResume || existingResume.trim().length < 50) {
      return NextResponse.json({ error: 'Please provide your existing resume text.' }, { status: 400 })
    }
    userContent = `Optimize this resume for the ${sector} sector, targeting the role of "${jobTitle}".

EXISTING RESUME:
${existingResume}`
  } else {
    const { name, email, phone, location, workHistory, skills, education, additionalNotes } = formData || {}
    if (!name || !workHistory || !skills) {
      return NextResponse.json({ error: 'Please fill in name, work history, and skills.' }, { status: 400 })
    }
    userContent = `Build a resume for the ${sector} sector, targeting the role of "${jobTitle}".

CANDIDATE INFO:
Name: ${name}
Email: ${email || ''}
Phone: ${phone || ''}
Location: ${location || ''}
Work History: ${workHistory}
Skills: ${skills}
Education: ${education || ''}
Additional notes: ${additionalNotes || 'None'}`
  }

  const systemPrompt = `You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist with deep knowledge of hiring practices across industries.

Your task: produce a complete, professional, ATS-optimized resume. Rules:
- Use sector-specific keywords and buzzwords that ATS systems in ${sector} actively scan for
- Use strong action verbs and quantify achievements with real numbers/percentages wherever the candidate provided them
- Clean, ATS-friendly formatting only — no tables, no columns, no special characters or symbols
- Never invent companies, job titles, schools, dates, or credentials — only work with what is provided
- Enhance language and phrasing but never fabricate facts
- Return ONLY the resume content in the exact structure below, with zero commentary before or after

Required format — use these exact section markers:

[CONTACT]
Full Name
Email | Phone | Location

[SUMMARY]
3-4 sentence professional summary targeting "${jobTitle}" packed with ${sector} ATS keywords

[EXPERIENCE]
Job Title | Company | Start Date – End Date
• Strong action verb + measurable outcome
• Strong action verb + measurable outcome
• Strong action verb + measurable outcome

(repeat block for each role, most recent first)

[SKILLS]
Comma-separated list of 12-16 ATS-optimized skills for ${sector}

[EDUCATION]
Degree | Institution | Year`

  // ── 5. Call Claude ─────────────────────────────────────────
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'Failed to generate resume. Please try again.' }, { status: 500 })
  }

  const data = await response.json()
  const resumeText = data.content?.[0]?.text

  // Decrement credits for free users
  if (!isPaid) {
    await supabase
      .from('profiles')
      .update({ resume_credits: credits - 1 })
      .eq('id', user.id)
  }

  return NextResponse.json({ resume: resumeText, credits_remaining: isPaid ? null : credits - 1 })
}
