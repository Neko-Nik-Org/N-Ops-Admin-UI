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
 * Saves chosen React Query results (the signed-in user's startup data) to the app's encrypted storage,
 * so a page reload can open the app straight from them while fresh copies load in the background.
 *
 * The saved copy belongs to one user: it is only restored for that user's saved session, and it is
 * removed at sign-out (see clearSessionToken) or when it is older than a day. Like the saved profile
 * it is encrypted at rest (utils/secureStorage) and holds no token.
 */

import { hashKey, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { secureStorage } from '@/utils/secureStorage'

const STORAGE_KEY = 'nops_query_cache'
/** Bump when the shape of a saved result changes, so older copies are ignored. */
const VERSION = 1
/** Older copies are dropped: the app then shows the loading screen and fetches everything again. */
export const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000
/** Saves are batched: a burst of updates (startup) writes once. */
const SAVE_DELAY_MS = 300

interface SavedEntry {
  key: QueryKey
  data: unknown
  updatedAt: number
}

interface SavedCache {
  version: number
  userId: number
  savedAt: number
  entries: SavedEntry[]
}

const isSavedCache = (value: unknown): value is SavedCache => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.version === VERSION &&
    typeof v.userId === 'number' &&
    typeof v.savedAt === 'number' &&
    Array.isArray(v.entries) &&
    v.entries.every(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        Array.isArray((e as SavedEntry).key) &&
        typeof (e as SavedEntry).updatedAt === 'number',
    )
  )
}

/** Removes the saved copy (sign-out). */
export const clearSavedQueries = (): void => {
  try {
    secureStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage blocked: nothing was saved either
  }
}

/**
 * Puts the saved results back into `client` when they belong to `userId` and are recent enough.
 * They are marked stale, so every one is fetched again as soon as something uses it.
 * Returns true when every key in `keys` was restored.
 */
export const restoreSavedQueries = (client: QueryClient, keys: readonly QueryKey[], userId: number | undefined): boolean => {
  let saved: unknown
  try {
    const raw = secureStorage.getItem(STORAGE_KEY)
    saved = raw ? JSON.parse(raw) : null
  } catch {
    saved = null
  }
  if (!isSavedCache(saved)) return false
  if (userId === undefined || saved.userId !== userId || Date.now() - saved.savedAt > QUERY_CACHE_MAX_AGE_MS) {
    clearSavedQueries()
    return false
  }
  const wanted = new Set(keys.map((k) => hashKey(k)))
  let restored = 0
  for (const { key, data, updatedAt } of saved.entries) {
    if (!wanted.has(hashKey(key)) || data === undefined) continue
    client.setQueryData(key, data, { updatedAt })
    void client.invalidateQueries({ queryKey: key, exact: true, refetchType: 'none' })
    restored++
  }
  return restored === wanted.size
}

/**
 * Keeps the saved copy in step with `client`: every successful fetch of one of `keys` is saved, and
 * removing them (sign-out) removes it. `userIdOf` reads the owner from the cache (the profile).
 * Returns a function that stops watching.
 */
export const saveQueriesOnChange = (
  client: QueryClient,
  keys: readonly QueryKey[],
  userIdOf: (client: QueryClient) => number | undefined,
): (() => void) => {
  const wanted = new Set(keys.map((k) => hashKey(k)))
  let timer: ReturnType<typeof setTimeout> | undefined

  const save = () => {
    timer = undefined
    const userId = userIdOf(client)
    const entries: SavedEntry[] = []
    for (const key of keys) {
      const state = client.getQueryState(key)
      if (state?.data !== undefined) entries.push({ key, data: state.data, updatedAt: state.dataUpdatedAt })
    }
    if (userId === undefined || !entries.length) return clearSavedQueries()
    const value: SavedCache = { version: VERSION, userId, savedAt: Date.now(), entries }
    try {
      secureStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // storage full or blocked: the next reload just shows the loading screen
    }
  }

  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (!wanted.has(event.query.queryHash)) return
    const changed = event.type === 'removed' || (event.type === 'updated' && event.action.type === 'success')
    if (changed && !timer) timer = setTimeout(save, SAVE_DELAY_MS)
  })
  return () => {
    unsubscribe()
    clearTimeout(timer)
  }
}
