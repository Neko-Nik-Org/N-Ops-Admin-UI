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
/** Page title row used by the dashboard pages. */

import { FlaskConical } from 'lucide-react'
import type { ReactNode } from 'react'

/** Props for PageHeader. */
interface PageHeaderProps {
  title: string
  description?: ReactNode
  /** Buttons on the right. */
  actions?: ReactNode
  /** Shows a "Mock data" badge: the page runs on sample data until its API exists. */
  mock?: boolean
}

/** Title, description and actions, wrapping on small screens. */
export const PageHeader = ({ title, description, actions, mock }: PageHeaderProps) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        {mock && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
            title="The API for this page isn't built yet. Changes are kept until you reload."
          >
            <FlaskConical size={12} aria-hidden="true" />
            Mock data
          </span>
        )}
      </div>
      {description && <p className="text-sm text-text-muted">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
)
