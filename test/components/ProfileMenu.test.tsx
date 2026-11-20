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

/** Tests for src/components/molecules/ProfileMenu.tsx. */

import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProfileMenu } from '@/components/molecules/ProfileMenu'
import { getSessionToken } from '@/features/auth/store/sessionToken'
import { api, makeUser, renderWithProviders } from '../testUtils'

describe('ProfileMenu', () => {
  it('shows who is signed in and links to the account page', () => {
    renderWithProviders(<ProfileMenu />, { user: makeUser() })
    fireEvent.click(screen.getByRole('button', { name: 'Profile: Priya Rao' }))
    const menu = screen.getByRole('menu', { name: 'Profile' })
    expect(menu).toHaveTextContent('@priya · Acme')

    fireEvent.click(screen.getByRole('menuitem', { name: 'Account' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/account')
  })

  it('stays signed in when the sign-out is cancelled', async () => {
    renderWithProviders(<ProfileMenu />, { user: makeUser() })
    fireEvent.click(screen.getByRole('button', { name: 'Profile: Priya Rao' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sign out?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('signs out after confirming and returns to the login page', async () => {
    api.post.mockResolvedValue({ data: {} })
    api.delete.mockResolvedValue({ data: {} })
    renderWithProviders(<ProfileMenu />, { user: makeUser() })
    fireEvent.click(screen.getByRole('button', { name: 'Profile: Priya Rao' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    // Nothing happens until the dialog is confirmed
    const dialog = await screen.findByRole('dialog', { name: 'Sign out?' })
    expect(api.post).not.toHaveBeenCalled()
    expect(api.delete).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByTestId('location', {}, { timeout: 2000 })).toHaveTextContent('/login')
    expect(getSessionToken()).toBeUndefined()
  })
})
