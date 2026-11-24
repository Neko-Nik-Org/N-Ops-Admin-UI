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
/** Admin › Roles › one role (/admin/roles/:roleId): what it grants, with Edit, Duplicate and Delete. */

import { Copy, Pencil, Trash2 } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingButton } from '@/components/LoadingButton'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonText } from '@/components/Skeleton'
import { PageToolbar, type Crumb } from '@/components/PageToolbar'
import { NO_ROLE_EDIT, OUT_OF_SCOPE, RoleDeleteImpact, RoleDetails } from '@/pages/admin/roles/RoleDetails'
import { newRolePath, roleEditPath, ROUTES } from '@/constants/routes'
import { useDeleteRole, useRole } from '@/hooks/useRoles'
import { isRoleWithinScope, useHasPermissions } from '@/hooks/usePermissions'
import { currentUserAtom } from '@/store/session'
import { errorStatus } from '@/types/api'

/** "Roles › <current>". */
const crumbs = (current: string): Crumb[] => [{ label: 'Roles', to: ROUTES.adminRoles }, { label: current }]

export const RoleDetailPage = () => {
  const roleId = Number(useParams().roleId)
  const valid = Number.isInteger(roleId) && roleId > 0
  const user = useAtomValue(currentUserAtom)
  const canView = useHasPermissions('user:role:view')
  const canCreate = useHasPermissions('user:role:view', 'user:role:create')
  const canUpdate = useHasPermissions('user:role:view', 'user:role:edit')
  const canDelete = useHasPermissions('user:role:view', 'user:role:delete')
  const { data: role, isLoading, error } = useRole(valid && canView ? roleId : null)
  const { mutateAsync: remove } = useDeleteRole()
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  if (!canView)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Role')} back={ROUTES.adminRoles} />
        <p className="text-sm text-text-muted">You need the “View roles” permission (user:role:view) to see roles.</p>
      </div>
    )
  if (valid && isLoading) return <SkeletonText lines={6} />
  if (!valid || error || !role)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Not found')} back={ROUTES.adminRoles} />
        <p className="text-sm text-text-muted">
          {!valid || errorStatus(error) === 404
            ? "There's no role here. It may have been deleted."
            : `Couldn't load this role: ${error?.message ?? 'no data'}`}
        </p>
      </div>
    )

  const inScope = isRoleWithinScope(user, role)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageToolbar
          crumbs={crumbs(role.roleName)}
          back={ROUTES.adminRoles}
          actions={
            <>
              {canDelete && (
                <LoadingButton
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  disabled={!inScope}
                  title={inScope ? undefined : OUT_OF_SCOPE}
                  onClick={() => setDeleting(true)}
                >
                  Delete
                </LoadingButton>
              )}
              {canCreate && (
                <LoadingButton
                  variant="secondary"
                  size="sm"
                  icon={<Copy size={14} />}
                  onClick={() => navigate(newRolePath(role.roleId))}
                >
                  Duplicate
                </LoadingButton>
              )}
              <LoadingButton
                size="sm"
                icon={<Pencil size={14} />}
                disabled={!canUpdate || !inScope}
                title={!canUpdate ? NO_ROLE_EDIT : inScope ? undefined : OUT_OF_SCOPE}
                onClick={() => navigate(roleEditPath(role.roleId))}
              >
                Edit
              </LoadingButton>
            </>
          }
        />
        <PageHeader title={role.roleName} showTitle description={role.roleDescription || undefined} />
      </div>

      <RoleDetails role={role} />

      <ConfirmDialog
        open={deleting}
        title="Delete role"
        confirmLabel="Delete role"
        successMessage={`Deleted ${role.roleName}.`}
        onConfirm={() => remove(role.roleId).then(() => setTimeout(() => navigate(ROUTES.adminRoles), 500))}
        onClose={() => setDeleting(false)}
      >
        <RoleDeleteImpact role={role} />
      </ConfirmDialog>
    </div>
  )
}
