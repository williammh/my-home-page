import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithI18n, testSettings, sampleTree } from './helpers'
import { LinkCard } from '../Cards'
import SearchBar from '../SearchBar'
import Clock from '../Clock'
import FolderTree from '../FolderTree'
import { FolderModal, LinkModal, SettingsModal, MoveModal } from '../Modal'

/**
 * Automated WCAG scans.
 *
 * axe catches the mechanical violations — an unlabelled control, a broken
 * aria reference, a role missing a required property — across every screen,
 * including in a right-to-left locale where the markup is the same but the
 * direction is not. It is a floor, not a ceiling: the behavioural properties
 * (focus trapping, keyboard reachability) are covered by the other suites.
 */

const noop = () => {}

const screens = {
  'shortcut card': (
    <LinkCard
      node={{ id: 's1', type: 'link', name: 'GitHub', url: 'https://github.com' }}
      editable
      editing
      onEdit={noop}
      onRemove={noop}
    />
  ),
  'search bar': <SearchBar value="" onChange={noop} />,
  clock: <Clock settings={testSettings()} onOpenSettings={noop} />,
  'folder tree': (
    <FolderTree
      tree={sampleTree()}
      selectedId={null}
      newTab={false}
      editing
      onEdit={noop}
      onRemove={noop}
      onAdd={noop}
      onMove={noop}
      onMoveRequest={noop}
      onSelect={noop}
      rootLabel="Bookmarks"
      onAddRoot={noop}
    />
  ),
  'folder modal': <FolderModal onSave={noop} onClose={noop} />,
  'link modal': <LinkModal onSave={noop} onClose={noop} />,
  'settings modal': <SettingsModal initial={testSettings()} onSave={noop} onClose={noop} />,
  'move modal': (
    <MoveModal
      node={{ id: 'l3', type: 'link', name: 'News', url: 'https://news.example.com' }}
      tree={sampleTree()}
      onMove={noop}
      onClose={noop}
    />
  ),
}

describe('axe: left-to-right', () => {
  for (const [name, ui] of Object.entries(screens)) {
    it(`${name} has no violations`, async () => {
      const { container } = renderWithI18n(ui)
      expect(await axe(container)).toHaveNoViolations()
    })
  }
})

describe('axe: right-to-left', () => {
  // Same markup, `dir="rtl"` — this is where a hardcoded physical property or
  // a direction-dependent label mistake shows up.
  for (const [name, ui] of Object.entries(screens)) {
    it(`${name} has no violations in Arabic`, async () => {
      const { container } = renderWithI18n(ui, { locale: 'ar' })
      expect(await axe(container)).toHaveNoViolations()
    })
  }
})
