import { useState, useEffect, useRef } from 'react'
import { FolderPlusIcon, PlusIcon, ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import Clock from './Clock'
import SearchBar from './SearchBar'
import { LinkCard } from './Cards'
import FolderTree from './FolderTree'
import { FolderModal, LinkModal, SettingsModal } from './Modal'
import { Button } from '@/components/ui/button'
import { useTree, useShortcuts, useSettings, newFolder, newLink, parseImportedTree, countNodes } from './store'
import { headlineCls } from './textTheme'

const gridCls = 'grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3 max-[520px]:grid-cols-[repeat(auto-fill,minmax(94px,1fr))]'

export default function App() {
  const { tree, addNode, removeNode, updateNode, moveNode, importNodes } = useTree()
  const { shortcuts, addShortcut, removeShortcut, updateShortcut } = useShortcuts()
  const { settings, updateSettings } = useSettings()
  const [selectedId, setSelectedId] = useState(null)  // folder highlighted in the tree
  const [modal, setModal] = useState(null)             // {kind:'folder'|'link'|'settings', node?, target?, isShortcut?}
  const [query, setQuery] = useState('')
  const [note, setNote] = useState(null)   // {ok, text} import/export banner under the Bookmarks header
  const fileInputRef = useRef(null)

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

  const save = (data) => {
    if (modal.kind === 'settings') {
      updateSettings(data)
    } else if (modal.isShortcut) {
      if (modal.node) {
        updateShortcut(modal.node.id, data)
      } else {
        addShortcut(newLink(data.name, data.url))
      }
    } else if (modal.node) {
      updateNode(modal.node.id, data)
    } else if (modal.kind === 'folder') {
      addNode(modal.target ?? null, newFolder(data.name, data.icon))
    } else {
      addNode(modal.target ?? null, newLink(data.name, data.url))
    }
    setModal(null)
  }

  const del = (id) => {
    if (id === selectedId) setSelectedId(null)
    removeNode(id)
  }

  // Import a previously exported tree (the `myhomepage.tree.v1` shape) from a
  // JSON file. Everything is validated in `parseImportedTree`; here we only
  // deal with reading the file and reporting the outcome.
  const onImportFile = async (e) => {
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
      <div className="mx-auto flex h-screen max-w-[1080px] flex-col overflow-hidden px-6 py-[6vh]">
        <div className="shrink-0 pt-[14vh]">
          <Clock settings={settings} onOpenSettings={() => setModal({ kind: 'settings' })} />
          <SearchBar value={query} onChange={setQuery} />

          {(!trimmedQuery || matchedShortcuts.length > 0) && (
            <section className="mb-3">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${headlineCls(settings.textTheme)}`}>
                  Shortcuts
                </h3>
                {!trimmedQuery && (
                  <Button
                    variant="glass"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setModal({ kind: 'link', isShortcut: true })}
                  >
                    <PlusIcon /> Shortcut
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
                    newTab={settings.openInNewTab}
                    onEdit={(node) => setModal({ kind: 'link', node, isShortcut: true })}
                    onRemove={removeShortcut}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3.5 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${headlineCls(settings.textTheme)}`}>
              Bookmarks
            </h3>
            <div className="flex gap-2">
              <Button variant="glass" className="rounded-lg" onClick={() => setModal({ kind: 'folder', target: null })}>
                <FolderPlusIcon /> Folder
              </Button>
              <Button variant="glass" className="rounded-lg" onClick={() => setModal({ kind: 'link', target: null })}>
                <PlusIcon /> Bookmark
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
              onEdit={(node) => setModal({ kind: node.type, node })}
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
