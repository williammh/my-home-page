import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { Highlighted } from './highlight'
import { useI18n } from './i18n'
import type { LinkNode } from './types'

const favicon = (url: string) => {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
  } catch {
    return null
  }
}

// Shortcut cards are deliberately not `.glass`: the favicon and its label
// carry the tile on their own, and a panel behind each one turned the grid
// into a wall of boxes. What's left is a bare card that only picks up a wash
// of the foreground on hover, so the affordance survives without the surface.
// (The glass setting still governs the search bar, buttons and bookmarks.)
//
// Below 520px the grid is pinned to four columns, so a track can get down to
// roughly 66px on a small phone: the padding and minimum height come in to
// match, or the cards would be taller than they are wide and clip their label.
const cardBase =
  'group relative flex min-h-[108px] flex-col items-center justify-center gap-2.5 rounded-lg border border-transparent px-2.5 pb-[17px] pt-5 text-foreground no-underline transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5 hover:bg-foreground/10 max-[520px]:min-h-[86px] max-[520px]:gap-1.5 max-[520px]:px-1 max-[520px]:pb-2.5 max-[520px]:pt-3'

export function LinkCard({
  node,
  editable,
  editing,
  query,
  newTab,
  onEdit,
  onRemove,
}: {
  node: LinkNode
  editable?: boolean
  // When set, the edit/delete buttons stay visible without a hover — the
  // "Edit Shortcuts" toggle in App.tsx flips this for the whole grid at once.
  editing?: boolean
  query?: string
  newTab?: boolean
  onEdit: (node: LinkNode) => void
  onRemove: (id: string) => void
}) {
  const { t } = useI18n()
  const src = favicon(node.url)
  return (
    // `noreferrer` implies `noopener`, but both are spelled out: the opened
    // page must not get a handle on this one via `window.opener`.
    <a
      className={cardBase}
      href={node.url}
      title={node.url}
      {...(newTab && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      <div className="flex size-[34px] items-center justify-center">
        {src
          ? <img src={src} alt="" className="size-[30px] rounded-md" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          : null}
      </div>
      <span className="line-clamp-2 max-w-full text-center text-[12.5px] leading-tight text-ellipsis max-[520px]:text-[11px]">
        <Highlighted text={node.name} query={query} />
      </span>
      {editable && (
        <span
          className={`absolute end-[5px] top-[5px] flex gap-0.5 transition-opacity duration-150 group-hover:opacity-100 ${
            editing ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            title={t.edit}
            className="flex rounded-md bg-foreground/10 p-1 text-foreground backdrop-blur-sm transition-colors hover:bg-foreground/20 [&_svg]:size-[13px] [&_svg]:stroke-2"
            onClick={(e) => { e.preventDefault(); onEdit(node) }}
          ><PencilIcon /></button>
          <button
            title={t.delete}
            className="flex rounded-md bg-foreground/10 p-1 text-foreground backdrop-blur-sm transition-colors hover:bg-foreground/20 [&_svg]:size-[13px] [&_svg]:stroke-2"
            onClick={(e) => { e.preventDefault(); onRemove(node.id) }}
          ><TrashIcon /></button>
        </span>
      )}
    </a>
  )
}
