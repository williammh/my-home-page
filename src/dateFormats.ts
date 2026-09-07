// Named date-format presets, used by the Clock and its settings modal.
//
// A preset is a set of `Intl.DateTimeFormatOptions`, never a literal pattern:
// the same preset renders "Friday, January 1, 2026" in English, "vendredi
// 1 janvier 2026" in French and "2026年1月1日金曜日" in Japanese, with the
// field order, separators and names all coming from the locale rather than
// from us.
export const DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  medium: { year: 'numeric', month: 'short', day: 'numeric' },
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  weekdayShort: { weekday: 'short', month: 'short', day: 'numeric' },
}

export const DEFAULT_DATE_FORMAT = 'long'

/** Options for a preset key, falling back to the default for an unknown key. */
export function dateFormatOptions(key: string): Intl.DateTimeFormatOptions {
  return DATE_FORMATS[key] ?? DATE_FORMATS[DEFAULT_DATE_FORMAT]
}

/**
 * A sample date for the settings picker.
 *
 * The options themselves are the only honest label — "1/1/2026" would be
 * wrong for most of the world — so each option shows the *current* date
 * rendered in that preset, in the user's locale. Picking a fixed sample date
 * would mean showing a weekday that doesn't match today.
 */
export const DATE_FORMAT_KEYS = Object.keys(DATE_FORMATS)
