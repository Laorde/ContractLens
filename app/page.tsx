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
        <section className="relative flex min-h-[88vh] flex-col items-center justify-center px-6 py-20 text-center">
          <div className="absolute -top-24 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-gold/10 blur-[120px]" />
          <div className="eyebrow">⚖️ AI-Powered Contract Analysis</div>
          <h1 className="mt-7 max-w-4xl font-serif text-5xl font-black leading-tight md:text-7xl">
            Read the fine print<br /><em className="text-gold">before it reads you</em>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted md:text-lg">
            Paste any contract — lease, job offer, NDA, freelance agreement — and ContractLens explains it in plain English, flags red flags, and shows you exactly what you're agreeing to.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/auth?mode=signup" className="btn-gold px-7 py-3">Get Early Access — Free</Link>
            <Link href="#how-it-works" className="btn-outline px-7 py-3">See How It Works</Link>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
            <span>🔒 No account needed to try</span><span>•</span><span>2 free scans/month</span><span>•</span><span>Works on any contract type</span>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-line bg-panel px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <span className="text-xs uppercase tracking-[0.14em] text-gold">How it works</span>
            <h2 className="mt-4 font-serif text-4xl font-bold md:text-5xl">From confusing legalese<br />to plain English in seconds</h2>
            <div className="mt-12 grid gap-1 md:grid-cols-4">
              {['Paste or upload your contract', 'AI reads every clause', 'Get a plain-English breakdown', 'Sign with confidence'].map((step, i) => (
                <div key={step} className="card p-7">
                  <div className="font-serif text-5xl font-black text-gold/20">0{i + 1}</div>
                  <h3 className="mt-5 font-medium text-paper">{step}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">ContractLens keeps the process simple, fast, and easy to understand.</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <span className="text-xs uppercase tracking-[0.14em] text-gold">What you get</span>
            <h2 className="mt-4 font-serif text-4xl font-bold md:text-5xl">Everything you need to protect yourself</h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {features.map(([icon, title, text]) => (
                <div key={title} className="card p-7 transition hover:-translate-y-0.5 hover:border-muted">
                  <div className="mb-5 grid h-11 w-11 place-items-center rounded-lg border border-gold/20 bg-gold/10 text-xl">{icon}</div>
                  <h3 className="font-medium text-paper">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <span className="text-xs uppercase tracking-[0.14em] text-gold">Pricing</span>
            <h2 className="mt-4 font-serif text-4xl font-bold">Simple, honest pricing</h2>
            <div className="mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
              {[['Free', '$0', '2 scans/month'], ['Premium', '$9.99', '30 scans/month'], ['Pro', '$19.99', '100 scans/month']].map(([tier, price, desc], i) => (
                <div key={tier} className={`card p-7 ${i === 1 ? 'border-gold bg-gradient-to-br from-panel2 to-panel' : ''}`}>
                  <div className="text-xs uppercase tracking-widest text-muted">{tier}</div>
                  <div className="mt-3 font-serif text-4xl font-bold">{price}</div>
                  <div className="mt-2 text-sm text-gold">{desc}</div>
                  <Link href="/auth?mode=signup" className={i === 1 ? 'btn-gold mt-8 w-full' : 'btn-outline mt-8 w-full'}>Get Started</Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
