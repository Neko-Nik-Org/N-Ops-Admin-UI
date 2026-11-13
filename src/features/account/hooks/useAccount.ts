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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrgInfo, getUiInfo, saveUiInfo } from '../api/account'
import type { JsonObject } from '../types'

/** Query cache keys for the signed-in user's data. */
const UI_INFO_KEY = ['user-self', 'ui-info'] as const
const ORG_INFO_KEY = ['user-self', 'org-info'] as const

/** Organization name, quotas and usage for the Account page. */
export const useOrgInfo = () => useQuery({ queryKey: ORG_INFO_KEY, queryFn: getOrgInfo, retry: false })

/** Saved UI preferences. Loaded once per session and only changed through useSaveUiInfo. */
export const useUiInfo = () => useQuery({ queryKey: UI_INFO_KEY, queryFn: getUiInfo, retry: false, staleTime: Infinity })

/** Saves UI preferences and updates the cache directly, so no refetch is needed. */
export const useSaveUiInfo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uiInfo: JsonObject) => saveUiInfo(uiInfo),
    onSuccess: (_, uiInfo) => queryClient.setQueryData(UI_INFO_KEY, uiInfo),
  })
}
