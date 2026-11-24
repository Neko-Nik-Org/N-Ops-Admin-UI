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
/** The mock backend's organization record (quotas and usage for the mock Users / Vault pages); the real one comes from `/user/self/org-info`. */

/** The mock backend's organization record (quotas and usage for the mock Users / Vault pages). The real one comes from `/user/self/org-info`. */
export interface Organization {
  organizationId: string
  organizationName: string
  /** Free-form profile kept in `organization_info`. */
  info: OrganizationProfile
  isActive: boolean
  createdAt: string
  limits: {
    users: number
    servers: number
    workflows: number
    vaultProjects: number
    vaultKeysPerProject: number
    vaultNotesPerProject: number
  }
  usage: { users: number; servers: number; workflows: number; vaultProjects: number }
  aiCredit: { used: number; allocated: number }
  storageBytes: { used: number; allocated: number }
}

/** The editable part of `organization_info`. */
export interface OrganizationProfile {
  description: string
  website: string
  contactEmail: string
  timezone: string
}
