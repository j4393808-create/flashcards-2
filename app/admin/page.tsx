import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { DeckEditor } from '@/components/admin/deck-editor'
import { decks } from '@/lib/decks'

export const metadata: Metadata = {
  title: 'لوحة التحضير | سمّع',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader>
        <span className="text-sm text-muted-foreground">لوحة التحضير</span>
      </SiteHeader>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <DeckEditor existingDecks={decks} />
      </main>
    </div>
  )
}
