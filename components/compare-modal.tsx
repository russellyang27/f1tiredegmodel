"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ChartSkeleton } from "./chart-skeleton"
import { DegradationChart } from "./degradation-chart"
import { CompoundResultCard } from "./compound-result-card"
import { COMPOUNDS, COMPOUND_ORDER, abrasivenessNote, buildStrategyInsights, MAX_LAPS } from "@/lib/tire-model"
import { CountryFlag } from "./country-flag"
import { formatTemp } from "@/lib/units"
import type { UnitSystem } from "@/lib/units"
import { getPrediction, type PredictionSource } from "@/lib/api"
import type { PredictionSettings } from "@/hooks/use-prediction-settings"
import type { Circuit, PredictionResponse } from "@/types/circuit"

interface CompareModalProps {
  circuits: Circuit[]
  open: boolean
  onClose: () => void
  settings: PredictionSettings
  onUnpin: (circuit: Circuit) => void
  units: UnitSystem
}

interface SideState {
  result: PredictionResponse | null
  source: PredictionSource | null
}

export function CompareModal({ circuits, open, onClose, settings, onUnpin, units }: CompareModalProps) {
  const { trackTemp, setTrackTemp, wet, setWet, threshold, setThreshold, selected, toggleCompound } = settings
  const [running, setRunning] = useState(false)
  const [sides, setSides] = useState<[SideState, SideState]>([
    { result: null, source: null },
    { result: null, source: null },
  ])

  // Clear results when the shared conditions or the pinned pair change —
  // avoids showing a comparison that's stale relative to the current inputs.
  useEffect(() => {
    setSides([
      { result: null, source: null },
      { result: null, source: null },
    ])
  }, [circuits[0]?.id, circuits[1]?.id, trackTemp, wet, threshold, selected.join(",")])

  if (circuits.length < 2) return null
  const [circuitA, circuitB] = circuits

  const runComparison = async () => {
    if (selected.length === 0) return
    setRunning(true)
    const req = (circuit: Circuit) => ({
      circuit: circuit.name,
      track_temp_c: trackTemp,
      wet,
      threshold_s: threshold,
      compounds: COMPOUND_ORDER.filter((c) => selected.includes(c)),
    })
    const [[a, b]] = await Promise.all([
      Promise.all([getPrediction(circuitA, req(circuitA)), getPrediction(circuitB, req(circuitB))]),
      new Promise((r) => setTimeout(r, 450)),
    ])
    setSides([
      { result: a.data, source: a.source },
      { result: b.data, source: b.source },
    ])
    setRunning(false)
  }

  // Shared scale so a bar for e.g. "Baku HARD" is visually comparable to
  // "Sakhir HARD" rather than each side scaling only against itself.
  const combinedMaxLife = Math.max(
    1,
    ...sides.flatMap((s) =>
      s.result ? s.result.compounds.map((c) => (c.durable ? MAX_LAPS : (c.life_estimate_laps ?? 0))) : [0],
    ),
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[92vh] w-[calc(100%-2rem)] max-w-6xl sm:max-w-6xl overflow-y-auto themed-scroll border-white/10 bg-[#0a0a0c] p-0 text-white"
        showCloseButton
      >
        <div className="telemetry-grid">
          <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Compare Mode</span>
            </div>
            <DialogTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xl font-bold tracking-tight md:text-2xl">
              <span>{circuitA.venue}</span>
              <span className="text-base font-normal text-white/30 md:text-lg">vs</span>
              <span>{circuitB.venue}</span>
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-white/40">
              Same track temperature, threshold, and compounds applied to both circuits.
            </DialogDescription>
          </DialogHeader>

          {/* Shared config bar */}
          <div className="space-y-6 border-b border-white/10 px-6 py-6">
            <div className="grid gap-10 sm:grid-cols-3">
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">Track Temp</p>
                  <span className="font-mono text-sm text-white">{formatTemp(trackTemp, units)}</span>
                </div>
                <Slider value={[trackTemp]} min={15} max={55} step={1} onValueChange={(v) => setTrackTemp(v[0])} />
              </div>

              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">Threshold</p>
                  <span className="font-mono text-sm text-white">{threshold.toFixed(1)}s</span>
                </div>
                <Slider
                  value={[threshold]}
                  min={0.5}
                  max={4}
                  step={0.1}
                  onValueChange={(v) => setThreshold(v[0])}
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white/80">Wet / Rain</p>
                <Switch checked={wet} onCheckedChange={setWet} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-white/80">Compare compounds</p>
              <div className="flex flex-wrap items-center gap-2.5">
                {COMPOUND_ORDER.map((id) => {
                  const meta = COMPOUNDS[id]
                  const active = selected.includes(id)
                  return (
                    <button
                      key={id}
                      onClick={() => toggleCompound(id)}
                      aria-pressed={active}
                      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                        active
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/10 text-white/35 hover:bg-white/5"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      {id}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-center border-b border-white/10 px-6 py-4">
            <button
              onClick={runComparison}
              disabled={selected.length === 0 || running}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold uppercase tracking-widest text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {running ? "Running comparison\u2026" : "Run Comparison"}
            </button>
          </div>

          {/* Two-column results */}
          <div className="grid divide-white/10 lg:grid-cols-2 lg:divide-x">
            {[circuitA, circuitB].map((circuit, i) => (
              <CircuitColumn
                key={circuit.id}
                circuit={circuit}
                side={sides[i]}
                running={running}
                combinedMaxLife={combinedMaxLife}
                onUnpin={() => onUnpin(circuit)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CircuitColumn({
  circuit,
  side,
  running,
  combinedMaxLife,
  onUnpin,
}: {
  circuit: Circuit
  side: SideState
  running: boolean
  combinedMaxLife: number
  onUnpin: () => void
}) {
  return (
    <div className="@container flex flex-col gap-5 px-6 py-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
            <CountryFlag country={circuit.country} />
            {circuit.country}
          </p>
          <h3 className="text-lg font-bold text-white">{circuit.venue}</h3>
          <p className="mt-1 font-mono text-[11px] text-white/40">{abrasivenessNote(circuit)}</p>
        </div>
        <button
          type="button"
          onClick={onUnpin}
          title="Remove from comparison"
          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-white/40 transition hover:border-red-400/40 hover:text-red-300"
        >
          Unpin
        </button>
      </div>

      <AnimatePresence mode="wait">
        {running ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ChartSkeleton />
          </motion.div>
        ) : side.result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5"
          >
            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
                side.source === "live"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-white/15 bg-white/[0.04] text-white/50"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${side.source === "live" ? "bg-emerald-400" : "bg-white/40"}`} />
              {side.source === "live" ? "Live model" : "Simulated preview"}
            </span>

            <DegradationChart result={side.result} />

            <div className="grid gap-3 @sm:grid-cols-2 @2xl:grid-cols-3">
              {side.result.compounds.map((c) => (
                <CompoundResultCard key={c.compound} result={c} maxLifeForScale={combinedMaxLife} />
              ))}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                Strategy analysis
              </p>
              <div className="flex flex-col divide-y divide-white/5">
                {buildStrategyInsights(circuit, side.result).map((insight, i) => (
                  <div key={i} className={i === 0 ? "pb-3" : "py-3 last:pb-0"}>
                    <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-red-400">
                      {insight.title}
                    </p>
                    <p className="text-[13px] leading-relaxed text-white/75">{insight.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[300px] flex-col items-center justify-center gap-2 text-center"
          >
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
              Awaiting input
            </div>
            <p className="max-w-xs text-sm text-white/50">Run the comparison to project degradation here.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
