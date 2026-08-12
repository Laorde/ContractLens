import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  // ── Auth ───────────────────────────────────────────────────
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'auth_required', message: 'Please sign in.' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'invalid_session' }, { status: 401 })

  // ── Check user is authenticated (free — no credit cost) ───
  // Resume scoring is free for all logged-in users

  // ── Body ───────────────────────────────────────────────────
  const body = await req.json()
  const { resume, jobDescription } = body

  if (!resume?.trim() || resume.trim().length < 30) {
    return NextResponse.json({ error: 'Please provide your resume.' }, { status: 400 })
  }
  if (!jobDescription?.trim() || jobDescription.trim().length < 30) {
    return NextResponse.json({ error: 'Please provide the job description.' }, { status: 400 })
  }

  // ── Prompt ─────────────────────────────────────────────────
  const systemPrompt = `You are an ATS (Applicant Tracking System) expert and resume coach. Analyze how well a resume matches a job description and return ONLY valid JSON.

Return this exact JSON structure:
{
  "score": 0,
  "grade": "A | B | C | D | F",
  "summary": "2-3 sentence assessment of the match",
  "matchedKeywords": ["keyword present in both resume and job description"],
  "missingKeywords": ["important keyword from job description missing in resume"],
  "strengths": ["specific strength with explanation"],
  "improvements": ["specific, actionable improvement suggestion"],
  "atsWarnings": ["ATS formatting issue in the resume, if any"]
}`

  const userContent = `Score this resume against the job description.

RESUME:
${resume.slice(0, 6000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 4000)}`

  // ── Claude ─────────────────────────────────────────────────
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'Scoring failed. Please try again.' }, { status: 500 })
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text || '{}'

  let parsed: any
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    console.error('Failed to parse Claude response:', raw.slice(0, 200))
    return NextResponse.json({ error: 'Scoring returned unexpected output. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ result: parsed })
}
