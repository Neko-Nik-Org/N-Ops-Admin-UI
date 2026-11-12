import { Link } from 'react-router-dom'
import type { FleetServer } from '@/features/dashboard/types'
import { cn } from '@/utils/cn'

const Bar = ({ percent }: { percent: number | null }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink">
      {percent !== null && (
        <div
          className={cn('h-full rounded-full', percent > 85 ? 'bg-warning' : 'bg-signal')}
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
    <span className="text-sm text-text">{percent !== null ? `${percent}%` : 'No data'}</span>
  </div>
)

export const FleetTable = ({ servers, total }: { servers: FleetServer[]; total: number }) => (
  <div className="rounded-xl border border-border bg-surface-raised p-5">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-semibold text-text">
        Fleet <span className="ml-1 text-sm font-normal text-text-muted">{servers.length} of {total} servers</span>
      </h2>
      <Link to="/servers" className="text-sm text-signal hover:text-signal-strong">
        View all servers
      </Link>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="text-xs tracking-wide text-text-muted uppercase">
            <th className="pb-2 font-medium">Server</th>
            <th className="pb-2 font-medium">Tag</th>
            <th className="pb-2 font-medium">CPU</th>
            <th className="pb-2 font-medium">Memory</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((server) => (
            <tr key={server.id} className="border-t border-border">
              <td className="py-3">
                <p className="font-medium text-text">{server.name}</p>
                <p className="text-xs text-text-muted">{server.kind}</p>
              </td>
              <td className="py-3">
                <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-xs text-accent-secondary">{server.tagName}</span>
              </td>
              <td className="py-3">
                <Bar percent={server.cpuPercent} />
              </td>
              <td className="py-3">
                <Bar percent={server.memoryPercent} />
              </td>
              <td className="py-3">
                <span
                  className={cn('flex items-center gap-1.5 text-sm', server.status === 'online' ? 'text-signal' : 'text-danger')}
                >
                  <span className={cn('size-1.5 rounded-full', server.status === 'online' ? 'bg-signal' : 'bg-danger')} />
                  {server.status === 'online' ? 'Online' : `Offline, ${server.offlineMinutes ?? 0} min`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)
