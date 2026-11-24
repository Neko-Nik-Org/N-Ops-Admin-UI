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
 * Organization overview on Account › Organization, using the full page width: a details card on top,
 * then usage meters and plan limits side by side.
 */

import { Building2, Gauge, ListChecks } from 'lucide-react'
import type { ReactNode } from 'react'
import { AccountCard as Card } from '@/pages/account/AccountCard'
import { SkeletonText } from '@/components/Skeleton'
import { Meter } from '@/components/Meter'
import { useOrgInfo } from '@/hooks/useAccount'
import { describeOrgProfile } from '@/utils/orgProfile'
import { formatBytes, formatDate, formatNumber } from '@/utils/format'

/** One label / value pair in the details card. */
const Field = ({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) => (
  <div className={wide ? 'sm:col-span-2 lg:col-span-4' : undefined}>
    <dt className="text-text-muted">{label}</dt>
    <dd className="mt-0.5 break-words whitespace-pre-line text-text">{children}</dd>
  </div>
)

/** One label / value row for a plan limit. */
const Limit = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-baseline justify-between gap-2 border-t border-border py-2.5 text-sm first:border-t-0 first:pt-0">
    <span className="text-text-muted">{label}</span>
    <span className="font-medium text-text">{formatNumber(value)}</span>
  </div>
)

/** Loads `/user/self/org-info` and shows the organization's details, current usage and quotas. */
export const OrgInfoCard = () => {
  const { data: org, isLoading, error } = useOrgInfo()

  if (isLoading || error || !org) {
    return (
      <Card icon={<Building2 size={16} />} title="Organization">
        {isLoading ? (
          <SkeletonText lines={6} />
        ) : (
          <p className="text-sm text-text-muted">Couldn't load organization details: {error?.message ?? 'no data'}</p>
        )}
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card icon={<Building2 size={16} />} title="Organization" className="lg:col-span-3">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Name">
            <span className="font-medium">{org.organizationName}</span>
          </Field>
          <Field label="Created">{formatDate(org.createdAt)}</Field>
          <div className="sm:col-span-2">
            <dt className="text-text-muted">Organization ID</dt>
            <dd className="mt-0.5 font-mono text-xs break-all text-text">{org.organizationId}</dd>
          </div>
          {describeOrgProfile(org.organizationInfo).map(({ key, label, value }) => (
            <Field key={key} label={label} wide={key === 'description' || key === 'address'}>
              {value}
            </Field>
          ))}
        </dl>
      </Card>

      <Card icon={<Gauge size={16} />} title="Usage" className="lg:col-span-2">
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <Meter label="Users" used={org.users.current} total={org.users.limit} />
          <Meter label="Vault projects" used={org.vaultProjects.current} total={org.vaultProjects.limit} />
          <Meter label="AI credits" used={org.aiCredit.used} total={org.aiCredit.allocated} />
          <Meter label="Storage" used={org.storageBytes.used} total={org.storageBytes.allocated} format={formatBytes} />
        </div>
      </Card>

      <Card icon={<ListChecks size={16} />} title="Limits">
        <div>
          <Limit label="Servers" value={org.serverLimit} />
          <Limit label="Workflows" value={org.workflowLimit} />
          <Limit label="Secret keys per vault project" value={org.vaultKeysPerProjectLimit} />
          <Limit label="Notes per vault project" value={org.vaultNotesPerProjectLimit} />
        </div>
      </Card>
    </div>
  )
}
