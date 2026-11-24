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

import { beforeEach, describe, expect, it } from 'vitest'
import {
  createWorkflow,
  decideRunApproval,
  deleteWorkflow,
  getWorkflow,
  listWorkflowRuns,
  listWorkflows,
  runWorkflow,
  setWorkflowEnabled,
  updateWorkflow,
  validateWorkflow,
} from '@/api/workflows'
import type { Workflow, WorkflowInput } from '@/types/workflow'
import { db as adminDb, resetAdminMock } from '@/data/mockAdmin'
import { resetWorkflowMock, workflowDb } from '@/data/mockWorkflows'

beforeEach(() => {
  resetAdminMock()
  resetWorkflowMock()
})

const inputOf = (w: Workflow): WorkflowInput => ({
  name: w.name,
  description: w.description,
  enabled: w.enabled,
  tagId: w.tagId,
  nodes: structuredClone(w.nodes),
  edges: structuredClone(w.edges),
})

const health = () => inputOf(workflowDb.workflows[0]!)

describe('workflow mock data', () => {
  it('seeds 6 valid workflows, matching the organization usage', () => {
    expect(workflowDb.workflows).toHaveLength(6)
    expect(adminDb.organization.usage.workflows).toBe(6)
    for (const w of workflowDb.workflows) expect(validateWorkflow(w), w.name).toEqual([])
  })

  it('covers every building block and trigger kind from the spec', () => {
    const nodes = workflowDb.workflows.flatMap((w) => w.nodes)
    expect(new Set(nodes.map((n) => n.type))).toEqual(
      new Set(['trigger', 'alert', 'condition', 'remoteExec', 'ansible', 'ai', 'apiCall', 'parser']),
    )
    const triggers = nodes.flatMap((n) => (n.type === 'trigger' ? [n.data.config.kind] : []))
    expect(new Set(triggers)).toEqual(new Set(['interval', 'cron', 'metric', 'manual']))
  })

  it('lists workflows with their trigger, step count and last run', async () => {
    const list = await listWorkflows()
    const mail = list.find((w) => w.name === 'Mail queue watch')!
    expect(mail.trigger).toEqual({ kind: 'interval', everySeconds: 60 })
    expect(mail.stepCount).toBe(4)
    expect(mail.lastRun?.status).toBe('success')
    expect(list.find((w) => w.name === 'TLS certificate expiry')).toMatchObject({
      enabled: false,
      nextRunAt: null,
      lastRun: null,
    })
  })
})

describe('validateWorkflow', () => {
  it('rejects a step after an alert', () => {
    const w = health()
    w.edges.push({ id: 'x', source: 'notify', target: 'unreachable', sourceHandle: 'out' })
    expect(validateWorkflow(w)).toContain('Page on-call: an alert is the last step; nothing can follow it.')
  })

  it('allows only the error path out of an Ansible step', () => {
    const w = inputOf(workflowDb.workflows[4]!)
    w.edges.push({ id: 'x', source: 'deploy', target: 'failed', sourceHandle: 'out' })
    expect(validateWorkflow(w)).toContain('deploy-nginx.yml: only the error path of an Ansible step can be connected.')
  })

  it("doesn't let AI steps use Vault secrets", () => {
    const w = inputOf(workflowDb.workflows[2]!)
    const ai = w.nodes.find((n) => n.type === 'ai')!
    if (ai.type === 'ai') ai.data.config.prompt = 'Use {{secret.OPENAI_KEY}}'
    expect(validateWorkflow(w)).toContain("Summarise: AI steps can't use Vault secrets.")
  })

  it('only sends alerts to verified addresses', () => {
    const w = health()
    const a = w.nodes.find((n) => n.id === 'notify')!
    if (a.type === 'alert') a.data.config.email.recipients = ['someone@gmail.com']
    expect(validateWorkflow(w)).toContain("Page on-call: someone@gmail.com isn't verified.")
  })

  it('finds loops, unconnected steps and a missing trigger', () => {
    const w = health()
    w.edges.push({ id: 'loop', source: 'health', target: 'health', sourceHandle: 'out' })
    expect(validateWorkflow(w)).toContain('The workflow loops back on itself. Remove the connection that makes the loop.')

    const orphan = health()
    orphan.edges = orphan.edges.filter((e) => e.target !== 'unreachable')
    expect(validateWorkflow(orphan)).toContain("Server unreachable isn't connected to the trigger.")

    const noTrigger = health()
    noTrigger.nodes = noTrigger.nodes.filter((n) => n.type !== 'trigger')
    expect(validateWorkflow(noTrigger)).toContain('A workflow needs exactly one trigger.')
  })
})

describe('workflow changes', () => {
  it('creates, renames and deletes a workflow, keeping usage and the audit log in step', async () => {
    const created = await createWorkflow({ ...health(), name: 'Health check (staging)', tagId: 2 })
    expect(adminDb.organization.usage.workflows).toBe(7)
    expect(adminDb.auditLogs[0]).toMatchObject({ action: 'workflow.create', resourceName: 'Health check (staging)' })

    await expect(createWorkflow(health())).rejects.toThrow('A workflow called Server health check already exists.')
    await updateWorkflow(created.workflowId, { ...inputOf(created), name: 'Staging health' })
    expect((await getWorkflow(created.workflowId)).name).toBe('Staging health')

    await deleteWorkflow(created.workflowId)
    expect(adminDb.organization.usage.workflows).toBe(6)
  })

  it('refuses to save an invalid graph', async () => {
    const w = health()
    w.edges = []
    await expect(updateWorkflow(1, w)).rejects.toThrow("isn't connected to the trigger")
  })

  it('stops at the plan limit', async () => {
    adminDb.organization.limits.workflows = 6
    await expect(createWorkflow({ ...health(), name: 'One more' })).rejects.toThrow('Your plan allows 6 workflows')
  })
})

describe('runs', () => {
  it('runs the success path straight through when nothing needs approval', async () => {
    const run = await runWorkflow(2)
    expect(run.status).toBe('success')
    expect(run.steps.map((s) => s.label)).toEqual(['Read mail queue', 'To number', 'Over 500?', 'Mail queue alert'])
  })

  it('waits for approval, then finishes or stops on the decision', async () => {
    const run = await runWorkflow(5)
    expect(run.status).toBe('waiting_approval')
    expect(run.steps.map((s) => s.status)).toEqual(['waiting_approval', 'skipped']) // deploy waits behind the gate
    expect((await decideRunApproval(run.runId, true)).status).toBe('success')

    const again = await runWorkflow(5)
    const rejected = await decideRunApproval(again.runId, false)
    expect(rejected.status).toBe('rejected')
    expect(rejected.steps[0]).toMatchObject({ status: 'failed', error: 'Rejected by Neko Nik' })
  })

  it("won't run a disabled workflow", async () => {
    await expect(runWorkflow(6)).rejects.toThrow('TLS certificate expiry is disabled')
    await setWorkflowEnabled(6, true)
    expect((await runWorkflow(6)).status).toBe('success')
  })

  it('lists seeded run history newest first', async () => {
    const runs = await listWorkflowRuns(1)
    expect(runs.map((r) => r.status)).toEqual(['success', 'success', 'failed'])
    expect(runs[2]!.steps[0]!.error).toMatch(/timed out/)
  })
})
