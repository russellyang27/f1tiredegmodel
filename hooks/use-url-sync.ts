"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { circuits } from "@/data/circuits"
import { slugify } from "@/lib/slug"
import { COMPOUND_ORDER } from "@/lib/tire-model"
import type { PredictionSettings } from "./use-prediction-settings"
import type { CompoundId } from "@/types/circuit"

interface UrlSyncArgs {
  currentIndex: number
  goToSlide: (index: number) => void
  settings: PredictionSettings
  pinnedIds: number[]
  setPinnedIds: (ids: number[]) => void
}

const slugToIndex = new Map(circuits.map((c, i) => [slugify(c.name), i]))
const idToSlug = new Map(circuits.map((c) => [c.id, slugify(c.name)]))

/**
 * One-time read of ?circuit=&temp=&thresh=&wet=&compounds=&pin= on mount to
 * restore a shared link, then keeps the URL in sync (via history.replace,
 * so it never spams back-button history) as the user changes things.
 */
export function useUrlSync({ currentIndex, goToSlide, settings, pinnedIds, setPinnedIds }: UrlSyncArgs) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hydrated = useRef(false)

  // Hydrate from URL once on mount.
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true

    const circuitSlug = searchParams.get("circuit")
    if (circuitSlug && slugToIndex.has(circuitSlug)) {
      goToSlide(slugToIndex.get(circuitSlug)!)
    }

    const temp = Number(searchParams.get("temp"))
    if (!Number.isNaN(temp) && temp >= 5 && temp <= 60) settings.setTrackTemp(temp)

    const thresh = Number(searchParams.get("thresh"))
    if (!Number.isNaN(thresh) && thresh > 0 && thresh <= 10) settings.setThreshold(thresh)

    const wet = searchParams.get("wet")
    if (wet === "1") settings.setWet(true)
    else if (wet === "0") settings.setWet(false)

    const compounds = searchParams.get("compounds")
    if (compounds) {
      const ids = compounds
        .split(",")
        .filter((c): c is CompoundId => (COMPOUND_ORDER as readonly string[]).includes(c))
      if (ids.length > 0) settings.setSelected(ids)
    }

    const pin = searchParams.get("pin")
    if (pin) {
      const slugs = pin.split(",")
      const ids = circuits.filter((c) => slugs.includes(slugify(c.name))).map((c) => c.id)
      if (ids.length > 0) setPinnedIds(ids.slice(0, 2))
    }
    // Only ever run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the URL in sync with current state.
  useEffect(() => {
    if (!hydrated.current) return
    const circuit = circuits[currentIndex]
    if (!circuit) return

    const params = new URLSearchParams()
    params.set("circuit", slugify(circuit.name))
    params.set("temp", String(settings.trackTemp))
    params.set("thresh", String(settings.threshold))
    params.set("wet", settings.wet ? "1" : "0")
    params.set("compounds", settings.selected.join(","))
    if (pinnedIds.length === 2) {
      params.set("pin", pinnedIds.map((id) => idToSlug.get(id)).join(","))
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, settings.trackTemp, settings.threshold, settings.wet, settings.selected.join(","), pinnedIds.join(",")])
}
