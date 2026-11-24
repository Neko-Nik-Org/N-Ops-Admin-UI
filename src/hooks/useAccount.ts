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

/** React Query hooks for account data. */

import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import {
  getAntiPhishingSecret,
  getOrgInfo,
  getProfile,
  getUiInfo,
  getUserDetails,
  isUsernameAvailable,
  saveUiInfo,
  saveUserDetails,
  updateAntiPhishingSecret,
} from '@/api/account'
import { usernamePolicyError } from '@/utils/credentialRules'
import type { JsonObject } from '@/types/account'
import { parseUiInfo, serializeUiInfo, type UiInfo } from '@/utils/uiInfo'

/** Query cache keys for the signed-in user's data. */
const UI_INFO_KEY = ['user-self', 'ui-info'] as const
const ORG_INFO_KEY = ['user-self', 'org-info'] as const
const USER_DETAILS_KEY = ['user-self', 'details'] as const
/** Cache key for the full profile; invalidate it after changing the user's own role. */
export const PROFILE_KEY = ['user-self', 'profile'] as const

/**
 * Shared query definitions. The post-login bootstrap (useAppBootstrap) loads these up front,
 * and the hooks below read the same cache entries, so pages render without a second request.
 */
export const orgInfoQuery = queryOptions({ queryKey: ORG_INFO_KEY, queryFn: getOrgInfo, retry: false })
export const uiInfoQuery = queryOptions({ queryKey: UI_INFO_KEY, queryFn: getUiInfo, retry: false, staleTime: Infinity })
export const userDetailsQuery = queryOptions({ queryKey: USER_DETAILS_KEY, queryFn: getUserDetails, retry: false })
export const profileQuery = queryOptions({ queryKey: PROFILE_KEY, queryFn: getProfile, retry: false })

/** Organization name, quotas and usage for the Account page. */
export const useOrgInfo = () => useQuery(orgInfoQuery)

/** Saved UI preferences. Loaded once per session and only changed through updateUiInfo. */
export const useUiInfo = () => useQuery(uiInfoQuery)

/** The user's free-form extra profile info (`/user/self/details`). */
export const useUserDetails = () => useQuery(userDetailsQuery)

/** Preference changes are collected and sent at most this often (plus at sign-out and when the tab is hidden). */
export const UI_INFO_SAVE_INTERVAL_MS = 5 * 60 * 1000

/** Unsent preference changes for one query client. */
interface UiInfoBatch {
  timer?: ReturnType<typeof setTimeout>
  /** Callers waiting for the next send. */
  waiting: Array<{ resolve: () => void; reject: (e: unknown) => void }>
  /** Sends run one at a time, so an older copy can't land after a newer one. */
  queue: Promise<unknown>
}
const batches = new WeakMap<QueryClient, UiInfoBatch>()
const batchOf = (queryClient: QueryClient): UiInfoBatch => {
  let batch = batches.get(queryClient)
  if (!batch) batches.set(queryClient, (batch = { waiting: [], queue: Promise.resolve() }))
  return batch
}

/**
 * Sends the collected preference changes now, if there are any. The API replaces the whole object,
 * so the cached copy (which already holds every change) is what goes out. A failed send is retried
 * on the next interval.
 */
export const flushUiInfo = (queryClient: QueryClient): Promise<void> => {
  const batch = batchOf(queryClient)
  if (!batch.waiting.length) return batch.queue.then(() => {})
  clearTimeout(batch.timer)
  batch.timer = undefined
  const waiting = batch.waiting.splice(0)
  const run = async () => {
    const current = queryClient.getQueryData<JsonObject>(UI_INFO_KEY)
    if (current) await saveUiInfo(current)
  }
  const done = batch.queue.then(run, run)
  batch.queue = done.catch(() => {})
  return done.then(
    () => waiting.forEach((w) => w.resolve()),
    (error: unknown) => {
      waiting.forEach((w) => w.reject(error))
      if (!batch.timer) batch.timer = setTimeout(() => void flushUiInfo(queryClient).catch(() => {}), UI_INFO_SAVE_INTERVAL_MS)
      throw error
    },
  )
}

/**
 * Changes the UI preferences. The change shows at once (it's merged into the cached copy), and is
 * sent with the others at most every UI_INFO_SAVE_INTERVAL_MS, or sooner by flushUiInfo (sign-out,
 * tab hidden). The promise settles when the change has reached the API. Does nothing until the
 * saved preferences have loaded (writing before that would wipe them).
 */
export const updateUiInfo = (queryClient: QueryClient, patch: Partial<UiInfo>): Promise<void> => {
  const current = queryClient.getQueryData<JsonObject>(UI_INFO_KEY)
  if (!current) return Promise.resolve()
  const { info, preserved } = parseUiInfo(current)
  queryClient.setQueryData(UI_INFO_KEY, serializeUiInfo({ ...info, ...patch }, preserved))
  const batch = batchOf(queryClient)
  const sent = new Promise<void>((resolve, reject) => batch.waiting.push({ resolve, reject }))
  if (!batch.timer) batch.timer = setTimeout(() => void flushUiInfo(queryClient).catch(() => {}), UI_INFO_SAVE_INTERVAL_MS)
  return sent
}

/** `updateUiInfo` bound to this app's query client. */
export const useUpdateUiInfo = () => {
  const queryClient = useQueryClient()
  return useCallback((patch: Partial<UiInfo>) => updateUiInfo(queryClient, patch), [queryClient])
}

/** Saves the free-form profile details (replacing the whole object) and updates the cache directly. */
export const useSaveUserDetails = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (details: JsonObject) => saveUserDetails(details),
    onSuccess: (_, details) => queryClient.setQueryData(USER_DETAILS_KEY, details),
  })
}

/** Wait after the last keystroke before asking the API whether a username is free. */
const USERNAME_CHECK_DEBOUNCE_MS = 400

/** Availability of a typed username, for inline feedback next to the field. */
export type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'error'

/**
 * Live "is this username free?" check against `/user/self/user-name/check/:username`.
 * Only asks once typing pauses, and only for names that pass the username policy and differ from
 * `currentUserName` (for renames). Reusable by admin user forms once those use the live API.
 */
export const useUsernameAvailability = (userName: string, currentUserName?: string): UsernameAvailability => {
  const candidate = userName.trim()
  const [debounced, setDebounced] = useState(candidate)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(candidate), USERNAME_CHECK_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [candidate])

  const checkable = !!candidate && candidate !== currentUserName && usernamePolicyError(candidate) === null
  const query = useQuery({
    queryKey: ['user-self', 'username-available', debounced],
    queryFn: () => isUsernameAvailable(debounced),
    enabled: checkable && debounced === candidate,
    retry: false,
    staleTime: 30_000,
  })

  if (!checkable) return 'idle'
  if (debounced !== candidate || query.isPending) return 'checking'
  if (query.isError) return 'error'
  return query.data ? 'available' : 'taken'
}

const ANTI_PHISHING_KEY = ['user-self', 'anti-phishing-secret'] as const

/**
 * The anti-phishing secret. Only loaded while `enabled` (when the user asks to see it), and not
 * kept once nothing shows it, so it doesn't sit in memory or in the saved startup data.
 */
export const useAntiPhishingSecret = (enabled: boolean) =>
  useQuery({ queryKey: ANTI_PHISHING_KEY, queryFn: getAntiPhishingSecret, enabled, retry: false, gcTime: 0 })

/** Saves a new anti-phishing secret and updates the cached copy. */
export const useUpdateAntiPhishingSecret = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAntiPhishingSecret,
    onSuccess: (_, secret) => queryClient.setQueryData(ANTI_PHISHING_KEY, secret),
  })
}
