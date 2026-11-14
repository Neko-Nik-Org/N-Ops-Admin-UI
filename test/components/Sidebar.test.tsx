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
/** Tests for src/components/organisms/Sidebar.tsx: section order, groups and the collapsible rail. */

import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sidebar } from '@/components/organisms/Sidebar'
import { api, makeUser, renderWithProviders } from '../testUtils'

const renderSidebar = (route = '/') => {
  api.get.mockResolvedValue({ data: {} })
  return renderWithProviders(<Sidebar />, { route, user: makeUser() })
}

const nav = () => screen.getByRole('navigation')

describe('Sidebar', () => {
  it('lists the sections in order', () => {
    renderSidebar()
    const labels = within(nav())
      .getAllByRole('link')
      .concat(within(nav()).getAllByRole('button'))
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .map((el) => el.textContent?.replace(/\d+$/, '').trim())
    expect(labels).toEqual([
      'Overview',
      'Servers',
      'Tools',
      'Service management',
      'Vault',
      'Approvals',
      'Metrics',
      'Workflows',
      'Service logs',
      'Admin',
    ])
  })

  it('expands a group to show its pages', () => {
    renderSidebar()
    const vault = screen.getByRole('button', { name: 'Vault' })
    expect(vault).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Keys store' })).not.toBeInTheDocument()

    fireEvent.click(vault)
    expect(vault).toHaveAttribute('aria-expanded', 'true')
    for (const name of ['Keys store', 'Secure notes', 'Config files']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('opens the group that holds the current page', () => {
    renderSidebar('/admin/users')
    expect(screen.getByRole('button', { name: 'Admin' })).toHaveAttribute('aria-expanded', 'true')
    for (const name of ['Organization', 'Users', 'API keys', 'Roles']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('collapses to an icon rail and remembers it', () => {
    renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('title', 'Overview')
    expect(screen.queryByText('Overview')).not.toBeInTheDocument()
    expect(localStorage.getItem('nops-sidebar-collapsed')).toBe('true')

    // Clicking a group icon brings the full sidebar back with that group open
    fireEvent.click(screen.getByRole('button', { name: 'Vault' }))
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Keys store' })).toBeInTheDocument()
  })
})
