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
/** Roles (CRUD). Mock until `/user/roles/*` is live. */

import { clone, db, mockDelay, notFound, recordAudit } from '../mock/db'
import type { Role, RoleInput } from '../types'

const findRole = (roleId: number) => db.roles.find((r) => r.roleId === roleId) ?? notFound('role')

/** Role names are unique per organization. */
const assertUnique = (name: string, exceptId?: number) => {
  if (db.roles.some((r) => r.roleId !== exceptId && r.roleName.toLowerCase() === name.toLowerCase())) {
    throw new Error(`A role called "${name}" already exists.`)
  }
}

/** Future: `GET /user/roles/list`. */
export const listRoles = async (): Promise<Role[]> => {
  await mockDelay()
  return clone(db.roles)
}

/** Future: `POST /user/roles/create`. */
export const createRole = async (input: RoleInput): Promise<Role> => {
  await mockDelay()
  assertUnique(input.roleName)
  const now = new Date().toISOString()
  const role: Role = { ...clone(input), roleId: db.nextId.role++, createdAt: now, updatedAt: now }
  db.roles.push(role)
  recordAudit('role.create', 'role', role.roleName, `${role.permissions.length} permissions`)
  return clone(role)
}

/** Future: `PUT /user/roles/update`. */
export const updateRole = async (roleId: number, input: RoleInput): Promise<void> => {
  await mockDelay()
  const role = findRole(roleId)
  assertUnique(input.roleName, roleId)
  Object.assign(role, clone(input), { updatedAt: new Date().toISOString() })
  recordAudit('role.update', 'role', role.roleName, `${role.permissions.length} permissions`)
}

/**
 * Future: `DELETE /user/roles/delete/{id}`. In the schema, deleting a role also deletes every user
 * and API key that has it (ON DELETE CASCADE), so this refuses while anything still uses the role.
 */
export const deleteRole = async (roleId: number): Promise<void> => {
  await mockDelay()
  const role = findRole(roleId)
  const users = db.users.filter((u) => u.roleId === roleId).length
  const keys = db.apiKeys.filter((k) => k.roleId === roleId).length
  if (users || keys) {
    const parts = [users && `${users} user${users === 1 ? '' : 's'}`, keys && `${keys} API key${keys === 1 ? '' : 's'}`].filter(Boolean)
    throw new Error(`${parts.join(' and ')} still use "${role.roleName}". Move them to another role first.`)
  }
  db.roles = db.roles.filter((r) => r.roleId !== roleId)
  recordAudit('role.delete', 'role', role.roleName)
}
