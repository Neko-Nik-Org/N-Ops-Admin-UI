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
/** Tests for the mock-backed Admin API (src/features/admin/api/*). */

import moment from 'moment'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApiKey, listApiKeys } from '@/features/admin/api/apiKeys'
import { exportAuditLogs, listAuditLogs, retentionStart } from '@/features/admin/api/auditLogs'
import { getOrganization, updateOrganization } from '@/features/admin/api/organization'
import { deleteRole, listRoles } from '@/features/admin/api/roles'
import { createUser, deleteUser, listUsers, updateUser } from '@/features/admin/api/users'
import { db, resetAdminMock } from '@/features/admin/mock/db'
import type { AdminUserInput } from '@/features/admin/types'

const newUser: AdminUserInput = {
  userName: 'zoe',
  displayName: 'Zoe Park',
  primaryEmail: 'zoe@acme.dev',
  roleId: 4,
  isActive: true,
  hasIpRestriction: false,
  allowedIps: ['1.2.3.4'],
}

beforeEach(() => resetAdminMock())

describe('users', () => {
  it('creates a user, counts the seat and records it in the audit log', async () => {
    const before = (await listUsers()).length
    const user = await createUser(newUser)

    expect(user).toMatchObject({ userName: 'zoe', isEmailVerified: false, lastLoginAt: null, allowedIps: [] })
    expect(await listUsers()).toHaveLength(before + 1)
    expect((await getOrganization()).usage.users).toBe(before + 1)
    expect(db.auditLogs[0]).toMatchObject({ action: 'user.create', resourceName: 'zoe', details: 'Role: Developer' })
  })

  it('rejects a username or email someone else has', async () => {
    await expect(createUser({ ...newUser, userName: 'Priya' })).rejects.toThrow('The username "Priya" is already taken.')
    await expect(createUser({ ...newUser, primaryEmail: 'priya@acme.dev' })).rejects.toThrow('already belongs to another user')
    // keeping your own username on edit is fine
    await expect(updateUser(2, { ...newUser, userName: 'priya', primaryEmail: 'priya@acme.dev' })).resolves.toBeUndefined()
  })

  it("won't delete the last Owner", async () => {
    await expect(deleteUser(1)).rejects.toThrow("You can't delete the last Owner")
    await deleteUser(3)
    expect((await listUsers()).some((u) => u.userId === 3)).toBe(false)
  })
})

describe('roles', () => {
  it('refuses to delete a role users or keys still have, since the schema would cascade', async () => {
    await expect(deleteRole(4)).rejects.toThrow('4 users and 1 API key still use "Developer"')
    await expect(deleteRole(6)).rejects.toThrow('3 API keys still use "CI deploy"')
  })

  it('deletes an unused role', async () => {
    await deleteUser(8) // the only Auditor
    await deleteRole(5)
    expect((await listRoles()).map((r) => r.roleName)).not.toContain('Auditor')
  })
})

describe('API keys', () => {
  it('returns the secret once, in the nk-{id}_ format, and keeps only its prefix', async () => {
    const { apiKey, secret } = await createApiKey({ keyName: 'ci', keyDescription: 'CI', roleId: 6, tagId: 1, isActive: true, expiresAt: null })

    expect(secret).toMatch(new RegExp(`^nk-${apiKey.apiKeyId}_[A-Za-z0-9]{40}$`))
    expect(secret.startsWith(apiKey.keyPrefix)).toBe(true)
    expect(JSON.stringify(await listApiKeys())).not.toContain(secret)
  })

  it('rejects a duplicate name', async () => {
    await expect(
      createApiKey({ keyName: 'GRAFANA-AGENT', keyDescription: '', roleId: 6, tagId: 1, isActive: true, expiresAt: null }),
    ).rejects.toThrow('already exists')
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

describe('organization', () => {
  it('updates the profile and logs it', async () => {
    const org = await getOrganization()
    await updateOrganization({ organizationName: 'Acme Inc', info: { ...org.info, website: 'https://acme.inc' } })
    expect(await getOrganization()).toMatchObject({ organizationName: 'Acme Inc', info: { website: 'https://acme.inc' } })
    expect(db.auditLogs[0]).toMatchObject({ action: 'org.update', resourceName: 'Acme Inc' })
  })
})
