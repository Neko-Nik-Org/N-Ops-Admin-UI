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

/** Organization card on the Account page: usage meters and plan limits. */

import { SkeletonText } from '@/components/loading'
import { Meter } from '@/components/molecules/Meter'
import { useOrgInfo } from '@/features/account/hooks/useAccount'
import { formatBytes, formatDate, formatNumber } from '@/utils/format'

/** One label / value row for a plan limit. */
const Limit = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-baseline justify-between gap-2 border-t border-border py-2.5 text-sm first:border-t-0">
    <span className="text-text-muted">{label}</span>
    <span className="text-text">{formatNumber(value)}</span>
  </div>
)

/** Displays a free-form organization info value as text. */
const renderValue = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value))

/** Loads `/user/self/org-info` and shows the organization's quotas and current usage. */
export const OrgInfoCard = () => {
  const { data: org, isLoading, error } = useOrgInfo()

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <h2 className="mb-4 font-semibold text-text">Organization</h2>

      {isLoading ? (
        <SkeletonText lines={6} />
      ) : error || !org ? (
        <p className="text-sm text-text-muted">Couldn't load organization details: {error?.message ?? 'no data'}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-muted">Name</dt>
              <dd className="font-medium text-text">{org.organizationName}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Created</dt>
              <dd className="text-text">{formatDate(org.createdAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-text-muted">Organization ID</dt>
              <dd className="font-mono text-xs break-all text-text">{org.organizationId}</dd>
            </div>
            {Object.entries(org.organizationInfo).map(([key, value]) => (
              <div key={key}>
                <dt className="text-text-muted">{key}</dt>
                <dd className="break-words text-text">{renderValue(value)}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-medium tracking-wide text-text-muted uppercase">Usage</h3>
            <Meter label="Users" used={org.users.current} total={org.users.limit} />
            <Meter label="Vault projects" used={org.vaultProjects.current} total={org.vaultProjects.limit} />
            <Meter label="AI credits" used={org.aiCredit.used} total={org.aiCredit.allocated} />
            <Meter label="Storage" used={org.storageBytes.used} total={org.storageBytes.allocated} format={formatBytes} />
          </div>

          <div>
            <h3 className="mb-1 text-xs font-medium tracking-wide text-text-muted uppercase">Limits</h3>
            <Limit label="Servers" value={org.serverLimit} />
            <Limit label="Workflows" value={org.workflowLimit} />
            <Limit label="Secret keys per vault project" value={org.vaultKeysPerProjectLimit} />
            <Limit label="Notes per vault project" value={org.vaultNotesPerProjectLimit} />
          </div>
        </div>
      )}
    </section>
  )
}
