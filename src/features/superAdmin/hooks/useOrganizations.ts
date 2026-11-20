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
/** Super-admin data hooks. Everything is keyed by the admin key, so a new key never sees old results. */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { getOrganization, listOrganizations } from '../api/organizations'
import { superAdminKeyAtom } from '../store/adminKey'

/** Under ['system', …] so signing a normal user out doesn't drop it (see AppProviders). */
const KEY = ['system', 'super-admin', 'organizations'] as const

/** A list loaded moments ago (e.g. by the key check) is reused rather than fetched again. */
const FRESH_MS = 60_000

/**
 * Checks an admin key by loading the organization list with it (the request the list page needs
 * anyway), and caches that list, so accepting the key costs one request, not two.
 */
export const useCheckAdminKey = () => {
  const queryClient = useQueryClient()
  return useCallback(
    async (adminKey: string) => {
      const orgs = await listOrganizations(adminKey)
      queryClient.setQueryData([...KEY, adminKey], orgs)
    },
    [queryClient],
  )
}

export const useOrganizations = () => {
  const adminKey = useAtomValue(superAdminKeyAtom)
  return useQuery({
    queryKey: [...KEY, adminKey],
    queryFn: () => listOrganizations(adminKey!),
    enabled: !!adminKey,
    retry: false,
    staleTime: FRESH_MS,
  })
}

export const useOrganization = (organizationId: string) => {
  const adminKey = useAtomValue(superAdminKeyAtom)
  return useQuery({
    queryKey: [...KEY, adminKey, organizationId],
    queryFn: () => getOrganization(adminKey!, organizationId),
    enabled: !!adminKey,
    retry: false,
    staleTime: FRESH_MS,
  })
}
