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
 * Admin › Organization (/admin/organization): the organization's profile and plan usage, from
 * `GET /user/self/org-info`. Read-only: the API has no endpoint for changing the organization yet
 * (the super-admin API can list and read organizations, but not update them).
 */

import type { ReactNode } from 'react'
import { Meter } from '@/components/molecules/Meter'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SkeletonText } from '@/components/molecules/Skeleton'
import { useOrgInfo } from '@/features/account/hooks/useAccount'
import { describeOrgProfile } from '@/features/account/orgProfile'
import type { OrgInfo } from '@/features/account/types'
import { formatBytes, formatDate, formatNumber } from '@/utils/format'

/** One label / value pair in the profile. */
const Field = ({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) => (
  <div className={wide ? 'flex flex-col gap-0.5 sm:col-span-2' : 'flex flex-col gap-0.5'}>
    <dt className="text-sm text-text-muted">{label}</dt>
    <dd className="text-sm break-words text-text">{children}</dd>
  </div>
)

/** Name, id, creation date and whatever the operator stored in `organization_info`. */
const ProfileCard = ({ org }: { org: OrgInfo }) => {
  const extra = describeOrgProfile(org.organizationInfo)
  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <h2 className="mb-1 font-semibold text-text">Profile</h2>
      <p className="mb-4 text-sm text-text-muted">Set by your N-Ops operator. It can't be changed from here yet.</p>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <span className="font-medium">{org.organizationName}</span>
        </Field>
        <Field label="Created">{formatDate(org.createdAt)}</Field>
        <Field label="Organization ID" wide>
          <span className="font-mono text-xs break-all">{org.organizationId}</span>
        </Field>
        {extra.map(({ key, label, value }) => (
          <Field key={key} label={label} wide={key === 'description' || key === 'address'}>
            <span className="whitespace-pre-line">{value}</span>
          </Field>
        ))}
      </dl>
    </section>
  )
}

/** One plan limit that has no usage figure in the API. */
const Limit = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-baseline justify-between gap-2 border-t border-border py-2.5 text-sm first:border-t-0">
    <dt className="text-text-muted">{label}</dt>
    <dd className="text-text">{formatNumber(value)}</dd>
  </div>
)

/** Usage against the plan's limits; the limits themselves are set by the N-Ops operator, not here. */
const PlanCard = ({ org }: { org: OrgInfo }) => (
  <section className="rounded-xl border border-border bg-surface-raised p-5">
    <h2 className="mb-1 font-semibold text-text">Plan and usage</h2>
    <p className="mb-5 text-sm text-text-muted">Limits are set on your plan. Contact your N-Ops operator to raise them.</p>
    <div className="flex flex-col gap-4">
      <Meter label="Users" used={org.users.current} total={org.users.limit} />
      <Meter label="Vault projects" used={org.vaultProjects.current} total={org.vaultProjects.limit} />
      <Meter label="AI credits" used={org.aiCredit.used} total={org.aiCredit.allocated} />
      <Meter label="Storage" used={org.storageBytes.used} total={org.storageBytes.allocated} format={formatBytes} />
    </div>
    <dl className="mt-5 border-t border-border pt-3">
      <Limit label="Servers" value={org.serverLimit} />
      <Limit label="Workflows" value={org.workflowLimit} />
      <Limit label="Secret keys per vault project" value={org.vaultKeysPerProjectLimit} />
      <Limit label="Notes per vault project" value={org.vaultNotesPerProjectLimit} />
    </dl>
  </section>
)

/** Profile next to plan usage. */
export const AdminOrganizationPage = () => {
  const { data: org, isLoading, error } = useOrgInfo()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Organization" />
      {isLoading ? (
        <SkeletonText lines={8} />
      ) : error || !org ? (
        <p className="text-sm text-text-muted">Couldn't load the organization: {error?.message ?? 'no data'}</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <ProfileCard org={org} />
          <PlanCard org={org} />
        </div>
      )}
    </div>
  )
}
