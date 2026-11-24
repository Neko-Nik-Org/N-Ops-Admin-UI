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

/** Tests for src/utils/queryPersistence.ts. */

import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QUERY_CACHE_MAX_AGE_MS, clearSavedQueries, restoreSavedQueries, saveQueriesOnChange } from '@/utils/queryPersistence'
import { secureStorage } from '@/utils/secureStorage'

const PROFILE = ['user-self', 'profile']
const TAGS = ['tag', 'list']
const KEYS = [PROFILE, TAGS]
const owner = (c: QueryClient) => c.getQueryData<{ userId: number }>(PROFILE)?.userId

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

/** Fills `client` as a finished startup would, then lets the batched save run. */
const saveFrom = async (client: QueryClient) => {
  const stop = saveQueriesOnChange(client, KEYS, owner)
  await client.fetchQuery({ queryKey: PROFILE, queryFn: () => ({ userId: 7, userName: 'priya' }) })
  await client.fetchQuery({ queryKey: TAGS, queryFn: () => [{ tagId: 1 }] })
  await vi.advanceTimersByTimeAsync(500)
  return stop
}

describe('queryPersistence', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }))
  afterEach(() => vi.useRealTimers())

  it('saves fetched results encrypted and restores them, marked stale, for the same user', async () => {
    const stop = await saveFrom(newClient())
    stop()
    expect(secureStorage.getItem('nops_query_cache')).toContain('priya')

    const next = newClient()
    expect(restoreSavedQueries(next, KEYS, 7)).toBe(true)
    expect(next.getQueryData(TAGS)).toEqual([{ tagId: 1 }])
    expect(next.getQueryState(PROFILE)?.isInvalidated).toBe(true)
  })

  it("never restores another user's data, and drops it", async () => {
    ;(await saveFrom(newClient()))()
    const next = newClient()
    expect(restoreSavedQueries(next, KEYS, 8)).toBe(false)
    expect(next.getQueryData(PROFILE)).toBeUndefined()
    expect(secureStorage.getItem('nops_query_cache')).toBeNull()
  })

  it('ignores a copy older than a day', async () => {
    ;(await saveFrom(newClient()))()
    vi.setSystemTime(Date.now() + QUERY_CACHE_MAX_AGE_MS + 1)
    expect(restoreSavedQueries(newClient(), KEYS, 7)).toBe(false)
  })

  it('reports a partial restore', async () => {
    const client = newClient()
    const stop = saveQueriesOnChange(client, KEYS, owner)
    await client.fetchQuery({ queryKey: PROFILE, queryFn: () => ({ userId: 7 }) })
    await vi.advanceTimersByTimeAsync(500)
    stop()
    const next = newClient()
    expect(restoreSavedQueries(next, KEYS, 7)).toBe(false)
    expect(next.getQueryData(PROFILE)).toEqual({ userId: 7 })
  })

  it('removes the saved copy when the queries are removed (sign-out)', async () => {
    const client = newClient()
    await saveFrom(client)
    client.removeQueries()
    await vi.advanceTimersByTimeAsync(500)
    expect(secureStorage.getItem('nops_query_cache')).toBeNull()
  })

  it('clearSavedQueries removes it', async () => {
    ;(await saveFrom(newClient()))()
    clearSavedQueries()
    expect(restoreSavedQueries(newClient(), KEYS, 7)).toBe(false)
  })
})
