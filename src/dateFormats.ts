// Named date-format presets, used by the Clock and its settings modal.
export const DATE_FORMATS: Record<string, { label: string; options: Intl.DateTimeFormatOptions }> = {
  long: { label: 'Friday, January 1, 2026', options: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } },
  medium: { label: 'Jan 1, 2026', options: { year: 'numeric', month: 'short', day: 'numeric' } },
  short: { label: '1/1/2026', options: { year: 'numeric', month: 'numeric', day: 'numeric' } },
  weekdayShort: { label: 'Fri, Jan 1', options: { weekday: 'short', month: 'short', day: 'numeric' } },
}

export const DEFAULT_DATE_FORMAT = 'long'
