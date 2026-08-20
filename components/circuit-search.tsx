"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CountryFlag } from "./country-flag"
import type { Circuit } from "@/types/circuit"

interface CircuitSearchProps {
  circuits: Circuit[]
  onSelect: (index: number) => void
  onOpenChange?: (open: boolean) => void
  suspend?: boolean
}

/**
 * A quiet "/" -> jump-to-circuit search, closer to a command palette than a
 * form field. Only worth it once you're navigating 16 circuits by keyboard
 * instead of always dragging the wheel.
 */
export function CircuitSearch({ circuits, onSelect, onOpenChange, suspend = false }: CircuitSearchProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    onOpenChange?.(open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = circuits
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.venue.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    })
    .slice(0, 8)

  useEffect(() => setHighlight(0), [query])

  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (e.key === "/" && !typing && !open && !suspend) {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleGlobalKey)
    return () => window.removeEventListener("keydown", handleGlobalKey)
  }, [open, suspend])

  useEffect(() => {
    if (open) {
      setQuery("")
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const commit = (index: number) => {
    onSelect(index)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 font-mono text-[11px] text-white/50 backdrop-blur-md transition hover:border-white/25 hover:text-white/80"
        aria-label="Search circuits"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden sm:inline">Search circuits</span>
        <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">/</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 pt-[14vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#0d0d10] shadow-2xl"
            >
              <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-white/40">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Jump to a circuit\u2026"
                  className="flex-1 bg-transparent font-mono text-sm text-white placeholder:text-white/30 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setHighlight((h) => Math.min(matches.length - 1, h + 1))
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault()
                      setHighlight((h) => Math.max(0, h - 1))
                    } else if (e.key === "Enter" && matches[highlight]) {
                      commit(matches[highlight].index)
                    }
                  }}
                />
                <kbd className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/30">esc</kbd>
              </div>

              <div className="max-h-72 overflow-y-auto themed-scroll py-1.5">
                {matches.length === 0 && (
                  <p className="px-4 py-6 text-center font-mono text-xs text-white/40">No circuits match &quot;{query}&quot;</p>
                )}
                {matches.map(({ c, index }, i) => (
                  <button
                    key={c.id}
                    onClick={() => commit(index)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === highlight ? "bg-white/10" : ""
                    }`}
                  >
                    <CountryFlag country={c.country} className="h-3" />
                    <span className="flex-1">
                      <span className="block text-sm text-white">{c.venue}</span>
                      <span className="block font-mono text-[10px] uppercase tracking-widest text-white/40">
                        {c.country}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-white/30">{String(c.id).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
