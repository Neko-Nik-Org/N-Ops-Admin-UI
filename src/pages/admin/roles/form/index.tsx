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
 * Admin › Roles › new or edit (/admin/roles/new[?from=<id>] and /admin/roles/:roleId/edit):
 * the role form as its own page.
 */

import { useAtomValue } from 'jotai'
import { useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonText } from '@/components/Skeleton'
import { PageToolbar } from '@/components/PageToolbar'
import { RoleForm } from '@/pages/admin/roles/form/RoleForm'
import { OUT_OF_SCOPE } from '@/pages/admin/roles/RoleDetails'
import { rolePath, ROUTES } from '@/constants/routes'
import { useGoBack } from '@/hooks/useGoBack'
import { useRole } from '@/hooks/useRoles'
import { isRoleWithinScope, useHasPermissions } from '@/hooks/usePermissions'
import { currentUserAtom } from '@/store/session'
import { errorStatus } from '@/types/api'

/** A positive whole-number id from the URL, else null. */
const idFrom = (value: string | null | undefined) => {
  const n = Number(value)
  return value && Number.isInteger(n) && n > 0 ? n : null
}

export const RoleFormPage = () => {
  const params = useParams()
  const [search] = useSearchParams()
  const user = useAtomValue(currentUserAtom)
  const editing = params.roleId !== undefined
  const editId = idFrom(params.roleId)
  const fromId = editing ? null : idFrom(search.get('from'))
  const canSave = useHasPermissions('user:role:view', editing ? 'user:role:edit' : 'user:role:create')
  // the role being edited (its latest saved state, so the save only sends what changed), or the one being duplicated
  const sourceId = editing ? editId : fromId
  const { data: source, isLoading, error } = useRole(canSave ? sourceId : null)

  const title = editing ? (source ? `Edit ${source.roleName}` : 'Edit role') : 'New role'
  // where Back, Cancel and a save lead when the page was opened directly; otherwise they return to the previous page
  const fallback = editing && editId ? rolePath(editId) : ROUTES.adminRoles
  const back = useGoBack(fallback)

  const header = (
    <div className="flex flex-col gap-1">
      <PageToolbar crumbs={[{ label: 'Roles', to: ROUTES.adminRoles }, { label: title }]} back={fallback} />
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
        ? 'Editing roles needs the “Edit roles” permission (user:role:edit).'
        : 'Creating roles needs the “Create roles” permission (user:role:create).',
    )
  if (sourceId && isLoading) return <SkeletonText lines={8} />
  if (editing && (!editId || error || !source))
    return notice(
      !editId || errorStatus(error) === 404
        ? "There's no role here. It may have been deleted."
        : `Couldn't load this role: ${error?.message ?? 'no data'}`,
    )
  if (editing && source && !isRoleWithinScope(user, source)) return notice(OUT_OF_SCOPE)

  // a copy starts as a new role with the same settings and a "(copy)" name
  const template = !editing && source ? { ...source, roleName: `${source.roleName} (copy)` } : undefined

  return (
    <div className="flex flex-col gap-6">
      {header}
      <RoleForm
        key={`${editId ?? 'new'}-${fromId ?? ''}`}
        role={editing ? source : undefined}
        template={template}
        // back to where the user came from (opened directly: the role, or the list for a new one, whose id the API doesn't return)
        onSaved={back}
        onCancel={back}
      />
    </div>
  )
}
