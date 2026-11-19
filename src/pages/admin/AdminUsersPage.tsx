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
 * Admin › Users (/admin/users): people in the organization, from `/user/admin/list`. Click someone to
 * see their details on the right (from `/user/admin/fetch/{id}`). Adding, editing and removing users
 * come once the API has endpoints for them.
 */

import { Globe, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Select } from '@/components/atoms/Select'
import { Dialog } from '@/components/molecules/Dialog'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { SkeletonText, TableSkeleton } from '@/components/molecules/Skeleton'
import { useAdminUser, useAdminUsers, useRoleOptions } from '@/features/admin/hooks/useAdmin'
import type { AdminUser } from '@/features/admin/types'
import { useHasPermissions } from '@/features/auth/permissions'
import { errorStatus } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatDateTime, formatRelative } from '@/utils/format'

/** Initials for the avatar, e.g. "Priya Rao" → "PR". */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

const Avatar = ({ name, large }: { name: string; large?: boolean }) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center rounded-full bg-accent-secondary/15 font-semibold text-accent-secondary',
      large ? 'size-11 text-sm' : 'size-8 text-xs',
    )}
  >
    {initials(name)}
  </span>
)

/** Which second factors the user has set up. */
const TwoFactor = ({ user }: { user: AdminUser }) => {
  const methods = [user.hasTotp2fa && 'App', user.hasEmail2fa && 'Email'].filter(Boolean)
  return methods.length ? <Badge tone="signal">{methods.join(' + ')}</Badge> : <Badge tone="warning">Off</Badge>
}

/** "Never" when the API's last sign-in is just the creation time (it can't be empty). */
const lastSignIn = (u: AdminUser) => (!u.lastLoginAt || u.lastLoginAt === u.createdAt ? 'Never' : formatRelative(u.lastLoginAt))

const Section = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2 border-t border-border pt-4">
    <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-muted uppercase">
      {icon}
      {title}
    </h3>
    {children}
  </div>
)

const List = ({ items, empty }: { items: string[]; empty: string }) =>
  items.length ? (
    <ul className="flex flex-wrap gap-1">
      {items.map((i) => (
        <li key={i}>
          <Badge mono>{i}</Badge>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-text-muted">{empty}</p>
  )

/** The picked user, fetched fresh from the API. */
const UserDetails = ({ userId, roleName }: { userId: number; roleName: (id: number) => string }) => {
  const { data: user, isLoading, error } = useAdminUser(userId)
  if (isLoading) return <SkeletonText lines={8} />
  if (error || !user) return <p className="text-sm text-danger">{error?.message ?? 'Could not load this user.'}</p>
  const details = Object.entries(user.userDetails).filter(([, v]) => v !== null && v !== '')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={user.displayName} large />
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-text">{user.displayName}</h2>
          <p className="truncate text-xs text-text-muted">@{user.userName}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge tone={user.isActive ? 'signal' : 'neutral'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
        <Badge tone="accent">{roleName(user.roleId)}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <Section icon={<Mail size={13} aria-hidden="true" />} title="Contact">
          <p className="text-sm break-all text-text">{user.primaryEmail}</p>
          <p className="text-xs">
            {user.isEmailVerified ? <Badge tone="signal">Verified</Badge> : <Badge tone="warning">Not verified</Badge>}
          </p>
        </Section>

        <Section icon={<ShieldCheck size={13} aria-hidden="true" />} title="Two-step verification">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-text-muted">Authenticator app</dt>
            <dd className="text-text">{user.hasTotp2fa ? 'On' : 'Off'}</dd>
            <dt className="text-text-muted">Email code</dt>
            <dd className="text-text">{user.hasEmail2fa ? 'On' : 'Off'}</dd>
          </dl>
        </Section>

        <Section icon={<Lock size={13} aria-hidden="true" />} title="Sign-in restrictions">
          <p className="text-sm text-text">IP addresses: {user.hasIpRestriction ? 'restricted' : 'any'}</p>
          {user.hasIpRestriction && <List items={user.allowedIps} empty="No addresses allowed." />}
          <p className="text-sm text-text">Locations: {user.hasGeoRestriction ? 'restricted' : 'any'}</p>
          {user.hasGeoRestriction && <List items={user.allowedGeoLocations} empty="No locations allowed." />}
        </Section>

        {details.length > 0 && (
          <Section icon={<Globe size={13} aria-hidden="true" />} title="Details">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
              {details.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-text-muted">{k.replace(/_/g, ' ')}</dt>
                  <dd className="break-words text-text">{typeof v === 'string' ? v : JSON.stringify(v)}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border pt-4 text-sm">
        <dt className="text-text-muted">Last sign-in</dt>
        <dd className="text-text" title={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : undefined}>
          {lastSignIn(user)}
        </dd>
        <dt className="text-text-muted">Updated</dt>
        <dd className="text-text">{formatDateTime(user.updatedAt)}</dd>
        <dt className="text-text-muted">Joined</dt>
        <dd className="text-text">{formatDateTime(user.createdAt)}</dd>
      </dl>
    </div>
  )
}

/** Users table with search and role / status filters; clicking a user opens their details in a dialog. */
export const AdminUsersPage = () => {
  const canView = useHasPermissions('user:view')
  const { data: users, isLoading, error } = useAdminUsers()
  const { roles, roleName } = useRoleOptions()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (users ?? []).filter(
      (u) =>
        (!q || `${u.displayName} ${u.userName} ${u.primaryEmail}`.toLowerCase().includes(q)) &&
        (roleFilter === 'all' || String(u.roleId) === roleFilter) &&
        (statusFilter === 'all' || (statusFilter === 'active') === u.isActive),
    )
  }, [users, search, roleFilter, statusFilter])
  const selected = visible.some((u) => u.userId === selectedId) ? selectedId : null

  const header = <PageHeader title="Users" />

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
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((user) => {
                      const picked = user.userId === selected
                      return (
                        <tr
                          key={user.userId}
                          tabIndex={0}
                          aria-selected={picked}
                          onClick={() => setSelectedId(user.userId)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedId(user.userId)}
                          className={cn(
                            'cursor-pointer border-t border-border outline-none focus-visible:ring-1 focus-visible:ring-signal focus-visible:ring-inset',
                            picked ? 'bg-signal/10' : 'hover:bg-ink/50',
                          )}
                        >
                          <td className="py-3 pl-2">
                            <div className="flex items-center gap-3">
                              <Avatar name={user.displayName} />
                              <div className="min-w-0">
                                <p className={cn('truncate text-sm font-medium', picked ? 'text-signal' : 'text-text')}>
                                  {user.displayName}
                                </p>
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
                              {user.hasGeoRestriction && <Badge tone="accent">Location limited</Badge>}
                            </div>
                          </td>
                          <td className="py-3 text-sm text-text-muted">{lastSignIn(user)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <Dialog open={selected !== null} onClose={() => setSelectedId(null)} size="lg" title="User details">
            {selected !== null && <UserDetails key={selected} userId={selected} roleName={roleName} />}
          </Dialog>
        </>
      )}
    </div>
  )
}
