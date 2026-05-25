'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { supabase } from '@/lib/supabaseClient'

const FULL_SYSTEM = `You are an expert contract attorney and consumer advocate. Analyze contracts and return ONLY valid JSON.`

export default function ScanPage() {
  const router = useRouter()

  const [session, setSession] = useState<any>(null)
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'full' | 'tldr'>('full')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

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

    const data = await res.json()

    if (!res.ok) {
      return alert(data.message || data.error || 'Analysis failed.')
    }

    const raw =
      data.content?.map((b: any) => b.text || '').join('') || '{}'

    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

setResult(parsed)

await supabase.from('scans').insert({
  user_id: session.user.id,
  title: text.slice(0, 80),
  result: parsed
})
    
  }

  return (
    <>
      <Navbar simple />

      <main className="relative z-10 mx-auto max-w-6xl overflow-hidden px-6 pb-12 pt-28">

        <div className="absolute left-1/2 top-40 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#c9a84c]/10 blur-[120px]" />

        <div className="mb-10">

          <h1 className="font-serif text-6xl font-black text-[#f3efe7]">
            Analyze your contract
          </h1>

          <p className="mt-4 text-lg text-[#8b8b99]">
            Upload a PDF/image or paste contract text for instant AI analysis.
          </p>

        </div>

        {!result ? (
          <div className="rounded-[32px] border border-[#23232d] bg-[#0f1014] p-6 shadow-[0_0_60px_rgba(201,168,76,0.08)]">

            <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#23232d]">

              <button
                onClick={() => setMode('full')}
                className={`py-5 text-lg font-semibold transition-all ${
                  mode === 'full'
                    ? 'bg-gradient-to-r from-[#c9a84c] to-[#8b6914] text-black'
                    : 'bg-[#111118] text-[#f3efe7] hover:bg-[#1a1a22]'
                }`}
              >
                📄 Full Analysis
              </button>

              <button
                onClick={() => setMode('tldr')}
                className={`py-5 text-lg font-semibold transition-all ${
                  mode === 'tldr'
                    ? 'bg-gradient-to-r from-[#c9a84c] to-[#8b6914] text-black'
                    : 'bg-[#111118] text-[#f3efe7] hover:bg-[#1a1a22]'
                }`}
              >
                ⚡ TL;DR
              </button>

            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">

              <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-[#c9a84c]/40 bg-[#0b0b10] p-8 text-center transition-all hover:border-[#c9a84c] hover:bg-[#151515] hover:shadow-[0_0_35px_rgba(201,168,76,0.12)]">

                <div className="mb-5 text-6xl">
                  📄
                </div>

                <div className="text-3xl font-bold text-[#f3efe7]">
                  Upload PDF
                </div>

                <div className="mt-3 text-sm text-[#8b8b99]">
                  Drag & drop or click to browse
                </div>

                <div className="mt-6 rounded-full border border-[#2a2a35] bg-[#111118] px-5 py-2 text-xs text-[#c9a84c]">
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
                  className="min-h-[360px] w-full rounded-[28px] border border-[#2a2a35] bg-[#09090c] p-6 text-[#f3efe7] outline-none backdrop-blur-sm transition-all placeholder:text-[#666674] focus:border-[#c9a84c]"
                />

                <div className="mt-3 text-sm text-[#8b8b99]">
                  {text.length.toLocaleString()} characters
                </div>

              </div>

            </div>

            <div className="mt-12 flex flex-col items-center">

              <button
                disabled={loading}
                onClick={analyze}
                className="flex w-full max-w-xl items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#c9a84c] to-[#8b6914] px-8 py-5 text-2xl font-black text-black shadow-[0_0_40px_rgba(201,168,76,0.35)] transition-all hover:scale-[1.01] hover:opacity-95 hover:shadow-[0_0_55px_rgba(201,168,76,0.55)] disabled:opacity-50"
              >
                ✨ {loading ? 'Analyzing...' : 'Analyze Contract'} →
              </button>

              <div className="mt-5 text-sm text-[#8b8b99]">
                🔒 Your contracts are private and secure.
              </div>

            </div>

          </div>
        ) : (
          <div className="space-y-6">

            <button
              onClick={() => setResult(null)}
              className="rounded-xl border border-[#2a2a35] bg-[#111118] px-5 py-3 text-[#f3efe7] transition hover:border-[#c9a84c]"
            >
              ← New Analysis
            </button>

            <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">

              <div className="flex items-center justify-between gap-4">

                <h2 className="font-serif text-3xl font-bold text-[#f3efe7]">
                  Analysis Complete
                </h2>

                <span className="rounded-full bg-[#c9a84c]/10 px-4 py-2 text-sm font-semibold text-[#c9a84c]">
                  {result.overallRisk} · {result.riskScore}/100
                </span>

              </div>

              <p className="mt-6 leading-8 text-[#b4b4c2]">
                {result.summary}
              </p>

            </div>

          </div>
        )}

      </main>
    </>
  )
}