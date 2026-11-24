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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAtomValue } from 'jotai'
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  inviteOrganizationAdmin,
  isOrganizationNameAvailable,
  listOrganizations,
  renameOrganization,
  setOrganizationActive,
  updateOrganizationDetails,
  updateOrganizationLimits,
} from '@/api/organizations'
import type { NewOrganization, OrganizationLimits } from '@/types/organization'
import { superAdminKeyAtom } from '@/store/adminKey'

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

/**
 * A super-admin change, sent with the current key. Afterwards the list and any open organization
 * reload, even when the change failed half-way.
 */
const useOrgMutation = <V>(run: (adminKey: string, vars: V) => Promise<void>) => {
  const adminKey = useAtomValue(superAdminKeyAtom)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: V) => (adminKey ? run(adminKey, vars) : Promise.reject(new Error('Enter the admin key first.'))),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export const useCreateOrganization = () => useOrgMutation((key, org: NewOrganization) => createOrganization(key, org))

export const useInviteOrganizationAdmin = () =>
  useOrgMutation((key, { organizationId, email }: { organizationId: string; email: string }) =>
    inviteOrganizationAdmin(key, organizationId, email),
  )

export const useRenameOrganization = () =>
  useOrgMutation((key, { organizationId, name }: { organizationId: string; name: string }) =>
    renameOrganization(key, organizationId, name),
  )

export const useSetOrganizationActive = () =>
  useOrgMutation((key, { organizationId, isActive }: { organizationId: string; isActive: boolean }) =>
    setOrganizationActive(key, organizationId, isActive),
  )

export const useUpdateOrganizationLimits = () =>
  useOrgMutation((key, { organizationId, limits }: { organizationId: string; limits: OrganizationLimits }) =>
    updateOrganizationLimits(key, organizationId, limits),
  )

export const useUpdateOrganizationDetails = () =>
  useOrgMutation(
    (
      key,
      {
        organizationId,
        which,
        details,
      }: { organizationId: string; which: 'profile' | 'billing'; details: Record<string, unknown> },
    ) => updateOrganizationDetails(key, organizationId, which, details),
  )

export const useDeleteOrganization = () =>
  useOrgMutation((key, organizationId: string) => deleteOrganization(key, organizationId))

/** Name availability with the current key (true = free). */
export const useCheckOrganizationName = () => {
  const adminKey = useAtomValue(superAdminKeyAtom)
  return useCallback((name: string) => isOrganizationNameAvailable(adminKey ?? '', name), [adminKey])
}
