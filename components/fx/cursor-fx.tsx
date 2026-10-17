'use client'

import { useEffect, useRef } from 'react'
import { Grab, Hand } from 'lucide-react'

const INTERACTIVE = 'button, a, [role="button"], summary, label, select'

export function CursorFx() {
  const layerRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current
    const ring = ringRef.current
    const dot = dotRef.current
    if (!layer || !ring || !dot) return
    if (!matchMedia('(pointer: fine)').matches) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let x = -100, y = -100
    let rx = x, ry = y, rw = 36, rh = 36, rr = 18
    let tx = x, ty = y, tw = 36, th = 36, tr = 18
    let magnet: Element | null = null
    let visible = false
    let raf = 0

    const onMove = (e: PointerEvent | DragEvent) => {
      if ('pointerType' in e && e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      if (!visible) {
        visible = true
        rx = tx = x
        ry = ty = y
        ring.style.opacity = '1'
        dot.style.opacity = '1'
      }
      const el = e.target as Element | null
      const hit = el?.closest?.(INTERACTIVE) ?? null
      const card = el?.closest?.('[data-card-id]') ?? null
      const dragging = document.body.dataset.dragging === 'true'
      // magnetic only on small buttons/links
      if (hit && !card) {
        const r = hit.getBoundingClientRect()
        magnet = r.width < 260 && r.height < 90 ? hit : null
      } else magnet = null
      ring.dataset.active = String(!!hit)
      ring.dataset.grab = String(!!card && !hit && !dragging)
      ring.dataset.grabbing = String(dragging)
      dot.dataset.hide = String(!!magnet || (!!card && !hit) || dragging)
    }

    const onDown = (e: PointerEvent) => {
      ring.dataset.down = 'true'
      const ripple = document.createElement('span')
      ripple.className = 'cursor-ripple'
      ripple.style.left = `${e.clientX}px`
      ripple.style.top = `${e.clientY}px`
      ripple.addEventListener('animationend', () => ripple.remove())
      layer.appendChild(ripple)
    }
    const onUp = () => (ring.dataset.down = 'false')
    const onLeave = () => {
      visible = false
      ring.style.opacity = '0'
      dot.style.opacity = '0'
    }

    const loop = () => {
      if (magnet && magnet.isConnected) {
        const r = magnet.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        tx = cx + (x - cx) * 0.15
        ty = cy + (y - cy) * 0.15
        tw = r.width + 12
        th = r.height + 10
        tr = Math.min(th / 2, 14)
      } else {
        tx = x
        ty = y
        tw = th = 36
        tr = 18
      }
      rx += (tx - rx) * 0.22
      ry += (ty - ry) * 0.22
      rw += (tw - rw) * 0.25
      rh += (th - rh) * 0.25
      rr += (tr - rr) * 0.25
      ring.style.width = `${rw}px`
      ring.style.height = `${rh}px`
      ring.style.borderRadius = `${rr}px`
      ring.style.transform = `translate3d(${rx - rw / 2}px, ${ry - rh / 2}px, 0)`
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('dragover', onMove)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('dragend', onUp)
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('dragover', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('dragend', onUp)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div ref={layerRef} aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <div ref={ringRef} className="cursor-ring" data-active="false" data-down="false" data-grab="false" data-grabbing="false">
        <Hand className="ic-hand" />
        <Grab className="ic-grab" />
      </div>
      <div ref={dotRef} className="cursor-dot" />
    </div>
  )
}
