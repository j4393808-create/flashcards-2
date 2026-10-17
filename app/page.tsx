import Link from 'next/link'
import { ArrowRight, Layers, Lock } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { RedeemForm } from '@/components/redeem-form'
import { getDeckSummaries } from '@/lib/decks'
import { canOpen, getAccess } from '@/lib/access'
import { cn } from '@/lib/utils'

export default async function HomePage() {
  const [decks, access] = await Promise.all([getDeckSummaries(), getAccess()])
  const hasPaid = decks.some((d) => !d.isFree)

  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <section className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-balance md:text-4xl">
              Memorize the textbook word for word, one blank at a time
            </h1>
            <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
              Every card holds a sentence exactly as it appears in the book, with the key words blanked out.
              Reveal them or type them yourself, and mark what you know so you only review the rest.
            </p>
          </div>
          {hasPaid && <RedeemForm className="w-full rounded-xl border bg-card p-4 md:max-w-sm" />}
        </section>

        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Available decks</h2>
        {decks.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No decks published yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => {
              const open = canOpen(deck, access)
              return (
                <li key={deck.id}>
                  <Link
                    href={`/decks/${deck.id}`}
                    className="group flex h-full flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-fit rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                        {deck.subject}
                      </span>
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-medium',
                          deck.isFree ? 'bg-success/15 text-success' : 'bg-highlight text-highlight-foreground',
                        )}
                      >
                        {deck.isFree ? 'Free' : open ? 'Unlocked' : 'Paid'}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold" dir="auto">
                      {deck.title}
                    </h3>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground" dir="auto">
                      {deck.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="size-4" aria-hidden />
                        {deck.cardCount} cards · {deck.blankCount} blanks
                      </span>
                      {open ? (
                        <span className="flex items-center gap-1 font-medium text-primary">
                          Start
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-medium text-muted-foreground">
                          <Lock className="size-4" aria-hidden /> Locked
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Admin panel
        </Link>
      </footer>
    </div>
  )
}
