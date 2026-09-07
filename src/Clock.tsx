import { useState, useEffect, useRef } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import SplitFlapText from './components/SplitFlapText'
import { greetingFor } from './Greeting'
import { DATE_FORMATS, DEFAULT_DATE_FORMAT } from './dateFormats'
import { headlineCls, headlineStrongCls } from './textTheme'
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

  // The meridiem is split off the flap board deliberately: it changes twice a
  // day, so flipping it alongside the seconds reads as noise, and as two more
  // tiles it made "AM"/"PM" look like part of the number. It's set as ordinary
  // sentence text below instead.
  const clockParts = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone,
  }).split(' ')
  const time = clockParts[0]
  const meridiem = clockParts[1] ?? ''
  const date = now.toLocaleDateString('en-US', { ...dateFormat.options, timeZone })
  const tzLabel = (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ')
  const greeting = greetingFor(now, timeZone)

  // SplitFlapText animates between the two phrases in `words` — feed it
  // [previous tick, current tick] so each change flips instead of snapping,
  // then remember this tick as "previous" for next time.
  const words = [prevTime.current ?? time, time]
  useEffect(() => {
    prevTime.current = time
  }, [time])

  const name = settings.name.trim()

  return (
    <div className="relative mb-8">
      <button
        type="button"
        title="Settings"
        onClick={onOpenSettings}
        className="absolute -right-1 top-0 flex rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-foreground/10 hover:text-foreground [&_svg]:size-4"
      ><Cog6ToothIcon /></button>

      {/* Salutation — the one piece of the header that's about the reader, so
          it carries the weight; the clock sentence underneath is supporting. */}
      <h1 className={`text-[clamp(28px,5vw,44px)] font-semibold leading-[1.1] tracking-tight ${headlineStrongCls(settings.textTheme)}`}>
        {greeting}
        {name ? <>, <span className="font-normal">{name}</span></> : null}.
      </h1>

      {/* "It is {date} {time} in {timezone}." — one sentence, with the flip
          tiles set inline so the clock reads as part of the line rather than
          as a separate widget. `items-baseline` + `flex-wrap` keeps the words
          on the text baseline and lets the sentence wrap on narrow screens
          without the tiles overflowing. */}
      <p className={`mt-2.5 flex flex-wrap items-baseline gap-x-[0.4em] gap-y-1.5 text-[clamp(13px,1.7vw,17px)] leading-snug ${headlineCls(settings.textTheme)}`}>
        <span>It is {date}</span>
        <SplitFlapText
          words={words}
          loop={false}
          cycleDelay={40}
          padTo={time.length}
          flipDuration={0.12}
          stagger={0.04}
          // The tiles are set as plain text inside the sentence (see
          // `.clock-flaps` in SplitFlapText.css), so the board's card props —
          // tile color, radius, its own font — don't apply; the digits inherit
          // color and type from the paragraph.
          className="clock-flaps"
          gap={0}
          fontSize="1em"
        />
        <span className="-ml-[0.15em]">{meridiem && `${meridiem} `}in {tzLabel}.</span>
      </p>
    </div>
  )
}
