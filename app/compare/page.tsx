'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { supabase } from '@/lib/supabaseClient'

export default function ComparePage() {
  const router = useRouter()
  const fileARef = useRef<HTMLInputElement>(null)
  const fileBRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const [session, setSession] = useState<any>(null)
  const [contractA, setContractA] = useState('')
  const [contractB, setContractB] = useState('')
  const [labelA, setLabelA] = useState('Contract A')
  const [labelB, setLabelB] = useState('Contract B')
  const [fileNameA, setFileNameA] = useState('')
  const [fileNameB, setFileNameB] = useState('')
  const [fileLoadingA, setFileLoadingA] = useState(false)
  const [fileLoadingB, setFileLoadingB] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth?redirect=/compare')
      } else {
        setSession(data.session)
      }
    })
  }, [router])

  async function loadPdfJs(): Promise<any> {
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = () => {
        const lib = (window as any).pdfjsLib
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(lib)
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  async function extractPdf(file: File): Promise<string> {
    const pdfjsLib = await loadPdfJs()
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      fullText += content.items.map((item: any) => item.str).join(' ') + '\n'
    }
    return fullText.trim()
  }

  async function handleFileA(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileNameA(file.name)
    setLabelA(file.name.replace('.pdf', ''))
    setFileLoadingA(true)
    try {
      const text = await extractPdf(file)
      setContractA(text)
    } catch { alert('Could not read PDF. Try pasting the text instead.') }
    finally { setFileLoadingA(false) }
  }

  async function handleFileB(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileNameB(file.name)
    setLabelB(file.name.replace('.pdf', ''))
    setFileLoadingB(true)
    try {
      const text = await extractPdf(file)
      setContractB(text)
    } catch { alert('Could not read PDF. Try pasting the text instead.') }
    finally { setFileLoadingB(false) }
  }

  async function compare() {
    setError('')
    if (!contractA.trim() || !contractB.trim()) {
      setError('Please provide both contracts.')
      return
    }
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ contractA, contractB, labelA, labelB }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || data.error || 'Comparison failed.')
        return
      }

      setResult(data.result)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const SEVERITY_COLOR: Record<string, string> = {
    CRITICAL: 'border-red-500/40 bg-red-500/10 text-red-400',
    HIGH: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    MEDIUM: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    LOW: 'border-[#2a2a35] bg-[#09090c] text-[#8b8b99]',
  }

  const REC_COLOR: Record<string, string> = {
    CHOOSE_A: 'text-emerald-400',
    CHOOSE_B: 'text-emerald-400',
    NEGOTIATE: 'text-yellow-400',
    NEITHER: 'text-red-400',
  }

  const WINNER_BADGE: Record<string, string> = {
    A: `bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30`,
    B: `bg-blue-500/15 text-blue-300 border border-blue-400/30`,
    TIE: `bg-white/10 text-white/60 border border-white/20`,
  }

  function winnerLabel(winner: string) {
    if (winner === 'A') return labelA
    if (winner === 'B') return labelB
    return 'Tie'
  }

  return (
    <>
      <Navbar simple />
      <main className="relative z-10 mx-auto max-w-6xl overflow-hidden px-6 pb-16 pt-28">
        <div className="absolute left-1/2 top-40 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#c9a84c]/8 blur-[120px]" />

        <div className="mb-10">
          <h1 className="font-serif text-6xl font-black text-[#f3efe7]">Compare Contracts</h1>
          <p className="mt-4 text-lg text-[#8b8b99]">Upload or paste two contracts to see a side-by-side breakdown, red flags, and a recommendation.</p>
        </div>

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contract A */}
            <div className="rounded-[28px] border border-[#23232d] bg-[#0f1014] p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-[#c9a84c]/15 px-3 py-1 text-xs font-bold text-[#c9a84c] border border-[#c9a84c]/30">A</span>
                <input
                  type="text"
                  value={labelA}
                  onChange={e => setLabelA(e.target.value)}
                  className="flex-1 rounded-xl border border-[#2a2a35] bg-transparent px-3 py-1.5 text-sm text-[#f3efe7] outline-none focus:border-[#c9a84c]"
                  placeholder="Label for Contract A"
                />
              </div>
              <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#c9a84c]/30 bg-[#09090c] px-4 py-2.5 text-sm text-[#8b8b99] hover:border-[#c9a84c]/60 transition-colors">
                {fileLoadingA ? '⏳ Reading...' : fileNameA ? `📄 ${fileNameA}` : '📎 Upload PDF'}
                <input ref={fileARef} type="file" accept=".pdf" className="hidden" onChange={handleFileA} />
              </label>
              <textarea
                value={contractA}
                onChange={e => { setContractA(e.target.value); setFileNameA('') }}
                placeholder="Or paste Contract A text here..."
                className="min-h-[260px] w-full rounded-[20px] border border-[#2a2a35] bg-[#09090c] p-5 text-sm text-[#f3efe7] outline-none transition-colors placeholder:text-[#666674] focus:border-[#c9a84c]"
              />
              <div className="mt-2 text-xs text-[#8b8b99]">{contractA.length.toLocaleString()} chars</div>
            </div>

            {/* Contract B */}
            <div className="rounded-[28px] border border-[#23232d] bg-[#0f1014] p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">B</span>
                <input
                  type="text"
                  value={labelB}
                  onChange={e => setLabelB(e.target.value)}
                  className="flex-1 rounded-xl border border-[#2a2a35] bg-transparent px-3 py-1.5 text-sm text-[#f3efe7] outline-none focus:border-[#c9a84c]"
                  placeholder="Label for Contract B"
                />
              </div>
              <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-blue-400/30 bg-[#09090c] px-4 py-2.5 text-sm text-[#8b8b99] hover:border-blue-400/60 transition-colors">
                {fileLoadingB ? '⏳ Reading...' : fileNameB ? `📄 ${fileNameB}` : '📎 Upload PDF'}
                <input ref={fileBRef} type="file" accept=".pdf" className="hidden" onChange={handleFileB} />
              </label>
              <textarea
                value={contractB}
                onChange={e => { setContractB(e.target.value); setFileNameB('') }}
                placeholder="Or paste Contract B text here..."
                className="min-h-[260px] w-full rounded-[20px] border border-[#2a2a35] bg-[#09090c] p-5 text-sm text-[#f3efe7] outline-none transition-colors placeholder:text-[#666674] focus:border-[#c9a84c]"
              />
              <div className="mt-2 text-xs text-[#8b8b99]">{contractB.length.toLocaleString()} chars</div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-400">{error}</div>
          )}

          <div className="flex justify-center">
            <button
              disabled={loading || fileLoadingA || fileLoadingB}
              onClick={compare}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#c9a84c] to-[#8b6914] px-10 py-5 text-xl font-black text-black shadow-[0_0_40px_rgba(201,168,76,0.30)] transition-all hover:scale-[1.01] hover:shadow-[0_0_55px_rgba(201,168,76,0.50)] disabled:opacity-50"
            >
              ⚖️ {loading ? 'Comparing...' : 'Compare Contracts'} →
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div ref={resultsRef} className="mt-16 space-y-6">
            {/* Recommendation banner */}
            <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-widest text-[#8b8b99]">Recommendation</div>
                  <div className={`mt-2 text-3xl font-black ${REC_COLOR[result.recommendation] || 'text-[#f3efe7]'}`}>
                    {result.recommendation === 'CHOOSE_A' ? `Go with ${labelA}` :
                     result.recommendation === 'CHOOSE_B' ? `Go with ${labelB}` :
                     result.recommendation === 'NEGOTIATE' ? 'Negotiate before signing' :
                     'Avoid both contracts'}
                  </div>
                  <p className="mt-3 text-[#b4b4c2]">{result.recommendationReason}</p>
                </div>
              </div>
              <p className="mt-5 leading-7 text-[#8b8b99] border-t border-[#23232d] pt-5">{result.summary}</p>
            </div>

            {/* Key differences */}
            {result.keyDifferences?.length ? (
              <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
                <h3 className="mb-6 text-xl font-bold text-[#c9a84c]">Key Differences</h3>
                <div className="space-y-4">
                  {result.keyDifferences.map((diff: any, i: number) => (
                    <div key={i} className="rounded-2xl border border-[#2a2a35] bg-[#09090c] p-5">
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <div className="font-bold text-[#f3efe7]">{diff.topic}</div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${WINNER_BADGE[diff.winner] || WINNER_BADGE.TIE}`}>
                          {winnerLabel(diff.winner)} wins
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs font-semibold text-[#c9a84c]">{labelA}</div>
                          <div className="text-sm text-[#8b8b99]">{diff.contractA}</div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-semibold text-blue-300">{labelB}</div>
                          <div className="text-sm text-[#8b8b99]">{diff.contractB}</div>
                        </div>
                      </div>
                      {diff.winnerReason && <div className="mt-3 text-xs text-[#666674]">→ {diff.winnerReason}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Red flags side by side */}
            <div className="grid gap-6 lg:grid-cols-2">
              {[
                { flags: result.contractARedFlags, label: labelA, color: 'text-[#c9a84c]', badge: 'A' },
                { flags: result.contractBRedFlags, label: labelB, color: 'text-blue-300', badge: 'B' },
              ].map(({ flags, label, color, badge }) => (
                <div key={badge} className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
                  <h3 className={`mb-5 text-lg font-bold ${color}`}>Red Flags — {label}</h3>
                  {!flags?.length ? (
                    <div className="text-sm text-[#8b8b99]">No major red flags found.</div>
                  ) : (
                    <div className="space-y-3">
                      {flags.map((flag: any, i: number) => (
                        <div key={i} className={`rounded-xl border p-4 ${SEVERITY_COLOR[flag.severity] || SEVERITY_COLOR.LOW}`}>
                          <div className="font-semibold">{flag.severity}: {flag.title}</div>
                          <div className="mt-1 text-sm opacity-80">{flag.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Strengths side by side */}
            <div className="grid gap-6 lg:grid-cols-2">
              {[
                { strengths: result.contractAStrengths, label: labelA, color: 'text-[#c9a84c]' },
                { strengths: result.contractBStrengths, label: labelB, color: 'text-blue-300' },
              ].map(({ strengths, label, color }) => (
                <div key={label} className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
                  <h3 className={`mb-5 text-lg font-bold ${color}`}>Strengths — {label}</h3>
                  {!strengths?.length ? (
                    <div className="text-sm text-[#8b8b99]">No notable strengths identified.</div>
                  ) : (
                    <ul className="space-y-2">
                      {strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-[#b4b4c2]">✓ {s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setResult(null)}
              className="rounded-xl border border-[#2a2a35] bg-[#111118] px-5 py-3 text-[#f3efe7] transition hover:border-[#c9a84c]"
            >
              ← New Comparison
            </button>
          </div>
        )}
      </main>
    </>
  )
}
