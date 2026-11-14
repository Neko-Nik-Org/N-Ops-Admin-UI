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
/** Admin › Users (/admin/users): list, search, add, edit and remove people in the organization. */

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Select } from '@/components/atoms/Select'
import { LoadingButton, TableSkeleton } from '@/components/loading'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { UserFormDialog } from '@/components/organisms/UserFormDialog'
import { useAdminUsers, useDeleteUser, useOrganization, useRoles } from '@/features/admin/hooks/useAdmin'
import type { AdminUser } from '@/features/admin/types'
import { formatRelative } from '@/utils/format'

/** Which dialog is open, and for which user. */
type DialogState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; user: AdminUser } | { kind: 'delete'; user: AdminUser }

/** Initials for the avatar, e.g. "Priya Rao" → "PR". */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

/** Which second factors the user has set up. */
const TwoFactor = ({ user }: { user: AdminUser }) => {
  const methods = [user.hasTotp2fa && 'App', user.hasEmail2fa && 'Email'].filter(Boolean)
  return methods.length ? <Badge tone="signal">{methods.join(' + ')}</Badge> : <Badge tone="warning">Off</Badge>
}

/** Users table with search and role / status filters. */
export const AdminUsersPage = () => {
  const { data: users, isLoading, error } = useAdminUsers()
  const { data: roles } = useRoles()
  const { data: org } = useOrganization()
  const { mutateAsync: remove } = useDeleteUser()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const close = () => setDialog({ kind: 'closed' })

  const roleName = (roleId: number) => roles?.find((r) => r.roleId === roleId)?.roleName ?? '—'

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (users ?? []).filter(
      (u) =>
        (!q || `${u.displayName} ${u.userName} ${u.primaryEmail}`.toLowerCase().includes(q)) &&
        (roleFilter === 'all' || String(u.roleId) === roleFilter) &&
        (statusFilter === 'all' || (statusFilter === 'active') === u.isActive),
    )
  }, [users, search, roleFilter, statusFilter])

  const atLimit = !!org && !!users && users.length >= org.limits.users

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description={
          users && org ? `${users.length} of ${org.limits.users} seats used. Each person signs in with one role.` : 'People in your organization and their roles.'
        }
        mock
        actions={
          <LoadingButton
            icon={<Plus size={15} />}
            disabled={atLimit}
            title={atLimit ? 'Your plan has no free seats.' : undefined}
            onClick={() => setDialog({ kind: 'create' })}
          >
            Add user
          </LoadingButton>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : error ? (
        <p className="text-sm text-text-muted">Couldn't load users: {error.message}</p>
      ) : (
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, username or email" className="min-w-56 flex-1" />
            <Select aria-label="Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-40">
              <option value="all">All roles</option>
              {roles?.map((r) => (
                <option key={r.roleId} value={r.roleId}>
                  {r.roleName}
                </option>
              ))}
            </Select>
            <Select aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          {!visible.length ? (
            <p className="py-10 text-center text-sm text-text-muted">{users?.length ? 'No users match these filters.' : 'No users yet.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[45rem] border-collapse text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-text-muted uppercase">
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">2FA</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Last sign-in</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => (
                    <tr key={user.userId} className="border-t border-border">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-secondary/15 text-xs font-semibold text-accent-secondary">
                            {initials(user.displayName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text">{user.displayName}</p>
                            <p className="truncate text-xs text-text-muted">
                              @{user.userName} · {user.primaryEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-text">{roleName(user.roleId)}</td>
                      <td className="py-3">
                        <TwoFactor user={user} />
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={user.isActive ? 'signal' : 'neutral'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                          {!user.isEmailVerified && <Badge tone="warning">Email unverified</Badge>}
                          {user.hasIpRestriction && <Badge tone="accent">IP limited</Badge>}
                        </div>
                      </td>
                      <td className="py-3 text-sm text-text-muted">{formatRelative(user.lastLoginAt)}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={14} />}
                            aria-label={`Edit ${user.displayName}`}
                            onClick={() => setDialog({ kind: 'edit', user })}
                          />
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={14} />}
                            aria-label={`Remove ${user.displayName}`}
                            onClick={() => setDialog({ kind: 'delete', user })}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <UserFormDialog
        open={dialog.kind === 'create' || dialog.kind === 'edit'}
        user={dialog.kind === 'edit' ? dialog.user : undefined}
        onClose={close}
      />
      <ConfirmDialog
        open={dialog.kind === 'delete'}
        title="Remove user"
        confirmLabel="Remove user"
        successMessage={dialog.kind === 'delete' ? `Removed ${dialog.user.displayName}.` : ''}
        onConfirm={() => (dialog.kind === 'delete' ? remove(dialog.user.userId) : Promise.resolve())}
        onClose={close}
      >
        {dialog.kind === 'delete' && (
          <p>
            Remove <span className="font-medium text-text">{dialog.user.displayName}</span> from the organization? They're signed out
            right away. Their past actions stay in the audit log. To pause access instead, edit them and turn off Active.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
