"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ChartSkeleton } from "./chart-skeleton"
import { DegradationChart } from "./degradation-chart"
import { CompoundResultCard } from "./compound-result-card"
import { COMPOUNDS, COMPOUND_ORDER, buildStrategyInsights, abrasivenessNote, MAX_LAPS } from "@/lib/tire-model"
import { getPrediction, type PredictionSource } from "@/lib/api"
import { CountryFlag } from "./country-flag"
import { celsiusToFahrenheit, fahrenheitToCelsius, formatLength } from "@/lib/units"
import type { UnitSystem } from "@/lib/units"
import type { PredictionSettings } from "@/hooks/use-prediction-settings"
import type { Circuit, PredictionResponse } from "@/types/circuit"

interface PredictionPanelProps {
  circuit: Circuit | null
  open: boolean
  onClose: () => void
  settings: PredictionSettings
  units: UnitSystem
}

export function PredictionPanel({ circuit, open, onClose, settings, units }: PredictionPanelProps) {
  const { trackTemp, setTrackTemp, wet, setWet, threshold, setThreshold, selected, toggleCompound } = settings
  const [result, setResult] = useState<PredictionResponse | null>(null)
  const [running, setRunning] = useState(false)
  const [slow, setSlow] = useState(false)
  const [source, setSource] = useState<PredictionSource | null>(null)

  // Reset only the result (not the settings — those persist across circuits
  // by design) whenever a new circuit is opened.
  useEffect(() => {
    if (open) {
      setResult(null)
      setRunning(false)
      setSlow(false)
      setSource(null)
    }
  }, [open, circuit?.id])

  const runModel = async () => {
    if (!circuit || selected.length === 0) return
    setRunning(true)
    setSlow(false)
    const req = {
      circuit: circuit.name,
      track_temp_c: trackTemp,
      wet,
      threshold_s: threshold,
      compounds: COMPOUND_ORDER.filter((c) => selected.includes(c)),
    }
    // Minimum visible latency so the loading state reads intentionally,
    // even when the mock resolves instantly or the live API is very fast.
    const [outcome] = await Promise.all([
      getPrediction(circuit, req, { onSlow: () => setSlow(true) }),
      new Promise((r) => setTimeout(r, 450)),
    ])
    setResult(outcome.data)
    setSource(outcome.source)
    setRunning(false)
    setSlow(false)
  }

  const insights = useMemo(
    () => (result && circuit ? buildStrategyInsights(circuit, result) : []),
    [result, circuit],
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[92vh] w-[calc(100%-2rem)] max-w-6xl sm:max-w-6xl overflow-y-auto themed-scroll border-white/10 bg-[#0a0a0c] p-0 text-white"
        showCloseButton
      >
        <div className="telemetry-grid">
          <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-white/40">
                {circuit && (
                  <>
                    <CountryFlag country={circuit.country} />
                    {circuit.country}
                  </>
                )}
              </span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span className="font-mono text-xs uppercase tracking-widest text-white/40">
                {circuit
                  ? `${formatLength(circuit.lengthKm, units)} \u2022 ${circuit.corners} corners \u2022 ${circuit.laps} laps`
                  : ""}
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {circuit?.venue ?? "Circuit"}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-white/40">
              {"Random Forest tire-degradation model \u2014 predicted lap-time falloff vs. tire age"}
            </DialogDescription>
            {circuit && (
              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex items-center gap-1" title={`Abrasiveness ${circuit.abrasiveness}/5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i < circuit.abrasiveness ? "bg-red-400" : "bg-white/15"
                      }`}
                    />
                  ))}
                </div>
                <p className="font-mono text-[11px] leading-relaxed text-white/50">{abrasivenessNote(circuit)}</p>
              </div>
            )}
          </DialogHeader>

          <div className="grid gap-0 md:grid-cols-[340px_1fr]">
            {/* Config column */}
            <div className="flex flex-col gap-7 border-b border-white/10 px-6 py-6 md:border-b-0 md:border-r">
              <Control
                label="Track Temperature"
                value={
                  <EditableValue
                    value={trackTemp}
                    suffix={units === "imperial" ? "\u00B0F" : "\u00B0C"}
                    min={15}
                    max={55}
                    step={1}
                    toDisplay={units === "imperial" ? celsiusToFahrenheit : undefined}
                    fromDisplay={units === "imperial" ? fahrenheitToCelsius : undefined}
                    onChange={(v) => {
                      setTrackTemp(v)
                      setResult(null)
                    }}
                  />
                }
              >
                <Slider
                  value={[trackTemp]}
                  min={15}
                  max={55}
                  step={1}
                  onValueChange={(v) => {
                    setTrackTemp(v[0])
                    setResult(null)
                  }}
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-white/30">
                  <span>{units === "imperial" ? `${Math.round(celsiusToFahrenheit(15))}\u00B0` : "15\u00B0"}</span>
                  <span>{units === "imperial" ? `${Math.round(celsiusToFahrenheit(55))}\u00B0` : "55\u00B0"}</span>
                </div>
              </Control>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">Wet / Rain</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {wet ? "wet running" : "dry running"}
                  </p>
                </div>
                <Switch
                  checked={wet}
                  onCheckedChange={(v) => {
                    setWet(v)
                    setResult(null)
                  }}
                />
              </div>

              <Control
                label="Degradation Threshold"
                value={
                  <EditableValue
                    value={threshold}
                    suffix="s"
                    min={0.5}
                    max={4}
                    step={0.1}
                    decimals={1}
                    onChange={(v) => {
                      setThreshold(v)
                      setResult(null)
                    }}
                  />
                }
              >
                <Slider
                  value={[threshold]}
                  min={0.5}
                  max={4}
                  step={0.1}
                  onValueChange={(v) => {
                    setThreshold(v[0])
                    setResult(null)
                  }}
                />
                <p className="mt-1 font-mono text-[10px] text-white/30">lap-time falloff that defines a spent tire</p>
              </Control>

              <div>
                <p className="mb-3 text-sm font-semibold text-white/90">Compounds</p>
                <div className="flex flex-col gap-2">
                  {COMPOUND_ORDER.map((id) => {
                    const meta = COMPOUNDS[id]
                    const active = selected.includes(id)
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          toggleCompound(id)
                          setResult(null)
                        }}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                          active ? "border-white/30 bg-white/10" : "border-white/10 bg-transparent hover:bg-white/5"
                        }`}
                        aria-pressed={active}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className="h-3.5 w-3.5 rounded-full ring-1 ring-white/20"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className={`text-sm ${active ? "text-white" : "text-white/50"}`}>{meta.label}</span>
                        </span>
                        <span
                          className={`font-mono text-[10px] uppercase tracking-widest ${
                            active ? "text-white/60" : "text-white/25"
                          }`}
                        >
                          {active ? "on" : "off"}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={runModel}
                disabled={selected.length === 0 || running}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {running ? "Running model\u2026" : "Run Prediction"}
              </button>
            </div>

            {/* Results column */}
            <div className="min-h-[420px] px-6 py-6">
              <AnimatePresence mode="wait">
                {running ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full min-h-[380px] flex-col justify-center"
                  >
                    <ChartSkeleton slow={slow} />
                  </motion.div>
                ) : result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
                          source === "live"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-white/15 bg-white/[0.04] text-white/50"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${source === "live" ? "bg-emerald-400" : "bg-white/40"}`}
                        />
                        {source === "live" ? "Live model" : "Simulated preview"}
                      </span>
                      {source === "mock" && (
                        <span className="font-mono text-[10px] text-white/30">
                          {process.env.NEXT_PUBLIC_API_URL
                            ? "live API unreachable, showing mock output"
                            : "NEXT_PUBLIC_API_URL not set"}
                        </span>
                      )}
                    </div>

                    <DegradationChart result={result} />

                    {/* Tire life readouts */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      {result.compounds.map((c) => (
                        <CompoundResultCard
                          key={c.compound}
                          result={c}
                          maxLifeForScale={Math.max(
                            ...result.compounds.map((r) => (r.durable ? MAX_LAPS : (r.life_estimate_laps ?? 0))),
                          )}
                        />
                      ))}
                    </div>

                    {/* Analysis */}
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                        Strategy analysis
                      </p>
                      <div className="flex flex-col divide-y divide-white/5">
                        {insights.map((insight, i) => (
                          <div key={i} className={i === 0 ? "pb-4" : "py-4 last:pb-0"}>
                            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-red-400">
                              {insight.title}
                            </p>
                            <p className="text-sm leading-relaxed text-white/75">{insight.body}</p>
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
                    className="flex h-full min-h-[380px] flex-col items-center justify-center gap-3 text-center"
                  >
                    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
                      Awaiting input
                    </div>
                    <p className="max-w-xs text-sm text-white/50">
                      Set track conditions and compounds, then run the model to project tire degradation for this
                      circuit.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Control({ label, value, children }: { label: string; value: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white/90">{label}</p>
        <span className="font-mono text-sm text-white">{value}</span>
      </div>
      {children}
    </div>
  )
}

/**
 * A number that reads as plain text/mono value until clicked, at which
 * point it becomes a real numeric input so the exact figure can be typed
 * instead of only dragged. Commits on blur or Enter, cancels on Escape.
 */
function EditableValue({
  value,
  suffix = "",
  min,
  max,
  step,
  decimals = 0,
  onChange,
  toDisplay = (v) => v,
  fromDisplay = (v) => v,
}: {
  value: number
  suffix?: string
  min: number
  max: number
  step: number
  decimals?: number
  onChange: (value: number) => void
  /** Converts the internal (storage) value to what's shown/typed, e.g. C -> F. */
  toDisplay?: (value: number) => number
  /** Converts a typed display value back to the internal storage unit. */
  fromDisplay?: (value: number) => number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(toDisplay(value).toFixed(decimals))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(toDisplay(value).toFixed(decimals))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const parsed = Number.parseFloat(draft)
    if (!Number.isNaN(parsed)) {
      const internal = fromDisplay(parsed)
      const clamped = Math.min(max, Math.max(min, internal))
      const snapped = Math.round(clamped / step) * step
      onChange(Number(snapped.toFixed(decimals)))
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        min={toDisplay(min)}
        max={toDisplay(max)}
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          }
          if (e.key === "Escape") {
            setDraft(toDisplay(value).toFixed(decimals))
            setEditing(false)
          }
        }}
        className="w-16 rounded border border-red-400/50 bg-white/10 px-1.5 py-0.5 text-right font-mono text-sm text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded font-mono text-sm text-white decoration-white/25 decoration-dotted underline-offset-4 transition hover:text-white hover:decoration-white/70 underline"
      title="Click to type an exact value"
    >
      {toDisplay(value).toFixed(decimals)}
      {suffix}
    </button>
  )
}
