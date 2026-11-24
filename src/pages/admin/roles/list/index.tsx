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
 * Admin › Roles (/admin/roles): permission sets for users, backed by `/user/roles/*`. Viewing,
 * creating and editing a role each open their own page; deleting asks in a dialog.
 */

import { Copy, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/Badge'
import { LoadingButton } from '@/components/LoadingButton'
import { TableSkeleton } from '@/components/Skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { NO_ROLE_EDIT, OUT_OF_SCOPE, RoleDeleteImpact } from '@/pages/admin/roles/RoleDetails'
import { ALL_PERMISSIONS } from '@/constants/permissions'
import { newRolePath, roleEditPath, rolePath } from '@/constants/routes'
import { useDeleteRole, useRoles } from '@/hooks/useRoles'
import { type Role } from '@/types/role'
import { isRoleWithinScope, useHasPermissions } from '@/hooks/usePermissions'
import { currentUserAtom } from '@/store/session'
import { useTags } from '@/hooks/useTags'

/** Roles table: what each grants and where. Actions follow the `user:role:*` permissions. */
export const AdminRolesPage = () => {
  const user = useAtomValue(currentUserAtom)
  const canView = useHasPermissions('user:role:view')
  const canCreate = useHasPermissions('user:role:view', 'user:role:create')
  const canUpdate = useHasPermissions('user:role:view', 'user:role:edit')
  const canDelete = useHasPermissions('user:role:view', 'user:role:delete')
  const { data: roles, isLoading, error } = useRoles({ enabled: canView })
  const { data: tags } = useTags()
  const tagName = (tagId: number) => tags?.find((t) => t.tagId === tagId)?.tagName ?? `#${tagId}`
  const { mutateAsync: remove } = useDeleteRole()
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (roles ?? []).filter(
      (r) => !q || `${r.roleName} ${r.roleDescription} ${r.permissions.join(' ')}`.toLowerCase().includes(q),
    )
  }, [roles, search])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        actions={
          canCreate && (
            <LoadingButton icon={<Plus size={15} />} onClick={() => navigate(newRolePath())}>
              New role
            </LoadingButton>
          )
        }
      />

      {!canView ? (
        <p className="text-sm text-text-muted">You need the “View roles” permission (user:role:view) to see roles.</p>
      ) : isLoading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : error ? (
        <p className="text-sm text-text-muted">Couldn't load roles: {error.message}</p>
      ) : (
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search roles or permissions" className="mb-4 max-w-md" />
          {!visible.length ? (
            <p className="py-10 text-center text-sm text-text-muted">{roles?.length ? 'No roles match.' : 'No roles yet.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[47.5rem] border-collapse text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-text-muted uppercase">
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Permissions</th>
                    <th className="pb-2 font-medium">Tags</th>
                    <th className="pb-2 font-medium">Approvals</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((role) => {
                    const inScope = isRoleWithinScope(user, role)
                    return (
                      <tr key={role.roleId} className="border-t border-border align-top">
                        <td className="max-w-xs py-3">
                          <Link
                            to={rolePath(role.roleId)}
                            className="text-left text-sm font-medium text-text hover:text-signal hover:underline"
                          >
                            {role.roleName}
                          </Link>
                          <p className="text-xs text-text-muted">{role.roleDescription || '—'}</p>
                        </td>
                        <td className="py-3">
                          <Badge tone={role.permissions.length === ALL_PERMISSIONS.length ? 'signal' : 'neutral'}>
                            {role.permissions.length === ALL_PERMISSIONS.length
                              ? 'All'
                              : `${role.permissions.length} of ${ALL_PERMISSIONS.length}`}
                          </Badge>
                        </td>
                        <td className="py-3">
                          {role.tagIds.length ? (
                            <div className="flex max-w-48 flex-wrap gap-1">
                              {role.tagIds.map((id) => (
                                <Badge key={id} tone="accent" mono>
                                  {tagName(id)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-text-muted">All tags</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {role.canApproveApprovals && <Badge tone="signal">Approver</Badge>}
                            {role.canBypassApprovals && <Badge tone="warning">Skips approvals</Badge>}
                            {!role.canApproveApprovals && !role.canBypassApprovals && (
                              <span className="text-sm text-text-muted">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-1">
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Eye size={14} />}
                              aria-label={`View ${role.roleName}`}
                              title="View"
                              onClick={() => navigate(rolePath(role.roleId))}
                            />
                            {canCreate && (
                              <LoadingButton
                                variant="ghost"
                                size="sm"
                                icon={<Copy size={14} />}
                                aria-label={`Duplicate ${role.roleName}`}
                                title="Duplicate"
                                onClick={() => navigate(newRolePath(role.roleId))}
                              />
                            )}
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Pencil size={14} />}
                              aria-label={`Edit ${role.roleName}`}
                              title={!canUpdate ? NO_ROLE_EDIT : inScope ? 'Edit' : OUT_OF_SCOPE}
                              disabled={!canUpdate || !inScope}
                              onClick={() => navigate(roleEditPath(role.roleId))}
                            />
                            {canDelete && (
                              <LoadingButton
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 size={14} />}
                                aria-label={`Delete ${role.roleName}`}
                                title={inScope ? 'Delete' : OUT_OF_SCOPE}
                                disabled={!inScope}
                                onClick={() => setDeleting(role)}
                              />
                            )}
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

      <ConfirmDialog
        open={deleting !== null}
        title="Delete role"
        confirmLabel="Delete role"
        successMessage={deleting ? `Deleted ${deleting.roleName}.` : ''}
        onConfirm={() => (deleting ? remove(deleting.roleId) : Promise.resolve())}
        onClose={() => setDeleting(null)}
      >
        {deleting && <RoleDeleteImpact role={deleting} />}
      </ConfirmDialog>
    </div>
  )
}
