/*
 * Copyright (C) 2026 Neko Nik <nikhil@nekonik.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */
/** Tests for src/components/Dialog.tsx: a modal that stays out of the browser's top layer. */

import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from '@/components/Dialog'

let root: HTMLDivElement

beforeEach(() => {
  root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
})
afterEach(() => root.remove())

const Stacked = () => {
  const [inner, setInner] = useState(false)
  return (
    <Dialog open title="Outer" onClose={() => {}}>
      <button type="button" onClick={() => setInner(true)}>
        Open inner
      </button>
      <Dialog open={inner} title="Inner" onClose={() => setInner(false)}>
        <p>inner body</p>
      </Dialog>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('renders outside the app, with no native <dialog>, and makes the app inert while open', () => {
    const { rerender } = render(
      <Dialog open title="Hello" onClose={() => {}}>
        <p>body</p>
      </Dialog>,
      { container: root },
    )
    const dialog = screen.getByRole('dialog', { name: 'Hello' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(root.contains(dialog)).toBe(false)
    expect(document.querySelector('dialog')).toBeNull()
    expect(root.inert).toBe(true)
    expect(dialog).toHaveFocus()

    rerender(
      <Dialog open={false} title="Hello" onClose={() => {}}>
        <p>body</p>
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(root.inert).toBe(false)
  })

  it('closes on Escape, the backdrop and the close button, but not a click inside', () => {
    const onClose = vi.fn()
    render(
      <Dialog open title="Hello" onClose={onClose}>
        <p>body</p>
      </Dialog>,
      { container: root },
    )
    fireEvent.mouseDown(screen.getByText('body'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('keeps only the newest of stacked dialogs interactive', () => {
    render(<Stacked />, { container: root })
    fireEvent.click(screen.getByRole('button', { name: 'Open inner' }))
    const outer = screen.getByRole('dialog', { name: 'Outer' }).parentElement!
    const inner = screen.getByRole('dialog', { name: 'Inner' }).parentElement!
    expect(outer.inert).toBe(true)
    expect(inner.inert).toBe(false)

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Inner' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Inner' })).not.toBeInTheDocument()
    expect(outer.inert).toBe(false)
    expect(root.inert).toBe(true)
  })
})
