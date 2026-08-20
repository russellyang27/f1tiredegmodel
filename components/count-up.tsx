"use client"

import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  value: number
  durationMs?: number
  className?: string
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

/** Ticks from 0 up to `value` on mount/change instead of just appearing. */
export function CountUp({ value, durationMs = 500, className }: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const from = 0

    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      setDisplay(Math.round(from + (value - from) * easeOutCubic(t)))
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs])

  return <span className={className}>{display}</span>
}
