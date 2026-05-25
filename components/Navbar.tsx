'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { supabase } from '@/lib/supabaseClient'

export function Navbar({ simple = false }: { simple?: boolean }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
      setLoaded(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
      setLoaded(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#23232d] bg-[#09090c]/90 px-5 py-4 backdrop-blur md:px-12">
      <Logo />

      <div className="hidden items-center gap-8 md:flex">
        {!simple && (
          <>
            <Link className="text-sm text-[#8b8b99] hover:text-[#f3efe7]" href="/#how-it-works">
              How it works
            </Link>

            <Link className="text-sm text-[#8b8b99] hover:text-[#f3efe7]" href="/#pricing">
              Pricing
            </Link>

            <Link className="text-sm text-[#8b8b99] hover:text-[#f3efe7]" href="/hiringlens">
              HiringLens
            </Link>
          </>
        )}

        {loaded && loggedIn ? (
          <>
            <Link className="text-sm text-[#8b8b99] hover:text-[#f3efe7]" href="/scan">
              Scan
            </Link>

            <Link className="text-sm text-[#8b8b99] hover:text-[#f3efe7]" href="/account">
              Account
            </Link>
          </>
        ) : (
          <>
            <Link className="text-sm text-[#8b8b99] hover:text-[#f3efe7]" href="/auth">
              Sign In
            </Link>

            <Link
              className="rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#8b6914] px-5 py-2 text-sm font-semibold text-black"
              href="/auth?mode=signup"
            >
              Try Free
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}