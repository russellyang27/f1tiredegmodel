"use client"

import { useEffect, useState } from "react"
import type { UnitSystem } from "@/lib/units"

const STORAGE_KEY = "f1tdp:units"

export function useUnitPreference() {
  const [units, setUnitsState] = useState<UnitSystem>("metric")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === "metric" || saved === "imperial") setUnitsState(saved)
    } catch {
      // ignore
    }
  }, [])

  const setUnits = (next: UnitSystem) => {
    setUnitsState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  return { units, setUnits }
}
