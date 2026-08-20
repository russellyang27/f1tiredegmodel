"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { CountryFlag } from "./country-flag"
import { formatLength } from "@/lib/units"
import type { Circuit } from "@/types/circuit"
import type { UnitSystem } from "@/lib/units"

interface CircuitCardProps {
  circuit: Circuit
  isActive: boolean
  dragOffset: number
  index: number
  currentIndex: number
  onOpen: (circuit: Circuit) => void
  pinned: boolean
  onTogglePin: (circuit: Circuit) => void
  units: UnitSystem
}

export function CircuitCard({
  circuit,
  isActive,
  dragOffset,
  index,
  currentIndex,
  onOpen,
  pinned,
  onTogglePin,
  units,
}: CircuitCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const distance = index - currentIndex
  const absDistance = Math.abs(distance)
  const parallaxOffset = dragOffset * (0.1 * (distance + 1))

  // Coverflow-style depth: neighbors fan away in 3D rather than just
  // scaling/blurring in place. Clamped so far-off cards don't over-rotate.
  const clampedDistance = Math.max(-3, Math.min(3, distance))
  const rotateY = clampedDistance * -26
  const translateZ = -absDistance * 120
  const translateX = clampedDistance * -18
  // Depth-of-field: cards further from center rack out of focus, like a
  // camera holding focus on the active slide.
  const blurPx = Math.min(6, absDistance * 2.2)

  return (
    <motion.div
      className="relative flex-shrink-0"
      animate={{
        scale: isActive ? 1 : 0.82,
        opacity: isActive ? 1 : Math.max(0.25, 0.55 - absDistance * 0.1),
        rotateY,
        z: translateZ,
        x: translateX,
        filter: `blur(${blurPx}px)`,
      }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      style={{ x: parallaxOffset, zIndex: 50 - absDistance, transformStyle: "preserve-3d" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(circuit)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onOpen(circuit)
          }
        }}
        className="group relative block cursor-pointer overflow-hidden rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
        aria-label={
          isActive ? `Configure tire prediction for ${circuit.venue}` : `Bring ${circuit.venue} to center`
        }
        animate={{
          y: isHovered ? (isActive ? -10 : -4) : 0,
          boxShadow: isHovered
            ? isActive
              ? "0 40px 80px -20px rgba(0,0,0,0.85)"
              : "0 30px 60px -18px rgba(0,0,0,0.7)"
            : "0 20px 40px -10px rgba(0,0,0,0.6)",
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Panel frame — brightens on hover even when not active, and marks pinned state */}
        <div
          className={`absolute inset-0 rounded-2xl border bg-[#0d0d10]/80 backdrop-blur-sm transition-colors duration-300 ${
            pinned
              ? "border-red-400/60"
              : isHovered
                ? "border-white/25"
                : "border-white/10"
          }`}
        />

        <div className="relative h-[400px] w-[400px] overflow-hidden rounded-2xl p-3 md:h-[500px] md:w-[500px]">
          {/* Telemetry meta row */}
          <div className="relative z-10 flex items-center justify-between px-3 pt-2">
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">
              <span aria-hidden>
                <CountryFlag country={circuit.country} className="h-[0.85em]" />
              </span>
              {circuit.country}
            </span>

            <div className="flex items-center gap-2">
              {/* Pin-for-compare toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePin(circuit)
                }}
                aria-label={pinned ? `Remove ${circuit.venue} from comparison` : `Pin ${circuit.venue} to compare`}
                aria-pressed={pinned}
                title={pinned ? "Unpin from comparison" : "Pin to compare"}
                className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[11px] transition-all ${
                  pinned
                    ? "border-red-400/70 bg-red-500/20 text-red-300"
                    : "border-white/10 bg-white/5 text-white/40 opacity-0 group-hover:opacity-100 hover:border-white/30 hover:text-white/80"
                }`}
              >
                {pinned ? "\u2713" : "+"}
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                {String(circuit.id).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Track map */}
          <motion.img
            src={circuit.image || "/placeholder.svg"}
            alt={`${circuit.venue} track layout`}
            className="mx-auto h-[300px] w-full rounded-xl object-contain md:h-[360px]"
            animate={{ scale: isHovered ? 1.04 : 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            draggable={false}
          />

          {/* Info footer */}
          <div className="absolute inset-x-3 bottom-3 select-none rounded-b-xl bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6">
            <motion.h2
              className="text-2xl font-bold tracking-tight text-white md:text-3xl"
              animate={{ y: isHovered ? -4 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {circuit.venue}
            </motion.h2>
            <div className="mt-3 flex items-center gap-5 font-mono text-xs text-white/60">
              <span>
                <span className="text-white/40">LEN </span>
                {formatLength(circuit.lengthKm, units)}
              </span>
              <span>
                <span className="text-white/40">COR </span>
                {circuit.corners}
              </span>
              <span>
                <span className="text-white/40">LAPS </span>
                {circuit.laps}
              </span>
              <span>
                <span className="text-white/40">REC </span>
                {circuit.lapRecord}
              </span>
            </div>

            <motion.div
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest ${
                isActive ? "bg-white text-black" : "border border-white/25 bg-black/40 text-white/80"
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: isActive || isHovered ? 1 : 0,
                y: isActive || isHovered ? 0 : 10,
              }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              {isActive ? "Configure & Predict" : "Bring to center"}
              <span aria-hidden>&rarr;</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
