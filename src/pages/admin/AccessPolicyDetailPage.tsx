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
/** Admin › Access policies › one policy (/admin/access-policies/:policyId): its rules, with Edit, Duplicate and Delete. */

import { Copy, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SkeletonText } from '@/components/molecules/Skeleton'
import { PageToolbar, type Crumb } from '@/components/molecules/PageToolbar'
import { AccessPolicyDeleteImpact, AccessPolicyDetails, NO_POLICY_EDIT } from '@/components/organisms/AccessPolicyDetails'
import { accessPolicyEditPath, newAccessPolicyPath, ROUTES } from '@/constants/routes'
import { useAccessPolicy, useDeleteAccessPolicy } from '@/features/admin/hooks/useAdmin'
import { useHasPermissions } from '@/features/auth/permissions'
import { errorStatus } from '@/types/api'

/** "Access policies › <current>". */
const crumbs = (current: string): Crumb[] => [{ label: 'Access policies', to: ROUTES.adminAccessPolicies }, { label: current }]

export const AccessPolicyDetailPage = () => {
  const policyId = Number(useParams().policyId)
  const valid = Number.isInteger(policyId) && policyId > 0
  const canView = useHasPermissions('policy:ar:view')
  const canCreate = useHasPermissions('policy:ar:view', 'policy:ar:create')
  const canUpdate = useHasPermissions('policy:ar:view', 'policy:ar:edit')
  const canDelete = useHasPermissions('policy:ar:view', 'policy:ar:delete')
  const { data: policy, isLoading, error } = useAccessPolicy(valid && canView ? policyId : null)
  const { mutateAsync: remove } = useDeleteAccessPolicy()
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  if (!canView)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Policy')} back={ROUTES.adminAccessPolicies} />
        <p className="text-sm text-text-muted">
          You need the “View access policies” permission (policy:ar:view) to see access policies.
        </p>
      </div>
    )
  if (valid && isLoading) return <SkeletonText lines={6} />
  if (!valid || error || !policy)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Not found')} back={ROUTES.adminAccessPolicies} />
        <p className="text-sm text-text-muted">
          {!valid || errorStatus(error) === 404
            ? "There's no access policy here. It may have been deleted."
            : `Couldn't load this policy: ${error?.message ?? 'no data'}`}
        </p>
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageToolbar
          crumbs={crumbs(policy.policyName)}
          back={ROUTES.adminAccessPolicies}
          actions={
            <>
              {canDelete && (
                <LoadingButton variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleting(true)}>
                  Delete
                </LoadingButton>
              )}
              {canCreate && (
                <LoadingButton
                  variant="secondary"
                  size="sm"
                  icon={<Copy size={14} />}
                  onClick={() => navigate(newAccessPolicyPath(policy.policyId))}
                >
                  Duplicate
                </LoadingButton>
              )}
              <LoadingButton
                size="sm"
                icon={<Pencil size={14} />}
                disabled={!canUpdate}
                title={canUpdate ? undefined : NO_POLICY_EDIT}
                onClick={() => navigate(accessPolicyEditPath(policy.policyId))}
              >
                Edit
              </LoadingButton>
            </>
          }
        />
        <PageHeader title={policy.policyName} showTitle description={policy.policyDescription || undefined} />
      </div>

      <AccessPolicyDetails policy={policy} />

      <ConfirmDialog
        open={deleting}
        title="Delete access policy"
        confirmLabel="Delete policy"
        successMessage={`Deleted ${policy.policyName}.`}
        onConfirm={() => remove(policy.policyId).then(() => setTimeout(() => navigate(ROUTES.adminAccessPolicies), 500))}
        onClose={() => setDeleting(false)}
      >
        <AccessPolicyDeleteImpact policy={policy} />
      </ConfirmDialog>
    </div>
  )
}
