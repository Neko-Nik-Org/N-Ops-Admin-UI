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
/** Tests for src/features/dashboard/api/dashboard.ts. */

import { describe, expect, it } from 'vitest'
import { getOverview } from '@/features/dashboard/api/dashboard'
import { api } from '../../../testUtils'

describe('getOverview', () => {
  it('maps GET /dashboard/overview to the camelCase DashboardOverview', async () => {
    api.get.mockResolvedValue({
      data: {
        servers_online: 1,
        servers_total: 2,
        updated_label: 'just now',
        pending_approvals_count: 1,
        pending_approvals_oldest_wait_minutes: 12,
        workflow_runs_24h: 40,
        workflow_runs_failed: 2,
        workflow_runs_waiting: 1,
        workflow_run_trend: [1, 2, 3],
        alerts_sent_24h: 5,
        alerts_latest_source: 'disk',
        alerts_latest_time: '10:00',
        fleet: [
          {
            server_id: 's1',
            server_name: 'web-1',
            kind: 'Ubuntu',
            tag_id: 3,
            tag_name: 'production',
            cpu_percent: 40,
            memory_percent: null,
            status: 'offline',
            offline_minutes: 7,
          },
        ],
        approvals: [{ approval_id: 'a1', code: 'R-1', title: 'Restart', detail: 'by arjun', expires_label: '1h' }],
      },
    })

    const overview = await getOverview()
    expect(api.get).toHaveBeenCalledWith('/dashboard/overview')
    expect(overview).toMatchObject({
      serversOnline: 1,
      serversTotal: 2,
      pendingApprovalsOldestWaitMinutes: 12,
      workflowRunTrend: [1, 2, 3],
      alertsLatestSource: 'disk',
    })
    expect(overview.fleet).toEqual([
      {
        id: 's1',
        name: 'web-1',
        kind: 'Ubuntu',
        tagId: 3,
        tagName: 'production',
        cpuPercent: 40,
        memoryPercent: null,
        status: 'offline',
        offlineMinutes: 7,
      },
    ])
    expect(overview.approvals).toEqual([{ id: 'a1', code: 'R-1', title: 'Restart', detail: 'by arjun', expiresLabel: '1h' }])
  })
})
