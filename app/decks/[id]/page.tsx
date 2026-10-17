import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { StudySession } from '@/components/study-session'
import { decks, getDeck } from '@/lib/decks'

export function generateStaticParams() {
  return decks.map((deck) => ({ id: deck.id }))
}

export async function generateMetadata({ params }: PageProps<'/decks/[id]'>): Promise<Metadata> {
  const deck = getDeck((await params).id)
  return { title: deck ? `${deck.title} | سمّع` : 'سمّع' }
}

export default async function DeckPage({ params }: PageProps<'/decks/[id]'>) {
  const deck = getDeck((await params).id)
  if (!deck) notFound()

  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader>
        <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-4" aria-hidden />
          كل الكتب
        </Link>
      </SiteHeader>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-6">
          <span className="text-xs font-medium text-primary">{deck.subject}</span>
          <h1 className="text-2xl font-bold" dir="auto">
            {deck.title}
          </h1>
        </div>
        <StudySession deck={deck} />
      </main>
    </div>
  )
}
