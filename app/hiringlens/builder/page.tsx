'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const SECTORS = [
  // Professional & Corporate
  'Technology / Software',
  'Finance / Banking',
  'Legal / Law',
  'Consulting / Strategy',
  'Human Resources',
  'Marketing / Advertising',
  'Sales / Business Development',
  'Engineering',
  'Architecture / Urban Planning',
  'Accounting / Auditing',
  'Insurance',
  'Real Estate',

  // Healthcare & Science
  'Healthcare / Medical',
  'Nursing / Patient Care',
  'Pharmacy',
  'Dentistry',
  'Mental Health / Counseling',
  'Biotech / Life Sciences',
  'Environmental Science',
  'Research & Development',

  // Trades & Labor
  'Construction / Contracting',
  'Electrical / Plumbing',
  'HVAC / Mechanical',
  'Manufacturing / Assembly',
  'Welding / Fabrication',
  'Automotive / Mechanics',
  'Carpentry / Woodworking',

  // Agriculture & Outdoors
  'Agriculture / Farming',
  'Horticulture / Landscaping',
  'Forestry / Conservation',
  'Veterinary / Animal Care',
  'Food Production / Processing',
  'Fishing / Aquaculture',

  // Service & Hospitality
  'Retail / E-commerce',
  'Food Service / Restaurant',
  'Hospitality / Hotels',
  'Tourism / Travel',
  'Childcare / Early Education',
  'Elder Care / Home Health',
  'Cleaning / Janitorial',
  'Security / Loss Prevention',

  // Creative & Media
  'Media / Entertainment',
  'Graphic Design / Visual Arts',
  'Photography / Videography',
  'Writing / Journalism',
  'Music / Performing Arts',
  'Gaming / Animation',
  'Fashion / Apparel',

  // Education & Public Service
  'Education / Academia',
  'Social Work / Nonprofits',
  'Government / Public Administration',
  'Military / Defense',
  'Law Enforcement / Corrections',
  'Firefighting / Emergency Services',

  // Logistics & Transport
  'Operations / Supply Chain',
  'Warehouse / Fulfillment',
  'Trucking / Delivery',
  'Aviation / Aerospace',
  'Maritime / Shipping',

  // Entry Level / General
  'Customer Service / Call Center',
  'Administrative / Office Support',
  'Data Entry / Clerical',
  'General Labor',
]

export default function HiringLensBuilderPage() {
  const router = useRouter()
  const outputRef = useRef<HTMLDivElement>(null)

  const [session, setSession] = useState<any>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const [buyingCredits, setBuyingCredits] = useState(false)
  const [planError, setPlanError] = useState(false)
  const [mode, setMode] = useState<'optimize' | 'build'>('optimize')
  const [sector, setSector] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [existingResume, setExistingResume] = useState('')

  // Build mode fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [workHistory, setWorkHistory] = useState('')
  const [skills, setSkills] = useState('')
  const [education, setEducation] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resume, setResume] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/auth?redirect=/hiringlens/builder')
        return
      }
      setSession(data.session)

      // Load profile for credits/plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, resume_credits')
        .eq('id', data.session.user.id)
        .single()

      const plan = profile?.plan || 'free'
      setIsPaid(plan === 'premium' || plan === 'pro')
      setCredits(profile?.resume_credits || 0)

      // Check for credits=1 param (returned from successful purchase)
      if (typeof window !== 'undefined' && window.location.search.includes('credits=1')) {
        window.history.replaceState({}, '', '/hiringlens/builder')
      }
    })
  }, [router])

  async function buyCredits() {
    if (!session) return
    setBuyingCredits(true)
    try {
      const res = await fetch('/api/create-resume-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Could not start checkout.')
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setBuyingCredits(false)
    }
  }

  async function generate() {
    setError('')
    setPlanError(false)

    if (!sector || !jobTitle.trim()) {
      setError('Please select a sector and enter a job title.')
      return
    }
    if (mode === 'optimize' && existingResume.trim().length < 50) {
      setError('Please paste your existing resume — at least a few lines.')
      return
    }
    if (mode === 'build' && (!name.trim() || !workHistory.trim() || !skills.trim())) {
      setError('Please fill in your name, work history, and skills.')
      return
    }

    setLoading(true)
    setResume('')

    try {
      const body = mode === 'optimize'
        ? { mode, sector, jobTitle, existingResume }
        : { mode, sector, jobTitle, formData: { name, email, phone, location, workHistory, skills, education, additionalNotes: notes } }

      const res = await fetch('/api/hiringlens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

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
      setResume(data.resume)

      // Save to resumes table
      await supabase.from('resumes').insert({
        user_id: session.user.id,
        job_title: jobTitle,
        sector,
        mode,
        content: data.resume,
      })

      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(resume)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadPDF() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Resume — ${jobTitle}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.65;max-width:780px;margin:36px auto;color:#111;}
        pre{white-space:pre-wrap;word-wrap:break-word;font-family:Arial,sans-serif;font-size:11pt;}
        @media print{body{margin:18px;}}
      </style>
    </head><body><pre>${resume.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  function renderResume(text: string) {
    const parts = text.split(/\[([A-Z]+)\]/)
    const sections: { label: string; content: string }[] = []
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i + 1]) sections.push({ label: parts[i], content: parts[i + 1].trim() })
    }
    if (sections.length === 0) {
      return <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-300">{text}</pre>
    }
    return sections.map(({ label, content }) => (
      <div key={label} className="mb-7">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-400">{label}</div>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-300">{content}</pre>
      </div>
    ))
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
              ATS Resume Builder
            </div>
            <h1 className="font-serif text-5xl font-black text-white md:text-6xl">
              Build your resume
            </h1>
            <p className="mt-4 text-lg text-slate-400">
              Optimized for ATS systems. Tailored to your sector and target role.
            </p>
          </div>

          {/* Credit counter for free users */}
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
              <div className="mb-3 text-4xl">✍️</div>
              <h2 className="mb-2 text-xl font-bold text-white">No credits left</h2>
              <p className="mb-6 text-slate-400">Buy a credit pack to keep generating resumes, or upgrade to Premium for unlimited access.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={buyCredits}
                  disabled={buyingCredits}
                  className="rounded-xl bg-emerald-400 px-8 py-3 font-semibold text-black hover:bg-emerald-300 disabled:opacity-50"
                >
                  {buyingCredits ? 'Loading...' : 'Buy 5 Credits — $3.99'}
                </button>
                <a href="/#pricing" className="rounded-xl border border-white/10 px-8 py-3 font-semibold text-white hover:border-emerald-400/50">
                  View Plans →
                </a>
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div className="mb-6 flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5">
            <button
              onClick={() => setMode('optimize')}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
                mode === 'optimize' ? 'bg-emerald-400 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Optimize Existing Resume
            </button>
            <button
              onClick={() => setMode('build')}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
                mode === 'build' ? 'bg-emerald-400 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Build New Resume
            </button>
          </div>

          {/* Form */}
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 space-y-6">

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Target Sector</label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className={inputClass + ' cursor-pointer'}
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" style={{ background: '#0d1f14' }}>Select a sector...</option>
                  {SECTORS.map(s => <option key={s} value={s} style={{ background: '#0d1f14' }}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Target Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Marketing Manager"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Optimize mode */}
            {mode === 'optimize' && (
              <div>
                <label className={labelClass}>Paste Your Existing Resume</label>
                <textarea
                  value={existingResume}
                  onChange={e => setExistingResume(e.target.value)}
                  placeholder="Paste your current resume here — any format is fine. We'll rewrite and optimize it for your target role."
                  rows={12}
                  className={inputClass + ' resize-y font-mono leading-6'}
                />
                <div className="mt-1 text-right text-xs text-slate-500">{existingResume.length} characters</div>
              </div>
            )}

            {/* Build mode */}
            {mode === 'build' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jordan Taylor" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jordan@example.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Location</label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="New York, NY" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Work History * — describe each role (company, title, dates, what you did)</label>
                  <textarea
                    value={workHistory}
                    onChange={e => setWorkHistory(e.target.value)}
                    placeholder={"Acme Corp, Marketing Manager, Jan 2022 – Present\n- Ran email campaigns with 35% open rate\n- Managed $200k ad budget\n\nStartup XYZ, Marketing Coordinator, 2020–2022\n- Grew social following by 40%..."}
                    rows={8}
                    className={inputClass + ' resize-y'}
                  />
                </div>

                <div>
                  <label className={labelClass}>Skills * — list your key skills</label>
                  <input
                    type="text"
                    value={skills}
                    onChange={e => setSkills(e.target.value)}
                    placeholder="SEO, Google Analytics, HubSpot, A/B Testing, Content Strategy..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Education</label>
                  <input
                    type="text"
                    value={education}
                    onChange={e => setEducation(e.target.value)}
                    placeholder="B.S. Marketing, NYU, 2020"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Additional Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Certifications, awards, languages, or anything else worth including..."
                    rows={3}
                    className={inputClass + ' resize-y'}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading || planError}
              className="w-full rounded-xl bg-emerald-400 py-4 text-base font-bold text-black transition-all hover:bg-emerald-300 disabled:opacity-50"
            >
              {loading ? 'Generating your resume...' : 'Generate Resume →'}
            </button>
          </div>

          {/* Output */}
          {resume && (
            <div ref={outputRef} className="mt-10">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-serif text-3xl font-bold text-white">Your Resume</h2>
                <div className="flex gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:border-emerald-400/50 transition-colors"
                  >
                    {copied ? '✓ Copied' : 'Copy Text'}
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-400 hover:text-black transition-colors"
                  >
                    Download PDF
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
                <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
                  ATS-Optimized · {sector} · {jobTitle}
                </div>
                {renderResume(resume)}
              </div>

              <p className="mt-4 text-center text-xs text-slate-500">
                Always review your resume before sending. Never submit without reading it first.
              </p>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  )
}
