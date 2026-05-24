'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { supabase } from '@/lib/supabaseClient'
import { PLAN_LIMITS } from '@/lib/plans'

export default function AccountPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push('/auth?redirect=/account')
      setSession(data.session)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single()
      setProfile(p || { plan:'free', scans_used:0 })
    })
  }, [router])

  async function signOut() { await supabase.auth.signOut(); router.push('/auth') }
  async function resetPassword() {
    if (!session?.user?.email) return
    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, { redirectTo: `${window.location.origin}/account` })
    setMsg(error ? error.message : 'Reset link sent! Check your email.')
  }
  async function billingPortal() {
    const res = await fetch('/api/billing-portal', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` } })
    const data = await res.json(); if (data.url) location.href = data.url; else setMsg(data.error || 'Could not open billing portal.')
  }

  const plan = profile?.plan || 'free'
  const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || 2
  const used = profile?.scans_used || 0
  const pct = Math.min(100, Math.round((used / limit) * 100))

  return (
    <>
      <Navbar simple />
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between gap-4"><h1 className="font-serif text-3xl font-bold">My Account</h1><button onClick={signOut} className="btn-outline">Sign Out</button></div>
        <div className="card mt-8 p-6">
          <div className="text-xs uppercase tracking-widest text-gold">Current Plan</div>
          <div className="mt-4 flex items-center justify-between"><div className="font-serif text-3xl capitalize">{plan}</div><span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold capitalize">{plan}</span></div>
          <div className="mt-6 flex justify-between text-sm text-muted"><span>Scans used this month</span><span>{used} / {limit}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-goldDark to-gold" style={{ width: `${pct}%` }} /></div>
          {plan === 'free' && <a href="/scan" className="btn-gold mt-6">Upgrade Plan →</a>}
        </div>
        <div className="card mt-4 p-6">
          <div className="text-xs uppercase tracking-widest text-gold">Account Details</div>
          <div className="mt-4 divide-y divide-line text-sm"><div className="flex justify-between py-3"><span className="text-muted">Email</span><span>{session?.user?.email || '—'}</span></div><div className="flex justify-between py-3"><span className="text-muted">Billing cycle</span><span className="capitalize">{plan === 'free' ? 'N/A' : profile?.billing_cycle || '—'}</span></div></div>
        </div>
        <div className="card mt-4 p-6">
          <div className="text-xs uppercase tracking-widest text-gold">Security & Billing</div>
          <div className="mt-5 flex flex-wrap gap-3"><button onClick={resetPassword} className="btn-gold">Send Reset Email</button>{plan !== 'free' && <button onClick={billingPortal} className="btn-outline">Manage Billing →</button>}</div>
          {msg && <div className="mt-4 rounded-lg border border-line bg-panel2 p-3 text-sm text-muted">{msg}</div>}
        </div>
      </main>
    </>
  )
}
