'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Navbar } from '@/components/Navbar'

export default function AccountPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [scans, setScans] = useState<any[]>([])
  const [selectedScan, setSelectedScan] = useState<any>(null)
  const [resumes, setResumes] = useState<any[]>([])
  const [selectedResume, setSelectedResume] = useState<any>(null)
  const [historyTab, setHistoryTab] = useState<'scans' | 'resumes'>('scans')
  const [billingLoading, setBillingLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth')
        return
      }

      setSession(session)
      setUser(session.user)

      const { data: scanData } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false })

      setScans(scanData || [])
      setSelectedScan(scanData?.[0] || null)

      const { data: resumeData } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false })

      setResumes(resumeData || [])
      setSelectedResume(resumeData?.[0] || null)
    }

    load()
  }, [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function resetPassword() {
    if (!user?.email) return

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth`,
    })

    alert(error ? error.message : 'Password reset email sent.')
  }

  const result = selectedScan?.result

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-28">
        <div className="mb-10">
          <h1 className="font-serif text-5xl font-black text-[#f3efe7]">
            Account
          </h1>
          <p className="mt-3 text-[#8b8b99]">
            Manage your account, billing, and scan history.
          </p>
        </div>

        <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-[#8b8b99]">Signed in as</div>
              <div className="mt-2 text-xl font-semibold text-[#f3efe7]">
                {user?.email}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={resetPassword}
                className="rounded-xl border border-[#23232d] bg-[#0b0b10] px-5 py-3 font-semibold text-[#f3efe7] hover:border-[#c9a84c]"
              >
                Reset Password
              </button>

              <button
                disabled={billingLoading}
                onClick={async () => {
                  if (!session) return
                  setBillingLoading(true)
                  try {
                    const res = await fetch('/api/billing-portal', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                      },
                    })
                    const data = await res.json()
                    if (data.url) {
                      window.location.href = data.url
                    } else {
                      alert(data.error || 'Could not open billing portal.')
                    }
                  } catch {
                    alert('Network error. Please try again.')
                  } finally {
                    setBillingLoading(false)
                  }
                }}
                className="rounded-xl border border-[#c9a84c]/40 bg-[#0b0b10] px-5 py-3 font-semibold text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black disabled:opacity-50"
              >
                {billingLoading ? 'Opening...' : 'Manage Billing'}
              </button>

              <button
                onClick={signOut}
                className="rounded-xl border border-[#23232d] bg-[#0b0b10] px-5 py-3 font-semibold text-[#f3efe7] hover:border-red-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* History tabs */}
        <div className="mt-10">
          <div className="mb-6 flex gap-2 rounded-2xl border border-[#23232d] bg-[#111118] p-1.5 w-fit">
            <button
              onClick={() => setHistoryTab('scans')}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${historyTab === 'scans' ? 'bg-[#c9a84c] text-black' : 'text-[#8b8b99] hover:text-[#f3efe7]'}`}
            >
              Scan History
            </button>
            <button
              onClick={() => setHistoryTab('resumes')}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${historyTab === 'resumes' ? 'bg-emerald-400 text-black' : 'text-[#8b8b99] hover:text-[#f3efe7]'}`}
            >
              Resume History
            </button>
          </div>

          {historyTab === 'scans' && (
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <section>
                <div className="space-y-4">
                  {scans.length === 0 ? (
                    <div className="rounded-2xl border border-[#23232d] bg-[#111118] p-5 text-[#8b8b99]">
                      No scans saved yet.
                    </div>
                  ) : (
                    scans.map((scan) => {
                      const active = selectedScan?.id === scan.id
                      return (
                        <button
                          key={scan.id}
                          onClick={() => setSelectedScan(scan)}
                          className={`w-full rounded-2xl border p-5 text-left transition-all ${active ? 'border-[#c9a84c] bg-[#16130b] shadow-[0_0_30px_rgba(201,168,76,0.12)]' : 'border-[#23232d] bg-[#111118] hover:border-[#c9a84c]/50'}`}
                        >
                          <div className="font-semibold text-[#f3efe7]">{scan.title || 'Untitled Scan'}</div>
                          <div className="mt-2 text-sm text-[#8b8b99]">{new Date(scan.created_at).toLocaleString()}</div>
                          <div className="mt-3 inline-flex rounded-full bg-[#c9a84c]/10 px-3 py-1 text-xs font-semibold text-[#c9a84c]">
                            {scan.result?.overallRisk || 'Saved'}{scan.result?.riskScore !== undefined ? ` · ${scan.result.riskScore}/100` : ''}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </section>

              <section>
                {!selectedScan ? (
                  <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8 text-[#8b8b99]">Select a scan to view the details.</div>
                ) : (
                  <div className="space-y-6">
                    <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-serif text-3xl font-bold text-[#f3efe7]">Analysis</h3>
                        <span className="rounded-full bg-[#c9a84c]/10 px-4 py-2 text-sm font-semibold text-[#c9a84c]">
                          {result?.overallRisk || 'Saved'}{result?.riskScore !== undefined ? ` · ${result.riskScore}/100` : ''}
                        </span>
                      </div>
                      <p className="mt-6 leading-8 text-[#b4b4c2]">{result?.summary || 'No summary saved.'}</p>
                    </div>
                    {result?.tldr?.length ? (
                      <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
                        <h3 className="text-xl font-bold text-[#c9a84c]">TL;DR</h3>
                        <ul className="mt-4 space-y-3 text-[#b4b4c2]">{result.tldr.map((item: string, i: number) => <li key={i}>• {item}</li>)}</ul>
                      </div>
                    ) : null}
                    {result?.redFlags?.length ? (
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
                  </div>
                )}
              </section>
            </div>
          )}

          {historyTab === 'resumes' && (
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <section>
                <div className="space-y-4">
                  {resumes.length === 0 ? (
                    <div className="rounded-2xl border border-[#23232d] bg-[#111118] p-5 text-[#8b8b99]">
                      No resumes saved yet. <a href="/hiringlens/builder" className="text-emerald-400 hover:underline">Build one →</a>
                    </div>
                  ) : (
                    resumes.map((resume) => {
                      const active = selectedResume?.id === resume.id
                      return (
                        <button
                          key={resume.id}
                          onClick={() => setSelectedResume(resume)}
                          className={`w-full rounded-2xl border p-5 text-left transition-all ${active ? 'border-emerald-400 bg-[#0d1f14] shadow-[0_0_30px_rgba(52,211,153,0.08)]' : 'border-[#23232d] bg-[#111118] hover:border-emerald-400/40'}`}
                        >
                          <div className="font-semibold text-[#f3efe7]">{resume.job_title || 'Untitled Resume'}</div>
                          <div className="mt-1 text-sm text-[#8b8b99]">{resume.sector}</div>
                          <div className="mt-2 text-xs text-[#8b8b99]">{new Date(resume.created_at).toLocaleString()}</div>
                          <div className="mt-3 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                            {resume.mode === 'optimize' ? 'Optimized' : 'Built from scratch'}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </section>

              <section>
                {!selectedResume ? (
                  <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8 text-[#8b8b99]">Select a resume to view it.</div>
                ) : (
                  <div className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8">
                    <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-serif text-2xl font-bold text-[#f3efe7]">{selectedResume.job_title}</h3>
                        <div className="mt-1 text-sm text-[#8b8b99]">{selectedResume.sector}</div>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedResume.content)}
                        className="rounded-xl border border-[#23232d] bg-[#0b0b10] px-4 py-2 text-sm font-semibold text-[#f3efe7] hover:border-emerald-400/50"
                      >
                        Copy Text
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[#b4b4c2]">{selectedResume.content}</pre>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  )
}