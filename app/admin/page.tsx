import type { Metadata } from 'next'
import { LogOut } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { AdminLogin } from '@/components/admin/admin-login'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { Button } from '@/components/ui/button'
import { isAdmin } from '@/lib/admin-auth'
import { getDeckSummaries } from '@/lib/decks'
import { adminLogout } from './actions'

export const metadata: Metadata = {
  title: 'Admin panel | Sammaa',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const authed = await isAdmin()
  const decks = authed ? await getDeckSummaries() : []

  return (
    <div className="min-h-dvh">
      <SiteHeader>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Admin panel</span>
          {authed && (
            <form action={adminLogout}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut aria-hidden /> Log out
              </Button>
            </form>
          )}
        </div>
      </SiteHeader>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {authed ? <AdminTabs decks={decks} /> : <AdminLogin />}
      </main>
    </div>
  )
}
