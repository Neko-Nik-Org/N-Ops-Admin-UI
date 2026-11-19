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
/** A role, read-only: the same permission matrix as the editor, plus its tags, approvals and Linux users. */

import type { ReactNode } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Dialog } from '@/components/molecules/Dialog'
import { Skeleton } from '@/components/molecules/Skeleton'
import { PermissionMatrix } from '@/components/organisms/PermissionMatrix'
import { useRole } from '@/features/admin/hooks/useAdmin'
import type { Role } from '@/features/admin/types'
import { useTags } from '@/features/tags/hooks/useTags'

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <dt className="text-text-muted">{label}</dt>
    <dd className="flex min-w-0 flex-wrap gap-1 text-text">{children}</dd>
  </>
)

/** Shows the latest saved copy of `role` (falls back to the list's copy while loading or if that fails). */
const RoleView = ({ role: listed }: { role: Role }) => {
  const { data: latest, isPending } = useRole(listed.roleId)
  const { data: tags } = useTags()
  const tagName = (tagId: number) => tags?.find((t) => t.tagId === tagId)?.tagName ?? `#${tagId}`
  if (isPending)
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading role">
        <Skeleton height={64} />
        <Skeleton height={192} />
      </div>
    )
  const role = latest ?? listed
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
        <Row label="Tags">
          {role.tagIds.length
            ? role.tagIds.map((id) => (
                <Badge key={id} tone="accent" mono>
                  {tagName(id)}
                </Badge>
              ))
            : 'All tags'}
        </Row>
        <Row label="Approvals">
          {role.canApproveApprovals && <Badge tone="signal">Approver</Badge>}
          {role.canBypassApprovals && <Badge tone="warning">Skips approvals</Badge>}
          {!role.canApproveApprovals && !role.canBypassApprovals && 'None'}
        </Row>
        <Row label="Linux users">
          {role.allowedLinuxUsers.length ? <span className="font-mono">{role.allowedLinuxUsers.join(', ')}</span> : 'Any'}
        </Row>
      </dl>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-muted">Permissions · {role.permissions.length} granted</p>
        <PermissionMatrix selected={role.permissions} readOnly />
      </div>
    </div>
  )
}

export const RoleViewDialog = ({
  role,
  onClose,
  actions,
}: {
  /** The role to show; null keeps the dialog closed. */
  role: Role | null
  onClose: () => void
  /** Buttons at the bottom, e.g. Edit / Duplicate / Delete. */
  actions?: ReactNode
}) => (
  <Dialog open={!!role} onClose={onClose} size="xl" title={role?.roleName ?? ''} description={role?.roleDescription || undefined}>
    {role && (
      <>
        <RoleView role={role} />
        {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
      </>
    )}
  </Dialog>
)
