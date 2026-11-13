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

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrgInfo, getUiInfo, getUserDetails, saveUiInfo } from '../api/account'
import type { JsonObject } from '../types'

/** Query cache keys for the signed-in user's data. */
const UI_INFO_KEY = ['user-self', 'ui-info'] as const
const ORG_INFO_KEY = ['user-self', 'org-info'] as const
const USER_DETAILS_KEY = ['user-self', 'details'] as const

/**
 * Shared query definitions. The post-login bootstrap (useAppBootstrap) loads these up front,
 * and the hooks below read the same cache entries, so pages render without a second request.
 */
export const orgInfoQuery = queryOptions({ queryKey: ORG_INFO_KEY, queryFn: getOrgInfo, retry: false })
export const uiInfoQuery = queryOptions({ queryKey: UI_INFO_KEY, queryFn: getUiInfo, retry: false, staleTime: Infinity })
export const userDetailsQuery = queryOptions({ queryKey: USER_DETAILS_KEY, queryFn: getUserDetails, retry: false })

/** Organization name, quotas and usage for the Account page. */
export const useOrgInfo = () => useQuery(orgInfoQuery)

/** Saved UI preferences. Loaded once per session and only changed through useSaveUiInfo. */
export const useUiInfo = () => useQuery(uiInfoQuery)

/** The user's free-form extra profile info (`/user/self/details`). */
export const useUserDetails = () => useQuery(userDetailsQuery)

/** Saves UI preferences and updates the cache directly, so no refetch is needed. */
export const useSaveUiInfo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uiInfo: JsonObject) => saveUiInfo(uiInfo),
    onSuccess: (_, uiInfo) => queryClient.setQueryData(UI_INFO_KEY, uiInfo),
  })
}
