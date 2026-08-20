import type { Circuit } from "@/types/circuit"
import type {
  CompoundId,
  CompoundResult,
  CurvePoint,
  PredictionRequest,
  PredictionResponse,
} from "@/types/circuit"

/**
 * FIA compound metadata. Colours follow the real Pirelli/FIA sidewall system:
 * soft = red, medium = yellow, hard = white/silver.
 */
export const COMPOUNDS: Record<
  CompoundId,
  { id: CompoundId; label: string; color: string; grip: number; baseWear: number }
> = {
  SOFT: { id: "SOFT", label: "Soft", color: "#ef4444", grip: 1, baseWear: 0.055 },
  MEDIUM: { id: "MEDIUM", label: "Medium", color: "#eab308", grip: 0.7, baseWear: 0.032 },
  HARD: { id: "HARD", label: "Hard", color: "#e5e7eb", grip: 0.45, baseWear: 0.018 },
}

export const COMPOUND_ORDER: CompoundId[] = ["SOFT", "MEDIUM", "HARD"]

const MAX_LAPS = 40

/**
 * Deterministic mock of the scikit-learn Random Forest output.
 * Produces a lap-time-delta-vs-tire-age curve per compound, shaped by circuit
 * abrasiveness, track temperature and wet running. This mirrors the JSON data
 * contract so it can be swapped for the real API later.
 */
export function predictDegradation(circuit: Circuit, req: PredictionRequest): PredictionResponse {
  const compounds: CompoundResult[] = req.compounds.map((id) => buildCompound(circuit, req, id))

  return {
    circuit: circuit.name,
    track_temp_c: req.track_temp_c,
    wet: req.wet,
    threshold_s: req.threshold_s,
    compounds,
  }
}

function buildCompound(circuit: Circuit, req: PredictionRequest, id: CompoundId): CompoundResult {
  const meta = COMPOUNDS[id]

  // Temperature amplifies wear; abrasive tracks amplify it further.
  const tempFactor = 1 + Math.max(0, req.track_temp_c - 25) * 0.02
  const abrasionFactor = 0.7 + circuit.abrasiveness * 0.14
  // Wet running lowers temps and thermal deg, so wear drops noticeably.
  const wetFactor = req.wet ? 0.55 : 1

  const wearRate = meta.baseWear * tempFactor * abrasionFactor * wetFactor
  // Non-linearity: wear accelerates as the tyre ages (the "cliff").
  const cliff = meta.baseWear * 0.9

  // Sparse training data above 40C, and for softs in the wet.
  const highTemp = req.track_temp_c > 40
  const softInWet = req.wet && id === "SOFT"
  let warning: string | null = null
  if (highTemp) {
    warning = `Sparse training data above 40\u00B0C for ${meta.label} at ${circuit.name}`
  } else if (softInWet) {
    warning = `Limited wet-running samples for the ${meta.label} compound`
  }

  const curve: CurvePoint[] = []
  let life: number | null = null

  for (let lap = 1; lap <= MAX_LAPS; lap++) {
    const age = lap - 1
    // Linear wear + progressive thermal cliff, plus a gentle warm-up dip.
    const warmup = age < 2 ? -0.015 * (2 - age) : 0
    const delta = wearRate * age + cliff * Math.pow(age / MAX_LAPS, 2.4) * age + warmup

    const extrapolating = highTemp || age > 30 || (softInWet && age > 12)

    curve.push({
      tire_age_laps: lap,
      delta_s: Math.max(0, Number(delta.toFixed(3))),
      extrapolating,
    })

    if (life === null && delta >= req.threshold_s) {
      life = lap
    }
  }

  const durable = life === null

  return {
    compound: id,
    curve,
    life_estimate_laps: life,
    durable,
    warning,
  }
}

/**
 * Produces a short written analysis of a prediction, in the voice of a race
 * strategy engineer. Purely derived from the returned curves. Kept for
 * backwards compatibility / anywhere a flat string list is more convenient
 * than the richer structured insights below.
 */
export function analyzePrediction(circuit: Circuit, res: PredictionResponse): string[] {
  return buildStrategyInsights(circuit, res).map((i) => i.body)
}

export interface StrategyInsight {
  title: string
  body: string
}

/**
 * A much richer, structured set of insights than analyzePrediction's flat
 * bullet list -- covers degradation rate (not just life estimate), where
 * the "cliff" actually happens (not just that one exists), real pit-stop
 * math using the circuit's actual race distance, and temperature/wet
 * context, in addition to the confidence/abrasiveness notes that already
 * existed. Everything here is derived directly from the returned curves
 * and real circuit data (circuit.laps) -- no new assumptions beyond what
 * predictDegradation() / the live API already computed.
 */
export function buildStrategyInsights(circuit: Circuit, res: PredictionResponse): StrategyInsight[] {
  const insights: StrategyInsight[] = []
  if (res.compounds.length === 0) return insights

  const ranked = [...res.compounds].sort((a, b) => {
    const la = a.life_estimate_laps ?? Number.POSITIVE_INFINITY
    const lb = b.life_estimate_laps ?? Number.POSITIVE_INFINITY
    return lb - la
  })
  const longest = ranked[0]
  const shortest = ranked[ranked.length - 1]

  // 1. Headline: longest vs shortest (or just the one compound, if that's all that was run).
  if (longest && shortest && longest.compound !== shortest.compound) {
    const longLife = longest.durable ? `${MAX_LAPS}+` : longest.life_estimate_laps
    const shortLife = shortest.durable ? `${MAX_LAPS}+` : shortest.life_estimate_laps
    insights.push({
      title: "Headline",
      body: `At ${res.track_temp_c}\u00B0C${res.wet ? " in wet conditions" : ""}, ${COMPOUNDS[longest.compound].label} holds up longest (~${longLife} laps to the ${res.threshold_s.toFixed(1)}s threshold) versus ${COMPOUNDS[shortest.compound].label} at ~${shortLife} laps.`,
    })
  } else if (longest) {
    const life = longest.durable ? `${MAX_LAPS}+` : longest.life_estimate_laps
    insights.push({
      title: "Headline",
      body: `${COMPOUNDS[longest.compound].label} is projected to hold for ~${life} laps at ${res.track_temp_c}\u00B0C before crossing the ${res.threshold_s.toFixed(1)}s threshold.`,
    })
  }

  // 2. Average degradation rate -- a concrete number, not just "longer/shorter".
  if (res.compounds.length > 1) {
    const rates = res.compounds
      .map((c) => {
        const last = c.curve[c.curve.length - 1]
        const rate = last.delta_s / Math.max(1, last.tire_age_laps - 1)
        return { compound: c.compound, rate }
      })
      .sort((a, b) => a.rate - b.rate)
    const rateText = rates.map((r) => `${COMPOUNDS[r.compound].label} \u2248${r.rate.toFixed(3)}s/lap`).join(", ")
    insights.push({
      title: "Average degradation rate",
      body: `Averaged across the full ${MAX_LAPS}-lap sweep: ${rateText}. The real gap is concentrated later in the stint, not spread evenly \u2014 see the pace-cliff note below.`,
    })
  }

  // 3. Where the pace cliff actually happens, not just that one exists --
  // detected as the point where lap-to-lap wear roughly doubles versus the
  // opening laps of the stint.
  const cliffTarget = res.compounds.find((c) => c.compound === "SOFT") ?? shortest
  if (cliffTarget && cliffTarget.curve.length > 8) {
    const curve = cliffTarget.curve
    const earlyDiffs = curve.slice(1, 6).map((p, i) => p.delta_s - curve[i].delta_s)
    const avgEarly = earlyDiffs.reduce((a, b) => a + b, 0) / Math.max(1, earlyDiffs.length)
    let cliffLap: number | null = null
    for (let i = 6; i < curve.length; i++) {
      const diff = curve[i].delta_s - curve[i - 1].delta_s
      if (diff > Math.max(0.02, avgEarly * 2.2)) {
        cliffLap = curve[i].tire_age_laps
        break
      }
    }
    if (cliffLap) {
      insights.push({
        title: "Pace cliff",
        body: `${COMPOUNDS[cliffTarget.compound].label} shows lap-to-lap wear roughly double from around lap ${cliffLap} onward \u2014 a genuine cliff, not just gradual linear falloff.`,
      })
    }
  }

  // 4. Real pit-stop math using the circuit's actual race distance --
  // previously this data (circuit.laps) wasn't used in the analysis at all.
  if (circuit.laps) {
    const stopLines = res.compounds.map((c) => {
      if (c.durable) {
        return `${COMPOUNDS[c.compound].label} could in principle run the full ${circuit.laps}-lap distance on one set (wear alone never reaches the threshold)`
      }
      const life = c.life_estimate_laps ?? MAX_LAPS
      const stints = Math.ceil(circuit.laps / life)
      const stops = Math.max(0, stints - 1)
      return `${COMPOUNDS[c.compound].label} would need roughly ${stops} stop${stops === 1 ? "" : "s"} (~${stints} stint${stints === 1 ? "" : "s"} of ${life} laps) to cover ${circuit.laps} race laps`
    })
    insights.push({
      title: `Strategy for a ${circuit.laps}-lap race`,
      body: stopLines.join("; ") + ".",
    })
  }

  // 5. Temperature context.
  const baseline = 25
  if (res.track_temp_c > baseline + 5) {
    insights.push({
      title: "Temperature effect",
      body: `${res.track_temp_c}\u00B0C is ${(res.track_temp_c - baseline).toFixed(0)}\u00B0C above a mild baseline (~${baseline}\u00B0C) \u2014 thermal degradation is running meaningfully faster than a cool session would show for the same compounds.`,
    })
  } else if (res.track_temp_c < baseline - 5) {
    insights.push({
      title: "Temperature effect",
      body: `At ${res.track_temp_c}\u00B0C, track temperature is on the cooler side \u2014 expect degradation closer to the linear, low end of what these compounds show; a hotter session would degrade noticeably faster.`,
    })
  }

  // 6. Wet caveat.
  if (res.wet) {
    insights.push({
      title: "Wet running caveat",
      body: `These curves model wet conditions as reduced thermal wear on slick compounds, not a switch to Intermediate/Wet tyres \u2014 real wet-race strategy would use dedicated wet compounds, which this comparison doesn't cover.`,
    })
  }

  // 7. Circuit character (existing note, kept).
  if (circuit.abrasiveness >= 4) {
    insights.push({
      title: "Circuit character",
      body: `${circuit.venue} is a high-abrasion surface (${circuit.abrasiveness}/5) \u2014 thermal degradation dominates here and the softest compound pays the steepest price.`,
    })
  } else {
    insights.push({
      title: "Circuit character",
      body: `${circuit.venue} is relatively gentle on tyres (${circuit.abrasiveness}/5 abrasion) \u2014 expect wear to stay closer to linear across a stint rather than falling off a cliff.`,
    })
  }

  // 8. Confidence caveats -- now with a specific extrapolated-lap count per compound.
  const warned = res.compounds.filter((c) => c.warning)
  if (warned.length) {
    const detail = warned
      .map((c) => {
        const nExtrap = c.curve.filter((p) => p.extrapolating).length
        return `${COMPOUNDS[c.compound].label} (${nExtrap}/${c.curve.length} laps extrapolated)`
      })
      .join(", ")
    insights.push({
      title: "Confidence caveats",
      body: `Treat these with extra caution: ${detail}. These combinations are sparse in the training data, so the model has little real precedent to draw on.`,
    })
  } else {
    insights.push({
      title: "Confidence",
      body: `No extrapolation warnings for this query \u2014 every compound's prediction here is backed by a reasonable amount of real training data.`,
    })
  }

  return insights
}

/**
 * Short, plain-language read of a circuit's abrasiveness rating, used both
 * standalone (in the options panel, before a prediction has even run) and
 * inside the post-run analysis text.
 */
export function abrasivenessNote(circuit: Circuit): string {
  const level = circuit.abrasiveness
  if (level >= 5) return "Among the harshest surfaces on the calendar \u2014 expect a steep degradation cliff."
  if (level >= 4) return "High-abrasion surface \u2014 thermal wear dominates, especially on softer compounds."
  if (level === 3) return "Moderate wear \u2014 degradation builds steadily rather than falling off a cliff."
  if (level === 2) return "Kind on tyres \u2014 wear stays close to linear across a full stint."
  return "One of the gentlest surfaces in F1 \u2014 tyres barely fall off here."
}

export { MAX_LAPS }
