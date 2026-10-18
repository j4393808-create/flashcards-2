export type Card = { id: string; cloze: string }

export type Deck = {
  id: string
  title: string
  subject: string
  description: string
  isFree: boolean
  cards: Card[]
}

export type Segment =
  | { type: 'text'; value: string }
  | { type: 'blank'; value: string; index: number }

export type Token = { text: string; start: number; end: number; space: boolean }

const BLANK_RE = /\{\{([\s\S]+?)\}\}/g
const TOKEN_RE =
  /\s+|[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}'’.\-]*[\p{L}\p{N}\p{M}])?|[^\s\p{L}\p{N}]/gu

export function parseCloze(cloze: string): Segment[] {
  const segments: Segment[] = []
  let last = 0
  let index = 0
  for (const match of cloze.matchAll(BLANK_RE)) {
    const at = match.index ?? 0
    if (at > last) segments.push({ type: 'text', value: cloze.slice(last, at) })
    segments.push({ type: 'blank', value: match[1], index: index++ })
    last = at + match[0].length
  }
  if (last < cloze.length) segments.push({ type: 'text', value: cloze.slice(last) })
  return segments
}

export function plainText(cloze: string) {
  return cloze.replace(BLANK_RE, '$1')
}

export function countBlanks(cloze: string) {
  return [...cloze.matchAll(BLANK_RE)].length
}

export function tokenize(text: string): Token[] {
  return [...text.matchAll(TOKEN_RE)].map((m) => {
    const start = m.index ?? 0
    return { text: m[0], start, end: start + m[0].length, space: /^\s+$/.test(m[0]) }
  })
}

export function fromCloze(cloze: string) {
  const ranges: [number, number][] = []
  let text = ''
  for (const seg of parseCloze(cloze)) {
    if (seg.type === 'blank') ranges.push([text.length, text.length + seg.value.length])
    text += seg.value
  }
  const tokens = tokenize(text)
  const selected = new Set<number>()
  tokens.forEach((t, i) => {
    if (!t.space && ranges.some(([s, e]) => t.start >= s && t.end <= e)) selected.add(i)
  })
  return { text, tokens, selected }
}

/** Adjacent selected tokens (separated only by whitespace) merge into one blank. */
export function toCloze(text: string, tokens: Token[], selected: Set<number>) {
  let out = ''
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    if (token.space || !selected.has(i)) {
      out += token.text
      i++
      continue
    }
    let last = i
    while (true) {
      const next = tokens[last + 1]
      if (!next) break
      if (!next.space && selected.has(last + 1)) {
        last++
      } else if (next.space && !next.text.includes('\n') && selected.has(last + 2) && !tokens[last + 2]?.space) {
        last += 2
      } else break
    }
    out += `{{${text.slice(token.start, tokens[last].end)}}}`
    i = last + 1
  }
  return out
}

const UNITS = new Set(
  [
    '%', 's', 'sec', 'second', 'seconds', 'ms', 'min', 'minute', 'minutes', 'h', 'hr', 'hrs',
    'hour', 'hours', 'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years',
    'ml', 'l', 'dl', 'mg', 'g', 'kg', 'mcg', 'µg', 'ng', 'mmhg', 'cmh2o', 'mm', 'cm', 'm',
    'meq', 'mmol', 'mol', 'mosm', 'bpm', 'beats', 'iu', 'u', '°c', '°', 'percent', 'times',
  ].map((u) => u.toLowerCase()),
)

const isUnit = (t?: Token) => !!t && !t.space && UNITS.has(t.text.toLowerCase())

export type AutoOptions = { numbers: boolean; abbreviations: boolean; terms: string[] }

export function autoSelect(text: string, tokens: Token[], opts: AutoOptions, base?: Set<number>) {
  const selected = new Set(base)

  if (opts.numbers) {
    tokens.forEach((t, i) => {
      if (t.space || !/\p{N}/u.test(t.text)) return
      selected.add(i)
      let k = tokens[i + 1]?.space && tokens[i + 1].text.length === 1 ? i + 2 : i + 1
      if (tokens[i + 1]?.text === '%') k = i + 1
      if (isUnit(tokens[k])) {
        selected.add(k)
        while (tokens[k + 1]?.text === '/' && isUnit(tokens[k + 2])) {
          selected.add(k + 1)
          selected.add(k + 2)
          k += 2
        }
      }
    })
    tokens.forEach((t, i) => {
      if (/^[-–—]$/.test(t.text) && selected.has(i - 1) && selected.has(i + 1)) selected.add(i)
    })
  }

  if (opts.abbreviations) {
    tokens.forEach((t, i) => {
      if (/^[A-Z]{2,}\d*$/.test(t.text)) selected.add(i)
    })
  }

  const lower = text.toLowerCase()
  const isWordChar = (c?: string) => !!c && /[\p{L}\p{N}]/u.test(c)
  for (const term of opts.terms) {
    const needle = term.toLowerCase()
    if (needle.length < 2) continue
    let from = 0
    while (true) {
      const at = lower.indexOf(needle, from)
      if (at === -1) break
      const end = at + needle.length
      if (!isWordChar(lower[at - 1]) && !isWordChar(lower[end])) {
        tokens.forEach((t, i) => {
          if (!t.space && t.start < end && t.end > at) selected.add(i)
        })
      }
      from = at + 1
    }
  }

  return selected
}

export function autoCloze(text: string, opts: AutoOptions) {
  const tokens = tokenize(text)
  return toCloze(text, tokens, autoSelect(text, tokens, opts))
}

export function applyTerms(cloze: string, terms: string[]) {
  const { text, tokens, selected } = fromCloze(cloze)
  const next = autoSelect(text, tokens, { numbers: false, abbreviations: false, terms }, selected)
  return toCloze(text, tokens, next)
}

const ABBREVIATIONS = ['e.g', 'i.e', 'dr', 'vs', 'etc', 'fig', 'approx', 'no', 'mr', 'st']

export function prepareText(raw: string, joinLines: boolean) {
  let text = raw.replace(/\r\n?/g, '\n')
  if (joinLines) {
    // Tables and lists keep their line breaks; only broken PDF lines get joined.
    const hyphens = text
    text = hyphens.replace(/(\p{L})-\n(\p{Ll})/gu, (m, a, b, offset: number) =>
      isStructuredLine(lineAt(hyphens, offset)) || isStructuredLine(lineAt(hyphens, offset + 3)) ? m : `${a}${b}`,
    )
    const lines = text
    text = lines.replace(/([^\n])\n(?!\s*\n)/g, (m, a, offset: number) =>
      isStructuredLine(lineAt(lines, offset)) || isStructuredLine(lineAt(lines, offset + 2)) ? m : `${a} `,
    )
  }
  return text
}

function lineAt(text: string, offset: number) {
  const start = text.lastIndexOf('\n', offset) + 1
  const end = text.indexOf('\n', offset)
  return text.slice(start, end === -1 ? undefined : end)
}

export function splitIntoCards(text: string, sentencesPerCard: number) {
  const chunks: string[] = []
  for (const paragraph of text.split(/\n\s*\n/)) {
    const p = paragraph.trim()
    if (!p) continue
    if (p.split('\n').some(isStructuredLine)) {
      chunks.push(p)
      continue
    }
    const ends: number[] = []
    for (const m of p.matchAll(/[.!?؟](?=\s|$)/g)) {
      const at = m.index ?? 0
      const before = p.slice(0, at).split(/\s/).pop()?.toLowerCase() ?? ''
      if (ABBREVIATIONS.includes(before)) continue
      ends.push(at + 1)
    }
    if (ends[ends.length - 1] !== p.length) ends.push(p.length)
    let start = 0
    for (let i = 0; i < ends.length; i += sentencesPerCard) {
      const end = ends[Math.min(i + sentencesPerCard, ends.length) - 1]
      const chunk = p.slice(start, end).trim()
      if (chunk) chunks.push(chunk)
      start = end
    }
  }
  return chunks
}

export function parseTerms(raw: string) {
  return [
    ...new Set(
      raw
        .split(/\n|،|;/)
        .map((t) => t.replace(/^[\s\-*•\d.)]+/, '').trim())
        .filter((t) => t.length >= 2),
    ),
  ]
}

export function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}%/.]+/gu, ' ')
    .trim()
}

export function buildPrompt(text: string) {
  return `You are helping me build fill-in-the-blank (cloze) flashcards from a medical textbook.

Task: list the important words or phrases from the text below that a student should memorize.

Rules:
- Copy every word or phrase exactly as it appears in the text, character for character, in the same language.
- One word or phrase per line, with no numbering and no explanation.
- Pick: disease names, organs and anatomical structures, hormones, enzymes and receptors, drugs and doses, normal values, causes and effects, scientific terms, and classifications.
- Keep each phrase short (1 to 4 words) and meaningful on its own.
- Do not include: prepositions, conjunctions, generic verbs like "is" or "causes", or full sentences.
- Skip numbers and their units; they are blanked automatically.
- Aim for roughly one phrase per 8 to 12 words.

Text:
"""
${text.trim()}
"""`
}

/* ---------- Structured layout: tables and nested lists inside a card ---------- */

export type Inline = { type: 'text'; value: string } | { type: 'blank'; value: string; index: number }

export type ListItem = { level: number; nodes: Inline[] }

export type Block =
  | { kind: 'paragraph'; nodes: Inline[] }
  | { kind: 'table'; header: Inline[][] | null; rows: Inline[][][] }
  | { kind: 'list'; items: ListItem[] }

const LIST_RE = /^([ \t]*)(•|◦|▪|o|\*|-{1,3})[ \t]+/
const SEPARATOR_RE = /^\s*:?-{2,}:?\s*$/

/** A line that belongs to a table (starts with |) or a list (starts with a marker). */
export function isStructuredLine(line: string) {
  return /^\s*\|/.test(line) || LIST_RE.test(line)
}

function markerLevel(marker: string, indent: string) {
  const depth = Math.floor(indent.replace(/\t/g, '  ').length / 2)
  if (marker === 'o' || marker === '◦' || marker === '--') return Math.max(1, depth)
  if (marker === '▪' || marker === '---') return Math.max(2, depth)
  return depth
}

function splitCells(line: Inline[]) {
  const cells: Inline[][] = [[]]
  for (const node of line) {
    if (node.type === 'blank') {
      cells[cells.length - 1].push(node)
      continue
    }
    node.value.split('|').forEach((part, i) => {
      if (i > 0) cells.push([])
      if (part) cells[cells.length - 1].push({ type: 'text', value: part })
    })
  }
  if (!cells[0].length) cells.shift()
  if (cells.length && !cells[cells.length - 1].length) cells.pop()
  return cells.map((cell) => {
    const first = cell[0]
    const last = cell[cell.length - 1]
    if (first?.type === 'text') cell[0] = { type: 'text', value: first.value.replace(/^\s+/, '') }
    if (last?.type === 'text') cell[cell.length - 1] = { type: 'text', value: last.value.replace(/\s+$/, '') }
    return cell.filter((n) => n.type === 'blank' || n.value)
  })
}

const isSeparatorRow = (cells: Inline[][]) =>
  cells.length > 0 && cells.every((c) => c.length === 1 && c[0].type === 'text' && SEPARATOR_RE.test(c[0].value))

/** Turns parsed cloze segments into layout blocks. Blank numbering is untouched. */
export function parseBlocks(segments: Segment[]): Block[] {
  const lines: Inline[][] = [[]]
  for (const seg of segments) {
    if (seg.type === 'blank') {
      lines[lines.length - 1].push(seg)
      continue
    }
    seg.value.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ type: 'text', value: part })
    })
  }

  const blocks: Block[] = []
  for (const line of lines) {
    const first = line[0]
    const firstText = first?.type === 'text' ? first.value : ''
    const isEmpty = line.every((n) => n.type === 'text' && !n.value.trim())

    if (/^\s*\|/.test(firstText)) {
      const cells = splitCells(line)
      let table = blocks[blocks.length - 1]
      if (table?.kind !== 'table') {
        table = { kind: 'table', header: null, rows: [] }
        blocks.push(table)
      }
      if (isSeparatorRow(cells)) {
        if (table.rows.length === 1 && !table.header) table.header = table.rows.shift() ?? null
      } else {
        table.rows.push(cells)
      }
      continue
    }

    const match = LIST_RE.exec(firstText)
    if (match) {
      const nodes = [...line]
      nodes[0] = { type: 'text', value: firstText.slice(match[0].length) }
      let list = blocks[blocks.length - 1]
      if (list?.kind !== 'list') {
        list = { kind: 'list', items: [] }
        blocks.push(list)
      }
      list.items.push({ level: markerLevel(match[2], match[1]), nodes: nodes.filter((n) => n.type === 'blank' || n.value) })
      continue
    }

    if (isEmpty) continue
    const last = blocks[blocks.length - 1]
    if (last?.kind === 'paragraph') last.nodes.push({ type: 'text', value: ' ' }, ...line)
    else blocks.push({ kind: 'paragraph', nodes: line })
  }
  return blocks
}
