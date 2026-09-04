import { useState } from 'react'
import { getIcon } from './icons'
import { FolderPlusIcon, LinkIcon, PencilIcon, XMarkIcon, LinkIcon as LinkGlyph } from '@heroicons/react/24/outline'
import { Highlighted } from './highlight'
import {
  TreeProvider, TreeView, TreeNode, TreeNodeTrigger, TreeNodeContent,
  TreeExpander, TreeIcon, TreeLabel, TreeLines,
} from '@/components/kibo-ui/tree'

const DND_MIME = 'application/x-myhomepage-node-id'

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

function Nodes({ nodes, level, query, visible, onEdit, onRemove, onAdd, onMove, dragOverId, setDragOverId, onDragging }) {
  const shown = query ? nodes.filter((n) => visible.has(n.id)) : nodes

  return shown.map((node, i) => {
    const isFolder = node.type === 'folder'
    const hasChildren = isFolder && node.children.length > 0
    const isLast = i === shown.length - 1
    const isDragOver = isFolder && dragOverId === node.id

    const dragProps = {
      draggable: true,
      onDragStart: (e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData(DND_MIME, node.id)
        onDragging(true)
      },
      onDragEnd: () => onDragging(false),
      ...(isFolder && {
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
          if (draggedId) onMove(draggedId, node.id)
        },
      }),
    }

    return (
      <TreeNode key={node.id} nodeId={node.id} level={level} isLast={isLast}>
        {isFolder ? (
          <TreeNodeTrigger
            className={isDragOver ? 'bg-primary/10 ring-1 ring-inset ring-primary' : undefined}
            {...dragProps}
          >
            <Row node={node} query={query} onEdit={onEdit} onRemove={onRemove} onAdd={onAdd} />
          </TreeNodeTrigger>
        ) : (
          <a
            href={node.url}
            title={node.url}
            className="group relative mx-1 flex cursor-pointer items-center rounded-md px-3 py-2 no-underline transition-all duration-200 hover:bg-accent/50"
            style={{ paddingLeft: level * 20 + 8 }}
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
              level={level + 1}
              query={query}
              visible={visible}
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
export default function FolderTree({ tree, query = '', selectedId, onSelect, onEdit, onRemove, onAdd, onMove }) {
  const trimmedQuery = query.trim()
  const visible = trimmedQuery ? matchIds(tree, trimmedQuery) : null
  const hasResults = !trimmedQuery || visible.size > 0
  const [dragOverId, setDragOverId] = useState(null)
  const [rootDragOver, setRootDragOver] = useState(false)
  const [dragging, setDragging] = useState(false)

  if (tree.length === 0) {
    return (
      <p className="m-0 rounded-xl border border-dashed border-border p-[34px] text-center text-sm text-muted-foreground">
        Nothing here yet — add a folder or a bookmark.
      </p>
    )
  }

  if (!hasResults) {
    return (
      <p className="m-0 rounded-xl border border-dashed border-border p-[34px] text-center text-sm text-muted-foreground">
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
      indent={20}
      animateExpand={!trimmedQuery}
    >
      <div {...rootDropProps} className="rounded-lg">
        <TreeView className="p-0">
          <Nodes
            nodes={tree}
            level={0}
            query={trimmedQuery}
            visible={visible}
            onEdit={onEdit}
            onRemove={onRemove}
            onAdd={onAdd}
            onMove={onMove}
            dragOverId={dragOverId}
            setDragOverId={setDragOverId}
            onDragging={setDragging}
          />
        </TreeView>
        {dragging && (
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
