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
 * Admin › Access policies › new or edit (/admin/access-policies/new[?from=<id>] and
 * /admin/access-policies/:policyId/edit): the policy form as its own page.
 */

import { useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SkeletonText } from '@/components/molecules/Skeleton'
import { PageToolbar } from '@/components/molecules/PageToolbar'
import { AccessPolicyForm } from '@/components/organisms/AccessPolicyForm'
import { accessPolicyPath, ROUTES } from '@/constants/routes'
import { useGoBack } from '@/hooks/useGoBack'
import { useAccessPolicy } from '@/features/admin/hooks/useAdmin'
import { useHasPermissions } from '@/features/auth/permissions'
import { errorStatus } from '@/types/api'

/** A positive whole-number id from the URL, else null. */
const idFrom = (value: string | null | undefined) => {
  const n = Number(value)
  return value && Number.isInteger(n) && n > 0 ? n : null
}

export const AccessPolicyFormPage = () => {
  const params = useParams()
  const [search] = useSearchParams()
  const editing = params.policyId !== undefined
  const editId = idFrom(params.policyId)
  const fromId = editing ? null : idFrom(search.get('from'))
  const canSave = useHasPermissions('policy:ar:view', editing ? 'policy:ar:edit' : 'policy:ar:create')
  // the policy being edited, or the one being duplicated
  const sourceId = editing ? editId : fromId
  const { data: source, isLoading, error } = useAccessPolicy(canSave ? sourceId : null)

  const title = editing ? (source ? `Edit ${source.policyName}` : 'Edit policy') : 'New access policy'
  // where Back, Cancel and a save lead when the page was opened directly; otherwise they return to the previous page
  const fallback = editing && editId ? accessPolicyPath(editId) : ROUTES.adminAccessPolicies
  const back = useGoBack(fallback)

  const header = (
    <div className="flex flex-col gap-1">
      <PageToolbar crumbs={[{ label: 'Access policies', to: ROUTES.adminAccessPolicies }, { label: title }]} back={fallback} />
      {/* the path above names the page; the heading is for screen readers */}
      <PageHeader title={title} />
    </div>
  )

  if (!canSave)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="text-sm text-text-muted">
          {editing
            ? 'Editing access policies needs the “Edit access policies” permission (policy:ar:edit).'
            : 'Creating access policies needs the “Create access policies” permission (policy:ar:create).'}
        </p>
      </div>
    )
  if (sourceId && isLoading) return <SkeletonText lines={8} />
  if (editing && (!editId || error || !source))
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="text-sm text-text-muted">
          {!editId || errorStatus(error) === 404
            ? "There's no access policy here. It may have been deleted."
            : `Couldn't load this policy: ${error?.message ?? 'no data'}`}
        </p>
      </div>
    )

  // a copy starts as a new policy with the same rules and a "(copy)" name
  const template = !editing && source ? { ...source, policyName: `${source.policyName} (copy)` } : undefined

  return (
    <div className="flex flex-col gap-6">
      {header}
      <AccessPolicyForm
        key={`${editId ?? 'new'}-${fromId ?? ''}`}
        policy={editing ? source : undefined}
        template={template}
        // back to where the user came from (opened directly: the policy, or the list for a new one, whose id the API doesn't return)
        onSaved={back}
        onCancel={back}
      />
    </div>
  )
}
