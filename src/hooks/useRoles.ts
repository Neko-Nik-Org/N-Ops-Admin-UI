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
/** React Query hooks for roles (`/user/roles/*`). */

import { useMutation, useQuery } from '@tanstack/react-query'
import { PROFILE_KEY } from '@/hooks/useAccount'
import { useHasPermissions } from '@/hooks/usePermissions'
import { createRole, deleteRole, fetchRole, listRoles, updateRole } from '@/api/roles'
import type { Role, RoleInput } from '@/types/role'
import { ADMIN_KEYS, useAdminRefresh } from '@/hooks/useAdminRefresh'

/** Every role in the organization, from `/user/roles/list`. Pass `enabled: false` without `user:role:view`. */
export const useRoles = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: ADMIN_KEYS.roles, queryFn: listRoles, enabled })

/** One role fresh from `GET /user/roles/fetch/{id}`; idle while `roleId` is null. */
export const useRole = (roleId: number | null) =>
  useQuery({
    queryKey: [...ADMIN_KEYS.roles, roleId],
    queryFn: () => fetchRole(roleId as number),
    enabled: roleId !== null,
    retry: false,
    gcTime: 0,
  })

/**
 * Real roles for pickers and name lookups on other pages (Users, API keys). Only fetched with
 * `user:role:view`; without it `canView` is false and the list stays empty.
 */
export const useRoleOptions = () => {
  const canView = useHasPermissions('user:role:view')
  const { data: roles = [], isLoading } = useRoles({ enabled: canView })
  const roleName = (roleId: number) => roles.find((r) => r.roleId === roleId)?.roleName ?? `Role #${roleId}`
  return { roles, roleName, canView, isLoading: canView && isLoading }
}

export const useCreateRole = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.roles)
  return useMutation({ mutationFn: (input: RoleInput) => createRole(input), onSuccess: refresh })
}

export const useUpdateRole = () => {
  // the edited role may be the signed-in user's own, so their profile is reloaded too
  const refresh = useAdminRefresh(ADMIN_KEYS.roles, PROFILE_KEY)
  return useMutation({
    mutationFn: ({ role, input }: { role: Role; input: RoleInput }) => updateRole(role, input),
    onSuccess: refresh,
  })
}

export const useDeleteRole = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.roles)
  return useMutation({ mutationFn: (roleId: number) => deleteRole(roleId), onSuccess: refresh })
}
