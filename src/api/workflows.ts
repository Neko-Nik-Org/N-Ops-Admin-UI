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
 * Workflows: list, build, run and approve. Mock until `/workflow/*` exists in the API; every
 * function here is what the UI will call, so swapping in real requests later doesn't touch pages.
 */

import { db as adminDb, recordAudit } from '@/data/mockAdmin'
import { clone, mockDelay, notFound } from '@/data/mockHelpers'
import { VERIFIED_RECIPIENTS, WORKFLOW_SERVERS, workflowDb } from '@/data/mockWorkflows'
import type {
  EdgeHandle,
  RunStep,
  Workflow,
  WorkflowInput,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowRun,
  WorkflowServer,
  WorkflowSummary,
} from '@/types/workflow'

const me = () => adminDb.users[0]!.displayName

const findWorkflow = (workflowId: number) => workflowDb.workflows.find((w) => w.workflowId === workflowId) ?? notFound('workflow')

const triggerOf = (w: Pick<Workflow, 'nodes'>) => w.nodes.find((n) => n.type === 'trigger')

// ── Validation ───────────────────────────────────────────

/** Which outgoing handles each node type has. Alert is the end; Ansible only has an error path. */
export const NODE_HANDLES: Readonly<Record<WorkflowNodeType, readonly EdgeHandle[]>> = {
  trigger: ['out'],
  alert: [],
  condition: ['true', 'false'],
  remoteExec: ['out', 'error'],
  ansible: ['error'],
  ai: ['out', 'error'],
  apiCall: ['out', 'error'],
  parser: ['out', 'error'],
}

const SECRET_REF = /\{\{\s*secret\./

/** Problems with a node's own settings. */
const nodeProblems = (n: WorkflowNode): string[] => {
  const name = n.data.label || n.id
  const out: string[] = []
  switch (n.type) {
    case 'alert': {
      const c = n.data.config
      if (!c.subject.trim() || !c.body.trim()) out.push(`${name}: an alert needs a subject and a body.`)
      if (!c.email.enabled && !c.api.enabled && !c.app.enabled) out.push(`${name}: turn on at least one way to send the alert.`)
      const unverified = c.email.enabled ? c.email.recipients.filter((r) => !VERIFIED_RECIPIENTS.includes(r)) : []
      if (c.email.enabled && !c.email.recipients.length) out.push(`${name}: add at least one email recipient.`)
      if (unverified.length)
        out.push(`${name}: ${unverified.join(', ')} ${unverified.length === 1 ? "isn't" : "aren't"} verified.`)
      if (c.app.enabled && !c.app.userIds.length) out.push(`${name}: pick who gets the app notification.`)
      break
    }
    case 'remoteExec': {
      const c = n.data.config
      if (!c.command.trim()) out.push(`${name}: enter a command.`)
      if (!c.serverIds.length && !c.serverFromInput) out.push(`${name}: pick at least one server.`)
      if (c.strategy.kind === 'canary' && c.strategy.batchSize < 1) out.push(`${name}: a canary batch needs at least 1 server.`)
      break
    }
    case 'ansible':
      if (!n.data.config.playbook.trim()) out.push(`${name}: choose a playbook.`)
      if (!n.data.config.serverIds.length) out.push(`${name}: pick at least one server.`)
      break
    case 'ai':
      if (SECRET_REF.test(n.data.config.prompt) || SECRET_REF.test(n.data.config.input))
        out.push(`${name}: AI steps can't use Vault secrets.`)
      if (!n.data.config.prompt.trim()) out.push(`${name}: write a prompt.`)
      break
    case 'apiCall':
      if (!/^https?:\/\//.test(n.data.config.url)) out.push(`${name}: the URL must start with http:// or https://.`)
      break
  }
  return out
}

/**
 * Checks a workflow graph the way the server will: exactly one trigger, edges only from handles
 * the node type has, no cycles, every step reachable from the trigger, and valid step settings.
 * Returns the problems; an empty list means it can be saved.
 */
export const validateWorkflow = (input: Pick<WorkflowInput, 'name' | 'nodes' | 'edges'>): string[] => {
  const problems: string[] = []
  if (!input.name.trim()) problems.push('Give the workflow a name.')
  const triggers = input.nodes.filter((n) => n.type === 'trigger')
  if (triggers.length !== 1) problems.push('A workflow needs exactly one trigger.')
  const byId = new Map(input.nodes.map((n) => [n.id, n]))
  if (byId.size !== input.nodes.length) problems.push('Two steps share the same id.')

  for (const e of input.edges) {
    const from = byId.get(e.source)
    const to = byId.get(e.target)
    if (!from || !to) {
      problems.push(`A connection points to a step that doesn't exist (${e.id}).`)
      continue
    }
    if (e.source === e.target) problems.push(`${from.data.label} can't connect to itself.`)
    if (to.type === 'trigger') problems.push('Nothing can connect into the trigger.')
    if (!NODE_HANDLES[from.type].includes(e.sourceHandle))
      problems.push(
        from.type === 'alert'
          ? `${from.data.label}: an alert is the last step; nothing can follow it.`
          : from.type === 'ansible'
            ? `${from.data.label}: only the error path of an Ansible step can be connected.`
            : `${from.data.label} has no "${e.sourceHandle}" output.`,
      )
  }

  // cycles and reachability, by walking from the trigger
  const next = (id: string) => input.edges.filter((e) => e.source === id).map((e) => e.target)
  const state = new Map<string, 'visiting' | 'done'>()
  let cycle = false
  const walk = (id: string) => {
    if (state.get(id) === 'visiting') cycle = true
    if (state.has(id)) return
    state.set(id, 'visiting')
    next(id).forEach(walk)
    state.set(id, 'done')
  }
  if (triggers[0]) walk(triggers[0].id)
  if (cycle) problems.push('The workflow loops back on itself. Remove the connection that makes the loop.')
  if (triggers.length === 1)
    for (const n of input.nodes) if (!state.has(n.id)) problems.push(`${n.data.label} isn't connected to the trigger.`)

  for (const n of input.nodes) problems.push(...nodeProblems(n))
  return problems
}

const assertValid = (input: WorkflowInput, workflowId?: number) => {
  const problems = validateWorkflow(input)
  if (problems.length) throw new Error(problems[0])
  const name = input.name.trim().toLowerCase()
  if (workflowDb.workflows.some((w) => w.workflowId !== workflowId && w.name.toLowerCase() === name))
    throw new Error(`A workflow called ${input.name.trim()} already exists.`)
}

// ── Workflows ────────────────────────────────────────────

const summary = (w: Workflow): WorkflowSummary => {
  const last = workflowDb.runs
    .filter((r) => r.workflowId === w.workflowId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  return {
    workflowId: w.workflowId,
    name: w.name,
    description: w.description,
    enabled: w.enabled,
    tagId: w.tagId,
    trigger: clone(triggerOf(w)!.data.config as WorkflowSummary['trigger']),
    stepCount: w.nodes.length - 1,
    updatedAt: w.updatedAt,
    updatedBy: w.updatedBy,
    nextRunAt: w.enabled ? w.nextRunAt : null,
    lastRun: last ? { runId: last.runId, status: last.status, startedAt: last.startedAt } : null,
  }
}

/** Future: `GET /workflow/list`. Most recently changed first. */
export const listWorkflows = async (): Promise<WorkflowSummary[]> => {
  await mockDelay()
  return [...workflowDb.workflows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(summary)
}

/** Future: `GET /workflow/detail/{id}` — the full graph for the editor. */
export const getWorkflow = async (workflowId: number): Promise<Workflow> => {
  await mockDelay()
  return clone(findWorkflow(workflowId))
}

/** Future: `POST /workflow/create`. Fails past the plan's workflow limit. */
export const createWorkflow = async (input: WorkflowInput): Promise<Workflow> => {
  await mockDelay()
  const { limits } = adminDb.organization
  if (workflowDb.workflows.length >= limits.workflows)
    throw new Error(`Your plan allows ${limits.workflows} workflows. Delete one or raise the limit first.`)
  assertValid(input)
  const now = new Date().toISOString()
  const workflow: Workflow = {
    ...clone(input),
    name: input.name.trim(),
    workflowId: workflowDb.nextId.workflow++,
    createdAt: now,
    createdBy: me(),
    updatedAt: now,
    updatedBy: me(),
    nextRunAt: null,
  }
  workflowDb.workflows.push(workflow)
  adminDb.organization.usage.workflows = workflowDb.workflows.length
  recordAudit('workflow.create', 'workflow', workflow.name)
  return clone(workflow)
}

/** Future: `PUT /workflow/update/{id}` — saves the whole graph. */
export const updateWorkflow = async (workflowId: number, input: WorkflowInput): Promise<Workflow> => {
  await mockDelay()
  const workflow = findWorkflow(workflowId)
  assertValid(input, workflowId)
  Object.assign(workflow, clone(input), { name: input.name.trim(), updatedAt: new Date().toISOString(), updatedBy: me() })
  recordAudit('workflow.update', 'workflow', workflow.name)
  return clone(workflow)
}

/** Future: `PATCH /workflow/update/{id}` with `enabled`. */
export const setWorkflowEnabled = async (workflowId: number, enabled: boolean): Promise<void> => {
  await mockDelay()
  const workflow = findWorkflow(workflowId)
  workflow.enabled = enabled
  workflow.updatedAt = new Date().toISOString()
  workflow.updatedBy = me()
  recordAudit('workflow.update', 'workflow', workflow.name, enabled ? 'Enabled' : 'Disabled')
}

/** Future: `DELETE /workflow/delete/{id}` — removes it and its run history. */
export const deleteWorkflow = async (workflowId: number): Promise<void> => {
  await mockDelay()
  const workflow = findWorkflow(workflowId)
  workflowDb.workflows = workflowDb.workflows.filter((w) => w.workflowId !== workflowId)
  workflowDb.runs = workflowDb.runs.filter((r) => r.workflowId !== workflowId)
  adminDb.organization.usage.workflows = workflowDb.workflows.length
  recordAudit('workflow.delete', 'workflow', workflow.name)
}

// ── Runs ─────────────────────────────────────────────────

/** Future: `GET /workflow/{id}/runs` — newest first. */
export const listWorkflowRuns = async (workflowId: number): Promise<WorkflowRun[]> => {
  await mockDelay()
  return clone(workflowDb.runs.filter((r) => r.workflowId === workflowId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)))
}

/** Steps in the order they run: from the trigger along success / "true" paths. */
const happyPath = (w: Workflow): WorkflowNode[] => {
  const out: WorkflowNode[] = []
  let current: WorkflowNode | undefined = triggerOf(w)
  while (current) {
    const e = w.edges.find((x) => x.source === current!.id && (x.sourceHandle === 'out' || x.sourceHandle === 'true'))
    current = e ? w.nodes.find((n) => n.id === e.target) : undefined
    if (current) out.push(current)
  }
  return out
}

const needsApproval = (n: WorkflowNode) =>
  (n.type === 'remoteExec' || n.type === 'apiCall') && n.data.config.approval.required && !n.data.config.approval.bypass

const pendingStep = (n: WorkflowNode, status: RunStep['status']): RunStep => ({
  nodeId: n.id,
  label: n.data.label,
  status,
  startedAt: status === 'success' ? new Date().toISOString() : null,
  durationMs: status === 'success' ? 5 : null,
  output: status === 'success' ? (n.type === 'condition' ? 'true' : 'Mock output') : null,
  error: null,
})

/**
 * Future: `POST /workflow/{id}/run`. The mock "runs" the success path at once; it stops at the
 * first step that needs an admin's approval and waits there.
 */
export const runWorkflow = async (workflowId: number): Promise<WorkflowRun> => {
  await mockDelay()
  const workflow = findWorkflow(workflowId)
  if (!workflow.enabled) throw new Error(`${workflow.name} is disabled. Enable it before running it.`)
  const path = happyPath(workflow)
  const gate = path.findIndex(needsApproval)
  const now = new Date().toISOString()
  const run: WorkflowRun = {
    runId: workflowDb.nextId.run++,
    workflowId,
    status: gate === -1 ? 'success' : 'waiting_approval',
    triggeredBy: `Manual by ${me()}`,
    startedAt: now,
    finishedAt: gate === -1 ? now : null,
    steps: path.map((n, i) => pendingStep(n, gate === -1 || i < gate ? 'success' : i === gate ? 'waiting_approval' : 'skipped')),
    approval: gate === -1 ? null : { nodeId: path[gate]!.id, requestedAt: now, decidedBy: null },
  }
  workflowDb.runs.push(run)
  recordAudit(
    'workflow.run',
    'workflow',
    workflow.name,
    gate === -1 ? 'Succeeded' : `Waiting for approval at ${path[gate]!.data.label}`,
  )
  return clone(run)
}

/** Future: `POST /workflow/run/{runId}/approve` or `/reject`. Approving finishes the run. */
export const decideRunApproval = async (runId: number, approve: boolean): Promise<WorkflowRun> => {
  await mockDelay()
  const run = workflowDb.runs.find((r) => r.runId === runId) ?? notFound('run')
  if (run.status !== 'waiting_approval' || !run.approval) throw new Error("This run isn't waiting for approval.")
  const now = new Date().toISOString()
  run.approval.decidedBy = me()
  run.finishedAt = now
  const gate = run.steps.findIndex((s) => s.nodeId === run.approval!.nodeId)
  run.steps.forEach((s, i) => {
    if (i < gate) return
    if (approve) Object.assign(s, { status: 'success', startedAt: now, durationMs: 5, output: 'Mock output' })
    else if (i === gate) Object.assign(s, { status: 'failed', error: `Rejected by ${me()}` })
  })
  run.status = approve ? 'success' : 'rejected'
  const workflow = workflowDb.workflows.find((w) => w.workflowId === run.workflowId)
  recordAudit('workflow.run', 'workflow', workflow?.name ?? `workflow #${run.workflowId}`, approve ? 'Approved' : 'Rejected')
  return clone(run)
}

// ── Pickers ──────────────────────────────────────────────

/** Servers a step can target. Future: `GET /server/list`. */
export const listWorkflowServers = async (): Promise<WorkflowServer[]> => {
  await mockDelay()
  return clone([...WORKFLOW_SERVERS])
}
