'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function ScoreResumePage() {
  const router = useRouter()
  const outputRef = useRef<HTMLDivElement>(null)

  const [session, setSession] = useState<any>(null)
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth?redirect=/hiringlens/score')
      } else {
        setSession(data.session)
      }
    })
  }, [router])

  async function score() {
    setError('')
    if (!resume.trim() || resume.trim().length < 30) {
      setError('Please paste your resume.')
      return
    }
    if (!jobDescription.trim() || jobDescription.trim().length < 30) {
      setError('Please paste the job description.')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/score-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ resume, jobDescription }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || data.error || 'Scoring failed. Please try again.')
        return
      }

      setResult(data.result)
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-400/60 focus:outline-none transition-colors text-sm resize-y'
  const labelClass = 'block text-sm text-slate-400 mb-2'

  function scoreColor(score: number) {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  function gradeColor(grade: string) {
    if (grade === 'A') return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
    if (grade === 'B') return 'text-blue-300 border-blue-400/30 bg-blue-400/10'
    if (grade === 'C') return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
    if (grade === 'D') return 'text-orange-400 border-orange-400/30 bg-orange-400/10'
    return 'text-red-400 border-red-400/30 bg-red-400/10'
  }

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen bg-[#06100d] px-6 pb-20 pt-28">
        <div className="mx-auto max-w-3xl">

          {/* Header */}
          <div className="mb-10">
            <div className="mb-4 inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs uppercase tracking-widest text-emerald-300">
              ATS Score Checker
            </div>
            <h1 className="font-serif text-5xl font-black text-white md:text-6xl">Score your resume</h1>
            <p className="mt-4 text-lg text-slate-400">
              See how well your resume matches a job posting — keyword gaps, ATS issues, and how to fix them.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-400">
              ✓ Free for all users — no credits used
            </div>
          </div>

          {/* Form */}
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 space-y-6">
            <div>
              <label className={labelClass}>Your Resume *</label>
              <textarea
                value={resume}
                onChange={e => setResume(e.target.value)}
                placeholder="Paste your resume here..."
                rows={10}
                className={inputClass + ' font-mono leading-6'}
              />
              <div className="mt-1 text-right text-xs text-slate-500">{resume.length} characters</div>
            </div>

            <div>
              <label className={labelClass}>Job Description *</label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job posting here..."
                rows={10}
                className={inputClass}
              />
              <div className="mt-1 text-right text-xs text-slate-500">{jobDescription.length} characters</div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            <button
              onClick={score}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-400 py-4 text-base font-bold text-black transition-all hover:bg-emerald-300 disabled:opacity-50"
            >
              {loading ? 'Analyzing match...' : 'Score My Resume →'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div ref={outputRef} className="mt-10 space-y-6">

              {/* Score card */}
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-center">
                    <div className={`font-serif text-7xl font-black ${scoreColor(result.score)}`}>{result.score}</div>
                    <div className="text-sm text-slate-400">ATS Match Score</div>
                  </div>
                  <div className="text-center">
                    <div className={`rounded-2xl border px-6 py-3 font-serif text-5xl font-black ${gradeColor(result.grade)}`}>{result.grade}</div>
                    <div className="mt-1 text-sm text-slate-400">Grade</div>
                  </div>
                  <div className="flex-1">
                    {/* Progress bar */}
                    <div className="mb-2 text-xs text-slate-500">Match rate</div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${result.score}%`,
                          background: result.score >= 80 ? '#34d399' : result.score >= 60 ? '#facc15' : result.score >= 40 ? '#fb923c' : '#f87171'
                        }}
                      />
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-300">{result.summary}</div>
                  </div>
                </div>
              </div>

              {/* Matched keywords */}
              {result.matchedKeywords?.length ? (
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
                  <h3 className="mb-4 text-lg font-bold text-emerald-400">✓ Keywords Found ({result.matchedKeywords.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedKeywords.map((kw: string, i: number) => (
                      <span key={i} className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Missing keywords */}
              {result.missingKeywords?.length ? (
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
                  <h3 className="mb-2 text-lg font-bold text-red-400">✗ Missing Keywords ({result.missingKeywords.length})</h3>
                  <p className="mb-4 text-xs text-slate-500">These terms appear in the job description but not your resume. Add them naturally where relevant.</p>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((kw: string, i: number) => (
                      <span key={i} className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-medium text-red-300">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Strengths + Improvements side by side */}
              <div className="grid gap-6 lg:grid-cols-2">
                {result.strengths?.length ? (
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
                    <h3 className="mb-4 text-lg font-bold text-emerald-400">Strengths</h3>
                    <ul className="space-y-3">
                      {result.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm leading-6 text-slate-300">✓ {s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {result.improvements?.length ? (
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
                    <h3 className="mb-4 text-lg font-bold text-yellow-400">How to Improve</h3>
                    <ul className="space-y-3">
                      {result.improvements.map((imp: string, i: number) => (
                        <li key={i} className="text-sm leading-6 text-slate-300">→ {imp}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              {/* ATS Warnings */}
              {result.atsWarnings?.length ? (
                <div className="rounded-[28px] border border-orange-500/20 bg-orange-500/5 p-8">
                  <h3 className="mb-4 text-lg font-bold text-orange-400">⚠️ ATS Formatting Warnings</h3>
                  <ul className="space-y-2">
                    {result.atsWarnings.map((w: string, i: number) => (
                      <li key={i} className="text-sm text-slate-300">• {w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setResult(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:border-emerald-400/50"
                >
                  ← Score Another
                </button>
                <a
                  href="/hiringlens/builder"
                  className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-300 transition-colors"
                >
                  Optimize My Resume →
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
