'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { supabase } from '@/lib/supabaseClient'

export default function AuthPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'login'|'signup'|'forgot'>(params.get('mode') === 'signup' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<{type:'error'|'success', text:string} | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) router.push(params.get('redirect') || '/scan') }) }, [router, params])

  async function login() {
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setMsg({ type:'error', text:error.message })
    router.push(params.get('redirect') || '/scan')
  }
  async function signup() {
    if (password.length < 8) return setMsg({ type:'error', text:'Password must be at least 8 characters.' })
    if (password !== confirm) return setMsg({ type:'error', text:"Passwords don't match." })
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/scan` } })
    setLoading(false)
    if (error) return setMsg({ type:'error', text:error.message })
    setMsg({ type:'success', text:'Check your inbox — we sent you a confirmation link.' })
  }
  async function forgot() {
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth?mode=reset` })
    setLoading(false)
    if (error) return setMsg({ type:'error', text:error.message })
    setMsg({ type:'success', text:'Reset link sent — check your inbox.' })
  }

  return (
    <>
      <Navbar simple />
      <main className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-5 py-10">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-center font-serif text-3xl font-bold">{mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password'}</h1>
          <p className="mt-2 text-center text-sm text-muted">Sign in to analyze contracts and use your AI tools.</p>
          {mode !== 'forgot' && <div className="mt-8 grid grid-cols-2 rounded-lg border border-line bg-panel2 p-1"><button onClick={()=>setMode('login')} className={`rounded-md py-2 text-sm ${mode==='login'?'bg-gradient-to-br from-gold to-goldDark text-ink':'text-muted'}`}>Sign In</button><button onClick={()=>setMode('signup')} className={`rounded-md py-2 text-sm ${mode==='signup'?'bg-gradient-to-br from-gold to-goldDark text-ink':'text-muted'}`}>Create Account</button></div>}
          {mode === 'signup' && <div className="mt-6 rounded-lg border border-gold/20 bg-gold/10 p-4 text-center text-sm text-muted">Start free — <b className="text-gold">2 scans included</b> every month.</div>}
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-muted">Email<input value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-line bg-panel2 px-4 py-3 text-paper outline-none focus:border-gold" type="email" /></label>
            {mode !== 'forgot' && <label className="block text-sm text-muted">Password<input value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-line bg-panel2 px-4 py-3 text-paper outline-none focus:border-gold" type="password" /></label>}
            {mode === 'signup' && <label className="block text-sm text-muted">Confirm Password<input value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 w-full rounded-lg border border-line bg-panel2 px-4 py-3 text-paper outline-none focus:border-gold" type="password" /></label>}
          </div>
          <button disabled={loading} onClick={mode==='login'?login:mode==='signup'?signup:forgot} className="btn-gold mt-6 w-full py-3 disabled:opacity-50">{loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Free Account' : 'Send Reset Link'}</button>
          {mode === 'login' && <button onClick={()=>setMode('forgot')} className="mt-3 w-full text-right text-xs text-muted hover:text-gold">Forgot password?</button>}
          {mode === 'forgot' && <button onClick={()=>setMode('login')} className="mt-4 w-full text-center text-xs text-gold">← Back to sign in</button>}
          {msg && <div className={`mt-5 rounded-lg border p-3 text-sm ${msg.type === 'error' ? 'border-red-900 bg-red-950/40 text-red-300' : 'border-emerald-900 bg-emerald-950/40 text-emerald-300'}`}>{msg.text}</div>}
        </div>
      </main>
    </>
  )
}
