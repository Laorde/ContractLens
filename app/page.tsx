import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const features = [
  ['🚩', 'Red Flag Detection', 'Suspicious clauses are flagged with severity ratings so you know what needs attention.'],
  ['📖', 'Plain-English TL;DR', 'Get a short summary of what the contract actually says before reading details.'],
  ['⚖️', 'Tradeoff Analysis', 'See what you give up versus what you get, with unfair tradeoffs highlighted.'],
  ['🔎', 'Missing Clause Detection', 'Spot important protections that are completely absent from the contract.'],
  ['📊', 'Risk Score', 'A simple 0–100 score gives you an at-a-glance read on risk.'],
  ['💡', 'Actionable Recommendations', 'Specific steps to take before signing, negotiating, or walking away.']
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="relative z-10 overflow-hidden">

        <div className="absolute left-1/2 top-20 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#c9a84c]/10 blur-[140px]" />

        <section className="relative flex min-h-[88vh] flex-col items-center justify-center px-6 py-20 text-center">

          <div className="rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#c9a84c]">
            ⚖️ AI-Powered Contract Analysis
          </div>

          <h1 className="mt-7 max-w-5xl font-serif text-6xl font-black leading-tight text-[#f3efe7] md:text-8xl">
            Read the fine print
            <br />
            <span className="bg-gradient-to-r from-[#c9a84c] to-[#8b6914] bg-clip-text text-transparent">
              before it reads you
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#8b8b99]">
            Paste any contract — lease, job offer, NDA, freelance agreement —
            and ContractLens explains it in plain English, flags red flags,
            and shows you exactly what you're agreeing to.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">

            <Link
              href="/auth?mode=signup"
              className="rounded-2xl bg-gradient-to-r from-[#c9a84c] to-[#8b6914] px-8 py-4 text-lg font-bold text-black shadow-[0_0_35px_rgba(201,168,76,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_0_55px_rgba(201,168,76,0.55)]"
            >
              Get Started →
            </Link>

            <Link
              href="#pricing"
              className="rounded-2xl border border-[#2a2a35] bg-[#111118] px-8 py-4 text-lg font-semibold text-[#f3efe7] transition-all hover:border-[#c9a84c]"
            >
              View Pricing
            </Link>

          </div>

        </section>

        <section className="px-6 py-24">

          <div className="mx-auto max-w-6xl">

            <div className="mb-14">

              <div className="text-xs uppercase tracking-[0.2em] text-[#c9a84c]">
                Features
              </div>

              <h2 className="mt-4 font-serif text-5xl font-black text-[#f3efe7]">
                Understand contracts instantly
              </h2>

            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {features.map(([icon, title, desc]) => (
                <div
                  key={title}
                  className="rounded-[28px] border border-[#23232d] bg-[#111118] p-8 transition-all hover:border-[#c9a84c]/40 hover:shadow-[0_0_35px_rgba(201,168,76,0.08)]"
                >

                  <div className="mb-5 text-5xl">
                    {icon}
                  </div>

                  <h3 className="text-2xl font-bold text-[#f3efe7]">
                    {title}
                  </h3>

                  <p className="mt-4 leading-8 text-[#8b8b99]">
                    {desc}
                  </p>

                </div>
              ))}

            </div>

          </div>

        </section>

        <section id="pricing" className="px-6 py-24">

          <div className="mx-auto max-w-6xl">

            <div className="mb-14 text-center">

              <div className="text-xs uppercase tracking-[0.2em] text-[#c9a84c]">
                Pricing
              </div>

              <h2 className="mt-4 font-serif text-6xl font-black text-[#f3efe7]">
                Simple pricing
              </h2>

            </div>

            <div className="grid gap-8 md:grid-cols-3">

              {[
                ['Free', '$0', '2 scans/month'],
                ['Premium', '$9.99', '30 scans/month'],
                ['Pro', '$19.99', '100 scans/month']
              ].map(([tier, price, desc], i) => {

                const featured = i === 1

                return (
                  <div
                    key={tier}
                    className={`relative rounded-[32px] border p-8 transition-all ${
                      featured
                        ? 'border-[#c9a84c] bg-gradient-to-b from-[#161616] to-[#0b0b0f] shadow-[0_0_60px_rgba(201,168,76,0.16)]'
                        : 'border-[#23232d] bg-[#111118] hover:border-[#c9a84c]/40'
                    }`}
                  >

                    {featured && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#c9a84c] px-4 py-1 text-xs font-bold text-black">
                        MOST POPULAR
                      </div>
                    )}

                    <div className="text-center text-sm uppercase tracking-[0.2em] text-[#c9a84c]">
                      {tier}
                    </div>

                    <div className="mt-5 text-center font-serif text-6xl font-black text-[#f3efe7]">
                      {price}
                    </div>

                    <div className="mt-4 text-center text-lg text-[#8b8b99]">
                      {desc}
                    </div>

                    <div className="mt-8 space-y-3 text-sm text-[#b4b4c2]">

                      <div>✓ AI contract analysis</div>
                      <div>✓ Plain-English summaries</div>
                      <div>✓ Risk flag detection</div>

                    </div>

                    <Link
                      href="/auth?mode=signup"
                      className={`mt-10 flex w-full items-center justify-center rounded-2xl py-4 text-lg font-bold transition-all ${
                        featured
                          ? 'bg-gradient-to-r from-[#c9a84c] to-[#8b6914] text-black hover:opacity-90'
                          : 'border border-[#c9a84c]/40 bg-[#0b0b10] text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black'
                      }`}
                    >
                      Get Started →
                    </Link>

                  </div>
                )
              })}

            </div>

          </div>

        </section>

      </main>

      <Footer />
    </>
  )
}