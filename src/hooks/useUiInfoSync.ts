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
/**
 * Keeps the app in step with the account's UI preferences (`ui_info`, see utils/uiInfo.ts),
 * so they follow the user across devices and sign-ins: theme, sidebar, selected tag, Vault view and
 * the last page they were on.
 */

import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { atom, useAtom, type PrimitiveAtom, type WritableAtom } from 'jotai'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { sidebarCollapsedAtom } from '@/store/sidebar'
import { themeAtom, themeUnsyncedAtom, type Theme } from '@/store/theme'
import { ROUTES } from '@/constants/routes'
import { selectedTagIdAtom } from '@/store/selectedTag'
import { explorerViewAtom } from '@/store/vaultExplorerView'
import { isRestorablePath, parseUiInfo, type UiInfo } from '@/utils/uiInfo'
import { flushUiInfo, updateUiInfo, useUiInfo, useUpdateUiInfo } from './useAccount'

/** Set by a fresh sign-in: once the preferences load, go back to the page the user was last on. */
export const returnToLastPageAtom = atom(false)

/** How long someone stays on a page before it counts as their last page (quick hops are ignored). */
export const LAST_PAGE_SAVE_MS = 3000

/** The page not yet saved as the last one, so signing out can save it straight away. */
let unsavedPath: string | null = null

/**
 * Sends every unsent preference change now, including the current page as the last one. Called
 * before sign-out; gives up after a moment so signing out never hangs on it.
 */
export const flushUiInfoBeforeSignOut = async (queryClient: QueryClient): Promise<void> => {
  if (unsavedPath) {
    const path = unsavedPath
    unsavedPath = null
    void updateUiInfo(queryClient, { lastLocation: { path, at: new Date().toISOString() } }).catch(() => {})
  }
  await Promise.race([flushUiInfo(queryClient).catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1500))])
}

/**
 * One preference: on the first load the account's saved value wins (if it has one); after that,
 * changes made here are written back.
 */
const useSyncedPreference = <T>(
  stateAtom: PrimitiveAtom<T> | WritableAtom<T, [T], void>,
  saved: T | undefined,
  loaded: boolean,
  toPatch: (value: T) => Partial<UiInfo>,
) => {
  const [value, setValue] = useAtom(stateAtom)
  const update = useUpdateUiInfo()
  const synced = useRef<{ value: T } | null>(null)

  useEffect(() => {
    if (!loaded) return
    if (synced.current === null) {
      synced.current = { value: saved === undefined ? value : saved }
      if (saved !== undefined && saved !== value) setValue(saved)
      return
    }
    if (value === synced.current.value) return
    synced.current = { value }
    update(toPatch(value)).catch(() => {}) // a preference that didn't save is retried with the next change
  }, [loaded, saved, value, setValue, update, toPatch])
}

const sidebarPatch = (v: boolean): Partial<UiInfo> => ({ sidebarCollapsed: v })
const tagPatch = (v: number | null): Partial<UiInfo> => ({ selectedTagId: v })
const vaultViewPatch = (v: 'icons' | 'details'): Partial<UiInfo> => ({ vaultView: v })

export const useUiInfoSync = (): void => {
  const { data: raw } = useUiInfo()
  const info = raw ? parseUiInfo(raw).info : undefined
  const loaded = !!raw
  const update = useUpdateUiInfo()
  const queryClient = useQueryClient()

  // Changes are sent in batches (see updateUiInfo); send what's waiting when the tab is hidden or
  // closed, so a change made just before leaving isn't lost.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flushUiInfo(queryClient).catch(() => {})
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [queryClient])

  // ── theme: the newest choice wins (it can be picked on the sign-in page, before the account loads)
  const [theme, setTheme] = useAtom(themeAtom)
  const [unsynced, setUnsynced] = useAtom(themeUnsyncedAtom)
  const syncedTheme = useRef<Theme | null>(null)
  const latestTheme = useRef(theme)
  useEffect(() => {
    latestTheme.current = theme
  }, [theme])
  useEffect(() => {
    if (!info) return
    const push = (value: Theme) =>
      update({ theme: value })
        .then(() => latestTheme.current === value && setUnsynced(false))
        .catch(() => {})
    if (syncedTheme.current === null) {
      syncedTheme.current = theme
      if (unsynced) {
        // picked on this device since the last save: the account catches up
        if (info.theme === theme) setUnsynced(false)
        else void push(theme)
      } else if (info.theme) {
        syncedTheme.current = info.theme
        if (info.theme !== theme) setTheme(info.theme)
      }
      return // nothing saved and nothing picked: don't write until the user picks a theme
    }
    if (theme === syncedTheme.current) return
    syncedTheme.current = theme
    void push(theme)
    // `loaded` matters on its own: with no saved theme, info?.theme is undefined before and after the load
  }, [loaded, info?.theme, theme, unsynced, setTheme, setUnsynced, update]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── other preferences
  useSyncedPreference(sidebarCollapsedAtom, info?.sidebarCollapsed, loaded, sidebarPatch)
  useSyncedPreference(selectedTagIdAtom, info?.selectedTagId, loaded, tagPatch)
  useSyncedPreference(explorerViewAtom, info?.vaultView, loaded, vaultViewPatch)

  // ── last page: go back to it after signing in, and remember where the user is now
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [returnToLastPage, setReturnToLastPage] = useAtom(returnToLastPageAtom)
  const here = pathname + search
  const lastPath = info?.lastLocation?.path

  useEffect(() => {
    if (!loaded || !returnToLastPage) return
    setReturnToLastPage(false)
    // only from the default landing page: a link the user followed to sign in takes priority
    if (pathname === ROUTES.overview && isRestorablePath(lastPath) && lastPath !== here) navigate(lastPath, { replace: true })
  }, [loaded, returnToLastPage, setReturnToLastPage, pathname, here, lastPath, navigate])

  useEffect(() => {
    // wait for the preferences (and any return to the last page) before recording where we are
    if (!loaded || returnToLastPage || !isRestorablePath(here) || here === lastPath) {
      if (here === lastPath) unsavedPath = null
      return
    }
    unsavedPath = here
    const timer = setTimeout(() => {
      unsavedPath = null
      update({ lastLocation: { path: here, at: new Date().toISOString() } }).catch(() => {})
    }, LAST_PAGE_SAVE_MS)
    return () => clearTimeout(timer)
  }, [loaded, returnToLastPage, here, lastPath, update])
}
