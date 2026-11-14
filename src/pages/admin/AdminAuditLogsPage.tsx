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
/** Admin › Audit logs (/admin/audit-logs): read-only history of the last 90 days, filters, export and scheduled exports. */

import { Bot, CalendarClock, ChevronLeft, ChevronRight, Download, KeyRound, Pencil, Plus, Trash2, User, Workflow } from 'lucide-react'
import moment from 'moment'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Badge, type BadgeTone } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { LoadingButton, TableSkeleton, useAsyncAction } from '@/components/loading'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { ExportScheduleDialog } from '@/components/organisms/ExportScheduleDialog'
import { retentionStart } from '@/features/admin/api/auditLogs'
import { AUDIT_ACTIONS, AUDIT_CATEGORIES, AUDIT_RETENTION_DAYS } from '@/features/admin/catalog'
import {
  useAuditActors,
  useAuditExportSchedules,
  useAuditLogs,
  useDeleteAuditExportSchedule,
  useExportAuditLogs,
} from '@/features/admin/hooks/useAdmin'
import type { AuditActor, AuditExportFormat, AuditExportSchedule, AuditLogFilters, AuditOutcome } from '@/features/admin/types'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import { downloadText } from '@/utils/download'
import { formatDateTime, formatRelative } from '@/utils/format'

const PAGE_SIZE = 25
const today = () => moment().format('YYYY-MM-DD')

/** Quick date ranges, in days back from today. */
const RANGES: Array<[string, number]> = [
  ['24 hours', 1],
  ['7 days', 7],
  ['30 days', 30],
  ['90 days', AUDIT_RETENTION_DAYS],
]

const OUTCOME_TONE: Record<AuditOutcome, BadgeTone> = { success: 'signal', denied: 'warning', failed: 'danger' }

/** Icon for who did it: a person, an API key or the workflow scheduler. */
const ActorIcon = ({ actor }: { actor: AuditActor }) => {
  const Icon = actor.type === 'user' ? User : actor.type === 'api_key' ? KeyRound : Bot
  return <Icon size={14} aria-hidden="true" className="shrink-0 text-text-muted" />
}

/** Actions grouped by category, for the action filter. */
const ACTION_GROUPS = Object.entries(AUDIT_CATEGORIES).map(([category, label]) => ({
  category,
  label,
  actions: Object.entries(AUDIT_ACTIONS).filter(([action]) => action.startsWith(`${category}.`)),
}))

/** The recurring exports, each backed by a workflow. */
const ScheduledExports = () => {
  const { data: schedules } = useAuditExportSchedules()
  const { mutateAsync: remove } = useDeleteAuditExportSchedule()
  const [editing, setEditing] = useState<{ open: boolean; schedule?: AuditExportSchedule }>({ open: false })
  const [deleting, setDeleting] = useState<AuditExportSchedule | null>(null)

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <CalendarClock size={17} className="text-signal" aria-hidden="true" />
          Scheduled exports
        </h2>
        <LoadingButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing({ open: true })}>
          Schedule export
        </LoadingButton>
      </div>
      <p className="mb-4 text-sm text-text-muted">
        Logs are kept for {AUDIT_RETENTION_DAYS} days. To keep them longer, email them on a schedule. Each schedule runs as a{' '}
        <Link to={ROUTES.workflows} className="text-signal hover:text-signal-strong">
          workflow
        </Link>
        .
      </p>

      {!schedules?.length ? (
        <p className="py-4 text-center text-sm text-text-muted">No scheduled exports.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {schedules.map((s) => (
            <li key={s.scheduleId} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border p-3">
              <Workflow size={16} className="shrink-0 text-accent-secondary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text">
                  {s.workflowName}
                  <Badge mono>{s.format.toUpperCase()}</Badge>
                  {!s.enabled && <Badge tone="warning">Paused</Badge>}
                </p>
                <p className="truncate text-xs text-text-muted">
                  To {s.recipients.join(', ')} · {s.enabled ? `next ${formatRelative(s.nextRunAt)}` : 'not running'} · last{' '}
                  {formatRelative(s.lastRunAt, 'never ran')}
                </p>
              </div>
              <div className="flex gap-1">
                <LoadingButton
                  variant="ghost"
                  size="sm"
                  icon={<Pencil size={14} />}
                  aria-label={`Edit ${s.workflowName}`}
                  onClick={() => setEditing({ open: true, schedule: s })}
                />
                <LoadingButton variant="ghost" size="sm" icon={<Trash2 size={14} />} aria-label={`Delete ${s.workflowName}`} onClick={() => setDeleting(s)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ExportScheduleDialog open={editing.open} schedule={editing.schedule} onClose={() => setEditing({ open: false })} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete scheduled export"
        confirmLabel="Delete schedule"
        successMessage="Scheduled export deleted."
        onConfirm={() => (deleting ? remove(deleting.scheduleId) : Promise.resolve())}
        onClose={() => setDeleting(null)}
      >
        <p>
          Stop <span className="font-medium text-text">{deleting?.workflowName}</span> and delete its workflow? Files already sent aren't
          affected.
        </p>
      </ConfirmDialog>
    </section>
  )
}

/** Filterable, paged audit log with export. */
export const AdminAuditLogsPage = () => {
  const [from, setFrom] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'))
  const [to, setTo] = useState(today())
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [outcome, setOutcome] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search)

  const filters: AuditLogFilters = {
    from,
    to,
    actor: actor || undefined,
    action: action || undefined,
    outcome: (outcome || undefined) as AuditOutcome | undefined,
    search: deferredSearch || undefined,
  }
  const { data, isLoading, isFetching, error } = useAuditLogs(filters, page, PAGE_SIZE)
  const { data: actors } = useAuditActors()
  const { mutateAsync: runExport } = useExportAuditLogs()
  const [exportState, exportLogs] = useAsyncAction(
    async (format: AuditExportFormat) => {
      const { body, count } = await runExport({ filters, format })
      downloadText(`audit-log_${from}_to_${to}.${format}`, body, format === 'csv' ? 'text/csv' : 'application/json')
      return count
    },
    { successMs: 800 },
  )

  /** Every filter change starts again from page 1. */
  const change =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPage(1)
    }
  const setRange = (days: number) => {
    setFrom(moment().subtract(days, 'days').format('YYYY-MM-DD'))
    setTo(today())
    setPage(1)
  }
  const hasFilters = !!(actor || action || outcome || search)
  const clearFilters = () => {
    setActor('')
    setAction('')
    setOutcome('')
    setSearch('')
    setPage(1)
  }

  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startRow = total ? (page - 1) * PAGE_SIZE + 1 : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit logs"
        description={`Who did what, and when, over the last ${AUDIT_RETENTION_DAYS} days. Read-only.`}
        mock
        actions={
          <>
            <LoadingButton
              variant="secondary"
              icon={<Download size={14} />}
              state={exportState}
              loadingText="Exporting"
              successText="Downloaded"
              disabled={!total}
              onClick={() =>
                exportLogs('csv')
                  .then((n) => toast.success(`Exported ${n} entries as CSV.`))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              Export CSV
            </LoadingButton>
            <LoadingButton
              variant="ghost"
              disabled={!total || exportState !== 'idle'}
              onClick={() =>
                exportLogs('json')
                  .then((n) => toast.success(`Exported ${n} entries as JSON.`))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              JSON
            </LoadingButton>
          </>
        }
      />

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              From
              <Input
                type="date"
                aria-label="From date"
                value={from}
                min={retentionStart()}
                max={to}
                onChange={(e) => change(setFrom)(e.target.value || retentionStart())}
                className="w-40 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              To
              <Input
                type="date"
                aria-label="To date"
                value={to}
                min={from}
                max={today()}
                onChange={(e) => change(setTo)(e.target.value || today())}
                className="w-40 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-1 pb-0.5" role="group" aria-label="Quick ranges">
              {RANGES.map(([label, days]) => {
                const on = to === today() && from === moment().subtract(days, 'days').format('YYYY-MM-DD')
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setRange(days)}
                    className={cn(
                      'rounded-full border px-2.5 py-1.5 text-xs transition-colors',
                      on ? 'border-text bg-text text-ink' : 'border-border text-text-muted hover:border-border-strong hover:text-text',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={change(setSearch)} placeholder="Search resource, details or IP" className="min-w-56 flex-1" />
            <Select aria-label="Who" value={actor} onChange={(e) => change(setActor)(e.target.value)} className="w-48">
              <option value="">Anyone</option>
              {actors?.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Action" value={action} onChange={(e) => change(setAction)(e.target.value)} className="w-52">
              <option value="">Any action</option>
              {ACTION_GROUPS.map((g) => (
                <optgroup key={g.category} label={g.label}>
                  <option value={g.category}>All {g.label.toLowerCase()}</option>
                  {g.actions.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <Select aria-label="Outcome" value={outcome} onChange={(e) => change(setOutcome)(e.target.value)} className="w-36">
              <option value="">Any outcome</option>
              <option value="success">Succeeded</option>
              <option value="denied">Denied</option>
              <option value="failed">Failed</option>
            </Select>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-sm text-signal hover:text-signal-strong">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} columns={5} title={false} />
        ) : error ? (
          <p className="text-sm text-text-muted">Couldn't load audit logs: {error.message}</p>
        ) : !data?.items.length ? (
          <p className="py-10 text-center text-sm text-text-muted">No entries match these filters.</p>
        ) : (
          <>
            <div className={cn('overflow-x-auto transition-opacity', isFetching && 'opacity-60')} aria-busy={isFetching}>
              <table className="w-full min-w-[53.75rem] border-collapse text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-text-muted uppercase">
                    <th className="pb-2 font-medium">When</th>
                    <th className="pb-2 font-medium">Who</th>
                    <th className="pb-2 font-medium">Action</th>
                    <th className="pb-2 font-medium">Resource</th>
                    <th className="pb-2 font-medium">Outcome</th>
                    <th className="pb-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.auditId} className="border-t border-border align-top">
                      <td className="py-2.5 pr-3 text-sm whitespace-nowrap text-text" title={formatRelative(log.occurredAt)}>
                        {formatDateTime(log.occurredAt)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-1.5 text-sm text-text">
                          <ActorIcon actor={log.actor} />
                          {log.actor.name}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="text-sm text-text">{AUDIT_ACTIONS[log.action] ?? log.action}</p>
                        <p className="font-mono text-[0.6875rem] text-text-muted">{log.action}</p>
                      </td>
                      <td className="max-w-xs py-2.5 pr-3">
                        <p className="truncate text-sm text-text">{log.resourceName}</p>
                        {log.details && <p className="truncate text-xs text-text-muted">{log.details}</p>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={OUTCOME_TONE[log.outcome]}>{log.outcome === 'success' ? 'Succeeded' : log.outcome === 'denied' ? 'Denied' : 'Failed'}</Badge>
                      </td>
                      <td className="py-2.5 font-mono text-xs text-text-muted">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm text-text-muted">
              <span>
                {startRow}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <LoadingButton
                  variant="ghost"
                  size="sm"
                  icon={<ChevronLeft size={15} />}
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                />
                <span className="px-2">
                  Page {page} of {pages}
                </span>
                <LoadingButton
                  variant="ghost"
                  size="sm"
                  icon={<ChevronRight size={15} />}
                  aria-label="Next page"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                />
              </div>
            </div>
          </>
        )}
      </section>

      <ScheduledExports />
    </div>
  )
}
