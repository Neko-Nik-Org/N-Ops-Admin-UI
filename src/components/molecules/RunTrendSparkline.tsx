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

/**
 * Tiny bar chart of workflow runs over the last 24 h, used in the Overview stat tiles. Plain SVG:
 * it stretches to its box and the bars take the surrounding text color (currentColor).
 */

/** Gap between bars, as a share of each bar's slot. */
const GAP = 0.15

export const RunTrendSparkline = ({ runs }: { runs: number[] }) => {
  const max = Math.max(1, ...runs)
  const slot = 100 / Math.max(1, runs.length)
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="block size-full" aria-hidden="true">
      {runs.map((value, i) => {
        const height = (value / max) * 100
        return (
          <rect
            key={i}
            x={i * slot + (slot * GAP) / 2}
            y={100 - height}
            width={slot * (1 - GAP)}
            height={height}
            rx={Math.min(2, slot / 4)}
            fill="currentColor"
          />
        )
      })}
    </svg>
  )
}
