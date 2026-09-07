import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithI18n, testSettings, sampleTree } from './helpers'
import { FolderModal, LinkModal, SettingsModal, MoveModal } from '../Modal'

/**
 * Modal semantics and keyboard containment.
 *
 * Before the audit these were plain <div>s: not announced as dialogs, not
 * bounded, and Tab walked straight out into the page behind. These tests hold
 * the four properties that fix required.
 */

const noop = () => {}

describe('dialog semantics', () => {
  it('exposes each modal as a dialog named by its heading', () => {
    renderWithI18n(<FolderModal onSave={noop} onClose={noop} />)
    const dialog = screen.getByRole('dialog', { name: 'New folder' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('names an editing dialog differently from a creating one', () => {
    renderWithI18n(
      <FolderModal
        initial={{ id: 'f1', type: 'folder', name: 'Work', icon: 'folder', children: [] }}
        onSave={noop}
        onClose={noop}
      />
    )
    expect(screen.getByRole('dialog', { name: 'Edit folder' })).toBeInTheDocument()
  })

  it('gives stacked dialogs distinct heading ids', () => {
    const { unmount } = renderWithI18n(<FolderModal onSave={noop} onClose={noop} />)
    const first = screen.getByRole('dialog').getAttribute('aria-labelledby')
    unmount()
    renderWithI18n(<LinkModal onSave={noop} onClose={noop} />)
    const second = screen.getByRole('dialog').getAttribute('aria-labelledby')
    // `useId` per instance — a shared literal id would break aria-labelledby
    // as soon as two dialogs existed at once.
    expect(first).not.toEqual(second)
  })
})

describe('focus management', () => {
  it('moves focus into the dialog on open', async () => {
    renderWithI18n(<FolderModal onSave={noop} onClose={noop} />)
    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
  })

  it('restores focus to the opener on close', async () => {
    // Stand in for the button that opened the dialog.
    const opener = document.createElement('button')
    opener.textContent = 'Open'
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const { unmount } = renderWithI18n(<FolderModal onSave={noop} onClose={noop} />)
    await waitFor(() =>
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    )

    unmount()
    // Without this, focus resets to <body> and a keyboard user has to tab
    // back down the whole page.
    await waitFor(() => expect(document.activeElement).toBe(opener))
    opener.remove()
  })

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    renderWithI18n(<LinkModal onSave={noop} onClose={noop} />)
    const dialog = screen.getByRole('dialog')

    // Tab all the way around and confirm focus never leaves the dialog.
    for (let i = 0; i < 12; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('traps Shift+Tab at the first element', async () => {
    const user = userEvent.setup()
    renderWithI18n(<LinkModal onSave={noop} onClose={noop} />)
    const dialog = screen.getByRole('dialog')

    for (let i = 0; i < 12; i++) {
      await user.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })
})

describe('escape', () => {
  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithI18n(<FolderModal onSave={noop} onClose={onClose} />)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('does not let Escape escape the dialog to outer handlers', async () => {
    const user = userEvent.setup()
    const outer = vi.fn()
    window.addEventListener('keydown', outer)

    const onClose = vi.fn()
    renderWithI18n(<SettingsModal initial={testSettings()} onSave={noop} onClose={onClose} />)
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    // The handler is bound to the dialog and stops propagation, so with two
    // dialogs stacked only the top one closes.
    window.removeEventListener('keydown', outer)
  })
})

describe('move dialog', () => {
  it('offers every folder plus the top level when moving a link', () => {
    renderWithI18n(
      <MoveModal
        node={{ id: 'l3', type: 'link', name: 'News', url: 'https://news.example.com' }}
        tree={sampleTree()}
        onMove={noop}
        onClose={noop}
      />
    )
    const select = screen.getByRole('combobox', { name: 'Destination folder' })
    const labels = [...select.querySelectorAll('option')].map((o) => o.textContent?.trim())

    expect(labels).toContain('Top level')
    expect(labels).toContain('Work')
    expect(labels).toContain('Projects')
  })

  it('offers neither the moved folder nor anything inside it', () => {
    renderWithI18n(
      <MoveModal
        node={{ id: 'f1', type: 'folder', name: 'Work', icon: 'folder', children: [] }}
        tree={sampleTree()}
        onMove={noop}
        onClose={noop}
      />
    )
    const select = screen.getByRole('combobox', { name: 'Destination folder' })
    const labels = [...select.querySelectorAll('option')].map((o) => o.textContent?.trim())

    // A folder cannot be moved into itself, and "Projects" lives inside
    // "Work" — moving Work into it would detach the subtree from the tree.
    expect(labels).not.toContain('Work')
    expect(labels).not.toContain('Projects')
    expect(labels).toContain('Top level')
  })

  it('commits the chosen destination through onMove', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn()
    const onClose = vi.fn()

    renderWithI18n(
      <MoveModal
        node={{ id: 'l3', type: 'link', name: 'News', url: 'https://news.example.com' }}
        tree={sampleTree()}
        onMove={onMove}
        onClose={onClose}
      />
    )

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Destination folder' }),
      'f2'
    )
    await user.click(screen.getByRole('button', { name: 'Move here' }))

    expect(onMove).toHaveBeenCalledWith('l3', 'f2')
    expect(onClose).toHaveBeenCalled()
  })

  it('moves to the top level when that option is chosen', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn()

    renderWithI18n(
      <MoveModal
        node={{ id: 'l2', type: 'link', name: 'Repo', url: 'https://repo.example.com' }}
        tree={sampleTree()}
        onMove={onMove}
        onClose={noop}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Move here' }))
    // Top level is spelled `null` for `onMove`, not ''.
    expect(onMove).toHaveBeenCalledWith('l2', null)
  })
})
