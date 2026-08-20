"use client"

import { motion } from "framer-motion"

/**
 * Mirrors DegradationChart's actual layout (axes, gridlines, threshold line)
 * so the loading state reads as "data arriving" rather than "please wait" —
 * three faint curves sweep in and pulse while the real prediction resolves.
 */
export function ChartSkeleton({ slow = false }: { slow?: boolean }) {
  return (
    <div className="flex h-[320px] w-full flex-col">
      <svg viewBox="0 0 600 280" className="h-full w-full" preserveAspectRatio="none">
        {/* gridlines */}
        {[40, 90, 140, 190, 240].map((y) => (
          <line key={y} x1={40} y1={y} x2={580} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {/* axes */}
        <line x1={40} y1={240} x2={580} y2={240} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <line x1={40} y1={30} x2={40} y2={240} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        {/* threshold ghost line */}
        <line x1={40} y1={90} x2={580} y2={90} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" strokeWidth={1} />

        {[
          { d: "M40,225 C 200,210 380,150 580,60", color: "#ef4444", delay: 0 },
          { d: "M40,232 C 200,222 380,190 580,120", color: "#eab308", delay: 0.15 },
          { d: "M40,236 C 200,231 380,215 580,175", color: "#e5e7eb", delay: 0.3 },
        ].map((line) => (
          <motion.path
            key={line.color}
            d={line.d}
            fill="none"
            stroke={line.color}
            strokeWidth={2.5}
            strokeOpacity={0.55}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.55 }}
            transition={{
              pathLength: { duration: 1.1, delay: line.delay, ease: "easeInOut" },
              opacity: { duration: 0.3, delay: line.delay },
            }}
          />
        ))}

        {/* sweeping scan line */}
        <motion.rect
          y={20}
          width={26}
          height={220}
          fill="url(#scan-gradient)"
          initial={{ x: 40 }}
          animate={{ x: 560 }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
        <defs>
          <linearGradient id="scan-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mt-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/40">
            {slow ? "Waking up the model server" : "Inferring degradation curves"}
          </p>
        </div>
        {slow && (
          <p className="max-w-xs text-center font-mono text-[10px] leading-relaxed text-white/30">
            First request after a while idle can take up to a minute {"\u2014"} the free-tier host has to
            fully restart, not just recompute.
          </p>
        )}
      </div>
    </div>
  )
}
