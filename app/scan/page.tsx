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
  const [mode, setMode] = useState<'full'|'tldr'>('full')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (!data.session) router.push('/auth?redirect=/scan'); else setSession(data.session) }) }, [router])

  async function analyze() {
    if (!text.trim()) return alert('Paste contract text first.')
    setLoading(true); setResult(null)
    const res = await fetch('/api/analyze', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
      body: JSON.stringify({ system: FULL_SYSTEM, mode, messages:[{ role:'user', content:`Analyze this contract:\n\n${text.slice(0, 15000)}` }] })
    })
    setLoading(false)
    if (!res.ok) { const err = await res.json().catch(()=>({error:'API error'})); return alert(err.message || err.error || 'Something went wrong.') }
    const data = await res.json()
    setUsage(data._usage)
    const raw = data.content?.map((b:any)=>b.text || '').join('') || '{}'
    setResult(JSON.parse(raw.replace(/```json|```/g, '').trim()))
  }

  return (
    <>
      <Navbar simple />
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8"><h1 className="font-serif text-4xl font-bold">Analyze your contract</h1><p className="mt-2 text-muted">Paste text now. PDF/image upload can be added back next once the React foundation is live.</p></div>
        {!result ? (
          <div className="card p-6">
            <div className="mb-5 grid grid-cols-2 rounded-lg border border-line bg-panel2 p-1"><button onClick={()=>setMode('full')} className={`rounded-md py-2 text-sm ${mode==='full'?'bg-gradient-to-br from-gold to-goldDark text-ink':'text-muted'}`}>Full Analysis</button><button onClick={()=>setMode('tldr')} className={`rounded-md py-2 text-sm ${mode==='tldr'?'bg-gradient-to-br from-gold to-goldDark text-ink':'text-muted'}`}>TL;DR</button></div>
            <textarea value={text} onChange={e=>setText(e.target.value)} className="min-h-72 w-full rounded-xl border border-line bg-ink p-4 font-mono text-sm leading-7 text-paper outline-none focus:border-gold" placeholder="Paste contract text here..." />
            <div className="mt-3 flex items-center justify-between text-xs text-muted"><span>{text.length.toLocaleString()} characters</span><button disabled={loading} onClick={analyze} className="btn-gold disabled:opacity-50">{loading ? 'Analyzing…' : 'Analyze Contract'}</button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={()=>setResult(null)} className="btn-outline">← New Analysis</button>
            <div className="card p-6"><div className="flex items-center justify-between gap-4"><h2 className="font-serif text-2xl font-bold">Analysis Complete</h2><span className="rounded-full bg-gold/10 px-4 py-1 text-sm text-gold">{result.overallRisk} · {result.riskScore}/100</span></div><p className="mt-4 leading-8 text-muted">{result.summary}</p></div>
            {result.tldr?.length && <div className="card border-gold/30 p-6"><div className="mb-3 text-xs uppercase tracking-widest text-gold">TL;DR</div><ul className="space-y-3">{result.tldr.map((p:string, i:number)=><li key={i} className="flex gap-3 text-sm text-[#c8c4bc]"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-gold" />{p}</li>)}</ul></div>}
            {result.redFlags?.length && <div className="card p-6"><div className="mb-4 text-xs uppercase tracking-widest text-gold">Red Flags</div><div className="space-y-3">{result.redFlags.map((f:any, i:number)=><div key={i} className="rounded-lg border border-line bg-ink p-4"><b>{f.severity}: {f.title}</b><p className="mt-2 text-sm leading-7 text-muted">{f.description}</p></div>)}</div></div>}
            {usage && <p className="text-sm text-muted">Scans remaining: {usage.scans_remaining}</p>}
          </div>
        )}
      </main>
    </>
  )
}
