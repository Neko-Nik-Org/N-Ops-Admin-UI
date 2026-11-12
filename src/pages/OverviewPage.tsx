import { useState } from 'react'
import { DashboardSkeleton } from '@/components/loading'
import { ApprovalsPanel } from '@/components/organisms/ApprovalsPanel'
import { FleetTable } from '@/components/organisms/FleetTable'
import { OverviewStats } from '@/components/organisms/OverviewStats'
import { useOverview } from '@/features/dashboard/hooks/useOverview'
import { useTags } from '@/features/tags/hooks/useTags'
import { cn } from '@/utils/cn'

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

export const OverviewPage = () => {
  const { data: overview, isLoading, isError } = useOverview()
  const { data: tags } = useTags()
  const [activeTagId, setActiveTagId] = useState<number | null>(null)

  if (isLoading) return <DashboardSkeleton />

  const filteredFleet = overview && activeTagId !== null ? overview.fleet.filter((s) => s.tagId === activeTagId) : overview?.fleet

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Overview</h1>
          <p className="text-sm text-text-muted">
            {overview
              ? `${overview.serversTotal} servers across ${new Set(overview.fleet.map((s) => s.tagId)).size} tags, updated ${overview.updatedLabel}`
              : 'Fleet, approvals and workflow activity, all in one place.'}
          </p>
        </div>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTagId(null)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm',
                activeTagId === null ? 'border-text bg-text text-ink' : 'border-border text-text-muted hover:border-border-strong',
              )}
            >
              All tags
            </button>
            {tags.map((tag) => (
              <button
                key={tag.tagId}
                type="button"
                onClick={() => setActiveTagId(tag.tagId)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm',
                  activeTagId === tag.tagId
                    ? 'border-text bg-text text-ink'
                    : 'border-border text-text-muted hover:border-border-strong',
                )}
              >
                {tag.tagName}
              </button>
            ))}
          </div>
        )}
      </div>

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
