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
/** Tests for src/pages/OverviewPage.tsx (with OverviewStats, FleetTable and ApprovalsPanel). */

import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OverviewPage } from '@/pages/OverviewPage'
import { api, makeUser, renderWithProviders } from '../testUtils'

const server = (id: string, name: string, tagId: number, tagName: string, online = true) => ({
  server_id: id,
  server_name: name,
  kind: 'Ubuntu 24.04',
  tag_id: tagId,
  tag_name: tagName,
  cpu_percent: online ? 42 : null,
  memory_percent: online ? 90 : null,
  status: online ? 'online' : 'offline',
  offline_minutes: online ? null : 12,
})

const overview = {
  servers_online: 1,
  servers_total: 2,
  updated_label: 'just now',
  pending_approvals_count: 3,
  pending_approvals_oldest_wait_minutes: 17,
  workflow_runs_24h: 1234,
  workflow_runs_failed: 2,
  workflow_runs_waiting: 1,
  workflow_run_trend: [1, 4, 2],
  alerts_sent_24h: 9,
  alerts_latest_source: 'disk-check',
  alerts_latest_time: '10:42',
  fleet: [server('s1', 'web-1', 1, 'production'), server('s2', 'db-1', 2, 'staging', false)],
  approvals: [{ approval_id: 'a1', code: 'R-7', title: 'Restart nginx', detail: 'Raised by arjun', expires_label: 'Expires in 1h' }],
}

const tags = [
  { tag_id: 1, organization_id: 'o', tag_name: 'production', tag_description: '' },
  { tag_id: 2, organization_id: 'o', tag_name: 'staging', tag_description: '' },
]

/** Routes the mocked GETs: the dashboard endpoint either answers or fails; tags always load. */
const mockApi = (dashboard: 'ok' | 'missing') =>
  api.get.mockImplementation(async (url: string) => {
    if (url === '/tag/list') return { data: tags }
    if (dashboard === 'missing') throw new Error('Not Found')
    return { data: overview }
  })

const renderOverview = () => renderWithProviders(<OverviewPage />, { route: '/', user: makeUser() })

describe('OverviewPage', () => {
  it('says so honestly when the dashboard backend is missing', async () => {
    mockApi('missing')
    renderOverview()
    expect(await screen.findByText("Live fleet data isn't connected yet")).toBeInTheDocument()
    expect(screen.queryByText('Servers online')).not.toBeInTheDocument()
  })

  it('shows the stats, fleet and approvals', async () => {
    mockApi('ok')
    renderOverview()

    expect(await screen.findByText('2 servers across 2 tags, updated just now')).toBeInTheDocument()
    expect(screen.getByText('Servers online')).toBeInTheDocument()
    expect(screen.getByText('db-1 are offline')).toBeInTheDocument()
    expect(screen.getByText('The oldest has waited 17 minutes')).toBeInTheDocument()
    expect(screen.getByText('2 failed, 1 waiting for approval')).toBeInTheDocument()
    expect(screen.getByText('disk-check')).toBeInTheDocument()

    expect(screen.getByText('2 of 2 servers')).toBeInTheDocument()
    expect(screen.getByText('Offline, 12 min')).toBeInTheDocument()
    expect(screen.getAllByText('No data')).toHaveLength(2)

    expect(screen.getByText('Restart nginx')).toBeInTheDocument()
    expect(screen.getByText('#R-7')).toBeInTheDocument()
  })

  it('filters the fleet by tag', async () => {
    mockApi('ok')
    renderOverview()
    await screen.findByText('2 of 2 servers')

    const pills = screen.getByRole('button', { name: 'All tags' }).parentElement as HTMLElement
    fireEvent.click(within(pills).getByRole('button', { name: 'staging' }))
    expect(screen.getByText('1 of 2 servers')).toBeInTheDocument()
    expect(screen.queryByText('web-1')).not.toBeInTheDocument()
    expect(screen.getByText('db-1', { selector: 'p' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'All tags' }))
    expect(screen.getByText('2 of 2 servers')).toBeInTheDocument()
  })

  it('shows a "not wired up" notice for approval actions', async () => {
    mockApi('ok')
    renderOverview()
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }))
    expect(await screen.findByText(/Approvals aren't wired up yet/)).toBeInTheDocument()
  })
})
