'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { supabase } from '@/lib/supabaseClient'

const FULL_SYSTEM = `You are an expert contract attorney and consumer advocate. Analyze contracts and return ONLY valid JSON.

Return this exact JSON structure:
{
  "summary": "2-3 sentence plain-English overview",
  "overallRisk": "LOW | MEDIUM | HIGH | CRITICAL",
  "riskScore": 0,
  "tldr": ["short bullet", "short bullet", "short bullet"],
  "keyTerms": [{"term": "term name", "explanation": "plain English meaning"}],
  "redFlags": [{"title": "issue", "severity": "LOW | MEDIUM | HIGH | CRITICAL", "description": "why it matters"}],
  "recommendations": ["actionable recommendation"]
}`

export default function ScanPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [session, setSession] = useState<any>(null)
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'full' | 'tldr'>('full')
  const [loading, setLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [fileName, setFileName] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageType, setImageType] = useState<string>('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth?redirect=/scan')
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
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(lib)
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setImageBase64(null)
    setImageType('')
    setText('')
    setFileLoading(true)

    try {
      if (file.type === 'application/pdf') {
        const pdfjsLib = await loadPdfJs()
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const pageText = content.items.map((item: any) => item.str).join(' ')
          fullText += pageText + '\n'
        }
        setText(fullText.trim())
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const result = ev.target?.result as string
          const base64 = result.split(',')[1]
          setImageBase64(base64)
          setImageType(file.type)
        }
        reader.readAsDataURL(file)
      }
    } catch (err) {
      alert('Could not read file. Please try again or paste the text manually.')
    } finally {
      setFileLoading(false)
    }
  }

  function clearFile() {
    setFileName('')
    setImageBase64(null)
    setImageType('')
    setText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function analyze() {
    if (!text.trim() && !imageBase64) {
      return alert('Upload a file or paste contract text first.')
    }

    setLoading(true)

    let messages: any[]

    if (imageBase64) {
      messages = [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageType, data: imageBase64 } },
          { type: 'text', text: 'Analyze this contract image.' }
        ]
      }]
    } else {
      messages = [{ role: 'user', content: `Analyze this contract:\n\n${text.slice(0, 15000)}` }]
    }

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ system: FULL_SYSTEM, mode, messages })
    })

    setLoading(false)

    const data = await res.json()

    if (!res.ok) return alert(data.message || data.error || 'Analysis failed.')

    const raw = data.content?.map((b: any) => b.text || '').join('') || '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

    setResult(parsed)

    await supabase.from('scans').insert({
      user_id: session.user.id,
      title: fileName || text.slice(0, 80),
      result: parsed
    })
  }

  return (
    <>
      <Navbar simple />

      <main className="relative z-10 mx-auto max-w-6xl overflow-hidden px-6 pb-12 pt-28">
        <div className="absolute left-1/2 top-40 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#c9a84c]/10 blur-[120px]" />

        <div className="mb-10">
          <h1 className="font-serif text-6xl font-black text-[#f3efe7]">Analyze your contract</h1>
          <p className="mt-4 text-lg text-[#8b8b99]">Upload a PDF/image or paste contract text for instant AI analysis.</p>
        </div>

        {!result ? (
          <div className="rounded-[32px] border border-[#23232d] bg-[#0f1014] p-6 shadow-[0_0_60px_rgba(201,168,76,0.08)]">

            <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#23232d]">
              <button
                onClick={() => setMode('full')}
                className={`py-5 text-lg font-semibold transition-all ${mode === 'full' ? 'bg-gradient-to-r from-[#c9a84c] to-[#8b6914] text-black' : 'bg-[#111118] text-[#f3efe7] hover:bg-[#1a1a22]'}`}
              >
                📄 Full Analysis
              </button>
              <button
                onClick={() => setMode('tldr')}
                className={`py-5 text-lg font-semibold transition-all ${mode === 'tldr' ? 'bg-gradient-to-r from-[#c9a84c] to-[#8b6914] text-black' : 'bg-[#111118] text-[#f3efe7] hover:bg-[#1a1a22]'}`}
              >
                ⚡ TL;DR
              </button>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">

              {/* Upload zone */}
              <div>
                <label className={`group flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed bg-[#0b0b10] p-8 text-center transition-all hover:bg-[#151515] hover:shadow-[0_0_35px_rgba(201,168,76,0.12)] ${fileName ? 'border-[#c9a84c]' : 'border-[#c9a84c]/40 hover:border-[#c9a84c]'}`}>
                  {fileLoading ? (
                    <>
                      <div className="mb-4 text-5xl animate-pulse">⏳</div>
                      <div className="text-lg font-bold text-[#f3efe7]">Reading file...</div>
                    </>
                  ) : fileName ? (
                    <>
                      <div className="mb-4 text-5xl">{imageBase64 ? '🖼️' : '📄'}</div>
                      <div className="text-base font-bold text-[#f3efe7] break-all">{fileName}</div>
                      <div className="mt-2 text-xs text-emerald-400">{imageBase64 ? 'Image ready' : `${text.length.toLocaleString()} characters extracted`}</div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); clearFile() }}
                        className="mt-4 rounded-full border border-[#2a2a35] bg-[#111118] px-4 py-1.5 text-xs text-[#8b8b99] hover:border-red-500 hover:text-red-400"
                      >
                        Remove file
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-5 text-6xl">📄</div>
                      <div className="text-3xl font-bold text-[#f3efe7]">Upload File</div>
                      <div className="mt-3 text-sm text-[#8b8b99]">Drag & drop or click to browse</div>
                      <div className="mt-6 rounded-full border border-[#2a2a35] bg-[#111118] px-5 py-2 text-xs text-[#c9a84c]">PDF, PNG, JPG up to 10MB</div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Text area */}
              <div>
                {imageBase64 ? (
                  <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-[#c9a84c]/30 bg-[#09090c] p-6 text-center">
                    <div>
                      <div className="text-5xl mb-4">🖼️</div>
                      <div className="text-[#f3efe7] font-semibold">Image uploaded</div>
                      <div className="mt-2 text-sm text-[#8b8b99]">Claude will read the contract directly from your image</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={text}
                      onChange={(e) => { setText(e.target.value); setFileName(''); setImageBase64(null) }}
                      placeholder="Paste contract text here, or upload a PDF above..."
                      className="min-h-[360px] w-full rounded-[28px] border border-[#2a2a35] bg-[#09090c] p-6 text-[#f3efe7] outline-none backdrop-blur-sm transition-all placeholder:text-[#666674] focus:border-[#c9a84c]"
                    />
                    <div className="mt-3 text-sm text-[#8b8b99]">{text.length.toLocaleString()} characters</div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center">
              <button
                disabled={loading || fileLoading}
                onClick={analyze}
                className="flex w-full max-w-xl items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#c9a84c] to-[#8b6914] px-8 py-5 text-2xl font-black text-black shadow-[0_0_40px_rgba(201,168,76,0.35)] transition-all hover:scale-[1.01] hover:opacity-95 hover:shadow-[0_0_55px_rgba(201,168,76,0.55)] disabled:opacity-50"
              >
                ✨ {loading ? 'Analyzing...' : 'Analyze Contract'} →
              </button>
              <div className="mt-5 text-sm text-[#8b8b99]">🔒 Your contracts are private and secure.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button
              onClick={() => { setResult(null); clearFile() }}
              className="rounded-xl border border-[#2a2a35] bg-[#111118] px-5 py-3 text-[#f3efe7] transition hover:border-[#c9a84c]"
            >
              ← New Analysis
            </button>

            <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-serif text-3xl font-bold text-[#f3efe7]">Analysis Complete</h2>
                <span className="rounded-full bg-[#c9a84c]/10 px-4 py-2 text-sm font-semibold text-[#c9a84c]">
                  {result.overallRisk} · {result.riskScore}/100
                </span>
              </div>
              <p className="mt-6 leading-8 text-[#b4b4c2]">{result.summary}</p>
            </div>

            {result.tldr?.length ? (
              <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
                <h3 className="text-xl font-bold text-[#c9a84c]">TL;DR</h3>
                <ul className="mt-4 space-y-3 text-[#b4b4c2]">{result.tldr.map((item: string, i: number) => <li key={i}>• {item}</li>)}</ul>
              </div>
            ) : null}

            {result.redFlags?.length ? (
              <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
                <h3 className="text-xl font-bold text-[#c9a84c]">Red Flags</h3>
                <div className="mt-4 space-y-4">
                  {result.redFlags.map((flag: any, i: number) => (
                    <div key={i} className="rounded-2xl border border-[#2a2a35] bg-[#09090c] p-5">
                      <div className="font-bold text-[#f3efe7]">{flag.severity}: {flag.title}</div>
                      <p className="mt-2 text-[#8b8b99]">{flag.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {result.recommendations?.length ? (
              <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
                <h3 className="text-xl font-bold text-[#c9a84c]">Recommendations</h3>
                <ul className="mt-4 space-y-3 text-[#b4b4c2]">{result.recommendations.map((r: string, i: number) => <li key={i}>→ {r}</li>)}</ul>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </>
  )
}
