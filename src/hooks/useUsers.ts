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
/** React Query hooks for the organization's users (`/user/admin/*`). */

import { useMutation, useQuery } from '@tanstack/react-query'
import { orgInfoQuery } from '@/hooks/useAccount'
import { useHasPermissions } from '@/hooks/usePermissions'
import {
  changeUserName,
  createUser,
  deactivateUser,
  deleteUser,
  getUser,
  listUsers,
  resetUserPassword,
  updateUserAccess,
  updateUserProfile,
  verifyUserEmail,
} from '@/api/users'
import type { AdminUser, AdminUserInput, AdminUserProfileInput } from '@/types/user'
import { ADMIN_KEYS, useAdminRefresh } from '@/hooks/useAdminRefresh'

/**
 * Every user in the organization, from `/user/admin/list`. Only loads with `user:view` (the API's
 * check), so pickers elsewhere don't hit a 403.
 */
export const useAdminUsers = () => {
  const canView = useHasPermissions('user:view')
  return useQuery({ queryKey: ADMIN_KEYS.users, queryFn: listUsers, enabled: canView })
}

/** One user, fresh from `/user/admin/fetch/{id}` (needs `user:view`). */
export const useAdminUser = (userId: number | null) =>
  useQuery({ queryKey: [...ADMIN_KEYS.users, userId], queryFn: () => getUser(userId!), enabled: userId !== null })

/** Adds a user. Also refreshes the org info, whose seat count just changed. */
export const useCreateUser = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.users, orgInfoQuery.queryKey)
  return useMutation({ mutationFn: (input: AdminUserInput) => createUser(input), onSuccess: refresh })
}

/** A change to one user: refreshes the list (and the open user) afterwards, even when it failed half-way. */
const useUserMutation = <T>(run: (args: T) => Promise<void>, ...extraKeys: ReadonlyArray<readonly string[]>) => {
  const refresh = useAdminRefresh(ADMIN_KEYS.users, ...extraKeys)
  return useMutation({ mutationFn: run, onSettled: refresh })
}

export const useChangeUserName = () =>
  useUserMutation(({ userId, userName }: { userId: number; userName: string }) => changeUserName(userId, userName))

export const useResetUserPassword = () =>
  useUserMutation(({ userId, password }: { userId: number; password: string }) => resetUserPassword(userId, password))

export const useVerifyUserEmail = () => useUserMutation((userId: number) => verifyUserEmail(userId))

export const useDeactivateUser = () => useUserMutation((userId: number) => deactivateUser(userId))

export const useUpdateUserProfile = () =>
  useUserMutation(({ user, input }: { user: AdminUser; input: AdminUserProfileInput }) =>
    updateUserProfile(user.userId, input, user.primaryEmail),
  )

/** Role and access policy; rejects when the API didn't apply the change (see updateUserAccess). */
export const useUpdateUserAccess = () =>
  useUserMutation(
    async ({ user, roleId, accessPolicyId }: { user: AdminUser; roleId: number; accessPolicyId: number | null }) => {
      await updateUserAccess(user, { roleId, accessPolicyId })
    },
  )

export const useDeleteUser = () => useUserMutation((userId: number) => deleteUser(userId), orgInfoQuery.queryKey)
