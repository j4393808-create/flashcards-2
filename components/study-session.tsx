'use client'

import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Eye, Keyboard, MousePointerClick, RotateCcw, Shuffle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { sfx } from '@/lib/sound'
import { normalizeAnswer, parseBlocks, parseCloze, type Block, type Deck, type Inline, type ListItem } from '@/lib/cloze'

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
  const [baseQueue, setBaseQueue] = useState<string[] | null>(null)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[]
      setKnown(new Set(saved))
    } catch {}
  }, [storageKey])

  const cardsById = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck.cards])
  const card = cardsById.get(queue[position])
  const segments = useMemo(() => (card ? parseCloze(card.cloze) : []), [card])
  const blocks = useMemo(() => parseBlocks(segments), [segments])
  const blankCount = segments.filter((s) => s.type === 'blank').length
  const allRevealed = revealed.size >= blankCount

  const resetCard = () => {
    setRevealed(new Set())
    setAnswers({})
  }

  const nextHidden = Array.from({ length: blankCount }, (_, i) => i).find((i) => !revealed.has(i))

  const revealOne = (index: number) => {
    if (revealed.has(index)) return
    sfx.reveal(index)
    setRevealed((r) => new Set(r).add(index))
  }

  const renderInline = (node: Inline, key: string) => {
    if (!card) return null
    if (node.type === 'text') return <span key={key}>{node.value}</span>
    const isOpen = revealed.has(node.index)
    if (mode === 'type') {
      return (
        <TypedBlank
          key={`${card.id}-${key}`}
          answer={node.value}
          value={answers[node.index] ?? ''}
          checked={isOpen}
          onChange={(v) => setAnswers((a) => ({ ...a, [node.index]: v }))}
          onCheck={(correct) => {
            if (correct) sfx.correct()
            else sfx.wrong()
            setRevealed((r) => new Set(r).add(node.index))
          }}
        />
      )
    }
    return (
      <button
        key={key}
        type="button"
        data-no-click-sound
        onClick={() => revealOne(node.index)}
        aria-label={isOpen ? node.value : `فراغ رقم ${node.index + 1}، اضغط للكشف`}
        className={cn(
          'mx-0.5 inline-block rounded-md px-1.5 align-baseline leading-normal transition-colors',
          isOpen
            ? 'word-pop bg-highlight font-semibold text-highlight-foreground'
            : 'border-b-2 border-dashed border-primary bg-accent text-transparent hover:bg-accent/70',
          !isOpen && node.index === nextHidden && 'blank-next',
        )}
        style={isOpen ? undefined : { minWidth: `${Math.min(Math.max(node.value.length, 4), 24)}ch` }}
      >
        {isOpen ? node.value : '\u00A0'}
      </button>
    )
  }

  const revealNext = () => {
    if (nextHidden !== undefined) revealOne(nextHidden)
  }

  const revealAll = () => {
    if (allRevealed) return
    sfx.revealAll()
    setRevealed(new Set(Array.from({ length: blankCount }, (_, i) => i)))
  }

  const startSession = (ids: string[], shuffled = false) => {
    sfx.flip()
    setQueue(shuffled ? shuffle(ids) : ids)
    setPosition(0)
    resetCard()
    setBaseQueue(null)
  }

  const toggleShuffle = () => {
    if (baseQueue) return startSession(baseQueue)
    const original = queue
    startSession(queue, true)
    setBaseQueue(original)
  }

  const goTo = (delta: number) => {
    const target = Math.min(Math.max(position + delta, 0), queue.length)
    if (target === position) return
    sfx.flip()
    setPosition(target)
    resetCard()
  }

  const rate = (gotIt: boolean) => {
    if (!card) return
    const next = new Set(known)
    if (gotIt) next.add(card.id)
    else next.delete(card.id)
    setKnown(next)
    localStorage.setItem(storageKey, JSON.stringify([...next]))
    if (gotIt) sfx.correct()
    else sfx.wrong()
    if (position + 1 >= queue.length) setTimeout(() => sfx.fanfare(), 250)
    else setTimeout(() => sfx.flip(), 120)
    setPosition((p) => p + 1)
    resetCard()
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    resetCard()
  }

  const handleKey = useEffectEvent((e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const key = e.key.toLowerCase()
    const isRtl = document.documentElement.dir === 'rtl'
    const forward = isRtl ? 'arrowleft' : 'arrowright'
    const backward = isRtl ? 'arrowright' : 'arrowleft'

    if (key === forward || key === 'n') return e.preventDefault(), goTo(1)
    if (key === backward || key === 'p') return e.preventDefault(), goTo(-1)
    if (allRevealed && (key === 'arrowup' || key === 'enter')) return e.preventDefault(), rate(true)
    if (allRevealed && (key === 'arrowdown' || key === 'backspace')) return e.preventDefault(), rate(false)
    if (e.code === 'Space' || key === 'arrowdown') {
      e.preventDefault()
      if (mode === 'type') return revealAll()
      return allRevealed ? undefined : revealNext()
    }
    if (key === 'arrowup') return e.preventDefault()
    if (key === 'a') return revealAll()
    if (key === 'r') return resetCard()
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handleKey(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const remaining = deck.cards.filter((c) => !known.has(c.id)).map((c) => c.id)
  const progress = Math.round((known.size / deck.cards.length) * 100)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div className="flex w-full items-center gap-1 rounded-lg border bg-card p-1 sm:w-auto" role="group" aria-label="طريقة التسميع">
          <ModeButton active={mode === 'tap'} onClick={() => switchMode('tap')}>
            <MousePointerClick className="size-4" aria-hidden /> اضغط واكشف
          </ModeButton>
          <ModeButton active={mode === 'type'} onClick={() => switchMode('type')}>
            <Keyboard className="size-4" aria-hidden /> اكتب الإجابة
          </ModeButton>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant={baseQueue ? 'default' : 'outline'}
            size="sm"
            aria-pressed={!!baseQueue}
            onClick={toggleShuffle}
          >
            {baseQueue ? <RotateCcw aria-hidden /> : <Shuffle aria-hidden />}
            {baseQueue ? 'رجّع الترتيب' : 'لخبط الترتيب'}
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
        <article key={`${card.id}-${position}`} className="card-flip rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur sm:p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goTo(-1)}
                disabled={position === 0}
                aria-label="الكارت اللي فات"
                className="flex size-7 items-center justify-center rounded-full border transition-colors hover:bg-accent disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
              <span className="px-1">
                كارت {position + 1} من {queue.length}
              </span>
              <button
                type="button"
                onClick={() => goTo(1)}
                aria-label="الكارت اللي بعده"
                className="flex size-7 items-center justify-center rounded-full border transition-colors hover:bg-accent"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
            </div>
            {known.has(card.id) && (
              <span className="flex items-center gap-1 text-success">
                <Check className="size-3.5" aria-hidden /> محفوظ
              </span>
            )}
          </div>

          <div className="space-y-5">
            {blocks.map((block, bi) => (
              <CardBlock key={bi} block={block} renderInline={renderInline} />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            {allRevealed ? (
              <div className="flex w-full gap-3">
                <Button size="lg" variant="outline" className="flex-1" onClick={() => rate(false)}>
                  <X aria-hidden /> لسه <kbd className="ms-1 rounded border px-1 text-[10px] opacity-60">↓</kbd>
                </Button>
                <Button size="lg" className="flex-1 bg-success text-primary-foreground hover:bg-success/90" onClick={() => rate(true)}>
                  <Check aria-hidden /> حفظتها <kbd className="ms-1 rounded border border-current/40 px-1 text-[10px] opacity-70">↑</kbd>
                </Button>
              </div>
            ) : (
              <>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {mode === 'tap'
                    ? 'Space تكشف الكلمة اللي بعدها · A تكشف الكل · ↑ حفظتها · ↓ لسه · ← → للتقليب'
                    : 'اكتب واضغط Enter للتصحيح · Space لكشف الكل'}
                </span>
                <Button size="lg" className="w-full sm:w-auto" onClick={revealAll}>
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

type RenderInline = (node: Inline, key: string) => React.ReactNode

const inlineNodes = (nodes: Inline[], render: RenderInline) => nodes.map((n, i) => render(n, `n${i}`))

/** Draws one layout block of a card: a paragraph, a table, or a classification tree. */
function CardBlock({ block, renderInline }: { block: Block; renderInline: RenderInline }) {
  if (block.kind === 'paragraph') {
    return (
      <p dir="auto" className="text-base leading-[2.3] sm:text-lg sm:leading-[2.4] md:text-xl">
        {inlineNodes(block.nodes, renderInline)}
      </p>
    )
  }

  if (block.kind === 'table') {
    const columns = Math.max(block.header?.length ?? 0, ...block.rows.map((r) => r.length))
    const pad = (row: Inline[][]) => Array.from({ length: columns }, (_, i) => row[i] ?? [])
    const labelColumn = !!block.header && block.header[0]?.length === 0
    const cell = 'border-b border-s px-3 py-2.5 align-top text-start first:border-s-0'
    return (
      <div className="overflow-x-auto rounded-xl border">
        <table dir="auto" className="w-full border-collapse text-sm leading-[2.2] sm:text-base">
          {block.header && (
            <thead className="bg-primary/10">
              <tr>
                {pad(block.header).map((c, i) => (
                  <th key={i} dir="auto" scope="col" className={cn(cell, 'font-bold')}>
                    {inlineNodes(c, renderInline)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="last:*:border-b-0">
                {pad(row).map((c, ci) =>
                  ci === 0 && labelColumn ? (
                    <th key={ci} dir="auto" scope="row" className={cn(cell, 'w-px whitespace-nowrap bg-primary/5 font-bold')}>
                      {inlineNodes(c, renderInline)}
                    </th>
                  ) : (
                    <td key={ci} dir="auto" className={cell}>
                      {inlineNodes(c, renderInline)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return <ListTree items={block.items} renderInline={renderInline} />
}

type TreeNode = { item: ListItem; children: TreeNode[] }

function buildTree(items: ListItem[]) {
  const roots: TreeNode[] = []
  const stack: TreeNode[] = []
  for (const item of items) {
    const node: TreeNode = { item, children: [] }
    const level = Math.min(item.level, stack.length)
    stack.length = level
    if (level === 0) roots.push(node)
    else stack[level - 1].children.push(node)
    stack.push(node)
  }
  return roots
}

function TreeList({ nodes, depth, renderInline }: { nodes: TreeNode[]; depth: number; renderInline: RenderInline }) {
  return (
    <ul
      dir="auto"
      className={cn(depth > 0 && 'ms-2 border-s-2 border-primary/30 ps-4', depth === 0 ? 'space-y-1' : 'mt-1 space-y-1')}
    >
      {nodes.map((n, i) => (
        <li
          key={i}
          className={cn(
            'relative',
            depth === 0
              ? 'ps-5 before:absolute before:start-0 before:top-[1.05em] before:size-2 before:rounded-full before:bg-primary'
              : 'before:absolute before:-start-4 before:top-[1.2em] before:h-0.5 before:w-3 before:bg-primary/30',
          )}
        >
          <span className={cn('leading-[2.2]', depth === 0 && 'font-semibold')}>{inlineNodes(n.item.nodes, renderInline)}</span>
          {n.children.length > 0 && <TreeList nodes={n.children} depth={depth + 1} renderInline={renderInline} />}
        </li>
      ))}
    </ul>
  )
}

function ListTree({ items, renderInline }: { items: ListItem[]; renderInline: RenderInline }) {
  return (
    <div className="text-base sm:text-lg">
      <TreeList nodes={buildTree(items)} depth={0} renderInline={renderInline} />
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
        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors sm:flex-none sm:px-3 sm:text-sm',
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
  onCheck: (correct: boolean) => void
}) {
  const check = () => onCheck(normalizeAnswer(value) === normalizeAnswer(answer))
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
        if (e.key === 'Enter') check()
      }}
      onBlur={() => value.trim() && check()}
      aria-label="اكتب الكلمة الناقصة"
      className="mx-0.5 inline-block rounded-md border-b-2 border-primary bg-accent px-1.5 text-base leading-normal outline-none focus:ring-2 focus:ring-ring"
      style={{ width }}
    />
  )
}
