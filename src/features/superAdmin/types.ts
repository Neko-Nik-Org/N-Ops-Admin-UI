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
/** Super-admin view of organizations (`/super-admin/organization/*`). */

/** An organization with its plan limits and usage. */
export interface Organization {
  organizationId: string
  organizationName: string
  /** Free-form profile (website, contact, address…), as the organization saved it. */
  organizationInfo: Record<string, unknown>
  /** Free-form billing details (GST, plan, SLA…), only super admins see it. */
  billingInfo: Record<string, unknown>
  isActive: boolean
  aiCredit: { used: number; allocated: number }
  storageBytes: { used: number; allocated: number }
  userLimit: number
  serverLimit: number
  workflowLimit: number
  vaultProjectLimit: number
  vaultKeysPerProjectLimit: number
  vaultNotesLimit: number
  createdAt: string
}

/** The plan limits an organization runs under (`UpdateOrgQuotaDto`). */
export interface OrganizationLimits {
  aiCredit: number
  storageBytes: number
  userLimit: number
  serverLimit: number
  workflowLimit: number
  vaultProjectLimit: number
  vaultKeysPerProjectLimit: number
  vaultNotesLimit: number
}

/** Everything needed to create an organization (`CreateOrgDto`). */
export interface NewOrganization extends OrganizationLimits {
  organizationName: string
  organizationInfo: Record<string, unknown>
  billingInfo: Record<string, unknown>
  isActive: boolean
}
