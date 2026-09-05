import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { Highlighted } from './highlight'
import type { LinkNode } from './types'

const favicon = (url: string) => {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
  } catch {
    return null
  }
}

const cardBase =
  'glass glass-hover group relative flex min-h-[108px] flex-col items-center justify-center gap-2.5 rounded-lg px-2.5 pb-[17px] pt-5 text-foreground no-underline transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5'

export function LinkCard({
  node,
  editable,
  query,
  newTab,
  onEdit,
  onRemove,
}: {
  node: LinkNode
  editable?: boolean
  query?: string
  newTab?: boolean
  onEdit: (node: LinkNode) => void
  onRemove: (id: string) => void
}) {
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
      <span className="line-clamp-2 max-w-full text-center text-[12.5px] leading-tight text-ellipsis">
        <Highlighted text={node.name} query={query} />
      </span>
      {editable && (
        <span className="absolute right-[5px] top-[5px] flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            title="Edit"
            className="flex rounded-md bg-foreground/10 p-1 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-foreground/20 hover:text-foreground [&_svg]:size-[13px] [&_svg]:stroke-2"
            onClick={(e) => { e.preventDefault(); onEdit(node) }}
          ><PencilIcon /></button>
          <button
            title="Delete"
            className="flex rounded-md bg-foreground/10 p-1 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-foreground/20 hover:text-foreground [&_svg]:size-[13px] [&_svg]:stroke-2"
            onClick={(e) => { e.preventDefault(); onRemove(node.id) }}
          ><TrashIcon /></button>
        </span>
      )}
    </a>
  )
}
