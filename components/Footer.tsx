import Link from 'next/link'

export function Footer() {
  return (
    <footer className="relative z-10 flex flex-col gap-4 border-t border-line px-5 py-10 text-center md:flex-row md:items-center md:justify-between md:px-12 md:text-left">
      <div>
        <div className="font-serif text-lg font-bold text-paper">📄 ContractLens</div>
        <div className="mt-1 text-xs text-muted">Plain-English Contract Analysis</div>
      </div>
      <div className="flex flex-wrap justify-center gap-5 text-xs text-muted">
        <Link href="/#how-it-works" className="hover:text-paper">How it works</Link>
        <Link href="/#pricing" className="hover:text-paper">Pricing</Link>
        <Link href="/hiringlens" className="hover:text-paper">HiringLens</Link>
        <Link href="/privacy" className="hover:text-paper">Privacy</Link>
        <Link href="/terms" className="hover:text-paper">Terms</Link>
      </div>
      <div className="max-w-sm text-xs text-muted">Not legal advice. Always consult a licensed attorney for significant contracts.</div>
    </footer>
  )
}
