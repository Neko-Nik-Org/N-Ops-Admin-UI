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
/** Shows a diff between two texts, with +/- gutters and a change count. */

import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { diffLines } from '@/utils/diff'

/** Unified diff view of `before` → `after`. */
export const DiffView = ({
  before,
  after,
  beforeLabel,
  afterLabel,
}: {
  before: string
  after: string
  beforeLabel: string
  afterLabel: string
}) => {
  const lines = useMemo(() => diffLines(before, after), [before, after])
  const added = lines.filter((l) => l.kind === 'add').length
  const removed = lines.filter((l) => l.kind === 'remove').length

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-ink px-3 py-2 text-xs text-text-muted">
        <span>
          {beforeLabel} → {afterLabel}
        </span>
        <span>
          <span className="text-signal">+{added}</span> <span className="text-danger">−{removed}</span>
        </span>
      </div>
      {added + removed === 0 ? (
        <p className="p-4 text-sm text-text-muted">These versions are identical.</p>
      ) : (
        <pre className="max-h-96 overflow-auto py-2 font-mono text-xs leading-5">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                'flex px-3',
                line.kind === 'add' && 'bg-signal/10 text-signal',
                line.kind === 'remove' && 'bg-danger/10 text-danger',
              )}
            >
              <span className="w-4 shrink-0 select-none" aria-hidden="true">
                {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}
              </span>
              <span className="sr-only">{line.kind === 'add' ? 'Added: ' : line.kind === 'remove' ? 'Removed: ' : ''}</span>
              <span className={cn('whitespace-pre', line.kind === 'same' && 'text-text-muted')}>{line.text || ' '}</span>
            </div>
          ))}
        </pre>
      )}
    </div>
  )
}
