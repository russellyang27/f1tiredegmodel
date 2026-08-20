export type UnitSystem = "metric" | "imperial"

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9
}

export function kmToMiles(km: number): number {
  return km * 0.621371
}

/** Formats a Celsius value for display, converting if the unit system is imperial. */
export function formatTemp(celsius: number, units: UnitSystem): string {
  return units === "imperial" ? `${Math.round(celsiusToFahrenheit(celsius))}\u00B0F` : `${Math.round(celsius)}\u00B0C`
}

/** Formats a km distance for display, converting if the unit system is imperial. */
export function formatLength(km: number, units: UnitSystem): string {
  return units === "imperial" ? `${kmToMiles(km).toFixed(3)} mi` : `${km.toFixed(3)} km`
}
