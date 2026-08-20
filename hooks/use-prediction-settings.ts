"use client"

import { useState } from "react"
import type { CompoundId } from "@/types/circuit"

export interface PredictionSettings {
  trackTemp: number
  setTrackTemp: (v: number) => void
  wet: boolean
  setWet: (v: boolean) => void
  threshold: number
  setThreshold: (v: number) => void
  selected: CompoundId[]
  setSelected: (ids: CompoundId[]) => void
  toggleCompound: (id: CompoundId) => void
}

/**
 * Lives at the CircuitSlider level (not inside PredictionPanel) so the same
 * temperature/threshold/compound selection carries over when you close one
 * circuit and open another, and so Compare mode can share it across both
 * sides instead of each side drifting independently.
 */
export function usePredictionSettings(): PredictionSettings {
  const [trackTemp, setTrackTemp] = useState(34)
  const [wet, setWet] = useState(false)
  const [threshold, setThreshold] = useState(1.5)
  const [selected, setSelected] = useState<CompoundId[]>(["SOFT", "MEDIUM", "HARD"])

  const toggleCompound = (id: CompoundId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  return { trackTemp, setTrackTemp, wet, setWet, threshold, setThreshold, selected, setSelected, toggleCompound }
}
