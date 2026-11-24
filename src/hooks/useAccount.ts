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
  getOrgInfo,
  getProfile,
  getUiInfo,
  getUserDetails,
  isUsernameAvailable,
  saveUiInfo,
  saveUserDetails,
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

let uiInfoQueue: Promise<unknown> = Promise.resolve()

/**
 * Saves a change to the UI preferences. The API replaces the whole object, so each change is merged
 * into the latest cached copy when its turn comes; changes go out one at a time, so two quick ones
 * can't overwrite each other. Does nothing until the saved preferences have loaded (writing before
 * that would wipe them).
 */
export const updateUiInfo = (queryClient: QueryClient, patch: Partial<UiInfo>): Promise<void> => {
  const run = async () => {
    const current = queryClient.getQueryData<JsonObject>(UI_INFO_KEY)
    if (!current) return
    const { info, preserved } = parseUiInfo(current)
    const next = serializeUiInfo({ ...info, ...patch }, preserved)
    await saveUiInfo(next)
    queryClient.setQueryData(UI_INFO_KEY, next)
  }
  const done = uiInfoQueue.then(run, run)
  uiInfoQueue = done.catch(() => {})
  return done
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
