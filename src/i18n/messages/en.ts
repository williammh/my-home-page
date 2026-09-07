/**
 * The English message catalog — the source of truth for every user-facing
 * string in the app, and the template for translations.
 *
 * To add a language: copy this file to `<tag>.ts`, translate the values (never
 * the keys), and register it in ../index.ts. The `Messages` type is derived
 * from this object, so a translation missing a key — or inventing one — is a
 * type error rather than a string that silently renders as English.
 *
 * Values are either strings or functions. A function is used wherever the
 * sentence depends on a value: interpolation and plural forms are decided
 * inside the catalog, per language, rather than by the caller assembling
 * fragments — a caller that did `${n} ${t('items')}` would be imposing English
 * word order on every other language.
 */
const en = {
  // ── Greeting ──────────────────────────────────────────────────────────
  // Chosen by hour of day; see Greeting.tsx.
  greetingNight: 'Good night',
  greetingMorning: 'Good morning',
  greetingAfternoon: 'Good afternoon',
  greetingEvening: 'Good evening',

  // The salutation, with and without a name set. Kept as whole sentences so a
  // language can put the name first, add particles, or punctuate differently.
  // `name` arrives already trimmed.
  salutation: (greeting: string) => `${greeting}.`,
  salutationNamed: (greeting: string, name: string) => `${greeting}, ${name}.`,

  // ── Clock ─────────────────────────────────────────────────────────────
  // "It is {date} {time} {meridiem} {zone}." `zone` arrives already localized
  // and self-describing ("Eastern Time", «توقيت نيويورك»), so no preposition
  // is needed around it. The clock renders the time as
  // animated flip tiles, so the sentence is split around them: `clockBefore`
  // precedes the tiles, `clockAfter` follows. A language that needs the time
  // before the date can return an empty string from one and put everything in
  // the other — the tiles sit between the two, inline.
  clockBefore: (date: string) => `It is ${date}`,
  clockAfter: (meridiem: string, zone: string) => `${meridiem ? `${meridiem} ` : ''}${zone}.`,

  // ── Sections ──────────────────────────────────────────────────────────
  shortcuts: 'Shortcuts',
  bookmarks: 'Bookmarks',
  searchPlaceholder: 'Search bookmarks',
  clear: 'Clear',

  // ── Actions ───────────────────────────────────────────────────────────
  settings: 'Settings',
  edit: 'Edit',
  rename: 'Rename',
  delete: 'Delete',
  cancel: 'Cancel',
  save: 'Save',
  dismiss: 'Dismiss',
  import: 'Import',
  export: 'Export',
  addShortcut: 'Add shortcut',
  addFolder: 'Add folder',
  addLink: 'Add link',
  newFolder: 'New folder',
  newBookmark: 'New bookmark',
  editShortcuts: 'Edit shortcuts and bookmarks',
  doneEditingShortcuts: 'Done editing',
  dropToTopLevel: 'Drop here to move to top level',
  treeEmpty: 'Nothing here yet — add a folder or a bookmark.',
  // The query is quoted inside the message so a language can use its own
  // quotation marks — „so", «so» or 「so」 — rather than the ASCII pair.
  treeNoMatches: (query: string) => `No folders or bookmarks match "${query}".`,

  // ── Import / export notices ───────────────────────────────────────────
  // Plural forms live in the catalog: English needs two, and other languages
  // need anywhere from one to six. `Intl.PluralRules` picks the category, so a
  // translation returns the right form without the caller knowing the rules.
  importedItems: (n: number) => `Imported ${n} ${n === 1 ? 'item' : 'items'}.`,
  exportedItems: (n: number) => `Exported ${n} ${n === 1 ? 'item' : 'items'}.`,
  importEmpty: 'No bookmarks or folders found in that file.',
  importInvalid: "That file isn't valid JSON.",
  exportEmpty: 'Nothing to export yet.',

  // ── Folder / link modals ──────────────────────────────────────────────
  editFolder: 'Edit folder',
  editLink: 'Edit link',
  newLink: 'New link',
  fieldName: 'Name',
  fieldOptional: '(optional)',
  fieldIcon: 'Icon',
  fieldUrl: 'URL',
  folderNamePlaceholder: 'Work',
  urlPlaceholder: 'example.com',
  linkNamePlaceholder: 'Auto from URL',
  untitledFolder: 'Untitled folder',

  // ── Settings modal ────────────────────────────────────────────────────
  fieldYourName: 'Your name',
  fieldLanguage: 'Language',
  fieldTimeZone: 'Time zone',
  fieldDateFormat: 'Date format',
  fieldTextColor: 'Text color',
  fieldGlass: 'Glass effect',
  fieldOpenLinksIn: 'Open links in',
  fieldBackground: 'Background',
  // Shown as the first option in the language picker, and appended to the
  // detected language's name so it's clear what "automatic" resolves to.
  languageSystem: (language: string) => `System default (${language})`,
  textLight: 'Light',
  textDark: 'Dark',
  on: 'On',
  off: 'Off',
  sameTab: 'Same tab',
  newTab: 'New tab',
  backgroundNone: 'None',
  backgroundImage: 'Image',
  backgroundColor: 'Color',
  glassHint: 'Translucent, blurred surfaces for the clock, search bar and bookmarks.',
  openLinksHint: 'Applies to shortcuts and bookmarks. Ctrl/Cmd-click (or middle-click) still does the opposite.',
  chooseFromDevice: 'Choose from device',
  imageSelected: 'Image selected from this device',
  imageUrlPlaceholder: 'https://example.com/image.jpg',
  imageTooLarge: 'Image is too large (max 3MB).',
  resetToDefaults: 'Reset to defaults',
} as const

export type Messages = {
  // Mapped rather than `typeof en` directly: the `as const` above would
  // otherwise pin every string to its exact literal, so a translation would
  // have to return the English text to typecheck.
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : string
}

export default en as Messages
