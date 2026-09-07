import type { ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { I18nProvider } from '../i18n'
import type { Settings, TreeNode } from '../types'

/** Settings a test can start from and override piecemeal. */
export const testSettings = (patch: Partial<Settings> = {}): Settings => ({
  name: '',
  locale: 'en',
  timeZone: 'America/New_York',
  dateFormat: 'long',
  backgroundImage: '',
  backgroundColor: '#090b0c',
  textTheme: 'light',
  glass: true,
  openInNewTab: false,
  ...patch,
})

/**
 * Render inside an I18nProvider, since every component in the app calls
 * `useI18n` and throws without one.
 *
 * `locale` and `timeZone` are parameters rather than fixed: the whole point of
 * several of these tests is that the same component behaves correctly in
 * Japanese, in Arabic, and in a timezone that isn't the machine's.
 */
export function renderWithI18n(
  ui: ReactElement,
  {
    locale = 'en',
    timeZone = 'America/New_York',
    ...options
  }: RenderOptions & { locale?: string; timeZone?: string } = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <I18nProvider locale={locale} timeZone={timeZone}>
        {children}
      </I18nProvider>
    ),
    ...options,
  })
}

/** A small tree with a nested folder, for tree and move tests. */
export const sampleTree = (): TreeNode[] => [
  {
    id: 'f1',
    type: 'folder',
    name: 'Work',
    icon: 'folder',
    children: [
      { id: 'l1', type: 'link', name: 'Docs', url: 'https://docs.example.com' },
      {
        id: 'f2',
        type: 'folder',
        name: 'Projects',
        icon: 'folder',
        children: [
          { id: 'l2', type: 'link', name: 'Repo', url: 'https://repo.example.com' },
        ],
      },
    ],
  },
  { id: 'l3', type: 'link', name: 'News', url: 'https://news.example.com' },
]
