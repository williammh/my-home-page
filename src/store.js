import { useState, useEffect, useCallback } from 'react'
import { STATIC_SHORTCUTS } from './shortcuts'

const KEY = 'myhomepage.tree.v1'
const SHORTCUTS_KEY = 'myhomepage.shortcuts.v1'
const SETTINGS_KEY = 'myhomepage.settings.v1'
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

// Off-black, matching the old dark-theme page background (--background in
// index.css) — the default so white headline text has contrast out of the box.
export const DEFAULT_BACKGROUND_COLOR = '#090b0c'

export const DEFAULT_SETTINGS = {
  name: '',
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'long',
  backgroundImage: '',
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  textTheme: 'light',
  glass: true,
}

export const newFolder = (name, icon = 'folder') => ({
  id: uid(), type: 'folder', name, icon, children: [],
})
export const newLink = (name, url) => ({ id: uid(), type: 'link', name, url })

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Recursively insert `node` into the folder with id `parentId` (null = root). */
function insert(nodes, parentId, node) {
  if (parentId === null) return [...nodes, node]
  return nodes.map((n) => {
    if (n.id === parentId && n.type === 'folder') {
      return { ...n, children: [...n.children, node] }
    }
    if (n.type === 'folder') {
      return { ...n, children: insert(n.children, parentId, node) }
    }
    return n
  })
}

function remove(nodes, id) {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.type === 'folder' ? { ...n, children: remove(n.children, id) } : n))
}

function update(nodes, id, patch) {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch }
    if (n.type === 'folder') return { ...n, children: update(n.children, id, patch) }
    return n
  })
}

/** True if `id` is `targetId` itself, or `targetId` lies somewhere inside `id`'s subtree. */
function contains(node, targetId) {
  if (node.id === targetId) return true
  if (node.type !== 'folder') return false
  return node.children.some((c) => contains(c, targetId))
}

/** Move node `id` to be a child of the folder `targetId` (null = root). No-op if the move is invalid. */
function move(nodes, id, targetId) {
  if (id === targetId) return nodes
  const node = findPath(nodes, id)?.at(-1)
  if (!node) return nodes
  if (targetId !== null) {
    const target = findPath(nodes, targetId)?.at(-1)
    if (!target || target.type !== 'folder') return nodes
    if (contains(node, targetId)) return nodes
  }
  return insert(remove(nodes, id), targetId, node)
}

/** Path of folder nodes from root down to `id`, for breadcrumbs. */
export function findPath(nodes, id, trail = []) {
  for (const n of nodes) {
    if (n.id === id) return [...trail, n]
    if (n.type === 'folder') {
      const hit = findPath(n.children, id, [...trail, n])
      if (hit) return hit
    }
  }
  return null
}

export function useTree() {
  const [tree, setTree] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(tree))
    } catch {
      /* quota or disabled storage — keep working in memory */
    }
  }, [tree])

  return {
    tree,
    addNode: useCallback((parentId, node) => setTree((t) => insert(t, parentId, node)), []),
    removeNode: useCallback((id) => setTree((t) => remove(t, id)), []),
    updateNode: useCallback((id, patch) => setTree((t) => update(t, id, patch)), []),
    moveNode: useCallback((id, targetId) => setTree((t) => move(t, id, targetId)), []),
  }
}

function loadShortcuts() {
  try {
    const raw = localStorage.getItem(SHORTCUTS_KEY)
    if (!raw) return STATIC_SHORTCUTS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : STATIC_SHORTCUTS
  } catch {
    return STATIC_SHORTCUTS
  }
}

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState(loadShortcuts)

  useEffect(() => {
    try {
      localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts))
    } catch {
      /* quota or disabled storage — keep working in memory */
    }
  }, [shortcuts])

  return {
    shortcuts,
    addShortcut: useCallback((node) => setShortcuts((s) => [...s, node]), []),
    removeShortcut: useCallback((id) => setShortcuts((s) => s.filter((n) => n.id !== id)), []),
    updateShortcut: useCallback(
      (id, patch) => setShortcuts((s) => s.map((n) => (n.id === id ? { ...n, ...patch } : n))),
      []
    ),
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      /* quota or disabled storage — keep working in memory */
    }
  }, [settings])

  return {
    settings,
    updateSettings: useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []),
  }
}
