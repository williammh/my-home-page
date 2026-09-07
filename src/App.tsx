import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { PlusIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline'
import Clock from './Clock'
import SearchBar from './SearchBar'
import { LinkCard } from './Cards'
import FolderTree from './FolderTree'
import { FolderModal, LinkModal, MoveModal, SettingsModal } from './Modal'
import { Button } from '@/components/ui/button'
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
    <>
      {settings.backgroundImage ? (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${settings.backgroundImage})` }}
        />
      ) : settings.backgroundColor ? (
        <div className="fixed inset-0 -z-10" style={{ backgroundColor: settings.backgroundColor }} />
      ) : null}
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
          <Clock settings={settings} onOpenSettings={() => setModal({ kind: 'settings' })} />

          {(!trimmedQuery || matchedShortcuts.length > 0) && (
            <section className="mb-5" aria-labelledby="shortcuts-heading">
              <div className={`mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-3 ${headlineCls(settings.textTheme)}`}>
                <h2 id="shortcuts-heading" className="sr-only">
                  {t.shortcuts}
                </h2>
                {/* A hairline fills the row so the edit button doesn't read as
                    floating unattached at the far edge. */}
                <div aria-hidden="true" className="h-px flex-1 bg-current opacity-15" />
                {!trimmedQuery && (
                  <Button
                    variant="glass"
                    size="icon-sm"
                    className="rounded-lg"
                    title={editingShortcuts ? t.doneEditingShortcuts : t.editShortcuts}
                    aria-pressed={editingShortcuts}
                    onClick={() => setEditingShortcuts((v) => !v)}
                  >
                    {editingShortcuts ? <CheckIcon /> : <PencilSquareIcon />}
                  </Button>
                )}
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
                {editingShortcuts && !trimmedQuery && (
                  <button
                    type="button"
                    title={t.addShortcut}
                    aria-label={t.addShortcut}
                    onClick={() => setModal({ kind: 'link', isShortcut: true })}
                    className="flex min-h-[108px] flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-current/25 px-2.5 pb-[17px] pt-5 text-foreground no-underline transition-colors duration-150 hover:border-current/40 hover:bg-foreground/5 max-[520px]:min-h-[86px] max-[520px]:gap-1.5 max-[520px]:px-1 max-[520px]:pb-2.5 max-[520px]:pt-3"
                  >
                    <div className="flex size-[34px] items-center justify-center">
                      <PlusIcon className="size-5" />
                    </div>
                    <span className="line-clamp-2 max-w-full text-center text-[12.5px] leading-tight max-[520px]:text-[11px]">
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
            />
            {/* A sibling of FolderTree, not nested inside it: FolderTree's
                content sits in a vendored `w-full` (not full-height) wrapper,
                so a footer placed inside it can't use `mt-auto` to reach the
                panel's bottom when the tree is short — it would just sit
                right after the last row. As a flex sibling of the whole
                scroll panel (`flex flex-col` above), `mt-auto` here pushes
                against the panel itself instead, and `sticky bottom-0` then
                keeps it pinned once the tree grows past the panel's height. */}
            <div className="sticky bottom-0 z-50 ms-auto mt-auto flex w-fit flex-wrap justify-end gap-2 pb-3 pt-2">
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-border hover:text-foreground [&_svg]:size-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <ArrowUpTrayIcon /> {t.import}
              </button>
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-border hover:text-foreground [&_svg]:size-4"
                onClick={onExport}
              >
                <ArrowDownTrayIcon /> {t.export}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={onImportFile}
                className="hidden"
              />
            </div>
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
    </>
  )
}
