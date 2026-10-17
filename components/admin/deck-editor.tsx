'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Eraser, ListChecks, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { applyTerms, countBlanks, parseTerms, type Card, type Deck } from '@/lib/cloze'
import { CardEditor } from './card-editor'
import { SourcePanel } from './source-panel'

const DRAFT_KEY = 'sammaa-admin-draft'
const PAGE_SIZE = 20
const emptyDeck: Deck = { id: '', title: '', subject: '', description: '', cards: [] }

export function DeckEditor({ existingDecks }: { existingDecks: Deck[] }) {
  const [deck, setDeck] = useState<Deck>(emptyDeck)
  const [terms, setTerms] = useState('')
  const [page, setPage] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw)
        setDeck(draft.deck)
        setTerms(draft.terms ?? '')
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(DRAFT_KEY, JSON.stringify({ deck, terms }))
  }, [deck, terms, hydrated])

  const pageCount = Math.max(1, Math.ceil(deck.cards.length / PAGE_SIZE))
  const visible = deck.cards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const stats = useMemo(() => {
    const counts = deck.cards.map((c) => countBlanks(c.cloze))
    return { blanks: counts.reduce((a, b) => a + b, 0), empty: counts.filter((n) => n === 0).length }
  }, [deck.cards])

  const setCards = (update: (cards: Card[]) => Card[]) => setDeck((d) => ({ ...d, cards: update(d.cards) }))

  const changeCard = useCallback((id: string, cloze: string) => {
    setDeck((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, cloze } : c)) }))
  }, [])
  const deleteCard = useCallback((id: string) => {
    setDeck((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) }))
  }, [])
  const mergeNext = useCallback((id: string) => {
    setDeck((d) => {
      const i = d.cards.findIndex((c) => c.id === id)
      if (i < 0 || i >= d.cards.length - 1) return d
      const merged = { ...d.cards[i], cloze: `${d.cards[i].cloze} ${d.cards[i + 1].cloze}` }
      return { ...d, cards: [...d.cards.slice(0, i), merged, ...d.cards.slice(i + 2)] }
    })
  }, [])

  const addCards = (cards: Card[]) => {
    const total = deck.cards.length + cards.length
    setCards((existing) => [...existing, ...cards])
    setPage(Math.max(0, Math.ceil(total / PAGE_SIZE) - 1))
  }

  const applyTermsToAll = () => {
    const list = parseTerms(terms)
    setCards((cards) => cards.map((c) => ({ ...c, cloze: applyTerms(c.cloze, list) })))
  }

  const exportDeck = () => {
    const id = deck.id.trim() || 'deck'
    const blob = new Blob([JSON.stringify({ ...deck, id }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importDeck = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Deck
      if (!Array.isArray(data.cards)) throw new Error()
      setDeck({ ...emptyDeck, ...data })
      setPage(0)
    } catch {
      alert('الملف ده مش ملف كتاب صالح')
    }
  }

  const clearAll = () => {
    if (!confirm('هتمسح كل الكروت والبيانات؟')) return
    setDeck(emptyDeck)
    setPage(0)
  }

  const meta = (key: keyof Omit<Deck, 'cards'>) => ({
    value: deck[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDeck((d) => ({ ...d, [key]: e.target.value })),
  })

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          عدّل كتاب موجود على الموقع
          <select
            className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            value=""
            onChange={(e) => {
              const chosen = existingDecks.find((d) => d.id === e.target.value)
              if (!chosen) return
              if (deck.cards.length && !confirm('الكروت اللي في المحرر دلوقتي هتتبدّل. تكمل؟')) return
              setDeck(structuredClone(chosen))
              setPage(0)
            }}
          >
            <option value="">اختار كتاب…</option>
            {existingDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.cards.length} كارت)
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">أو ابدأ كتاب جديد من الخطوات تحت</p>
      </section>

      <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="اسم الكتاب" {...meta('title')} placeholder="Guyton – Heart" />
        <Field label="المادة" {...meta('subject')} placeholder="فسيولوجي" />
        <Field label="المعرّف (إنجليزي في الرابط)" {...meta('id')} placeholder="guyton-heart" dir="ltr" />
        <Field label="وصف قصير" {...meta('description')} placeholder="الفصول 9 لـ 12" />
      </section>

      <SourcePanel terms={terms} onTermsChange={setTerms} onGenerate={addCards} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">3. راجع الكروت</h2>
            <p className="text-xs text-muted-foreground">
              {deck.cards.length} كارت · {stats.blanks} فراغ
              {stats.empty > 0 && <span className="text-destructive"> · {stats.empty} من غير فراغات</span>}
              {' · '}اضغط على أي كلمة علشان تفرّغها أو تلغي تفريغها
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={applyTermsToAll} disabled={!deck.cards.length}>
              <ListChecks aria-hidden /> طبّق القائمة على كل الكروت
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload aria-hidden /> افتح ملف
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importDeck(file)
                e.target.value = ''
              }}
            />
            <Button size="sm" onClick={exportDeck} disabled={!deck.cards.length}>
              <Download aria-hidden /> نزّل الكتاب
            </Button>
            <Button variant="destructive" size="sm" onClick={clearAll}>
              <Eraser aria-hidden /> امسح
            </Button>
          </div>
        </div>

        {deck.cards.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            لسه مفيش كروت. الصق نص فوق واضغط &quot;قسّم وفرّغ&quot;.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {visible.map((card, i) => {
              const absolute = page * PAGE_SIZE + i
              return (
                <CardEditor
                  key={card.id}
                  card={card}
                  number={absolute + 1}
                  onChange={changeCard}
                  onDelete={deleteCard}
                  onMergeNext={absolute < deck.cards.length - 1 ? mergeNext : undefined}
                />
              )
            })}
          </ol>
        )}

        {pageCount > 1 && (
          <nav className="flex items-center justify-center gap-2" aria-label="صفحات الكروت">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              السابق
            </Button>
            <span className="text-sm text-muted-foreground">
              صفحة {page + 1} من {pageCount}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
              التالي
            </Button>
          </nav>
        )}
      </section>
    </div>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <input
        {...props}
        className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  )
}
