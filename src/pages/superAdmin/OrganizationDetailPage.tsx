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
/** Super admin › one organization (/super-admin/organizations/:organizationId), fresh from the API. */

import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/atoms/Badge'
import { CopyButton } from '@/components/molecules/CopyButton'
import { Meter } from '@/components/molecules/Meter'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SkeletonText } from '@/components/molecules/Skeleton'
import { ROUTES } from '@/constants/routes'
import { useOrganization } from '@/features/superAdmin/hooks/useOrganizations'
import { formatBytes, formatDateTime, formatNumber } from '@/utils/format'

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5">
    <h2 className="font-semibold text-text">{title}</h2>
    {children}
  </section>
)

const Limit = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-baseline justify-between gap-2 border-t border-border py-2 text-sm first:border-t-0 first:pt-0">
    <dt className="text-text-muted">{label}</dt>
    <dd className="font-medium text-text">{formatNumber(value)}</dd>
  </div>
)

/** "contact_email" → "Contact email". */
const humanize = (key: string) => {
  const words = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const show = (value: unknown) => (typeof value === 'string' ? value || '—' : value === null ? '—' : JSON.stringify(value))

export const OrganizationDetailPage = () => {
  const { organizationId = '' } = useParams()
  const { data: org, isLoading, error } = useOrganization(organizationId)

  const back = (
    <Link to={ROUTES.superAdmin} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
      <ArrowLeft size={14} aria-hidden="true" /> All organizations
    </Link>
  )

  if (isLoading)
    return (
      <>
        {back}
        <SkeletonText lines={8} />
      </>
    )
  if (error || !org)
    return (
      <>
        {back}
        <p className="text-sm text-text-muted">{error?.message ?? "Couldn't load this organization."}</p>
      </>
    )

  const profile = Object.entries(org.organizationInfo)
  return (
    <>
      {back}
      <PageHeader
        title={org.organizationName}
        badge={<Badge tone={org.isActive ? 'signal' : 'neutral'}>{org.isActive ? 'Active' : 'Disabled'}</Badge>}
      />
      <p className="-mt-4 flex items-center gap-2 font-mono text-xs text-text-muted">
        {org.organizationId} <CopyButton text={org.organizationId} label="Copy organization id" />
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Usage">
          <Meter label="Storage" used={org.storageBytes.used} total={org.storageBytes.allocated} format={formatBytes} />
          <Meter label="AI credit" used={org.aiCredit.used} total={org.aiCredit.allocated} />
          <p className="text-xs text-text-muted">Created {formatDateTime(org.createdAt)}</p>
        </Card>
        <Card title="Plan limits">
          <dl>
            <Limit label="Users" value={org.userLimit} />
            <Limit label="Servers" value={org.serverLimit} />
            <Limit label="Workflows" value={org.workflowLimit} />
            <Limit label="Vault projects" value={org.vaultProjectLimit} />
            <Limit label="Vault keys per project" value={org.vaultKeysPerProjectLimit} />
            <Limit label="Vault notes" value={org.vaultNotesLimit} />
          </dl>
        </Card>
        <Card title="Profile">
          {profile.length ? (
            <dl className="flex flex-col gap-3">
              {profile.map(([key, value]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <dt className="text-sm text-text-muted">{humanize(key)}</dt>
                  <dd className="text-sm break-words text-text">{show(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-text-muted">No profile details saved.</p>
          )}
        </Card>
      </div>
      <p className="text-xs text-text-muted">
        Creating, editing, enabling and deleting organizations aren't in the API yet, so this is read-only.
      </p>
    </>
  )
}
