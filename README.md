# my-home-page

Personal browser home page. React + Vite + vite-plugin-singlefile + Heroicons.
Builds to a **single self-contained `dist/index.html`** — no external files.

## Use

The built page is committed, so you don't need Node to use it. Download
[`dist/index.html`](dist/index.html) (on GitHub: open the file, then **Raw** →
save as), put it somewhere permanent, and point your browser's home page / new
tab at its `file://` path — e.g. `file:///home/you/my-home-page/index.html`.
It's fully self-contained, so that one file is all you need. Everything you add
lives in that browser profile's `localStorage`, so keep the file where it is
once you've set it (moving it changes the origin and hides your data).

Or clone and build it yourself:

```bash
npm run dev      # local dev server
npm run build    # -> dist/index.html
```

## Clock

Shows your name, the date, the time, and the timezone city — all editable via
the gear icon that appears on hover. Settings (name, timezone, date format)
are stored in `localStorage` (key `myhomepage.settings.v1`).

## Shortcuts

Default set is hardcoded in [`src/shortcuts.js`](src/shortcuts.js):

```js
export const SHORTCUTS = [
  'Label|https://example.com',   // explicit label
  'https://example.com',         // label auto-derived from the URL
]
```

That list only seeds `localStorage` (key `myhomepage.shortcuts.v1`) the first
time the page loads. After that, shortcuts are fully editable in the UI — add
one with the **Shortcut** button, hover a card for edit / delete. Editing
`shortcuts.js` later has no effect on a browser that's already seeded.

## Bookmarks

Folders and links are created in the UI and stored in `localStorage` (key
`myhomepage.tree.v1`):

- **Folder** / **Link** buttons (top of the section) add to the root level.
- Each folder row has its own add-folder / add-link buttons for adding directly
  inside it, plus edit and delete.
- The whole tree renders expanded in place — click a folder to expand or
  collapse it, no drilling into a separate view.
- Drag any bookmark or folder onto a folder to move it inside; drag it onto
  the "drop here to move to top level" zone (appears while dragging) to move
  it back to the root.

Deleting a folder deletes its contents.

## Search

Centered bar filters shortcuts and bookmarks by name as you type — it doesn't
navigate anywhere. Press `/` to focus, `Esc` to blur.
