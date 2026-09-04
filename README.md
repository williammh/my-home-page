# my-home-page

Personal browser home page. React + Vite + vite-plugin-singlefile + Heroicons.
Builds to a **single self-contained `dist/index.html`** — no external files.

## Use

```bash
npm run dev      # local dev server
npm run build    # -> dist/index.html
```

Set `dist/index.html` as your browser's home page / new tab (point it at the
`file://` path, or drop it anywhere you can serve it from).

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
