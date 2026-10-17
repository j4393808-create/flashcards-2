import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { isAdmin } from '@/lib/admin-auth'
import { getDeckSummaries } from '@/lib/decks'

export const metadata: Metadata = {
  title: 'Admin panel | Sammaa',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  if (!(await isAdmin())) notFound()
  const decks = await getDeckSummaries()

  return (
    <div className="min-h-dvh">
      <SiteHeader>
        <span className="text-sm text-muted-foreground">Admin panel</span>
      </SiteHeader>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <AdminTabs decks={decks} />
      </main>
    </div>
  )
}
