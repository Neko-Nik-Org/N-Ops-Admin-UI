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
/** Tests for the forced security setup: the RequireSecuritySetup gate and SecuritySetupPage. */

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RequireSecuritySetup } from '@/routes/guards'
import { securityRequirementsAtom, storeSecurityRequirements } from '@/store/securityRequirements'
import { currentUserAtom } from '@/store/session'
import { SecuritySetupPage } from '@/pages/auth/securitySetup'
import { api, makeUser, renderWithProviders } from '../../../testUtils'

/** Renders `ui` with the given policy requirements already stored, as sign-in leaves them. */
const renderWith = (ui: React.ReactElement, required: Array<'email' | 'totp'>, isEmailVerified: boolean, route = '/') => {
  storeSecurityRequirements(required.length ? { required, enabled: [] } : null)
  return renderWithProviders(ui, { route, user: makeUser({ isEmailVerified }) })
}

describe('RequireSecuritySetup', () => {
  it('sends every page to the setup while a required factor is missing', () => {
    renderWith(<RequireSecuritySetup>dashboard</RequireSecuritySetup>, ['totp'], true, '/admin/users')
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/security-setup')
  })

  it('lets the page through when nothing is required', () => {
    renderWith(<RequireSecuritySetup>dashboard</RequireSecuritySetup>, [], false)
    expect(screen.getByText('dashboard')).toBeInTheDocument()
  })
})

describe('SecuritySetupPage', () => {
  const renderSetup = (required: Array<'email' | 'totp'>, isEmailVerified: boolean) =>
    renderWith(<SecuritySetupPage />, required, isEmailVerified, '/security-setup')

  it('goes to the app when there is nothing to set up', () => {
    renderSetup([], true)
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })

  it('new user with email enforced: verifies the email, then turns on email codes', async () => {
    api.post.mockResolvedValue({ data: undefined })
    const { store } = renderSetup(['email'], false)
    expect(screen.getByRole('heading', { name: 'Verify your email' })).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    expect(screen.getByText(/requires Email codes/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/user/self/verify-email/send'))
    const boxes = await screen.findAllByRole('textbox')
    fireEvent.paste(boxes[0]!, { clipboardData: { getData: () => 'ABC1234' } })
    // a full code submits itself

    // verified: the flow moves on by itself
    expect(await screen.findByRole('heading', { name: 'Turn on email codes' })).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/user/self/verify-email/validate', '"ABC1234"', expect.anything())
    expect(store.get(currentUserAtom)?.isEmailVerified).toBe(true)
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Turn on email codes' }))
    expect(await screen.findByRole('heading', { name: "You're all set" }, { timeout: 2000 })).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/user/2fa/email', { enabled: true })
    expect(store.get(securityRequirementsAtom)).toEqual({ required: ['email'], enabled: ['email'] })
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'), { timeout: 2000 })
  })

  it('TOTP enforced: adds an app, confirms a code, and turns it on', async () => {
    api.post.mockImplementation(async (url: string) => {
      if (url === '/user/2fa/totp/entries')
        return {
          data: { entry_id: 5, secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/N-Ops:priya?secret=JBSWY3DPEHPK3PXP' },
        }
      return { data: undefined }
    })
    const { store } = renderSetup(['totp'], true)
    fireEvent.click(screen.getByRole('button', { name: 'Set up authenticator app' }))
    expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open it in your authenticator app/ })).toHaveAttribute(
      'href',
      'otpauth://totp/N-Ops:priya?secret=JBSWY3DPEHPK3PXP',
    )
    const boxes = screen.getAllByRole('textbox')
    fireEvent.paste(boxes[0]!, { clipboardData: { getData: () => '123456' } })
    expect(await screen.findByRole('heading', { name: "You're all set" }, { timeout: 2000 })).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/user/2fa/totp/entries', { entry_name: 'Authenticator app' })
    expect(api.post).toHaveBeenCalledWith('/user/2fa/totp/entries/5/check', { code: '123456' })
    expect(api.post).toHaveBeenCalledWith('/user/2fa/totp', { enabled: true })
    expect(store.get(securityRequirementsAtom)?.enabled).toEqual(['totp'])
  })

  it('says so when the server has no setup endpoints yet, and stays on the step', async () => {
    const { ApiError } = await import('@/types/api')
    api.post.mockRejectedValue(new ApiError('Not Found', 404))
    renderSetup(['email'], true)
    fireEvent.click(screen.getByRole('button', { name: 'Turn on email codes' }))
    expect(await screen.findByText(/isn't available on the server yet/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Turn on email codes' })).toBeInTheDocument()
  })

  it('offers sign-out as the only way out', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    const { store } = renderSetup(['totp'], true)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(store.get(currentUserAtom)).toBeNull())
    expect(store.get(securityRequirementsAtom)).toBeNull()
  })
})
