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
/** Tests for src/features/auth/hooks/useLogout.ts. */

import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { currentUserAtom, sessionStatusAtom } from '@/features/auth/store/session'
import { getSessionToken, setSessionToken } from '@/features/auth/store/sessionToken'
import { api, makeUser, renderHookWithProviders } from '../../../testUtils'

describe('useLogout', () => {
  it('ends the session on the server and locally', async () => {
    setSessionToken('s1', true)
    api.delete.mockResolvedValue({ data: {} })
    const { result, store } = renderHookWithProviders(() => useLogout(), { user: makeUser() })

    await act(() => result.current[1]())

    expect(api.delete).toHaveBeenCalledWith('/auth/logout')
    expect(getSessionToken()).toBeUndefined()
    expect(store.get(currentUserAtom)).toBeNull()
    expect(store.get(sessionStatusAtom)).toBe('unauthenticated')
  })

  it('still signs out locally when the API call fails', async () => {
    setSessionToken('s1', false)
    api.delete.mockRejectedValue(new Error('Network Error'))
    const { result, store } = renderHookWithProviders(() => useLogout(), { user: makeUser() })

    await act(() => result.current[1]())

    expect(getSessionToken()).toBeUndefined()
    expect(store.get(sessionStatusAtom)).toBe('unauthenticated')
  })
})
