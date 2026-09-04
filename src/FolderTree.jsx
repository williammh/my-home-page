import { useEffect, useRef, useState } from 'react'
import { getIcon } from './icons'
import { FolderPlusIcon, LinkIcon, PencilIcon, XMarkIcon, LinkIcon as LinkGlyph } from '@heroicons/react/24/outline'
import { Highlighted } from './highlight'
import {
  TreeProvider, TreeView, TreeNode, TreeNodeTrigger, TreeNodeContent,
  TreeExpander, TreeIcon, TreeLabel, TreeLines,
} from '@/components/kibo-ui/tree'

const DND_MIME = 'application/x-myhomepage-node-id'

/** Must match the `indent` given to TreeProvider below. */
const INDENT = 20

/** Height of one row (px): py-2 + a size-4 (20px line-height) label. */
const ROW_H = 36

/** ids of every node that matches `query` by name, plus all of their ancestors. */
function matchIds(nodes, query, ancestors = []) {
  const ids = new Set()
  for (const node of nodes) {
    const isMatch = node.name.toLowerCase().includes(query.toLowerCase())
    if (isMatch) {
      ids.add(node.id)
      ancestors.forEach((a) => ids.add(a))
    }
    if (node.type === 'folder' && node.children.length > 0) {
      const childIds = matchIds(node.children, query, [...ancestors, node.id])
      if (childIds.size > 0) {
        ids.add(node.id)
        ancestors.forEach((a) => ids.add(a))
      }
      childIds.forEach((id) => ids.add(id))
    }
  }
  return ids
}

/**
 * Keeps only the innermost pinned folder header stuck.
 *
 * A sticky row's range spans its whole subtree, so nesting alone leaves every
 * ancestor pinned at the top, stacked on each other. CSS can't express "yield
 * to a deeper row" — the parent has no way to know where the child starts —
 * so measure on scroll: whichever folder rows are currently pinned, keep the
 * deepest and release the rest by dropping them back to `position: static`,
 * which lets them scroll away normally.
 */
function useInnermostSticky(scrollRef, deps) {
  useEffect(() => {
    const panel = scrollRef.current?.closest('.scroll-themed')
    if (!panel) return

    const sync = () => {
      const top = panel.getBoundingClientRect().top
      const rows = [...panel.querySelectorAll('[data-folder-row]')]
      if (rows.length === 0) return

      // A pinned sticky row reports the panel top as its position, which makes
      // every pinned ancestor look identical. Drop them all to static first to
      // read each row's *natural* flow position, which is what says whether it
      // has scrolled past the top and which one is deepest.
      for (const el of rows) el.style.position = 'static'
      const natural = rows.map((el) => el.getBoundingClientRect().top - top)

      // Rows are in document order, so among those scrolled to/past the top,
      // the last one is the innermost folder currently being scrolled through.
      let winner = -1
      for (let i = 0; i < rows.length; i++) if (natural[i] <= 0) winner = i

      // Only that row sticks. Losers need an explicit `static`: clearing the
      // inline style would fall back to the `sticky` class and re-pin them.
      for (let i = 0; i < rows.length; i++)
        rows[i].style.position = i === winner ? 'sticky' : 'static'
    }

    sync()
    panel.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(panel)
    return () => {
      panel.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, deps)
}

function Row({ node, query, onEdit, onRemove, onAdd }) {
  const isFolder = node.type === 'folder'
  const hasChildren = isFolder && node.children.length > 0
  const Icon = isFolder ? getIcon(node.icon) : LinkGlyph

  return (
    <>
      <TreeExpander hasChildren={hasChildren} />
      <TreeIcon icon={<Icon className="size-4" />} hasChildren={hasChildren} />
      <TreeLabel><Highlighted text={node.name} query={query} /></TreeLabel>
      <span className="ml-2 hidden shrink-0 items-center gap-0.5 group-hover:flex">
        {isFolder && (
          <>
            <button
              title="Add folder"
              className="flex rounded-md p-1 text-muted-foreground hover:bg-border hover:text-foreground [&_svg]:size-3.5"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(node, 'folder') }}
            ><FolderPlusIcon /></button>
            <button
              title="Add link"
              className="flex rounded-md p-1 text-muted-foreground hover:bg-border hover:text-foreground [&_svg]:size-3.5"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(node, 'link') }}
            ><LinkIcon /></button>
          </>
        )}
        <button
          title={isFolder ? 'Rename' : 'Edit'}
          className="flex rounded-md p-1 text-muted-foreground hover:bg-border hover:text-foreground [&_svg]:size-3.5"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(node) }}
        ><PencilIcon /></button>
        <button
          title="Delete"
          className="flex rounded-md p-1 text-muted-foreground hover:bg-border hover:text-foreground [&_svg]:size-3.5"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(node.id) }}
        ><XMarkIcon /></button>
      </span>
    </>
  )
}

function Nodes({ nodes, parentId = null, level, query, visible, newTab, selectedId, onEdit, onRemove, onAdd, onMove, draggingId, dragOverId, setDragOverId, onDragging }) {
  const shown = query ? nodes.filter((n) => visible.has(n.id)) : nodes

  return shown.map((node, i) => {
    const isFolder = node.type === 'folder'
    const hasChildren = isFolder && node.children.length > 0
    const isLast = i === shown.length - 1
    // Dropping on a link row means "into the folder that link lives in", so a
    // bookmark can be filed without hitting the folder row itself.
    const dropTargetId = isFolder ? node.id : parentId
    // No highlight for a drop that wouldn't move anything: onto itself, or onto
    // a sibling link already in the same folder.
    const isNoop = draggingId === node.id || (!isFolder && draggingId !== null && nodes.some((n) => n.id === draggingId))
    const isDragOver = dragOverId === node.id && !isNoop

    const dragProps = {
      draggable: true,
      onDragStart: (e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData(DND_MIME, node.id)
        onDragging(node.id)
      },
      onDragEnd: () => onDragging(null),
      onDragOver: (e) => {
        if (!e.dataTransfer.types.includes(DND_MIME)) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        setDragOverId(node.id)
      },
      onDragLeave: (e) => {
        e.stopPropagation()
        setDragOverId((cur) => (cur === node.id ? null : cur))
      },
      onDrop: (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOverId(null)
        const draggedId = e.dataTransfer.getData(DND_MIME)
        if (draggedId && !isNoop) onMove(draggedId, dropTargetId)
      },
    }

    return (
      <TreeNode key={node.id} nodeId={node.id} level={level} isLast={isLast}>
        {isFolder ? (
          <TreeNodeTrigger
            // Sticky so the folder you're scrolling through keeps its header
            // in view. A parent's sticky range spans its whole subtree, so at
            // top:0 it would stay pinned under the child rather than handing
            // over. Pinning each level one row higher (-level * ROW_H) scrolls
            // the ancestor up and out of the panel exactly as the child's row
            // arrives at the top, so only the folder being scrolled is
            // visible. Deeper rows sit above ancestors during the handoff.
            data-folder-row={node.id}
            // Selection is marked with a data attribute so the stylesheet can
            // tint it opaquely; TreeNodeTrigger's own `bg-accent/80` is a
            // translucent background-color in Tailwind's `utilities` layer,
            // which beats any specificity in `components`, so it's overridden
            // by the inline backgroundColor below rather than by a CSS rule.
            data-selected={selectedId === node.id ? '' : undefined}
            className={`sticky folder-sticky ${
              isDragOver ? 'bg-primary/10 ring-1 ring-inset ring-primary' : ''
            }`}
            // TreeNodeTrigger spreads props after its own style, so passing
            // `style` here replaces its paddingLeft — restate the indent.
            style={{
              top: 0,
              zIndex: 10 + level,
              paddingLeft: level * INDENT + 8,
              // Inline beats the `utilities` cascade layer, keeping the row
              // opaque even when selected (see data-selected above).
              backgroundColor: 'var(--card)',
            }}
            {...dragProps}
          >
            <Row node={node} query={query} onEdit={onEdit} onRemove={onRemove} onAdd={onAdd} />
          </TreeNodeTrigger>
        ) : (
          <a
            href={node.url}
            title={node.url}
            className={`group relative mx-1 flex cursor-pointer items-center rounded-md px-3 py-2 no-underline transition-all duration-200 hover:bg-accent/50 ${
              isDragOver ? 'bg-primary/10 ring-1 ring-inset ring-primary' : ''
            }`}
            style={{ paddingLeft: level * 20 + 8 }}
            {...(newTab && { target: '_blank', rel: 'noopener noreferrer' })}
            {...dragProps}
          >
            <TreeLines />
            <Row node={node} query={query} onEdit={onEdit} onRemove={onRemove} onAdd={onAdd} />
          </a>
        )}
        {hasChildren && (
          <TreeNodeContent hasChildren={hasChildren}>
            <Nodes
              nodes={node.children}
              parentId={node.id}
              draggingId={draggingId}
              level={level + 1}
              query={query}
              visible={visible}
              newTab={newTab}
              selectedId={selectedId}
              onEdit={onEdit}
              onRemove={onRemove}
              onAdd={onAdd}
              onMove={onMove}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
              onDragging={onDragging}
            />
          </TreeNodeContent>
        )}
      </TreeNode>
    )
  })
}

/**
 * Renders the whole folder/link tree at once (kibo-ui Tree, expand-in-place)
 * instead of drilling into one folder at a time — so Clock/SearchBar/Shortcuts
 * above it never have to be hidden to show folder contents.
 *
 * When `query` is set, only matching nodes (and their ancestor folders) are
 * shown, matching folders are force-expanded, and the matched substring is
 * highlighted. Clearing the query reverts to the user's own expand/collapse
 * state.
 */
export default function FolderTree({ tree, query = '', selectedId, newTab, onEdit, onRemove, onAdd, onMove, onSelect }) {
  const trimmedQuery = query.trim()
  const visible = trimmedQuery ? matchIds(tree, trimmedQuery) : null
  const hasResults = !trimmedQuery || visible.size > 0
  const [dragOverId, setDragOverId] = useState(null)
  const [rootDragOver, setRootDragOver] = useState(false)
  const [dragging, setDragging] = useState(null)  // id of the node being dragged
  const rootRef = useRef(null)
  useInnermostSticky(rootRef, [tree, trimmedQuery])

  if (tree.length === 0) {
    return (
      <p className="my-3 rounded-xl border border-dashed border-border p-[34px] text-center text-sm text-muted-foreground">
        Nothing here yet — add a folder or a bookmark.
      </p>
    )
  }

  if (!hasResults) {
    return (
      <p className="my-3 rounded-xl border border-dashed border-border p-[34px] text-center text-sm text-muted-foreground">
        No folders or bookmarks match "{trimmedQuery}".
      </p>
    )
  }

  const rootDropProps = {
    onDragOver: (e) => {
      if (!e.dataTransfer.types.includes(DND_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setRootDragOver(true)
    },
    onDragLeave: (e) => {
      if (e.currentTarget.contains(e.relatedTarget)) return
      setRootDragOver(false)
    },
    onDrop: (e) => {
      e.preventDefault()
      setRootDragOver(false)
      const draggedId = e.dataTransfer.getData(DND_MIME)
      if (draggedId) onMove(draggedId, null)
    },
  }

  return (
    <TreeProvider
      // Remount on query change so search-driven auto-expand doesn't
      // fight with (and isn't left behind by) the user's manual toggles.
      key={trimmedQuery}
      defaultExpandedIds={trimmedQuery ? [...visible] : []}
      selectedIds={selectedId ? [selectedId] : []}
      onSelectionChange={(ids) => onSelect(ids[0] ?? null)}
      showLines
      indent={INDENT}
      animateExpand={!trimmedQuery}
    >
      <div ref={rootRef} {...rootDropProps} className="rounded-lg pb-3">
        <TreeView className="px-0 pt-3">
          <Nodes
            nodes={tree}
            level={0}
            query={trimmedQuery}
            visible={visible}
            newTab={newTab}
            selectedId={selectedId}
            onEdit={onEdit}
            onRemove={onRemove}
            onAdd={onAdd}
            onMove={onMove}
            draggingId={dragging}
            dragOverId={dragOverId}
            setDragOverId={setDragOverId}
            onDragging={setDragging}
          />
        </TreeView>
        {dragging !== null && (
          <div
            {...rootDropProps}
            title="Drop here to move to top level"
            className={`mx-1 mt-1 flex h-10 items-center justify-center rounded-md border border-dashed text-xs transition-colors ${
              rootDragOver ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            Drop here to move to top level
          </div>
        )}
      </div>
    </TreeProvider>
  )
}
