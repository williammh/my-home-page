import { TrashIcon, PencilIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { Menu } from '@base-ui/react/menu'
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
// The shared geometry every shortcut-grid tile needs — the real card here and
// the dashed "add shortcut" tile in App.tsx. Exported rather than copied: the
// two used to be two hand-typed copies of the same 19 classes (min-height,
// gap, padding and all three of the max-[520px] overrides), which is exactly
// the kind of thing that silently drifts the moment one of them is edited.
// Border, hover treatment and cursor are each tile's own — real cards get a
// solid hover wash, the add tile gets a dashed outline — so they're left out
// of the shared string for the two call sites to add.
export const cardBase =
  'relative flex min-h-[108px] flex-col items-center justify-center gap-2.5 rounded-lg px-2.5 pb-[17px] pt-5 text-foreground no-underline transition-colors duration-150 max-[520px]:min-h-[86px] max-[520px]:gap-1.5 max-[520px]:px-1 max-[520px]:pb-2.5 max-[520px]:pt-3'

export const cardIconSlotCls = 'flex size-[34px] items-center justify-center'
// `text-xs` (12px) is the smallest body text should go — the previous
// 12.5px/11px pair put the narrow-screen size under that floor. At 12px a
// two-line label needs ~30px against the narrow card's 24px budget, a few
// pixels more than before; `min-h-[86px]` on `cardBase` is a minimum; not a
// cap, so the card grows to fit exactly as it already does for any two-line
// label, rather than clipping.
export const cardLabelCls = 'line-clamp-2 max-w-full text-center text-xs leading-tight'

const cardActionCls =
  'flex size-6 items-center justify-center rounded-md bg-foreground/10 text-foreground backdrop-blur-sm transition-colors hover:bg-foreground/20 [&_svg]:size-[13px] [&_svg]:stroke-2'

const cardMenuItemCls =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-foreground/10 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground'

/**
 * The narrow-card replacement for the two-button pair: one trigger that opens
 * Edit/Delete as menu items instead of two overlaid icon buttons. Its trigger
 * is the same 24px visual size as a single card action button — the point is
 * fewer targets on the card, not bigger ones; Base UI's Menu still gives the
 * touch-sized, keyboard-reachable popup that a bare 24px box wouldn't have on
 * its own.
 */
function CardActionsMenu({
  node,
  onEdit,
  onRemove,
  t,
}: {
  node: LinkNode
  onEdit: (node: LinkNode) => void
  onRemove: (id: string) => void
  t: ReturnType<typeof useI18n>['t']
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        title={t.cardActions}
        aria-label={t.cardActionsNamed(node.name)}
        onClick={(e) => e.preventDefault()}
        className={cardActionCls}
      ><EllipsisHorizontalIcon /></Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-[60]">
          <Menu.Popup className="glass min-w-[9rem] rounded-lg p-1 shadow-lg outline-none">
            <Menu.Item className={cardMenuItemCls} onClick={() => onEdit(node)}>
              <PencilIcon />
              {t.edit}
            </Menu.Item>
            <Menu.Item className={cardMenuItemCls} onClick={() => onRemove(node.id)}>
              <TrashIcon />
              {t.delete}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

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
      className={`group border border-transparent ${cardBase} hover:-translate-y-0.5 hover:bg-foreground/10`}
      href={node.url}
      title={node.url}
      {...(newTab && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      <div className={cardIconSlotCls}>
        {src
          ? <img src={src} alt="" className="size-[30px] rounded-md" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          : null}
      </div>
      <span className={`${cardLabelCls} text-ellipsis`}>
        <Highlighted text={node.name} query={query} />
      </span>
      {editable && (
        <span
          // `group-focus-within` alongside `group-hover`: the controls are
          // revealed on hover for a mouse, but a keyboard user reaches them by
          // tabbing, and an `opacity-0` button is invisible while focused.
          className={`absolute end-[5px] top-[5px] flex gap-0.5 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
            editing ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Two 24px buttons cover most of a card at the 4-column floor
              below 520px — at a 66px card they ate 83% of the width, sitting
              directly over the label. Below that width a single overflow
              trigger takes their place; at 520px and up the pair from
              `cardActionCls` renders as before, where a 112px+ card has
              plenty of room for both. */}
          <span className="hidden max-[520px]:flex">
            <CardActionsMenu node={node} onEdit={onEdit} onRemove={onRemove} t={t} />
          </span>
          <span className="flex max-[520px]:hidden">
            <button
              type="button"
              // `title` is the mouse tooltip; `aria-label` is the accessible
              // name, and it names the shortcut rather than just the verb —
              // otherwise a screen reader reads a grid of "Edit, Edit, Edit".
              title={t.edit}
              aria-label={t.editNamed(node.name)}
              className={cardActionCls}
              onClick={(e) => { e.preventDefault(); onEdit(node) }}
            ><PencilIcon /></button>
            <button
              type="button"
              title={t.delete}
              aria-label={t.deleteNamed(node.name)}
              className={cardActionCls}
              onClick={(e) => { e.preventDefault(); onRemove(node.id) }}
            ><TrashIcon /></button>
          </span>
        </span>
      )}
    </a>
  )
}
