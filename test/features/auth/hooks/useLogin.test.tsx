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
/** Tests for src/features/auth/hooks/useLogin.ts (and useApplySession, which it uses). */

import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { currentUserAtom, sessionStatusAtom } from '@/features/auth/store/session'
import { getSessionToken, isSessionRemembered } from '@/features/auth/store/sessionToken'
import { api, renderHookWithProviders } from '../../../testUtils'

const credentials = { userName: 'priya', password: 'secret', rememberMe: true }

const successResponse = {
  message: 'ok',
  is_2fa_required: false,
  session_id: 'session-1',
  data: {
    user_id: 7,
    organization_id: 'org-1',
    permissions: ['tag:view'],
    tags: [3],
    user_name: 'priya',
    display_name: 'Priya Rao',
    organization_name: 'Acme',
    primary_email: 'priya@acme.dev',
    is_email_verified: true,
  },
}

describe('useLogin', () => {
  it('signs in: stores the session and the user, and resolves "authenticated"', async () => {
    api.post.mockResolvedValue({ data: successResponse })
    const { result, store } = renderHookWithProviders(() => useLogin())

    let outcome: unknown
    await act(async () => {
      outcome = await result.current[1]({ credentials, turnstileToken: 't' })
    })

    expect(outcome).toEqual({ kind: 'authenticated' })
    expect(getSessionToken()).toBe('session-1')
    expect(isSessionRemembered()).toBe(true)
    expect(store.get(sessionStatusAtom)).toBe('authenticated')
    expect(store.get(currentUserAtom)).toMatchObject({ userId: 7, displayName: 'Priya Rao', tags: [3] })
    expect(result.current[0]).toBe('success')
  })

  it('hands back the 2FA challenge without signing in', async () => {
    api.post.mockResolvedValue({
      data: {
        message: '2fa',
        is_2fa_required: true,
        temporary_auth_token: 'tmp',
        data: {
          display_name: 'Priya',
          organization_name: 'Acme',
          primary_email: 'priya@acme.dev',
          is_email_verified: true,
          has_email_2fa: true,
          has_totp_2fa: false,
          last_login_at: '',
        },
      },
    })
    const { result, store } = renderHookWithProviders(() => useLogin())

    let outcome: unknown
    await act(async () => {
      outcome = await result.current[1]({ credentials, turnstileToken: 't' })
    })

    expect(outcome).toEqual({
      kind: 'two-factor',
      context: {
        temporaryAuthToken: 'tmp',
        email: 'priya@acme.dev',
        organizationName: 'Acme',
        hasTotp: false,
        hasEmail: true,
        rememberMe: true,
      },
    })
    expect(getSessionToken()).toBeUndefined()
    expect(store.get(sessionStatusAtom)).toBe('checking')
  })

  it('rejects and returns the button to idle on failure', async () => {
    api.post.mockRejectedValue(new Error('Invalid credentials'))
    const { result } = renderHookWithProviders(() => useLogin())

    await act(async () => {
      await expect(result.current[1]({ credentials, turnstileToken: 't' })).rejects.toThrow('Invalid credentials')
    })
    await waitFor(() => expect(result.current[0]).toBe('idle'))
  })
})
