// The languages the UI is prepared for. Each entry pairs a BCP 47 tag with the
// language's own name — a picker that lists "German" to someone who only reads
// German is no better than no picker, so the endonym is what's shown.
//
// `dir` drives the `dir` attribute on <html>; see `useLocale`. Adding a
// language means adding a row here and a catalog in ./messages — nothing else
// in the app hardcodes this list.
export interface LocaleMeta {
  /** BCP 47 tag, passed straight to Intl. */
  tag: string
  /** The language's name in that language. */
  endonym: string
  /** Writing direction, for the <html dir> attribute. */
  dir: 'ltr' | 'rtl'
}

export const LOCALES: LocaleMeta[] = [
  { tag: 'en', endonym: 'English', dir: 'ltr' },
  { tag: 'es', endonym: 'Español', dir: 'ltr' },
  { tag: 'fr', endonym: 'Français', dir: 'ltr' },
  { tag: 'de', endonym: 'Deutsch', dir: 'ltr' },
  { tag: 'ja', endonym: '日本語', dir: 'ltr' },
  { tag: 'zh', endonym: '中文', dir: 'ltr' },
  { tag: 'ar', endonym: 'العربية', dir: 'rtl' },
  { tag: 'he', endonym: 'עברית', dir: 'rtl' },
]

export const DEFAULT_LOCALE = 'en'

const BY_TAG = new Map(LOCALES.map((l) => [l.tag, l]))

/**
 * Best supported locale for a BCP 47 tag, by progressively dropping subtags:
 * `pt-BR` → `pt`, `zh-Hans-CN` → `zh-Hans` → `zh`. Returns null if nothing
 * matches, so callers can decide whether to fall back or keep what they have.
 *
 * Matching is done here rather than with `Intl.LocaleMatcher` because that
 * isn't available across the browsers this page is opened in, and the lookup
 * is small enough not to warrant a dependency.
 */
export function resolveLocale(tag: string | undefined | null): string | null {
  if (!tag) return null
  const normalized = tag.trim().toLowerCase()
  if (!normalized) return null
  const parts = normalized.split('-')
  for (let i = parts.length; i > 0; i--) {
    const candidate = parts.slice(0, i).join('-')
    const hit = BY_TAG.get(candidate)
    if (hit) return hit.tag
  }
  return null
}

/**
 * The locale to use when the user hasn't chosen one: the first of the
 * browser's preferred languages the app actually supports.
 *
 * `navigator.languages` is the ordered preference list from the OS/browser
 * language settings, so someone whose system is set to French gets French
 * without touching settings. It falls through to `navigator.language` (older
 * browsers) and finally English.
 */
export function detectLocale(): string {
  const candidates =
    typeof navigator === 'undefined'
      ? []
      : [...(navigator.languages ?? []), navigator.language]
  for (const candidate of candidates) {
    const hit = resolveLocale(candidate)
    if (hit) return hit
  }
  return DEFAULT_LOCALE
}

export function localeMeta(tag: string): LocaleMeta {
  return BY_TAG.get(tag) ?? BY_TAG.get(DEFAULT_LOCALE)!
}

export function localeDir(tag: string): 'ltr' | 'rtl' {
  return localeMeta(tag).dir
}
