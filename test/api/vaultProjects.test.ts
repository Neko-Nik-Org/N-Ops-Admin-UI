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
/** Tests for src/api/vaultProjects.ts (the live `/vault/project/*` endpoints). */

import { describe, expect, it } from 'vitest'
import {
  createVaultProject,
  createVaultProjectAndFind,
  deleteVaultProject,
  getVaultProject,
  listVaultProjects,
  listVaultProjectsPage,
  PROJECT_PAGE_SIZE,
  toVaultProject,
  updateVaultProject,
} from '@/api/vaultProjects'
import { api } from '../testUtils'

describe('vault projects api', () => {
  it('creates a project, keeping the description in details', async () => {
    api.post.mockResolvedValue({ data: undefined })
    await createVaultProject({ name: ' payments-api ', description: ' Card payments ' })
    expect(api.post).toHaveBeenCalledWith('/vault/project/create', {
      project_name: 'payments-api',
      details: { description: 'Card payments' },
    })
  })

  it('updates a project, keeping other details keys', async () => {
    api.put.mockResolvedValue({ data: undefined })
    await updateVaultProject(7, { name: 'payments', description: 'New' }, { owner_team: 'sre', description: 'Old' })
    expect(api.put).toHaveBeenCalledWith('/vault/project/update/7', {
      project_name: 'payments',
      details: { owner_team: 'sre', description: 'New' },
    })
  })

  it('maps an API project, reading the description from details', () => {
    const raw = {
      project_id: 3,
      organization_id: 'org-1',
      project_name: 'billing',
      created_at: '2026-11-17T00:00:00Z',
      updated_at: '2026-11-17T01:00:00Z',
    }
    expect(toVaultProject({ ...raw, details: { description: 'Invoices' } })).toEqual({
      projectId: 3,
      projectName: 'billing',
      description: 'Invoices',
      createdAt: '2026-11-17T00:00:00Z',
      updatedAt: '2026-11-17T01:00:00Z',
      details: { description: 'Invoices' },
    })
    expect(toVaultProject({ ...raw, details: { description: 42 } }).description).toBe('')
  })

  const raw = (id: number, name: string) => ({
    project_id: id,
    project_name: name,
    details: {},
    created_at: '2026-11-17T00:00:00Z',
    updated_at: '2026-11-17T00:00:00Z',
  })

  it('lists a page with the limit and offset the API requires, and a name search', async () => {
    api.get.mockResolvedValue({ data: [raw(1, 'web')] })
    expect((await listVaultProjectsPage({ search: ' we ', limit: 5, offset: 10 }))[0]).toMatchObject({ projectName: 'web' })
    expect(api.get).toHaveBeenCalledWith('/vault/project/list', { params: { limit: 5, offset: 10, project_name: 'we' } })
  })

  it('pages through every project', async () => {
    const full = Array.from({ length: PROJECT_PAGE_SIZE }, (_, i) => raw(i + 1, `p${i}`))
    api.get.mockResolvedValueOnce({ data: full }).mockResolvedValueOnce({ data: [raw(999, 'last')] })
    expect(await listVaultProjects()).toHaveLength(PROJECT_PAGE_SIZE + 1)
    expect(api.get).toHaveBeenLastCalledWith('/vault/project/list', {
      params: { limit: PROJECT_PAGE_SIZE, offset: PROJECT_PAGE_SIZE },
    })
  })

  it('gets and deletes one project', async () => {
    api.get.mockResolvedValue({ data: raw(3, 'billing') })
    await expect(getVaultProject(3)).resolves.toMatchObject({ projectId: 3, projectName: 'billing' })
    expect(api.get).toHaveBeenCalledWith('/vault/project/detail/3')
    api.delete.mockResolvedValue({ data: undefined })
    await deleteVaultProject(3)
    expect(api.delete).toHaveBeenCalledWith('/vault/project/delete/3')
  })

  it('finds a newly created project by its exact name (the API returns no id)', async () => {
    api.post.mockResolvedValue({ data: undefined })
    api.get.mockResolvedValue({ data: [raw(8, 'web-old'), raw(9, 'web')] })
    await expect(createVaultProjectAndFind({ name: 'web', description: '' })).resolves.toMatchObject({ projectId: 9 })
  })
})
