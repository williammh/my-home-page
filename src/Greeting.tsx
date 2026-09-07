import type { Messages } from './i18n'

/**
 * The salutation is derived from the hour in the *displayed* timezone, not the
 * browser's — the clock below it reads in that zone, so a greeting from a
 * different one would contradict it.
 *
 * The hour is read through `formatDateParts` with an explicit `hour12: false`
 * rather than the locale's own clock: this is arithmetic, not display, and a
 * locale on a 12-hour clock would otherwise report 9 for both 09:00 and 21:00.
 */
export function greetingFor(
  now: Date,
  t: Messages,
  formatDateParts: (date: Date, options: Intl.DateTimeFormatOptions) => Intl.DateTimeFormatPart[]
) {
  const parts = formatDateParts(now, { hour: 'numeric', hour12: false })
  // `formatToParts` rather than parsing a formatted string: some locales
  // render the hour with non-ASCII digits (Arabic-Indic, say), which `Number`
  // on the whole string would turn into NaN.
  const raw = parts.find((p) => p.type === 'hour')?.value ?? '0'
  // Normalize any locale's digits to ASCII before parsing.
  const hour = Number(raw.replace(/\p{Nd}/gu, (d) => String(Number(d))))

  // A 24-hour clock renders midnight as either 0 or 24 depending on the
  // locale's hourCycle (h23 vs h24); treat both as the small hours.
  const h = hour === 24 ? 0 : hour
  if (h < 5) return t.greetingNight
  if (h < 12) return t.greetingMorning
  if (h < 17) return t.greetingAfternoon
  if (h < 22) return t.greetingEvening
  return t.greetingNight
}
