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
/** Tests for src/pages/LoginPage.tsx (with LoginForm and the Turnstile widget). */

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getSessionToken } from '@/features/auth/store/sessionToken'
import { LoginPage } from '@/pages/LoginPage'
import { api, passTurnstile, renderWithProviders } from '../testUtils'

const renderLogin = () => renderWithProviders(<LoginPage />, { route: '/login' })

const fillAndSubmit = (userName = 'priya', password = 'secret') => {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: userName } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

const loginSuccess = {
  message: 'ok',
  is_2fa_required: false,
  session_id: 'session-1',
  data: {
    user_id: 1,
    organization_id: 'o',
    permissions: [],
    tags: [],
    user_name: 'priya',
    display_name: 'Priya',
    organization_name: 'Acme',
    primary_email: 'priya@acme.dev',
    is_email_verified: true,
  },
}

describe('LoginPage', () => {
  it('shows the sign-in form', () => {
    renderLogin()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    // a plain text field: usernames don't need an @, so the browser must not demand an email address
    expect(screen.getByLabelText('Username')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Keep me signed in on this device')).not.toBeChecked()
  })

  it('validates required fields without calling the API', async () => {
    passTurnstile()
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your username.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('requires the Turnstile check before signing in', async () => {
    renderLogin()
    fillAndSubmit()
    expect(await screen.findByText('Complete the verification check before signing in.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('toggles password visibility', () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
  })

  it('signs in and goes to the dashboard', async () => {
    passTurnstile('cf-ok')
    api.post.mockResolvedValue({ data: loginSuccess })
    renderLogin()
    fillAndSubmit()

    expect(await screen.findByTestId('location', {}, { timeout: 2000 })).toHaveTextContent(/^\/$/)
    expect(api.post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ user_name: 'priya' }), {
      headers: { 'cf-turnstile-token': 'cf-ok' },
    })
    expect(getSessionToken()).toBe('session-1')
  })

  it('goes to the 2FA step when a second factor is required', async () => {
    passTurnstile()
    api.post.mockResolvedValue({
      data: {
        is_2fa_required: true,
        temporary_auth_token: 'tmp',
        data: { primary_email: 'p@acme.dev', organization_name: 'Acme', has_totp_2fa: true, has_email_2fa: false },
      },
    })
    renderLogin()
    fillAndSubmit()

    expect(await screen.findByTestId('location', {}, { timeout: 2000 })).toHaveTextContent('/login/verify-2fa')
    expect(getSessionToken()).toBeUndefined()
  })

  it('shows the API error and asks Turnstile for a fresh token', async () => {
    const turnstile = passTurnstile()
    api.post.mockRejectedValue(new Error('Invalid username or password'))
    renderLogin()
    fillAndSubmit()

    // shown in the form's error banner, not a toast
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password')
    await waitFor(() => expect(turnstile.reset).toHaveBeenCalledWith('widget-1'))
  })

  it('links "Forgot password?" to the reset page', () => {
    renderLogin()
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/login/forgot-password')
  })

  it('links new people to contact and the waitlist in a new tab', () => {
    renderLogin()
    const link = screen.getByRole('link', { name: 'join the waitlist' })
    expect(link).toHaveAttribute('href', 'https://nops.app/waitlist')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: 'invite you' })).toHaveAttribute('href', 'https://nops.app/contact')
  })
})
