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
 * session. Listing and fetching are live; creating, editing, enabling and deleting organizations are
 * still commented out in the API.
 */

import { superAdminClient } from '@/lib/axios'
import { errorStatus } from '@/types/api'
import type { Organization } from '../types'

/** `OrganizationInfo` as the API sends it. */
export interface RawOrganization {
  organization_id: string
  organization_name: string
  organization_info: Record<string, unknown> | null
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
