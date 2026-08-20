import { COMPOUNDS, MAX_LAPS } from "@/lib/tire-model"
import { CountUp } from "./count-up"
import type { CompoundResult } from "@/types/circuit"

interface CompoundResultCardProps {
  result: CompoundResult
  /** Longest life among the compounds being shown together, so bar lengths are relative to each other, not just to MAX_LAPS. */
  maxLifeForScale: number
}

export function CompoundResultCard({ result: c, maxLifeForScale }: CompoundResultCardProps) {
  const meta = COMPOUNDS[c.compound]
  const life = c.durable ? MAX_LAPS : (c.life_estimate_laps ?? 0)
  const barPct = Math.max(6, Math.min(100, (life / Math.max(1, maxLifeForScale)) * 100))

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full ring-1 ring-white/20" style={{ backgroundColor: meta.color }} />
        <span className="text-sm font-semibold text-white/90">{meta.label}</span>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold text-white">
        <CountUp value={life} />
        {c.durable && "+"}
        <span className="ml-1 text-xs font-normal text-white/40">laps</span>
      </p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        {c.durable ? "stays under threshold" : "tire life estimate"}
      </p>

      {/* Relative life-estimate bar — length scales against the longest-lasting compound shown */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barPct}%`, backgroundColor: meta.color }}
        />
      </div>

      {c.warning && (
        <p className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-amber-300">
          {"\u26A0 "}
          {c.warning}
        </p>
      )}
    </div>
  )
}
