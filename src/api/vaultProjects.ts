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
 * Vault projects (`/vault/project/*`): list, detail, create, update and delete. Projects are the
 * Vault's real folders; what's inside them (Env, Conf, Notes) is still mock data until those
 * endpoints exist.
 */

import { apiClient } from '@/api/client'
import { ApiError, errorCode, errorStatus } from '@/types/api'
import type { JsonObject } from '@/types/account'
import { rememberProjects } from '@/data/mockVault'
import type { VaultContainerInput, VaultProject } from '@/types/vault'

/** A vault project as the API returns it (`vault_project`). */
export interface RawVaultProject {
  project_id: number
  /** Only some endpoints include it. */
  organization_id?: string
  project_name: string
  /** Free-form JSON; the UI keeps the description here. */
  details: JsonObject
  created_at: string
  updated_at: string
}

/** Maps an API project to the app's VaultProject, reading the description from `details`. */
export const toVaultProject = (p: RawVaultProject): VaultProject => ({
  projectId: p.project_id,
  projectName: p.project_name,
  description: typeof p.details?.description === 'string' ? p.details.description : '',
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  details: p.details ?? {},
})

/** Projects fetched per request when listing them all. */
export const PROJECT_PAGE_SIZE = 100

/** `GET /vault/project/list` — one page, newest first; `search` matches part of the name. Needs `vault:project:view`. */
export const listVaultProjectsPage = async ({
  search,
  limit = PROJECT_PAGE_SIZE,
  offset = 0,
}: { search?: string; limit?: number; offset?: number } = {}): Promise<VaultProject[]> => {
  const params: Record<string, string | number> = { limit, offset }
  if (search?.trim()) params.project_name = search.trim()
  const { data } = await apiClient.get<RawVaultProject[]>('/vault/project/list', { params })
  const projects = data.map(toVaultProject)
  rememberProjects(projects)
  return projects
}

/** Every project in the organization, newest first (pages through the list). */
export const listVaultProjects = async (): Promise<VaultProject[]> => {
  const projects: VaultProject[] = []
  for (;;) {
    const page = await listVaultProjectsPage({ offset: projects.length })
    projects.push(...page)
    if (page.length < PROJECT_PAGE_SIZE) return projects
  }
}

/** `GET /vault/project/detail/{id}` — needs `vault:project:view`; 404 "Project not found". */
export const getVaultProject = async (projectId: number): Promise<VaultProject> => {
  const { data } = await apiClient.get<RawVaultProject>(`/vault/project/detail/${projectId}`)
  const project = toVaultProject(data)
  rememberProjects([project])
  return project
}

/**
 * `DELETE /vault/project/delete/{id}` — needs `vault:project:view` + `vault:project:delete`.
 * Removes the project and everything in it for good; 422 if it doesn't exist.
 */
export const deleteVaultProject = async (projectId: number): Promise<void> => {
  await apiClient.delete(`/vault/project/delete/${projectId}`)
}

/**
 * Creates a project and returns it. The API answers 201 with no body, so the new project is found
 * by its (unique) name.
 */
export const createVaultProjectAndFind = async (input: VaultContainerInput): Promise<VaultProject> => {
  await createVaultProject(input)
  const name = input.name.trim()
  const found = (await listVaultProjectsPage({ search: name })).find((p) => p.projectName === name)
  if (!found) throw new Error(`Created ${name}, but couldn't find it afterwards. Refresh to see it.`)
  return found
}

/**
 * The request body. `details` replaces the stored JSON, so pass the project's current `details` to
 * keep keys other than `description` that someone else stored there.
 */
const toBody = (input: VaultContainerInput, details: JsonObject = {}) => ({
  project_name: input.name.trim(),
  details: { ...details, description: input.description.trim() },
})

/**
 * `POST /vault/project/create` — needs `vault:project:view` + `vault:project:create`. Responds 201
 * with no body (so no id). A full plan comes back as a bare "E112: SQL Database error" (the API's
 * "Project limit reached" message is lost on the way), so that is explained here.
 */
export const createVaultProject = async (input: VaultContainerInput): Promise<void> => {
  try {
    await apiClient.post('/vault/project/create', toBody(input))
  } catch (error) {
    if (errorCode(error) === 'E112')
      throw new ApiError(
        "Couldn't create the project. Your plan's vault project limit may be reached: delete a project or raise the limit. (E112)",
        errorStatus(error),
        'E112',
      )
    throw error
  }
}

/**
 * `PUT /vault/project/update/{id}` — renames / re-describes a project. Needs `vault:project:view` +
 * `vault:project:edit`; 422 when no project with that id exists in the organization.
 */
export const updateVaultProject = async (projectId: number, input: VaultContainerInput, details?: JsonObject): Promise<void> => {
  await apiClient.put(`/vault/project/update/${projectId}`, toBody(input, details))
}
