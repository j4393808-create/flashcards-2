'use client'

import { useEffect, useRef } from 'react'

const INTERACTIVE = 'button, a, [role="button"], summary, label, select'
const SPARK_COLORS = ['var(--primary)', 'var(--highlight)', 'var(--coral)']

export function CursorFx() {
  const layerRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current
    const ring = ringRef.current
    if (!layer || !ring) return
    if (!matchMedia('(pointer: fine)').matches) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let x = -100
    let y = -100
    let rx = x
    let ry = y
    let visible = false
    let raf = 0

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      if (!visible) {
        visible = true
        rx = x
        ry = y
        ring.style.opacity = '1'
      }
      const active = !!(e.target as Element | null)?.closest?.(INTERACTIVE)
      ring.dataset.active = String(active)
    }
    const onDown = (e: PointerEvent) => {
      ring.dataset.down = 'true'
      for (let i = 0; i < 8; i++) {
        const spark = document.createElement('span')
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4
        const dist = 18 + Math.random() * 18
        spark.className = 'cursor-spark'
        spark.style.left = `${e.clientX}px`
        spark.style.top = `${e.clientY}px`
        spark.style.background = SPARK_COLORS[i % SPARK_COLORS.length]
        spark.style.setProperty('--dx', `${Math.cos(angle) * dist}px`)
        spark.style.setProperty('--dy', `${Math.sin(angle) * dist}px`)
        spark.addEventListener('animationend', () => spark.remove())
        layer.appendChild(spark)
      }
    }
    const onUp = () => {
      ring.dataset.down = 'false'
    }
    const onLeave = () => {
      visible = false
      ring.style.opacity = '0'
    }
    const loop = () => {
      rx += (x - rx) * 0.2
      ry += (y - ry) * 0.2
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div ref={layerRef} aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <div ref={ringRef} className="cursor-ring" data-active="false" data-down="false">
        <span />
      </div>
    </div>
  )
}
