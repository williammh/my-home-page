import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import Clock from './Clock'
import SearchBar from './SearchBar'
import { LinkCard, cardBase, cardIconSlotCls, cardLabelCls } from './Cards'
import FolderTree from './FolderTree'
import { FolderModal, LinkModal, MoveModal, SettingsModal } from './Modal'
import { useTree, useShortcuts, useSettings, newFolder, newLink, parseImportedTree, countNodes } from './store'
import { I18nProvider, useI18n } from './i18n'
import { headlineCls } from './textTheme'
import type { FolderNode, LinkNode, Settings, TreeNode } from './types'

// Auto-fill sizes the columns from available width, but at a narrow viewport
// it would settle on two or three cards a row. Below 520px the track count is
// fixed at four instead — the floor asked for — and the cards shrink to fit;
// `minmax(0,1fr)` (not the implicit `auto`) lets them go under their content
// width so a long label can't push the row wider than the screen.
const gridCls =
  'grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3 max-[520px]:gap-2 max-[520px]:grid-cols-[repeat(4,minmax(0,1fr))]'

type Modal =
  | { kind: 'folder'; node?: FolderNode; target?: string | null }
  | { kind: 'link'; node?: LinkNode; target?: string | null; isShortcut?: boolean }
  | { kind: 'settings' }
  | { kind: 'move'; node: TreeNode }

/**
 * Settings are read here and handed to the provider, so `AppBody` — and every
 * component under it — can call `useI18n`. The provider has to sit above the
 * consumers, and settings are what it's configured from, hence the split.
 */
export default function App() {
  const { settings, updateSettings } = useSettings()

  return (
    <I18nProvider locale={settings.locale} timeZone={settings.timeZone}>
      <AppBody settings={settings} updateSettings={updateSettings} />
    </I18nProvider>
  )
}

function AppBody({
  settings,
  updateSettings,
}: {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}) {
  const { t } = useI18n()
  const { tree, addNode, removeNode, updateNode, moveNode, importNodes } = useTree()
  const { shortcuts, addShortcut, removeShortcut, updateShortcut } = useShortcuts()
  const [selectedId, setSelectedId] = useState<string | null>(null)  // folder highlighted in the tree
  const [modal, setModal] = useState<Modal | null>(null)
  const [query, setQuery] = useState('')
  // Toggled by "Edit Shortcuts": while on, every shortcut card and every
  // bookmarks folder/link row shows its edit/delete buttons without needing
  // a hover, for touch screens and for seeing the whole grid's controls at
  // once.
  const [editingShortcuts, setEditingShortcuts] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)   // import/export banner under the Bookmarks header
  const fileInputRef = useRef<HTMLInputElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)

  // Parallax for the background image: on a narrow/short viewport the page
  // itself can grow past one screen and scroll (see the `min-h-dvh` note
  // below), and with a plain `absolute` background that scrolls in lockstep
  // with the content, which reads as flat. `background-attachment: fixed`
  // would give real parallax for free, but it's exactly what was ruled out
  // for this layer — it's unreliable on mobile Safari and repaints on every
  // address-bar show/hide. Driving a `translateY` off scroll position instead
  // gets the same depth effect without depending on `fixed`.
  //
  // The image is scaled up 12% *vertically only* (`scale-y-[1.12]` below) so
  // the parallax travel never uncovers a top/bottom edge: at most `document
  // height - 100dvh` of scroll happens, moved at a fraction of that, and the
  // extra 12% headroom covers it at any realistic content height. Scaling
  // only the Y axis matters here — an isotropic `scale-[1.12]` widens the
  // layer past the viewport too, since it's centered growth on both axes,
  // which pushed the whole document's scrollable width out and caused an
  // unwanted horizontal scrollbar site-wide.
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (backgroundRef.current) {
          backgroundRef.current.style.transform = `translateY(${window.scrollY * 0.15}px)`
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // The glass treatment is driven by CSS variables keyed off `data-glass` on
  // <html> (see index.css), so toggling it is one attribute rather than a
  // conditional at each of the surfaces that use `.glass`.
  useEffect(() => {
    document.documentElement.dataset.glass = settings.glass ? 'on' : 'off'
  }, [settings.glass])

  const trimmedQuery = query.trim().toLowerCase()
  const matchedShortcuts = trimmedQuery
    ? shortcuts.filter((s) => s.name.toLowerCase().includes(trimmedQuery))
    : shortcuts

  const save = (data: Settings | { name: string; url: string } | { name: string; icon: string }) => {
    // 'move' is not an edit form — it commits through `moveNode` directly.
    if (!modal || modal.kind === 'move') return
    if (modal.kind === 'settings') {
      updateSettings(data as Settings)
    } else if (modal.kind === 'link' && modal.isShortcut) {
      const linkData = data as { name: string; url: string }
      if (modal.node) {
        updateShortcut(modal.node.id, linkData)
      } else {
        addShortcut(newLink(linkData.name, linkData.url))
      }
    } else if (modal.node) {
      updateNode(modal.node.id, data)
    } else if (modal.kind === 'folder') {
      const folderData = data as { name: string; icon: string }
      addNode(modal.target ?? null, newFolder(folderData.name, folderData.icon))
    } else {
      const linkData = data as { name: string; url: string }
      addNode(modal.target ?? null, newLink(linkData.name, linkData.url))
    }
    setModal(null)
  }

  const del = (id: string) => {
    if (id === selectedId) setSelectedId(null)
    removeNode(id)
  }

  // Import a previously exported tree (the `myhomepage.tree.v1` shape) from a
  // JSON file. Everything is validated in `parseImportedTree`; here we only
  // deal with reading the file and reporting the outcome.
  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset immediately so picking the same file twice in a row still fires
    // a change event.
    e.target.value = ''
    if (!file) return

    try {
      const nodes = parseImportedTree(await file.text())
      if (nodes.length === 0) {
        setNote({ ok: false, text: t.importEmpty })
        return
      }
      importNodes(nodes)
      const n = countNodes(nodes)
      setNote({ ok: true, text: t.importedItems(n) })
    } catch {
      setNote({ ok: false, text: t.importInvalid })
    }
  }

  // Save the tree to a JSON file — the same shape `parseImportedTree` reads,
  // so an export can always be imported back. Serialized straight from state
  // rather than read back out of localStorage, so what lands in the file is
  // what's on screen.
  const onExport = () => {
    if (tree.length === 0) {
      setNote({ ok: false, text: t.exportEmpty })
      return
    }

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' })
    )
    const a = document.createElement('a')
    a.href = url
    // Date-stamped so repeated exports don't all collide on one filename.
    a.download = `bookmarks-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    // `click()` kicks the download off asynchronously, so revoking on the very
    // next line can pull the blob out from under a download that hasn't
    // started yet. Deferring frees it without racing the save.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)

    const n = countNodes(tree)
    setNote({ ok: true, text: t.exportedItems(n) })
  }

  return (
    <div className="relative min-h-dvh">
      {settings.backgroundImage ? (
        <div
          ref={backgroundRef}
          className="absolute inset-0 -z-10 scale-y-[1.12] bg-cover bg-center will-change-transform"
          style={{ backgroundImage: `url(${settings.backgroundImage})` }}
        />
      ) : settings.backgroundColor ? (
        <div className="absolute inset-0 -z-10" style={{ backgroundColor: settings.backgroundColor }} />
      ) : null}
      {/* `absolute`, not `fixed`: a `fixed` layer is pinned to the browser's
          own viewport, so every time the mobile address bar shows or hides,
          the layer is resized right along with it, which reads as a visible
          jump. `absolute` inside this `min-h-dvh` wrapper is sized once
          against the document instead, so it only grows if the content
          itself grows past a full screen. */}
      {/* `min-h-*` rather than a fixed height: the page is a single-screen
          layout whenever it fits, but on a short or narrow viewport the
          content grows and the page scrolls normally. Pinning to exactly one
          screen instead made the header and the bookmarks panel compete for a
          fixed budget, which clipped whichever lost through the middle of a
          card.

          `dvh`, not `vh`: on mobile browsers `vh` is measured against the
          viewport with the URL bar *retracted*, so a `100vh` layout runs under
          the browser chrome until the user scrolls. `dvh` tracks the viewport
          as it actually is. The safe-area insets keep content clear of a
          notch in landscape and the home indicator at the bottom. */}
      <div
        className="mx-auto flex min-h-dvh max-w-[1080px] flex-col pt-[clamp(24px,9vh,96px)] [--page-gutter:24px] max-[520px]:[--page-gutter:16px]"
        style={{
          // `max()` of the design's gutter and the device's own inset, so a
          // notch in landscape widens the padding but never narrows it.
          paddingInlineStart: 'max(var(--page-gutter), env(safe-area-inset-left))',
          paddingInlineEnd: 'max(var(--page-gutter), env(safe-area-inset-right))',
          paddingBottom: 'calc(5vh + env(safe-area-inset-bottom))',
        }}
      >
        {/* First tab stop on the page: the shortcut grid and the tree are both
            long, so without this a keyboard user tabs through everything above
            the bookmarks on every visit. Visually hidden until focused. */}
        <a
          href="#bookmarks-panel"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:outline-2 focus:outline-ring"
        >
          {t.skipToBookmarks}
        </a>
        <header className="shrink-0" aria-label={t.landmarkHeader}>
          <Clock
            settings={settings}
            onOpenSettings={() => setModal({ kind: 'settings' })}
            onImport={() => fileInputRef.current?.click()}
            onExport={onExport}
          />

          {(!trimmedQuery || matchedShortcuts.length > 0) && (
            <section className="mb-5" aria-labelledby="shortcuts-heading">
              {/* The edit toggle used to sit at the end of this hairline, but
                  it governs the bookmark tree as well as this grid — it now
                  lives on the tree's own "Bookmarks" row, where its full scope
                  is legible. The hairline stays as the section divider. */}
              <div className={`mb-3.5 flex items-center ${headlineCls(settings.textTheme)}`}>
                <h2 id="shortcuts-heading" className="sr-only">
                  {t.shortcuts}
                </h2>
                <div aria-hidden="true" className="h-px flex-1 bg-current opacity-15" />
              </div>
              <div className={gridCls}>
                {matchedShortcuts.map((s) => (
                  <LinkCard
                    key={s.id}
                    node={s}
                    query={trimmedQuery}
                    editable
                    editing={editingShortcuts}
                    newTab={settings.openInNewTab}
                    onEdit={(node) => setModal({ kind: 'link', node, isShortcut: true })}
                    onRemove={removeShortcut}
                  />
                ))}
                {/* Ungated on `editingShortcuts`, matching the Bookmarks root
                    row: adding is always available there too, and only
                    move/rename/delete need the edit toggle. Edit mode moved
                    off this section entirely (see the toggle's own comment
                    above) — gating "add" behind it as well would make
                    "add a shortcut" depend on a control that no longer lives
                    anywhere near this grid. */}
                {!trimmedQuery && (
                  <button
                    type="button"
                    title={t.addShortcut}
                    aria-label={t.addShortcut}
                    onClick={() => setModal({ kind: 'link', isShortcut: true })}
                    className={`border border-dashed border-current/25 ${cardBase} hover:border-current/40 hover:bg-foreground/5`}
                  >
                    <div className={cardIconSlotCls}>
                      <PlusIcon className="size-5" />
                    </div>
                    <span className={cardLabelCls}>
                      {t.addShortcut}
                    </span>
                  </button>
                )}
              </div>
            </section>
          )}

          <SearchBar value={query} onChange={setQuery} />
        </header>

        <section className="flex min-h-[320px] flex-1 flex-col" aria-label={t.landmarkBookmarks}>
          {/* `role="status"` (polite): the import/export outcome is the only
              feedback that the action did anything, and it is otherwise
              announced to nobody. Polite rather than assertive so it waits for
              a pause instead of cutting the user off. */}
          {note && (
            <div
              // `role="status"`, not `<output>`: `<output>` is specified as the
              // result of a calculation, and this is an operation's outcome.
              // Both are polite live regions; only this one says the right
              // thing about what the text is.
              role="status"
              className={`mb-3 flex shrink-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                note.ok
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-destructive/40 bg-destructive/10 text-foreground'
              }`}
            >
              <span>{note.text}</span>
              <button
                type="button"
                title={t.dismiss}
                className="min-h-6 shrink-0 rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => setNote(null)}
              >
                {t.dismiss}
              </button>
            </div>
          )}

          {/* The panel is the scroll container, and both the "Bookmarks" root
              row and the import/export bar are sticky *inside* it — so they
              stay put against the glass while the tree scrolls under them,
              rather than sitting outside as separate page furniture. */}
          <div
            id="bookmarks-panel"
            // `tabIndex={-1}`: the skip link has to be able to move focus here,
            // and a container is not focusable on its own.
            tabIndex={-1}
            className="glass glass-panel scroll-themed relative flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg px-3 outline-none"
          >
            {/* Vertical padding lives on the tree, not here: `p-3` on the
                scroll container would offset sticky folder headers 12px down
                from the visible top edge, leaving a gap for rows to scroll
                through above them. */}
            <FolderTree
              tree={tree}
              query={query}
              selectedId={selectedId}
              newTab={settings.openInNewTab}
              editing={editingShortcuts}
              onSelect={setSelectedId}
              onEdit={(node) => (node.type === 'folder' ? setModal({ kind: 'folder', node }) : setModal({ kind: 'link', node }))}
              onRemove={del}
              onAdd={(folder, kind) => setModal({ kind, target: folder.id })}
              onMove={moveNode}
              onMoveRequest={(node) => setModal({ kind: 'move', node })}
              rootLabel={t.bookmarks}
              onAddRoot={(kind) => setModal({ kind, target: null })}
              onToggleEditing={() => setEditingShortcuts((v) => !v)}
            />
            {/* Driven by the header menu's Import item; the input itself is
                never shown. */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onImportFile}
              className="hidden"
            />
          </div>
        </section>

        {modal?.kind === 'folder' && (
          <FolderModal initial={modal.node} onSave={save} onClose={() => setModal(null)} />
        )}
        {modal?.kind === 'link' && (
          <LinkModal initial={modal.node} onSave={save} onClose={() => setModal(null)} />
        )}
        {modal?.kind === 'settings' && (
          <SettingsModal initial={settings} onSave={save} onClose={() => setModal(null)} />
        )}
        {modal?.kind === 'move' && (
          <MoveModal
            node={modal.node}
            tree={tree}
            onMove={moveNode}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </div>
  )
}
