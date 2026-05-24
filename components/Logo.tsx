import Link from 'next/link'

export function Logo({ product = 'ContractLens', href = '/' }: { product?: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 no-underline">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-gold to-goldDark text-sm text-ink shadow-lg shadow-gold/10">📄</div>
      <span className="font-serif text-lg font-bold text-paper">{product}</span>
    </Link>
  )
}
