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
/** Tests for src/pages/account/AccessCard.tsx. */

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AccessCard } from '@/pages/account/AccessCard'
import { api, makeUser, renderWithProviders } from '../../testUtils'

const tags = [
  { tag_id: 1, organization_id: 'o', tag_name: 'production', tag_description: '' },
  { tag_id: 2, organization_id: 'o', tag_name: 'staging', tag_description: '' },
]

describe('AccessCard', () => {
  it('shows permissions by group, tags, Linux users and approvals', async () => {
    api.get.mockResolvedValue({ data: tags })
    renderWithProviders(<AccessCard />, {
      user: makeUser({
        permissions: ['tag:create', 'user:role:view', 'future:thing'],
        tags: [2],
        allowedLinuxUsers: ['deploy'],
        canApproveApprovals: true,
        canBypassApprovals: false,
      }),
    })
    expect(screen.getByText('Create tags')).toHaveAttribute('title', 'tag:create')
    expect(screen.getByText('View roles')).toBeInTheDocument()
    expect(screen.getByText('future:thing')).toBeInTheDocument() // unknown to the catalog, shown raw
    expect(await screen.findByText('staging')).toBeInTheDocument()
    expect(screen.getByText('deploy')).toBeInTheDocument()
    expect(screen.getByText('Can approve requests')).toBeInTheDocument()
    expect(screen.queryByText('Skips approvals')).not.toBeInTheDocument()
  })

  it('says "All tags" and "Any" for an unrestricted user', () => {
    api.get.mockResolvedValue({ data: tags })
    renderWithProviders(<AccessCard />, {
      user: makeUser({ tags: [], allowedLinuxUsers: [], canApproveApprovals: false, canBypassApprovals: false }),
    })
    expect(screen.getByText('All tags')).toBeInTheDocument()
    expect(screen.getByText('Any')).toBeInTheDocument()
    expect(screen.getByText('Needs approval for sensitive actions')).toBeInTheDocument()
  })

  it('hides Linux users and approvals until the full profile has loaded', () => {
    api.get.mockResolvedValue({ data: [] })
    renderWithProviders(<AccessCard />, { user: makeUser() })
    expect(screen.getByText('Permissions')).toBeInTheDocument()
    expect(screen.queryByText('Linux users')).not.toBeInTheDocument()
  })
})
