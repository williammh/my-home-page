# Languages

The app is fully internationalized: every user-facing string comes from a
message catalog, and all dates, times, numbers and time-zone names are
formatted through `Intl` using the active locale.

**Shipped:** English, Spanish, French, German, Japanese, Chinese, Arabic,
Hebrew (`messages/`). The non-English catalogs were machine-translated and
have **not** been reviewed by native speakers — corrections welcome, and each
one is a single self-contained file.

# Adding a language

Adding another is one file plus one line.

## 1. Translate the catalog

Copy `messages/en.ts` to `messages/<tag>.ts`, where `<tag>` is the BCP 47 tag
already listed in `locales.ts` (`de`, `ja`, `ar`, …).

Translate the **values**, never the keys:

```ts
import type { Messages } from './en'

const de: Messages = {
  greetingMorning: 'Guten Morgen',
  // …every other key
}

export default de
```

The `Messages` type is derived from the English catalog, so a missing key — or
one that doesn't exist — is a **compile error**, not a string that silently
renders in English. `npx tsc -b` tells you exactly what's missing.

## 2. Register it

In `index.ts`, import the catalog and add it to `CATALOGS`:

```ts
import de from './messages/de'

const CATALOGS: Partial<Record<string, Messages>> = { en, de }
```

That's all. The language already appears in the settings picker (the picker is
driven by `LOCALES`, not by `CATALOGS`), and it is autodetected from the
browser for users whose system is set to it.

A locale listed in `locales.ts` but missing from `CATALOGS` still formats
dates and times correctly — only its UI text falls back to English.

## Notes for translators

**Some entries are functions.** Anything that interpolates a value or has a
plural form is a function, so each language decides its own word order and
plural rules rather than having English's imposed on it:

```ts
importedItems: (n: number) => `Imported ${n} ${n === 1 ? 'item' : 'items'}.`,
```

Languages needing more than two plural forms should use `Intl.PluralRules`:

```ts
const pr = new Intl.PluralRules('ru')
importedItems: (n) => {
  const forms = { one: 'элемент', few: 'элемента', many: 'элементов', other: 'элемента' }
  return `Импортировано ${n} ${forms[pr.select(n)]}.`
},
```

**Whole sentences, not fragments.** `salutationNamed(greeting, name)` returns
the entire salutation so a language can reorder it, add particles, or
punctuate differently. Note that `Clock.tsx` emphasizes the name by finding its
**last** occurrence in the returned sentence — if your language puts the name
first, that still works, as long as the name appears literally.

**The clock sentence is split around the flip tiles.** `clockBefore` renders
before the animated time, `clockAfter` after it. If your language needs the
time earlier in the sentence, return `''` from `clockBefore` and put the whole
sentence in `clockAfter` (or vice versa).

**Don't translate date formats.** `dateFormats.ts` holds `Intl` option sets,
not patterns — field order, month names and separators all come from the
locale automatically.

**Don't translate time-zone names either.** `clockAfter` receives a zone name
already localized by `Intl` ("Eastern Time", „Mitteleuropäische Zeit",
"שעון ישראל"). It is self-describing, so it needs no preposition — several
catalogs simply parenthesize it.

## Right-to-left

`ar` and `he` are marked `dir: 'rtl'` in `locales.ts`, which sets `dir` on
`<html>`. The layout uses CSS logical properties throughout (`ms-`/`me-`,
`ps-`/`pe-`, `start-`/`end-`, `paddingInlineStart`, `insetInlineStart`), so it
mirrors on its own — including the bookmark tree's indentation and guide lines.

If you add a new RTL language, no layout work should be needed. If you add
markup, use the logical utilities rather than `ml-`/`pl-`/`left-`.
