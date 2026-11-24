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
/** Types for roles (`/user/roles/*`). */

/** A role: a permission set, optionally scoped to tags (`user_role` + `role_tag`). */
export interface Role {
  roleId: number
  roleName: string
  roleDescription: string
  permissions: string[]
  /** Tags this role is limited to; empty means every tag. */
  tagIds: number[]
  canApproveApprovals: boolean
  canBypassApprovals: boolean
  allowedLinuxUsers: string[]
  createdAt: string
  updatedAt: string
}

/** Fields set when creating or editing a role. */
export type RoleInput = Omit<Role, 'roleId' | 'createdAt' | 'updatedAt'>
