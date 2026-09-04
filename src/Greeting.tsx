import { headlineCls } from './textTheme'

export default function Greeting({ name, textTheme }: { name: string; textTheme?: string }) {
  if (!name) return null
  return (
    <div className={`mb-2 text-3xl font-medium tracking-wide ${headlineCls(textTheme)}`}>
      {name}
    </div>
  )
}
