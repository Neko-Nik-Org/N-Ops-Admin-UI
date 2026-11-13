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

/** Pending approvals panel on the Overview dashboard. */

import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import type { PendingApproval } from '@/features/dashboard/types'
import { ROUTES } from '@/constants/routes'

/** Toast shown by the action buttons until approvals have a backend. */
const NOT_WIRED_MESSAGE = "Approvals aren't wired up yet — this is a preview of the layout."

/** Lists operations waiting for approval, with Approve / Open thread actions. */
export const ApprovalsPanel = ({ approvals }: { approvals: PendingApproval[] }) => (
  <div className="rounded-xl border border-border bg-surface-raised p-5">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-semibold text-text">Pending approvals</h2>
      <Link to={ROUTES.approvals} className="text-sm text-signal hover:text-signal-strong">
        View all
      </Link>
    </div>

    <div className="flex flex-col gap-4">
      {approvals.map((approval) => (
        <div key={approval.id} className="flex flex-col gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-mono text-text-muted">#{approval.code}</span>
            <span className="text-warning">{approval.expiresLabel}</span>
          </div>
          <p className="text-sm font-semibold text-text">{approval.title}</p>
          <p className="text-xs text-text-muted">{approval.detail}</p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => toast.info(NOT_WIRED_MESSAGE)}
              className="rounded-md bg-signal px-3 py-1.5 text-sm font-semibold text-ink hover:bg-signal-strong"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => toast.info(NOT_WIRED_MESSAGE)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:border-border-strong"
            >
              Open thread
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
)
