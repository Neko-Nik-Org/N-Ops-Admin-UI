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
/** Workflows (/workflows): the organization's automations, each opening its flow and run history. */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { TableSkeleton } from '@/components/Skeleton'
import { useTagOptions } from '@/hooks/useTagOptions'
import { preloadRoute } from '@/routes/lazyPages'
import { useSelectedTag } from '@/hooks/useTags'
import { describeTrigger, RUN_STATUS, TRIGGER_KINDS } from '@/utils/describeWorkflow'
import { useSetWorkflowEnabled, useWorkflows } from '@/hooks/useWorkflows'
import type { WorkflowSummary } from '@/types/workflow'
import { formatDateTime, formatRelative } from '@/utils/format'
import { workflowPath } from '@/pages/workflows/paths'

/** The enabled switch in a row; doesn't open the workflow. */
const EnabledToggle = ({ workflow }: { workflow: WorkflowSummary }) => {
  const { mutateAsync, isPending } = useSetWorkflowEnabled()
  const toggle = async () => {
    try {
      await mutateAsync({ workflowId: workflow.workflowId, enabled: !workflow.enabled })
      toast.success(`${workflow.enabled ? 'Disabled' : 'Enabled'} ${workflow.name}.`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={`${workflow.enabled ? 'Disable' : 'Enable'} ${workflow.name}`}
      checked={workflow.enabled}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={toggle}
      className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-border-strong bg-border transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-3.5 before:rounded-full before:bg-surface before:shadow before:transition-transform checked:border-signal checked:bg-signal checked:before:translate-x-4 disabled:opacity-60"
    />
  )
}

export const WorkflowsPage = () => {
  const navigate = useNavigate()
  const { data: workflows, isLoading, error } = useWorkflows()
  const { tagName } = useTagOptions()
  const { selectedTag, showTag } = useSelectedTag()
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const visible = (workflows ?? []).filter(
    (w) =>
      (!selectedTag || w.tagId === selectedTag.tagId) &&
      (!q || w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)),
  )
  const enabled = (workflows ?? []).filter((w) => w.enabled).length
  const waiting = (workflows ?? []).filter((w) => w.lastRun?.status === 'waiting_approval').length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Workflows" mock />

      {workflows && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['Workflows', `${workflows.length}`],
            ['Enabled', `${enabled} of ${workflows.length}`],
            ['Waiting for approval', `${waiting}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-surface-raised px-5 py-4">
              <p className="text-xs text-text-muted">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
            </div>
          ))}
        </div>
      )}

      <section aria-label="Workflows" className="rounded-xl border border-border bg-surface-raised p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-text">
            All workflows <span className="ml-1 text-sm font-normal text-text-muted">{visible.length}</span>
            {selectedTag && <span className="ml-2 text-xs font-normal text-text-muted">Tag {selectedTag.tagName}</span>}
          </h2>
          <SearchInput value={search} onChange={setSearch} placeholder="Search workflows" className="w-full sm:w-64" />
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <p className="text-sm text-danger">Couldn't load workflows: {error.message}</p>
        ) : !visible.length ? (
          <p className="py-10 text-center text-sm text-text-muted">
            {workflows?.length ? 'No workflows match your search or tag.' : 'No workflows yet.'}
          </p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[56rem] border-collapse text-left">
              <thead>
                <tr className="text-xs tracking-wide text-text-muted uppercase">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Trigger</th>
                  <th className="pb-2 font-medium">Last run</th>
                  <th className="pb-2 font-medium">Next run</th>
                  {showTag && <th className="pb-2 font-medium">Tag</th>}
                  <th className="pb-2 font-medium">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((w) => (
                  <tr
                    key={w.workflowId}
                    tabIndex={0}
                    onClick={() => navigate(workflowPath(w.workflowId))}
                    // rows aren't links, so preload the detail page here
                    onPointerEnter={() => preloadRoute(workflowPath(w.workflowId))}
                    onFocus={() => preloadRoute(workflowPath(w.workflowId))}
                    onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && navigate(workflowPath(w.workflowId))}
                    className="cursor-pointer border-t border-border outline-none hover:bg-ink/50 focus-visible:ring-1 focus-visible:ring-signal focus-visible:ring-inset"
                  >
                    <td className="max-w-md py-3 pr-4">
                      <p className="text-sm font-medium text-text">{w.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        {w.stepCount} steps · {w.description}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      <Badge tone="accent">{TRIGGER_KINDS[w.trigger.kind]}</Badge>
                      <p className="mt-1 text-xs text-text-muted">{describeTrigger(w.trigger)}</p>
                    </td>
                    <td className="py-3 pr-4 text-sm whitespace-nowrap">
                      {w.lastRun ? (
                        <>
                          <Badge tone={RUN_STATUS[w.lastRun.status].tone}>{RUN_STATUS[w.lastRun.status].label}</Badge>
                          <p className="mt-1 text-xs text-text-muted" title={formatDateTime(w.lastRun.startedAt)}>
                            {formatRelative(w.lastRun.startedAt)}
                          </p>
                        </>
                      ) : (
                        <span className="text-text-muted">Never</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm whitespace-nowrap text-text-muted">
                      {w.nextRunAt ? (
                        <span title={formatDateTime(w.nextRunAt)}>{formatRelative(w.nextRunAt)}</span>
                      ) : w.enabled ? (
                        'On trigger'
                      ) : (
                        'Disabled'
                      )}
                    </td>
                    {showTag && (
                      <td className="py-3 pr-4">
                        <Badge tone="accent" mono>
                          {tagName(w.tagId)}
                        </Badge>
                      </td>
                    )}
                    <td className="py-3">
                      <EnabledToggle workflow={w} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
