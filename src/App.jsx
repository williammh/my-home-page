import { useState, useEffect } from 'react'
import { FolderPlusIcon, PlusIcon } from '@heroicons/react/24/outline'
import Clock from './Clock'
import SearchBar from './SearchBar'
import { LinkCard } from './Cards'
import FolderTree from './FolderTree'
import { FolderModal, LinkModal, SettingsModal } from './Modal'
import { Button } from '@/components/ui/button'
import { useTree, useShortcuts, useSettings, newFolder, newLink } from './store'
import { headlineCls } from './textTheme'

const gridCls = 'grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3 max-[520px]:grid-cols-[repeat(auto-fill,minmax(94px,1fr))]'

export default function App() {
  const { tree, addNode, removeNode, updateNode, moveNode } = useTree()
  const { shortcuts, addShortcut, removeShortcut, updateShortcut } = useShortcuts()
  const { settings, updateSettings } = useSettings()
  const [selectedId, setSelectedId] = useState(null)  // folder highlighted in the tree
  const [modal, setModal] = useState(null)             // {kind:'folder'|'link'|'settings', node?, target?, isShortcut?}
  const [query, setQuery] = useState('')

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
                <PlusIcon /> Link
              </Button>
            </div>
          </div>

          <div className="glass glass-panel min-h-0 flex-1 overflow-y-auto rounded-lg p-3">
            <FolderTree
              tree={tree}
              query={query}
              selectedId={selectedId}
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
