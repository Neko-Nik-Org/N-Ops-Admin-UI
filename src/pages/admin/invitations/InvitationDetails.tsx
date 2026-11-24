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
 * An invitation, read-only: who it's for, the role and access policy they'll get, and when it
 * expires. Also holds the bits the invitation pages share.
 */

import { Clock, Lock, Mail, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { useAccessPolicies } from '@/hooks/useAccessPolicies'
import { useHasPermissions } from '@/hooks/usePermissions'
import { useRoleOptions } from '@/hooks/useRoles'
import { type Invitation } from '@/types/invitation'
import { formatDateTime, formatRelative, parseIso } from '@/utils/format'

/** Expired invitations linger until the API's cleanup job removes them. */
export const isExpired = (invitation: Invitation, now: number) => (parseIso(invitation.expiresAt)?.getTime() ?? 0) <= now

/** Access policy names by id (null = none); "Policy #id" without `policy:ar:view`. */
export const usePolicyName = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const canViewPolicies = useHasPermissions('policy:ar:view')
  const { data: policies = [] } = useAccessPolicies({ enabled: enabled && canViewPolicies })
  return (policyId: number | null) =>
    policyId === null ? null : (policies.find((p) => p.policyId === policyId)?.policyName ?? `Policy #${policyId}`)
}

/** The revoke confirmation's text. */
export const InvitationRevokeImpact = ({ invitation }: { invitation: Invitation }) => (
  <p>
    Revoke the invitation for <span className="font-mono text-text">{invitation.email}</span>? The link in their email stops
    working. You can send them a new one afterwards.
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
      <div className="flex min-w-0 flex-wrap gap-1 text-sm break-all text-text">{children}</div>
    </div>
  </div>
)

export const InvitationDetails = ({ invitation, now }: { invitation: Invitation; now: number }) => {
  const { roleName } = useRoleOptions()
  const policyName = usePolicyName()
  const policy = policyName(invitation.accessPolicyId)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={<Mail size={17} />} label="Email">
          <span className="font-mono">{invitation.email}</span>
        </Tile>
        <Tile icon={<ShieldCheck size={17} />} label="Role">
          {roleName(invitation.roleId)}
        </Tile>
        <Tile icon={<Lock size={17} />} label="Access policy">
          {policy ?? <span className="text-text-muted">None</span>}
        </Tile>
        <Tile icon={<Clock size={17} />} label="Expires">
          {isExpired(invitation, now) ? (
            <Badge tone="warning">Expired</Badge>
          ) : (
            <span title={formatDateTime(invitation.expiresAt)}>{formatRelative(invitation.expiresAt, '—')}</span>
          )}
        </Tile>
      </div>

      <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-text">Details</h2>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-muted">Sent</dt>
          <dd className="text-text">{formatDateTime(invitation.invitedAt)}</dd>
          <dt className="text-text-muted">Link works until</dt>
          <dd className="text-text">{formatDateTime(invitation.expiresAt)}</dd>
          <dt className="text-text-muted">Note</dt>
          <dd className="whitespace-pre-wrap text-text">
            {invitation.invitationNotes || <span className="text-text-muted">None</span>}
          </dd>
        </dl>
      </section>
    </div>
  )
}
