"use client"

import { useRef, useState, useCallback } from "react"
import { motion } from "framer-motion"

interface SteeringWheelProps {
  total: number
  current: number
  onNext: () => void
  onPrev: () => void
}

const STEP = 42 // degrees of wheel travel per circuit

/**
 * An interactive F1-style steering wheel that replaces the slider scrubber.
 * Grab and turn it: every ~42 degrees of rotation advances one circuit.
 */
export function SteeringWheel({ total, current, onNext, onPrev }: SteeringWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const lastAngle = useRef(0)
  const accum = useRef(0)
  const [liveDelta, setLiveDelta] = useState(0)

  const angleFromEvent = useCallback((clientX: number, clientY: number) => {
    const rect = wheelRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true
      accum.current = 0
      lastAngle.current = angleFromEvent(e.clientX, e.clientY)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [angleFromEvent],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      const a = angleFromEvent(e.clientX, e.clientY)
      let delta = a - lastAngle.current
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      lastAngle.current = a
      accum.current += delta
      setLiveDelta((v) => v + delta)

      while (accum.current >= STEP) {
        onNext()
        accum.current -= STEP
      }
      while (accum.current <= -STEP) {
        onPrev()
        accum.current += STEP
      }
    },
    [angleFromEvent, onNext, onPrev],
  )

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    setLiveDelta(0)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [])

  const rotation = current * STEP + liveDelta

  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-3">
      <div className="flex items-center gap-6">
        <button
          onClick={onPrev}
          disabled={current === 0}
          className="font-mono text-xs uppercase tracking-widest text-white/40 transition-colors hover:text-white disabled:opacity-20"
          aria-label="Previous circuit"
        >
          {"< prev"}
        </button>

        <div
          ref={wheelRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative h-28 w-28 cursor-grab touch-none select-none active:cursor-grabbing"
          role="slider"
          aria-label="Steering wheel circuit selector"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={current + 1}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") onNext()
            if (e.key === "ArrowLeft") onPrev()
          }}
        >
          <motion.div
            className="h-full w-full"
            animate={{ rotate: rotation }}
            transition={dragging.current ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 26 }}
          >
            <WheelGraphic />
          </motion.div>
        </div>

        <button
          onClick={onNext}
          disabled={current === total - 1}
          className="font-mono text-xs uppercase tracking-widest text-white/40 transition-colors hover:text-white disabled:opacity-20"
          aria-label="Next circuit"
        >
          {"next >"}
        </button>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">turn to select circuit</p>
    </div>
  )
}

function WheelGraphic() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
      {/* Outer rim */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="#1c1c22" strokeWidth="8" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#3a3a44" strokeWidth="2" />
      {/* Top marker (12 o'clock reference stripe) */}
      <rect x="46" y="4" width="8" height="10" rx="1.5" fill="#ef4444" />
      {/* Flattened F1 grip sections */}
      <path d="M18 30 A40 40 0 0 1 82 30" fill="none" stroke="#2a2a32" strokeWidth="7" strokeLinecap="round" />
      {/* Central hub / display */}
      <rect x="30" y="38" width="40" height="24" rx="4" fill="#0d0d10" stroke="#3a3a44" strokeWidth="1.5" />
      <rect x="34" y="42" width="32" height="8" rx="1.5" fill="#14351f" />
      <rect x="35" y="43.5" width="9" height="5" rx="1" fill="#22c55e" />
      <rect x="45.5" y="43.5" width="9" height="5" rx="1" fill="#eab308" />
      <rect x="56" y="43.5" width="9" height="5" rx="1" fill="#ef4444" />
      {/* Buttons */}
      <circle cx="37" cy="56" r="2.4" fill="#ef4444" />
      <circle cx="50" cy="56" r="2.4" fill="#3b82f6" />
      <circle cx="63" cy="56" r="2.4" fill="#eab308" />
      {/* Spokes */}
      <rect x="14" y="47" width="16" height="6" rx="3" fill="#2a2a32" />
      <rect x="70" y="47" width="16" height="6" rx="3" fill="#2a2a32" />
      <rect x="47" y="62" width="6" height="20" rx="3" fill="#2a2a32" />
    </svg>
  )
}
