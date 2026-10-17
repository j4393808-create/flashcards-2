'use client'

import { memo, useMemo } from 'react'
import { Merge, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fromCloze, toCloze, type Card } from '@/lib/cloze'

type Props = {
  card: Card
  number: number
  onChange: (id: string, cloze: string) => void
  onDelete: (id: string) => void
  onMergeNext?: (id: string) => void
}

export const CardEditor = memo(function CardEditor({ card, number, onChange, onDelete, onMergeNext }: Props) {
  const { text, tokens, selected } = useMemo(() => fromCloze(card.cloze), [card.cloze])
  const blanks = useMemo(() => (card.cloze.match(/\{\{/g) ?? []).length, [card.cloze])

  const toggle = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    onChange(card.id, toCloze(text, tokens, next))
  }

  return (
    <li className={cn('rounded-xl border bg-card p-4', blanks === 0 && 'border-destructive/50')}>
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          #{number} · <span className={cn(blanks === 0 && 'font-semibold text-destructive')}>{blanks} فراغ</span>
        </span>
        <div className="flex items-center gap-1">
          {onMergeNext && (
            <Button variant="ghost" size="xs" onClick={() => onMergeNext(card.id)}>
              <Merge aria-hidden /> ادمج مع اللي بعده
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" aria-label="امسح الكارت" onClick={() => onDelete(card.id)}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
      <p dir="auto" className="whitespace-pre-wrap leading-loose">
        {tokens.map((t, i) => {
          if (t.space) {
            const joined = selected.has(i - 1) && selected.has(i + 1)
            return (
              <span key={i} className={cn(joined && 'bg-highlight')}>
                {t.text}
              </span>
            )
          }
          const on = selected.has(i)
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(i)}
              className={cn(
                'rounded-sm transition-colors',
                on ? 'bg-highlight font-semibold text-highlight-foreground' : 'hover:bg-accent',
              )}
            >
              {t.text}
            </button>
          )
        })}
      </p>
    </li>
  )
})
