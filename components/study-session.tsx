'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Eye, Keyboard, MousePointerClick, RotateCcw, Shuffle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { normalizeAnswer, parseCloze, type Deck } from '@/lib/cloze'

type Mode = 'tap' | 'type'

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function StudySession({ deck }: { deck: Deck }) {
  const storageKey = `sammaa-progress-${deck.id}`
  const [known, setKnown] = useState<Set<string>>(new Set())
  const [queue, setQueue] = useState(() => deck.cards.map((c) => c.id))
  const [position, setPosition] = useState(0)
  const [mode, setMode] = useState<Mode>('tap')
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [answers, setAnswers] = useState<Record<number, string>>({})

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[]
      setKnown(new Set(saved))
    } catch {}
  }, [storageKey])

  const cardsById = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck.cards])
  const card = cardsById.get(queue[position])
  const segments = useMemo(() => (card ? parseCloze(card.cloze) : []), [card])
  const blankCount = segments.filter((s) => s.type === 'blank').length
  const allRevealed = revealed.size >= blankCount

  const resetCard = () => {
    setRevealed(new Set())
    setAnswers({})
  }

  const revealAll = useCallback(() => {
    setRevealed(new Set(Array.from({ length: blankCount }, (_, i) => i)))
  }, [blankCount])

  const startSession = (ids: string[], shuffled = false) => {
    setQueue(shuffled ? shuffle(ids) : ids)
    setPosition(0)
    resetCard()
  }

  const rate = (gotIt: boolean) => {
    if (!card) return
    const next = new Set(known)
    if (gotIt) next.add(card.id)
    else next.delete(card.id)
    setKnown(next)
    localStorage.setItem(storageKey, JSON.stringify([...next]))
    setPosition((p) => p + 1)
    resetCard()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === 'Space' && card) {
        e.preventDefault()
        revealAll()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, revealAll])

  const remaining = deck.cards.filter((c) => !known.has(c.id)).map((c) => c.id)
  const progress = Math.round((known.size / deck.cards.length) * 100)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1" role="group" aria-label="طريقة التسميع">
          <ModeButton active={mode === 'tap'} onClick={() => { setMode('tap'); resetCard() }}>
            <MousePointerClick className="size-4" aria-hidden /> اضغط واكشف
          </ModeButton>
          <ModeButton active={mode === 'type'} onClick={() => { setMode('type'); resetCard() }}>
            <Keyboard className="size-4" aria-hidden /> اكتب الإجابة
          </ModeButton>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => startSession(queue, true)}>
            <Shuffle aria-hidden /> لخبط الترتيب
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={remaining.length === 0}
            onClick={() => startSession(remaining)}
          >
            راجع اللي لسه ({remaining.length})
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="نسبة الحفظ"
        >
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span>
          حفظت {known.size} من {deck.cards.length}
        </span>
      </div>

      {card ? (
        <article className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              كارت {position + 1} من {queue.length}
            </span>
            {known.has(card.id) && (
              <span className="flex items-center gap-1 text-success">
                <Check className="size-3.5" aria-hidden /> محفوظ
              </span>
            )}
          </div>

          <p dir="auto" className="text-lg leading-[2.4] md:text-xl">
            {segments.map((seg, i) => {
              if (seg.type === 'text') return <span key={i}>{seg.value}</span>
              const isOpen = revealed.has(seg.index)
              if (mode === 'type') {
                return (
                  <TypedBlank
                    key={`${card.id}-${i}`}
                    answer={seg.value}
                    value={answers[seg.index] ?? ''}
                    checked={isOpen}
                    onChange={(v) => setAnswers((a) => ({ ...a, [seg.index]: v }))}
                    onCheck={() => setRevealed((r) => new Set(r).add(seg.index))}
                  />
                )
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRevealed((r) => new Set(r).add(seg.index))}
                  aria-label={isOpen ? seg.value : `فراغ رقم ${seg.index + 1}، اضغط للكشف`}
                  className={cn(
                    'mx-0.5 inline-block rounded-md px-1.5 align-baseline leading-normal transition-colors',
                    isOpen
                      ? 'bg-highlight font-semibold text-highlight-foreground'
                      : 'border-b-2 border-dashed border-primary bg-accent text-transparent hover:bg-accent/70',
                  )}
                  style={isOpen ? undefined : { minWidth: `${Math.min(Math.max(seg.value.length, 4), 24)}ch` }}
                >
                  {isOpen ? seg.value : '\u00A0'}
                </button>
              )
            })}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            {allRevealed ? (
              <div className="flex w-full gap-3">
                <Button size="lg" variant="outline" className="flex-1" onClick={() => rate(false)}>
                  <X aria-hidden /> لسه
                </Button>
                <Button size="lg" className="flex-1 bg-success text-primary-foreground hover:bg-success/90" onClick={() => rate(true)}>
                  <Check aria-hidden /> حفظتها
                </Button>
              </div>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">
                  {mode === 'tap' ? 'اضغط على أي فراغ، أو مسافة لكشف الكل' : 'اكتب واضغط Enter للتصحيح'}
                </span>
                <Button size="lg" onClick={revealAll}>
                  <Eye aria-hidden /> اكشف الكل
                </Button>
              </>
            )}
          </div>
        </article>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-10 text-center">
          <h2 className="text-xl font-bold">خلصت الجولة</h2>
          <p className="text-muted-foreground">
            حفظت {known.size} كارت من {deck.cards.length}.{' '}
            {remaining.length > 0 ? `فاضل ${remaining.length} محتاجين مراجعة.` : 'الكتاب كله محفوظ.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {remaining.length > 0 && <Button onClick={() => startSession(remaining)}>راجع اللي لسه</Button>}
            <Button variant="outline" onClick={() => startSession(deck.cards.map((c) => c.id))}>
              <RotateCcw aria-hidden /> من الأول
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ModeButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function TypedBlank({
  answer,
  value,
  checked,
  onChange,
  onCheck,
}: {
  answer: string
  value: string
  checked: boolean
  onChange: (v: string) => void
  onCheck: () => void
}) {
  const correct = checked && normalizeAnswer(value) === normalizeAnswer(answer)
  const width = `${Math.min(Math.max(answer.length, 4), 24) + 2}ch`

  if (checked) {
    return (
      <span className="mx-0.5 inline-flex flex-wrap items-baseline gap-1 leading-normal">
        {correct ? (
          <span className="rounded-md bg-success/15 px-1.5 font-semibold text-success">{answer}</span>
        ) : (
          <>
            {value && <span className="rounded-md bg-destructive/10 px-1.5 text-destructive line-through">{value}</span>}
            <span className="rounded-md bg-highlight px-1.5 font-semibold text-highlight-foreground">{answer}</span>
          </>
        )}
      </span>
    )
  }

  return (
    <input
      dir="auto"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter') onCheck()
      }}
      onBlur={() => value.trim() && onCheck()}
      aria-label="اكتب الكلمة الناقصة"
      className="mx-0.5 inline-block rounded-md border-b-2 border-primary bg-accent px-1.5 text-base leading-normal outline-none focus:ring-2 focus:ring-ring"
      style={{ width }}
    />
  )
}
