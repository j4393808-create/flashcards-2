import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { decks } from '@/lib/decks'
import { countBlanks } from '@/lib/cloze'

export default function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <section className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-bold text-balance md:text-4xl">
            احفظ الكتاب بنصه، وسمّع لنفسك فراغ فراغ
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
            كل كارت فيه جملة من الكتاب زي ما هي بالظبط، والكلمات المهمة متفرّغة. اكشفها أو اكتبها
            بنفسك، وعلّم على اللي حفظته علشان تراجع الباقي بس.
          </p>
        </section>

        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">الكتب المتاحة</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const blanks = deck.cards.reduce((sum, c) => sum + countBlanks(c.cloze), 0)
            return (
              <li key={deck.id}>
                <Link
                  href={`/decks/${deck.id}`}
                  className="group flex h-full flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary"
                >
                  <span className="w-fit rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    {deck.subject}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold" dir="auto">
                    {deck.title}
                  </h3>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {deck.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Layers className="size-4" aria-hidden />
                      {deck.cards.length} كارت · {blanks} فراغ
                    </span>
                    <span className="flex items-center gap-1 font-medium text-primary">
                      ابدأ
                      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          لوحة التحضير
        </Link>
      </footer>
    </div>
  )
}
