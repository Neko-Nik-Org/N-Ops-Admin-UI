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
/** Small status pill atom. */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/** Color of a Badge. */
export type BadgeTone = 'neutral' | 'signal' | 'accent' | 'warning' | 'danger'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink text-text-muted',
  signal: 'bg-signal/15 text-signal',
  accent: 'bg-accent-secondary/15 text-accent-secondary',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
}

/** A rounded label for statuses and short facts; `mono` for ids and tag names. */
export const Badge = ({ tone = 'neutral', mono, children, className }: { tone?: BadgeTone; mono?: boolean; children: ReactNode; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs whitespace-nowrap',
      mono ? 'font-mono' : 'font-medium',
      TONES[tone],
      className,
    )}
  >
    {children}
  </span>
)
