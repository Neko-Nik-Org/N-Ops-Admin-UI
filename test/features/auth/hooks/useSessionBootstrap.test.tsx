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
/** Tests for src/features/auth/hooks/useSessionBootstrap.ts. */

import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSessionBootstrap } from '@/features/auth/hooks/useSessionBootstrap'
import { sessionStatusAtom } from '@/features/auth/store/session'
import { getSessionToken, setSessionToken } from '@/features/auth/store/sessionToken'
import { api, renderHookWithProviders } from '../../../testUtils'

describe('useSessionBootstrap', () => {
  it('goes straight to signed-out when nothing is saved, without calling the API', async () => {
    const { store } = renderHookWithProviders(() => useSessionBootstrap())
    await waitFor(() => expect(store.get(sessionStatusAtom)).toBe('unauthenticated'))
    expect(api.get).not.toHaveBeenCalled()
  })

  it('restores a saved session the API still accepts', async () => {
    setSessionToken('s1', true)
    api.get.mockResolvedValue({ data: {} })
    const { store } = renderHookWithProviders(() => useSessionBootstrap())
    await waitFor(() => expect(store.get(sessionStatusAtom)).toBe('authenticated'))
    expect(api.get).toHaveBeenCalledWith('/auth/verify')
  })

  it('drops a saved session the API rejects', async () => {
    setSessionToken('stale', true)
    api.get.mockRejectedValue(new Error('Unauthorized'))
    const { store } = renderHookWithProviders(() => useSessionBootstrap())
    await waitFor(() => expect(store.get(sessionStatusAtom)).toBe('unauthenticated'))
    expect(getSessionToken()).toBeUndefined()
  })
})
