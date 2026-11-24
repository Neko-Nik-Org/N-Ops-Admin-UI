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
 * The top row of a page about one item (a detail or form page): the path on the left, and the page's
 * buttons followed by Back on the right, all on one line. Use it on every such page so they look alike.
 */

import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useGoBack } from '@/hooks/useGoBack'

/** One step of the path; the last one is the current page and isn't a link. */
export interface Crumb {
  label: string
  to?: string
}

/**
 * Back: returns to the page the user came from inside the app, or to `to` when the page was opened
 * directly. A real link to `to`, so it can still be opened in a new tab.
 */
const BackLink = ({ to }: { to: string }) => {
  const goBack = useGoBack(to)
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        goBack()
      }}
      className="n-btn n-btn--secondary n-btn--sm"
    >
      <span className="n-btn__label">
        <ArrowLeft size={15} aria-hidden="true" />
        Back
      </span>
    </Link>
  )
}

export const PageToolbar = ({
  crumbs,
  actions,
  back,
}: {
  crumbs: readonly Crumb[]
  /** The page's buttons (use size="sm"), shown before Back. */
  actions?: ReactNode
  /** Where Back goes when the page was opened directly; omit for no Back button. */
  back?: string
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <nav aria-label="Path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-text-muted">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={`${i}-${c.label}`} className="flex min-w-0 items-center gap-1">
            {last || !c.to ? (
              <span aria-current={last ? 'page' : undefined} className={last ? 'truncate text-text' : 'truncate'}>
                {c.label}
              </span>
            ) : (
              <Link to={c.to} className="truncate hover:text-text">
                {c.label}
              </Link>
            )}
            {!last && <ChevronRight size={14} aria-hidden="true" className="shrink-0" />}
          </span>
        )
      })}
    </nav>
    {(actions || back) && (
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {back && <BackLink to={back} />}
      </div>
    )}
  </div>
)
