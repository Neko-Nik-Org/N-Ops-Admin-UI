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
/** Tests for the Admin API (src/features/admin/api/*): users on the (mocked) live API, the rest on the mock backend. */

import moment from 'moment'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApiKey, listApiKeys } from '@/features/admin/api/apiKeys'
import { exportAuditLogs, listAuditLogs, retentionStart } from '@/features/admin/api/auditLogs'
import { createUser, deleteUser, getUser, listUsers, updateUser } from '@/features/admin/api/users'
import { db, resetAdminMock } from '@/mocks/adminDb'
import type { AdminUserInput } from '@/features/admin/types'
import { api, rawAdminUser } from '../../testUtils'

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
  it('lists every user page by page from /user/admin/list', async () => {
    const page = Array.from({ length: 100 }, (_, i) => rawAdminUser(i + 1, `u${i + 1}`, `User ${i + 1}`, 1))
    api.get.mockResolvedValueOnce({ data: page }).mockResolvedValueOnce({ data: [rawAdminUser(101, 'last', 'Last', 2)] })
    const users = await listUsers()
    expect(users).toHaveLength(101)
    expect(api.get).toHaveBeenNthCalledWith(2, '/user/admin/list', { params: { limit: 100, offset: 100 } })
    expect(users[100]).toMatchObject({ userId: 101, userName: 'last', primaryEmail: 'last@acme.dev', allowedGeoLocations: [] })
  })

  it('fetches one user, and explains when the API answers null', async () => {
    api.get.mockResolvedValueOnce({ data: rawAdminUser(3, 'marcus', 'Marcus Chen', 3) })
    expect(await getUser(3)).toMatchObject({ displayName: 'Marcus Chen', roleId: 3 })
    api.get.mockResolvedValueOnce({ data: null })
    await expect(getUser(99)).rejects.toThrow('That user no longer exists.')
  })

  it("says creating, editing and removing users aren't available yet", async () => {
    await expect(createUser(newUser)).rejects.toThrow("Adding users isn't available yet")
    await expect(updateUser(1, newUser)).rejects.toThrow("Editing users isn't available yet")
    await expect(deleteUser(1)).rejects.toThrow("Removing users isn't available yet")
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
