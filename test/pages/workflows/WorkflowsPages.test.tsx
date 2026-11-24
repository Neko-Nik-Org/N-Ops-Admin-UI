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

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetAdminMock } from '@/data/mockAdmin'
import { resetWorkflowMock, workflowDb } from '@/data/mockWorkflows'
import { WorkflowDetailPage } from '@/pages/workflows/details'
import { WorkflowsPage } from '@/pages/workflows/list'
import { renderWithProviders, serveLiveReads } from '../../testUtils'

beforeEach(() => {
  resetAdminMock()
  resetWorkflowMock()
  serveLiveReads()
})

const openDetail = (id: number) =>
  renderWithProviders(<WorkflowDetailPage />, { route: `/workflows/${id}`, path: '/workflows/:workflowId' })
const runs = () => screen.getByRole('list', { name: 'Runs' })

describe('Workflows list', () => {
  it('lists the workflows with trigger, last run and enabled state, and opens one on click', async () => {
    renderWithProviders(<WorkflowsPage />, { route: '/workflows' })
    const row = (await screen.findByText('Mail queue watch')).closest('tr')!
    expect(within(row).getByText('Every 1 minute')).toBeInTheDocument()
    expect(within(row).getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(7) // header + 6
    expect(screen.getByRole('switch', { name: 'Enable TLS certificate expiry' })).not.toBeChecked()

    fireEvent.click(row)
    expect(screen.getByTestId('location')).toHaveTextContent('/workflows/2')
  })

  it('enables a workflow from its row without opening it', async () => {
    renderWithProviders(<WorkflowsPage />, { route: '/workflows' })
    fireEvent.click(await screen.findByRole('switch', { name: 'Enable TLS certificate expiry' }))
    await waitFor(() => expect(workflowDb.workflows[5]!.enabled).toBe(true))
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
  })

  it('filters with the search box', async () => {
    renderWithProviders(<WorkflowsPage />, { route: '/workflows' })
    await screen.findByText('Mail queue watch')
    fireEvent.change(screen.getByPlaceholderText('Search workflows'), { target: { value: 'nginx' } })
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })
})

describe('Workflow detail', () => {
  it('shows the run history and the steps of the latest run', async () => {
    openDetail(1)
    expect(await screen.findByRole('heading', { name: 'Server health check' })).toBeInTheDocument()
    expect(within(runs()).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    expect(within(runs()).getByRole('button', { name: /Run #1/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(runs()).getByText('Check /healthz')).toBeInTheDocument()
  })

  it('approves a run that is waiting', async () => {
    openDetail(5)
    expect(
      await within(await screen.findByRole('list', { name: 'Runs' })).findByText(/is waiting for an admin's approval/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(await screen.findByText('Approved. The run carried on.')).toBeInTheDocument()
    expect(workflowDb.runs.find((r) => r.runId === 9)!.status).toBe('success')
  })

  it('runs a workflow now and can only run it when enabled', async () => {
    openDetail(6)
    const runNow = await screen.findByRole('button', { name: 'Run now' })
    expect(runNow).toBeDisabled()
    fireEvent.click(screen.getByRole('switch', { name: 'Disabled' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run now' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Run now' }))
    expect(await screen.findByText('Run finished.')).toBeInTheDocument()
    expect(await within(runs()).findByRole('button', { name: /Run #10/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says so when the workflow does not exist', async () => {
    openDetail(99)
    expect(await screen.findByText("This workflow doesn't exist. It may have been deleted.")).toBeInTheDocument()
  })
})
