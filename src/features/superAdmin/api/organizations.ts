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
 * Super-admin calls (`/super-admin/organization/*`), authorized by the server's admin key
 * (`SUPER_ADMIN_KEY` in the API's environment) in the `x-nops-admin-key` header, not by a user
 * session. The API doesn't validate what it's sent (names, limits), so the UI checks first; see the
 * notes on each call.
 */

import { superAdminClient } from '@/lib/axios'
import { ApiError, errorCode, errorStatus } from '@/types/api'
import type { NewOrganization, Organization, OrganizationLimits } from '../types'

/** `OrganizationInfo` as the API sends it. */
export interface RawOrganization {
  organization_id: string
  organization_name: string
  organization_info: Record<string, unknown> | null
  billing_info?: Record<string, unknown> | null
  allocated_ai_credit: number
  utilized_ai_credit: number
  allocated_storage_bytes: number
  utilized_storage_bytes: number
  is_active: boolean
  user_limit: number
  server_limit: number
  workflow_limit: number
  ss_project_limit: number
  ss_keys_limit: number
  ss_notes_limit: number
  created_at: string
}

export const toOrganization = (o: RawOrganization): Organization => ({
  organizationId: o.organization_id,
  organizationName: o.organization_name,
  organizationInfo: o.organization_info ?? {},
  billingInfo: o.billing_info ?? {},
  isActive: o.is_active,
  aiCredit: { used: o.utilized_ai_credit, allocated: o.allocated_ai_credit },
  storageBytes: { used: o.utilized_storage_bytes, allocated: o.allocated_storage_bytes },
  userLimit: o.user_limit,
  serverLimit: o.server_limit,
  workflowLimit: o.workflow_limit,
  vaultProjectLimit: o.ss_project_limit,
  vaultKeysPerProjectLimit: o.ss_keys_limit,
  vaultNotesLimit: o.ss_notes_limit,
  createdAt: o.created_at,
})

/** Thrown when the API refuses the admin key (401), so the page can ask for it again. */
export class InvalidAdminKeyError extends Error {
  constructor() {
    super("That admin key isn't right.")
    this.name = 'InvalidAdminKeyError'
  }
}

const headers = (adminKey: string) => ({ 'x-nops-admin-key': adminKey })

/** Runs a call, turning a 401 into InvalidAdminKeyError. */
const withKey = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run()
  } catch (error) {
    if (errorStatus(error) === 401) throw new InvalidAdminKeyError()
    throw error
  }
}

/** Organizations fetched per request when listing them all. */
export const ORG_PAGE_SIZE = 100

/** `GET /super-admin/organization/list` — one page; `search` matches part of the name. */
export const listOrganizationsPage = (
  adminKey: string,
  { search, limit = ORG_PAGE_SIZE, offset = 0 }: { search?: string; limit?: number; offset?: number } = {},
): Promise<Organization[]> =>
  withKey(async () => {
    const params: Record<string, string | number> = { limit, offset }
    if (search?.trim()) params.organization_name = search.trim()
    const { data } = await superAdminClient.get<RawOrganization[]>('/super-admin/organization/list', {
      params,
      headers: headers(adminKey),
    })
    return data.map(toOrganization)
  })

/** Every organization (pages through the list). */
export const listOrganizations = async (adminKey: string): Promise<Organization[]> => {
  const all: Organization[] = []
  for (;;) {
    const page = await listOrganizationsPage(adminKey, { offset: all.length })
    all.push(...page)
    if (page.length < ORG_PAGE_SIZE) return all
  }
}

/** `GET /super-admin/organization/get/{id}`. The API answers null (200) for an unknown id. */
export const getOrganization = (adminKey: string, organizationId: string): Promise<Organization> =>
  withKey(async () => {
    const { data } = await superAdminClient.get<RawOrganization | null>(
      `/super-admin/organization/get/${encodeURIComponent(organizationId)}`,
      { headers: headers(adminKey) },
    )
    if (!data) throw new Error("There's no organization with that id.")
    return toOrganization(data)
  })

/** `UpdateOrgQuotaDto` / the limit half of `CreateOrgDto`. */
const toRawLimits = (l: OrganizationLimits) => ({
  allocated_ai_credit: l.aiCredit,
  allocated_storage_bytes: l.storageBytes,
  user_limit: l.userLimit,
  server_limit: l.serverLimit,
  workflow_limit: l.workflowLimit,
  ss_project_limit: l.vaultProjectLimit,
  ss_keys_limit: l.vaultKeysPerProjectLimit,
  ss_notes_limit: l.vaultNotesLimit,
})

/** Names are unique; the API reports a taken one only as a bare database error. */
const explainNameClash = (error: unknown): never => {
  if (errorCode(error) === 'E112')
    throw new ApiError('That organization name is already taken. (E112)', errorStatus(error), 'E112')
  throw error
}

/** A 404 from an update means no organization matched, or (for limits) a value the API refused. */
const NOT_FOUND = "That organization doesn't exist any more. Refresh the list."

const path = (organizationId: string) => encodeURIComponent(organizationId)

/** `GET /super-admin/organization/check-name/{name}` — true when nobody uses the name (exact match). */
export const isOrganizationNameAvailable = (adminKey: string, name: string): Promise<boolean> =>
  withKey(async () => {
    const { data } = await superAdminClient.get<{ is_available: boolean }>(
      `/super-admin/organization/check-name/${encodeURIComponent(name)}`,
      { headers: headers(adminKey) },
    )
    return data.is_available
  })

/** `POST /super-admin/organization/create` (201). The API also makes the organization's encryption key. */
export const createOrganization = (adminKey: string, org: NewOrganization): Promise<void> =>
  withKey(async () => {
    await superAdminClient
      .post(
        '/super-admin/organization/create',
        {
          organization_name: org.organizationName,
          organization_info: org.organizationInfo,
          billing_info: org.billingInfo,
          is_active: org.isActive,
          ...toRawLimits(org),
        },
        { headers: headers(adminKey) },
      )
      .catch(explainNameClash)
  })

/** `PUT /super-admin/organization/update/name/{id}` — JSON string body. */
export const renameOrganization = (adminKey: string, organizationId: string, name: string): Promise<void> =>
  withKey(async () => {
    await superAdminClient
      .put(`/super-admin/organization/update/name/${path(organizationId)}`, JSON.stringify(name), {
        headers: { ...headers(adminKey), 'Content-Type': 'application/json' },
      })
      .catch(explainNameClash)
  })

/** `PUT /super-admin/organization/state/{id}/{true|false}` — enables or disables sign-in for everyone in it. */
export const setOrganizationActive = (adminKey: string, organizationId: string, isActive: boolean): Promise<void> =>
  withKey(async () => {
    await superAdminClient
      .put(`/super-admin/organization/state/${path(organizationId)}/${isActive}`, null, { headers: headers(adminKey) })
      .catch((error: unknown) => {
        if (errorStatus(error) === 404) throw new ApiError(NOT_FOUND, 404)
        throw error
      })
  })

/**
 * `PUT /super-admin/organization/update/quota/{id}`. The API refuses (as a 404) any limit below 1, AI
 * credit or storage below what's used, or users / vault projects below how many exist.
 */
export const updateOrganizationLimits = (adminKey: string, organizationId: string, limits: OrganizationLimits): Promise<void> =>
  withKey(async () => {
    await superAdminClient
      .put(`/super-admin/organization/update/quota/${path(organizationId)}`, toRawLimits(limits), { headers: headers(adminKey) })
      .catch((error: unknown) => {
        if (errorStatus(error) === 404)
          throw new ApiError(
            "The API refused these limits. None can be below 1, or below what's in use: AI credit, storage, users and vault projects.",
            404,
          )
        throw error
      })
  })

/** `PUT /super-admin/organization/update/basic/{id}` and `/update/billing/{id}` — replace the whole object. */
export const updateOrganizationDetails = (
  adminKey: string,
  organizationId: string,
  which: 'profile' | 'billing',
  details: Record<string, unknown>,
): Promise<void> =>
  withKey(async () => {
    await superAdminClient
      .put(`/super-admin/organization/update/${which === 'profile' ? 'basic' : 'billing'}/${path(organizationId)}`, details, {
        headers: headers(adminKey),
      })
      .catch((error: unknown) => {
        if (errorStatus(error) === 404) throw new ApiError(NOT_FOUND, 404)
        throw error
      })
  })

/**
 * `DELETE /super-admin/organization/delete/{id}` — permanently deletes the organization and, through
 * the database's cascades, its users, roles, tags, API keys and vault data. 226 (already gone) counts as done.
 */
export const deleteOrganization = (adminKey: string, organizationId: string): Promise<void> =>
  withKey(async () => {
    await superAdminClient.delete(`/super-admin/organization/delete/${path(organizationId)}`, { headers: headers(adminKey) })
  })
