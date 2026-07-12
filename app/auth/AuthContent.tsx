'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const mode = searchParams.get('mode') || 'signin'
  const redirect = searchParams.get('redirect') || '/scan'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        setMessage('Account created! Check your email to confirm.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        router.push(redirect)
      }
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0c0c10] text-white px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur">
        <h1 className="text-3xl font-bold mb-2 text-center">
          {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
        </h1>

        <p className="text-center text-white/60 mb-6">
          {mode === 'signup'
            ? 'Start analyzing contracts smarter.'
            : 'Sign in to continue.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-yellow-500 py-3 font-semibold text-black hover:opacity-90 transition disabled:opacity-50"
          >
            {loading
              ? 'Loading...'
              : mode === 'signup'
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-center">
            {message}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-white/60">
          {mode === 'signup' ? (
            <a href="/auth?mode=signin" className="hover:text-yellow-500">
              Already have an account? Sign in
            </a>
          ) : (
            <a href="/auth?mode=signup" className="hover:text-yellow-500">
              Need an account? Create one
            </a>
          )}
        </div>
      </div>
    </main>
  )
}