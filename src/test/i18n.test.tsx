import { describe, it, expect } from 'vitest'
import { renderWithI18n, testSettings } from './helpers'
import { buildI18n, resolveLocale, LOCALES, localeDir } from '../i18n'
import { greetingFor } from '../Greeting'
import Clock from '../Clock'
import en from '../i18n/messages/en'
import es from '../i18n/messages/es'
import fr from '../i18n/messages/fr'
import de from '../i18n/messages/de'
import ja from '../i18n/messages/ja'
import zh from '../i18n/messages/zh'
import ar from '../i18n/messages/ar'
import he from '../i18n/messages/he'

/**
 * Language, direction and timezone.
 *
 * The i18n layer was already the strongest part of the app; these tests pin
 * the properties it relies on so a new language or a refactor can't silently
 * regress them.
 */

const CATALOGS = { en, es, fr, de, ja, zh, ar, he }

describe('message catalogs', () => {
  it('covers every declared locale', () => {
    for (const { tag } of LOCALES) {
      expect(Object.keys(CATALOGS)).toContain(tag)
    }
  })

  it('defines every English key in every translation, with matching arity', () => {
    const keys = Object.keys(en) as (keyof typeof en)[]

    for (const [tag, catalog] of Object.entries(CATALOGS)) {
      for (const key of keys) {
        const reference = en[key]
        const translated = (catalog as typeof en)[key]

        expect(translated, `${tag} is missing "${String(key)}"`).toBeDefined()
        expect(typeof translated, `${tag}.${String(key)} has the wrong type`).toBe(
          typeof reference
        )

        // A message function that dropped a parameter would silently render
        // the sentence without the value interpolated into it.
        if (typeof reference === 'function' && typeof translated === 'function') {
          expect(translated.length, `${tag}.${String(key)} takes the wrong number of arguments`)
            .toBe(reference.length)
        }
      }
    }
  })

  it('interpolates every argument it is given', () => {
    // A translation that forgot `${name}` would lose the user's data with no
    // type error, since the signature still matches.
    for (const [tag, catalog] of Object.entries(CATALOGS)) {
      const c = catalog as typeof en
      expect(c.salutationNamed('GREET', 'NAME'), `${tag}.salutationNamed`).toContain('NAME')
      expect(c.editNamed('THING'), `${tag}.editNamed`).toContain('THING')
      expect(c.deleteNamed('THING'), `${tag}.deleteNamed`).toContain('THING')
      expect(c.moveTitle('THING'), `${tag}.moveTitle`).toContain('THING')
      expect(c.treeNoMatches('QUERY'), `${tag}.treeNoMatches`).toContain('QUERY')
      expect(c.importedItems(3), `${tag}.importedItems`).toContain('3')
    }
  })
})

describe('locale resolution', () => {
  it('falls back through subtags', () => {
    expect(resolveLocale('pt-BR')).toBeNull()
    expect(resolveLocale('en-GB')).toBe('en')
    expect(resolveLocale('zh-Hans-CN')).toBe('zh')
    expect(resolveLocale('DE')).toBe('de')
    expect(resolveLocale('')).toBeNull()
    expect(resolveLocale(undefined)).toBeNull()
  })
})

describe('direction', () => {
  it('marks Arabic and Hebrew as RTL and the rest as LTR', () => {
    expect(localeDir('ar')).toBe('rtl')
    expect(localeDir('he')).toBe('rtl')
    for (const tag of ['en', 'es', 'fr', 'de', 'ja', 'zh']) {
      expect(localeDir(tag)).toBe('ltr')
    }
  })

  it('sets lang and dir on <html> so logical CSS and modals follow', () => {
    renderWithI18n(<Clock settings={testSettings()} onOpenSettings={() => {}} onImport={() => {}} onExport={() => {}} />, {
      locale: 'ar',
    })
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('returns to LTR when the language changes back', () => {
    const { unmount } = renderWithI18n(
      <Clock settings={testSettings()} onOpenSettings={() => {}} onImport={() => {}} onExport={() => {}} />,
      { locale: 'he' }
    )
    expect(document.documentElement.dir).toBe('rtl')
    unmount()

    renderWithI18n(<Clock settings={testSettings()} onOpenSettings={() => {}} onImport={() => {}} onExport={() => {}} />, {
      locale: 'ja',
    })
    expect(document.documentElement.dir).toBe('ltr')
  })
})

describe('timezone', () => {
  it('formats in the configured zone, not the machine zone', () => {
    const i18n = buildI18n('en', 'Asia/Tokyo')
    // 2026-01-01T00:00Z is 09:00 the same day in Tokyo.
    const parts = i18n.formatDateParts(new Date('2026-01-01T00:00:00Z'), {
      hour: 'numeric',
      hour12: false,
    })
    expect(parts.find((p) => p.type === 'hour')?.value).toBe('09')
  })

  it('survives a stored timezone this runtime does not know', () => {
    // A zone can be renamed or dropped between browser versions; every format
    // call passes `timeZone`, so an unusable value used to throw on each one.
    expect(() => buildI18n('en', 'Mars/Olympus_Mons')).not.toThrow()
    const i18n = buildI18n('en', 'Mars/Olympus_Mons')
    expect(() => i18n.formatDate(new Date(), { hour: 'numeric' })).not.toThrow()
  })

  it('names the zone in the reader language rather than as an IANA id', () => {
    const enZone = buildI18n('en', 'Asia/Tokyo').timeZoneName
    const jaZone = buildI18n('ja', 'Asia/Tokyo').timeZoneName
    // Never the raw id, and never a bare GMT offset.
    expect(enZone).not.toContain('Asia/')
    expect(enZone).not.toMatch(/^GMT/)
    expect(jaZone).not.toContain('Asia/')
  })

  it('derives hour12 from the locale rather than hardcoding it', () => {
    expect(buildI18n('en', 'America/New_York').hour12).toBe(true)
    expect(buildI18n('de', 'Europe/Berlin').hour12).toBe(false)
    expect(buildI18n('ja', 'Asia/Tokyo').hour12).toBe(false)
  })
})

describe('greeting', () => {
  const at = (iso: string, locale = 'en', tz = 'UTC') => {
    const i18n = buildI18n(locale, tz)
    return greetingFor(new Date(iso), i18n.t, i18n.formatDateParts)
  }

  it('follows the hour in the displayed zone, not the browser zone', () => {
    // 03:00 UTC is midday in Tokyo — the greeting must match the clock shown.
    expect(at('2026-01-01T03:00:00Z', 'en', 'Asia/Tokyo')).toBe(en.greetingAfternoon)
    expect(at('2026-01-01T03:00:00Z', 'en', 'UTC')).toBe(en.greetingNight)
  })

  it('picks the right band across the day', () => {
    expect(at('2026-01-01T02:00:00Z')).toBe(en.greetingNight)
    expect(at('2026-01-01T08:00:00Z')).toBe(en.greetingMorning)
    expect(at('2026-01-01T13:00:00Z')).toBe(en.greetingAfternoon)
    expect(at('2026-01-01T19:00:00Z')).toBe(en.greetingEvening)
    expect(at('2026-01-01T23:00:00Z')).toBe(en.greetingNight)
  })

  it('handles a locale whose midnight is hour 24, and non-ASCII digits', () => {
    // An h24 locale renders midnight as 24, which must read as the small hours
    // rather than falling off the end of the bands.
    expect(at('2026-01-01T00:30:00Z', 'ja', 'UTC')).toBe(ja.greetingNight)
    // Arabic may render digits as Arabic-Indic; parsing must still work.
    expect(at('2026-01-01T08:00:00Z', 'ar', 'UTC')).toBe(ar.greetingMorning)
  })
})

describe('clock rendering', () => {
  it('gives the time one readable sentence instead of per-character tiles', () => {
    const { container } = renderWithI18n(
      <Clock settings={testSettings()} onOpenSettings={() => {}} onImport={() => {}} onExport={() => {}} />
    )
    // The flip board is decorative; a visually-hidden sentence carries the
    // time. It is real text rather than an `aria-label`, because `aria-label`
    // is prohibited on a <p> and would simply be discarded.
    const sentence = container.querySelector('.sr-only')
    expect(sentence?.textContent).toMatch(/It is .+/)
  })

  it('reads the clock exactly once, with the visible pieces hidden', () => {
    const { container } = renderWithI18n(
      <Clock settings={testSettings()} onOpenSettings={() => {}} onImport={() => {}} onExport={() => {}} />
    )
    const paragraph = container.querySelector('p')
    // Everything except the sr-only sentence is aria-hidden, so the time is
    // announced once rather than twice.
    const visible = [...(paragraph?.children ?? [])].filter(
      (el) => !el.classList.contains('sr-only')
    )
    expect(visible.length).toBeGreaterThan(0)
    for (const el of visible) {
      expect(el).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('never puts the clock in a live region', () => {
    renderWithI18n(<Clock settings={testSettings()} onOpenSettings={() => {}} onImport={() => {}} onExport={() => {}} />)
    // A per-second live region would announce the time endlessly and drown
    // out the rest of the page.
    expect(document.querySelector('[aria-live]')).toBeNull()
  })

  it('hides the decorative tile board from assistive tech', () => {
    const { container } = renderWithI18n(
      <Clock settings={testSettings()} onOpenSettings={() => {}} onImport={() => {}} onExport={() => {}} />
    )
    const board = container.querySelector('.split-flap-text')
    expect(board).toHaveAttribute('aria-hidden', 'true')
    // The retired `role="text"` is not a real ARIA role.
    expect(board).not.toHaveAttribute('role', 'text')
  })
})
