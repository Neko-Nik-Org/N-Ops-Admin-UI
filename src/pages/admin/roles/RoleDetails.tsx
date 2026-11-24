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
 * A role, read-only: at-a-glance tiles (permissions, tags, approvals, Linux users) and the same
 * permission matrix the editor uses. Also holds the hints the role pages share.
 */

import { CheckCircle2, KeyRound, Tags, Terminal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { ALL_PERMISSIONS } from '@/constants/permissions'
import { useTags } from '@/hooks/useTags'
import { PermissionMatrix } from '@/components/PermissionMatrix'
import { type Role } from '@/types/role'

/** Shown on edit / delete buttons for a role wider than the signed-in user's own access. */
export const OUT_OF_SCOPE = 'This role has permissions or tags your own role lacks, so you can’t change it.'

/** Shown on a disabled Edit button. */
export const NO_ROLE_EDIT = 'Editing roles needs the “Edit roles” permission (user:role:edit), which your role doesn’t have.'

/** The delete confirmation's text. */
export const RoleDeleteImpact = ({ role }: { role: Role }) => (
  <p>
    Delete <span className="font-medium text-text">{role.roleName}</span>? A role that any user still has can't be deleted: move
    those users to another role first. This can't be undone.
  </p>
)

/** One at-a-glance figure. */
const Tile = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => (
  <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised p-4">
    <span
      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-signal/10 text-signal"
      aria-hidden="true"
    >
      {icon}
    </span>
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-xs tracking-wide text-text-muted uppercase">{label}</p>
      <div className="flex min-w-0 flex-wrap gap-1 text-sm text-text">{children}</div>
    </div>
  </div>
)

export const RoleDetails = ({ role }: { role: Role }) => {
  const { data: tags } = useTags()
  const tagName = (tagId: number) => tags?.find((t) => t.tagId === tagId)?.tagName ?? `#${tagId}`
  const all = role.permissions.length === ALL_PERMISSIONS.length

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={<KeyRound size={17} />} label="Permissions">
          <span className="text-lg font-semibold">{all ? 'All' : `${role.permissions.length} of ${ALL_PERMISSIONS.length}`}</span>
        </Tile>
        <Tile icon={<Tags size={17} />} label="Tags">
          {role.tagIds.length
            ? role.tagIds.map((id) => (
                <Badge key={id} tone="accent" mono>
                  {tagName(id)}
                </Badge>
              ))
            : 'All tags'}
        </Tile>
        <Tile icon={<CheckCircle2 size={17} />} label="Approvals">
          {role.canApproveApprovals && <Badge tone="signal">Approver</Badge>}
          {role.canBypassApprovals && <Badge tone="warning">Skips approvals</Badge>}
          {!role.canApproveApprovals && !role.canBypassApprovals && <span className="text-text-muted">None</span>}
        </Tile>
        <Tile icon={<Terminal size={17} />} label="Linux users">
          {role.allowedLinuxUsers.length ? <span className="font-mono">{role.allowedLinuxUsers.join(', ')}</span> : 'Any'}
        </Tile>
      </div>

      <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-text">Permissions · {role.permissions.length} granted</h2>
        <PermissionMatrix selected={role.permissions} readOnly />
      </section>
    </div>
  )
}
