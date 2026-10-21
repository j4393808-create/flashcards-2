'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight, Check, ChevronLeft, PartyPopper, Sparkles, X } from 'lucide-react'
import { completeOnboarding } from '@/app/actions'

type TourStep = {
  title: string
  body: string
  selector?: string
  action?: string
  route: 'home' | 'deck' | 'admin' | 'any'
  actionHint?: string
}

const baseSteps: TourStep[] = [
  {
    title: 'أهلًا بيك في كارت وكتاب',
    body: 'جولة قصيرة هتعرّفك على طريقة تنظيم المحتوى، أدوات المذاكرة، وتتبع تقدمك. هتتقدم خطوة بخطوة، وتقدر تتخطاها في أي وقت.',
    route: 'any',
  },
  {
    title: 'افتح المحتوى المدفوع',
    body: 'لو معاك كود وصول، اكتبه هنا لفتح الدِكات المدفوعة على حسابك. لو مفيش دِكات مدفوعة حاليًا، تقدر تكمل عادي.',
    selector: '[data-tour="access-code"]',
    route: 'home',
  },
  {
    title: 'افتح مجموعة دراسية',
    body: 'المجموعات بترتب الدِكات حسب المادة أو الموضوع. افتح مجموعة عشان نشوف الدِكات اللي جواها.',
    selector: '[data-tour="group-card"]',
    action: 'open-group',
    actionHint: 'اضغط على أي مجموعة للمتابعة',
    route: 'home',
  },
  {
    title: 'اختار دِك',
    body: 'كل دِك عبارة عن كروت مراجعة مستقلة. افتح واحدًا للانتقال إلى مساحة المذاكرة.',
    selector: '[data-tour="deck-card"]',
    action: 'open-deck',
    actionHint: 'اضغط على أي دِك للمتابعة',
    route: 'home',
  },
  {
    title: 'اكشف الإجابة بنفسك',
    body: 'اضغط على الكلمة المخفية لتظهر. جرّب كشف كلمة واحدة عشان تحافظ على الاستدعاء النشط.',
    selector: '[data-tour="study-reveal"]',
    action: 'reveal-word',
    actionHint: 'اضغط على كلمة مخفية',
    route: 'deck',
  },
  {
    title: 'أو اكتب الإجابة',
    body: 'وضع الكتابة بيخليك تختبر ذاكرتك قبل ما تشوف الإجابة. بدّل للوضع ده وقت ما تحب.',
    selector: '[data-tour="study-type-mode"]',
    action: 'select-type-mode',
    actionHint: 'اختار وضع «اكتب الإجابة»',
    route: 'deck',
  },
  {
    title: 'راجع التقدم وغيّر الترتيب',
    body: 'الشريط بيتابع الكروت اللي حفظتها، وتقدر تلخبط ترتيبها عشان تختبر نفسك بشكل مختلف.',
    selector: '[data-tour="study-shuffle"]',
    action: 'shuffle-cards',
    actionHint: 'اضغط «لخبط الترتيب»',
    route: 'deck',
  },
  {
    title: 'إعداداتك واختصاراتك',
    body: 'من الإعدادات تقدر تتحكم في الصوت ومستواه، وتراجع اختصارات لوحة المفاتيح.',
    selector: '[data-tour="settings-trigger"]',
    action: 'open-settings',
    actionHint: 'افتح الإعدادات من أعلى الصفحة',
    route: 'any',
  },
  {
    title: 'اختصارات توفر وقتك',
    body: 'استخدم Space لكشف الإجابة التالية، والأسهم للتنقل بين الكروت، وEnter لتسجيل الإجابة بعد كشفها.',
    selector: '[data-tour="settings-shortcuts"]',
    route: 'any',
  },
]

const adminSteps: TourStep[] = [
  {
    title: 'مساحة إدارة المحتوى',
    body: 'لو عندك صلاحية إدارة، تقدر تنشئ المجموعات والدِكات وتحدّث الكروت من لوحة الأدمن.',
    selector: '[data-tour="admin-link"]',
    action: 'open-admin',
    actionHint: 'افتح لوحة الأدمن للمتابعة',
    route: 'any',
  },
  {
    title: 'إدارة الوصول',
    body: 'من تبويب أكواد الوصول تقدر تنشئ أكواد للمحتوى المدفوع وتتابع حالتها.',
    selector: '[data-tour="admin-codes-tab"]',
    action: 'open-admin-codes',
    actionHint: 'افتح تبويب Access codes',
    route: 'admin',
  },
]

const finishStep: TourStep = {
  title: 'أنت جاهز تبدأ',
  body: 'اختار مجموعة، افتح دِك، وابدأ المراجعة على طريقتك. تقدمك بيتحفظ على حسابك تلقائيًا.',
  route: 'any',
}

function routeMatches(route: TourStep['route'], pathname: string) {
  if (route === 'any') return true
  if (route === 'home') return pathname === '/'
  if (route === 'deck') return pathname.startsWith('/decks/')
  return pathname === '/admin'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function OnboardingTour({
  userId,
  completed,
  isAdmin,
}: {
  userId: string
  completed: boolean
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const steps = useMemo(() => [...baseSteps, ...(isAdmin ? adminSteps : []), finishStep], [isAdmin])
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [missingTarget, setMissingTarget] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')
  const step = steps[stepIndex]
  const isFinalStep = stepIndex === steps.length - 1

  useEffect(() => {
    if (!completed) setActive(true)
  }, [completed, userId])

  useEffect(() => {
    const restart = () => {
      setStepIndex(0)
      setError('')
      setActive(true)
    }
    window.addEventListener('sammaa-tour-restart', restart)
    return () => window.removeEventListener('sammaa-tour-restart', restart)
  }, [])

  useEffect(() => {
    if (!active || !step) return
    setTargetRect(null)
    setMissingTarget(false)
    if (!step.selector) return
    if (!routeMatches(step.route, pathname)) {
      setMissingTarget(true)
      return
    }

    let attempts = 0
    let frame = 0
    let timeout = 0
    let found = false
    const locate = () => {
      const target = document.querySelector<HTMLElement>(step.selector!)
      if (target) {
        found = true
        window.clearTimeout(timeout)
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        const update = () => setTargetRect(target.isConnected ? target.getBoundingClientRect() : null)
        update()
        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)
        return () => {
          window.removeEventListener('resize', update)
          window.removeEventListener('scroll', update, true)
        }
      }
      attempts++
      if (attempts < 20) frame = requestAnimationFrame(locate)
      else {
        window.clearTimeout(timeout)
        setMissingTarget(true)
      }
      return undefined
    }
    let cleanup: (() => void) | undefined
    frame = requestAnimationFrame(() => {
      cleanup = locate()
      timeout = window.setTimeout(() => {
        if (!found) setMissingTarget(true)
      }, 1800)
    })
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
      cleanup?.()
    }
  }, [active, pathname, step])

  useEffect(() => {
    if (!active || !step?.action) return
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const action = target.closest<HTMLElement>('[data-tour-action]')?.dataset.tourAction
      if (action !== step.action) return
      setStepIndex((index) => Math.min(index + 1, steps.length - 1))
      setError('')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [active, step, steps.length])

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void finishTour()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active])

  const advance = () => {
    setStepIndex((index) => Math.min(index + 1, steps.length - 1))
    setError('')
  }

  const finishTour = async () => {
    if (finishing) return
    setFinishing(true)
    setError('')
    try {
      await completeOnboarding()
      setActive(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your tutorial progress.')
    } finally {
      setFinishing(false)
    }
  }

  if (!active || !step) return null

  const cardWidth = Math.min(360, windowSafeWidth() - 24)
  const cardLeft = targetRect ? clamp(targetRect.left + targetRect.width / 2 - cardWidth / 2, 12, windowSafeWidth() - cardWidth - 12) : (windowSafeWidth() - cardWidth) / 2
  const placeAbove = !!targetRect && targetRect.bottom + 286 > windowSafeHeight()
  const cardTop = targetRect
    ? clamp(placeAbove ? targetRect.top - 286 : targetRect.bottom + 14, 12, windowSafeHeight() - 280)
    : undefined

  return (
    <div className="tour-layer" aria-live="polite">
      {targetRect && (
        <div
          className="tour-spotlight"
          style={{
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        className={`tour-card ${targetRect ? 'tour-card-targeted' : ''} ${isFinalStep ? 'tour-card-finale' : ''}`}
        style={targetRect ? { left: cardLeft, top: cardTop, width: cardWidth } : undefined}
      >
        <div className="tour-card-topline">
          <span className="tour-step-count">{isFinalStep ? 'FINISH' : `STEP ${stepIndex + 1} / ${steps.length - 1}`}</span>
          <button type="button" className="tour-skip" onClick={() => void finishTour()} disabled={finishing}>
            Skip tour <X className="size-3.5" aria-hidden />
          </button>
        </div>
        <div className="tour-progress-track" aria-hidden="true">
          <span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="tour-icon-wrap">
          {isFinalStep ? <PartyPopper className="size-6" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
        </div>
        {isFinalStep && <div className="tour-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>}
        <h2 id="tour-title" className="mt-4 text-xl font-bold leading-tight" dir="auto">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground" dir="auto">{step.body}</p>
        {step.action && !missingTarget && (
          <p className="tour-action-hint mt-4" dir="auto">
            <span className="tour-pulse-dot" /> {step.actionHint}
          </p>
        )}
        {missingTarget && step.selector && (
          <p className="mt-4 text-xs text-muted-foreground" dir="auto">
            مش لاقيين العنصر المطلوب في الصفحة الحالية. تقدر تكمل الجولة أو تتخطى الخطوة.
          </p>
        )}
        {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronLeft className="size-3.5" aria-hidden />
            الخطوة {stepIndex + 1} من {steps.length}
          </span>
          {isFinalStep ? (
            <button type="button" className="tour-primary-button" onClick={() => void finishTour()} disabled={finishing}>
              {finishing ? 'جارٍ الحفظ…' : 'ابدأ رحلتك'}
              <Check className="size-4" aria-hidden />
            </button>
          ) : step.action && !missingTarget ? (
            <span className="text-xs font-medium text-primary">نفّذ الخطوة للمتابعة</span>
          ) : (
            <button type="button" className="tour-primary-button" onClick={advance}>
              متابعة <ArrowRight className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function windowSafeWidth() {
  return typeof window === 'undefined' ? 390 : window.innerWidth
}

function windowSafeHeight() {
  return typeof window === 'undefined' ? 800 : window.innerHeight
}