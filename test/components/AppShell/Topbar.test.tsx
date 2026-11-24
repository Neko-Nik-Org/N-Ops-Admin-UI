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
/** Tests for src/components/AppShell/Topbar.tsx: the sidebar controls it takes over when the sidebar is collapsed. */

import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sidebarCollapsedAtom } from '@/store/sidebar'
import { Topbar } from '@/components/AppShell/Topbar'
import { makeUser, renderWithProviders } from '../../testUtils'

const renderTopbar = () => renderWithProviders(<Topbar onMenuClick={() => {}} />, { user: makeUser() })

describe('Topbar', () => {
  it('keeps the sidebar controls hidden while the sidebar is open', () => {
    renderTopbar()
    // kept on the page (so it can slide in) but hidden from screen readers and keyboard
    expect(screen.queryByRole('button', { name: 'Expand sidebar' })).not.toBeInTheDocument()
    expect(screen.getByText('N-Ops').closest('[aria-hidden]')).not.toBeNull()
  })

  it('shows the product name and the expand button while the sidebar is collapsed', () => {
    const { store } = renderTopbar()
    act(() => store.set(sidebarCollapsedAtom, true))
    expect(screen.getByText('N-Ops').closest('[aria-hidden]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(store.get(sidebarCollapsedAtom)).toBe(false)
    expect(screen.getByText('N-Ops').closest('[aria-hidden]')).not.toBeNull()
  })
})
