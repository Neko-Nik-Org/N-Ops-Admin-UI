import { Bell, CheckCircle2, Server, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { DashboardOverview } from '@/features/dashboard/types'
import { cn } from '@/utils/cn'

const Tile = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5">{children}</div>
)

const TileHeader = ({ icon: Icon, label }: { icon: typeof Server; label: string }) => (
  <div className="flex items-center gap-2 text-sm text-text-muted">
    <Icon size={15} />
    {label}
  </div>
)

export const OverviewStats = ({ overview }: { overview: DashboardOverview }) => {
  const offlineCount = overview.fleet.filter((s) => s.status === 'offline')
  const trendMax = Math.max(1, ...overview.workflowRunTrend)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Tile>
        <TileHeader icon={Server} label="Servers online" />
        <p className="text-3xl font-bold text-text">
          {overview.serversOnline} <span className="text-lg font-normal text-text-muted">/ {overview.serversTotal}</span>
        </p>
        <div className="flex gap-0.5">
          {Array.from({ length: overview.serversTotal }, (_, i) => (
            <span key={i} className={cn('h-2 flex-1 rounded-sm', i < overview.serversOnline ? 'bg-signal' : 'bg-danger')} />
          ))}
        </div>
        {offlineCount.length > 0 && (
          <p className="text-xs text-danger">{offlineCount.map((s) => s.name).join(' and ')} are offline</p>
        )}
      </Tile>

      <Tile>
        <TileHeader icon={CheckCircle2} label="Pending approvals" />
        <p className="text-3xl font-bold text-warning">{overview.pendingApprovalsCount}</p>
        <p className="text-xs text-text-muted">The oldest has waited {overview.pendingApprovalsOldestWaitMinutes} minutes</p>
        <Link to="/approvals" className="w-fit text-xs text-signal hover:text-signal-strong">
          Review approvals
        </Link>
      </Tile>

      <Tile>
        <TileHeader icon={Workflow} label="Workflow runs, last 24 h" />
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-bold text-text">{overview.workflowRuns24h.toLocaleString()}</p>
          <div className="flex h-7 flex-1 items-end gap-0.5">
            {overview.workflowRunTrend.map((v, i) => (
              <span key={i} className="flex-1 rounded-sm bg-signal" style={{ height: `${(v / trendMax) * 100}%` }} />
            ))}
          </div>
        </div>
        <p className="text-xs text-danger">
          {overview.workflowRunsFailed} failed, {overview.workflowRunsWaiting} waiting for approval
        </p>
      </Tile>

      <Tile>
        <TileHeader icon={Bell} label="Alerts sent, last 24 h" />
        <p className="text-3xl font-bold text-text">{overview.alertsSent24h}</p>
        <p className="text-xs text-text-muted">
          Latest from <span className="rounded bg-ink px-1 py-0.5 font-mono text-text">{overview.alertsLatestSource}</span> at{' '}
          {overview.alertsLatestTime}
        </p>
      </Tile>
    </div>
  )
}
