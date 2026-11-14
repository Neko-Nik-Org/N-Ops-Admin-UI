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
/** Audit logs (read-only, last 90 days), exports and scheduled exports. Mock until the API has them. */

import moment from 'moment'
import { AUDIT_ACTIONS, AUDIT_RETENTION_DAYS } from '../catalog'
import { clone, db, mockDelay, notFound, recordAudit } from '../mock/db'
import type {
  AuditExportFormat,
  AuditExportSchedule,
  AuditExportScheduleInput,
  AuditLog,
  AuditLogFilters,
  AuditLogPage,
} from '../types'

/** The oldest day still kept (YYYY-MM-DD). */
export const retentionStart = () => moment().subtract(AUDIT_RETENTION_DAYS, 'days').format('YYYY-MM-DD')

/** Applies the filters, newest first, never older than the retention window. */
const filterLogs = (filters: AuditLogFilters): AuditLog[] => {
  const from = moment.max(moment(filters.from || retentionStart()), moment(retentionStart())).startOf('day')
  const to = filters.to ? moment(filters.to).endOf('day') : null
  const search = filters.search?.trim().toLowerCase()

  return db.auditLogs.filter((log) => {
    const at = moment(log.occurredAt)
    if (at.isBefore(from) || (to && at.isAfter(to))) return false
    if (filters.actor) {
      const key = log.actor.type === 'system' ? 'system' : `${log.actor.type}:${log.actor.id}`
      if (key !== filters.actor) return false
    }
    if (filters.action && log.action !== filters.action && !log.action.startsWith(`${filters.action}.`)) return false
    if (filters.outcome && log.outcome !== filters.outcome) return false
    if (search) {
      const haystack = `${log.actor.name} ${log.action} ${AUDIT_ACTIONS[log.action] ?? ''} ${log.resourceName} ${log.details} ${log.ip}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })
}

/** Future: `GET /audit/list?from&to&actor&action&outcome&search&page&page_size`. */
export const listAuditLogs = async (filters: AuditLogFilters, page: number, pageSize: number): Promise<AuditLogPage> => {
  await mockDelay()
  const all = filterLogs(filters)
  return { items: clone(all.slice((page - 1) * pageSize, page * pageSize)), total: all.length }
}

/** Escapes one CSV cell. */
const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

/** Turns logs into a downloadable file body. */
export const serializeAuditLogs = (logs: AuditLog[], format: AuditExportFormat): string => {
  if (format === 'json') return JSON.stringify(logs, null, 2)
  const header = ['id', 'time_utc', 'actor_type', 'actor', 'action', 'resource_type', 'resource', 'outcome', 'ip', 'details']
  const rows = logs.map((l) =>
    [String(l.auditId), l.occurredAt, l.actor.type, l.actor.name, l.action, l.resourceType, l.resourceName, l.outcome, l.ip, l.details].map(csvCell).join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

/** Future: `GET /audit/export?format&...filters` (a file download). Records the export itself. */
export const exportAuditLogs = async (filters: AuditLogFilters, format: AuditExportFormat): Promise<{ body: string; count: number }> => {
  await mockDelay()
  const logs = filterLogs(filters)
  recordAudit('audit.export', 'audit_log', `${logs.length} entries`, `${format.toUpperCase()} download`)
  return { body: serializeAuditLogs(logs, format), count: logs.length }
}

/** People and keys that appear in the logs, for the "who" filter. */
export const listAuditActors = async (): Promise<Array<{ value: string; label: string }>> => {
  await mockDelay()
  const users = db.users.map((u) => ({ value: `user:${u.userId}`, label: u.displayName }))
  const keys = db.apiKeys.map((k) => ({ value: `api_key:${k.apiKeyId}`, label: `${k.keyName} (API key)` }))
  return [...users, ...keys, { value: 'system', label: 'System (workflows)' }]
}

/** When a schedule next runs: tomorrow, next Monday or the 1st of next month, at 06:00. */
const nextRun = (frequency: AuditExportSchedule['frequency']) => {
  const unit = frequency === 'daily' ? 'day' : frequency === 'weekly' ? 'isoWeek' : 'month'
  return moment().add(1, unit === 'isoWeek' ? 'week' : unit).startOf(unit).add(6, 'hours').toISOString()
}

const WORKFLOW_NAMES = { daily: 'Daily audit export', weekly: 'Weekly audit export', monthly: 'Monthly audit export' } as const

/** Future: `GET /workflow/list?template=audit-export`. */
export const listAuditExportSchedules = async (): Promise<AuditExportSchedule[]> => {
  await mockDelay()
  return clone(db.schedules)
}

/** Future: creates an "Audit export" workflow from its template (`POST /workflow/create`). */
export const createAuditExportSchedule = async (input: AuditExportScheduleInput): Promise<void> => {
  await mockDelay()
  db.schedules.push({ ...clone(input), scheduleId: db.nextId.schedule++, workflowName: WORKFLOW_NAMES[input.frequency], lastRunAt: null, nextRunAt: nextRun(input.frequency) })
  recordAudit('workflow.create', 'workflow', WORKFLOW_NAMES[input.frequency], `Sends ${input.format.toUpperCase()} to ${input.recipients.join(', ')}`)
}

/** Future: `PUT /workflow/update`. */
export const updateAuditExportSchedule = async (scheduleId: number, input: AuditExportScheduleInput): Promise<void> => {
  await mockDelay()
  const schedule = db.schedules.find((s) => s.scheduleId === scheduleId) ?? notFound('schedule')
  Object.assign(schedule, clone(input), { workflowName: WORKFLOW_NAMES[input.frequency], nextRunAt: nextRun(input.frequency) })
  recordAudit('workflow.update', 'workflow', schedule.workflowName, input.enabled ? '' : 'Paused')
}

/** Future: `DELETE /workflow/delete/{id}`. */
export const deleteAuditExportSchedule = async (scheduleId: number): Promise<void> => {
  await mockDelay()
  const schedule = db.schedules.find((s) => s.scheduleId === scheduleId) ?? notFound('schedule')
  db.schedules = db.schedules.filter((s) => s.scheduleId !== scheduleId)
  recordAudit('workflow.delete', 'workflow', schedule.workflowName)
}
