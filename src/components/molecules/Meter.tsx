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
/** Usage meter molecule: a labelled progress bar with "used / total". */

import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format'

/** Usage bar with "used / total" text. `format` controls how the numbers are shown (e.g. bytes). */
export const Meter = ({ label, used, total, format = formatNumber }: { label: string; used: number; total: number; format?: (n: number) => string }) => {
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-text-muted">{label}</span>
        <span className="text-text">
          {format(used)} <span className="text-text-muted">/ {format(total)}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink" role="meter" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full', percent > 85 ? 'bg-warning' : 'bg-signal')} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
