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
/**
 * API calls for roles (`/user/roles/*`). A role is a permission set, optionally limited to some
 * tags and Linux users. The API only lets you create, edit or delete a role whose permissions,
 * tags and approval flags are within your own (see `validate_role_restrictions` in the Main API).
 */

import { apiClient } from '@/api/client'
import { type Role, type RoleInput } from '@/types/role'

/** Role as sent by the API. */
interface RawRole {
  role_id: number
  role_name: string
  role_description: string
  permissions: string[]
  allowed_linux_users: string[]
  /** Empty means every tag. */
  allowed_tags: number[]
  can_bypass_approvals: boolean
  can_approve_approvals: boolean
  created_at: string
  updated_at: string
}

/** Maps an API role to the app's camelCase Role. */
const toRole = (r: RawRole): Role => ({
  roleId: r.role_id,
  roleName: r.role_name,
  roleDescription: r.role_description,
  permissions: r.permissions,
  tagIds: r.allowed_tags,
  canApproveApprovals: r.can_approve_approvals,
  canBypassApprovals: r.can_bypass_approvals,
  allowedLinuxUsers: r.allowed_linux_users,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

/** The permission half of a role, as the create and update-permissions endpoints take it. */
const toRawPermissions = (input: RoleInput) => ({
  permissions: input.permissions,
  allowed_linux_users: input.allowedLinuxUsers,
  allowed_tags: input.tagIds,
  can_approve_approvals: input.canApproveApprovals,
  can_bypass_approvals: input.canBypassApprovals,
})

/** Roles fetched per request when listing every role. */
export const ROLE_PAGE_SIZE = 100

/** Options for one page of roles. */
export interface ListRolesParams {
  /** Case-insensitive match on the role name. */
  search?: string
  limit?: number
  offset?: number
}

/** `GET /user/roles/list` — one page of roles, newest first. Requires `user:role:view`. */
export const listRolesPage = async ({ search, limit = ROLE_PAGE_SIZE, offset = 0 }: ListRolesParams = {}): Promise<Role[]> => {
  const params: Record<string, string | number> = { limit, offset }
  if (search?.trim()) params.role_name_search = search.trim()
  const { data } = await apiClient.get<RawRole[]>('/user/roles/list', { params })
  return data.map(toRole)
}

/** Every role in the organization, newest first (pages through `/user/roles/list`). */
export const listRoles = async (): Promise<Role[]> => {
  const roles: Role[] = []
  for (;;) {
    const page = await listRolesPage({ offset: roles.length })
    roles.push(...page)
    if (page.length < ROLE_PAGE_SIZE) return roles
  }
}

/** `GET /user/roles/fetch/{id}` — requires `user:role:view`. */
export const fetchRole = async (roleId: number): Promise<Role> => {
  const { data } = await apiClient.get<RawRole>(`/user/roles/fetch/${roleId}`)
  return toRole(data)
}

/** `POST /user/roles/create` — requires `user:role:view` + `user:role:create`. Responds 201 with no body. */
export const createRole = async (input: RoleInput): Promise<void> => {
  await apiClient.post('/user/roles/create', {
    role_name: input.roleName,
    role_description: input.roleDescription,
    ...toRawPermissions(input),
  })
}

/** `PATCH /user/roles/update/info/{id}` — renames / re-describes a role. Requires `user:role:view` + `user:role:edit`. */
export const updateRoleInfo = async (roleId: number, input: Pick<RoleInput, 'roleName' | 'roleDescription'>): Promise<void> => {
  await apiClient.patch(`/user/roles/update/info/${roleId}`, {
    role_name: input.roleName,
    role_description: input.roleDescription,
  })
}

/**
 * `PUT /user/roles/update/permissions/{id}` — replaces the role's permissions, tags, Linux users and
 * approval flags. Requires `user:role:view` + `user:role:edit`.
 */
export const updateRolePermissions = async (roleId: number, input: RoleInput): Promise<void> => {
  await apiClient.put(`/user/roles/update/permissions/${roleId}`, toRawPermissions(input))
}

const sameSet = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x) => b.includes(x))

/** Whether saving `input` over `role` changes its name or description. */
const infoChanged = (role: Role, input: RoleInput) =>
  role.roleName !== input.roleName || role.roleDescription !== input.roleDescription

/** Whether saving `input` over `role` changes anything the permissions endpoint covers. */
const permissionsChanged = (role: Role, input: RoleInput) =>
  !sameSet(role.permissions, input.permissions) ||
  !sameSet(role.tagIds, input.tagIds) ||
  !sameSet(role.allowedLinuxUsers, input.allowedLinuxUsers) ||
  role.canApproveApprovals !== input.canApproveApprovals ||
  role.canBypassApprovals !== input.canBypassApprovals

/**
 * Saves an edited role. The API splits a role into info and permissions, so this calls only the
 * endpoint(s) whose fields changed: permissions first, so a rejected permission change leaves the
 * name untouched too.
 */
export const updateRole = async (role: Role, input: RoleInput): Promise<void> => {
  if (permissionsChanged(role, input)) await updateRolePermissions(role.roleId, input)
  if (infoChanged(role, input)) await updateRoleInfo(role.roleId, input)
}

/**
 * `DELETE /user/roles/delete/{id}` — requires `user:role:view` + `user:role:delete`. The API answers
 * 412 while any user still has the role.
 */
export const deleteRole = async (roleId: number): Promise<void> => {
  await apiClient.delete(`/user/roles/delete/${roleId}`)
}
