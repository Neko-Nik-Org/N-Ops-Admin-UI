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
/** Tests for src/features/auth/hooks/useSessionRefresh.ts. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionRefresh } from '@/features/auth/hooks/useSessionRefresh'
import { sessionStatusAtom } from '@/features/auth/store/session'
import { clearSessionToken, getSessionToken, setSessionToken } from '@/features/auth/store/sessionToken'
import { api, makeUser, renderHookWithProviders } from '../../../testUtils'

const HOUR = 60 * 60 * 1000

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useSessionRefresh', () => {
  it('rotates a remembered session 2 hours after it was issued', async () => {
    setSessionToken('old', true)
    api.post.mockResolvedValue({ data: { message: 'ok', session_id: 'new' } })
    renderHookWithProviders(() => useSessionRefresh(), { user: makeUser() })

    await vi.advanceTimersByTimeAsync(2 * HOUR - 1000)
    expect(api.post).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
    expect(getSessionToken()).toBe('new')
  })

  it('keeps refreshing on schedule', async () => {
    setSessionToken('s0', true)
    api.post.mockResolvedValueOnce({ data: { session_id: 's1' } }).mockResolvedValueOnce({ data: { session_id: 's2' } })
    renderHookWithProviders(() => useSessionRefresh(), { user: makeUser() })

    await vi.advanceTimersByTimeAsync(4 * HOUR)
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(getSessionToken()).toBe('s2')
  })

  it('never refreshes sessions without "Keep me signed in"', async () => {
    setSessionToken('s1', false)
    renderHookWithProviders(() => useSessionRefresh(), { user: makeUser() })
    await vi.advanceTimersByTimeAsync(5 * HOUR)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('signs the user out when the refresh is rejected', async () => {
    setSessionToken('s1', true)
    // what the real client does on 401: drop the token, then reject
    api.post.mockImplementation(async () => {
      clearSessionToken()
      throw new Error('Unauthorized')
    })
    const { store } = renderHookWithProviders(() => useSessionRefresh(), { user: makeUser() })

    await vi.advanceTimersByTimeAsync(2 * HOUR)
    expect(store.get(sessionStatusAtom)).toBe('unauthenticated')
  })
})
