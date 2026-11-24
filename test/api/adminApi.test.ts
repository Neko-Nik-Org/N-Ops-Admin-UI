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
/** Tests for the Admin API (src/api: users, API keys, audit logs): users on the (mocked) live API, the rest on the mock backend. */

import moment from 'moment'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApiKey, listApiKeys } from '@/api/apiKeys'
import { exportAuditLogs, listAuditLogs, retentionStart } from '@/api/auditLogs'
import {
  assignUserAccessPolicy,
  assignUserRole,
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
import { ApiError } from '@/types/api'
import { db, resetAdminMock } from '@/data/mockAdmin'
import { type AdminUserInput } from '@/types/user'
import { api, rawAdminUser } from '../testUtils'

const newUser: AdminUserInput = {
  userName: 'zoe',
  displayName: 'Zoe Park',
  primaryEmail: 'zoe@acme.dev',
  roleId: 4,
  password: 'Start#Pass1',
  isActive: true,
  accessPolicyId: 2,
}

beforeEach(() => resetAdminMock())

describe('users', () => {
  it('lists every user page by page from /user/admin/list', async () => {
    const page = Array.from({ length: 100 }, (_, i) => rawAdminUser(i + 1, `u${i + 1}`, `User ${i + 1}`, 1))
    api.get.mockResolvedValueOnce({ data: page }).mockResolvedValueOnce({ data: [rawAdminUser(101, 'last', 'Last', 2)] })
    const users = await listUsers()
    expect(users).toHaveLength(101)
    expect(api.get).toHaveBeenNthCalledWith(2, '/user/admin/list', { params: { limit: 100, offset: 100 } })
    expect(users[100]).toMatchObject({ userId: 101, userName: 'last', primaryEmail: 'last@acme.dev', accessPolicyId: null })
  })

  it('fetches one user, and explains when the API answers null', async () => {
    api.get.mockResolvedValueOnce({ data: rawAdminUser(3, 'marcus', 'Marcus Chen', 3) })
    expect(await getUser(3)).toMatchObject({ displayName: 'Marcus Chen', roleId: 3 })
    api.get.mockResolvedValueOnce({ data: null })
    await expect(getUser(99)).rejects.toThrow('That user no longer exists.')
  })

  it('creates a user with a base64 password and an access policy', async () => {
    api.post.mockResolvedValueOnce({ data: 'User created successfully and a welcome email sent' })
    expect(await createUser(newUser)).toEqual({ welcomeEmailSent: true })
    expect(api.post).toHaveBeenCalledWith('/user/admin/create', {
      user_name: 'zoe',
      display_name: 'Zoe Park',
      primary_email: 'zoe@acme.dev',
      user_details: {},
      is_active: true,
      role_id: 4,
      password: btoa('Start#Pass1'),
      access_restriction_policy_id: 2,
    })
  })

  it('treats a failed welcome email as created, and explains the bare database error', async () => {
    api.post.mockRejectedValueOnce(new ApiError('Email sending error (E131)', 417, 'E131'))
    expect(await createUser(newUser)).toEqual({ welcomeEmailSent: false })
    api.post.mockRejectedValueOnce(new ApiError('SQL Database error (E112)', 417, 'E112'))
    await expect(createUser(newUser)).rejects.toThrow(/username or email may already be in use/)
    api.post.mockRejectedValueOnce(new ApiError('Failed to create user in the database', 400))
    await expect(createUser(newUser)).rejects.toThrow('That role or access policy no longer exists.')
    api.post.mockRejectedValueOnce(new ApiError('Role or access restriction policy does not belong to the organization', 417))
    await expect(createUser(newUser)).rejects.toThrow('That role or access policy no longer exists.')
  })

  it('calls the per-user admin endpoints', async () => {
    const json = { headers: { 'Content-Type': 'application/json' } }
    await changeUserName(3, 'marcus_c')
    expect(api.put).toHaveBeenCalledWith('/user/admin/change-username/3', '"marcus_c"', json)
    await resetUserPassword(3, 'New#Pass1')
    expect(api.put).toHaveBeenCalledWith('/user/admin/reset/password/3', JSON.stringify(btoa('New#Pass1')), json)
    await verifyUserEmail(3)
    expect(api.patch).toHaveBeenCalledWith('/user/admin/verify-email/3')
    await deactivateUser(3)
    expect(api.patch).toHaveBeenCalledWith('/user/admin/deactivate/3')
    await deleteUser(3)
    expect(api.delete).toHaveBeenCalledWith('/user/admin/delete/3')
  })

  it('updates a profile, sending the email only when it changed', async () => {
    const details = { version: 1, work: { job_title: 'SRE' } }
    await updateUserProfile(
      3,
      { displayName: ' Marcus C ', primaryEmail: 'marcus@acme.dev', userDetails: details },
      'marcus@acme.dev',
    )
    expect(api.put).toHaveBeenCalledWith('/user/admin/update/3', {
      display_name: 'Marcus C',
      primary_email: null,
      user_details: details,
    })
    await updateUserProfile(3, { displayName: 'Marcus', primaryEmail: 'm@acme.dev', userDetails: {} }, 'marcus@acme.dev')
    expect(api.put).toHaveBeenLastCalledWith('/user/admin/update/3', {
      display_name: 'Marcus',
      primary_email: 'm@acme.dev',
      user_details: {},
    })
    api.put.mockRejectedValueOnce(new ApiError('SQL Database error (E112)', 417, 'E112'))
    await expect(updateUserProfile(3, { displayName: 'M', primaryEmail: 'x@acme.dev', userDetails: {} }, 'a')).rejects.toThrow(
      'Someone else already uses that email.',
    )
  })

  it('assigns a role, and a policy or none', async () => {
    await assignUserRole(3, 5)
    expect(api.put).toHaveBeenCalledWith('/user/admin/role/3/assign/5')
    await assignUserAccessPolicy(3, 7)
    expect(api.put).toHaveBeenCalledWith('/user/admin/ar-policy/3/assign', null, { params: { access_restriction_policy_id: 7 } })
    await assignUserAccessPolicy(3, null)
    expect(api.put).toHaveBeenLastCalledWith('/user/admin/ar-policy/3/assign', null, { params: {} })
  })

  it('changes only what differs, then checks the API really applied it', async () => {
    const before = await (api.get.mockResolvedValueOnce({ data: rawAdminUser(3, 'marcus', 'Marcus', 3) }), getUser(3))
    api.get.mockResolvedValueOnce({ data: rawAdminUser(3, 'marcus', 'Marcus', 3, { access_restriction_policy_id: 2 }) })
    await expect(updateUserAccess(before, { roleId: 3, accessPolicyId: 2 })).resolves.toMatchObject({ accessPolicyId: 2 })
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(api.put).toHaveBeenCalledWith('/user/admin/ar-policy/3/assign', null, { params: { access_restriction_policy_id: 2 } })

    // the API answers 204 without removing the policy
    const withPolicy = { ...before, accessPolicyId: 2 }
    api.get.mockResolvedValueOnce({ data: rawAdminUser(3, 'marcus', 'Marcus', 3, { access_restriction_policy_id: 2 }) })
    await expect(updateUserAccess(withPolicy, { roleId: 3, accessPolicyId: null })).rejects.toThrow(
      "The API didn't remove the access policy.",
    )

    api.get.mockResolvedValueOnce({ data: rawAdminUser(3, 'marcus', 'Marcus', 3) })
    await expect(updateUserAccess(before, { roleId: 9, accessPolicyId: null })).rejects.toThrow("The role didn't change.")
  })
})

describe('API keys', () => {
  it('returns the secret once, in the nk-{id}_ format, and keeps only its prefix', async () => {
    const { apiKey, secret } = await createApiKey({
      keyName: 'ci',
      keyDescription: 'CI',
      roleId: 6,
      tagId: 1,
      vaultProjectIds: [1, 3],
      isActive: true,
      expiresAt: null,
    })

    expect(apiKey.vaultProjectIds).toEqual([1, 3])
    expect(secret).toMatch(new RegExp(`^nk-${apiKey.apiKeyId}_[A-Za-z0-9]{40}$`))
    expect(secret.startsWith(apiKey.keyPrefix)).toBe(true)
    expect(JSON.stringify(await listApiKeys())).not.toContain(secret)
  })

  it('rejects a duplicate name', async () => {
    await expect(
      createApiKey({
        keyName: 'GRAFANA-AGENT',
        keyDescription: '',
        roleId: 6,
        tagId: 1,
        vaultProjectIds: [1],
        isActive: true,
        expiresAt: null,
      }),
    ).rejects.toThrow('already exists')
  })

  it('needs at least one vault project', async () => {
    const base = { keyName: 'ci', keyDescription: '', roleId: 6, tagId: 1, isActive: true, expiresAt: null }
    await expect(createApiKey({ ...base, vaultProjectIds: [] })).rejects.toThrow('Pick at least one vault project.')
  })
})

describe('audit logs', () => {
  it('never returns entries older than 90 days, even when asked', async () => {
    const { items, total } = await listAuditLogs({ from: moment().subtract(1, 'year').format('YYYY-MM-DD') }, 1, 10_000)
    expect(total).toBeGreaterThan(100)
    expect(items.every((l) => moment(l.occurredAt).isSameOrAfter(moment(retentionStart())))).toBe(true)
  })

  it('filters by category, exact action, person and outcome, and pages newest first', async () => {
    const auth = await listAuditLogs({ action: 'auth' }, 1, 10_000)
    expect(auth.items.every((l) => l.action.startsWith('auth.'))).toBe(true)

    const failed = await listAuditLogs({ action: 'auth.login_failed', outcome: 'failed' }, 1, 10_000)
    expect(failed.total).toBeGreaterThan(0)
    expect(failed.items.every((l) => l.action === 'auth.login_failed' && l.outcome === 'failed')).toBe(true)

    const byPriya = await listAuditLogs({ actor: 'user:2' }, 1, 10_000)
    expect(byPriya.items.every((l) => l.actor.name === 'Priya Rao')).toBe(true)

    const page1 = await listAuditLogs({}, 1, 25)
    const page2 = await listAuditLogs({}, 2, 25)
    expect(page1.items).toHaveLength(25)
    expect(page1.items.at(-1)!.occurredAt >= page2.items[0]!.occurredAt).toBe(true)
  })

  it('exports the filtered entries as CSV and logs the export', async () => {
    const { body, count } = await exportAuditLogs({ action: 'workflow' }, 'csv')
    const lines = body.split('\n')
    expect(lines[0]).toBe('id,time_utc,actor_type,actor,action,resource_type,resource,outcome,ip,details')
    expect(lines).toHaveLength(count + 1)
    expect(lines.slice(1).every((l) => l.includes(',workflow.'))).toBe(true)
    expect(db.auditLogs[0]).toMatchObject({ action: 'audit.export', details: 'CSV download' })
  })
})
