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
/** An access policy, read-only: its 2FA requirements, allowed IPs and countries, and how many users have it. */

import type { ReactNode } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Dialog } from '@/components/molecules/Dialog'
import { Skeleton } from '@/components/molecules/Skeleton'
import { useAccessPolicy, useAccessPolicyUserCount } from '@/features/admin/hooks/useAdmin'
import type { AccessPolicy } from '@/features/admin/types'
import { countryName } from '@/constants/countries'
import { usersLabel } from '@/utils/format'

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <dt className="text-text-muted">{label}</dt>
    <dd className="flex min-w-0 flex-wrap gap-1 text-text">{children}</dd>
  </>
)

/** Badges for the second factors a policy requires; null when it requires none. */
export const TwoFactorBadges = ({ policy }: { policy: AccessPolicy }) =>
  policy.enforceTotp2fa || policy.enforceEmail2fa ? (
    <>
      {policy.enforceTotp2fa && <Badge tone="signal">Authenticator app</Badge>}
      {policy.enforceEmail2fa && <Badge tone="signal">Email code</Badge>}
    </>
  ) : null

/** Shows the latest saved copy of `policy` (falls back to the list's copy while loading or if that fails). */
const AccessPolicyView = ({ policy: listed }: { policy: AccessPolicy }) => {
  const { data: latest, isPending } = useAccessPolicy(listed.policyId)
  const { data: userCount } = useAccessPolicyUserCount(listed.policyId)
  if (isPending)
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading policy">
        <Skeleton height={96} />
      </div>
    )
  const policy = latest ?? listed
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm">
      <Row label="Two-factor">
        <TwoFactorBadges policy={policy} /> {!policy.enforceTotp2fa && !policy.enforceEmail2fa && 'Not required'}
      </Row>
      <Row label="IP addresses">
        {policy.hasIpRestriction && policy.allowedIps.length
          ? policy.allowedIps.map((ip) => (
              <Badge key={ip} tone="accent" mono>
                {ip}
              </Badge>
            ))
          : 'Any'}
      </Row>
      <Row label="Countries">
        {policy.hasGeoRestriction && policy.allowedGeoLocations.length
          ? policy.allowedGeoLocations.map((c) => (
              <Badge key={c} tone="accent">
                {countryName(c)} ({c})
              </Badge>
            ))
          : 'Any'}
      </Row>
      <Row label="Used by">{userCount === undefined ? '…' : usersLabel(userCount)}</Row>
    </dl>
  )
}

export const AccessPolicyViewDialog = ({
  policy,
  onClose,
  actions,
}: {
  /** The policy to show; null keeps the dialog closed. */
  policy: AccessPolicy | null
  onClose: () => void
  /** Buttons at the bottom, e.g. Edit / Duplicate / Delete. */
  actions?: ReactNode
}) => (
  <Dialog
    open={!!policy}
    onClose={onClose}
    size="lg"
    title={policy?.policyName ?? ''}
    description={policy?.policyDescription || undefined}
  >
    {policy && (
      <>
        <AccessPolicyView policy={policy} />
        {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
      </>
    )}
  </Dialog>
)
