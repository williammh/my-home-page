// ─────────────────────────────────────────────────────────────
//  YOUR SHORTCUTS — edit this array. Rebuild to apply.
//  Format: "https://url" | "Label|https://url"
// ─────────────────────────────────────────────────────────────
export const SHORTCUTS = [
  'GitHub|https://github.com',
  'Gmail|https://mail.google.com',
  'Proton|https://account.proton.me/mail',
  
  'Calendar|https://calendar.google.com',
 
  'ChatGPT|https://chat.openai.com',
  'Claude|https://claude.ai',
  'Gemini|https://gemini.google.com',
  'Grok|https://grok.com',

  'Maps|https://maps.google.com',
]

import type { LinkNode } from './types'

export function parseShortcut(entry: string, i: number): LinkNode {
  const idx = entry.indexOf('|')
  const hasLabel = idx > 0 && /^https?:\/\//i.test(entry.slice(idx + 1).trim())
  const url = (hasLabel ? entry.slice(idx + 1) : entry).trim()
  const name = (hasLabel ? entry.slice(0, idx).trim() : '') || url
  return { id: `default-${i}`, type: 'link', name, url }
}

export const STATIC_SHORTCUTS = SHORTCUTS.map(parseShortcut)
