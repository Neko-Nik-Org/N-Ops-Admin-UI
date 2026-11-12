export interface FleetServer {
  id: string
  name: string
  kind: string
  tagId: number
  tagName: string
  cpuPercent: number | null
  memoryPercent: number | null
  status: 'online' | 'offline'
  offlineMinutes: number | null
}

export interface PendingApproval {
  id: string
  code: string
  title: string
  /** Pre-formatted, e.g. "Raised by arjun for production". */
  detail: string
  expiresLabel: string
}

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
