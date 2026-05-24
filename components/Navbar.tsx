import Link from 'next/link'
import { Logo } from './Logo'

export function Navbar({ simple = false }: { simple?: boolean }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-ink/90 px-5 py-4 backdrop-blur md:px-12">
      <Logo />
      {!simple && (
        <div className="hidden items-center gap-8 md:flex">
          <Link className="text-sm text-muted hover:text-paper" href="/#how-it-works">How it works</Link>
          <Link className="text-sm text-muted hover:text-paper" href="/#pricing">Pricing</Link>
          <Link className="text-sm text-muted hover:text-paper" href="/hiringlens">HiringLens</Link>
          <Link className="text-sm text-muted hover:text-paper" href="/auth">Sign In</Link>
          <Link className="btn-gold" href="/auth?mode=signup">Try Free</Link>
        </div>
      )}
    </nav>
  )
}
