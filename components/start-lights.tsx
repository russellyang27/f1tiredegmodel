"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

const LIGHT_COUNT = 5
const LIGHT_INTERVAL_MS = 340
const HOLD_MS = 750
const EXIT_MS = 550

/**
 * Recreates the F1 start-light gantry: five lights illuminate in sequence,
 * hold, then cut out together — "lights out, and away we go" — before
 * fading to reveal the interface. This is the one orchestrated page-load
 * moment for the whole app; everything else stays quiet by comparison.
 * Click/tap anywhere to skip.
 */
export function StartLights({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = useState(true)
  const [litCount, setLitCount] = useState(0)
  const [out, setOut] = useState(false)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = 1; i <= LIGHT_COUNT; i++) {
      timers.push(setTimeout(() => setLitCount(i), i * LIGHT_INTERVAL_MS))
    }
    timers.push(setTimeout(() => setOut(true), LIGHT_COUNT * LIGHT_INTERVAL_MS + HOLD_MS))
    timers.push(
      setTimeout(
        () => {
          setVisible(false)
          onDone?.()
        },
        LIGHT_COUNT * LIGHT_INTERVAL_MS + HOLD_MS + EXIT_MS,
      ),
    )

    return () => timers.forEach(clearTimeout)
  }, [onDone])

  const skip = () => {
    setVisible(false)
    onDone?.()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-[#050506]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onClick={skip}
          role="button"
          aria-label="Skip intro"
        >
          <div className="flex flex-col items-center gap-8">
            <div className="flex gap-5 md:gap-7">
              {Array.from({ length: LIGHT_COUNT }).map((_, i) => {
                const lit = !out && i < litCount
                return (
                  <div
                    key={i}
                    className="flex h-14 w-14 items-center justify-center rounded-md border border-white/10 bg-[#0d0d10] shadow-[0_10px_30px_rgba(0,0,0,0.6)] md:h-20 md:w-20"
                  >
                    <div
                      className="h-8 w-8 rounded-full transition-all duration-150 md:h-11 md:w-11"
                      style={{
                        background: lit
                          ? "radial-gradient(circle at 35% 30%, #ff8a7a, #ef4444 55%, #7a0d0d 100%)"
                          : "#1c0d0d",
                        boxShadow: lit
                          ? "0 0 22px 6px rgba(239,68,68,0.75), 0 0 60px 10px rgba(239,68,68,0.25)"
                          : "inset 0 0 6px rgba(0,0,0,0.6)",
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <motion.p
              className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: out ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              Lights out, and away we go
            </motion.p>
            <button
              type="button"
              onClick={skip}
              className="font-mono text-[10px] uppercase tracking-widest text-white/20 transition hover:text-white/50"
            >
              Skip
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
