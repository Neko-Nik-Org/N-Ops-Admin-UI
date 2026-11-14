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
 * Types for the Admin section: organization, users, roles, API keys and audit logs.
 * Field names follow the API schema (docs/Schema/PGSQL.sql in N-Ops-Main-API), camelCased.
 */

/** The organization's editable profile plus its read-only quotas (`organization` table). */
export interface Organization {
  organizationId: string
  organizationName: string
  /** Free-form profile kept in `organization_info`. */
  info: OrganizationProfile
  isActive: boolean
  createdAt: string
  limits: { users: number; servers: number; workflows: number; vaultProjects: number; vaultKeysPerProject: number; vaultNotesPerProject: number }
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

/** Fields an admin can change on the organization. */
export interface OrganizationInput {
  organizationName: string
  info: OrganizationProfile
}

/** A person in the organization (`app_user`). */
export interface AdminUser {
  userId: number
  userName: string
  displayName: string
  primaryEmail: string
  roleId: number
  isActive: boolean
  isEmailVerified: boolean
  hasTotp2fa: boolean
  hasEmail2fa: boolean
  hasIpRestriction: boolean
  allowedIps: string[]
  createdAt: string
  lastLoginAt: string | null
}

/** Fields set when creating or editing a user. */
export interface AdminUserInput {
  userName: string
  displayName: string
  primaryEmail: string
  roleId: number
  isActive: boolean
  hasIpRestriction: boolean
  allowedIps: string[]
}

/** A role: a permission set, optionally scoped to tags (`user_role` + `role_tag`). */
export interface Role {
  roleId: number
  roleName: string
  roleDescription: string
  permissions: string[]
  /** Tags this role is limited to; empty means every tag. */
  tagIds: number[]
  canApproveApprovals: boolean
  canBypassApprovals: boolean
  allowedLinuxUsers: string[]
  createdAt: string
  updatedAt: string
}

/** Fields set when creating or editing a role. */
export type RoleInput = Omit<Role, 'roleId' | 'createdAt' | 'updatedAt'>

/** An API key. It acts with an existing role's permissions, limited to one tag (`api_key`). */
export interface ApiKey {
  apiKeyId: number
  keyName: string
  keyDescription: string
  /** The non-secret start of the key, e.g. "nk-12_3fA9", for recognizing it. */
  keyPrefix: string
  roleId: number
  tagId: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  /** null = never expires. */
  expiresAt: string | null
  lastUsedAt: string | null
}

/** Fields set when creating or editing an API key. */
export interface ApiKeyInput {
  keyName: string
  keyDescription: string
  roleId: number
  tagId: number
  isActive: boolean
  expiresAt: string | null
}

/** A new key plus its secret, which is shown exactly once. */
export interface CreatedApiKey {
  apiKey: ApiKey
  secret: string
}

/** Who did something recorded in the audit log. */
export interface AuditActor {
  type: 'user' | 'api_key' | 'system'
  id: number | null
  name: string
}

/** Whether the recorded action went through. */
export type AuditOutcome = 'success' | 'denied' | 'failed'

/** One audit log entry. */
export interface AuditLog {
  auditId: number
  occurredAt: string
  actor: AuditActor
  /** Dotted action type, e.g. "user.create"; see AUDIT_ACTIONS. */
  action: string
  resourceType: string
  resourceName: string
  ip: string
  outcome: AuditOutcome
  details: string
}

/** Filters for listing and exporting audit logs. Dates are YYYY-MM-DD, inclusive. */
export interface AuditLogFilters {
  from?: string
  to?: string
  /** "user:12", "api_key:3" or "system". */
  actor?: string
  /** An action type, or a category prefix like "auth". */
  action?: string
  outcome?: AuditOutcome
  search?: string
}

/** One page of audit logs. */
export interface AuditLogPage {
  items: AuditLog[]
  total: number
}

/** Download formats for audit logs. */
export type AuditExportFormat = 'csv' | 'json'

/** A recurring audit export, run by the Workflow system. */
export interface AuditExportSchedule {
  scheduleId: number
  frequency: 'daily' | 'weekly' | 'monthly'
  format: AuditExportFormat
  recipients: string[]
  enabled: boolean
  /** The workflow that runs this export. */
  workflowName: string
  lastRunAt: string | null
  nextRunAt: string
}

/** Fields set when creating or editing an export schedule. */
export type AuditExportScheduleInput = Pick<AuditExportSchedule, 'frequency' | 'format' | 'recipients' | 'enabled'>
