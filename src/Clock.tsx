import { useState, useEffect, useRef } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import SplitFlapText from './components/SplitFlapText'
import Greeting from './Greeting'
import { DATE_FORMATS, DEFAULT_DATE_FORMAT } from './dateFormats'
import { headlineCls } from './textTheme'
import type { Settings } from './types'

export default function Clock({ settings, onOpenSettings }: { settings: Settings; onOpenSettings: () => void }) {
  const [now, setNow] = useState(() => new Date())
  const prevTime = useRef<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeZone = settings.timeZone
  const dateFormat = DATE_FORMATS[settings.dateFormat] ?? DATE_FORMATS[DEFAULT_DATE_FORMAT]

  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone,
  })
  const date = now.toLocaleDateString('en-US', { ...dateFormat.options, timeZone })
  const tzLabel = (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ')

  // SplitFlapText animates between the two phrases in `words` — feed it
  // [previous tick, current tick] so each change flips instead of snapping,
  // then remember this tick as "previous" for next time.
  const words = [prevTime.current ?? time, time]
  useEffect(() => {
    prevTime.current = time
  }, [time])

  return (
    <div className="group/clock relative mb-7 text-center">
      <button
        type="button"
        title="Settings"
        onClick={onOpenSettings}
        className="absolute right-0 top-0 flex rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-foreground/10 hover:text-foreground group-hover/clock:opacity-100 [&_svg]:size-4"
      ><Cog6ToothIcon /></button>
      <Greeting name={settings.name} textTheme={settings.textTheme} />
      <div className={`mb-2.5 text-lg ${headlineCls(settings.textTheme)}`}>{date}</div>
      <div className="flex justify-center">
        <SplitFlapText
          words={words}
          loop={false}
          cycleDelay={40}
          padTo={time.length}
          flipDuration={0.12}
          stagger={0.04}
          className={settings.glass ? 'split-flap-text--glass' : ''}
          tileColor="var(--card)"
          textColor="var(--foreground)"
          tileRadius={10}
          gap={6}
          fontSize="clamp(20px,4vw,36px)"
          style={{ fontFamily: 'var(--font-sans)', fontWeight: 400 }}
        />
        <span className={`ml-2 self-center text-xs font-medium ${headlineCls(settings.textTheme)}`}>{tzLabel}</span>
      </div>
    </div>
  )
}
