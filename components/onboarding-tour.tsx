'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Sparkles, X } from 'lucide-react'
import { completeOnboarding } from '@/app/actions'

type TourStep = {
  title: string
  body: string
  selector?: string
  action?: string
  route: 'home' | 'deck' | 'admin' | 'any'
}

const baseSteps: TourStep[] = [
  {
    title: 'أهلًا بيك في كارت وكتاب',
    body: 'جولة سريعة تعرّفك على التطبيق في أقل من دقيقة.',
    route: 'home',
  },
  {
    title: 'كود الوصول',
    body: 'لو معاك كود، اكتبه هنا لفتح الدِكات المدفوعة.',
    selector: '[data-tour="access-code"]',
    route: 'home',
  },
  {
    title: 'افتح مجموعة',
    body: 'اضغط على أي مجموعة لتشوف الدِكات اللي جواها.',
    selector: '[data-tour="group-card"]',
    action: 'open-group',
    route: 'home',
  },
  {
    title: 'اختار دِك',
    body: 'اضغط على دِك لبدء المذاكرة.',
    selector: '[data-tour="deck-card"]',
    action: 'open-deck',
    route: 'home',
  },
  {
    title: 'اكشف الإجابة',
    body: 'اضغط على كلمة مخفية لتظهر.',
    selector: '[data-tour="study-reveal"]',
    action: 'reveal-word',
    route: 'deck',
  },
  {
    title: 'وضع الكتابة',
    body: 'اختار «اكتب الإجابة» عشان تختبر نفسك.',
    selector: '[data-tour="study-type-mode"]',
    action: 'select-type-mode',
    route: 'deck',
  },
  {
    title: 'لخبط الترتيب',
    body: 'اضغط «لخبط الترتيب» لتغيير ترتيب الكروت.',
    selector: '[data-tour="study-shuffle"]',
    action: 'shuffle-cards',
    route: 'deck',
  },
  {
    title: 'الإعدادات',
    body: 'افتحها للتحكم في الصوت والاختصارات.',
    selector: '[data-tour="settings-trigger"]',
    action: 'open-settings',
    route: 'any',
  },
  {
    title: 'الاختصارات',
    body: 'Space للكشف، الأسهم للتنقل، Enter للتسجيل.',
    selector: '[data-tour="settings-shortcuts"]',
    route: 'any',
  },
]

const adminSteps: TourStep[] = [
  {
    title: 'لوحة الأدمن',
    body: 'افتحها لإدارة المجموعات والدِكات والكروت.',
    selector: '[data-tour="admin-link"]',
    action: 'open-admin',
    route: 'any',
  },
  {
    title: 'أكواد الوصول',
    body: 'من هنا تنشئ أكواد للمحتوى المدفوع وتتابعها.',
    selector: '[data-tour="admin-codes-tab"]',
    action: 'open-admin-codes',
    route: 'admin',
  },
]

const finishStep: TourStep = {
  title: 'أنت جاهز!',
  body: 'ابدأ المراجعة، وتقدمك بيتحفظ تلقائيًا.',
  route: 'any',
}

function routeMatches(route: TourStep['route'], pathname: string) {
  if (route === 'any') return true
  if (route === 'home') return pathname === '/'
  if (route === 'deck') return pathname.startsWith('/decks/')
  return pathname === '/admin'
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
  const router = useRouter()
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

  // Take the user to the page a step explains, automatically.
  useEffect(() => {
    if (!active || !step || routeMatches(step.route, pathname)) return

    if (step.route === 'home') {
      router.push('/')
      return
    }
    if (step.route === 'admin') {
      router.push('/admin')
      return
    }
    // step.route === 'deck'
    if (pathname !== '/') {
      router.push('/')
      return
    }
    let attempts = 0
    let opened = false
    const timer = window.setInterval(() => {
      attempts++
      const deckLink = document.querySelector<HTMLAnchorElement>('a[data-tour="deck-card"]')
      if (deckLink) {
        window.clearInterval(timer)
        router.push(deckLink.getAttribute('href') ?? '/')
        return
      }
      if (!opened) {
        const group = document.querySelector<HTMLElement>('[data-tour="group-card"]')
        if (group) {
          opened = true
          group.click()
        }
      }
      if (attempts > 40) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [active, step, pathname, router])

  // Find and highlight the target element.
  useEffect(() => {
    if (!active || !step) return
    setTargetRect(null)
    setMissingTarget(false)
    if (!step.selector) return
    if (!routeMatches(step.route, pathname)) return

    let attempts = 0
    let frame = 0
    let timeout = 0
    let found = false
    let cleanup: (() => void) | undefined
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
        cleanup = () => {
          window.removeEventListener('resize', update)
          window.removeEventListener('scroll', update, true)
        }
        return
      }
      attempts++
      if (attempts < 40) frame = requestAnimationFrame(locate)
      else {
        window.clearTimeout(timeout)
        setMissingTarget(true)
      }
    }
    frame = requestAnimationFrame(locate)
    timeout = window.setTimeout(() => {
      if (!found) setMissingTarget(true)
    }, 3000)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
      cleanup?.()
    }
  }, [active, pathname, step])

  // Advance automatically when the user performs the step's action.
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

  const waitingForAction = !!step.action && !missingTarget
  // Keep the floating bar from covering a target that sits in the header.
  const nearTop = !!targetRect && targetRect.top < 84
  const barTop = nearTop && targetRect ? targetRect.bottom + 14 : 12

  return (
    <div className="tour-layer" aria-live="polite">
      {targetRect && (
        <div
          className="tour-spotlight"
          style={{
            left: targetRect.left - 5,
            top: targetRect.top - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
          }}
        />
      )}
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        dir="rtl"
        className={`tour-bar ${isFinalStep ? 'tour-bar-finale' : ''}`}
        style={{ top: barTop }}
      >
        <span className="tour-bar-icon" aria-hidden>
          {isFinalStep ? <Check className="size-4" /> : <Sparkles className="size-4" />}
        </span>
        <div className="tour-bar-text">
          <h2 id="tour-title" className="tour-bar-title">
            {waitingForAction && <span className="tour-pulse-dot" aria-hidden />}
            {step.title}
          </h2>
          <p className="tour-bar-body">
            {missingTarget && step.selector ? 'العنصر مش ظاهر هنا، كمّل للخطوة اللي بعدها.' : step.body}
          </p>
          {error && <p role="alert" className="tour-bar-error">{error}</p>}
        </div>
        <div className="tour-bar-side">
          <span className="tour-bar-count">{isFinalStep ? steps.length : stepIndex + 1}/{steps.length}</span>
          {isFinalStep ? (
            <button type="button" className="tour-bar-button" onClick={() => void finishTour()} disabled={finishing}>
              {finishing ? '…' : 'ابدأ'}
            </button>
          ) : waitingForAction ? null : (
            <button type="button" className="tour-bar-button" onClick={advance} aria-label="الخطوة التالية">
              التالي <ArrowLeft className="size-3.5" aria-hidden />
            </button>
          )}
          {!isFinalStep && (
            <button type="button" className="tour-bar-close" onClick={() => void finishTour()} disabled={finishing} aria-label="تخطي الجولة">
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <span className="tour-bar-progress" aria-hidden style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </section>
    </div>
  )
}
