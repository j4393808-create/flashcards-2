import Link from 'next/link'

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            س
          </span>
          سمّع
        </Link>
        {children}
      </div>
    </header>
  )
}
