'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Navbar } from '@/components/Navbar'

export default function AccountPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [scans, setScans] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth')
        return
      }

      setUser(session.user)

      const { data } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false })

      setScans(data || [])
    }

    load()
  }, [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 pb-16 pt-28">

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
              <div className="text-sm text-[#8b8b99]">
                Signed in as
              </div>

              <div className="mt-2 text-xl font-semibold text-[#f3efe7]">
                {user?.email}
              </div>
            </div>

            <div className="flex gap-3">

              <button
                onClick={() => router.push('/api/billing-portal')}
                className="rounded-xl border border-[#c9a84c]/40 bg-[#0b0b10] px-5 py-3 font-semibold text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black"
              >
                Manage Billing
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

        <div className="mt-10">

          <h2 className="mb-6 font-serif text-3xl font-bold text-[#f3efe7]">
            Scan History
          </h2>

          <div className="space-y-4">

            {scans.map((scan) => (
              <div
                key={scan.id}
                className="rounded-2xl border border-[#23232d] bg-[#111118] p-5"
              >

                <div className="flex items-center justify-between gap-4">

                  <div>
                    <div className="font-semibold text-[#f3efe7]">
                      {scan.title || 'Untitled Scan'}
                    </div>

                    <div className="mt-1 text-sm text-[#8b8b99]">
                      {new Date(scan.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-full bg-[#c9a84c]/10 px-3 py-1 text-sm font-semibold text-[#c9a84c]">
                    Saved
                  </div>

                </div>

              </div>
            ))}

          </div>

        </div>

      </main>
    </>
  )
}