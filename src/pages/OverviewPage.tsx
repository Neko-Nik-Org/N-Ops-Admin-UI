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

/** Overview dashboard (/): fleet status, pending approvals and workflow activity. */

import { DashboardSkeleton } from '@/components/molecules/Skeleton'
import { ApprovalsPanel } from '@/components/organisms/ApprovalsPanel'
import { FleetTable } from '@/components/organisms/FleetTable'
import { OverviewStats } from '@/components/organisms/OverviewStats'
import { useOverview } from '@/features/dashboard/hooks/useOverview'
import { useSelectedTag } from '@/features/tags/hooks/useTags'

/** Shown instead of the stats while the dashboard endpoint is not available on the API. */
const NotConnected = () => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-raised p-10 text-center">
    <h2 className="font-semibold text-text">Live fleet data isn't connected yet</h2>
    <p className="max-w-md text-sm text-text-muted">
      N-Ops-Main-API has no servers, approvals, workflow-run or alert backend yet — this page is the real layout, wired to a
      guessed <code className="font-mono text-xs">GET /dashboard/overview</code> endpoint, ready to show real data once that
      lands.
    </p>
  </div>
)

/** Dashboard home page, scoped to the tag picked in the Topbar. */
export const OverviewPage = () => {
  const { data: overview, isLoading, isError } = useOverview()
  const { selectedTag } = useSelectedTag()

  if (isLoading) return <DashboardSkeleton />

  /** Servers for the selected tag, or all of them when "All tags" is selected. */
  const filteredFleet = overview && selectedTag ? overview.fleet.filter((s) => s.tagId === selectedTag.tagId) : overview?.fleet

  return (
    <div className="flex flex-col gap-6">
      {/* the sidebar shows which page is open; the heading is for screen readers */}
      <h1 className="sr-only">Overview</h1>

      {isError || !overview ? (
        <NotConnected />
      ) : (
        <>
          <OverviewStats overview={overview} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <FleetTable servers={filteredFleet ?? []} total={overview.serversTotal} />
            </div>
            <ApprovalsPanel approvals={overview.approvals} />
          </div>
        </>
      )}
    </div>
  )
}
