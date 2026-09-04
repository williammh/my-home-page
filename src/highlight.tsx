/** Wrap the first case-insensitive occurrence of `query` in `text` with <mark>. */
export function Highlighted({ text, query }: { text: string; query?: string }) {
  if (!query) return text
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i === -1) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-primary/40 font-semibold text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}
