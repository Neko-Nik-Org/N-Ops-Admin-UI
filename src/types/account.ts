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

/** Types for the signed-in user's account and organization. */

/** Free-form JSON object stored on the user (`app_user.user_details` / `app_user.ui_info`). */
export type JsonObject = Record<string, unknown>

/**
 * Organization details, quotas and current usage, as shown on the Account page.
 * `vault*` fields cover the Vault (secure storage) projects, keys and notes.
 */
export interface OrgInfo {
  organizationId: string
  organizationName: string
  organizationInfo: JsonObject
  createdAt: string
  aiCredit: { used: number; allocated: number }
  storageBytes: { used: number; allocated: number }
  users: { current: number; limit: number }
  vaultProjects: { current: number; limit: number }
  serverLimit: number
  workflowLimit: number
  vaultKeysPerProjectLimit: number
  vaultNotesPerProjectLimit: number
}
