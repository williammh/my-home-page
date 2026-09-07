import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { FolderPlusIcon, PlusIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline'
import { BookmarkSimpleIcon } from '@phosphor-icons/react'
import Clock from './Clock'
import SearchBar from './SearchBar'
import { LinkCard } from './Cards'
import FolderTree from './FolderTree'
import { FolderModal, LinkModal, SettingsModal } from './Modal'
import { Button } from '@/components/ui/button'
import { useTree, useShortcuts, useSettings, newFolder, newLink, parseImportedTree, countNodes } from './store'
import { headlineCls } from './textTheme'
import type { FolderNode, LinkNode, Settings } from './types'

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

export default function App() {
  const { tree, addNode, removeNode, updateNode, moveNode, importNodes } = useTree()
  const { shortcuts, addShortcut, removeShortcut, updateShortcut } = useShortcuts()
  const { settings, updateSettings } = useSettings()
  const [selectedId, setSelectedId] = useState<string | null>(null)  // folder highlighted in the tree
  const [modal, setModal] = useState<Modal | null>(null)
  const [query, setQuery] = useState('')
  // Toggled by "Edit Shortcuts": while on, every shortcut card shows its
  // edit/delete buttons without needing a hover, for touch screens and for
  // seeing the whole grid's controls at once.
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
    if (!modal) return
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
        setNote({ ok: false, text: 'No bookmarks or folders found in that file.' })
        return
      }
      importNodes(nodes)
      const n = countNodes(nodes)
      setNote({ ok: true, text: `Imported ${n} item${n === 1 ? '' : 's'}.` })
    } catch {
      setNote({ ok: false, text: "That file isn't valid JSON." })
    }
  }

  // Save the tree to a JSON file — the same shape `parseImportedTree` reads,
  // so an export can always be imported back. Serialized straight from state
  // rather than read back out of localStorage, so what lands in the file is
  // what's on screen.
  const onExport = () => {
    if (tree.length === 0) {
      setNote({ ok: false, text: 'Nothing to export yet.' })
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
    setNote({ ok: true, text: `Exported ${n} item${n === 1 ? '' : 's'}.` })
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
      {/* `min-h-screen` rather than `h-screen`: the page is a single-screen
          layout whenever it fits, but on a short or narrow viewport the
          content grows and the page scrolls normally. Pinning to exactly one
          screen instead made the header and the bookmarks panel compete for a
          fixed budget, which clipped whichever lost through the middle of a
          card. */}
      <div className="mx-auto flex min-h-screen max-w-[1080px] flex-col px-6 pb-[5vh] pt-[clamp(24px,9vh,96px)] max-[520px]:px-4">
        <div className="shrink-0">
          <Clock settings={settings} onOpenSettings={() => setModal({ kind: 'settings' })} />
          <SearchBar value={query} onChange={setQuery} />

          {(!trimmedQuery || matchedShortcuts.length > 0) && (
            <section className="mb-5">
              <div className={`mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-3 ${headlineCls(settings.textTheme)}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${headlineCls(settings.textTheme)}`}>
                  Shortcuts
                </h3>
                {/* A hairline running from the label to the actions ties the
                    two ends of the row together, so the button doesn't read as
                    floating unattached at the far edge. */}
                <div className="h-px flex-1 bg-current opacity-15" />
                {!trimmedQuery && (
                  <Button
                    variant="glass"
                    size="sm"
                    className="rounded-lg"
                    aria-pressed={editingShortcuts}
                    onClick={() => setEditingShortcuts((v) => !v)}
                  >
                    {editingShortcuts ? <CheckIcon /> : <PencilSquareIcon />}
                    {editingShortcuts ? 'Done' : 'Edit Shortcuts'}
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
                    title="Add shortcut"
                    onClick={() => setModal({ kind: 'link', isShortcut: true })}
                    className="flex min-h-[108px] flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-current/25 px-2.5 pb-[17px] pt-5 text-foreground no-underline transition-colors duration-150 hover:border-current/40 hover:bg-foreground/5 max-[520px]:min-h-[86px] max-[520px]:gap-1.5 max-[520px]:px-1 max-[520px]:pb-2.5 max-[520px]:pt-3"
                  >
                    <div className="flex size-[34px] items-center justify-center">
                      <PlusIcon className="size-5" />
                    </div>
                    <span className="line-clamp-2 max-w-full text-center text-[12.5px] leading-tight max-[520px]:text-[11px]">
                      Add Shortcut
                    </span>
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        <section className="flex min-h-[320px] flex-1 flex-col">
          <div className={`mb-3.5 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 ${headlineCls(settings.textTheme)}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${headlineCls(settings.textTheme)}`}>
              Bookmarks
            </h3>
            <div className="h-px flex-1 bg-current opacity-15" />
            <div className="flex flex-wrap gap-2">
              <Button variant="glass" className="rounded-lg" onClick={() => setModal({ kind: 'folder', target: null })}>
                <FolderPlusIcon />New Folder
              </Button>
              <Button variant="glass" className="rounded-lg" onClick={() => setModal({ kind: 'link', target: null })}>
                <BookmarkSimpleIcon /> New Bookmark
              </Button>
              <Button variant="glass" className="rounded-lg" onClick={() => fileInputRef.current?.click()}>
                <ArrowUpTrayIcon /> Import
              </Button>
              <Button variant="glass" className="rounded-lg" onClick={onExport}>
                <ArrowDownTrayIcon /> Export
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={onImportFile}
                className="hidden"
              />
            </div>
          </div>

          {note && (
            <div
              className={`mb-3 flex shrink-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                note.ok
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-destructive/40 bg-destructive/10 text-foreground'
              }`}
            >
              <span>{note.text}</span>
              <button
                type="button"
                title="Dismiss"
                className="shrink-0 rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => setNote(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="glass glass-panel scroll-themed min-h-0 flex-1 overflow-y-auto rounded-lg px-3">
            {/* Vertical padding lives on the tree, not here: `p-3` on the
                scroll container would offset sticky folder headers 12px down
                from the visible top edge, leaving a gap for rows to scroll
                through above them. */}
            <FolderTree
              tree={tree}
              query={query}
              selectedId={selectedId}
              newTab={settings.openInNewTab}
              onSelect={setSelectedId}
              onEdit={(node) => (node.type === 'folder' ? setModal({ kind: 'folder', node }) : setModal({ kind: 'link', node }))}
              onRemove={del}
              onAdd={(folder, kind) => setModal({ kind, target: folder.id })}
              onMove={moveNode}
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
      </div>
    </>
  )
}
