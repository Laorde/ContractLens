import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Navbar simple />
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-16 leading-8">
        <h1 className="font-serif text-4xl font-bold">{title}</h1>
        <p className="mb-10 mt-2 text-xs text-muted">Last updated: {updated}</p>
        <div className="space-y-5 text-sm text-[#c8c4bc] [&_h2]:pt-8 [&_h2]:text-base [&_h2]:font-medium [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:text-gold [&_a]:text-gold">{children}</div>
      </main>
      <Footer />
    </>
  )
}
