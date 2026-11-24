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
 * Admin › Access policies (/admin/access-policies): sign-in rules for users — required 2FA and
 * allowed IPs / countries — backed by `/policy/access-restriction/*`.
 */

import { Copy, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { TableSkeleton } from '@/components/molecules/Skeleton'
import { AccessPolicyViewDialog, TwoFactorBadges } from '@/components/organisms/AccessPolicyViewDialog'
import { useAccessPolicies, useAccessPolicyUserCount, useDeleteAccessPolicy } from '@/features/admin/hooks/useAdmin'
import type { AccessPolicy } from '@/features/admin/types'
import { useHasPermissions } from '@/features/auth/permissions'
import { countryName } from '@/constants/countries'
import { usersLabel } from '@/utils/format'
import { lazyNamed, usePreloadWhenIdle } from '@/utils/lazyNamed'

// the editor brings react-hook-form and yup, which the table doesn't need: it loads after it
const AccessPolicyFormDialog = lazyNamed(() => import('@/components/organisms/AccessPolicyFormDialog'), 'AccessPolicyFormDialog')

/** Which dialog is open. `create` with `from` opens the editor pre-filled from another policy. */
type DialogState =
  | { kind: 'closed' }
  | { kind: 'view'; policy: AccessPolicy }
  | { kind: 'create'; from?: AccessPolicy }
  | { kind: 'edit'; policy: AccessPolicy }
  | { kind: 'delete'; policy: AccessPolicy }

/** Shown on a disabled Edit button. */
const NO_UPDATE =
  'Editing access policies needs the “Edit access policies” permission (policy:ar:edit), which your role doesn’t have.'

/** "203.0.113.0/24 +2" — the first entry plus how many more. */
const listSummary = (items: string[]) => (items.length > 1 ? `${items[0]} +${items.length - 1}` : (items[0] ?? ''))

/** The IP / country limits of a policy, for the table. */
const RestrictionBadges = ({ policy }: { policy: AccessPolicy }) => {
  const ip = policy.hasIpRestriction && policy.allowedIps.length > 0
  const geo = policy.hasGeoRestriction && policy.allowedGeoLocations.length > 0
  if (!ip && !geo) return <span className="text-sm text-text-muted">Anywhere</span>
  return (
    <div className="flex max-w-64 flex-wrap gap-1">
      {ip && (
        <Badge tone="accent" mono>
          IP {listSummary(policy.allowedIps)}
        </Badge>
      )}
      {geo && (
        <span title={policy.allowedGeoLocations.map(countryName).join(', ')}>
          <Badge tone="accent" mono>
            {policy.allowedGeoLocations.join(', ')}
          </Badge>
        </span>
      )}
    </div>
  )
}

/** The delete confirmation's text, with how many users have the policy (from `/check/{id}`). */
const DeleteImpact = ({ policy }: { policy: AccessPolicy }) => {
  const { data: count, isPending, isError } = useAccessPolicyUserCount(policy.policyId)
  return (
    <div className="flex flex-col gap-2">
      <p>
        Delete <span className="font-medium text-text">{policy.policyName}</span>? This can't be undone.
      </p>
      {isPending ? (
        <p aria-busy="true">Checking who has this policy…</p>
      ) : isError ? (
        <p>Couldn't check who has this policy. Anyone who has it will be left with no access policy.</p>
      ) : count ? (
        <p className="text-warning">
          {usersLabel(count)} {count === 1 ? 'has' : 'have'} this policy. They'll be left with no access policy, so its 2FA and
          sign-in limits stop applying to them.
        </p>
      ) : (
        <p>No users have this policy.</p>
      )}
    </div>
  )
}

/** Access policies table. Actions follow the `policy:ar:*` permissions. */
export const AdminAccessPoliciesPage = () => {
  const canView = useHasPermissions('policy:ar:view')
  const canCreate = useHasPermissions('policy:ar:view', 'policy:ar:create')
  const canUpdate = useHasPermissions('policy:ar:view', 'policy:ar:edit')
  const canDelete = useHasPermissions('policy:ar:view', 'policy:ar:delete')
  const { data: policies, isLoading, error } = useAccessPolicies({ enabled: canView })
  const { mutateAsync: remove } = useDeleteAccessPolicy()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })
  const [search, setSearch] = useState('')
  const close = () => setDialog({ kind: 'closed' })
  usePreloadWhenIdle(canView && (canCreate || canUpdate), AccessPolicyFormDialog.preload)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (policies ?? []).filter(
      (p) =>
        !q ||
        `${p.policyName} ${p.policyDescription} ${p.allowedIps.join(' ')} ${p.allowedGeoLocations.map((c) => `${c} ${countryName(c)}`).join(' ')}`
          .toLowerCase()
          .includes(q),
    )
  }, [policies, search])

  /** A copy starts as a new policy with the same rules and a "(copy)" name. */
  const template =
    dialog.kind === 'create' && dialog.from ? { ...dialog.from, policyName: `${dialog.from.policyName} (copy)` } : undefined

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Access policies"
        actions={
          canCreate && (
            <LoadingButton icon={<Plus size={15} />} onClick={() => setDialog({ kind: 'create' })}>
              New policy
            </LoadingButton>
          )
        }
      />

      {!canView ? (
        <p className="text-sm text-text-muted">
          You need the “View access policies” permission (policy:ar:view) to see access policies.
        </p>
      ) : isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : error ? (
        <p className="text-sm text-text-muted">Couldn't load access policies: {error.message}</p>
      ) : (
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search policies, IPs or countries"
            className="mb-4 max-w-md"
          />
          {!visible.length ? (
            <p className="py-10 text-center text-sm text-text-muted">
              {policies?.length ? 'No policies match.' : 'No access policies yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-text-muted uppercase">
                    <th className="pb-2 font-medium">Policy</th>
                    <th className="pb-2 font-medium">Required 2FA</th>
                    <th className="pb-2 font-medium">Sign-in from</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((policy) => (
                    <tr key={policy.policyId} className="border-t border-border align-top">
                      <td className="max-w-xs py-3">
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'view', policy })}
                          className="text-left text-sm font-medium text-text hover:text-signal hover:underline"
                        >
                          {policy.policyName}
                        </button>
                        <p className="text-xs text-text-muted">{policy.policyDescription || '—'}</p>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          <TwoFactorBadges policy={policy} />
                          {!policy.enforceTotp2fa && !policy.enforceEmail2fa && (
                            <span className="text-sm text-text-muted">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <RestrictionBadges policy={policy} />
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            icon={<Eye size={14} />}
                            aria-label={`View ${policy.policyName}`}
                            title="View"
                            onClick={() => setDialog({ kind: 'view', policy })}
                          />
                          {canCreate && (
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Copy size={14} />}
                              aria-label={`Duplicate ${policy.policyName}`}
                              title="Duplicate"
                              onClick={() => setDialog({ kind: 'create', from: policy })}
                            />
                          )}
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={14} />}
                            aria-label={`Edit ${policy.policyName}`}
                            title={canUpdate ? 'Edit' : NO_UPDATE}
                            disabled={!canUpdate}
                            onClick={() => setDialog({ kind: 'edit', policy })}
                          />
                          {canDelete && (
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={14} />}
                              aria-label={`Delete ${policy.policyName}`}
                              title="Delete"
                              onClick={() => setDialog({ kind: 'delete', policy })}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <AccessPolicyViewDialog
        policy={dialog.kind === 'view' ? dialog.policy : null}
        onClose={close}
        actions={
          dialog.kind === 'view' && (
            <>
              {canDelete && (
                <LoadingButton
                  variant="ghost"
                  icon={<Trash2 size={15} />}
                  onClick={() => setDialog({ kind: 'delete', policy: dialog.policy })}
                >
                  Delete
                </LoadingButton>
              )}
              {canCreate && (
                <LoadingButton
                  variant="secondary"
                  icon={<Copy size={15} />}
                  onClick={() => setDialog({ kind: 'create', from: dialog.policy })}
                >
                  Duplicate
                </LoadingButton>
              )}
              <LoadingButton
                icon={<Pencil size={15} />}
                disabled={!canUpdate}
                title={canUpdate ? undefined : NO_UPDATE}
                onClick={() => setDialog({ kind: 'edit', policy: dialog.policy })}
              >
                Edit
              </LoadingButton>
            </>
          )
        }
      />
      <Suspense fallback={null}>
        {(dialog.kind === 'create' || dialog.kind === 'edit') && (
          <AccessPolicyFormDialog
            // a copy must save as a new policy, so it's passed as a template, not as the policy being edited
            key={dialog.kind === 'create' && dialog.from ? `copy-${dialog.from.policyId}` : dialog.kind}
            open
            policy={dialog.kind === 'edit' ? dialog.policy : undefined}
            template={template}
            onClose={close}
          />
        )}
      </Suspense>
      <ConfirmDialog
        open={dialog.kind === 'delete'}
        title="Delete access policy"
        confirmLabel="Delete policy"
        successMessage={dialog.kind === 'delete' ? `Deleted ${dialog.policy.policyName}.` : ''}
        onConfirm={() => (dialog.kind === 'delete' ? remove(dialog.policy.policyId) : Promise.resolve())}
        onClose={close}
      >
        {dialog.kind === 'delete' && <DeleteImpact policy={dialog.policy} />}
      </ConfirmDialog>
    </div>
  )
}
