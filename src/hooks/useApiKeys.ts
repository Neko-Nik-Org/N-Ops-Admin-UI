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
/** React Query hooks for API keys. */

import { useMutation, useQuery } from '@tanstack/react-query'
import { createApiKey, deleteApiKey, listApiKeys, updateApiKey } from '@/api/apiKeys'
import type { ApiKeyInput } from '@/types/apiKey'
import { ADMIN_KEYS, useAdminRefresh } from '@/hooks/useAdminRefresh'

export const useApiKeys = () => useQuery({ queryKey: ADMIN_KEYS.apiKeys, queryFn: listApiKeys })

/** One key, picked from the list (there's no fetch-one endpoint); `apiKey` is undefined when it doesn't exist. */
export const useApiKey = (apiKeyId: number | null) => {
  const query = useApiKeys()
  return { ...query, apiKey: apiKeyId === null ? undefined : query.data?.find((k) => k.apiKeyId === apiKeyId) }
}

export const useCreateApiKey = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.apiKeys)
  return useMutation({ mutationFn: (input: ApiKeyInput) => createApiKey(input), onSuccess: refresh })
}

export const useUpdateApiKey = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.apiKeys)
  return useMutation({
    mutationFn: ({ apiKeyId, input }: { apiKeyId: number; input: ApiKeyInput }) => updateApiKey(apiKeyId, input),
    onSuccess: refresh,
  })
}

export const useDeleteApiKey = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.apiKeys)
  return useMutation({ mutationFn: (apiKeyId: number) => deleteApiKey(apiKeyId), onSuccess: refresh })
}
