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
 * Admin › Invitations (/admin/invitations): pending invitations to join the organization, backed by
 * `/invite/*`. Invitations can be sent and revoked; the API has no edit or re-send.
 */

import { Send, Trash2 } from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import { Badge } from '@/components/Badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingButton } from '@/components/LoadingButton'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { TableSkeleton } from '@/components/Skeleton'
import { useAccessPolicies } from '@/hooks/useAccessPolicies'
import { useDeleteInvitation, useInvitations } from '@/hooks/useInvitations'
import { useRoleOptions } from '@/hooks/useRoles'
import { type Invitation } from '@/types/invitation'
import { useHasPermissions } from '@/hooks/usePermissions'
import { formatDateTime, formatRelative, parseIso } from '@/utils/format'
import { lazyNamed, usePreloadWhenIdle } from '@/utils/lazyNamed'

// the form brings react-hook-form and yup, which the table doesn't need: it loads after it
const InvitationFormDialog = lazyNamed(() => import('@/pages/admin/invitations/InvitationFormDialog'), 'InvitationFormDialog')

/** Expired invitations linger until the API's cleanup job removes them. */
const isExpired = (invitation: Invitation, now: number) => (parseIso(invitation.expiresAt)?.getTime() ?? 0) <= now

/** Pending invitations table. Actions follow the `user:invite:*` permissions. */
export const AdminInvitationsPage = () => {
  const canView = useHasPermissions('user:invite:view')
  // the API checks user:create too, since accepting creates a user
  const canSend = useHasPermissions('user:invite:create', 'user:create')
  const canRevoke = useHasPermissions('user:invite:view', 'user:invite:delete')
  const canViewPolicies = useHasPermissions('policy:ar:view')
  const { data: invitations, isLoading, error } = useInvitations({ enabled: canView })
  const { roleName } = useRoleOptions()
  const { data: policies = [] } = useAccessPolicies({ enabled: canView && canViewPolicies })
  const { mutateAsync: revoke } = useDeleteInvitation()
  const [sending, setSending] = useState(false)
  const [revoking, setRevoking] = useState<Invitation | null>(null)
  const [search, setSearch] = useState('')
  // when the page opened; good enough for marking expired rows, which the API soon removes
  const [now] = useState(Date.now)
  usePreloadWhenIdle(canSend, InvitationFormDialog.preload)

  const policyName = (policyId: number | null) =>
    policyId === null ? null : (policies.find((p) => p.policyId === policyId)?.policyName ?? `Policy #${policyId}`)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (invitations ?? []).filter((i) => !q || `${i.email} ${i.invitationNotes}`.toLowerCase().includes(q))
  }, [invitations, search])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invitations"
        actions={
          canSend && (
            <LoadingButton icon={<Send size={15} />} onClick={() => setSending(true)}>
              Invite someone
            </LoadingButton>
          )
        }
      />

      {!canView ? (
        <p className="text-sm text-text-muted">
          You need the “View invitations” permission (user:invite:view) to see invitations.
        </p>
      ) : isLoading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : error ? (
        <p className="text-sm text-text-muted">Couldn't load invitations: {error.message}</p>
      ) : (
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by email or note" className="mb-4 max-w-md" />
          {!visible.length ? (
            <p className="py-10 text-center text-sm text-text-muted">
              {invitations?.length ? 'No invitations match.' : 'No pending invitations.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-text-muted uppercase">
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Access policy</th>
                    <th className="pb-2 font-medium">Sent</th>
                    <th className="pb-2 font-medium">Expires</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((invitation) => {
                    const policy = policyName(invitation.accessPolicyId)
                    return (
                      <tr key={invitation.invitationId} className="border-t border-border align-top">
                        <td className="max-w-xs py-3">
                          <p className="font-mono text-sm text-text">{invitation.email}</p>
                          {invitation.invitationNotes && (
                            <p className="truncate text-xs text-text-muted" title={invitation.invitationNotes}>
                              {invitation.invitationNotes}
                            </p>
                          )}
                        </td>
                        <td className="py-3 text-sm">{roleName(invitation.roleId)}</td>
                        <td className="py-3 text-sm">{policy ?? <span className="text-text-muted">None</span>}</td>
                        <td className="py-3 text-sm text-text-muted" title={formatDateTime(invitation.invitedAt)}>
                          {formatRelative(invitation.invitedAt, '—')}
                        </td>
                        <td className="py-3 text-sm" title={formatDateTime(invitation.expiresAt)}>
                          {isExpired(invitation, now) ? (
                            <Badge tone="warning">Expired</Badge>
                          ) : (
                            formatRelative(invitation.expiresAt, '—')
                          )}
                        </td>
                        <td className="py-3">
                          {canRevoke && (
                            <div className="flex justify-end">
                              <LoadingButton
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 size={14} />}
                                aria-label={`Revoke invitation for ${invitation.email}`}
                                title="Revoke"
                                onClick={() => setRevoking(invitation)}
                              />
                            </div>
                          )}
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

      <Suspense fallback={null}>{sending && <InvitationFormDialog open onClose={() => setSending(false)} />}</Suspense>
      <ConfirmDialog
        open={revoking !== null}
        title="Revoke invitation"
        confirmLabel="Revoke invitation"
        successMessage={revoking ? `Revoked the invitation for ${revoking.email}.` : ''}
        onConfirm={() => (revoking ? revoke(revoking.invitationId) : Promise.resolve())}
        onClose={() => setRevoking(null)}
      >
        {revoking && (
          <p>
            Revoke the invitation for <span className="font-mono text-text">{revoking.email}</span>? The link in their email stops
            working. You can send them a new one afterwards.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
