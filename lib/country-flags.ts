/** Maps this app's country names to ISO 3166-1 alpha-2 codes for country-flag-icons. */
const ISO_CODES: Record<string, string> = {
  Monaco: "MC",
  Belgium: "BE",
  Japan: "JP",
  Singapore: "SG",
  Austria: "AT",
  "United Kingdom": "GB",
  Italy: "IT",
  Brazil: "BR",
  Netherlands: "NL",
  Qatar: "QA",
  "United Arab Emirates": "AE",
  Bahrain: "BH",
  "Saudi Arabia": "SA",
  "United States": "US",
  Azerbaijan: "AZ",
}

/** ISO alpha-2 code for a circuit's country, or null if unmapped. */
export function countryIsoCode(country: string): string | null {
  return ISO_CODES[country] ?? null
}
