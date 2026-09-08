import { useState, useEffect, useRef, useId, type ReactNode, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ICON_KEYS, getIcon } from './icons'
import { Button } from '@/components/ui/button'
import { DATE_FORMAT_KEYS, dateFormatOptions } from './dateFormats'
import { DEFAULT_SETTINGS } from './store'
import { LOCALES, detectLocale, localeMeta, useI18n } from './i18n'
import type { FolderNode, LinkNode, Settings } from './types'

const TIME_ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

/**
 * Group the IANA list by its region prefix ("America/New_York" -> "America")
 * so the ~400 entries arrive as a set of labelled <optgroup>s rather than one
 * undifferentiated list. Zones without a region ("UTC") are grouped last under
 * their own name.
 */
function groupedTimeZones(): [string, string[]][] {
  const groups = new Map<string, string[]>()
  for (const tz of TIME_ZONES) {
    const region = tz.includes('/') ? tz.split('/')[0] : 'UTC'
    const list = groups.get(region)
    if (list) list.push(tz)
    else groups.set(region, [tz])
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b))
}

const TIME_ZONE_GROUPS = groupedTimeZones()

/** "New York" out of "America/New_York" — the id's own city, spaced out. */
const zoneCity = (tz: string) => (tz.split('/').pop() ?? tz).replace(/_/g, ' ')

/** Elements that can hold focus, for the focus trap below. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The shared modal frame.
 *
 * A plain `<div>` here was invisible to assistive tech as a dialog: nothing
 * announced it opening, nothing bounded it, and Tab walked straight out of it
 * into the page behind. What it needs, and now has:
 *
 *  - `role="dialog"` + `aria-modal` so it is announced as a dialog, and
 *    `aria-labelledby` pointing at the heading so it is announced *by name*.
 *  - A focus trap, so Tab and Shift+Tab cycle within the dialog.
 *  - Focus restored to whatever opened it on close — otherwise focus resets to
 *    the top of the document and a keyboard user has to tab back down.
 *  - `Escape` bound to the dialog rather than to `window`, so with dialogs
 *    stacked only the top one closes.
 */
function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  // Unique per instance so stacked dialogs can't both point `aria-labelledby`
  // at the same id.
  const titleId = useId()

  // Captured during the first render, NOT in the effect: React applies a
  // child's `autoFocus` during commit, which is before effects run, so by
  // then `document.activeElement` is already the dialog's own first field and
  // the real opener is lost. Reading it here catches the element that was
  // focused when the dialog was still being rendered.
  const openerRef = useRef<HTMLElement | null>(
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)
  )

  useEffect(() => {
    const opener = openerRef.current

    const node = ref.current
    // An `autoFocus` input inside has already claimed focus by now; if there
    // isn't one, focus the dialog itself so the trap has somewhere to start
    // and the screen reader begins reading from the dialog, not the page.
    if (node && !node.contains(document.activeElement)) node.focus()

    return () => {
      // `isConnected`: if the opener was itself removed (deleting the node
      // being edited), focusing it does nothing and focus would land on
      // <body>. Fall back to the document body's first focusable region only
      // by leaving it alone — the browser's own behaviour is better than
      // focusing something arbitrary.
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return

    const node = ref.current
    if (!node) return
    const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)]
      // `offsetParent` is null for anything `display:none` — the hidden file
      // inputs, for instance, which must not be a stop in the tab order.
      .filter((el) => el.offsetParent !== null || el === document.activeElement)
    if (items.length === 0) {
      // Nothing focusable inside: keep focus on the dialog rather than letting
      // Tab escape to the page behind.
      e.preventDefault()
      return
    }

    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement

    // Wrap at both ends, and pull focus back in if it somehow sits outside.
    if (e.shiftKey && (active === first || !node.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (active === last || !node.contains(active))) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    // The backdrop closes on click as a convenience. It is deliberately not a
    // button: the same action is already reachable by Escape and by Cancel, so
    // adding a third, unlabelled control to the tab order would be noise.
    // `presentation` says exactly that — it is scenery, not a control, and the
    // click is an enhancement for pointer users rather than the only way out.
    // (jsx-a11y/no-noninteractive-element-interactions is off for this reason;
    // see .oxlintrc.json.)
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-5 backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        // `role="dialog"` on a div rather than a native `<dialog>`: `<dialog>`
        // only behaves as a modal when opened via `showModal()`, which means
        // an imperative open/close path and its own top-layer `::backdrop`
        // instead of the overlay above. The semantics assistive tech needs are
        // identical either way, so the div keeps the declarative rendering.
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Focusable only programmatically: it's the fallback focus target when
        // the dialog has no autofocused field, not a tab stop of its own.
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="scroll-themed max-h-[88dvh] w-full max-w-[430px] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl outline-none"
      >
        <h2 id={titleId} className="mb-5 text-[17px] font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

const labelCls = 'mb-1.5 mt-3.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground first-of-type:mt-0'
const inputCls = 'w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground outline-none focus:border-primary'

export function FolderModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: FolderNode
  onSave: (data: { name: string; icon: string }) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const id = useId()
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'folder')

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), icon })
  }

  return (
    <Shell title={initial ? t.editFolder : t.newFolder} onClose={onClose}>
      <form onSubmit={save}>
        <label htmlFor={`${id}-name`} className={labelCls}>{t.fieldName}</label>
        <input id={`${id}-name`} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t.folderNamePlaceholder} className={inputCls} />

        {/* The icon grid is a single choice among many, so it is grouped and
            labelled as one control rather than left as 24 unrelated buttons.
            `aria-pressed` on each carries the selection — previously it was
            conveyed by border colour alone, which is invisible both to a
            screen reader and to anyone who can't distinguish the two colours. */}
        <fieldset className="contents">
        <legend className={labelCls}>{t.fieldIcon}</legend>
        <div className="grid grid-cols-8 gap-1.5 max-[520px]:grid-cols-6">
          {ICON_KEYS.map((k) => {
            const I = getIcon(k)
            const active = k === icon
            return (
              <button
                type="button"
                key={k}
                onClick={() => setIcon(k)}
                title={k}
                aria-label={t.iconNamed(k)}
                aria-pressed={active}
                className={`flex aspect-square min-h-6 items-center justify-center rounded-lg border p-0 transition-colors ${
                  active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                } [&_svg]:size-[18px]`}
              ><I /></button>
            )
          })}
        </div>
        </fieldset>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button>
          <Button type="submit">{t.save}</Button>
        </div>
      </form>
    </Shell>
  )
}

const segmentedCls = 'inline-flex rounded-lg border border-border bg-card p-0.5'
// `min-h-11` (44px) so each segment clears the touch target minimum — at
// `py-1.5` this was ~34px tall, the shortest tappable control in the app.
const segmentBtnCls = (active: boolean) =>
  `flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors ${
    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
  }`

export function SettingsModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Settings
  onSave: (data: Settings) => void
  onClose: () => void
}) {
  const { t, formatDate } = useI18n()
  const id = useId()
  const [name, setName] = useState(initial.name ?? '')
  const [locale, setLocale] = useState(initial.locale ?? 'system')
  const [timeZone, setTimeZone] = useState(initial.timeZone)
  const [dateFormat, setDateFormat] = useState(initial.dateFormat)
  const [textTheme, setTextTheme] = useState<'light' | 'dark'>(initial.textTheme ?? 'light')
  const [glass, setGlass] = useState(initial.glass ?? true)
  const [openInNewTab, setOpenInNewTab] = useState(initial.openInNewTab ?? false)
  const [backgroundImage, setBackgroundImage] = useState(initial.backgroundImage ?? '')
  const [backgroundColor, setBackgroundColor] = useState(initial.backgroundColor ?? '')
  // Background image and color are mutually exclusive — track which one the
  // user is editing so switching tabs clears the other on save.
  const [backgroundType, setBackgroundType] = useState(
    initial.backgroundImage ? 'image' : initial.backgroundColor ? 'color' : 'none'
  )

  const save = (e: FormEvent) => {
    e.preventDefault()
    onSave({
      name: name.trim(),
      locale,
      timeZone,
      dateFormat,
      textTheme,
      glass,
      openInNewTab,
      backgroundImage: backgroundType === 'image' ? backgroundImage.trim() : '',
      backgroundColor: backgroundType === 'color' ? backgroundColor : '',
    })
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setBackgroundImage(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  const resetToDefaults = () => {
    setName(DEFAULT_SETTINGS.name)
    setLocale(DEFAULT_SETTINGS.locale)
    setTimeZone(DEFAULT_SETTINGS.timeZone)
    setDateFormat(DEFAULT_SETTINGS.dateFormat)
    setTextTheme(DEFAULT_SETTINGS.textTheme)
    setGlass(DEFAULT_SETTINGS.glass)
    setOpenInNewTab(DEFAULT_SETTINGS.openInNewTab)
    setBackgroundImage(DEFAULT_SETTINGS.backgroundImage)
    setBackgroundColor(DEFAULT_SETTINGS.backgroundColor)
    setBackgroundType(DEFAULT_SETTINGS.backgroundImage ? 'image' : DEFAULT_SETTINGS.backgroundColor ? 'color' : 'none')
  }

  return (
    <Shell title={t.settings} onClose={onClose}>
      <form onSubmit={save}>
        <label htmlFor={`${id}-name`} className={labelCls}>{t.fieldName} <span className="font-normal normal-case tracking-normal opacity-70">{t.fieldOptional}</span></label>
        <input id={`${id}-name`} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t.fieldYourName} className={inputCls} />

        <label htmlFor={`${id}-language`} className={labelCls}>{t.fieldLanguage}</label>
        <select
          id={`${id}-language`}
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className={inputCls}
        >
          {/* 'system' rather than a resolved tag, so the page keeps following
              the browser if its language later changes. The detected language
              is named in the label so the choice isn't opaque. */}
          <option value="system">{t.languageSystem(localeMeta(detectLocale()).endonym)}</option>
          {/* Each language is listed in its own script, and `lang`/`dir` are
              set per option so an RTL name renders correctly inside an
              otherwise LTR menu. */}
          {LOCALES.map((l) => (
            <option key={l.tag} value={l.tag} lang={l.tag} dir={l.dir}>{l.endonym}</option>
          ))}
        </select>

        <label htmlFor={`${id}-timezone`} className={labelCls}>{t.fieldTimeZone}</label>
        <select
          id={`${id}-timezone`}
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          className={inputCls}
        >
          {/* A stored zone this runtime doesn't know about still has to be
              selectable, or opening settings would silently change it. */}
          {!TIME_ZONES.includes(timeZone) && <option value={timeZone}>{timeZone}</option>}
          {TIME_ZONE_GROUPS.map(([region, zones]) => (
            <optgroup key={region} label={region}>
              {zones.map((tz) => <option key={tz} value={tz}>{zoneCity(tz)}</option>)}
            </optgroup>
          ))}
        </select>

        <label htmlFor={`${id}-dateformat`} className={labelCls}>{t.fieldDateFormat}</label>
        <select
          id={`${id}-dateformat`}
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value)}
          className={inputCls}
        >
          {/* Each option previews today's date in that preset, in the current
              locale — a fixed English sample ("1/1/2026") would misdescribe
              what the option actually does for most languages. */}
          {DATE_FORMAT_KEYS.map((key) => (
            <option key={key} value={key}>{formatDate(new Date(), dateFormatOptions(key))}</option>
          ))}
        </select>

        <fieldset className="contents">
        <legend className={labelCls}>{t.fieldTextColor}</legend>
        <div className={segmentedCls}>
          <button type="button" aria-pressed={textTheme === 'light'} className={segmentBtnCls(textTheme === 'light')} onClick={() => setTextTheme('light')}>{t.textLight}</button>
          <button type="button" aria-pressed={textTheme === 'dark'} className={segmentBtnCls(textTheme === 'dark')} onClick={() => setTextTheme('dark')}>{t.textDark}</button>
        </div>
        </fieldset>

        <fieldset className="contents">
        <legend className={labelCls}>{t.fieldGlass}</legend>
        <div aria-describedby={`${id}-glass-hint`} className={segmentedCls}>
          <button type="button" aria-pressed={glass} className={segmentBtnCls(glass)} onClick={() => setGlass(true)}>{t.on}</button>
          <button type="button" aria-pressed={!glass} className={segmentBtnCls(!glass)} onClick={() => setGlass(false)}>{t.off}</button>
        </div>
        <p id={`${id}-glass-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {t.glassHint}
        </p>
        </fieldset>

        <fieldset className="contents">
        <legend className={labelCls}>{t.fieldOpenLinksIn}</legend>
        <div aria-describedby={`${id}-openlinks-hint`} className={segmentedCls}>
          <button type="button" aria-pressed={!openInNewTab} className={segmentBtnCls(!openInNewTab)} onClick={() => setOpenInNewTab(false)}>{t.sameTab}</button>
          <button type="button" aria-pressed={openInNewTab} className={segmentBtnCls(openInNewTab)} onClick={() => setOpenInNewTab(true)}>{t.newTab}</button>
        </div>
        <p id={`${id}-openlinks-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {t.openLinksHint}
        </p>
        </fieldset>

        <fieldset className="contents">
        <legend className={labelCls}>{t.fieldBackground}</legend>
        <div className={segmentedCls}>
          <button type="button" aria-pressed={backgroundType === 'none'} className={segmentBtnCls(backgroundType === 'none')} onClick={() => setBackgroundType('none')}>{t.backgroundNone}</button>
          <button type="button" aria-pressed={backgroundType === 'image'} className={segmentBtnCls(backgroundType === 'image')} onClick={() => setBackgroundType('image')}>{t.backgroundImage}</button>
          <button type="button" aria-pressed={backgroundType === 'color'} className={segmentBtnCls(backgroundType === 'color')} onClick={() => setBackgroundType('color')}>{t.backgroundColor}</button>
        </div>
        </fieldset>

        {backgroundType === 'image' && (
          <div className="mt-3">
            <input
              aria-label={t.backgroundImage}
              value={backgroundImage.startsWith('data:') ? '' : backgroundImage}
              onChange={(e) => setBackgroundImage(e.target.value)}
              placeholder={backgroundImage.startsWith('data:') ? t.imageSelected : t.imageUrlPlaceholder}
              spellCheck="false"
              className={inputCls}
            />
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('background-file-input')?.click()}>
                {t.chooseFromDevice}
              </Button>
              {backgroundImage && (
                <Button type="button" variant="outline" size="sm" onClick={() => setBackgroundImage('')}>
                  {t.clear}
                </Button>
              )}
              <input id="background-file-input" type="file" accept="image/*" onChange={onFile} className="hidden" />
            </div>
            {backgroundImage && (
              <div
                aria-hidden="true"
                className="mt-2.5 h-20 w-full rounded-lg border border-border bg-cover bg-center"
                style={{ backgroundImage: `url(${backgroundImage})` }}
              />
            )}
          </div>
        )}

        {backgroundType === 'color' && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              aria-label={t.backgroundColor}
              value={backgroundColor || '#ffffff'}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-card p-1"
            />
            <input
              aria-label={t.backgroundColor}
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              placeholder="#0f172a"
              spellCheck="false"
              className={inputCls}
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={resetToDefaults}>{t.resetToDefaults}</Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button>
            <Button type="submit">{t.save}</Button>
          </div>
        </div>
      </form>
    </Shell>
  )
}

export function LinkModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: LinkNode
  onSave: (data: { name: string; url: string }) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const id = useId()
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')

  const save = (e: FormEvent) => {
    e.preventDefault()
    const u = url.trim()
    if (!u) return
    const full = /^https?:\/\//i.test(u) ? u : `https://${u}`
    const label = name.trim() || full
    onSave({ name: label, url: full })
  }

  return (
    <Shell title={initial ? t.editLink : t.newLink} onClose={onClose}>
      <form onSubmit={save}>
        <label htmlFor={`${id}-url`} className={labelCls}>{t.fieldUrl}</label>
        <input id={`${id}-url`} type="text" inputMode="url" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t.urlPlaceholder} spellCheck="false" className={inputCls} />

        <label htmlFor={`${id}-name`} className={labelCls}>{t.fieldName} <span className="font-normal normal-case tracking-normal opacity-70">{t.fieldOptional}</span></label>
        <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.linkNamePlaceholder} className={inputCls} />

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button>
          <Button type="submit">{t.save}</Button>
        </div>
      </form>
    </Shell>
  )
}

/**
 * Flatten the tree into pickable destinations: every folder, indented by depth,
 * plus the top level. The node being moved and its own descendants are omitted
 * — a folder cannot be moved inside itself.
 */
function destinations(
  nodes: (FolderNode | LinkNode)[],
  excludeId: string,
  depth = 0
): { id: string; label: string }[] {
  return nodes.flatMap((node) => {
    if (node.type !== 'folder' || node.id === excludeId) return []
    return [
      { id: node.id, label: `${'\u00A0\u00A0'.repeat(depth)}${node.name}` },
      ...destinations(node.children, excludeId, depth + 1),
    ]
  })
}

/**
 * Keyboard-reachable equivalent of dragging a row into a folder.
 *
 * Reordering was drag-and-drop only, which is unavailable to anyone using a
 * keyboard, a switch, or a screen reader — the operation simply could not be
 * performed. This exposes the same `onMove` through an ordinary dialog with a
 * <select> of destinations.
 */
export function MoveModal({
  node,
  tree,
  onMove,
  onClose,
}: {
  node: FolderNode | LinkNode
  tree: (FolderNode | LinkNode)[]
  onMove: (id: string, targetId: string | null) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const id = useId()
  const [target, setTarget] = useState<string>('')

  const options = destinations(tree, node.id)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // '' is the top level, which `onMove` spells as null.
    onMove(node.id, target === '' ? null : target)
    onClose()
  }

  return (
    <Shell title={t.moveTitle(node.name)} onClose={onClose}>
      <form onSubmit={submit}>
        <label htmlFor={`${id}-target`} className={labelCls}>{t.moveDestination}</label>
        <select
          id={`${id}-target`}
          autoFocus
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className={inputCls}
        >
          <option value="">{t.moveToTopLevel}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button>
          <Button type="submit">{t.moveHere}</Button>
        </div>
      </form>
    </Shell>
  )
}
