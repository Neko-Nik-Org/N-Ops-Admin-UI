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
 * Live contract test for vault projects (`/vault/project/*`: list, detail, create, update, delete).
 * Skipped unless NOPS_LIVE_API_URL is set.
 *
 *   NOPS_LIVE_API_URL=http://127.0.0.1:18686 npx vitest run test/integration/vaultProjects.live.test.ts
 *
 * Needs the users from roles.live.test.ts, with `vault:project:view/create/edit/delete` added to the Root
 * role and `vault:project:view` to the Viewer role, an organization whose vault project quota
 * (`ss_project_limit`) is small (the seed uses 5), and no projects yet. Creates projects, so use a
 * disposable database.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.unmock('@/api/client') // test/setup.ts mocks the client for unit tests; this file needs the real one

const processEnv = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const API_URL = processEnv.NOPS_LIVE_API_URL

const { apiClient } = await import('@/api/client')
const { login } = await import('@/api/login')
const { getOrgInfo } = await import('@/api/account')
const vp = await import('@/api/vaultProjects')
const { createVaultProject, updateVaultProject } = vp
const { setSessionToken } = await import('@/store/sessionToken')
const { errorStatus } = await import('@/types/api')

const failure = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return { status: errorStatus(error), message: (error as Error).message }
  }
  throw new Error('Expected the request to fail')
}

const signIn = async (userName: string) => {
  const response = await login({ userName, password: 'Start#Pass1', rememberMe: false }, 'stub-turnstile-token')
  if (response.is_2fa_required) throw new Error('Unexpected 2FA')
  setSessionToken(response.session_id, false)
}

describe.skipIf(!API_URL)('live Main API: vault projects', () => {
  beforeAll(() => {
    apiClient.defaults.baseURL = API_URL
    apiClient.defaults.headers.common['x-real-ip'] = '127.0.0.1'
  })

  it('creates a project (201, no body) and counts it against the quota', async () => {
    await signIn('root')
    const before = (await getOrgInfo()).vaultProjects.current
    await expect(createVaultProject({ name: 'payments-api', description: 'Card payments' })).resolves.toBeUndefined()
    expect((await getOrgInfo()).vaultProjects.current).toBe(before + 1)
  })

  it('accepts any name up to 100 characters, including spaces and capitals', async () => {
    await signIn('root')
    await expect(createVaultProject({ name: 'Internal Tools', description: '' })).resolves.toBeUndefined()
  })

  it('answers a duplicate name with a bare 417 database error', async () => {
    await signIn('root')
    expect((await failure(createVaultProject({ name: 'payments-api', description: '' }))).status).toBe(417)
  })

  it('updates a project by id, and 422s for an id that does not exist', async () => {
    await signIn('root')
    // there is no list endpoint, so this relies on the first project in a fresh database being id 1
    await expect(updateVaultProject(1, { name: 'payments', description: 'Renamed' })).resolves.toBeUndefined()
    const missing = await failure(updateVaultProject(999_999, { name: 'x', description: '' }))
    expect(missing).toMatchObject({ status: 422, message: 'Failed to update project' })
  })

  it('needs vault:project:create / edit (403 for a view-only user)', async () => {
    await signIn('viewer')
    expect((await failure(createVaultProject({ name: 'nope', description: '' }))).status).toBe(403)
    expect((await failure(updateVaultProject(1, { name: 'nope', description: '' }))).status).toBe(403)
  })

  it('refuses a project over the plan quota with 422', async () => {
    await signIn('root')
    const { current, limit } = (await getOrgInfo()).vaultProjects
    for (let i = current; i < limit; i++) await createVaultProject({ name: `filler-${i}`, description: '' })
    const over = await failure(createVaultProject({ name: 'one-too-many', description: '' }))
    expect(over).toMatchObject({ status: 422, message: 'Organization has reached its project quota' })
  })

  it('lists projects newest first, and searches by name', async () => {
    await signIn('root')
    const all = await vp.listVaultProjects()
    expect(all.length).toBeGreaterThanOrEqual(2)
    const created = all.map((p) => Date.parse(p.createdAt))
    expect([...created].sort((a, b) => b - a)).toEqual(created)
    expect((await vp.listVaultProjectsPage({ search: 'paymen' })).map((p) => p.projectName)).toEqual(['payments'])
    expect(await vp.listVaultProjectsPage({ limit: 1, offset: 0 })).toHaveLength(1)
  })

  it('gets one project, and 404s for a missing one', async () => {
    await signIn('root')
    await expect(vp.getVaultProject(1)).resolves.toMatchObject({ projectId: 1, projectName: 'payments', description: 'Renamed' })
    expect((await failure(vp.getVaultProject(999_999))).status).toBe(404)
  })

  it('keeps other details keys through a rename', async () => {
    await signIn('root')
    const project = await vp.getVaultProject(1)
    await updateVaultProject(1, { name: 'payments', description: 'Again' }, { ...project.details, owner_team: 'sre' })
    await updateVaultProject(1, { name: 'payments', description: 'Kept' }, (await vp.getVaultProject(1)).details)
    expect((await vp.getVaultProject(1)).details).toEqual({ owner_team: 'sre', description: 'Kept' })
  })

  it('deletes a project (403 without vault:project:delete, 422 for a missing one)', async () => {
    await signIn('viewer')
    expect((await failure(vp.deleteVaultProject(1))).status).toBe(403)
    await signIn('root')
    const doomed = (await vp.listVaultProjects()).find((p) => p.projectName.startsWith('filler-'))!
    await vp.deleteVaultProject(doomed.projectId)
    expect((await failure(vp.getVaultProject(doomed.projectId))).status).toBe(404)
    expect((await failure(vp.deleteVaultProject(doomed.projectId))).status).toBe(422)
  })

  it('creates a project and finds it by name (the API returns no id), now that a slot is free', async () => {
    await signIn('root')
    const name = `Found ${Date.now().toString(36)}`
    const created = await vp.createVaultProjectAndFind({ name, description: 'Made by the live test' })
    expect(created).toMatchObject({ projectName: name, description: 'Made by the live test' })
    expect((await vp.listVaultProjects())[0]?.projectId).toBe(created.projectId)
  })
})
