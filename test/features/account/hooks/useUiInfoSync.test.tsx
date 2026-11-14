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
/** Tests for src/features/account/hooks/useUiInfoSync.ts. */

import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { chooseThemeAtom, themeAtom, themeUnsyncedAtom } from '@/app/theme'
import { useUiInfoSync } from '@/features/account/hooks/useUiInfoSync'
import { api, makeUser, renderHookWithProviders } from '../../../testUtils'

describe('useUiInfoSync', () => {
  it("applies the account's saved theme on load without writing it back", async () => {
    api.get.mockResolvedValue({ data: { theme: 'light', other: 1 } })
    const { store } = renderHookWithProviders(() => useUiInfoSync(), { user: makeUser() })

    await waitFor(() => expect(store.get(themeAtom)).toBe('light'))
    expect(api.post).not.toHaveBeenCalled()
  })

  it('saves later theme changes, keeping the other preferences', async () => {
    api.get.mockResolvedValue({ data: { theme: 'light', other: 1 } })
    api.post.mockResolvedValue({ data: {} })
    const { store } = renderHookWithProviders(() => useUiInfoSync(), { user: makeUser() })
    await waitFor(() => expect(store.get(themeAtom)).toBe('light'))

    act(() => store.set(themeAtom, 'dark'))

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', { theme: 'dark', other: 1 }))
  })

  it('writes nothing until the user picks a theme when none is saved', async () => {
    api.get.mockResolvedValue({ data: { theme: 'neon' } })
    api.post.mockResolvedValue({ data: {} })
    const { store, queryClient } = renderHookWithProviders(() => useUiInfoSync(), { user: makeUser() })
    await waitFor(() => expect(queryClient.getQueryState(['user-self', 'ui-info'])?.status).toBe('success'))
    expect(store.get(themeAtom)).toBe('system')
    expect(api.post).not.toHaveBeenCalled()

    act(() => store.set(themeAtom, 'light'))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', { theme: 'light' }))
  })

  it('keeps a theme picked before signing in and saves it to the account', async () => {
    api.get.mockResolvedValue({ data: { theme: 'dark', other: 1 } })
    api.post.mockResolvedValue({ data: {} })
    // picked on the sign-in page, before the account's preferences were known
    localStorage.setItem('nops-theme', '"light"')
    localStorage.setItem('nops-theme-unsynced', 'true')
    const { store } = renderHookWithProviders(() => useUiInfoSync(), { user: makeUser() })

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', { theme: 'light', other: 1 }))
    expect(store.get(themeAtom)).toBe('light')
    await waitFor(() => expect(store.get(themeUnsyncedAtom)).toBe(false))
  })

  it('marks a theme switch as the newest choice', () => {
    const { store } = renderHookWithProviders(() => null)
    act(() => store.set(chooseThemeAtom, 'dark'))
    expect(store.get(themeAtom)).toBe('dark')
    expect(store.get(themeUnsyncedAtom)).toBe(true)
  })
})
