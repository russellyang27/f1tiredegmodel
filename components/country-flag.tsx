import * as Flags from "country-flag-icons/react/3x2"
import { countryIsoCode } from "@/lib/country-flags"

interface CountryFlagProps {
  country: string
  className?: string
}

/**
 * Renders a real SVG flag instead of an emoji flag. Emoji flags render as
 * plain two-letter codes on Windows (no flag glyphs in most fonts there),
 * so this is the reliable cross-platform version.
 */
export function CountryFlag({ country, className = "" }: CountryFlagProps) {
  const code = countryIsoCode(country)
  if (!code) return null

  const FlagComponent = (Flags as unknown as Record<string, React.ComponentType<{ title?: string; className?: string }>>)[code]
  if (!FlagComponent) return null

  return (
    <FlagComponent
      title={country}
      className={`inline-block h-[0.75em] w-auto rounded-[1.5px] ring-1 ring-white/15 ${className}`}
    />
  )
}
