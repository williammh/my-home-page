import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import en, { type Messages } from './messages/en'
import es from './messages/es'
import fr from './messages/fr'
import de from './messages/de'
import ja from './messages/ja'
import zh from './messages/zh'
import ar from './messages/ar'
import he from './messages/he'
import { DEFAULT_LOCALE, detectLocale, localeDir, resolveLocale } from './locales'

export * from './locales'
export type { Messages }

/**
 * Message catalogs by locale tag.
 *
 * A language is added by importing its catalog and adding it here. Catalogs
 * are imported statically rather than lazily: the whole app builds to a single
 * inlined HTML file (see vite.config.ts), so there's no separate chunk for a
 * dynamic import to fetch — the page is often opened from a `file://` path
 * with no server at all.
 *
 * Any locale listed in LOCALES but absent here falls back to English text
 * while still formatting dates, times and numbers in that locale.
 */
const CATALOGS: Partial<Record<string, Messages>> = {
  en, es, fr, de, ja, zh, ar, he,
}

export interface I18n {
  /** The resolved locale tag actually in use (never 'system'). */
  locale: string
  /** Writing direction for `locale`. */
  dir: 'ltr' | 'rtl'
  /** Message catalog — English for any locale without one. */
  t: Messages
  /** Locale-aware date/time formatting, memoized per locale + timezone. */
  formatDate: (date: Date, options: Intl.DateTimeFormatOptions) => string
  /** Parts of a formatted date/time, for pulling out a single field. */
  formatDateParts: (date: Date, options: Intl.DateTimeFormatOptions) => Intl.DateTimeFormatPart[]
  /** True when the locale's clock is 24-hour, so no AM/PM should be shown. */
  hour12: boolean
  /**
   * The timezone's name in the current language — "New York time" reads as
   * «توقيت نيويورك» in Arabic and „שעון ניו יורק" in Hebrew.
   *
   * The IANA id ("Asia/Tokyo") is not localized data, so showing its last
   * segment left a Latin city name sitting inside otherwise fully translated
   * text — and in Hebrew produced "בJerusalem", with the prefix ב glued to a
   * Latin word.
   */
  timeZoneName: string
}

const I18nContext = createContext<I18n | null>(null)

/**
 * Build the i18n value for a locale setting and timezone.
 *
 * `setting` is the stored preference, where 'system' (the default) means
 * "follow the browser". Kept separate from the resolved tag so that changing
 * the OS language moves the app with it, rather than freezing whatever was
 * detected the first time the page was opened.
 */
export function buildI18n(setting: string, timeZone: string): I18n {
  const locale = setting === 'system' ? detectLocale() : resolveLocale(setting) ?? DEFAULT_LOCALE
  const t = CATALOGS[locale] ?? en

  // `Intl.DateTimeFormat` construction is the expensive part, not `format`, so
  // formatters are cached per options shape and reused across ticks — the
  // clock re-renders every second.
  const cache = new Map<string, Intl.DateTimeFormat>()
  const formatter = (options: Intl.DateTimeFormatOptions) => {
    const key = JSON.stringify(options)
    let f = cache.get(key)
    if (!f) {
      f = new Intl.DateTimeFormat(locale, { ...options, timeZone })
      cache.set(key, f)
    }
    return f
  }

  // Whether this locale uses a 12-hour clock, asked of Intl rather than kept
  // as a list: `hourCycle` is per-locale data that only Intl knows, and the
  // answer differs between locales sharing a language (en-US vs en-GB).
  const resolved = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions()
  const hour12 = resolved.hour12 ?? false

  // The zone has to be *named in the reader's language*: the IANA id is not
  // localized data, so its last segment ("Jerusalem") left a Latin word inside
  // otherwise fully translated text — and in Hebrew produced "בJerusalem",
  // with the prefix ב glued onto it.
  //
  // `longGeneric` is what's used, because it reads as a natural phrase
  // ("Eastern Time", „Mitteleuropäische Zeit", "שעון ישראל"). `shortGeneric`
  // is only a fallback for the handful of names long enough to break the
  // clock's single line: it abbreviates well in some locales ("MEZ") but in
  // others exposes a raw CLDR pattern — French renders Paris as
  // "heure : New York" — so the less it's reached, the better. Both are
  // generic rather than standard/daylight forms, so the label doesn't flip
  // across a DST boundary.
  const zoneName = (style: 'longGeneric' | 'shortGeneric') => {
    try {
      const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style })
        .formatToParts(new Date())
      const named = parts.find((p) => p.type === 'timeZoneName')?.value
      // A runtime that doesn't support the generic styles silently yields an
      // offset ("GMT+9"), which says less than the city name — reject it so
      // the fallback below applies.
      return named && !/^(GMT|UTC)/i.test(named) ? named : null
    } catch {
      return null
    }
  }

  // Fallback is the id's last segment — untranslated, but the only thing left
  // if this runtime supports neither generic style.
  //
  // 40 rather than something tighter: measured across every supported locale
  // and IANA zone, a 24-char budget pushed 19% of combinations to the short
  // form (Paris in French among them), while 40 pushes 0.2% — only genuine
  // outliers like „heure des Terres australes et antarctiques françaises".
  const MAX_ZONE_NAME = 40
  const long = zoneName('longGeneric')
  const timeZoneName =
    (long && long.length <= MAX_ZONE_NAME ? long : null) ??
    zoneName('shortGeneric') ??
    long ??
    (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ')

  return {
    locale,
    dir: localeDir(locale),
    t,
    formatDate: (date, options) => formatter(options).format(date),
    formatDateParts: (date, options) => formatter(options).formatToParts(date),
    hour12,
    timeZoneName,
  }
}

export function I18nProvider({
  locale,
  timeZone,
  children,
}: {
  locale: string
  timeZone: string
  children: ReactNode
}) {
  const value = useMemo(() => buildI18n(locale, timeZone), [locale, timeZone])

  // `lang` and `dir` belong on the document element, not on a wrapper div:
  // they drive the browser's own hyphenation, quotation marks, font fallback
  // and — for `dir` — the direction of every logical CSS property in the page,
  // including the modals, which portal outside the app's DOM subtree.
  useEffect(() => {
    document.documentElement.lang = value.locale
    document.documentElement.dir = value.dir
  }, [value.locale, value.dir])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used within an I18nProvider')
  return value
}
