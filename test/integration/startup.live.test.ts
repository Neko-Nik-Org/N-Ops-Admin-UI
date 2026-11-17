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
 * Live contract test for the startup-screen requests: runs the UI's real API modules against a
 * running N-Ops Main API. Skipped unless NOPS_LIVE_API_URL is set.
 *
 *   NOPS_LIVE_API_URL=http://127.0.0.1:18686 npx vitest run test/integration/startup.live.test.ts
 *
 * Needs the `root` and `scoped` users from roles.live.test.ts (password `Start#Pass1`) and a Turnstile
 * verify URL that always succeeds. The API's ALLOWED_ORIGINS must include https://localhost.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.unmock('@/lib/axios') // test/setup.ts mocks the client for unit tests; this file needs the real one

const processEnv = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const API_URL = processEnv.NOPS_LIVE_API_URL

const { apiClient } = await import('@/lib/axios')
const { login } = await import('@/features/auth/api/login')
const { verifySession } = await import('@/features/auth/api/session')
const account = await import('@/features/account/api/account')
const { listTags } = await import('@/features/tags/api/tags')
const { getServiceHealth } = await import('@/features/system/api/health')
const { setSessionToken, clearSessionToken } = await import('@/features/auth/store/sessionToken')
const roles = await import('@/features/admin/api/roles')

/** Signs in through the UI's login() and stores the session the way the app does. */
const signIn = async (userName: string) => {
  const response = await login({ userName, password: 'Start#Pass1', rememberMe: false }, 'stub-turnstile-token')
  if (response.is_2fa_required) throw new Error('Unexpected 2FA')
  setSessionToken(response.session_id, false)
  return response.session_id
}

describe.skipIf(!API_URL)('live Main API: startup screen requests', () => {
  beforeAll(() => {
    apiClient.defaults.baseURL = API_URL
    apiClient.defaults.headers.common['x-real-ip'] = '127.0.0.1'
  })

  it('GET /health/service works without signing in', async () => {
    clearSessionToken()
    await expect(getServiceHealth()).resolves.toMatchObject({ status: 'up', message: 'All services are running!' })
  })

  it('verify, ui-info, details, org-info and tag list all answer for a signed-in user', async () => {
    const response = await login({ userName: 'root', password: 'Start#Pass1', rememberMe: false }, 'stub-turnstile-token')
    if (response.is_2fa_required) throw new Error('Unexpected 2FA')
    setSessionToken(response.session_id, false)

    const [verified, uiInfo, details, org, tags] = await Promise.all([
      verifySession(),
      account.getUiInfo(),
      account.getUserDetails(),
      account.getOrgInfo(),
      listTags(),
    ])
    expect(verified).toBeNull() // 204 today: the app keeps the profile from sign-in
    expect(uiInfo).toBeTypeOf('object')
    expect(details).toBeTypeOf('object')
    expect(org.organizationName).toBe('RolesTest Org')
    expect(tags.map((t) => t.tagName)).toEqual(expect.arrayContaining(['production', 'staging', 'development']))
  })

  it('GET /user/self/profile returns the full scope that sign-in leaves out', async () => {
    await signIn('scoped')
    await expect(account.getProfile()).resolves.toEqual({
      userId: expect.any(Number),
      organizationId: '11111111-1111-1111-1111-111111111111',
      userName: 'scoped',
      displayName: expect.any(String), // profile.live.test.ts renames this user
      organizationName: 'RolesTest Org',
      primaryEmail: 'scoped@example.test',
      isEmailVerified: true,
      permissions: ['tag:create', 'user:role:view', 'user:role:create', 'user:role:update', 'user:role:delete'],
      tags: [1],
      allowedLinuxUsers: ['deploy'],
      canApproveApprovals: false,
      canBypassApprovals: false,
    })
  })

  it('reflects a role change at once, while the existing session keeps its old permissions', async () => {
    const scopedSession = await signIn('scoped')
    await signIn('root')
    const [scopedRole] = await roles.listRolesPage({ search: 'Scoped' })
    const narrowed = { ...scopedRole, permissions: ['tag:create'] }
    await roles.updateRole(scopedRole, narrowed)
    try {
      setSessionToken(scopedSession, false)
      expect((await account.getProfile()).permissions).toEqual(['tag:create'])
      // user:role:view is gone from the role, but the session copy is only rebuilt on refresh / next
      // sign-in, so the API still allows this until then
      await expect(roles.fetchRole(scopedRole.roleId)).resolves.toMatchObject({ roleName: 'Scoped' })
    } finally {
      await signIn('root')
      await roles.updateRole(narrowed, scopedRole)
    }
  })
})
