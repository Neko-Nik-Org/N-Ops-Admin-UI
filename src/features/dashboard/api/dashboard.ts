import { apiClient } from '@/lib/axios'
import type { DashboardOverview } from '../types'

/**
 * There's no fleet/approvals/workflow/alert backend on N-Ops-Main-API yet — no tables or routes for
 * any of it. This guesses a single aggregate `GET /dashboard/overview` and maps its (assumed
 * snake_case) response into this app's domain shape; adjust once the real endpoint lands.
 */

interface RawFleetServer {
  server_id: string
  server_name: string
  kind: string
  tag_id: number
  tag_name: string
  cpu_percent: number | null
  memory_percent: number | null
  status: 'online' | 'offline'
  offline_minutes: number | null
}

interface RawApproval {
  approval_id: string
  code: string
  title: string
  detail: string
  expires_label: string
}

interface RawOverview {
  servers_online: number
  servers_total: number
  updated_label: string
  pending_approvals_count: number
  pending_approvals_oldest_wait_minutes: number
  workflow_runs_24h: number
  workflow_runs_failed: number
  workflow_runs_waiting: number
  workflow_run_trend: number[]
  alerts_sent_24h: number
  alerts_latest_source: string
  alerts_latest_time: string
  fleet: RawFleetServer[]
  approvals: RawApproval[]
}

export const getOverview = async (): Promise<DashboardOverview> => {
  const { data } = await apiClient.get<RawOverview>('/dashboard/overview')
  return {
    serversOnline: data.servers_online,
    serversTotal: data.servers_total,
    updatedLabel: data.updated_label,
    pendingApprovalsCount: data.pending_approvals_count,
    pendingApprovalsOldestWaitMinutes: data.pending_approvals_oldest_wait_minutes,
    workflowRuns24h: data.workflow_runs_24h,
    workflowRunsFailed: data.workflow_runs_failed,
    workflowRunsWaiting: data.workflow_runs_waiting,
    workflowRunTrend: data.workflow_run_trend,
    alertsSent24h: data.alerts_sent_24h,
    alertsLatestSource: data.alerts_latest_source,
    alertsLatestTime: data.alerts_latest_time,
    fleet: data.fleet.map((s) => ({
      id: s.server_id,
      name: s.server_name,
      kind: s.kind,
      tagId: s.tag_id,
      tagName: s.tag_name,
      cpuPercent: s.cpu_percent,
      memoryPercent: s.memory_percent,
      status: s.status,
      offlineMinutes: s.offline_minutes,
    })),
    approvals: data.approvals.map((a) => ({
      id: a.approval_id,
      code: a.code,
      title: a.title,
      detail: a.detail,
      expiresLabel: a.expires_label,
    })),
  }
}
