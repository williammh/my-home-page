// The salutation is derived from the hour in the *displayed* timezone, not the
// browser's — the clock below it reads in that zone, so a greeting from a
// different one would contradict it.
export function greetingFor(now: Date, timeZone: string) {
  const hour = Number(
    now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone })
  )
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 22) return 'Good evening'
  return 'Good night'
}
