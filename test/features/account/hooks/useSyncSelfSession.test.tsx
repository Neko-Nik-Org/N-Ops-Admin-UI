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

/** Tests for src/features/account/hooks/useSyncSelfSession.ts. */

import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSyncSelfSession } from '@/features/account/hooks/useSyncSelfSession'
import { currentUserAtom } from '@/features/auth/store/session'
import { clearSessionToken, getSessionToken, setSessionToken } from '@/features/auth/store/sessionToken'
import { ApiError } from '@/types/api'
import { api, makeUser, renderHookWithProviders } from '../../../testUtils'

describe('useSyncSelfSession', () => {
  it('refreshes a "Keep me signed in" session and stores the new id', async () => {
    setSessionToken('old', true)
    api.post.mockResolvedValue({ data: { session_id: 'new' } })
    const { result, store } = renderHookWithProviders(() => useSyncSelfSession(), { user: makeUser({ isEmailVerified: false }) })

    let outcome
    await act(async () => {
      outcome = await result.current.sync({ isEmailVerified: true })
    })

    expect(outcome).toBe('refreshed')
    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
    expect(getSessionToken()).toBe('new')
    expect(store.get(currentUserAtom)?.isEmailVerified).toBe(true)
  })

  it('never calls refresh for other sessions, but still updates the profile', async () => {
    setSessionToken('s1', false)
    const { result, store } = renderHookWithProviders(() => useSyncSelfSession(), { user: makeUser() })

    let outcome
    await act(async () => {
      outcome = await result.current.sync({ userName: 'priya_r' })
    })

    expect(outcome).toBe('local-only')
    expect(api.post).not.toHaveBeenCalled()
    expect(store.get(currentUserAtom)?.userName).toBe('priya_r')
  })

  it('reports signed-out when the refresh is rejected with 401', async () => {
    setSessionToken('s1', true)
    api.post.mockImplementation(() => {
      clearSessionToken() // what the axios interceptor does on 401
      return Promise.reject(new ApiError('Invalid session', 401))
    })
    const { result } = renderHookWithProviders(() => useSyncSelfSession(), { user: makeUser() })

    let outcome
    await act(async () => {
      outcome = await result.current.sync({ userName: 'priya_r' })
    })
    expect(outcome).toBe('signed-out')
  })

  it('reports refresh-failed when the session survives a failed refresh', async () => {
    setSessionToken('s1', true)
    api.post.mockRejectedValue(new ApiError('Cache Database error', 502))
    const { result } = renderHookWithProviders(() => useSyncSelfSession(), { user: makeUser() })

    let outcome
    await act(async () => {
      outcome = await result.current.sync({ isEmailVerified: true })
    })
    expect(outcome).toBe('refresh-failed')
    expect(getSessionToken()).toBe('s1')
  })
})
