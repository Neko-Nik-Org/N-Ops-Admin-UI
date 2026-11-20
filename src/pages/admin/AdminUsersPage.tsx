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
 * see their details (from `/user/admin/fetch/{id}`) and act on them: change their username, set a new
 * password, mark their email verified, deactivate or delete them (all need `user:edit`). Adding needs
 * `user:create` + `user:role:view`. There's no endpoint yet for editing a user's name, email, role or
 * sign-in restrictions.
 */

import { AtSign, Ban, BadgeCheck, KeyRound, Lock, Mail, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { Suspense, useMemo, useState, type ReactNode } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Select } from '@/components/atoms/Select'
import { useAtomValue } from 'jotai'
import { toast } from 'react-toastify'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { Dialog } from '@/components/molecules/Dialog'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { ProfileDetailsView } from '@/components/organisms/ProfileDetailsView'
import { useOrgInfo } from '@/features/account/hooks/useAccount'
import { currentUserAtom } from '@/features/auth/store/session'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { SkeletonText, TableSkeleton } from '@/components/molecules/Skeleton'
import {
  useAdminUser,
  useAdminUsers,
  useDeactivateUser,
  useDeleteUser,
  useRoleOptions,
  useVerifyUserEmail,
} from '@/features/admin/hooks/useAdmin'
import type { AdminUser } from '@/features/admin/types'
import { useHasPermissions } from '@/features/auth/permissions'
import { errorStatus } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatDateTime, formatRelative } from '@/utils/format'
import { lazyNamed, usePreloadWhenIdle } from '@/utils/lazyNamed'

// the form dialogs bring react-hook-form and yup, which the table doesn't need: they load after it
const UserFormDialog = lazyNamed(() => import('@/components/organisms/UserFormDialog'), 'UserFormDialog')
const RenameUserDialog = lazyNamed(() => import('@/components/organisms/UserActionDialogs'), 'RenameUserDialog')
const ResetPasswordDialog = lazyNamed(() => import('@/components/organisms/UserActionDialogs'), 'ResetPasswordDialog')

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
const UserDetails = ({
  userId,
  roleName,
  actions,
}: {
  userId: number
  roleName: (id: number) => string
  /** Buttons for this user, under the details. */
  actions?: (user: AdminUser) => ReactNode
}) => {
  const { data: user, isLoading, error } = useAdminUser(userId)
  if (isLoading) return <SkeletonText lines={8} />
  if (error || !user) return <p className="text-sm text-danger">{error?.message ?? 'Could not load this user.'}</p>
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
      </div>

      {/* the person's own profile details (work, contact, availability, on call, engineering…) */}
      {Object.keys(user.userDetails).length > 0 && (
        <div className="border-t border-border pt-4">
          <ProfileDetailsView raw={user.userDetails} />
        </div>
      )}

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
      {actions?.(user)}
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
  const [adding, setAdding] = useState(false)
  const [action, setAction] = useState<{ kind: 'rename' | 'password' | 'deactivate' | 'delete'; user: AdminUser } | null>(null)
  const me = useAtomValue(currentUserAtom)
  const canCreate = useHasPermissions('user:view', 'user:create', 'user:role:view')
  // every change to an existing user, deleting included, needs user:edit in the API
  const canEdit = useHasPermissions('user:view', 'user:edit')
  const { data: org } = useOrgInfo()
  const seatsFull = !!org && org.users.current >= org.users.limit
  const { mutateAsync: verifyEmail, isPending: verifying } = useVerifyUserEmail()
  const { mutateAsync: deactivate } = useDeactivateUser()
  const { mutateAsync: remove } = useDeleteUser()
  const closeAction = () => setAction(null)
  usePreloadWhenIdle(canView && (canCreate || canEdit), UserFormDialog.preload, RenameUserDialog.preload)

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
            onClick={() => setAdding(true)}
          >
            Add user
          </LoadingButton>
        )
      }
    />
  )

  /** What the signed-in admin can do to `user`, shown under their details. */
  const userActions = (user: AdminUser) => {
    if (!canEdit) return null
    const isMe = user.userId === me?.userId
    const notSelf = isMe ? 'Use the Account page to change your own account.' : undefined
    return (
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <LoadingButton
          variant="secondary"
          size="sm"
          icon={<AtSign size={14} />}
          disabled={isMe}
          title={notSelf}
          onClick={() => setAction({ kind: 'rename', user })}
        >
          Change username
        </LoadingButton>
        <LoadingButton
          variant="secondary"
          size="sm"
          icon={<KeyRound size={14} />}
          disabled={isMe}
          title={notSelf}
          onClick={() => setAction({ kind: 'password', user })}
        >
          Reset password
        </LoadingButton>
        {!user.isEmailVerified && (
          <LoadingButton
            variant="secondary"
            size="sm"
            icon={<BadgeCheck size={14} />}
            state={verifying ? 'loading' : 'idle'}
            onClick={() =>
              verifyEmail(user.userId)
                .then(() => toast.success(`Marked ${user.primaryEmail} as verified.`))
                .catch((error: Error) => toast.error(error.message))
            }
          >
            Mark email verified
          </LoadingButton>
        )}
        {user.isActive && (
          <LoadingButton
            variant="secondary"
            size="sm"
            icon={<Ban size={14} />}
            disabled={isMe}
            title={notSelf}
            onClick={() => setAction({ kind: 'deactivate', user })}
          >
            Deactivate
          </LoadingButton>
        )}
        <LoadingButton
          variant="danger"
          size="sm"
          icon={<Trash2 size={14} />}
          disabled={isMe}
          title={notSelf}
          onClick={() => setAction({ kind: 'delete', user })}
        >
          Delete
        </LoadingButton>
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
            {selected !== null && <UserDetails key={selected} userId={selected} roleName={roleName} actions={userActions} />}
          </Dialog>

          <Suspense fallback={null}>
            {adding && <UserFormDialog open onClose={() => setAdding(false)} />}
            {action?.kind === 'rename' && <RenameUserDialog user={action.user} onClose={closeAction} />}
            {action?.kind === 'password' && <ResetPasswordDialog user={action.user} onClose={closeAction} />}
          </Suspense>
          <ConfirmDialog
            open={action?.kind === 'deactivate'}
            title="Deactivate user"
            confirmLabel="Deactivate"
            successMessage={action ? `Deactivated ${action.user.displayName}.` : ''}
            onConfirm={() => (action ? deactivate(action.user.userId) : Promise.resolve())}
            onClose={closeAction}
          >
            {action && (
              <p>
                <span className="font-medium text-text">{action.user.displayName}</span> won't be able to sign in. Their data is
                kept. There's no way to reactivate them from here yet.
              </p>
            )}
          </ConfirmDialog>
          <ConfirmDialog
            open={action?.kind === 'delete'}
            title="Delete user"
            confirmLabel="Delete user"
            successMessage={action ? `Deleted ${action.user.displayName}.` : ''}
            onConfirm={() =>
              action
                ? remove(action.user.userId).then(() => {
                    if (selectedId === action.user.userId) setSelectedId(null)
                  })
                : Promise.resolve()
            }
            onClose={closeAction}
          >
            {action && (
              <p>
                Permanently delete <span className="font-medium text-text">{action.user.displayName}</span> (@
                {action.user.userName})? Their notes and everything else they own go too. This can't be undone.
              </p>
            )}
          </ConfirmDialog>
        </>
      )}
    </div>
  )
}
