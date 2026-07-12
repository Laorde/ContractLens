import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function HiringLensPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 overflow-hidden bg-[#06100d]">
        <section className="mx-auto grid min-h-[88vh] max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <div className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs uppercase tracking-widest text-emerald-300">AI-Powered Resume Builder</div>
            <h1 className="mt-7 text-5xl font-black leading-tight text-white md:text-7xl">Resumes that get noticed. By <span className="text-emerald-400">AI</span> and by <span className="text-emerald-400">humans</span>.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Answer a few simple questions and HiringLens helps you create a clean, professional, ATS-friendly resume tailored to the job you want.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/hiringlens/builder" className="rounded-xl bg-emerald-400 px-6 py-3 font-medium text-black hover:bg-emerald-300">Create My Resume →</Link>
              <Link href="/" className="rounded-xl border border-white/15 px-6 py-3 text-white hover:bg-white/10">Back to ContractLens</Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-emerald-950/50">
            <div className="rounded-3xl bg-white p-8 text-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-2xl font-bold">JORDAN TAYLOR</h2><p className="text-sm text-emerald-700">Marketing Manager</p></div>
                <div className="rounded-2xl bg-emerald-100 px-4 py-2 text-lg font-black text-emerald-700">92%</div>
              </div>
              <div className="mt-8 space-y-5 text-sm leading-7">
                <div><h3 className="font-bold text-emerald-700">PROFESSIONAL SUMMARY</h3><p>Results-driven professional with experience in customer communication, performance tracking, and team collaboration.</p></div>
                <div><h3 className="font-bold text-emerald-700">EXPERIENCE</h3><ul className="mt-2 list-disc space-y-2 pl-5"><li>Improved qualified leads by <b>45%</b> through targeted campaigns.</li><li>Managed a team of <b>5</b> and supported cross-functional goals.</li><li>Optimized reporting workflows and improved ROI by <b>28%</b>.</li></ul></div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
