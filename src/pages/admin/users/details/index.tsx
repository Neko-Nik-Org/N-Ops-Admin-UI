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
 * Admin › Users › one user (/admin/users/:userId): their details fresh from `/user/admin/fetch/{id}`,
 * with Edit (its own page) and Delete, plus account actions: change username, reset password, mark
 * email verified and deactivate. Every change needs `user:edit` (deleting needs `user:delete`), and none
 * applies to yourself.
 */

import { AtSign, Ban, BadgeCheck, KeyRound, Pencil, Trash2 } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { Suspense, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Badge } from '@/components/Badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingButton } from '@/components/LoadingButton'
import { SkeletonText } from '@/components/Skeleton'
import { PageToolbar, type Crumb } from '@/components/PageToolbar'
import { Avatar, NOT_SELF, UserDeactivateImpact, UserDeleteImpact, UserDetails } from '@/pages/admin/users/UserDetails'
import { ROUTES, userEditPath } from '@/constants/routes'
import { useHasPermissions } from '@/hooks/usePermissions'
import { useRoleOptions } from '@/hooks/useRoles'
import { useAdminUser, useDeactivateUser, useDeleteUser, useVerifyUserEmail } from '@/hooks/useUsers'
import { currentUserAtom } from '@/store/session'
import { errorStatus } from '@/types/api'
import { lazyNamed } from '@/utils/lazyNamed'

// the dialogs bring react-hook-form and yup, which the details don't need
const RenameUserDialog = lazyNamed(() => import('@/pages/admin/users/UserActionDialogs'), 'RenameUserDialog')
const ResetPasswordDialog = lazyNamed(() => import('@/pages/admin/users/UserActionDialogs'), 'ResetPasswordDialog')

/** "Users › <current>". */
const crumbs = (current: string): Crumb[] => [{ label: 'Users', to: ROUTES.adminUsers }, { label: current }]

type Action = 'rename' | 'password' | 'deactivate' | 'delete'

export const UserDetailPage = () => {
  const userId = Number(useParams().userId)
  const valid = Number.isInteger(userId) && userId > 0
  const canView = useHasPermissions('user:view')
  const canEdit = useHasPermissions('user:view', 'user:edit')
  const canDelete = useHasPermissions('user:view', 'user:delete')
  const me = useAtomValue(currentUserAtom)
  const { roleName } = useRoleOptions()
  const { data: user, isLoading, error } = useAdminUser(valid && canView ? userId : null)
  const { mutateAsync: verifyEmail, isPending: verifying } = useVerifyUserEmail()
  const { mutateAsync: deactivate } = useDeactivateUser()
  const { mutateAsync: remove } = useDeleteUser()
  const [action, setAction] = useState<Action | null>(null)
  const close = () => setAction(null)
  const navigate = useNavigate()

  if (!canView || errorStatus(error) === 403)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('User')} back={ROUTES.adminUsers} />
        <p className="text-sm text-text-muted">
          You need the “View users” permission (user:view) to see the people in your organization.
        </p>
      </div>
    )
  if (valid && isLoading) return <SkeletonText lines={8} />
  if (!valid || error || !user)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Not found')} back={ROUTES.adminUsers} />
        <p className="text-sm text-text-muted">
          {!valid || errorStatus(error) === 404
            ? "There's no user here. They may have been deleted."
            : `Couldn't load this user: ${error?.message ?? 'no data'}`}
        </p>
      </div>
    )

  const isMe = user.userId === me?.userId
  const notSelf = isMe ? NOT_SELF : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageToolbar
          crumbs={crumbs(user.displayName)}
          back={ROUTES.adminUsers}
          actions={
            (canEdit || canDelete) && (
              <>
                {canDelete && (
                  <LoadingButton
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    disabled={isMe}
                    title={isMe ? "You can't delete yourself." : undefined}
                    onClick={() => setAction('delete')}
                  >
                    Delete
                  </LoadingButton>
                )}
                {canEdit && (
                  <LoadingButton
                    size="sm"
                    icon={<Pencil size={14} />}
                    disabled={isMe}
                    title={notSelf}
                    onClick={() => navigate(userEditPath(user.userId))}
                  >
                    Edit
                  </LoadingButton>
                )}
              </>
            )
          }
        />
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.displayName} large />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-2xl font-bold text-text">{user.displayName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
              <span>@{user.userName}</span>
              <Badge tone={user.isActive ? 'signal' : 'neutral'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
              <Badge tone="accent">{roleName(user.roleId)}</Badge>
            </div>
          </div>
        </div>
      </div>

      <UserDetails user={user} />

      {canEdit && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="text-sm font-semibold text-text">Account actions</h2>
          {isMe && <p className="-mt-1 text-xs text-text-muted">{NOT_SELF}</p>}
          <div className="flex flex-wrap gap-2">
            <LoadingButton
              variant="secondary"
              size="sm"
              icon={<AtSign size={14} />}
              disabled={isMe}
              title={notSelf}
              onClick={() => setAction('rename')}
            >
              Change username
            </LoadingButton>
            <LoadingButton
              variant="secondary"
              size="sm"
              icon={<KeyRound size={14} />}
              disabled={isMe || !user.isActive}
              title={isMe ? notSelf : user.isActive ? undefined : 'Activate this user before resetting their password.'}
              onClick={() => setAction('password')}
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
                    .catch((err: Error) => toast.error(err.message))
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
                onClick={() => setAction('deactivate')}
              >
                Deactivate
              </LoadingButton>
            )}
          </div>
        </section>
      )}

      <Suspense fallback={null}>
        {action === 'rename' && <RenameUserDialog user={user} onClose={close} />}
        {action === 'password' && <ResetPasswordDialog user={user} onClose={close} />}
      </Suspense>
      <ConfirmDialog
        open={action === 'deactivate'}
        title="Deactivate user"
        confirmLabel="Deactivate"
        successMessage={`Deactivated ${user.displayName}.`}
        onConfirm={() => deactivate(user.userId)}
        onClose={close}
      >
        <UserDeactivateImpact user={user} />
      </ConfirmDialog>
      <ConfirmDialog
        open={action === 'delete'}
        title="Delete user"
        confirmLabel="Delete user"
        successMessage={`Deleted ${user.displayName}.`}
        onConfirm={() => remove(user.userId).then(() => setTimeout(() => navigate(ROUTES.adminUsers), 500))}
        onClose={close}
      >
        <UserDeleteImpact user={user} />
      </ConfirmDialog>
    </div>
  )
}
