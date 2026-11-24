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
/** Tests for src/pages/auth/invite/index.tsx (with InviteForm). */

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InvitePage } from '@/pages/auth/invite'
import { ApiError } from '@/types/api'
import { api, renderWithProviders } from '../../../testUtils'

const CODE = btoa(JSON.stringify({ email: 'new@acme.dev', invitation_code: 'abc123', invited_by: 'Arjun', org_name: 'Acme' }))

const renderInvite = (code: string | null = CODE) =>
  renderWithProviders(<InvitePage />, {
    route: code === null ? '/invite' : `/invite?code=${code}`,
    path: '/invite',
  })

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }))

/** Fills steps 1 and 2 and moves on to the first optional step. */
const fillRequired = async () => {
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'New Person' } })
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'newperson' } })
  next()
  fireEvent.change(await screen.findByLabelText('Create a password'), { target: { value: 'Start#Pass1' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Start#Pass1' } })
  next()
  await screen.findByLabelText('Job title')
}

/** From an optional step, jumps to the last one and creates the account. */
const finish = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Skip the optional details' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
}

describe('InvitePage', () => {
  it('shows who invited you, where, and your email, from the link alone', async () => {
    renderInvite()
    expect(await screen.findByRole('heading', { name: 'Join Acme' })).toBeInTheDocument()
    expect(screen.getByText('Arjun')).toBeInTheDocument()
    const email = screen.getByLabelText('Email')
    expect(email).toHaveValue('new@acme.dev')
    expect(email).toBeDisabled()
    expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining('/invite'), expect.anything())
  })

  it('explains a missing or broken code', async () => {
    renderInvite(null)
    expect(await screen.findByRole('heading', { name: "This invite link isn't valid" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })

  it('checks each step before moving on', async () => {
    renderInvite()
    await screen.findByRole('heading', { name: 'Join Acme' })
    next()
    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Choose a username.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Create a password')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'New Person' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'newperson' } })
    next()
    await screen.findByLabelText('Create a password')
    next()
    expect(await screen.findByText('Create a password.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('keeps what was typed when going back a step', async () => {
    renderInvite()
    await screen.findByRole('heading', { name: 'Join Acme' })
    await fillRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(await screen.findByRole('button', { name: /^Step 1: Account/ }))
    expect(await screen.findByLabelText('Username')).toHaveValue('newperson')
  })

  it('saves the optional profile details with the account', async () => {
    api.post.mockResolvedValue({ data: '' })
    renderInvite()
    await screen.findByRole('heading', { name: 'Join Acme' })
    await fillRequired()
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'SRE' } })
    next()
    fireEvent.change(await screen.findByLabelText('Phone'), { target: { value: '+91 98765 43210' } })
    expect(screen.queryByLabelText('Time zone')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/invite/join/abc123',
        expect.objectContaining({
          user_details: expect.objectContaining({
            work: expect.objectContaining({ job_title: 'SRE' }),
            contact: expect.objectContaining({ phone: '+91 98765 43210' }),
          }),
        }),
      ),
    )
  })

  it('creates the account, then sends you to sign in', async () => {
    api.post.mockResolvedValue({ data: '' })
    renderInvite()
    await screen.findByRole('heading', { name: 'Join Acme' })
    await fillRequired()
    await finish()

    expect(await screen.findByTestId('location', {}, { timeout: 2000 })).toHaveTextContent(/^\/login$/)
    expect(api.post).toHaveBeenCalledWith(
      '/invite/join/abc123',
      expect.objectContaining({ user_name: 'newperson', display_name: 'New Person', primary_email: 'new@acme.dev' }),
    )
  })

  it('shows why the API refused', async () => {
    api.post.mockRejectedValue(new ApiError('Invalid or expired invitation code.', 400))
    renderInvite()
    await screen.findByRole('heading', { name: 'Join Acme' })
    await fillRequired()
    await finish()
    expect(await screen.findByText(/This invitation has expired or was already used/)).toBeInTheDocument()
  })
})
