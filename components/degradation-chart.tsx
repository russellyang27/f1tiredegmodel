"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { COMPOUNDS } from "@/lib/tire-model"
import type { PredictionResponse } from "@/types/circuit"

interface DegradationChartProps {
  result: PredictionResponse
}

interface Row {
  lap: number
  [key: string]: number | null
}

export function DegradationChart({ result }: DegradationChartProps) {
  const maxLap = result.compounds[0]?.curve.length ?? 40

  // Build merged rows. For each compound we emit a solid series (measured region)
  // and a dashed series (extrapolated region). The dashed series also carries the
  // last measured point so the two segments join seamlessly.
  const rows: Row[] = []
  for (let i = 0; i < maxLap; i++) {
    const row: Row = { lap: i + 1 }
    result.compounds.forEach((c) => {
      const point = c.curve[i]
      const solidKey = `${c.compound}_solid`
      const extKey = `${c.compound}_ext`
      const prevExtrapolating = i > 0 ? c.curve[i - 1].extrapolating : false

      if (!point.extrapolating) {
        row[solidKey] = point.delta_s
        row[extKey] = null
      } else {
        row[solidKey] = null
        row[extKey] = point.delta_s
      }
      // Bridge: first extrapolating point after a measured one gets a solid value too.
      if (point.extrapolating && !prevExtrapolating && i > 0) {
        row[solidKey] = point.delta_s
      }
    })
    rows.push(row)
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 12, right: 16, bottom: 8, left: -8 }}>
          <defs>
            {result.compounds.map((c) => {
              const color = COMPOUNDS[c.compound].color
              return (
                <linearGradient key={c.compound} id={`fill-${c.compound}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              )
            })}
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="lap"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            label={{
              value: "TIRE AGE (LAPS)",
              position: "insideBottom",
              offset: -2,
              fill: "rgba(255,255,255,0.35)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: 2,
            }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickFormatter={(v) => `+${v}`}
            width={48}
            label={{
              value: "\u0394 LAP (S)",
              angle: -90,
              position: "insideLeft",
              offset: 18,
              fill: "rgba(255,255,255,0.35)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: 2,
            }}
          />
          <ReferenceLine
            y={result.threshold_s}
            stroke="rgba(255,255,255,0.5)"
            strokeDasharray="4 4"
            label={{
              value: `THRESHOLD ${result.threshold_s.toFixed(1)}s`,
              fill: "rgba(255,255,255,0.55)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              position: "insideTopRight",
            }}
          />
          <Tooltip content={<TelemetryTooltip threshold={result.threshold_s} />} />

          {result.compounds.flatMap((c) => {
            const color = COMPOUNDS[c.compound].color
            return [
              <Area
                key={`${c.compound}_solid`}
                type="monotone"
                dataKey={`${c.compound}_solid`}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#fill-${c.compound})`}
                dot={false}
                connectNulls
                isAnimationActive
                animationDuration={700}
              />,
              <Area
                key={`${c.compound}_ext`}
                type="monotone"
                dataKey={`${c.compound}_ext`}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.7}
                fill="transparent"
                dot={false}
                connectNulls
                isAnimationActive
                animationDuration={700}
              />,
            ]
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function TelemetryTooltip({
  active,
  payload,
  label,
  threshold,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | null }>
  label?: number
  threshold: number
}) {
  if (!active || !payload?.length) return null

  // Collapse the solid/ext pair into one value per compound.
  const seen = new Map<string, number>()
  payload.forEach((p) => {
    if (p.value == null) return
    const compound = p.dataKey.replace(/_solid|_ext/, "")
    seen.set(compound, p.value)
  })

  return (
    <div className="rounded-lg border border-white/15 bg-[#0d0d10]/95 px-3 py-2 font-mono text-xs shadow-xl backdrop-blur">
      <p className="mb-1.5 text-[10px] uppercase tracking-widest text-white/50">Lap {label}</p>
      <div className="flex flex-col gap-1">
        {Array.from(seen.entries()).map(([compound, value]) => (
          <div key={compound} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: COMPOUNDS[compound as keyof typeof COMPOUNDS].color }}
              />
              <span className="text-white/70">{COMPOUNDS[compound as keyof typeof COMPOUNDS].label}</span>
            </span>
            <span className={value >= threshold ? "text-red-400" : "text-white"}>+{value.toFixed(3)}s</span>
          </div>
        ))}
      </div>
    </div>
  )
}
