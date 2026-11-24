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
 * allowed IPs / countries — backed by `/policy/access-restriction/*`. Viewing, creating and editing a
 * policy each open their own page; deleting asks in a dialog.
 */

import { Copy, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/atoms/Badge'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { TableSkeleton } from '@/components/molecules/Skeleton'
import { AccessPolicyDeleteImpact, NO_POLICY_EDIT, TwoFactorBadges } from '@/components/organisms/AccessPolicyDetails'
import { accessPolicyEditPath, accessPolicyPath, newAccessPolicyPath } from '@/constants/routes'
import { useAccessPolicies, useDeleteAccessPolicy } from '@/features/admin/hooks/useAdmin'
import type { AccessPolicy } from '@/features/admin/types'
import { useHasPermissions } from '@/features/auth/permissions'
import { countryName } from '@/constants/countries'

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

/** Access policies table. Actions follow the `policy:ar:*` permissions. */
export const AdminAccessPoliciesPage = () => {
  const canView = useHasPermissions('policy:ar:view')
  const canCreate = useHasPermissions('policy:ar:view', 'policy:ar:create')
  const canUpdate = useHasPermissions('policy:ar:view', 'policy:ar:edit')
  const canDelete = useHasPermissions('policy:ar:view', 'policy:ar:delete')
  const { data: policies, isLoading, error } = useAccessPolicies({ enabled: canView })
  const { mutateAsync: remove } = useDeleteAccessPolicy()
  const [deleting, setDeleting] = useState<AccessPolicy | null>(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Access policies"
        actions={
          canCreate && (
            <LoadingButton icon={<Plus size={15} />} onClick={() => navigate(newAccessPolicyPath())}>
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
                        <Link
                          to={accessPolicyPath(policy.policyId)}
                          className="text-left text-sm font-medium text-text hover:text-signal hover:underline"
                        >
                          {policy.policyName}
                        </Link>
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
                            onClick={() => navigate(accessPolicyPath(policy.policyId))}
                          />
                          {canCreate && (
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Copy size={14} />}
                              aria-label={`Duplicate ${policy.policyName}`}
                              title="Duplicate"
                              onClick={() => navigate(newAccessPolicyPath(policy.policyId))}
                            />
                          )}
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={14} />}
                            aria-label={`Edit ${policy.policyName}`}
                            title={canUpdate ? 'Edit' : NO_POLICY_EDIT}
                            disabled={!canUpdate}
                            onClick={() => navigate(accessPolicyEditPath(policy.policyId))}
                          />
                          {canDelete && (
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={14} />}
                              aria-label={`Delete ${policy.policyName}`}
                              title="Delete"
                              onClick={() => setDeleting(policy)}
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

      <ConfirmDialog
        open={deleting !== null}
        title="Delete access policy"
        confirmLabel="Delete policy"
        successMessage={deleting ? `Deleted ${deleting.policyName}.` : ''}
        onConfirm={() => (deleting ? remove(deleting.policyId) : Promise.resolve())}
        onClose={() => setDeleting(null)}
      >
        {deleting && <AccessPolicyDeleteImpact policy={deleting} />}
      </ConfirmDialog>
    </div>
  )
}
