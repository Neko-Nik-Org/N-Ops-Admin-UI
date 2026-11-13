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
 * API calls for the signed-in user's own account: UI preferences, profile details
 * and organization quotas (`/user/self/*`).
 */

import { apiClient } from '@/lib/axios'
import type { JsonObject, OrgInfo } from '../types'

/** `/user/self/org-info` response as sent by the API (`ss_*` fields are the Vault / secure-storage quotas). */
interface RawOrgInfo {
  organization_id: string
  organization_name: string
  organization_info: unknown
  allocated_ai_credit: number
  utilized_ai_credit: number
  allocated_storage_bytes: number
  utilized_storage_bytes: number
  user_limit: number
  current_user_count: number
  server_limit: number
  workflow_limit: number
  ss_project_limit: number
  current_ss_project_count: number
  ss_keys_limit: number
  ss_notes_limit: number
  created_at: string
}

/** True for a plain JSON object (not null and not an array). */
export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Coerces an API value to a JSON object, falling back to {} for anything else. */
const asObject = (value: unknown): JsonObject => (isJsonObject(value) ? value : {})

/** `GET /user/self/ui-info` — the user's saved UI preferences. */
export const getUiInfo = async (): Promise<JsonObject> => {
  const { data } = await apiClient.get<unknown>('/user/self/ui-info')
  return asObject(data)
}

/** `POST /user/self/ui-info` — replaces the whole object, so merge before sending. */
export const saveUiInfo = async (uiInfo: JsonObject): Promise<void> => {
  await apiClient.post('/user/self/ui-info', uiInfo)
}

/** `GET /user/self/details` — free-form extra profile info. */
export const getUserDetails = async (): Promise<JsonObject> => {
  const { data } = await apiClient.get<unknown>('/user/self/details')
  return asObject(data)
}

/** `POST /user/self/details` — replaces the whole object. */
export const saveUserDetails = async (details: JsonObject): Promise<void> => {
  await apiClient.post('/user/self/details', details)
}

/** `GET /user/self/org-info` — the signed-in user's organization, quotas and usage. */
export const getOrgInfo = async (): Promise<OrgInfo> => {
  const { data: o } = await apiClient.get<RawOrgInfo>('/user/self/org-info')
  return {
    organizationId: o.organization_id,
    organizationName: o.organization_name,
    organizationInfo: asObject(o.organization_info),
    createdAt: o.created_at,
    aiCredit: { used: o.utilized_ai_credit, allocated: o.allocated_ai_credit },
    storageBytes: { used: o.utilized_storage_bytes, allocated: o.allocated_storage_bytes },
    users: { current: o.current_user_count, limit: o.user_limit },
    vaultProjects: { current: o.current_ss_project_count, limit: o.ss_project_limit },
    serverLimit: o.server_limit,
    workflowLimit: o.workflow_limit,
    vaultKeysPerProjectLimit: o.ss_keys_limit,
    vaultNotesPerProjectLimit: o.ss_notes_limit,
  }
}
