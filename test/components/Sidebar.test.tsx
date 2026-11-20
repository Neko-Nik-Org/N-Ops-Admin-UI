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
import { secureStorage } from '@/lib/secureStorage'
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
    const admin = screen.getByRole('button', { name: 'Admin' })
    expect(admin).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Roles' })).not.toBeInTheDocument()

    fireEvent.click(admin)
    expect(admin).toHaveAttribute('aria-expanded', 'true')
    for (const name of ['Organization', 'Users', 'API keys', 'Roles', 'Tags', 'Audit logs']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('shows Vault as one link that stays active on every Vault tab', () => {
    renderSidebar('/vault/notes')
    const vault = screen.getByRole('link', { name: 'Vault' })
    expect(vault).toHaveAttribute('href', '/vault')
    expect(vault).toHaveAttribute('aria-current', 'page')
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
    // labels fade out rather than unmount (so the change animates); screen readers skip them
    expect(screen.getByText('Overview').closest('[aria-hidden]')).not.toBeNull()
    expect(secureStorage.getItem('nops-sidebar-collapsed')).toBe('true')
    // the rail shows only the logo; expanding happens from the top bar
    expect(screen.queryByRole('button', { name: 'Expand sidebar' })).not.toBeInTheDocument()
    expect(screen.getByText('N-Ops')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).not.toBeInTheDocument()

    // Clicking a group icon brings the full sidebar back with that group open
    fireEvent.click(screen.getByRole('button', { name: 'Admin' }))
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Roles' })).toBeInTheDocument()
  })
})
