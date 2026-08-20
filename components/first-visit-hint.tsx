"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

const STORAGE_KEY = "f1tdp:seen-wheel-hint"
const AUTO_DISMISS_MS = 5000

/**
 * A brief callout above the steering wheel for first-time visitors, since
 * "drag a wheel to browse" isn't a familiar interaction pattern. Shown once
 * per browser (localStorage), dismissed automatically, on any navigation,
 * or on click. Safe to call `show=false` — it just won't render.
 */
export function FirstVisitHint({ active, dismissSignal = 0 }: { active: boolean; dismissSignal?: number }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!active) return
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
    } catch {
      // localStorage unavailable (private mode, etc.) — show anyway, just don't persist.
    }
    setDismissed(false)
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Dismiss immediately the moment the user actually interacts with the wheel.
  useEffect(() => {
    if (dismissSignal > 0) dismiss()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissSignal])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.button
          type="button"
          onClick={dismiss}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35 }}
          className="absolute bottom-[164px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-400/30 bg-[#14090a]/90 px-4 py-2 font-mono text-[11px] text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          Drag the wheel to explore circuits
        </motion.button>
      )}
    </AnimatePresence>
  )
}
