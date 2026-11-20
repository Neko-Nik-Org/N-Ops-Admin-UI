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
 * One workflow (/workflows/:workflowId): its flow on a canvas, and beside it either the picked
 * step's settings or the run history. Picking a run colors each step by how it went.
 */

import { Check, ChevronRight, Play, Trash2, X } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Badge } from '@/components/atoms/Badge'
import { Switch } from '@/components/atoms/Switch'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { PageHeader } from '@/components/molecules/PageHeader'
import { Skeleton, SkeletonText } from '@/components/molecules/Skeleton'
import { useTagOptions } from '@/features/admin/hooks/useTagOptions'
import { describeTrigger, RUN_STATUS, STEP_STATUS } from '@/features/workflows/describe'
import {
  useDecideApproval,
  useDeleteWorkflow,
  useRunWorkflow,
  useSetWorkflowEnabled,
  useWorkflow,
  useWorkflowRuns,
} from '@/features/workflows/hooks/useWorkflows'
import type { StepStatus, Workflow, WorkflowRun } from '@/features/workflows/types'
import { cn } from '@/utils/cn'
import { formatDateTime, formatRelative } from '@/utils/format'
import { workflowPath } from './paths'
import { StepDetails } from './StepDetails'

// The canvas pulls in @xyflow/react (and its CSS): load it only once a workflow is on screen
const WorkflowCanvas = lazy(() => import('./WorkflowCanvas').then((m) => ({ default: m.WorkflowCanvas })))

/** The right-hand pane's title bar, with a close button when something is picked. */
const PaneHeader = ({ title, onClose }: { title: string; onClose?: () => void }) => (
  <div className="-mt-2 mb-3 flex items-center justify-between border-b border-border pb-2">
    <span className="text-xs font-medium tracking-wide text-text-muted uppercase">{title}</span>
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        aria-label="Close details"
        title="Close details"
        className="-mr-2 flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-ink hover:text-text"
      >
        <X size={15} aria-hidden="true" />
      </button>
    )}
  </div>
)

const duration = (run: WorkflowRun) => {
  if (!run.finishedAt) return null
  const s = Math.max(0, Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

/** The run history; the picked run shows its steps and, while waiting, Approve / Reject. */
const RunList = ({
  workflow,
  runs,
  runId,
  onPick,
}: {
  workflow: Workflow
  runs: WorkflowRun[]
  runId: number | null
  onPick: (runId: number | null) => void
}) => {
  const { mutateAsync: decide, isPending } = useDecideApproval()
  const approve = async (run: WorkflowRun, ok: boolean) => {
    try {
      await decide({ runId: run.runId, approve: ok })
      toast.success(ok ? 'Approved. The run carried on.' : 'Rejected. The run stopped.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }
  if (!runs.length) return <p className="py-8 text-center text-sm text-text-muted">No runs yet.</p>
  return (
    <ul className="flex flex-col gap-2" aria-label="Runs">
      {runs.map((run) => {
        const picked = run.runId === runId
        const status = RUN_STATUS[run.status]
        const gate = run.approval && workflow.nodes.find((n) => n.id === run.approval!.nodeId)
        return (
          <li key={run.runId} className={cn('rounded-lg border', picked ? 'border-signal/50 bg-signal/5' : 'border-border')}>
            <button
              type="button"
              aria-pressed={picked}
              onClick={() => onPick(picked ? null : run.runId)}
              className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">Run #{run.runId}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </span>
                <span className="mt-0.5 block truncate text-xs text-text-muted">{run.triggeredBy}</span>
              </span>
              <span className="shrink-0 text-right text-xs text-text-muted" title={formatDateTime(run.startedAt)}>
                {formatRelative(run.startedAt)}
                {duration(run) && <span className="block">{duration(run)}</span>}
              </span>
            </button>
            {picked && (
              <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
                {run.status === 'waiting_approval' && gate && (
                  <div className="rounded-md border border-warning/40 bg-warning/10 p-2.5">
                    <p className="text-sm text-text">
                      <span className="font-medium">{gate.data.label}</span> is waiting for an admin's approval.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <LoadingButton size="sm" icon={<Check size={14} />} disabled={isPending} onClick={() => approve(run, true)}>
                        Approve
                      </LoadingButton>
                      <LoadingButton
                        size="sm"
                        variant="ghost"
                        icon={<X size={14} />}
                        disabled={isPending}
                        onClick={() => approve(run, false)}
                      >
                        Reject
                      </LoadingButton>
                    </div>
                  </div>
                )}
                <ol className="flex flex-col gap-1.5">
                  {run.steps.map((s) => (
                    <li key={s.nodeId} className="text-xs">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-text">{s.label}</span>
                        <Badge tone={STEP_STATUS[s.status].tone}>{STEP_STATUS[s.status].label}</Badge>
                      </span>
                      {s.error && <span className="mt-0.5 block text-danger">{s.error}</span>}
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-text-muted">Click a step on the canvas to see its output.</p>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export const WorkflowDetailPage = () => {
  const navigate = useNavigate()
  const params = useParams<{ workflowId: string }>()
  const workflowId = params.workflowId && /^\d+$/.test(params.workflowId) ? Number(params.workflowId) : null
  const { data: workflow, isLoading, error } = useWorkflow(workflowId)
  const { data: runs } = useWorkflowRuns(workflowId)
  const { tagName } = useTagOptions()
  const { mutateAsync: setEnabled, isPending: toggling } = useSetWorkflowEnabled()
  const { mutateAsync: run } = useRunWorkflow()
  const { mutateAsync: remove } = useDeleteWorkflow()
  const [nodeId, setNodeId] = useState<string | null>(null)
  /** undefined: follow the latest run; null: none picked. */
  const [pickedRunId, setPickedRunId] = useState<number | null | undefined>(undefined)
  const [deleting, setDeleting] = useState(false)

  const crumbs = (
    <nav aria-label="Path" className="flex items-center gap-1 text-sm text-text-muted">
      <Link to={workflowPath()} className="hover:text-text">
        Workflows
      </Link>
      <ChevronRight size={14} aria-hidden="true" />
      <span aria-current="page" className="truncate text-text">
        {workflow?.name ?? '…'}
      </span>
    </nav>
  )

  if (isLoading) return <SkeletonText lines={10} />
  if (error || !workflow)
    return (
      <div className="flex flex-col gap-6">
        {crumbs}
        <div className="rounded-xl border border-border bg-surface-raised p-10 text-center">
          <p className="text-sm text-text">This workflow doesn't exist. It may have been deleted.</p>
          <Link to={workflowPath()} className="mt-2 inline-block text-sm text-signal hover:text-signal-strong">
            Go to Workflows
          </Link>
        </div>
      </div>
    )

  const runId = pickedRunId === undefined ? (runs?.[0]?.runId ?? null) : pickedRunId
  const pickedRun = runs?.find((r) => r.runId === runId)
  const statuses = pickedRun && Object.fromEntries(pickedRun.steps.map((s) => [s.nodeId, s.status] as [string, StepStatus]))
  const step = workflow.nodes.find((n) => n.id === nodeId)
  const trigger = workflow.nodes.find((n) => n.type === 'trigger')

  const runNow = async () => {
    try {
      const result = await run(workflow.workflowId)
      setPickedRunId(result.runId)
      setNodeId(null)
      toast[result.status === 'waiting_approval' ? 'info' : 'success'](
        result.status === 'waiting_approval' ? 'Started. It is waiting for approval.' : 'Run finished.',
      )
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const toggle = async () => {
    try {
      await setEnabled({ workflowId: workflow.workflowId, enabled: !workflow.enabled })
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {crumbs}
        <PageHeader
          title={workflow.name}
          description={workflow.description}
          mock
          actions={
            <>
              <Switch
                label={workflow.enabled ? 'Enabled' : 'Disabled'}
                checked={workflow.enabled}
                disabled={toggling}
                onChange={toggle}
              />
              <LoadingButton
                icon={<Play size={14} />}
                disabled={!workflow.enabled}
                title={workflow.enabled ? undefined : 'Enable it to run it'}
                onClick={runNow}
              >
                Run now
              </LoadingButton>
              <LoadingButton
                variant="ghost"
                icon={<Trash2 size={14} />}
                aria-label="Delete workflow"
                title="Delete"
                onClick={() => setDeleting(true)}
              />
            </>
          }
        />
        <p className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {trigger?.type === 'trigger' && <Badge tone="accent">{describeTrigger(trigger.data.config)}</Badge>}
          <Badge tone="accent" mono>
            {tagName(workflow.tagId)}
          </Badge>
          <span title={formatDateTime(workflow.updatedAt)}>
            Updated {formatRelative(workflow.updatedAt)} by {workflow.updatedBy}
          </span>
          {workflow.enabled && workflow.nextRunAt && <span>· Next run {formatRelative(workflow.nextRunAt)}</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Suspense
          fallback={
            <Skeleton height="100%" radius={12} className="h-[28rem] lg:h-[34rem]" aria-label="Loading workflow canvas" />
          }
        >
          <WorkflowCanvas workflow={workflow} statuses={statuses} selectedNodeId={nodeId} onSelect={setNodeId} />
        </Suspense>
        <aside
          aria-label="Details"
          className="min-w-0 rounded-xl border border-border bg-surface-raised p-5 lg:max-h-[34rem] lg:overflow-auto"
        >
          {step ? (
            <>
              <PaneHeader title="Step" onClose={() => setNodeId(null)} />
              <StepDetails step={step} runStep={pickedRun?.steps.find((s) => s.nodeId === step.id)} />
            </>
          ) : (
            <>
              <PaneHeader title={`Runs${runs ? ` · ${runs.length}` : ''}`} />
              {runs ? (
                <RunList workflow={workflow} runs={runs} runId={runId} onPick={setPickedRunId} />
              ) : (
                <SkeletonText lines={5} />
              )}
            </>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={deleting}
        title="Delete workflow"
        confirmLabel="Delete workflow"
        successMessage={`Deleted ${workflow.name}.`}
        onConfirm={() => remove(workflow.workflowId).then(() => navigate(workflowPath(), { replace: true }))}
        onClose={() => setDeleting(false)}
      >
        <p>
          Delete <span className="font-medium text-text">{workflow.name}</span> and its run history? It stops running at once.
          This can't be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}
