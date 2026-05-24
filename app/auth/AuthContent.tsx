'use client'

import { useSearchParams } from 'next/navigation'

export default function AuthContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'signin'

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0c0c10] text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
        </h1>

        <form className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none"
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-yellow-500 py-3 font-semibold text-black hover:opacity-90"
          >
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  )
}