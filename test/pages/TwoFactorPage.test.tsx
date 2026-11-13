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
/** Tests for src/pages/TwoFactorPage.tsx (with TwoFactorForm and OtpInput). */

import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TwoFactorContext } from '@/features/auth/types'
import { getSessionToken } from '@/features/auth/store/sessionToken'
import { TwoFactorPage } from '@/pages/TwoFactorPage'
import { api, renderWithProviders } from '../testUtils'

const context: TwoFactorContext = {
  temporaryAuthToken: 'tmp-token',
  email: 'priya@acme.dev',
  organizationName: 'Acme',
  hasTotp: true,
  hasEmail: true,
  rememberMe: false,
}

const renderTwoFactor = (state: TwoFactorContext | null = context) =>
  renderWithProviders(<TwoFactorPage />, { route: '/login/verify-2fa', state })

/** Pastes a whole code into the first digit box. */
const pasteCode = (code: string) =>
  fireEvent.paste(screen.getByLabelText('Digit 1 of 6'), { clipboardData: { getData: () => code } })

describe('TwoFactorPage', () => {
  it('sends visitors without a pending sign-in back to /login', () => {
    renderTwoFactor(null)
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('asks for the authenticator code first when TOTP is enabled', () => {
    renderTwoFactor()
    expect(screen.getByRole('heading', { name: 'Two-step verification' })).toBeInTheDocument()
    expect(screen.getByText(/authenticator app for priya@acme.dev/)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Digit \d of 6/)).toHaveLength(6)
    expect(screen.getByText(/everyone in Acme/)).toBeInTheDocument()
  })

  it('fills every box from a pasted code', () => {
    renderTwoFactor()
    pasteCode('12a3456')
    expect(screen.getAllByLabelText(/Digit \d of 6/).map((i) => (i as HTMLInputElement).value).join('')).toBe('123456')
  })

  it('rejects an incomplete code without calling the API', async () => {
    renderTwoFactor()
    pasteCode('123')
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))
    expect(await screen.findByText('Enter the full 6-digit code.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('verifies the code, signs in and goes to the dashboard', async () => {
    api.post.mockResolvedValue({
      data: { is_2fa_required: false, session_id: 'session-2fa', data: { permissions: [], tags: [] } },
    })
    renderTwoFactor()
    pasteCode('123456')
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))

    expect(await screen.findByTestId('location', {}, { timeout: 2000 })).toHaveTextContent(/^\/$/)
    expect(api.post).toHaveBeenCalledWith('/auth/verify-otp', { temporary_auth_token: 'tmp-token', method: 'totp', otp: '123456' })
    expect(getSessionToken()).toBe('session-2fa')
  })

  it('explains when the server does not support 2FA yet', async () => {
    api.post.mockRejectedValue(new Error('Not Found'))
    renderTwoFactor()
    pasteCode('123456')
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))
    expect(await screen.findByText("Two-factor verification isn't available on the server yet.")).toBeInTheDocument()
  })

  it('switches to an emailed code with a masked address and a resend cooldown', async () => {
    api.post.mockResolvedValue({ data: {} })
    renderTwoFactor()
    fireEvent.click(screen.getByRole('button', { name: /Email me a code/ }))

    expect(screen.getByText('Enter the 6-digit code we emailed to p•••@acme.dev.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }))
    expect(await screen.findByText('Code sent.')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/auth/resend-otp', { temporary_auth_token: 'tmp-token', method: 'email' })
    expect(screen.getByRole('button', { name: /Resend code in \d+s/ })).toBeDisabled()
  })

  it('offers no other method when only one is enabled', () => {
    renderTwoFactor({ ...context, hasEmail: false })
    expect(screen.queryByText('Other ways to verify')).not.toBeInTheDocument()
  })
})
