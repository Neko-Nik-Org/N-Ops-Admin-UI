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
/** Tests for src/pages/auth/forgotPassword/index.tsx. */

import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ForgotPasswordPage } from '@/pages/auth/forgotPassword'
import { ApiError } from '@/types/api'
import { api, passTurnstile, renderWithProviders } from '../../../testUtils'

const renderPage = () => renderWithProviders(<ForgotPasswordPage />, { route: '/login/forgot-password' })

const submit = (email: string) => {
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } })
  fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }))
}

describe('ForgotPasswordPage', () => {
  it('asks for the email and links back to sign in', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('type', 'email')
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })

  it('validates the email without calling the API', async () => {
    passTurnstile()
    renderPage()
    submit('not-an-email')
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('requires the Turnstile check', async () => {
    renderPage()
    submit('priya@acme.dev')
    expect(await screen.findByText('Complete the verification check first.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('sends the code and says where it went', async () => {
    passTurnstile('cf-ok')
    api.post.mockResolvedValue({ data: '' })
    renderPage()
    submit('  priya@acme.dev ')

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(/sent a password reset code to priya@acme.dev/)).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/auth/reset/password', '"priya@acme.dev"', {
      headers: { 'Content-Type': 'application/json', 'cf-turnstile-token': 'cf-ok' },
    })
  })

  it("shows the API's error and gets a fresh Turnstile token", async () => {
    const turnstile = passTurnstile()
    api.post.mockRejectedValue(new ApiError('A password reset request is already in progress', 400))
    renderPage()
    submit('priya@acme.dev')

    expect(await screen.findByText('A password reset request is already in progress')).toBeInTheDocument()
    expect(turnstile.reset).toHaveBeenCalled()
  })
})
