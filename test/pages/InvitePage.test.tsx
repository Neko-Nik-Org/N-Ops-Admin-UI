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
/** Tests for src/pages/InvitePage.tsx (with InviteForm). */

import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getSessionToken } from '@/features/auth/store/sessionToken'
import { InvitePage } from '@/pages/InvitePage'
import { api, renderWithProviders } from '../testUtils'

const details = {
  inviterName: 'arjun',
  organizationName: 'Acme',
  role: 'Operator',
  tags: ['production', 'staging'],
  email: 'new@acme.dev',
}

const renderInvite = () => renderWithProviders(<InvitePage />, { route: '/invite/abc123', path: '/invite/:token' })

describe('InvitePage', () => {
  it("shows the invite: who, where, role, tags and email", async () => {
    api.get.mockResolvedValue({ data: details })
    renderInvite()

    expect(await screen.findByRole('heading', { name: 'Join Acme' })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/invite/abc123')
    expect(screen.getByText('Operator')).toBeInTheDocument()
    expect(screen.getByText('production')).toBeInTheDocument()
    expect(screen.getByText('staging')).toBeInTheDocument()
    expect(screen.getByText('new@acme.dev')).toBeInTheDocument()
  })

  it('explains when the invite cannot be loaded', async () => {
    api.get.mockRejectedValue(new Error('Not Found'))
    renderInvite()
    expect(await screen.findByRole('heading', { name: "This invite isn't available" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })

  it('validates the form', async () => {
    api.get.mockResolvedValue({ data: details })
    renderInvite()
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument()
    expect(screen.getByText('Create a password.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('creates the account, signs in and goes to the dashboard', async () => {
    api.get.mockResolvedValue({ data: details })
    api.post.mockResolvedValue({ data: { is_2fa_required: false, session_id: 'new-session', data: { permissions: [], tags: [] } } })
    renderInvite()

    fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'New Person' } })
    fireEvent.change(screen.getByLabelText('Create a password'), { target: { value: 'a long passphrase' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByTestId('location', {}, { timeout: 2000 })).toHaveTextContent(/^\/$/)
    expect(api.post).toHaveBeenCalledWith('/invite/abc123/accept', { full_name: 'New Person', password: 'a long passphrase' })
    expect(getSessionToken()).toBe('new-session')
  })

  it('explains when accepting is not supported yet', async () => {
    api.get.mockResolvedValue({ data: details })
    api.post.mockRejectedValue(new Error('Not Found'))
    renderInvite()

    fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'New Person' } })
    fireEvent.change(screen.getByLabelText('Create a password'), { target: { value: 'a long passphrase' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText(/Accepting invites isn't available on the server yet/)).toBeInTheDocument()
    expect(getSessionToken()).toBeUndefined()
  })
})
