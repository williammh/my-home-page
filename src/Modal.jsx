import { useState, useEffect } from 'react'
import { ICON_KEYS, getIcon } from './icons'
import { Button } from '@/components/ui/button'
import { DATE_FORMATS } from './dateFormats'
import { DEFAULT_SETTINGS } from './store'

const TIME_ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

function Shell({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-5 backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <h2 className="mb-[18px] text-[17px] font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

const labelCls = 'mb-1.5 mt-3.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground first-of-type:mt-0'
const inputCls = 'w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground outline-none focus:border-primary'

export function FolderModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'folder')

  const save = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), icon })
  }

  return (
    <Shell title={initial ? 'Edit folder' : 'New folder'} onClose={onClose}>
      <form onSubmit={save}>
        <label className={labelCls}>Name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Work" className={inputCls} />

        <label className={labelCls}>Icon</label>
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
                className={`flex aspect-square items-center justify-center rounded-lg border p-0 transition-colors ${
                  active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                } [&_svg]:size-[18px]`}
              ><I /></button>
            )
          })}
        </div>

        <div className="mt-[22px] flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Shell>
  )
}

// Max size for a background image read from disk and stored as a data URL in
// localStorage — large files risk blowing the ~5MB storage quota.
const MAX_BACKGROUND_FILE_BYTES = 3 * 1024 * 1024

const segmentedCls = 'inline-flex rounded-lg border border-border bg-card p-0.5'
const segmentBtnCls = (active) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
  }`

export function SettingsModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial.name ?? '')
  const [timeZone, setTimeZone] = useState(initial.timeZone)
  const [dateFormat, setDateFormat] = useState(initial.dateFormat)
  const [textTheme, setTextTheme] = useState(initial.textTheme ?? 'light')
  const [glass, setGlass] = useState(initial.glass ?? true)
  const [backgroundImage, setBackgroundImage] = useState(initial.backgroundImage ?? '')
  const [backgroundColor, setBackgroundColor] = useState(initial.backgroundColor ?? '')
  // Background image and color are mutually exclusive — track which one the
  // user is editing so switching tabs clears the other on save.
  const [backgroundType, setBackgroundType] = useState(
    initial.backgroundImage ? 'image' : initial.backgroundColor ? 'color' : 'none'
  )
  const [fileError, setFileError] = useState('')

  const save = (e) => {
    e.preventDefault()
    onSave({
      name: name.trim(),
      timeZone,
      dateFormat,
      textTheme,
      glass,
      backgroundImage: backgroundType === 'image' ? backgroundImage.trim() : '',
      backgroundColor: backgroundType === 'color' ? backgroundColor : '',
    })
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_BACKGROUND_FILE_BYTES) {
      setFileError('Image is too large (max 3MB).')
      return
    }
    setFileError('')
    const reader = new FileReader()
    reader.onload = () => setBackgroundImage(reader.result)
    reader.readAsDataURL(file)
  }

  const resetToDefaults = () => {
    setName(DEFAULT_SETTINGS.name)
    setTimeZone(DEFAULT_SETTINGS.timeZone)
    setDateFormat(DEFAULT_SETTINGS.dateFormat)
    setTextTheme(DEFAULT_SETTINGS.textTheme)
    setGlass(DEFAULT_SETTINGS.glass)
    setBackgroundImage(DEFAULT_SETTINGS.backgroundImage)
    setBackgroundColor(DEFAULT_SETTINGS.backgroundColor)
    setBackgroundType(DEFAULT_SETTINGS.backgroundImage ? 'image' : DEFAULT_SETTINGS.backgroundColor ? 'color' : 'none')
    setFileError('')
  }

  return (
    <Shell title="Settings" onClose={onClose}>
      <form onSubmit={save}>
        <label className={labelCls}>Name <span className="font-normal normal-case tracking-normal opacity-70">(optional)</span></label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />

        <label className={labelCls}>Time zone</label>
        <select
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          className={inputCls}
        >
          {!TIME_ZONES.includes(timeZone) && <option value={timeZone}>{timeZone}</option>}
          {TIME_ZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>

        <label className={labelCls}>Date format</label>
        <select
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value)}
          className={inputCls}
        >
          {Object.entries(DATE_FORMATS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <label className={labelCls}>Text color</label>
        <div className={segmentedCls}>
          <button type="button" className={segmentBtnCls(textTheme === 'light')} onClick={() => setTextTheme('light')}>Light</button>
          <button type="button" className={segmentBtnCls(textTheme === 'dark')} onClick={() => setTextTheme('dark')}>Dark</button>
        </div>

        <label className={labelCls}>Glass effect</label>
        <div className={segmentedCls}>
          <button type="button" className={segmentBtnCls(glass)} onClick={() => setGlass(true)}>On</button>
          <button type="button" className={segmentBtnCls(!glass)} onClick={() => setGlass(false)}>Off</button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Translucent, blurred surfaces for the clock, search bar, shortcuts and bookmarks.
        </p>

        <label className={labelCls}>Background</label>
        <div className={segmentedCls}>
          <button type="button" className={segmentBtnCls(backgroundType === 'none')} onClick={() => setBackgroundType('none')}>None</button>
          <button type="button" className={segmentBtnCls(backgroundType === 'image')} onClick={() => setBackgroundType('image')}>Image</button>
          <button type="button" className={segmentBtnCls(backgroundType === 'color')} onClick={() => setBackgroundType('color')}>Color</button>
        </div>

        {backgroundType === 'image' && (
          <div className="mt-3">
            <input
              value={backgroundImage.startsWith('data:') ? '' : backgroundImage}
              onChange={(e) => setBackgroundImage(e.target.value)}
              placeholder={backgroundImage.startsWith('data:') ? 'Image selected from this device' : 'https://example.com/image.jpg'}
              spellCheck="false"
              className={inputCls}
            />
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('background-file-input').click()}>
                Choose from device
              </Button>
              {backgroundImage && (
                <Button type="button" variant="outline" size="sm" onClick={() => setBackgroundImage('')}>
                  Clear
                </Button>
              )}
              <input id="background-file-input" type="file" accept="image/*" onChange={onFile} className="hidden" />
            </div>
            {fileError && <div className="mt-1.5 text-xs text-destructive">{fileError}</div>}
            {backgroundImage && (
              <div
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
              value={backgroundColor || '#ffffff'}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-card p-1"
            />
            <input
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              placeholder="#0f172a"
              spellCheck="false"
              className={inputCls}
            />
          </div>
        )}

        <div className="mt-[22px] flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={resetToDefaults}>Reset to defaults</Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Shell>
  )
}

export function LinkModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')

  const save = (e) => {
    e.preventDefault()
    const u = url.trim()
    if (!u) return
    const full = /^https?:\/\//i.test(u) ? u : `https://${u}`
    const label = name.trim() || full
    onSave({ name: label, url: full })
  }

  return (
    <Shell title={initial ? 'Edit link' : 'New link'} onClose={onClose}>
      <form onSubmit={save}>
        <label className={labelCls}>URL</label>
        <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com" spellCheck="false" className={inputCls} />

        <label className={labelCls}>Name <span className="font-normal normal-case tracking-normal opacity-70">(optional)</span></label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Auto from URL" className={inputCls} />

        <div className="mt-[22px] flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Shell>
  )
}
