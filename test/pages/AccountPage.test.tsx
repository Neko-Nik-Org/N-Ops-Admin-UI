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
/** Tests for src/pages/AccountPage.tsx (with UserDetailsCard, OrgInfoCard and the theme preference). */

import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { themeAtom } from '@/app/theme'
import { AccountPage } from '@/pages/AccountPage'
import { api, makeUser, renderWithProviders } from '../testUtils'

const orgInfo = {
  organization_id: 'org-123',
  organization_name: 'Acme',
  organization_info: { region: 'eu-west' },
  allocated_ai_credit: 100,
  utilized_ai_credit: 90,
  allocated_storage_bytes: 1024 ** 3,
  utilized_storage_bytes: 512 * 1024 ** 2,
  user_limit: 10,
  current_user_count: 4,
  server_limit: 50,
  workflow_limit: 20,
  ss_project_limit: 5,
  current_ss_project_count: 2,
  ss_keys_limit: 100,
  ss_notes_limit: 30,
  created_at: '2026-01-02T00:00:00Z',
}

describe('AccountPage', () => {
  it("shows the signed-in user's profile", () => {
    api.get.mockResolvedValue({ data: orgInfo })
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser({ isEmailVerified: false }) })
    expect(screen.getByText('Priya Rao')).toBeInTheDocument()
    expect(screen.getByText('priya')).toBeInTheDocument()
    expect(screen.getByText('priya@acme.dev')).toBeInTheDocument()
    expect(screen.getByText('Not verified')).toBeInTheDocument()
  })

  it('hides the profile when it is unknown (after a page reload)', () => {
    api.get.mockResolvedValue({ data: orgInfo })
    renderWithProviders(<AccountPage />, { route: '/account' })
    expect(screen.queryByRole('heading', { name: 'Profile' })).not.toBeInTheDocument()
  })

  it("shows the organization's details, usage and limits", async () => {
    api.get.mockResolvedValue({ data: orgInfo })
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })

    expect(await screen.findByText('org-123')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/self/org-info')
    expect(screen.getByText('Jan 2, 2026')).toBeInTheDocument()
    expect(screen.getByText('eu-west')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Users' })).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByRole('meter', { name: 'AI credits' })).toHaveAttribute('aria-valuenow', '90')
    expect(screen.getByRole('meter', { name: 'Storage' })).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText('512 MB')).toBeInTheDocument()
  })

  it('explains when the organization cannot be loaded', async () => {
    api.get.mockRejectedValue(new Error('Forbidden'))
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    expect(await screen.findByText("Couldn't load organization details: Forbidden")).toBeInTheDocument()
  })

  it('changes the theme preference', () => {
    api.get.mockResolvedValue({ data: orgInfo })
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    fireEvent.click(screen.getByRole('button', { name: 'Light theme' }))
    expect(store.get(themeAtom)).toBe('light')
    expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true')
  })
})
