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

/** One managed server row in the fleet table. */
/** Types for the Overview dashboard: fleet, pending approvals and summary stats. */

export interface FleetServer {
  id: string
  name: string
  kind: string
  tagId: number
  tagName: string
  /** Current CPU / memory use (0-100), or null when the server isn't reporting. */
  cpuPercent: number | null
  memoryPercent: number | null
  status: 'online' | 'offline'
  /** Minutes since the server went offline; null while online. */
  offlineMinutes: number | null
}

/** An operation waiting for someone to approve it. */
export interface PendingApproval {
  id: string
  code: string
  title: string
  /** Pre-formatted, e.g. "Raised by arjun for production". */
  detail: string
  expiresLabel: string
}

/** Everything the Overview page shows. `*Label` fields arrive pre-formatted for display. */
export interface DashboardOverview {
  serversOnline: number
  serversTotal: number
  updatedLabel: string
  pendingApprovalsCount: number
  pendingApprovalsOldestWaitMinutes: number
  workflowRuns24h: number
  workflowRunsFailed: number
  workflowRunsWaiting: number
  workflowRunTrend: number[]
  alertsSent24h: number
  alertsLatestSource: string
  alertsLatestTime: string
  fleet: FleetServer[]
  approvals: PendingApproval[]
}
