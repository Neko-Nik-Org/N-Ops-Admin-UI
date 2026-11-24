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
/** "Your access" card on Account › Security: what the signed-in user's role allows. */

import { useAtomValue } from 'jotai'
import { ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { AccountCard } from '@/pages/account/AccountCard'
import { PermissionMatrix } from '@/components/PermissionMatrix'
import { PERMISSION_MATRIX, rowKeys } from '@/constants/permissions'
import { currentUserAtom } from '@/store/session'
import { useTags } from '@/hooks/useTags'

/** One labelled row of the card. */
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-1 gap-1.5 border-t border-border py-3 first:border-t-0 first:pt-0 sm:grid-cols-[9rem_1fr]">
    <dt className="text-sm text-text-muted">{label}</dt>
    <dd className="flex min-w-0 flex-wrap gap-1.5 text-sm text-text">{children}</dd>
  </div>
)

const Muted = ({ children }: { children: ReactNode }) => <span className="text-text-muted">{children}</span>

/**
 * Tags, Linux users, approval rights and a permission matrix (as on the role page), from the
 * profile loaded at startup (`/user/self/profile`). Renders nothing if the profile is unknown.
 */
export const AccessCard = ({ className }: { className?: string }) => {
  const user = useAtomValue(currentUserAtom)
  const { data: tags } = useTags()
  if (!user) return null

  const known = new Set(PERMISSION_MATRIX.flatMap((s) => s.rows.flatMap(rowKeys)))
  // permissions the API grants that this UI doesn't know about yet
  const other = user.permissions.filter((p) => !known.has(p))
  const tagName = (id: number) => tags?.find((t) => t.tagId === id)?.tagName ?? `#${id}`
  const scopeLoaded = user.allowedLinuxUsers !== undefined

  return (
    <AccountCard
      icon={<ShieldCheck size={16} />}
      title="Your access"
      description="What your role lets you do. An admin can change it on the Roles page."
      className={className}
    >
      <dl>
        <Row label="Tags">
          {user.tags.length ? (
            user.tags.map((id) => (
              <Badge key={id} tone="accent" mono>
                {tagName(id)}
              </Badge>
            ))
          ) : (
            <Muted>All tags</Muted>
          )}
        </Row>
        {scopeLoaded && (
          <>
            <Row label="Linux users">
              {user.allowedLinuxUsers?.length ? (
                user.allowedLinuxUsers.map((u) => (
                  <Badge key={u} tone="neutral" mono>
                    {u}
                  </Badge>
                ))
              ) : (
                <Muted>Any</Muted>
              )}
            </Row>
            <Row label="Approvals">
              {user.canApproveApprovals && <Badge tone="signal">Can approve requests</Badge>}
              {user.canBypassApprovals && <Badge tone="warning">Skips approvals</Badge>}
              {!user.canApproveApprovals && !user.canBypassApprovals && <Muted>Needs approval for sensitive actions</Muted>}
            </Row>
          </>
        )}
      </dl>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text">Permissions · {user.permissions.length} granted</h3>
        <PermissionMatrix selected={user.permissions} readOnly emptyText="Your role has no permissions." />
        {other.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="mr-1 text-xs font-medium tracking-wide text-text-muted uppercase">Other</span>
            {other.map((p) => (
              <Badge key={p} tone="neutral" mono>
                {p}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </AccountCard>
  )
}
