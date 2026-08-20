"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string[]; label: string }[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "Navigate",
    shortcuts: [
      { keys: ["\u2190", "A"], label: "Previous circuit" },
      { keys: ["\u2192", "D"], label: "Next circuit" },
      { keys: ["Home"], label: "Jump to first circuit" },
      { keys: ["End"], label: "Jump to last circuit" },
      { keys: ["/"], label: "Search circuits" },
    ],
  },
  {
    title: "Interact",
    shortcuts: [
      { keys: ["Enter", "Space"], label: "Open the focused circuit's predictor" },
      { keys: ["Esc"], label: "Close the open panel or dialog" },
      { keys: ["Tab"], label: "Move focus between circuits and controls" },
    ],
  },
  {
    title: "Anywhere",
    shortcuts: [{ keys: ["?"], label: "Show this panel" }],
  },
]

/**
 * "?" opens a quiet reference card for the app's keyboard shortcuts.
 * Also reachable via a header button for people who'd never think to
 * press "?" in the first place.
 */
export function ShortcutsPanel({
  onOpenChange,
  suspend = false,
}: {
  onOpenChange?: (open: boolean) => void
  suspend?: boolean
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    onOpenChange?.(open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (e.key === "?" && !typing && !suspend) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, suspend])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-sm font-semibold text-white/60 backdrop-blur-md transition hover:border-red-400/40 hover:bg-white/10 hover:text-white"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-xl border border-white/10 bg-[#0d0d10] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                      Reference
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white">Keyboard shortcuts</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  {"\u2715"}
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto themed-scroll px-5 py-4">
                {GROUPS.map((group, i) => (
                  <div key={group.title} className={i > 0 ? "mt-5" : ""}>
                    <p className="mb-2.5 font-mono text-[10px] uppercase tracking-widest text-red-400">
                      {group.title}
                    </p>
                    <div className="space-y-2">
                      {group.shortcuts.map((s) => (
                        <div key={s.label} className="flex items-center justify-between gap-4">
                          <span className="text-sm text-white/70">{s.label}</span>
                          <span className="flex shrink-0 gap-1">
                            {s.keys.map((k) => (
                              <kbd
                                key={k}
                                className="rounded border border-white/15 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/80"
                              >
                                {k}
                              </kbd>
                            ))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
