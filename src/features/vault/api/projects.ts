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
/** Vault projects and their services. Mock until `/vault/project/*` is live. */

import { db as adminDb, clone, mockDelay, notFound, recordAudit } from '@/features/admin/mock/db'
import { me, vaultDb } from '../mock/db'
import type { VaultContainerInput, VaultProject, VaultService } from '../types'

const findProject = (projectId: number) => vaultDb.projects.find((p) => p.projectId === projectId) ?? notFound('project')
const findService = (serviceId: number) => vaultDb.services.find((s) => s.serviceId === serviceId) ?? notFound('service')

/** Project and service names: lowercase, numbers and dashes, like the seed data. */
const checkName = (name: string) => {
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(name))
    throw new Error('Use lowercase letters, numbers, dots, dashes or underscores (up to 100).')
}

/** Keeps the Organization page's "Vault projects" meter in step. */
const syncUsage = () => {
  adminDb.organization.usage.vaultProjects = vaultDb.projects.length
}

/** Path of a service for the audit log, e.g. "payments-api / api". */
export const servicePath = (serviceId: number) => {
  const service = findService(serviceId)
  return `${findProject(service.projectId).projectName} / ${service.serviceName}`
}

/** Future: `GET /vault/project/list`. */
export const listProjects = async (): Promise<VaultProject[]> => {
  await mockDelay()
  return clone(vaultDb.projects)
}

/** Future: `POST /vault/project/create`. Limited by the plan. */
export const createProject = async (input: VaultContainerInput): Promise<VaultProject> => {
  await mockDelay()
  checkName(input.name)
  const limit = adminDb.organization.limits.vaultProjects
  if (vaultDb.projects.length >= limit)
    throw new Error(`Your plan allows ${limit} vault projects. Delete one or raise the limit first.`)
  if (vaultDb.projects.some((p) => p.projectName === input.name))
    throw new Error(`A project called "${input.name}" already exists.`)
  const now = new Date().toISOString()
  const project: VaultProject = {
    projectId: vaultDb.nextId.project++,
    projectName: input.name,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  }
  vaultDb.projects.push(project)
  syncUsage()
  recordAudit('vault.project_create', 'vault_project', project.projectName)
  return clone(project)
}

/** Future: `PUT /vault/project/update`. */
export const updateProject = async (projectId: number, input: VaultContainerInput): Promise<void> => {
  await mockDelay()
  checkName(input.name)
  const project = findProject(projectId)
  if (vaultDb.projects.some((p) => p.projectId !== projectId && p.projectName === input.name))
    throw new Error(`A project called "${input.name}" already exists.`)
  Object.assign(project, { projectName: input.name, description: input.description, updatedAt: new Date().toISOString() })
  recordAudit('vault.project_update', 'vault_project', project.projectName)
}

/** Future: `DELETE /vault/project/delete/{id}`. Deletes its services, keys, files and notes too (ON DELETE CASCADE). */
export const deleteProject = async (projectId: number): Promise<void> => {
  await mockDelay()
  const project = findProject(projectId)
  const serviceIds = vaultDb.services.filter((s) => s.projectId === projectId).map((s) => s.serviceId)
  vaultDb.secrets = vaultDb.secrets.filter((s) => !serviceIds.includes(s.serviceId))
  vaultDb.configs = vaultDb.configs.filter((c) => !serviceIds.includes(c.serviceId))
  vaultDb.notes = vaultDb.notes.filter((n) => n.projectId !== projectId)
  vaultDb.services = vaultDb.services.filter((s) => s.projectId !== projectId)
  vaultDb.projects = vaultDb.projects.filter((p) => p.projectId !== projectId)
  syncUsage()
  recordAudit('vault.project_delete', 'vault_project', project.projectName, `by ${me().displayName}`)
}

/** Future: `GET /vault/project/contents/{id}` — how much a project holds, for the delete confirmation. */
export const getProjectContents = async (projectId: number) => {
  await mockDelay()
  const serviceIds = vaultDb.services.filter((s) => s.projectId === projectId).map((s) => s.serviceId)
  return {
    services: serviceIds.length,
    secrets: vaultDb.secrets.filter((s) => serviceIds.includes(s.serviceId)).length,
    configs: vaultDb.configs.filter((c) => serviceIds.includes(c.serviceId)).length,
    notes: vaultDb.notes.filter((n) => n.projectId === projectId).length,
  }
}

/** Future: `GET /vault/project/service/list?project_id`. */
export const listServices = async (projectId: number): Promise<VaultService[]> => {
  await mockDelay()
  return clone(vaultDb.services.filter((s) => s.projectId === projectId))
}

/** Future: `POST /vault/project/service/create`. Names are unique within a project. */
export const createService = async (projectId: number, input: VaultContainerInput): Promise<VaultService> => {
  await mockDelay()
  checkName(input.name)
  findProject(projectId)
  if (vaultDb.services.some((s) => s.projectId === projectId && s.serviceName === input.name)) {
    throw new Error(`This project already has a service called "${input.name}".`)
  }
  const now = new Date().toISOString()
  const service: VaultService = {
    serviceId: vaultDb.nextId.service++,
    projectId,
    serviceName: input.name,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  }
  vaultDb.services.push(service)
  recordAudit('vault.service_create', 'vault_service', servicePath(service.serviceId))
  return clone(service)
}

/** Future: `PUT /vault/project/service/update`. */
export const updateService = async (serviceId: number, input: VaultContainerInput): Promise<void> => {
  await mockDelay()
  checkName(input.name)
  const service = findService(serviceId)
  if (
    vaultDb.services.some((s) => s.serviceId !== serviceId && s.projectId === service.projectId && s.serviceName === input.name)
  ) {
    throw new Error(`This project already has a service called "${input.name}".`)
  }
  Object.assign(service, { serviceName: input.name, description: input.description, updatedAt: new Date().toISOString() })
  recordAudit('vault.service_update', 'vault_service', servicePath(serviceId))
}

/** Future: `DELETE /vault/project/service/delete/{id}`. Deletes its keys and files too. */
export const deleteService = async (serviceId: number): Promise<void> => {
  await mockDelay()
  const path = servicePath(serviceId)
  vaultDb.secrets = vaultDb.secrets.filter((s) => s.serviceId !== serviceId)
  vaultDb.configs = vaultDb.configs.filter((c) => c.serviceId !== serviceId)
  vaultDb.services = vaultDb.services.filter((s) => s.serviceId !== serviceId)
  recordAudit('vault.service_delete', 'vault_service', path)
}
