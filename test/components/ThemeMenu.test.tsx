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

/** Tests for src/components/ThemeMenu.tsx. */

import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThemeMenu } from '@/components/ThemeMenu'
import { renderWithProviders } from '../testUtils'

describe('ThemeMenu', () => {
  it('opens a menu and switches the theme', () => {
    renderWithProviders(<ThemeMenu />)
    const trigger = screen.getByRole('button', { name: /^Theme:/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByRole('menu', { name: 'Theme' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Light' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Theme: Light' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Theme: Light' }))
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
  })

  it('closes on Escape and on an outside click', () => {
    renderWithProviders(<ThemeMenu />)
    fireEvent.click(screen.getByRole('button', { name: /^Theme:/ }))
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Theme:/ }))
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
