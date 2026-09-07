import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen } from '@testing-library/react'
import { renderWithI18n, sampleTree } from './helpers'
import FolderTree from '../FolderTree'
import { LinkCard } from '../Cards'

/**
 * Device, viewport and motion.
 *
 * jsdom has no layout engine, so these assert on the source rather than on
 * computed geometry: the point is to catch a `vh` creeping back in or a
 * reduced-motion block being deleted, which is exactly how these regress.
 */

const src = (file: string) => readFileSync(resolve(__dirname, '..', file), 'utf8')

describe('viewport units', () => {
  it('sizes the page with dvh rather than vh', () => {
    const app = src('App.tsx')
    // `100vh` is measured against the viewport with the mobile URL bar
    // retracted, so a vh-sized layout runs under the browser chrome.
    expect(app).toContain('min-h-dvh')
    expect(app).not.toContain('min-h-screen')
  })

  it('sizes the modal with dvh too', () => {
    expect(src('Modal.tsx')).toContain('max-h-[88dvh]')
    expect(src('Modal.tsx')).not.toContain('max-h-[88vh]')
  })
})

describe('safe areas', () => {
  it('insets the page for notches and the home indicator', () => {
    const app = src('App.tsx')
    // Without these, content sits under the notch in landscape and under the
    // home indicator at the bottom.
    expect(app).toContain('env(safe-area-inset-left)')
    expect(app).toContain('env(safe-area-inset-right)')
    expect(app).toContain('env(safe-area-inset-bottom)')
  })

  it('never lets an inset shrink the designed gutter', () => {
    // `max()` of the two — on a device with no inset the gutter is unchanged.
    expect(src('App.tsx')).toContain('max(var(--page-gutter), env(safe-area-inset-left))')
  })

  it('opts into viewport-fit=cover so the insets report real values', () => {
    // Without this the browser letterboxes around the notch and every
    // `env(safe-area-inset-*)` above silently resolves to 0.
    const html = readFileSync(resolve(__dirname, '..', '..', 'index.html'), 'utf8')
    expect(html).toContain('viewport-fit=cover')
  })
})

describe('reduced motion', () => {
  const css = src('index.css')

  it('neutralizes animation and transition globally', () => {
    // SplitFlapText handles itself, but every Tailwind `transition-*` in the
    // app is unconditional and has to be covered in one place.
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
    expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
  })

  it('lets animations finish rather than freezing them mid-way', () => {
    // `animation: none` on a spinner reads as a hung page; a near-zero
    // duration jumps to the end state, which is the intent of the setting.
    expect(css).not.toMatch(/prefers-reduced-motion[\s\S]{0,400}animation:\s*none\s*!important/)
  })

  it('drops the shortcut card hover lift', () => {
    expect(css).toContain('.hover\\:-translate-y-0\\.5:hover')
  })
})

describe('forced colors', () => {
  it('drops the glass treatment in high-contrast mode', () => {
    const css = src('index.css')
    // Translucent washes and backdrop-filter stop separating surfaces once the
    // OS replaces the palette.
    expect(css).toContain('forced-colors: active')
    expect(css).toMatch(/backdrop-filter:\s*none\s*!important/)
  })

  it('keeps focus visible when the author ring color is discarded', () => {
    expect(src('index.css')).toMatch(/forced-colors[\s\S]{0,600}outline:\s*2px solid Highlight/)
  })
})

describe('touch targets', () => {
  // WCAG 2.2 (2.5.8) asks for at least 24x24 CSS px.
  it('gives tree row buttons a 24px hit area', () => {
    renderWithI18n(
      <FolderTree
        tree={sampleTree()}
        selectedId={null}
        newTab={false}
        editing
        onEdit={() => {}}
        onRemove={() => {}}
        onAdd={() => {}}
        onMove={() => {}}
        onMoveRequest={() => {}}
        onSelect={() => {}}
        rootLabel="Bookmarks"
        onAddRoot={() => {}}
      />
    )
    // `size-6` is 24px; the previous `p-1` around a 14px icon was ~22px.
    const del = screen.getByRole('button', { name: 'Delete Work' })
    expect(del.className).toContain('size-6')
  })

  it('gives shortcut card buttons a 24px hit area', () => {
    renderWithI18n(
      <LinkCard
        node={{ id: 's1', type: 'link', name: 'GitHub', url: 'https://github.com' }}
        editable
        editing
        onEdit={() => {}}
        onRemove={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'Edit GitHub' }).className).toContain('size-6')
  })
})

describe('logical properties', () => {
  it('uses direction-relative padding and positioning, not physical', () => {
    // `left`/`right`/`pl`/`pr` would not mirror under `dir="rtl"`. The
    // vendored tree is included: its expander margin was physical, which put
    // the chevron's gap on the wrong side in Arabic and Hebrew.
    const files = [
      'App.tsx', 'Cards.tsx', 'SearchBar.tsx', 'Clock.tsx', 'FolderTree.tsx',
      'Modal.tsx', 'components/kibo-ui/tree/index.tsx',
    ]
    for (const file of files) {
      const contents = src(file)
      // Match Tailwind's physical utilities as whole class tokens only, and
      // only inside a string, so prose in a comment can't trip it.
      const physical = contents.match(/["'\s](?:pl|pr|ml|mr)-\d[^\w-]/g)
      expect(physical, `${file} uses physical spacing utilities`).toBeNull()
    }
  })
})
