// Headline text (greeting, date, clock, section labels) sits on the page
// background, which may be a photo or solid color — so its color follows
// `settings.textTheme` instead of the fixed `text-muted-foreground` used by
// text inside cards/modals, which sit on `--card` and stay theme-driven.
export function headlineCls(textTheme?: string) {
  return textTheme === 'dark' ? 'text-muted-foreground' : 'text-white/80'
}

export function headlineStrongCls(textTheme?: string) {
  return textTheme === 'dark' ? 'text-foreground' : 'text-white'
}
