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
 *
 * Timeout is intentionally generous (50s), not just "a bit longer than
 * inference should take": free-tier hosts like Render spin the service down
 * after ~15 minutes idle, and a full cold boot (container starting from
 * scratch, not just the model refitting) can itself take 30-60+ seconds.
 * An 8s timeout meant most first-requests-after-idle never even reached a
 * running instance -- the browser gave up before the container finished
 * booting, which is indistinguishable from a real failure without digging
 * into server logs. `onSlow` lets the caller show a "waking up" message
 * once it's clear this is a slow-start, not an instant response.
 */
export async function getPrediction(
  circuit: Circuit,
  req: PredictionRequest,
  options?: { onSlow?: () => void },
): Promise<PredictionResult> {
  if (!API_URL) {
    return { data: predictDegradation(circuit, req), source: "mock" }
  }

  const slowTimer = options?.onSlow ? setTimeout(options.onSlow, 4000) : null

  try {
    const res = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(50000),
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
  } finally {
    if (slowTimer) clearTimeout(slowTimer)
  }
}
