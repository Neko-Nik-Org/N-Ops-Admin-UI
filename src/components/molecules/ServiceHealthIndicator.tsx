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
/** Small "is the API healthy?" indicator for the login page, backed by `GET /health/service`. */

import { useServiceHealth } from '@/features/system/hooks/useServiceHealth'
import { cn } from '@/utils/cn'
import { fromNow } from '@/utils/format'

/**
 * A coloured dot plus a short label: green when Postgres and Redis are up, red with the API's
 * reason when not, grey while the first check runs. Re-checks every minute.
 * `compact` shows just the dot; the full text stays in the tooltip.
 */
export const ServiceHealthIndicator = ({ compact = false }: { compact?: boolean }) => {
  const { data, isPending } = useServiceHealth()
  const up = data?.status === 'up'
  const label = isPending ? 'Checking services' : up ? 'All systems normal' : 'Service problem'
  const detail = data ? `${data.message} Checked ${fromNow(new Date(data.checkedAt))}.` : 'Checking N-Ops services…'

  return (
    <div
      role="status"
      aria-label={`API status: ${label}`}
      title={detail}
      className={cn('flex items-center gap-2 text-xs', up || isPending ? 'text-text-muted' : 'text-danger')}
    >
      <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
        {/* pulses a few times when the status loads, then stays still: a forever-looping ping keeps the CPU busy */}
        {up && (
          <span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-40 [animation-iteration-count:3] motion-reduce:hidden" />
        )}
        <span className={cn('relative size-2.5 rounded-full', isPending ? 'bg-text-muted' : up ? 'bg-signal' : 'bg-danger')} />
      </span>
      {!compact && (
        <span className="min-w-0 truncate">
          {label}
          {!isPending && !up && data && <span className="text-text-muted"> · {data.message}</span>}
        </span>
      )}
    </div>
  )
}
