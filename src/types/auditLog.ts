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
/** Types for the audit log and its scheduled exports. */

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
