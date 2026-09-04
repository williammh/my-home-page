import { useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)

  // "/" focuses search, the way it works most everywhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== ref.current) {
        e.preventDefault()
        ref.current?.focus()
      }
      if (e.key === 'Escape') ref.current?.blur()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <form className="relative mb-11" onSubmit={(e) => e.preventDefault()}>
      <MagnifyingGlassIcon className="pointer-events-none absolute left-[18px] top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search shortcuts and bookmarks, or press /"
        spellCheck="false"
        autoComplete="off"
        className="glass glass-focus w-full rounded-lg py-[15px] pl-[50px] pr-11 text-base text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-150"
      />
      {value && (
        <button
          type="button"
          title="Clear"
          onClick={() => { onChange(''); ref.current?.focus() }}
          className="absolute right-[14px] top-1/2 flex -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground [&_svg]:size-4"
        ><XMarkIcon /></button>
      )}
    </form>
  )
}
