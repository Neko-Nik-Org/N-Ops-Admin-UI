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
 * Admin › Users › add or edit (/admin/users/new and /admin/users/:userId/edit): the user forms as
 * their own pages. Adding needs `user:create` + `user:role:view`; editing needs `user:edit`.
 */

import { useAtomValue } from 'jotai'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonText } from '@/components/Skeleton'
import { PageToolbar } from '@/components/PageToolbar'
import { UserEditForm } from '@/pages/admin/users/form/UserEditForm'
import { UserForm } from '@/pages/admin/users/form/UserForm'
import { NOT_SELF } from '@/pages/admin/users/UserDetails'
import { ROUTES, userPath } from '@/constants/routes'
import { useOrgInfo } from '@/hooks/useAccount'
import { useGoBack } from '@/hooks/useGoBack'
import { useHasPermissions } from '@/hooks/usePermissions'
import { useAdminUser } from '@/hooks/useUsers'
import { currentUserAtom } from '@/store/session'
import { errorStatus } from '@/types/api'

/** A positive whole-number id from the URL, else null. */
const idFrom = (value: string | undefined) => {
  const n = Number(value)
  return value && Number.isInteger(n) && n > 0 ? n : null
}

export const UserFormPage = () => {
  const params = useParams()
  const editing = params.userId !== undefined
  const editId = idFrom(params.userId)
  const me = useAtomValue(currentUserAtom)
  const canCreate = useHasPermissions('user:view', 'user:create', 'user:role:view')
  const canEdit = useHasPermissions('user:view', 'user:edit')
  const canSave = editing ? canEdit : canCreate
  const { data: user, isLoading, error } = useAdminUser(editing && canSave ? editId : null)
  const { data: org } = useOrgInfo()
  const seatsFull = !editing && !!org && org.users.current >= org.users.limit

  const title = editing ? (user ? `Edit ${user.displayName}` : 'Edit user') : 'Add user'
  // where Back, Cancel and a save lead when the page was opened directly; otherwise they return to the previous page
  const fallback = editing && editId ? userPath(editId) : ROUTES.adminUsers
  const back = useGoBack(fallback)

  const header = (
    <div className="flex flex-col gap-1">
      <PageToolbar crumbs={[{ label: 'Users', to: ROUTES.adminUsers }, { label: title }]} back={fallback} />
      {/* the path above names the page; the heading is for screen readers */}
      <PageHeader title={title} />
    </div>
  )
  const notice = (text: string) => (
    <div className="flex flex-col gap-6">
      {header}
      <p className="text-sm text-text-muted">{text}</p>
    </div>
  )

  if (!canSave)
    return notice(
      editing
        ? 'Editing users needs the “Edit users” permission (user:edit).'
        : 'Adding users needs the “Create users” and “View roles” permissions (user:create, user:role:view).',
    )
  if (seatsFull) return notice(`Your plan's ${org?.users.limit} seats are all in use, so you can't add anyone right now.`)
  if (editing && editId && editId === me?.userId) return notice(NOT_SELF)
  if (editing && editId && isLoading) return <SkeletonText lines={8} />
  if (editing && (!editId || error || !user))
    return notice(
      !editId || errorStatus(error) === 404
        ? "There's no user here. They may have been deleted."
        : `Couldn't load this user: ${error?.message ?? 'no data'}`,
    )

  return (
    <div className="flex flex-col gap-6">
      {header}
      {/* back to where the admin came from (opened directly: the user, or the list for a new one, whose id the API doesn't return) */}
      {user ? (
        <UserEditForm key={user.userId} user={user} onSaved={back} onCancel={back} />
      ) : (
        <UserForm onSaved={back} onCancel={back} />
      )}
    </div>
  )
}
