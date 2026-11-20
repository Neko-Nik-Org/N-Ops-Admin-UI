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
/** Tests for src/pages/workflows/StepDetails.tsx: the read-only settings of each kind of step. */

import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { RunStep, WorkflowNode } from '@/features/workflows/types'
import { resetWorkflowMock, workflowDb } from '@/mocks/workflowDb'
import { StepDetails } from '@/pages/workflows/StepDetails'
import { makeUser, renderWithProviders, serveLiveReads } from '../../testUtils'

beforeEach(() => {
  resetWorkflowMock()
  serveLiveReads()
})

/** A step from the sample workflows. */
const step = (workflowId: number, nodeId: string): WorkflowNode =>
  workflowDb.workflows.find((w) => w.workflowId === workflowId)!.nodes.find((n) => n.id === nodeId)!

const show = (node: WorkflowNode, runStep?: RunStep) =>
  renderWithProviders(<StepDetails step={node} runStep={runStep} />, { user: makeUser({ permissions: ['user:view'] }) })

/** The value next to a label in the settings list. */
const row = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling!

describe('StepDetails', () => {
  it.each([
    [1, 'trigger', 'Trigger', 'When', 'Every 10 seconds'],
    [3, 'trigger', 'Trigger', 'When', 'cpu.usage > 90% for 5 minutes'],
    [4, 'trigger', 'Trigger', 'Cron', '0 6 * * 1 (Asia/Kolkata)'],
    [5, 'trigger', 'Trigger', 'When', 'Run manually'],
    [1, 'unhealthy', 'If condition', 'Condition', 'status != "ok" OR checks.db.latency_ms > 500'],
    [1, 'notify', 'Alert', 'Next step', 'None: an alert is always the last step'],
    [2, 'count', 'Parser', 'Does', 'Convert to integer'],
    [3, 'fields', 'Parser', 'Does', 'host ← server.host'],
    [6, 'json', 'Parser', 'On error', 'Fail the step'],
    [3, 'summary', 'AI', 'Output', "Text. Vault secrets can't be used here."],
    [4, 'export', 'API call', 'Request', 'POST https://api.nops.app/audit/export'],
    [5, 'deploy', 'Ansible playbook', 'Playbook', 'playbooks/deploy-nginx.yml'],
  ])('workflow %i, step "%s": a %s showing %s', async (workflowId, nodeId, typeLabel, label, text) => {
    show(step(workflowId, nodeId))
    expect(screen.getByText(typeLabel)).toBeInTheDocument()
    expect(row(label)).toHaveTextContent(text)
  })

  it('names the servers of a remote command once they load, and its strategy and approval', async () => {
    show(step(1, 'health'))
    expect(row('Command')).toHaveTextContent('curl -fsS --max-time 3 http://localhost:8080/healthz')
    expect(row('Strategy')).toHaveTextContent('All at once')
    expect(row('Output')).toHaveTextContent('Captured as json')
    expect(await screen.findByText('web-01, web-02, web-03')).toBeInTheDocument()
  })

  it('names the tag a metric trigger watches', async () => {
    show(step(3, 'trigger'))
    expect(await screen.findByText('Every server tagged production')).toBeInTheDocument()
  })

  it('shows how the step went in the picked run', () => {
    show(step(1, 'health'), {
      nodeId: 'health',
      label: 'Check /healthz',
      status: 'failed',
      startedAt: '2026-11-20T10:00:00Z',
      durationMs: 3012,
      output: null,
      error: 'web-02: connection refused',
    })
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('3012 ms')).toBeInTheDocument()
    expect(screen.getByText('web-02: connection refused')).toBeInTheDocument()
  })
})
