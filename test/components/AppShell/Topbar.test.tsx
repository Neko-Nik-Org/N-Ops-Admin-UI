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
/** Tests for src/components/AppShell/Topbar.tsx: the brand and the sidebar collapse toggle it holds. */

import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sidebarCollapsedAtom } from '@/store/sidebar'
import { Topbar } from '@/components/AppShell/Topbar'
import { makeUser, renderWithProviders } from '../../testUtils'

const renderTopbar = () => renderWithProviders(<Topbar onMenuClick={() => {}} />, { user: makeUser() })

describe('Topbar', () => {
  it('shows the product name next to the logo', () => {
    renderTopbar()
    expect(screen.getByText('N-Ops')).toBeVisible()
  })

  it('collapses and expands the sidebar from one toggle', () => {
    const { store } = renderTopbar()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(store.get(sidebarCollapsedAtom)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(store.get(sidebarCollapsedAtom)).toBe(false)
  })
})
