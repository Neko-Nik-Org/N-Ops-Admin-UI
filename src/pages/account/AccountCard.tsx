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

/** Card frame shared by the Account pages (Profile, Security, Devices, Organization): icon, title, optional note and buttons. */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface AccountCardProps {
  icon: ReactNode
  title: string
  /** Short line under the title. */
  description?: ReactNode
  /** Buttons at the right of the title row. */
  actions?: ReactNode
  /** Grid placement (e.g. `lg:col-span-2`). */
  className?: string
  children: ReactNode
}

export const AccountCard = ({ icon, title, description, actions, className, children }: AccountCardProps) => (
  <section className={cn('flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5', className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-signal/10 text-signal" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-text">{title}</h2>
          {description && <p className="text-sm text-text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children}
  </section>
)
