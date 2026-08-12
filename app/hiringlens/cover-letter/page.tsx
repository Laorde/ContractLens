'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const SECTORS = [
  'Technology / Software', 'Finance / Banking', 'Legal / Law', 'Consulting / Strategy',
  'Human Resources', 'Marketing / Advertising', 'Sales / Business Development', 'Engineering',
  'Architecture / Urban Planning', 'Accounting / Auditing', 'Insurance', 'Real Estate',
  'Healthcare / Medical', 'Nursing / Patient Care', 'Pharmacy', 'Dentistry',
  'Mental Health / Counseling', 'Biotech / Life Sciences', 'Environmental Science', 'Research & Development',
  'Construction / Contracting', 'Electrical / Plumbing', 'HVAC / Mechanical', 'Manufacturing / Assembly',
  'Welding / Fabrication', 'Automotive / Mechanics', 'Carpentry / Woodworking',
  'Agriculture / Farming', 'Horticulture / Landscaping', 'Forestry / Conservation',
  'Veterinary / Animal Care', 'Food Production / Processing', 'Fishing / Aquaculture',
  'Retail / E-commerce', 'Food Service / Restaurant', 'Hospitality / Hotels', 'Tourism / Travel',
  'Childcare / Early Education', 'Elder Care / Home Health', 'Cleaning / Janitorial', 'Security / Loss Prevention',
  'Media / Entertainment', 'Graphic Design / Visual Arts', 'Photography / Videography',
  'Writing / Journalism', 'Music / Performing Arts', 'Gaming / Animation', 'Fashion / Apparel',
  'Education / Academia', 'Social Work / Nonprofits', 'Government / Public Administration',
  'Military / Defense', 'Law Enforcement / Corrections', 'Firefighting / Emergency Services',
  'Operations / Supply Chain', 'Warehouse / Fulfillment', 'Trucking / Delivery',
  'Aviation / Aerospace', 'Maritime / Shipping',
  'Customer Service / Call Center', 'Administrative / Office Support', 'Data Entry / Clerical', 'General Labor',
]

export default function CoverLetterPage() {
  const router = useRouter()
  const outputRef = useRef<HTMLDivElement>(null)

  const [session, setSession] = useState<any>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const [buyingCredits, setBuyingCredits] = useState(false)
  const [planError, setPlanError] = useState(false)

  const [candidateName, setCandidateName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [sector, setSector] = useState('')
  const [tone, setTone] = useState<'professional' | 'casual' | 'confident'>('professional')
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/auth?redirect=/hiringlens/cover-letter')
        return
      }
      setSession(data.session)

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, resume_credits')
        .eq('id', data.session.user.id)
        .single()

      const plan = profile?.plan || 'free'
      setIsPaid(plan === 'premium' || plan === 'pro')
      setCredits(profile?.resume_credits || 0)
    })
  }, [router])

  async function buyCredits() {
    if (!session) return
    setBuyingCredits(true)
    try {
      const res = await fetch('/api/create-resume-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Could not start checkout.')
    } catch { alert('Network error. Please try again.') }
    finally { setBuyingCredits(false) }
  }

  async function generate() {
    setError('')
    setPlanError(false)
    if (!jobTitle.trim() || !company.trim()) {
      setError('Please fill in the job title and company name.')
      return
    }
    if (!resume.trim() || resume.trim().length < 50) {
      setError('Please paste your resume — at least a few lines.')
      return
    }

    setLoading(true)
    setCoverLetter('')

    const res = await fetch('/api/cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ jobTitle, company, sector, tone, resume, jobDescription, candidateName }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      if (data.error === 'no_credits') {
        setPlanError(true)
      } else {
        setError(data.message || data.error || 'Something went wrong. Please try again.')
      }
      return
    }

    if (data.credits_remaining !== null && data.credits_remaining !== undefined) {
      setCredits(data.credits_remaining)
    }
    setCoverLetter(data.coverLetter)
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-400/60 focus:outline-none transition-colors text-sm'
  const labelClass = 'block text-sm text-slate-400 mb-2'

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen bg-[#06100d] px-6 pb-20 pt-28">
        <div className="mx-auto max-w-3xl">

          {/* Header */}
          <div className="mb-10">
            <div className="mb-4 inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs uppercase tracking-widest text-emerald-300">
              Cover Letter Generator
            </div>
            <h1 className="font-serif text-5xl font-black text-white md:text-6xl">Write your cover letter</h1>
            <p className="mt-4 text-lg text-slate-400">
              Tailored to the role, company, and your actual resume. No generic filler.
            </p>
          </div>

          {/* Credit counter */}
          {!isPaid && credits !== null && (
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <div className="text-sm text-slate-400">
                Resume credits: <span className={`font-bold ${credits === 0 ? 'text-red-400' : 'text-emerald-400'}`}>{credits} remaining</span>
              </div>
              <button
                onClick={buyCredits}
                disabled={buyingCredits}
                className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-300 disabled:opacity-50"
              >
                {buyingCredits ? 'Loading...' : '+ Buy 5 credits — $3.99'}
              </button>
            </div>
          )}

          {/* No credits wall */}
          {planError && (
            <div className="mb-8 rounded-[28px] border border-emerald-400/20 bg-emerald-400/5 p-8 text-center">
              <div className="mb-3 text-4xl">✉️</div>
              <h2 className="mb-2 text-xl font-bold text-white">No credits left</h2>
              <p className="mb-6 text-slate-400">Buy a credit pack or upgrade to Premium for unlimited access.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={buyCredits} disabled={buyingCredits} className="rounded-xl bg-emerald-400 px-8 py-3 font-semibold text-black hover:bg-emerald-300 disabled:opacity-50">
                  {buyingCredits ? 'Loading...' : 'Buy 5 Credits — $3.99'}
                </button>
                <a href="/#pricing" className="rounded-xl border border-white/10 px-8 py-3 font-semibold text-white hover:border-emerald-400/50">View Plans →</a>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 space-y-6">

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Your Name</label>
                <input type="text" value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Jordan Taylor" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sector</label>
                <select value={sector} onChange={e => setSector(e.target.value)} className={inputClass + ' cursor-pointer'} style={{ colorScheme: 'dark' }}>
                  <option value="" style={{ background: '#0d1f14' }}>Select sector...</option>
                  {SECTORS.map(s => <option key={s} value={s} style={{ background: '#0d1f14' }}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Target Job Title *</label>
                <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Marketing Manager" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Company Name *</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" className={inputClass} />
              </div>
            </div>

            {/* Tone picker */}
            <div>
              <label className={labelClass}>Tone</label>
              <div className="flex gap-2">
                {(['professional', 'casual', 'confident'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition-all ${tone === t ? 'bg-emerald-400 text-black' : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    {t === 'professional' ? '👔 Professional' : t === 'casual' ? '😊 Casual' : '💪 Confident'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Your Resume * — paste it here</label>
              <textarea
                value={resume}
                onChange={e => setResume(e.target.value)}
                placeholder="Paste your resume text here. The more detail, the better the letter."
                rows={10}
                className={inputClass + ' resize-y font-mono leading-6'}
              />
              <div className="mt-1 text-right text-xs text-slate-500">{resume.length} characters</div>
            </div>

            <div>
              <label className={labelClass}>Job Description (optional but recommended)</label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the job posting here to match its language and address specific requirements..."
                rows={6}
                className={inputClass + ' resize-y'}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            <button
              onClick={generate}
              disabled={loading || planError}
              className="w-full rounded-xl bg-emerald-400 py-4 text-base font-bold text-black transition-all hover:bg-emerald-300 disabled:opacity-50"
            >
              {loading ? 'Writing your letter...' : 'Generate Cover Letter →'}
            </button>
          </div>

          {/* Output */}
          {coverLetter && (
            <div ref={outputRef} className="mt-10">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-serif text-3xl font-bold text-white">Your Cover Letter</h2>
                <button
                  onClick={copyToClipboard}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:border-emerald-400/50 transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy Text'}
                </button>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
                <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
                  {jobTitle} at {company}{sector ? ` · ${sector}` : ''}
                </div>
                <div className="whitespace-pre-wrap font-sans text-sm leading-8 text-slate-300">{coverLetter}</div>
              </div>

              <p className="mt-4 text-center text-xs text-slate-500">
                Always personalize before sending. Review carefully — don't submit without reading.
              </p>

              <button
                onClick={() => setCoverLetter('')}
                className="mt-6 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:border-emerald-400/50"
              >
                ← Generate Another
              </button>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  )
}
