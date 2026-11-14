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
/** Admin › Roles (/admin/roles): permission sets for users and API keys. */

import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { LoadingButton, TableSkeleton } from '@/components/loading'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { RoleFormDialog } from '@/components/organisms/RoleFormDialog'
import { ALL_PERMISSIONS } from '@/features/admin/catalog'
import { useAdminUsers, useApiKeys, useDeleteRole, useRoles } from '@/features/admin/hooks/useAdmin'
import { useTagOptions } from '@/features/admin/hooks/useTagOptions'
import type { Role } from '@/features/admin/types'

/** Which dialog is open. `copy` opens the editor pre-filled from another role. */
type DialogState = { kind: 'closed' } | { kind: 'create'; from?: Role } | { kind: 'edit'; role: Role } | { kind: 'delete'; role: Role }

/** Roles table: what each grants, where, and who has it. */
export const AdminRolesPage = () => {
  const { data: roles, isLoading, error } = useRoles()
  const { data: users } = useAdminUsers()
  const { data: keys } = useApiKeys()
  const { tagName } = useTagOptions()
  const { mutateAsync: remove } = useDeleteRole()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })
  const [search, setSearch] = useState('')
  const close = () => setDialog({ kind: 'closed' })

  const usage = (roleId: number) => ({
    users: users?.filter((u) => u.roleId === roleId).length ?? 0,
    keys: keys?.filter((k) => k.roleId === roleId).length ?? 0,
  })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (roles ?? []).filter((r) => !q || `${r.roleName} ${r.roleDescription} ${r.permissions.join(' ')}`.toLowerCase().includes(q))
  }, [roles, search])

  /** A copy starts as a new role with the same settings and a "(copy)" name. */
  const editorRole =
    dialog.kind === 'edit' ? dialog.role : dialog.kind === 'create' && dialog.from ? { ...dialog.from, roleName: `${dialog.from.roleName} (copy)` } : undefined

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        description="Each role is a set of permissions, optionally limited to some tags. Users and API keys share these roles."
        mock
        actions={
          <LoadingButton icon={<Plus size={15} />} onClick={() => setDialog({ kind: 'create' })}>
            New role
          </LoadingButton>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
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
                    <th className="pb-2 font-medium">Used by</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((role) => {
                    const used = usage(role.roleId)
                    return (
                      <tr key={role.roleId} className="border-t border-border align-top">
                        <td className="max-w-xs py-3">
                          <p className="text-sm font-medium text-text">{role.roleName}</p>
                          <p className="text-xs text-text-muted">{role.roleDescription || '—'}</p>
                        </td>
                        <td className="py-3">
                          <Badge tone={role.permissions.length === ALL_PERMISSIONS.length ? 'signal' : 'neutral'}>
                            {role.permissions.length === ALL_PERMISSIONS.length ? 'All' : `${role.permissions.length} of ${ALL_PERMISSIONS.length}`}
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
                            {!role.canApproveApprovals && !role.canBypassApprovals && <span className="text-sm text-text-muted">—</span>}
                          </div>
                        </td>
                        <td className="py-3 text-sm text-text-muted">
                          {used.users} user{used.users === 1 ? '' : 's'}
                          {used.keys > 0 && `, ${used.keys} key${used.keys === 1 ? '' : 's'}`}
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-1">
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Copy size={14} />}
                              aria-label={`Duplicate ${role.roleName}`}
                              title="Duplicate"
                              onClick={() => setDialog({ kind: 'create', from: role })}
                            />
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Pencil size={14} />}
                              aria-label={`Edit ${role.roleName}`}
                              onClick={() => setDialog({ kind: 'edit', role })}
                            />
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={14} />}
                              aria-label={`Delete ${role.roleName}`}
                              onClick={() => setDialog({ kind: 'delete', role })}
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

      <RoleFormDialog
        // a copy must save as a new role, so it's passed as a template, not as the role being edited
        key={dialog.kind === 'create' && dialog.from ? `copy-${dialog.from.roleId}` : dialog.kind}
        open={dialog.kind === 'create' || dialog.kind === 'edit'}
        role={dialog.kind === 'edit' ? dialog.role : undefined}
        template={dialog.kind === 'create' ? editorRole : undefined}
        onClose={close}
      />
      <ConfirmDialog
        open={dialog.kind === 'delete'}
        title="Delete role"
        confirmLabel="Delete role"
        successMessage={dialog.kind === 'delete' ? `Deleted ${dialog.role.roleName}.` : ''}
        onConfirm={() => (dialog.kind === 'delete' ? remove(dialog.role.roleId) : Promise.resolve())}
        onClose={close}
      >
        {dialog.kind === 'delete' && (
          <p>
            Delete <span className="font-medium text-text">{dialog.role.roleName}</span>? Only roles that no user or API key uses can be
            deleted. This can't be undone.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
