// ─────────────────────────────────────────────────────────────
//  YOUR SHORTCUTS — edit this array. Rebuild to apply.
//  Format: "https://url" | "Label|https://url"
//
//  Emptying this is a supported state rather than a blank grid:
//  `DEFAULT_SHORTCUTS` below fills in for it.
// ─────────────────────────────────────────────────────────────
export const SHORTCUTS: string[] = []

// What a fresh load gets. Ten entries fills the grid at every breakpoint —
// and at the four-column floor below 520px, exactly two full rows.
export const DEFAULT_SHORTCUTS = [
  'Google|https://www.google.com',
  'YouTube|https://www.youtube.com',
  'Facebook|https://www.facebook.com',
  'Instagram|https://www.instagram.com',
  'ChatGPT|https://chat.openai.com',
  'Reddit|https://www.reddit.com',
  'Wikipedia|https://www.wikipedia.org',
  'X|https://x.com',
  'WhatsApp|https://web.whatsapp.com',
  'TikTok|https://www.tiktok.com',
]

import type { LinkNode } from './types'

export function parseShortcut(entry: string, i: number): LinkNode {
  const idx = entry.indexOf('|')
  const hasLabel = idx > 0 && /^https?:\/\//i.test(entry.slice(idx + 1).trim())
  const url = (hasLabel ? entry.slice(idx + 1) : entry).trim()
  const name = (hasLabel ? entry.slice(0, idx).trim() : '') || url
  return { id: `default-${i}`, type: 'link', name, url }
}

export const STATIC_SHORTCUTS = (SHORTCUTS.length ? SHORTCUTS : DEFAULT_SHORTCUTS).map(parseShortcut)
