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
/** Tests for src/hooks/useUiInfoSync.ts. */

import { act, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { sidebarCollapsedAtom } from '@/store/sidebar'
import { isRestorablePath } from '@/utils/uiInfo'
import { selectedTagIdAtom } from '@/store/selectedTag'
import { explorerViewAtom } from '@/store/vaultExplorerView'
import { secureStorage } from '@/utils/secureStorage'
import { chooseThemeAtom, themeAtom, themeUnsyncedAtom } from '@/store/theme'
import { flushLastPage, LAST_PAGE_SAVE_MS, returnToLastPageAtom, useUiInfoSync } from '@/hooks/useUiInfoSync'
import { api, makeUser, renderHookWithProviders } from '../testUtils'

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

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', { version: 1, theme: 'dark', other: 1 }))
  })

  it('writes nothing until the user picks a theme when none is saved', async () => {
    api.get.mockResolvedValue({ data: { theme: 'neon' } })
    api.post.mockResolvedValue({ data: {} })
    const { store, queryClient } = renderHookWithProviders(() => useUiInfoSync(), { user: makeUser() })
    await waitFor(() => expect(queryClient.getQueryState(['user-self', 'ui-info'])?.status).toBe('success'))
    expect(store.get(themeAtom)).toBe('system')
    expect(api.post).not.toHaveBeenCalled()

    act(() => store.set(themeAtom, 'light'))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', { version: 1, theme: 'light' }))
  })

  it('keeps a theme picked before signing in and saves it to the account', async () => {
    api.get.mockResolvedValue({ data: { theme: 'dark', other: 1 } })
    api.post.mockResolvedValue({ data: {} })
    // picked on the sign-in page, before the account's preferences were known
    secureStorage.setItem('nops-theme', '"light"')
    secureStorage.setItem('nops-theme-unsynced', 'true')
    const { store } = renderHookWithProviders(() => useUiInfoSync(), { user: makeUser() })

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', { version: 1, theme: 'light', other: 1 }))
    expect(store.get(themeAtom)).toBe('light')
    await waitFor(() => expect(store.get(themeUnsyncedAtom)).toBe(false))
  })

  it('marks a theme switch as the newest choice', () => {
    const { store } = renderHookWithProviders(() => null)
    act(() => store.set(chooseThemeAtom, 'dark'))
    expect(store.get(themeAtom)).toBe('dark')
    expect(store.get(themeUnsyncedAtom)).toBe(true)
  })

  it("applies the account's sidebar, tag and Vault view, and saves later changes", async () => {
    api.get.mockResolvedValue({ data: { version: 1, sidebar_collapsed: true, selected_tag_id: 2, vault_view: 'details' } })
    api.post.mockResolvedValue({ data: {} })
    const { store } = renderHookWithProviders(() => useUiInfoSync(), { user: makeUser() })
    await waitFor(() => expect(store.get(sidebarCollapsedAtom)).toBe(true))
    expect(store.get(selectedTagIdAtom)).toBe(2)
    expect(store.get(explorerViewAtom)).toBe('details')
    expect(api.post).not.toHaveBeenCalled()

    act(() => store.set(selectedTagIdAtom, null))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', {
        version: 1,
        sidebar_collapsed: true,
        selected_tag_id: null,
        vault_view: 'details',
      }),
    )
  })

  it('saves the page the user stays on, and keeps quick hops from causing requests', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      api.get.mockResolvedValue({ data: { theme: 'dark' } })
      api.post.mockResolvedValue({ data: {} })
      renderHookWithProviders(() => useUiInfoSync(), { user: makeUser(), route: '/vault/3/env?q=db' })
      await vi.advanceTimersByTimeAsync(LAST_PAGE_SAVE_MS + 100)
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', {
          version: 1,
          theme: 'dark',
          last_location: { path: '/vault/3/env?q=db', at: expect.any(String) },
        }),
      )
      expect(api.post).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('goes back to the last page after a fresh sign-in, but not to pages outside the app', async () => {
    api.get.mockResolvedValue({ data: { last_location: { path: '/admin/users', at: '2026-11-20T10:00:00Z' } } })
    const { store } = renderHookWithProviders(() => useUiInfoSync(), { user: makeUser(), route: '/' })
    act(() => store.set(returnToLastPageAtom, true))
    await waitFor(() => expect(store.get(returnToLastPageAtom)).toBe(false))
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/users')
  })

  it('saves the current page straight away on sign-out', async () => {
    api.get.mockResolvedValue({ data: { theme: 'dark' } })
    api.post.mockResolvedValue({ data: {} })
    const { queryClient } = renderHookWithProviders(() => useUiInfoSync(), { user: makeUser(), route: '/admin/roles' })
    await waitFor(() => expect(queryClient.getQueryState(['user-self', 'ui-info'])?.status).toBe('success'))
    await flushLastPage(queryClient)
    expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', {
      version: 1,
      theme: 'dark',
      last_location: { path: '/admin/roles', at: expect.any(String) },
    })
  })

  it('only returns to in-app pages', () => {
    expect(isRestorablePath('/vault/3/env')).toBe(true)
    for (const bad of ['//evil.example', '/\\evil.example', 'https://evil.example', '/login', '/invite/abc', '/super-admin', ''])
      expect(isRestorablePath(bad), bad).toBe(false)
  })
})
