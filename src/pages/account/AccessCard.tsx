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
/** "Your access" card on the Account page: what the signed-in user's role allows. */

import { useAtomValue } from 'jotai'
import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { PERMISSION_GROUPS } from '@/constants/permissions'
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
 * Permissions (grouped as in the role editor), tags, Linux users and approval rights, from the
 * profile loaded at startup (`/user/self/profile`). Renders nothing if the profile is unknown.
 */
export const AccessCard = () => {
  const user = useAtomValue(currentUserAtom)
  const { data: tags } = useTags()
  if (!user) return null

  const known = new Set(PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key)))
  const groups = PERMISSION_GROUPS.map((g) => ({
    label: g.label,
    held: g.permissions.filter((p) => user.permissions.includes(p.key)),
  })).filter((g) => g.held.length)
  // permissions the API grants that this UI doesn't know about yet
  const other = user.permissions.filter((p) => !known.has(p))
  const tagName = (id: number) => tags?.find((t) => t.tagId === id)?.tagName ?? `#${id}`
  const scopeLoaded = user.allowedLinuxUsers !== undefined

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <h2 className="mb-1 font-semibold text-text">Your access</h2>
      <p className="mb-4 text-sm text-text-muted">What your role lets you do. An admin can change it on the Roles page.</p>
      <dl>
        <Row label="Permissions">
          {groups.length || other.length ? (
            <ul className="flex w-full flex-col gap-2">
              {groups.map((g) => (
                <li key={g.label} className="flex flex-wrap items-baseline gap-1.5">
                  <span className="mr-1 text-xs font-medium tracking-wide text-text-muted uppercase">{g.label}</span>
                  {g.held.map((p) => (
                    <Badge key={p.key} tone="neutral">
                      <span title={p.key}>{p.label}</span>
                    </Badge>
                  ))}
                </li>
              ))}
              {other.length > 0 && (
                <li className="flex flex-wrap items-baseline gap-1.5">
                  <span className="mr-1 text-xs font-medium tracking-wide text-text-muted uppercase">Other</span>
                  {other.map((p) => (
                    <Badge key={p} tone="neutral" mono>
                      {p}
                    </Badge>
                  ))}
                </li>
              )}
            </ul>
          ) : (
            <Muted>None</Muted>
          )}
        </Row>
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
    </section>
  )
}
