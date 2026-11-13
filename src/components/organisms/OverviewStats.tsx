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

/** Summary stat tiles at the top of the Overview dashboard. */

import { Bell, CheckCircle2, Server, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer } from 'recharts'
import type { DashboardOverview } from '@/features/dashboard/types'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'

/** Card wrapper for one stat. */
const Tile = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5">{children}</div>
)

/** Icon and label row at the top of a tile. */
const TileHeader = ({ icon: Icon, label }: { icon: typeof Server; label: string }) => (
  <div className="flex items-center gap-2 text-sm text-text-muted">
    <Icon size={15} />
    {label}
  </div>
)

/** Four tiles: servers online, pending approvals, workflow runs (with a 24h trend) and alerts. */
export const OverviewStats = ({ overview }: { overview: DashboardOverview }) => {
  const offlineCount = overview.fleet.filter((s) => s.status === 'offline')
  /** Recharts wants one object per bar. */
  const trendData = overview.workflowRunTrend.map((runs, i) => ({ i, runs }))

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
        <Link to={ROUTES.approvals} className="w-fit text-xs text-signal hover:text-signal-strong">
          Review approvals
        </Link>
      </Tile>

      <Tile>
        <TileHeader icon={Workflow} label="Workflow runs, last 24 h" />
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-bold text-text">{overview.workflowRuns24h.toLocaleString()}</p>
          {/* Sparkline of runs over the last 24 h; bars take the text color (signal) via currentColor */}
          <div className="h-7 min-w-0 flex-1 text-signal" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap={1}>
                <Bar dataKey="runs" fill="currentColor" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
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
