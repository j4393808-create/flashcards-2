'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { ArrowLeft, CheckCheck, KeyRound, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGeminiConfig } from '@/lib/gemini'
import { ApiKeyDialog } from '@/components/recite/api-key-dialog'
import { EditorToolbar } from '@/components/recite/editor-toolbar'
import { createReciteExtensions } from '@/components/recite/editor-extensions'
import { reciteFontVars } from '@/components/recite/fonts'

type Lesson = { id: string; title: string; subject: string }
type SaveState = 'idle' | 'saving' | 'saved'

const draftKey = (id: string) => `kwk:recite:draft:${id}`

export function ReciteWorkspace({ lesson, reference }: { lesson: Lesson; reference: string }) {
  const [keyOpen, setKeyOpen] = useState(false)
  const [save, setSave] = useState<SaveState>('idle')
  const [notice, setNotice] = useState('')
  const { config, ready } = useGeminiConfig()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createReciteExtensions(),
    editorProps: {
      attributes: {
        dir: 'auto',
        spellcheck: 'true',
        class: 'recite-prose min-h-[70dvh] px-6 py-8 outline-none sm:px-14 sm:py-12',
      },
    },
    onUpdate: ({ editor }) => {
      setSave('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        try {
          localStorage.setItem(draftKey(lesson.id), JSON.stringify(editor.getJSON()))
        } catch {}
        setSave('saved')
      }, 600)
    },
  })

  // Restore the saved draft once the editor exists.
  useEffect(() => {
    if (!editor) return
    try {
      const raw = localStorage.getItem(draftKey(lesson.id))
      if (raw) editor.commands.setContent(JSON.parse(raw), { emitUpdate: false })
    } catch {}
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [editor, lesson.id])

  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      words: editor?.getText().trim().split(/\s+/).filter(Boolean).length ?? 0,
    }),
  })

  const finish = () => {
    if (!config) return setKeyOpen(true)
    if (!s?.words) return setNotice('اكتب حاجة الأول قبل التصحيح.')
    // Grading is wired up in part 4; `reference` is already the lesson text it will compare against.
    setNotice(`التصحيح بـ ${config.model} هيتفعل في الجزء الرابع (النص المرجعي جاهز: ${reference.length} حرف).`)
  }

  return (
    <div className={cn('flex h-dvh flex-col bg-neutral-200/70', reciteFontVars)}>
      <header className="z-30 flex shrink-0 items-center gap-2 border-b bg-white px-3 py-2">
        <Link href="/recite" aria-label="رجوع" className="flex size-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-primary" dir="auto">{lesson.subject}</p>
          <h1 className="truncate text-sm font-bold sm:text-base" dir="auto">{lesson.title}</h1>
        </div>
        <span className="hidden items-center gap-1 text-xs text-neutral-500 sm:flex" aria-live="polite">
          {save === 'saving' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : save === 'saved' ? <CheckCheck className="size-3.5 text-success" aria-hidden /> : null}
          {save === 'saving' ? 'بيحفظ...' : save === 'saved' ? 'اتحفظ' : ''}
        </span>
        <button
          type="button"
          onClick={() => setKeyOpen(true)}
          aria-label="مفتاح Gemini"
          title="مفتاح Gemini"
          className={cn('flex size-9 items-center justify-center rounded-lg hover:bg-neutral-100', ready && config ? 'text-success' : 'text-neutral-500')}
        >
          <KeyRound className="size-5" aria-hidden />
        </button>
        <button type="button" onClick={finish} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Sparkles className="size-4" aria-hidden /> خلصت، صحّح
        </button>
      </header>

      <EditorToolbar editor={editor} />
      <p className="shrink-0 border-b bg-white px-4 py-1 text-end text-xs text-neutral-500">{s?.words ?? 0} كلمة</p>

      {notice && (
        <p role="status" onClick={() => setNotice('')} className="shrink-0 cursor-pointer bg-highlight px-4 py-2 text-center text-sm text-highlight-foreground">
          {notice}
        </p>
      )}

      <main className="flex-1 overflow-y-auto px-0 py-0 sm:px-4 sm:py-6" onClick={() => editor?.commands.focus()}>
        <div className="mx-auto min-h-full w-full max-w-[860px] bg-white text-neutral-900 shadow-sm sm:min-h-[1100px] sm:rounded-sm sm:shadow-md" onClick={(e) => e.stopPropagation()}>
          <EditorContent editor={editor} />
        </div>
      </main>

      <ApiKeyDialog open={keyOpen} onClose={() => setKeyOpen(false)} />
    </div>
  )
}
