import type { Circuit, PredictionRequest, PredictionResponse } from "@/types/circuit"
import { predictDegradation } from "./tire-model"

/**
 * Base URL of the live FastAPI model server, e.g. http://localhost:8000.
 * Set NEXT_PUBLIC_API_URL in .env.local to point this at your real backend
 * (see api/main.py). Leave it unset to run entirely on the mock model.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL

export type PredictionSource = "live" | "mock"

export interface PredictionResult {
  data: PredictionResponse
  source: PredictionSource
  /** Populated when the live API was configured but the call failed. */
  error?: string
}

/**
 * Requests a tire-degradation prediction. Tries the live model API first
 * (when NEXT_PUBLIC_API_URL is set); falls back to the deterministic mock
 * on any failure so the UI never dead-ends. The returned `source` field lets
 * the UI honestly label which one produced the result.
 */
export async function getPrediction(circuit: Circuit, req: PredictionRequest): Promise<PredictionResult> {
  if (!API_URL) {
    return { data: predictDegradation(circuit, req), source: "mock" }
  }

  try {
    const res = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      // Keep this reasonably tight — a Random Forest inference over a
      // 40-lap sweep per compound should be fast; don't hang the UI.
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      throw new Error(`API responded ${res.status}`)
    }

    const data = (await res.json()) as PredictionResponse
    return { data, source: "live" }
  } catch (err) {
    console.warn("[tire-model] live API call failed, falling back to mock:", err)
    return {
      data: predictDegradation(circuit, req),
      source: "mock",
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
