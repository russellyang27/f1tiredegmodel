export interface Circuit {
  id: number
  /** Circuit identifier used by the model (e.g. "Spielberg") */
  name: string
  /** Display name of the venue */
  venue: string
  country: string
  image: string
  /** Circuit length in km */
  lengthKm: number
  corners: number
  /** Race distance in laps (current F1 calendar) */
  laps: number
  /** Baseline lap record, formatted string for the telemetry readout */
  lapRecord: string
  /** Abrasiveness rating 1-5, drives model behaviour */
  abrasiveness: number
}

export type CompoundId = "SOFT" | "MEDIUM" | "HARD"

export interface CurvePoint {
  tire_age_laps: number
  delta_s: number
  extrapolating: boolean
}

export interface CompoundResult {
  compound: CompoundId
  curve: CurvePoint[]
  life_estimate_laps: number | null
  durable: boolean
  warning: string | null
}

export interface PredictionRequest {
  circuit: string
  track_temp_c: number
  wet: boolean
  threshold_s: number
  compounds: CompoundId[]
}

export interface PredictionResponse {
  circuit: string
  track_temp_c: number
  wet: boolean
  threshold_s: number
  compounds: CompoundResult[]
}
