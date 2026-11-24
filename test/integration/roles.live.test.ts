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
 * Live contract test for roles and tag visibility: runs the UI's real API modules against a running
 * N-Ops Main API. Skipped unless NOPS_LIVE_API_URL is set.
 *
 *   NOPS_LIVE_API_URL=http://127.0.0.1:18686 npx vitest run test/integration/roles.live.test.ts
 *
 * Needs a disposable database with tags production (1), staging (2) and development (3), and users
 * (password `Start#Pass1`), each with their own role:
 *   - `root`   — Root: tag:create/edit/delete + user:role:view/create/edit/delete, all tags, both approval flags
 *   - `scoped` — Scoped: tag:create + user:role:view/create/edit/delete, tag 1 only, Linux user `deploy`
 *   - `viewer` — Viewer: user:role:view only
 * plus a Turnstile verify URL that always succeeds. The API's ALLOWED_ORIGINS must include https://localhost.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.unmock('@/api/client') // test/setup.ts mocks the client for unit tests; this file needs the real one

const processEnv = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const API_URL = processEnv.NOPS_LIVE_API_URL
const PASSWORD = 'Start#Pass1'

const { apiClient } = await import('@/api/client')
const roles = await import('@/api/roles')
const { listTags } = await import('@/api/tags')
const { login } = await import('@/api/login')
const { toCurrentUser } = await import('@/types/auth')
const { isRoleWithinScope } = await import('@/hooks/usePermissions')
const { setSessionToken } = await import('@/store/sessionToken')
const { errorStatus } = await import('@/types/api')
type RoleInput = import('@/types/role').RoleInput

/** HTTP status and message a promise rejects with (fails the test if it resolves). */
const failure = async (promise: Promise<unknown>): Promise<{ status?: number; message: string }> => {
  try {
    await promise
  } catch (error) {
    return { status: errorStatus(error), message: (error as Error).message }
  }
  throw new Error('Expected the request to fail')
}

/** Signs in and stores the session the way the app does; returns the signed-in profile. */
const signIn = async (userName: string) => {
  const response = await login({ userName, password: PASSWORD, rememberMe: false }, 'stub-turnstile-token')
  if (response.is_2fa_required) throw new Error('Unexpected 2FA')
  setSessionToken(response.session_id, false)
  return toCurrentUser(response.data)
}

/** A unique role name, so the suite can run repeatedly against the same database. */
const uniqueName = (base: string) => `${base} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const newRole = (overrides: Partial<RoleInput> = {}): RoleInput => ({
  roleName: uniqueName('Live'),
  roleDescription: 'Created by roles.live.test.ts',
  permissions: ['tag:create'],
  tagIds: [],
  canApproveApprovals: false,
  canBypassApprovals: false,
  allowedLinuxUsers: [],
  ...overrides,
})

/** Creates a role (the API returns no body) and looks it up by its unique name. */
const createAndFind = async (input: RoleInput) => {
  await roles.createRole(input)
  const [found] = await roles.listRolesPage({ search: input.roleName })
  expect(found?.roleName).toBe(input.roleName)
  return found
}

describe.skipIf(!API_URL)('live Main API: roles', () => {
  beforeAll(() => {
    apiClient.defaults.baseURL = API_URL
    apiClient.defaults.headers.common['x-real-ip'] = '127.0.0.1'
  })

  describe('as root (all permissions, all tags)', () => {
    it('lists every role with its tags, Linux users and approval flags', async () => {
      await signIn('root')
      const all = await roles.listRoles()
      const scoped = all.find((r) => r.roleName === 'Scoped')
      expect(scoped).toMatchObject({ tagIds: [1], allowedLinuxUsers: ['deploy'], canBypassApprovals: false })
      expect(all.find((r) => r.roleName === 'Root')).toMatchObject({ tagIds: [], canApproveApprovals: true })
    })

    it('searches by name and pages with limit / offset', async () => {
      await signIn('root')
      expect((await roles.listRolesPage({ search: 'scop' })).map((r) => r.roleName)).toEqual(['Scoped'])
      const first = await roles.listRolesPage({ limit: 1, offset: 0 })
      const second = await roles.listRolesPage({ limit: 1, offset: 1 })
      expect(first).toHaveLength(1)
      expect(second).toHaveLength(1)
      expect(first[0].roleId).not.toBe(second[0].roleId)
    })

    it('creates a role and fetches it back unchanged', async () => {
      await signIn('root')
      const input = newRole({
        permissions: ['tag:create', 'user:role:view'],
        tagIds: [2, 3],
        allowedLinuxUsers: ['deploy', 'ubuntu'],
        canApproveApprovals: true,
      })
      const created = await createAndFind(input)
      const fetched = await roles.fetchRole(created.roleId)
      expect(fetched).toMatchObject({ ...input, tagIds: [2, 3] })
      expect(Date.parse(fetched.createdAt)).not.toBeNaN()
    })

    it('rejects a duplicate role name', async () => {
      await signIn('root')
      const { status } = await failure(roles.createRole(newRole({ roleName: 'Viewer' })))
      expect(status).toBeGreaterThanOrEqual(400)
      expect(status).toBeLessThan(500)
    })

    it('renames through PATCH info and changes access through PUT permissions', async () => {
      await signIn('root')
      const role = await createAndFind(newRole({ tagIds: [1] }))

      const renamed = { ...role, roleName: uniqueName('Renamed'), roleDescription: 'New words' }
      await roles.updateRole(role, renamed)
      const afterInfo = await roles.fetchRole(role.roleId)
      expect(afterInfo).toMatchObject({ roleName: renamed.roleName, roleDescription: 'New words', tagIds: [1] })

      const widened = { ...afterInfo, permissions: ['tag:create', 'tag:edit'], tagIds: [], allowedLinuxUsers: ['ops'] }
      await roles.updateRole(afterInfo, widened)
      const afterPermissions = await roles.fetchRole(role.roleId)
      expect(afterPermissions).toMatchObject({
        roleName: renamed.roleName,
        permissions: ['tag:create', 'tag:edit'],
        tagIds: [], // empty = every tag
        allowedLinuxUsers: ['ops'],
      })
    })

    it('deletes an unused role', async () => {
      await signIn('root')
      const role = await createAndFind(newRole())
      await roles.deleteRole(role.roleId)
      expect(await roles.listRolesPage({ search: role.roleName })).toEqual([])
      expect((await failure(roles.fetchRole(role.roleId))).status).toBeGreaterThanOrEqual(400)
    })

    it('refuses with 412 to delete a role a user still has', async () => {
      await signIn('root')
      const viewer = (await roles.listRolesPage({ search: 'Viewer' }))[0]
      const { status, message } = await failure(roles.deleteRole(viewer.roleId))
      expect(status).toBe(412)
      expect(message).toMatch(/users associated with it/)
    })

    it('rejects a role with no permissions', async () => {
      await signIn('root')
      expect((await failure(roles.createRole(newRole({ permissions: [] })))).status).toBe(400)
    })
  })

  describe('as scoped (tag 1 only, Linux user deploy, no approval flags)', () => {
    it('only sees its own tag on /tag/list', async () => {
      await signIn('scoped')
      expect((await listTags()).map((t) => t.tagName)).toEqual(['production'])
    })

    it('creates a role inside its scope', async () => {
      await signIn('scoped')
      const role = await createAndFind(newRole({ tagIds: [1], allowedLinuxUsers: ['deploy'] }))
      expect(role).toMatchObject({ tagIds: [1], allowedLinuxUsers: ['deploy'] })
    })

    it.each([
      ['a permission it lacks', { permissions: ['tag:edit'] }],
      ['every tag (no tag limit)', { tagIds: [] }],
      ['a tag it lacks', { tagIds: [2] }],
      ['no Linux user limit', { allowedLinuxUsers: [] }],
      ['the approve flag', { canApproveApprovals: true }],
      ['the bypass flag', { canBypassApprovals: true }],
    ])('is refused (403) a role with %s', async (_label, overrides) => {
      await signIn('scoped')
      const input = newRole({ tagIds: [1], allowedLinuxUsers: ['deploy'], ...overrides })
      expect((await failure(roles.createRole(input))).status).toBe(403)
    })

    it('agrees with the UI scope check: cannot edit or delete a wider role', async () => {
      const me = await signIn('scoped')
      const root = (await roles.listRolesPage({ search: 'Root' }))[0]
      expect(isRoleWithinScope(me, root)).toBe(false)
      expect((await failure(roles.updateRole(root, { ...root, roleName: uniqueName('Hijack') }))).status).toBe(403)
      expect((await failure(roles.deleteRole(root.roleId))).status).not.toBe(204)

      const own = await createAndFind(newRole({ tagIds: [1], allowedLinuxUsers: ['deploy'] }))
      expect(isRoleWithinScope(me, own)).toBe(true)
      await roles.updateRole(own, { ...own, roleDescription: 'Edited by scoped' })
      expect((await roles.fetchRole(own.roleId)).roleDescription).toBe('Edited by scoped')
    })
  })

  describe('as viewer (user:role:view only)', () => {
    it('can list roles and every tag without any tag permission', async () => {
      await signIn('viewer')
      expect((await roles.listRoles()).length).toBeGreaterThanOrEqual(3)
      expect((await listTags()).length).toBeGreaterThanOrEqual(3)
    })

    it('gets 403 on create, update and delete', async () => {
      await signIn('viewer')
      const viewer = (await roles.listRolesPage({ search: 'Viewer' }))[0]
      expect((await failure(roles.createRole(newRole({ permissions: ['user:role:view'] })))).status).toBe(403)
      expect((await failure(roles.updateRoleInfo(viewer.roleId, viewer))).status).toBe(403)
      expect((await failure(roles.updateRolePermissions(viewer.roleId, viewer))).status).toBe(403)
      expect((await failure(roles.deleteRole(viewer.roleId))).status).toBe(403)
    })
  })
})
