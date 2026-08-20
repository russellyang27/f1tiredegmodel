"use client"

import { useEffect, useState } from "react"
import type { ReducedMotionConfig } from "framer-motion"

export type MotionPreference = "system" | "reduced" | "full"

const STORAGE_KEY = "f1tdp:motion"

export function useMotionPreference() {
  const [preference, setPreferenceState] = useState<MotionPreference>("system")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === "system" || saved === "reduced" || saved === "full") setPreferenceState(saved)
    } catch {
      // ignore
    }
  }, [])

  const setPreference = (next: MotionPreference) => {
    setPreferenceState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  // What framer-motion's <MotionConfig reducedMotion> prop expects.
  const motionConfigValue: ReducedMotionConfig =
    preference === "reduced" ? "always" : preference === "full" ? "never" : "user"

  return { preference, setPreference, motionConfigValue }
}
