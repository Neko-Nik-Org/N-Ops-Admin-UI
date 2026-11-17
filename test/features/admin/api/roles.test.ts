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
/** Tests for src/features/admin/api/roles.ts. */

import { describe, expect, it } from 'vitest'
import {
  createRole,
  deleteRole,
  fetchRole,
  listRoles,
  listRolesPage,
  ROLE_PAGE_SIZE,
  updateRole,
} from '@/features/admin/api/roles'
import type { Role, RoleInput } from '@/features/admin/types'
import { api } from '../../../testUtils'

const rawRole = {
  role_id: 7,
  role_name: 'Operator',
  role_description: 'Runs production',
  permissions: ['tag:create', 'tag:edit'],
  allowed_linux_users: ['deploy'],
  allowed_tags: [1, 2],
  can_bypass_approvals: false,
  can_approve_approvals: true,
  created_at: '2026-11-17T08:00:00Z',
  updated_at: '2026-11-17T09:00:00Z',
}

const role: Role = {
  roleId: 7,
  roleName: 'Operator',
  roleDescription: 'Runs production',
  permissions: ['tag:create', 'tag:edit'],
  tagIds: [1, 2],
  canApproveApprovals: true,
  canBypassApprovals: false,
  allowedLinuxUsers: ['deploy'],
  createdAt: '2026-11-17T08:00:00Z',
  updatedAt: '2026-11-17T09:00:00Z',
}

const { roleId: _id, createdAt: _c, updatedAt: _u, ...input } = role
const roleInput: RoleInput = input

const rawPermissions = {
  permissions: ['tag:create', 'tag:edit'],
  allowed_linux_users: ['deploy'],
  allowed_tags: [1, 2],
  can_approve_approvals: true,
  can_bypass_approvals: false,
}

describe('roles api', () => {
  it('lists a page of roles with the search, limit and offset the API requires', async () => {
    api.get.mockResolvedValue({ data: [rawRole] })
    await expect(listRolesPage({ search: ' oper ', limit: 10, offset: 20 })).resolves.toEqual([role])
    expect(api.get).toHaveBeenCalledWith('/user/roles/list', { params: { limit: 10, offset: 20, role_name_search: 'oper' } })
  })

  it('leaves out an empty search', async () => {
    api.get.mockResolvedValue({ data: [] })
    await listRolesPage({ search: '  ' })
    expect(api.get).toHaveBeenCalledWith('/user/roles/list', { params: { limit: ROLE_PAGE_SIZE, offset: 0 } })
  })

  it('pages through every role', async () => {
    const full = Array.from({ length: ROLE_PAGE_SIZE }, (_, i) => ({ ...rawRole, role_id: i + 1 }))
    api.get.mockResolvedValueOnce({ data: full }).mockResolvedValueOnce({ data: [{ ...rawRole, role_id: 999 }] })
    const roles = await listRoles()
    expect(roles).toHaveLength(ROLE_PAGE_SIZE + 1)
    expect(api.get).toHaveBeenLastCalledWith('/user/roles/list', { params: { limit: ROLE_PAGE_SIZE, offset: ROLE_PAGE_SIZE } })
  })

  it('fetches one role', async () => {
    api.get.mockResolvedValue({ data: rawRole })
    await expect(fetchRole(7)).resolves.toEqual(role)
    expect(api.get).toHaveBeenCalledWith('/user/roles/fetch/7')
  })

  it('creates a role', async () => {
    api.post.mockResolvedValue({ data: undefined })
    await createRole(roleInput)
    expect(api.post).toHaveBeenCalledWith('/user/roles/create', {
      role_name: 'Operator',
      role_description: 'Runs production',
      ...rawPermissions,
    })
  })

  it('sends only the name and description when only those changed', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    await updateRole(role, { ...roleInput, roleName: 'Ops' })
    expect(api.patch).toHaveBeenCalledWith('/user/roles/update/info/7', { role_name: 'Ops', role_description: 'Runs production' })
    expect(api.put).not.toHaveBeenCalled()
  })

  it('sends only the permissions when only those changed (order does not matter)', async () => {
    api.put.mockResolvedValue({ data: undefined })
    await updateRole(role, { ...roleInput, permissions: ['tag:edit', 'tag:create', 'tag:delete'], tagIds: [2, 1] })
    expect(api.put).toHaveBeenCalledWith('/user/roles/update/permissions/7', {
      ...rawPermissions,
      permissions: ['tag:edit', 'tag:create', 'tag:delete'],
      allowed_tags: [2, 1],
    })
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('saves permissions before the name, and stops if the permissions are refused', async () => {
    api.put.mockRejectedValue(new Error('Role permissions exceed session user’s permissions'))
    await expect(updateRole(role, { ...roleInput, roleName: 'Ops', canBypassApprovals: true })).rejects.toThrow('exceed')
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('makes no request when nothing changed', async () => {
    await updateRole(role, { ...roleInput, permissions: [...roleInput.permissions].reverse() })
    expect(api.put).not.toHaveBeenCalled()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('deletes a role', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    await deleteRole(7)
    expect(api.delete).toHaveBeenCalledWith('/user/roles/delete/7')
  })
})
