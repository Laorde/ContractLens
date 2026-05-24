'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { supabase } from '@/lib/supabaseClient'

const FULL_SYSTEM = `You are an expert contract attorney and consumer advocate. Analyze contracts and return ONLY valid JSON. Structure: {"summary":"2-3 sentence overview","tldr":["point"],"overallRisk":"LOW|MEDIUM|HIGH|CRITICAL","riskScore":0,"keyTerms":[{"term":"","explanation":"","impact":"POSITIVE|NEUTRAL|NEGATIVE"}],"redFlags":[{"title":"","description":"","severity":"LOW|MEDIUM|HIGH|CRITICAL","quote":""}],"fairTradeoffs":[{"youGive":"","youGet":"","balanced":true}],"recommendations":[""],"missingClauses":[""]}`

export default function ScanPage() {
  const router = useRouter()

  const [session, setSession] = useState<any>(null)
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'full' | 'tldr'>('full')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth?redirect=/scan')
      } else {
        setSession(data.session)
      }
    })
  }, [router])

  async function analyze() {
    if (!text.trim()) {
      return alert('Paste contract text first.')
    }

    setLoading(true)
    setResult(null)

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        system: FULL_SYSTEM,
        mode,
        messages: [
          {
            role: 'user',
            content: `Analyze this contract:\n\n${text.slice(0, 15000)}`
          }
        ]
      })
    })

    setLoading(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({
        error: 'API error'
      }))

      return alert(err.message || err.error || 'Something went wrong.')
    }

    const data = await res.json()

    setUsage(data._usage)

    const raw =
      data.content?.map((b: any) => b.text || '').join('') || '{}'

    setResult(
      JSON.parse(raw.replace(/```json|```/g, '').trim())
    )
  }

  return (
    <>
      <Navbar simple />

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">

        <div className="mb-10">
          <h1 className="font-serif text-5xl font-bold">
            Analyze your contract
          </h1>

          <p className="mt-3 text-lg text-muted">
            Upload a PDF/image or paste contract text for instant AI analysis.
          </p>
        </div>

        {!result ? (
          <div className="rounded-3xl border border-white/10 bg-[#0f1014] p-6 shadow-[0_0_40px_rgba(201,168,76,0.08)]">

            <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10">

              <button
                onClick={() => setMode('full')}
                className={`py-4 text-lg font-medium transition-all ${
                  mode === 'full'
                    ? 'bg-gradient-to-r from-gold to-goldDark text-black'
                    : 'bg-transparent text-paper hover:bg-white/5'
                }`}
              >
                📄 Full Analysis
              </button>

              <button
                onClick={() => setMode('tldr')}
                className={`py-4 text-lg font-medium transition-all ${
                  mode === 'tldr'
                    ? 'bg-gradient-to-r from-gold to-goldDark text-black'
                    : 'bg-transparent text-paper hover:bg-white/5'
                }`}
              >
                ⚡ TL;DR
              </button>

            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-gold/30 bg-black/30 p-8 text-center transition-all hover:border-gold hover:bg-gold/5">

                <div className="mb-4 text-5xl">
                  📄
                </div>

                <div className="text-2xl font-semibold text-paper">
                  Upload PDF or Image
                </div>

                <div className="mt-3 text-sm text-muted">
                  Drag & drop or click to browse
                </div>

                <div className="mt-6 rounded-full border border-white/10 px-4 py-2 text-xs text-muted">
                  PDF, PNG, JPG up to 10MB
                </div>

                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                />
              </label>

              <div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste contract text here..."
                  className="min-h-[320px] w-full rounded-3xl border border-line bg-black/40 p-6 font-mono text-sm leading-7 text-paper outline-none transition-all placeholder:text-muted focus:border-gold"
                />

                <div className="mt-3 text-sm text-muted">
                  {text.length.toLocaleString()} characters
                </div>

              </div>

            </div>

            <div className="mt-10 flex flex-col items-center">

              <button
                disabled={loading}
                onClick={analyze}
                className="flex w-full max-w-xl items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-gold to-goldDark px-8 py-5 text-2xl font-bold text-black transition-all hover:scale-[1.01] hover:opacity-95 disabled:opacity-50"
              >
                ✨ {loading ? 'Analyzing...' : 'Analyze Contract'} →
              </button>

              <div className="mt-4 text-sm text-muted">
                🔒 Your contracts are private and secure.
              </div>

            </div>

          </div>
        ) : (
          <div className="space-y-4">

            <button
              onClick={() => setResult(null)}
              className="btn-outline"
            >
              ← New Analysis
            </button>

            <div className="card p-6">

              <div className="flex items-center justify-between gap-4">

                <h2 className="font-serif text-2xl font-bold">
                  Analysis Complete
                </h2>

                <span className="rounded-full bg-gold/10 px-4 py-1 text-sm text-gold">
                  {result.overallRisk} · {result.riskScore}/100
                </span>

              </div>

              <p className="mt-4 leading-8 text-muted">
                {result.summary}
              </p>

            </div>

            {result.tldr?.length ? (
              <div className="card border-gold/30 p-6">

                <div className="mb-3 text-xs uppercase tracking-widest text-gold">
                  TL;DR
                </div>

                <ul className="space-y-3">
                  {result.tldr.map((p: string, i: number) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm text-[#c8c4bc]"
                    >
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gold" />
                      {p}
                    </li>
                  ))}
                </ul>

              </div>
            ) : null}

            {result.redFlags?.length ? (
              <div className="card p-6">

                <div className="mb-4 text-xs uppercase tracking-widest text-gold">
                  Red Flags
                </div>

                <div className="space-y-3">

                  {result.redFlags.map((f: any, i: number) => (
                    <div
                      key={i}
                      className="rounded-lg border border-line bg-ink p-4"
                    >
                      <b>
                        {f.severity}: {f.title}
                      </b>

                      <p className="mt-2 text-sm leading-7 text-muted">
                        {f.description}
                      </p>

                    </div>
                  ))}

                </div>

              </div>
            ) : null}

            {usage ? (
              <p className="text-sm text-muted">
                Scans remaining: {usage.scans_remaining}
              </p>
            ) : null}

          </div>
        )}

      </main>
    </>
  )
}