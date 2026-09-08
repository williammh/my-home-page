import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

/**
 * App-level integration: no other suite renders the real `App`, so nothing
 * previously caught a control's visibility depending on unrelated state.
 * That's exactly what regressed here — "Add shortcut" used to require edit
 * mode, which was fine while the edit toggle sat right next to the shortcut
 * grid, but stopped making sense once the toggle moved down onto the
 * Bookmarks root row (see FolderTree.tsx): reaching "add" then meant turning
 * on editing somewhere else on the page first.
 */

beforeEach(() => {
  localStorage.clear()
})

describe('adding a shortcut', () => {
  it('is reachable without turning on edit mode', () => {
    render(<App />)
    // Not "Edit shortcuts and bookmarks" pressed — this is the resting state
    // a first-time visitor lands in.
    expect(screen.getByRole('button', { name: 'Edit shortcuts and bookmarks' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: 'Add shortcut' })).toBeInTheDocument()
  })

  it('still shows Add shortcut once edit mode is toggled on', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Edit shortcuts and bookmarks' }))
    expect(screen.getByRole('button', { name: 'Add shortcut' })).toBeInTheDocument()
  })

  it('opens the new-shortcut dialog on click, independent of edit mode', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add shortcut' }))
    expect(await screen.findByRole('dialog', { name: 'New bookmark' })).toBeInTheDocument()
  })
})
