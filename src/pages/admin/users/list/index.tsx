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
 * Admin › Users (/admin/users): people in the organization, from `/user/admin/list`, with search and
 * role / status filters. Viewing, adding and editing someone each open their own page; deleting asks
 * in a dialog. Edits and deleting need `user:edit`; adding needs `user:create` + `user:role:view`.
 */

import { Eye, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/Badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingButton } from '@/components/LoadingButton'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { Select } from '@/components/Select'
import { TableSkeleton } from '@/components/Skeleton'
import { Avatar, lastSignIn, NOT_SELF, TwoFactor, UserDeleteImpact, usePolicyLookup } from '@/pages/admin/users/UserDetails'
import { ROUTES, userEditPath, userPath } from '@/constants/routes'
import { useOrgInfo } from '@/hooks/useAccount'
import { useHasPermissions } from '@/hooks/usePermissions'
import { useRoleOptions } from '@/hooks/useRoles'
import { useAdminUsers, useDeleteUser } from '@/hooks/useUsers'
import { currentUserAtom } from '@/store/session'
import { errorStatus } from '@/types/api'
import { type AdminUser } from '@/types/user'

/** Users table with search and role / status filters; a user's name opens their page. */
export const AdminUsersPage = () => {
  const canView = useHasPermissions('user:view')
  const { data: users, isLoading, error } = useAdminUsers()
  const { roles, roleName } = useRoleOptions()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const policyOf = usePolicyLookup()
  const me = useAtomValue(currentUserAtom)
  const canCreate = useHasPermissions('user:view', 'user:create', 'user:role:view')
  // every change to an existing user, deleting included, needs user:edit in the API
  const canEdit = useHasPermissions('user:view', 'user:edit')
  const { data: org } = useOrgInfo()
  const seatsFull = !!org && org.users.current >= org.users.limit
  const { mutateAsync: remove } = useDeleteUser()
  const navigate = useNavigate()

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (users ?? []).filter(
      (u) =>
        (!q || `${u.displayName} ${u.userName} ${u.primaryEmail}`.toLowerCase().includes(q)) &&
        (roleFilter === 'all' || String(u.roleId) === roleFilter) &&
        (statusFilter === 'all' || (statusFilter === 'active') === u.isActive),
    )
  }, [users, search, roleFilter, statusFilter])

  const header = (
    <PageHeader
      title="Users"
      actions={
        canView &&
        canCreate && (
          <LoadingButton
            icon={<UserPlus size={15} />}
            disabled={seatsFull}
            title={seatsFull ? `Your plan's ${org?.users.limit} seats are all in use.` : undefined}
            onClick={() => navigate(ROUTES.adminUserNew)}
          >
            Add user
          </LoadingButton>
        )
      }
    />
  )

  /** View, Edit and Delete at the end of a user's row; Edit and Delete only with `user:edit`. */
  const rowActions = (user: AdminUser) => {
    const name = user.displayName
    const isMe = user.userId === me?.userId
    return (
      <div className="flex items-center justify-end gap-1">
        <LoadingButton
          variant="ghost"
          size="sm"
          icon={<Eye size={14} />}
          aria-label={`View ${name}`}
          title="View"
          onClick={() => navigate(userPath(user.userId))}
        />
        {canEdit && (
          <>
            <LoadingButton
              variant="ghost"
              size="sm"
              icon={<Pencil size={14} />}
              aria-label={`Edit ${name}`}
              title={isMe ? NOT_SELF : 'Edit'}
              disabled={isMe}
              onClick={() => navigate(userEditPath(user.userId))}
            />
            <LoadingButton
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              aria-label={`Delete ${name}`}
              title={isMe ? "You can't delete yourself." : 'Delete'}
              disabled={isMe}
              onClick={() => setDeleting(user)}
            />
          </>
        )}
      </div>
    )
  }

  if (!canView || errorStatus(error) === 403)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="text-sm text-text-muted">
          You need the “View users” permission (user:view) to see the people in your organization.
        </p>
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      {header}

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : error ? (
        <p className="text-sm text-text-muted">Couldn't load users: {error.message}</p>
      ) : (
        <>
          <section className="min-w-0 rounded-xl border border-border bg-surface-raised p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search name, username or email"
                className="min-w-56 flex-1"
              />
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
              <p className="py-10 text-center text-sm text-text-muted">
                {users?.length ? 'No users match these filters.' : 'No users yet.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-collapse text-left">
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
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-3">
                            <Avatar name={user.displayName} />
                            <div className="min-w-0">
                              <Link
                                to={userPath(user.userId)}
                                className="block truncate text-sm font-medium text-text hover:text-signal hover:underline"
                              >
                                {user.displayName}
                              </Link>
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
                            {user.accessPolicyId !== null && (
                              <Badge tone="accent">{policyOf(user.accessPolicyId)?.policyName}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-sm text-text-muted">{lastSignIn(user)}</td>
                        <td className="py-3 pr-2">{rowActions(user)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <ConfirmDialog
            open={deleting !== null}
            title="Delete user"
            confirmLabel="Delete user"
            successMessage={deleting ? `Deleted ${deleting.displayName}.` : ''}
            onConfirm={() => (deleting ? remove(deleting.userId) : Promise.resolve())}
            onClose={() => setDeleting(null)}
          >
            {deleting && <UserDeleteImpact user={deleting} />}
          </ConfirmDialog>
        </>
      )}
    </div>
  )
}
