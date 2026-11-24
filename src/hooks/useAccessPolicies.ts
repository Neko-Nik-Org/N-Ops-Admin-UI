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
/** React Query hooks for access restriction policies (`/policy/access-restriction/*`). */

import { useMutation, useQuery } from '@tanstack/react-query'
import {
  countAccessPolicyUsers,
  createAccessPolicy,
  deleteAccessPolicy,
  fetchAccessPolicy,
  listAccessPolicies,
  updateAccessPolicy,
} from '@/api/accessPolicies'
import type { AccessPolicy, AccessPolicyInput } from '@/types/accessPolicy'
import { ADMIN_KEYS, useAdminRefresh } from '@/hooks/useAdminRefresh'

/** Every access policy, from `/policy/access-restriction/list`. Pass `enabled: false` without `policy:ar:view`. */
export const useAccessPolicies = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: ADMIN_KEYS.accessPolicies, queryFn: listAccessPolicies, enabled })

/** One policy fresh from `GET /policy/access-restriction/get/{id}`; idle while `policyId` is null. */
export const useAccessPolicy = (policyId: number | null) =>
  useQuery({
    queryKey: [...ADMIN_KEYS.accessPolicies, policyId],
    queryFn: () => fetchAccessPolicy(policyId as number),
    enabled: policyId !== null,
    retry: false,
    gcTime: 0,
  })

/** How many users have the policy (`/check/{id}`), e.g. to warn before deleting it; idle while null. */
export const useAccessPolicyUserCount = (policyId: number | null) =>
  useQuery({
    queryKey: [...ADMIN_KEYS.accessPolicies, policyId, 'users'],
    queryFn: () => countAccessPolicyUsers(policyId as number),
    enabled: policyId !== null,
    retry: false,
    gcTime: 0,
  })

export const useCreateAccessPolicy = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.accessPolicies)
  return useMutation({ mutationFn: (input: AccessPolicyInput) => createAccessPolicy(input), onSuccess: refresh })
}

export const useUpdateAccessPolicy = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.accessPolicies)
  return useMutation({
    mutationFn: ({ policy, input }: { policy: AccessPolicy; input: AccessPolicyInput }) => updateAccessPolicy(policy, input),
    // the rules may have saved before the name failed, so refresh either way
    onSettled: refresh,
  })
}

export const useDeleteAccessPolicy = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.accessPolicies)
  return useMutation({ mutationFn: (policyId: number) => deleteAccessPolicy(policyId), onSuccess: refresh })
}
