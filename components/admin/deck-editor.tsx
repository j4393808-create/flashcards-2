'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudUpload, Download, Eraser, ListChecks, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { applyTerms, countBlanks, parseTerms, type Card, type Deck } from '@/lib/cloze'
import type { DeckSummary } from '@/lib/decks'
import { deleteCards, finishDeckSave, loadDeck, saveCard, saveDeckMeta } from '@/app/admin/actions'
import { CardEditor } from './card-editor'
import { SourcePanel } from './source-panel'

const DRAFT_KEY = 'sammaa-admin-draft'
const PAGE_SIZE = 20
const emptyDeck: Deck = { id: '', title: '', subject: '', description: '', isFree: true, cards: [] }

type SaveState = { status: 'idle' } | { status: 'saving'; done: number; total: number } | { status: 'done' } | { status: 'error'; message: string }

export function DeckEditor({ existingDecks }: { existingDecks: DeckSummary[] }) {
  const router = useRouter()
  const [deck, setDeck] = useState<Deck>(emptyDeck)
  const [terms, setTerms] = useState('')
  const [page, setPage] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [loadingDeck, setLoadingDeck] = useState(false)
  const [save, setSave] = useState<SaveState>({ status: 'idle' })
  const savedIds = useRef<{ deckId: string; ids: string[] } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw)
        setDeck({ ...emptyDeck, ...draft.deck })
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

  const openExisting = async (id: string) => {
    if (!id) return
    if (deck.cards.length && !confirm('The cards currently in the editor will be replaced. Continue?')) return
    setLoadingDeck(true)
    try {
      const full = await loadDeck(id)
      if (!full) throw new Error('Deck not found.')
      setDeck(full)
      savedIds.current = { deckId: full.id, ids: full.cards.map((c) => c.id) }
      setPage(0)
      setSave({ status: 'idle' })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not load the deck.')
    } finally {
      setLoadingDeck(false)
    }
  }

  const saveToSite = async () => {
    const id = deck.id.trim()
    if (!/^[a-z0-9-]+$/.test(id)) {
      alert('Deck ID must use lowercase English letters, numbers, and dashes.')
      return
    }
    const total = deck.cards.length
    setSave({ status: 'saving', done: 0, total })
    try {
      await saveDeckMeta({ id, title: deck.title, subject: deck.subject, description: deck.description, isFree: deck.isFree })
      for (let i = 0; i < total; i++) {
        await saveCard(id, deck.cards[i], i)
        setSave({ status: 'saving', done: i + 1, total })
      }
      const previous = savedIds.current?.deckId === id ? savedIds.current.ids : []
      const current = new Set(deck.cards.map((c) => c.id))
      await deleteCards(id, previous.filter((cid) => !current.has(cid)))
      savedIds.current = { deckId: id, ids: [...current] }
      await finishDeckSave()
      setSave({ status: 'done' })
      router.refresh()
    } catch (e) {
      setSave({ status: 'error', message: e instanceof Error ? e.message : 'Save failed.' })
    }
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
      savedIds.current = null
      setPage(0)
    } catch {
      alert('This file is not a valid deck file.')
    }
  }

  const clearAll = () => {
    if (!confirm('Clear all cards and deck details?')) return
    setDeck(emptyDeck)
    savedIds.current = null
    setPage(0)
  }

  const meta = (key: 'id' | 'title' | 'subject' | 'description') => ({
    value: deck[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDeck((d) => ({ ...d, [key]: e.target.value })),
  })

  const saving = save.status === 'saving'

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Edit an existing deck on the site
          <select
            className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            value=""
            disabled={loadingDeck || saving}
            onChange={(e) => openExisting(e.target.value)}
          >
            <option value="">{loadingDeck ? 'Loading…' : 'Choose a deck…'}</option>
            {existingDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.cardCount} cards{d.isFree ? '' : ' · paid'})
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">Or start a new deck with the steps below</p>
      </section>

      <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Deck title" {...meta('title')} placeholder="Guyton – Heart" />
        <Field label="Subject" {...meta('subject')} placeholder="Physiology" />
        <Field label="ID (used in the URL)" {...meta('id')} placeholder="guyton-heart" dir="ltr" />
        <Field label="Short description" {...meta('description')} placeholder="Chapters 9 to 12" />
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Access
          <select
            className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            value={deck.isFree ? 'free' : 'paid'}
            onChange={(e) => setDeck((d) => ({ ...d, isFree: e.target.value === 'free' }))}
          >
            <option value="free">Free</option>
            <option value="paid">Paid (needs a code)</option>
          </select>
        </label>
      </section>

      <SourcePanel terms={terms} onTermsChange={setTerms} onGenerate={addCards} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">3. Review the cards</h2>
            <p className="text-xs text-muted-foreground">
              {deck.cards.length} cards · {stats.blanks} blanks
              {stats.empty > 0 && <span className="text-destructive"> · {stats.empty} without blanks</span>}
              {' · '}Click any word to blank or unblank it
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={applyTermsToAll} disabled={!deck.cards.length}>
              <ListChecks aria-hidden /> Apply list to all cards
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload aria-hidden /> Open file
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
            <Button variant="outline" size="sm" onClick={exportDeck} disabled={!deck.cards.length}>
              <Download aria-hidden /> Download deck
            </Button>
            <Button size="sm" onClick={saveToSite} disabled={!deck.cards.length || saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden /> : <CloudUpload aria-hidden />} Save to site
            </Button>
            <Button variant="destructive" size="sm" onClick={clearAll} disabled={saving}>
              <Eraser aria-hidden /> Clear
            </Button>
          </div>
        </div>

        <p className="text-xs" role="status" aria-live="polite">
          {save.status === 'saving' && (
            <span className="text-muted-foreground">
              Saving card {save.done} of {save.total}…
            </span>
          )}
          {save.status === 'done' && <span className="text-primary">Deck saved to the site.</span>}
          {save.status === 'error' && <span className="text-destructive">Save failed: {save.message}</span>}
        </p>

        {deck.cards.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No cards yet. Paste text above and generate cards.
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
          <nav className="flex items-center justify-center gap-2" aria-label="Card pages">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {pageCount}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
              Next
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
