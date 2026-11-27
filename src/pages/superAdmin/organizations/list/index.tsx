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
 * Super admin › Organizations (/super-admin): every organization with its plan and usage. New and
 * Edit open their own pages; `?search=` pre-fills the search (a newly created organization lands here).
 */

import { Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/Badge'
import { Select } from '@/components/Select'
import { LoadingButton } from '@/components/LoadingButton'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { TableSkeleton } from '@/components/Skeleton'
import { ROUTES, superAdminOrganizationEditPath, superAdminOrganizationPath } from '@/constants/routes'
import { useOrganizations } from '@/hooks/useOrganizations'
import { formatBytes, formatDate, formatNumber } from '@/utils/format'
import type { Organization } from '@/types/organization'
import { DeleteOrganizationDialog, InviteAdminDialog } from '@/pages/superAdmin/organizations/OrganizationDialogs'

type RowAction = 'invite' | 'delete'

/** "used / total" with a thin bar; warning color past 85 %. */
const Usage = ({ used, total, format = formatNumber }: { used: number; total: number; format?: (n: number) => string }) => {
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <div className="flex min-w-28 flex-col gap-1">
      <span className="text-xs text-text">
        {format(used)} <span className="text-text-muted">/ {format(total)}</span>
      </span>
      <span className="h-1 overflow-hidden rounded-full bg-ink" aria-hidden="true">
        <span
          className={`block h-full rounded-full ${percent > 85 ? 'bg-warning' : 'bg-signal'}`}
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  )
}

export const OrganizationsPage = () => {
  const { data: orgs, isLoading, error } = useOrganizations()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [status, setStatus] = useState('all')
  const [action, setAction] = useState<{ kind: RowAction; org: Organization } | null>(null)
  const close = () => setAction(null)
  const orgFor = (kind: RowAction) => (action?.kind === kind ? action.org : null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (orgs ?? []).filter(
      (o) =>
        (!q || `${o.organizationName} ${o.organizationId}`.toLowerCase().includes(q)) &&
        (status === 'all' || (status === 'active') === o.isActive),
    )
  }, [orgs, search, status])

  return (
    <>
      <PageHeader
        title="Organizations"
        badge={orgs && <span className="text-sm text-text-muted">{formatNumber(orgs.length)}</span>}
        actions={
          <LoadingButton icon={<Plus size={15} />} onClick={() => navigate(ROUTES.superAdminOrganizationNew)}>
            New organization
          </LoadingButton>
        }
      />
      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : error ? (
        <p className="text-sm text-text-muted">Couldn't load organizations: {error.message}</p>
      ) : (
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name or id" className="min-w-56 flex-1" />
            <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-36">
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Disabled</option>
            </Select>
          </div>
          {!visible.length ? (
            <p className="py-10 text-center text-sm text-text-muted">
              {orgs?.length ? 'No organizations match.' : 'No organizations yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] border-collapse text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-text-muted uppercase">
                    <th className="pb-2 font-medium">Organization</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Users</th>
                    <th className="pb-2 font-medium">Servers</th>
                    <th className="pb-2 font-medium">Workflows</th>
                    <th className="pb-2 font-medium">Storage</th>
                    <th className="pb-2 font-medium">AI credit</th>
                    <th className="pb-2 font-medium">Created</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => {
                    const open = () => navigate(superAdminOrganizationPath(o.organizationId))
                    return (
                      <tr
                        key={o.organizationId}
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => e.key === 'Enter' && open()}
                        className="cursor-pointer border-t border-border outline-none hover:bg-ink/50 focus-visible:ring-1 focus-visible:ring-signal focus-visible:ring-inset"
                      >
                        <td className="py-3 pl-2">
                          <p className="text-sm font-medium text-text">{o.organizationName}</p>
                          <p className="font-mono text-[0.6875rem] text-text-muted">{o.organizationId}</p>
                        </td>
                        <td className="py-3">
                          <Badge tone={o.isActive ? 'signal' : 'neutral'}>{o.isActive ? 'Active' : 'Disabled'}</Badge>
                        </td>
                        <td className="py-3 text-sm text-text">{formatNumber(o.userLimit)}</td>
                        <td className="py-3 text-sm text-text">{formatNumber(o.serverLimit)}</td>
                        <td className="py-3 text-sm text-text">{formatNumber(o.workflowLimit)}</td>
                        <td className="py-3">
                          <Usage used={o.storageBytes.used} total={o.storageBytes.allocated} format={formatBytes} />
                        </td>
                        <td className="py-3">
                          <Usage used={o.aiCredit.used} total={o.aiCredit.allocated} />
                        </td>
                        <td className="py-3 text-sm text-text-muted">{formatDate(o.createdAt)}</td>
                        {/* the buttons act on their own; a click or Enter there doesn't open the organization */}
                        <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Send size={14} />}
                              aria-label={`Invite an admin to ${o.organizationName}`}
                              title="Invite admin"
                              onClick={() => setAction({ kind: 'invite', org: o })}
                            />
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Pencil size={14} />}
                              aria-label={`Edit ${o.organizationName}`}
                              title="Edit"
                              onClick={() => navigate(superAdminOrganizationEditPath(o.organizationId))}
                            />
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={14} />}
                              aria-label={`Delete ${o.organizationName}`}
                              title="Delete"
                              onClick={() => setAction({ kind: 'delete', org: o })}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <InviteAdminDialog org={orgFor('invite')} onClose={close} />
      <DeleteOrganizationDialog org={orgFor('delete')} onClose={close} onDeleted={close} />
    </>
  )
}
